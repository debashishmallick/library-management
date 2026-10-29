const router = require("express").Router();
const { register, login, getMe, updateProfile, changePassword } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const { registerRules, loginRules } = require("../middleware/validators");
const { authLimiter } = require("../middleware/rateLimiter");

router.post("/register", authLimiter, registerRules, validate, register);
router.post("/login", authLimiter, loginRules, validate, login);
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.put("/change-password", protect, authLimiter, changePassword);

module.exports = router;