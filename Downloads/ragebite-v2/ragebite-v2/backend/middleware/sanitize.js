const xss = require('xss');

function sanitizeValue(val) {
  if (typeof val === 'string') return xss(val.trim());
  if (Array.isArray(val))     return val.map(sanitizeValue);
  if (val && typeof val === 'object') return sanitizeObject(val);
  return val;
}

function sanitizeObject(obj) {
  const clean = {};
  const skipSanitize = ['password', 'confirmPassword', 'currentPassword', 'newPassword', 'otp'];
  for (const [k, v] of Object.entries(obj)) {
    clean[k] = skipSanitize.includes(k) ? v : sanitizeValue(v);
  }
  return clean;
}

module.exports = (req, res, next) => {
  if (req.body)   req.body   = sanitizeObject(req.body);
  if (req.query)  req.query  = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);
  next();
};
