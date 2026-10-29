const router = require("express").Router();
const { getStats } = require("../controllers/reportController");
const { protect, authorize } = require("../middleware/authMiddleware");

router.get("/stats", protect, authorize("admin", "librarian"), getStats);

module.exports = router;