const router = require("express").Router();
const c = require("../controllers/reservationController");
const { protect, authorize } = require("../middleware/authMiddleware");
const validate = require("../middleware/validate");
const { body } = require("express-validator");

const staff = authorize("admin", "librarian");

router.post(
  "/",
  protect,
  authorize("member"),
  body("bookId").isMongoId().withMessage("Valid book ID is required"),
  validate,
  c.reserveBook
);
router.get("/my", protect, authorize("member"), c.getMyReservations);
router.get("/", protect, staff, c.getAllReservations);
router.put("/:id/cancel", protect, c.cancelReservation);

module.exports = router;