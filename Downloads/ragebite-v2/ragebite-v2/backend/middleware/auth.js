const { verifyAccess } = require('../utils/jwt');
const { query }        = require('../db/pool');

async function requireAuth(req, res, next) {
  try {
    // 1. Try cookie first, then Authorization header
    let token = req.cookies?.rb_access;
    if (!token) {
      const auth = req.headers.authorization;
      if (auth?.startsWith('Bearer ')) token = auth.slice(7);
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required.', code: 'NO_TOKEN' });
    }

    const decoded = verifyAccess(token);
    if (decoded.type !== 'access') {
      return res.status(401).json({ success: false, message: 'Invalid token type.', code: 'BAD_TOKEN' });
    }

    // Check session is still active in DB
    const { rows: sessionRows } = await query(
      `SELECT id FROM sessions WHERE jwt_token = $1 AND is_active = TRUE AND expires_at > NOW()`,
      [token]
    );
    if (!sessionRows.length) {
      return res.status(401).json({ success: false, message: 'Session expired. Please log in again.', code: 'SESSION_EXPIRED' });
    }

    // Fetch fresh user data
    const { rows } = await query(
      `SELECT id, username, email, email_verified, aura, wins, losses,
              total_battles, current_streak, highest_streak, rank,
              profile_image, is_active, created_at
       FROM users WHERE id = $1`,
      [decoded.sub]
    );

    if (!rows[0]) {
      return res.status(401).json({ success: false, message: 'User not found.', code: 'USER_NOT_FOUND' });
    }
    if (!rows[0].is_active) {
      return res.status(403).json({ success: false, message: 'Account suspended.', code: 'SUSPENDED' });
    }

    // Update session last_used_at
    await query(`UPDATE sessions SET last_used_at = NOW() WHERE jwt_token = $1`, [token]);

    req.user  = rows[0];
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired.', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.', code: 'INVALID_TOKEN' });
  }
}

async function requireVerified(req, res, next) {
  if (!req.user?.email_verified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email first.',
      code: 'EMAIL_NOT_VERIFIED',
    });
  }
  next();
}

module.exports = { requireAuth, requireVerified };
