const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM   = process.env.EMAIL_FROM || 'RageBite <noreply@ragebite.gg>';

// ─── HTML TEMPLATE ───────────────────────────────────────────────────────────
const layout = (content) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>RageBite</title></head>
<body style="margin:0;padding:0;background:#080808;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:480px;margin:40px auto;padding:0 16px;">
  <div style="text-align:center;margin-bottom:28px;">
    <div style="display:inline-flex;align-items:center;gap:10px;">
      <div style="width:38px;height:38px;background:#FF3C1A;border-radius:9px;display:inline-flex;align-items:center;justify-content:center;font-size:19px;">🔥</div>
      <span style="font-size:26px;font-weight:900;letter-spacing:4px;color:#F2EEE8;">RAGE<span style="color:#FF3C1A;">BITE</span></span>
    </div>
  </div>
  <div style="background:#141414;border:1px solid #252525;border-radius:16px;padding:32px 28px;">
    ${content}
  </div>
  <p style="text-align:center;color:#444;font-size:12px;margin-top:20px;font-family:'Courier New',monospace;">
    © ${new Date().getFullYear()} RageBite · If you didn't request this, ignore it safely.
  </p>
</div></body></html>`;

const h1 = (t) => `<h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:#F2EEE8;">${t}</h1>`;
const p  = (t) => `<p style="margin:0 0 14px;color:#888;line-height:1.65;font-size:14px;">${t}</p>`;

// ─── OTP EMAIL ───────────────────────────────────────────────────────────────
async function sendOTPEmail(email, username, otp, type = 'verify') {
  const isVerify = type === 'verify';
  const subject  = isVerify ? '🔥 Verify your RageBite account' : '🔑 RageBite password reset OTP';
  const heading  = isVerify ? 'Verify your email.' : 'Reset your password.';
  const action   = isVerify ? 'Enter this OTP to verify your email and enter the arena:' : 'Enter this OTP to reset your password:';

  const html = layout(`
    ${h1(heading)}
    ${p(`Hey <strong style="color:#F2EEE8;">@${username}</strong>, ${action}`)}
    <div style="background:#0a0a0a;border:1px solid #333;border-radius:12px;padding:24px;text-align:center;margin:20px 0;">
      <div style="font-size:44px;font-weight:900;letter-spacing:12px;color:#FF3C1A;font-family:'Courier New',monospace;">${otp}</div>
      <p style="margin:10px 0 0;color:#555;font-size:12px;font-family:'Courier New',monospace;">EXPIRES IN 10 MINUTES · ONE TIME USE</p>
    </div>
    ${p('Do not share this OTP with anyone. RageBite staff will never ask for it.')}
  `);

  try {
    await resend.emails.send({ from: FROM, to: email, subject, html });
    console.log(`[Email] OTP sent to ${email}`);
  } catch (err) {
    console.error('[Email] Failed to send OTP:', err.message);
    throw new Error('Failed to send OTP email. Please try again.');
  }
}

// ─── WELCOME EMAIL ───────────────────────────────────────────────────────────
async function sendWelcomeEmail(email, username) {
  const html = layout(`
    ${h1("You're in the arena.")}
    ${p(`Welcome, <strong style="color:#FF3C1A;">@${username}</strong>! Your Aura starts at <strong style="color:#FFB800;">0</strong>. Win roast battles to earn points.`)}
    <div style="background:#0f0f0f;border:1px solid #252525;border-radius:12px;padding:20px;margin:16px 0;text-align:center;">
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
        <div><div style="font-size:28px;font-weight:900;color:#FFB800;">0</div><div style="font-size:10px;color:#555;letter-spacing:2px;font-family:'Courier New',monospace;">AURA</div></div>
        <div><div style="font-size:28px;font-weight:900;color:#00E676;">0</div><div style="font-size:10px;color:#555;letter-spacing:2px;font-family:'Courier New',monospace;">WINS</div></div>
        <div><div style="font-size:16px;font-weight:900;color:#F2EEE8;">Rookie</div><div style="font-size:10px;color:#555;letter-spacing:2px;font-family:'Courier New',monospace;">RANK</div></div>
      </div>
    </div>
    ${p('Every battle you win adds Aura. Every loss takes some away. Rise through the ranks.')}
  `);

  try {
    await resend.emails.send({
      from: FROM, to: email,
      subject: `⚡ Welcome to RageBite, @${username}`,
      html,
    });
  } catch (err) {
    // Non-critical — don't fail signup if welcome email fails
    console.error('[Email] Welcome email failed:', err.message);
  }
}

module.exports = { sendOTPEmail, sendWelcomeEmail };
