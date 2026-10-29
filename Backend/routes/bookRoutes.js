const router = require("express").Router();
const c = require("../controllers/bookController");
const { protect, authorize } = require("../middleware/authMiddleware");

const validate = require("../middleware/validate");
const { bookRules } = require("../middleware/validators");

router.post("/", protect, authorize("admin", "librarian"), bookRules, validate, c.addBook);
router.get("/", protect, c.getBooks);
router.get("/categories", protect, c.getCategories);

router.get("/:id", protect, c.getBook);
router.put("/:id", protect, authorize("admin", "librarian"), c.updateBook);
router.delete("/:id", protect, authorize("admin"), c.deleteBook);

module.exports = router;