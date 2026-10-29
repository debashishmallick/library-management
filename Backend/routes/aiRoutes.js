const router = require("express").Router();
const c = require("../controllers/aiController");
const { protect, authorize } = require("../middleware/authMiddleware");
const { aiLimiter } = require("../middleware/rateLimiter");

// protect must come before aiLimiter so the limiter can see req.user
router.get(
  "/recommendations",
  protect,
  authorize("member"),
  aiLimiter,
  c.recommend,
);
router.post("/chat", protect, authorize("member"), aiLimiter, c.chat);

module.exports = router;
