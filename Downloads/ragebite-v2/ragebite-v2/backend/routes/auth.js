const express  = require('express');
const bcrypt   = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query, getClient } = require('../db/pool');
const { sendOTPEmail, sendWelcomeEmail } = require('../utils/email');
const {
  signAccess, signRefresh, verifyRefresh,
  storeSession, revokeUserSessions,
  setAuthCookies, clearAuthCookies, safeUser,
} = require('../utils/jwt');
const { requireAuth } = require('../middleware/auth');
const { authLimiter, otpLimiter, resendLimiter } = require('../middleware/rateLimit');

const router = express.Router();
const BCRYPT_ROUNDS = 12;

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function validationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  return null;
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────
// Step 1: Validate → hash password → create unverified user → send OTP
router.post('/register',
  authLimiter,
  [
    body('username')
      .trim().notEmpty().withMessage('Username is required')
      .isLength({ min: 3, max: 20 }).withMessage('Username must be 3–20 characters')
      .matches(/^[a-zA-Z0-9_]+$/).withMessage('Letters, numbers, underscores only'),
    body('email')
      .trim().notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Enter a valid email').normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 8 }).withMessage('At least 8 characters')
      .matches(/[A-Z]/).withMessage('One uppercase letter required')
      .matches(/[a-z]/).withMessage('One lowercase letter required')
      .matches(/[0-9]/).withMessage('One number required'),
    body('confirmPassword').custom((v, { req }) => {
      if (v !== req.body.password) throw new Error('Passwords do not match');
      return true;
    }),
  ],
  async (req, res) => {
    const err = validationErrors(req, res);
    if (err) return;

    const { username, email, password } = req.body;
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Check username uniqueness (case-insensitive via CITEXT)
      const { rows: uRows } = await client.query(
        `SELECT id FROM users WHERE username = $1`, [username]
      );
      if (uRows.length) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          message: 'Username already taken',
          errors: [{ field: 'username', message: 'Username already taken. Try another.' }],
        });
      }

      // Check email uniqueness
      const { rows: eRows } = await client.query(
        `SELECT id, email_verified FROM users WHERE email = $1`, [email]
      );
      if (eRows.length) {
        if (!eRows[0].email_verified) {
          // Resend OTP for unverified accounts
          await client.query('ROLLBACK');
          return res.status(409).json({
            success: false,
            message: 'Email already registered but not verified. Please check your email.',
            code: 'UNVERIFIED_EMAIL',
          });
        }
        await client.query('ROLLBACK');
        return res.status(409).json({
          success: false,
          message: 'Email already registered',
          errors: [{ field: 'email', message: 'An account with this email already exists.' }],
        });
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

      // Create user (email_verified = false until OTP confirmed)
      const { rows: [user] } = await client.query(
        `INSERT INTO users (username, email, password_hash, display_name, email_verified)
         VALUES ($1, $2, $3, $4, FALSE)
         RETURNING id, username, email`,
        [username.toLowerCase(), email.toLowerCase(), password_hash, username]
      );

      // Generate and store OTP
      const otp     = generateOTP();
      const otpHash = await bcrypt.hash(otp, 8); // hash OTP too
      await client.query(
        `INSERT INTO otp_verifications (user_id, otp_code, otp_type, expires_at)
         VALUES ($1, $2, 'email_verify', NOW() + INTERVAL '10 minutes')`,
        [user.id, otpHash]
      );

      await client.query('COMMIT');

      // Send OTP email (outside transaction)
      await sendOTPEmail(email, username, otp, 'verify');

      res.status(201).json({
        success: true,
        message: 'Account created. Check your email for a 6-digit OTP to verify your account.',
        userId: user.id,
        email: user.email,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[Auth] Register error:', err.message);
      res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
    } finally {
      client.release();
    }
  }
);

// ─── POST /api/auth/verify-otp ────────────────────────────────────────────────
// Step 2: Verify OTP → activate account → issue tokens
router.post('/verify-otp',
  otpLimiter,
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits').isNumeric(),
  ],
  async (req, res) => {
    const err = validationErrors(req, res);
    if (err) return;

    const { userId, otp } = req.body;
    const client = await getClient();

    try {
      await client.query('BEGIN');

      // Get latest unused OTP for this user
      const { rows: otpRows } = await client.query(
        `SELECT id, otp_code, expires_at, used, attempts
         FROM otp_verifications
         WHERE user_id = $1 AND otp_type = 'email_verify' AND used = FALSE
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );

      if (!otpRows.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'No active OTP found. Please request a new one.' });
      }

      const record = otpRows[0];

      // Check max attempts (5)
      if (record.attempts >= 5) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Too many incorrect attempts. Please request a new OTP.',
          code: 'MAX_ATTEMPTS',
        });
      }

      // Check expiry
      if (new Date() > new Date(record.expires_at)) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'OTP has expired. Please request a new one.',
          code: 'OTP_EXPIRED',
        });
      }

      // Verify OTP (bcrypt compare)
      const valid = await bcrypt.compare(otp, record.otp_code);
      if (!valid) {
        // Increment attempts
        await client.query(
          `UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = $1`,
          [record.id]
        );
        await client.query('COMMIT');
        const remaining = 4 - record.attempts;
        return res.status(400).json({
          success: false,
          message: `Incorrect OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
          attemptsLeft: remaining,
        });
      }

      // Mark OTP used
      await client.query(
        `UPDATE otp_verifications SET used = TRUE WHERE id = $1`, [record.id]
      );

      // Activate user account
      const { rows: [user] } = await client.query(
        `UPDATE users SET email_verified = TRUE WHERE id = $1
         RETURNING id, username, email, aura, wins, losses, total_battles,
                   current_streak, highest_streak, rank, profile_image, created_at`,
        [userId]
      );

      if (!user) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      // Issue tokens
      const accessToken  = signAccess(user);
      const refreshToken = signRefresh(user.id);
      await storeSession(user.id, accessToken, refreshToken, req);

      // Update last login
      await client.query(
        `UPDATE users SET last_login_at = NOW() WHERE id = $1`, [user.id]
      );

      await client.query('COMMIT');

      // Send welcome email (non-blocking)
      sendWelcomeEmail(user.email, user.username).catch(console.error);

      setAuthCookies(res, accessToken, refreshToken, false);

      res.json({
        success: true,
        message: 'Email verified! Welcome to RageBite.',
        user: safeUser(user),
        accessToken,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[Auth] Verify OTP error:', err.message);
      res.status(500).json({ success: false, message: 'Verification failed. Please try again.' });
    } finally {
      client.release();
    }
  }
);

// ─── POST /api/auth/resend-otp ────────────────────────────────────────────────
router.post('/resend-otp',
  resendLimiter,
  [body('userId').notEmpty().withMessage('User ID is required')],
  async (req, res) => {
    const err = validationErrors(req, res);
    if (err) return;

    const { userId } = req.body;
    const client = await getClient();

    try {
      await client.query('BEGIN');

      const { rows } = await client.query(
        `SELECT id, username, email, email_verified FROM users WHERE id = $1`, [userId]
      );
      if (!rows.length) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'User not found.' });
      }
      if (rows[0].email_verified) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Email is already verified.' });
      }

      const user = rows[0];

      // Invalidate old OTPs
      await client.query(
        `UPDATE otp_verifications SET used = TRUE
         WHERE user_id = $1 AND otp_type = 'email_verify' AND used = FALSE`,
        [userId]
      );

      // Generate new OTP
      const otp     = generateOTP();
      const otpHash = await bcrypt.hash(otp, 8);
      await client.query(
        `INSERT INTO otp_verifications (user_id, otp_code, otp_type, expires_at)
         VALUES ($1, $2, 'email_verify', NOW() + INTERVAL '10 minutes')`,
        [userId, otpHash]
      );

      await client.query('COMMIT');
      await sendOTPEmail(user.email, user.username, otp, 'verify');

      res.json({ success: true, message: 'New OTP sent to your email.' });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[Auth] Resend OTP error:', err.message);
      res.status(500).json({ success: false, message: 'Failed to resend OTP.' });
    } finally {
      client.release();
    }
  }
);

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login',
  authLimiter,
  [
    body('identifier').trim().notEmpty().withMessage('Email or username is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const err = validationErrors(req, res);
    if (err) return;

    const { identifier, password, rememberMe = false } = req.body;

    try {
      // Find by email OR username
      const { rows } = await query(
        `SELECT * FROM users WHERE email = $1 OR username = $1 LIMIT 1`,
        [identifier.toLowerCase()]
      );

      const user = rows[0];

      // Constant-time check (prevents timing attacks)
      const dummy = '$2a$12$invalidhashfortimingreasons.dummy.hash.here';
      const match = await bcrypt.compare(password, user ? user.password_hash : dummy);

      if (!user || !match) {
        return res.status(401).json({ success: false, message: 'Invalid email/username or password.' });
      }

      if (!user.is_active) {
        return res.status(403).json({ success: false, message: 'Your account has been suspended.' });
      }

      if (!user.email_verified) {
        return res.status(403).json({
          success: false,
          message: 'Please verify your email before logging in.',
          code: 'EMAIL_NOT_VERIFIED',
          userId: user.id,
          email: user.email,
        });
      }

      // Issue tokens
      const accessToken  = signAccess(user);
      const refreshToken = signRefresh(user.id);
      await storeSession(user.id, accessToken, refreshToken, req);

      // Update last login
      await query(
        `UPDATE users SET last_login_at = NOW(), login_attempts = 0 WHERE id = $1`,
        [user.id]
      );

      setAuthCookies(res, accessToken, refreshToken, rememberMe);

      res.json({
        success: true,
        message: 'Logged in successfully.',
        user: safeUser(user),
        accessToken,
      });
    } catch (err) {
      console.error('[Auth] Login error:', err.message);
      res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
    }
  }
);

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
router.post('/refresh', async (req, res) => {
  const token = req.cookies?.rb_refresh;
  if (!token) {
    return res.status(401).json({ success: false, message: 'No refresh token.', code: 'NO_REFRESH' });
  }

  try {
    const decoded = verifyRefresh(token);

    // Verify session exists and is active
    const { rows: sessionRows } = await query(
      `SELECT id FROM sessions WHERE refresh_token = $1 AND is_active = TRUE AND expires_at > NOW()`,
      [token]
    );
    if (!sessionRows.length) {
      clearAuthCookies(res);
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.', code: 'SESSION_EXPIRED' });
    }

    // Get fresh user data
    const { rows } = await query(
      `SELECT * FROM users WHERE id = $1 AND is_active = TRUE`, [decoded.sub]
    );
    if (!rows[0]) {
      clearAuthCookies(res);
      return res.status(401).json({ success: false, message: 'User not found.', code: 'USER_NOT_FOUND' });
    }

    const user = rows[0];

    // Revoke old session
    await query(`UPDATE sessions SET is_active = FALSE WHERE refresh_token = $1`, [token]);

    // Issue new tokens
    const newAccess  = signAccess(user);
    const newRefresh = signRefresh(user.id);
    await storeSession(user.id, newAccess, newRefresh, req);

    setAuthCookies(res, newAccess, newRefresh);

    res.json({
      success: true,
      user: safeUser(user),
      accessToken: newAccess,
    });
  } catch (err) {
    clearAuthCookies(res);
    res.status(401).json({ success: false, message: 'Invalid refresh token.', code: 'INVALID_REFRESH' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT u.*,
         CASE WHEN u.total_battles > 0
           THEN ROUND((u.wins::DECIMAL / u.total_battles) * 100, 1)
           ELSE 0 END AS win_rate
       FROM users u WHERE u.id = $1`,
      [req.user.id]
    );
    res.json({ success: true, user: safeUser(rows[0]) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch user data.' });
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', requireAuth, async (req, res) => {
  try {
    await revokeUserSessions(req.user.id);
    clearAuthCookies(res);
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Logout failed.' });
  }
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
router.post('/forgot-password',
  resendLimiter,
  [body('email').trim().isEmail().withMessage('Enter a valid email').normalizeEmail()],
  async (req, res) => {
    const err = validationErrors(req, res);
    if (err) return;

    const { email } = req.body;

    try {
      const { rows } = await query(
        `SELECT id, username FROM users WHERE email = $1 AND is_active = TRUE`, [email]
      );

      // Always return success (prevent user enumeration)
      if (!rows.length) {
        return res.json({ success: true, message: 'If that email exists, an OTP has been sent.' });
      }

      const user = rows[0];

      // Invalidate old reset OTPs
      await query(
        `UPDATE otp_verifications SET used = TRUE
         WHERE user_id = $1 AND otp_type = 'password_reset' AND used = FALSE`,
        [user.id]
      );

      const otp     = generateOTP();
      const otpHash = await bcrypt.hash(otp, 8);
      await query(
        `INSERT INTO otp_verifications (user_id, otp_code, otp_type, expires_at)
         VALUES ($1, $2, 'password_reset', NOW() + INTERVAL '10 minutes')`,
        [user.id, otpHash]
      );

      await sendOTPEmail(email, user.username, otp, 'reset');

      res.json({
        success: true,
        message: 'If that email exists, an OTP has been sent.',
        userId: user.id,
      });
    } catch (err) {
      console.error('[Auth] Forgot password error:', err.message);
      res.status(500).json({ success: false, message: 'Failed to process request.' });
    }
  }
);

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
router.post('/reset-password',
  otpLimiter,
  [
    body('userId').notEmpty(),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric(),
    body('password').isLength({ min: 8 }).matches(/[A-Z]/).matches(/[a-z]/).matches(/[0-9]/),
    body('confirmPassword').custom((v, { req }) => {
      if (v !== req.body.password) throw new Error('Passwords do not match');
      return true;
    }),
  ],
  async (req, res) => {
    const err = validationErrors(req, res);
    if (err) return;

    const { userId, otp, password } = req.body;
    const client = await getClient();

    try {
      await client.query('BEGIN');

      const { rows: otpRows } = await client.query(
        `SELECT id, otp_code, expires_at, used, attempts
         FROM otp_verifications
         WHERE user_id = $1 AND otp_type = 'password_reset' AND used = FALSE
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );

      if (!otpRows.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'No active OTP found. Request a new one.' });
      }

      const record = otpRows[0];

      if (record.attempts >= 5) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'Too many attempts. Request a new OTP.', code: 'MAX_ATTEMPTS' });
      }

      if (new Date() > new Date(record.expires_at)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: 'OTP expired. Request a new one.', code: 'OTP_EXPIRED' });
      }

      const valid = await bcrypt.compare(otp, record.otp_code);
      if (!valid) {
        await client.query(
          `UPDATE otp_verifications SET attempts = attempts + 1 WHERE id = $1`, [record.id]
        );
        await client.query('COMMIT');
        return res.status(400).json({ success: false, message: 'Incorrect OTP.' });
      }

      const newHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      await client.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [newHash, userId]);
      await client.query(`UPDATE otp_verifications SET used = TRUE WHERE id = $1`, [record.id]);

      // Revoke all sessions
      await revokeUserSessions(userId);

      await client.query('COMMIT');
      clearAuthCookies(res);

      res.json({ success: true, message: 'Password reset successfully. Please log in.' });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[Auth] Reset password error:', err.message);
      res.status(500).json({ success: false, message: 'Password reset failed.' });
    } finally {
      client.release();
    }
  }
);

// ─── POST /api/auth/check-username ───────────────────────────────────────────
router.post('/check-username', async (req, res) => {
  const { username } = req.body;
  if (!username || username.length < 3) {
    return res.json({ available: false });
  }
  const { rows } = await query(
    `SELECT 1 FROM users WHERE username = $1`, [username.toLowerCase()]
  );
  res.json({ available: rows.length === 0 });
});

module.exports = router;
