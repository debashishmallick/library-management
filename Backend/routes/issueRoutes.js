const router = require("express").Router();
const c = require("../controllers/issueController");
const { protect, authorize } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const { issueRules } = require("../middleware/validators");

const staff = authorize("admin", "librarian");

router.post("/", protect, staff, issueRules, validate, c.issueBook);
router.get("/", protect, staff, c.getAllIssues);

// Static routes must stay above any "/:id" route
router.get("/overdue", protect, staff, c.getOverdue);
router.get("/unpaid-fines", protect, staff, c.getUnpaidFines);
router.get("/my", protect, c.getMyIssues);

router.put("/:id/return", protect, staff, c.returnBook);
router.put("/:id/pay-fine", protect, staff, c.payFine);
router.put("/:id/renew", protect, c.renewBook);

module.exports = router;