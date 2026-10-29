const rateLimit = require("express-rate-limit");

// Strict limit for login/register to slow down password guessing
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Try again after 15 minutes." },
});

// General limit for the whole API
exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down." },
});

// AI calls cost money, so limit each logged-in user
exports.aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?._id?.toString() || "anon",
  message: { message: "You're asking too fast. Please wait a few minutes." },
});