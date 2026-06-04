const express = require('express');
const { body, validationResult } = require('express-validator');
const { query }       = require('../db/pool');
const { requireAuth, requireVerified } = require('../middleware/auth');
const xss = require('xss');

const router = express.Router();

// All user routes require authentication
router.use(requireAuth);

// ─── GET /api/user/dashboard ──────────────────────────────────────────────────
// Returns complete user stats from DB — no mock data
router.get('/dashboard', requireVerified, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT
         u.id, u.username, u.email, u.display_name, u.bio,
         u.profile_image, u.aura, u.wins, u.losses,
         u.total_battles, u.current_streak, u.highest_streak,
         u.rank, u.created_at, u.last_login_at,
         CASE WHEN u.total_battles > 0
           THEN ROUND((u.wins::DECIMAL / u.total_battles) * 100, 1)
           ELSE 0
         END AS win_rate
       FROM users u WHERE u.id = $1`,
      [req.user.id]
    );

    if (!rows[0]) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { password_hash, ...user } = rows[0];

    // Get recent battles
    const { rows: battles } = await query(
      `SELECT b.id, b.topic, b.aura_delta, b.ended_at,
         CASE WHEN b.winner_id = $1 THEN true ELSE false END AS won,
         CASE WHEN b.challenger_id = $1
           THEN opp.username ELSE ch.username END AS opponent_username
       FROM battles b
       LEFT JOIN users ch  ON ch.id = b.challenger_id
       LEFT JOIN users opp ON opp.id = b.opponent_id
       WHERE (b.challenger_id = $1 OR b.opponent_id = $1)
         AND b.status = 'finished'
       ORDER BY b.ended_at DESC LIMIT 10`,
      [req.user.id]
    );

    res.json({ success: true, user, battles });
  } catch (err) {
    console.error('[User] Dashboard error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to load dashboard.' });
  }
});

// ─── GET /api/user/leaderboard ────────────────────────────────────────────────
router.get('/leaderboard', async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, username, aura, wins, losses, total_battles, rank,
         CASE WHEN total_battles > 0
           THEN ROUND((wins::DECIMAL / total_battles) * 100, 1)
           ELSE 0
         END AS win_rate
       FROM users
       WHERE is_active = TRUE AND email_verified = TRUE
       ORDER BY aura DESC LIMIT 50`
    );
    res.json({ success: true, leaderboard: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load leaderboard.' });
  }
});

// ─── PATCH /api/user/profile ──────────────────────────────────────────────────
router.patch('/profile',
  requireVerified,
  [
    body('display_name').optional().isLength({ max: 50 }).withMessage('Max 50 characters'),
    body('bio').optional().isLength({ max: 280 }).withMessage('Max 280 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { display_name, bio } = req.body;
    const updates = [];
    const values  = [];
    let idx = 1;

    if (display_name !== undefined) { updates.push(`display_name = $${idx++}`); values.push(xss(display_name)); }
    if (bio !== undefined)          { updates.push(`bio = $${idx++}`);           values.push(xss(bio)); }

    if (!updates.length) {
      return res.status(400).json({ success: false, message: 'No fields to update.' });
    }

    values.push(req.user.id);
    const { rows } = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, username, display_name, bio, profile_image`,
      values
    );

    res.json({ success: true, user: rows[0] });
  }
);

module.exports = router;
