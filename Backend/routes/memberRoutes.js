const router = require("express").Router();
const c = require("../controllers/memberController");
const { protect, authorize } = require("../middleware/authMiddleware");

const staff = authorize("admin", "librarian");
const admin = authorize("admin");

router.get("/", protect, staff, c.getMembers);

// Admin-only librarian routes (keep above "/:id")
router.get("/librarians", protect, admin, c.getLibrarians);
router.put("/librarians/:id/block", protect, admin, c.toggleLibrarianBlock);

router.get("/:id", protect, staff, c.getMember);
router.put("/:id/block", protect, staff, c.toggleBlock);
router.post("/", protect, admin, c.createUser);

module.exports = router;