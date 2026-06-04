const jwt  = require('jsonwebtoken');
const { query } = require('../db/pool');

const ACCESS_SECRET  = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXP     = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_EXP    = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const isProd         = process.env.NODE_ENV === 'production';

// ─── SIGN ─────────────────────────────────────────────────────────────────────
function signAccess(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, rank: user.rank, type: 'access' },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXP, algorithm: 'HS256' }
  );
}

function signRefresh(userId) {
  return jwt.sign(
    { sub: userId, type: 'refresh' },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXP, algorithm: 'HS256' }
  );
}

// ─── VERIFY ───────────────────────────────────────────────────────────────────
function verifyAccess(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

function verifyRefresh(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

// ─── STORE SESSION IN DB ──────────────────────────────────────────────────────
async function storeSession(userId, accessToken, refreshToken, req) {
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await query(
    `INSERT INTO sessions (user_id, jwt_token, refresh_token, ip_address, user_agent, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, accessToken, refreshToken, req.ip, req.headers['user-agent'], expiresAt]
  );
}

// ─── REVOKE ALL USER SESSIONS ─────────────────────────────────────────────────
async function revokeUserSessions(userId) {
  await query(
    `UPDATE sessions SET is_active = FALSE WHERE user_id = $1`,
    [userId]
  );
}

// ─── SET COOKIES ──────────────────────────────────────────────────────────────
function setAuthCookies(res, accessToken, refreshToken, rememberMe = false) {
  const cookieOpts = {
    httpOnly: true,
    secure:   isProd,
    sameSite: isProd ? 'Strict' : 'Lax',
  };

  res.cookie('rb_access', accessToken, {
    ...cookieOpts,
    maxAge: 15 * 60 * 1000, // 15 min
  });

  res.cookie('rb_refresh', refreshToken, {
    ...cookieOpts,
    path:   '/api/auth/refresh',
    maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
  });
}

function clearAuthCookies(res) {
  res.clearCookie('rb_access');
  res.clearCookie('rb_refresh', { path: '/api/auth/refresh' });
}

// ─── SAFE USER OBJECT (no password) ──────────────────────────────────────────
function safeUser(user) {
  const { password_hash, ...safe } = user;
  safe.win_rate = user.total_battles > 0
    ? Math.round((user.wins / user.total_battles) * 100)
    : 0;
  return safe;
}

module.exports = {
  signAccess, signRefresh,
  verifyAccess, verifyRefresh,
  storeSession, revokeUserSessions,
  setAuthCookies, clearAuthCookies,
  safeUser,
};
