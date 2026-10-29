const { body } = require("express-validator");

exports.registerRules = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

exports.loginRules = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

exports.bookRules = [
  body("title").trim().notEmpty().withMessage("Title is required"),
  body("author").trim().notEmpty().withMessage("Author is required"),
  body("isbn").trim().notEmpty().withMessage("ISBN is required"),
  body("category").trim().notEmpty().withMessage("Category is required"),
  body("totalCopies").isInt({ min: 1 }).withMessage("Total copies must be at least 1"),
];

exports.issueRules = [
  body("bookId").isMongoId().withMessage("Valid book ID is required"),
  body("memberId").isMongoId().withMessage("Valid member ID is required"),
];