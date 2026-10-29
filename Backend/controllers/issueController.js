const Issue = require("../models/Issue");
const Book = require("../models/Book");
const User = require("../models/User");
const Reservation = require("../models/Reservation");
const { promoteNext } = require("../services/reservationService");

const MAX_BOOKS = 3;
const LOAN_DAYS = 14;
const FINE_PER_DAY = 2;
const RENEW_DAYS = 7;
const MAX_RENEWALS = 1;

exports.issueBook = async (req, res) => {
  try {
    const { bookId, memberId } = req.body;

    const member = await User.findById(memberId);
    if (!member || member.role !== "member")
      return res.status(404).json({ message: "Member not found" });
    if (member.isBlocked)
      return res.status(403).json({ message: "Member is blocked" });

    const activeCount = await Issue.countDocuments({ member: memberId, status: "issued" });
    if (activeCount >= MAX_BOOKS)
      return res.status(400).json({ message: `Limit of ${MAX_BOOKS} books reached` });

    const already = await Issue.findOne({ member: memberId, book: bookId, status: "issued" });
    if (already)
      return res.status(400).json({ message: "Member already has this book" });

    // Does this member have a copy being held for them?
    const reserved = await Reservation.findOne({ book: bookId, member: memberId, status: "ready" });

    if (reserved) {
      // The copy is already held (not counted in availableCopies), so don't decrement again
      const exists = await Book.findById(bookId);
      if (!exists) return res.status(404).json({ message: "Book not found" });
    } else {
      // Atomic update prevents two people taking the last copy at once
      const book = await Book.findOneAndUpdate(
        { _id: bookId, availableCopies: { $gt: 0 } },
        { $inc: { availableCopies: -1 } },
        { new: true }
      );
      if (!book) return res.status(400).json({ message: "Book not available" });
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + LOAN_DAYS);

    const issue = await Issue.create({ book: bookId, member: memberId, dueDate });

    if (reserved) {
      reserved.status = "fulfilled";
      await reserved.save();
    }

    res.status(201).json(issue);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.returnBook = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: "Issue record not found" });
    if (issue.status === "returned")
      return res.status(400).json({ message: "Already returned" });

    const now = new Date();
    const msPerDay = 1000 * 60 * 60 * 24;
    const daysLate = Math.max(0, Math.ceil((now - issue.dueDate) / msPerDay));

    issue.returnDate = now;
    issue.fine = daysLate * FINE_PER_DAY;
    issue.finePaid = issue.fine === 0; // zero fine counts as paid
    issue.status = "returned";
    await issue.save();

    await Book.findByIdAndUpdate(issue.book, { $inc: { availableCopies: 1 } });
    await promoteNext(issue.book); // hand the copy to the next person in the queue

    res.json({ message: "Book returned", daysLate, fine: issue.fine, issue });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.renewBook = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: "Issue record not found" });
    if (issue.status !== "issued")
      return res.status(400).json({ message: "Book already returned" });
    if (issue.renewCount >= MAX_RENEWALS)
      return res.status(400).json({ message: "Renewal limit reached" });
    if (issue.dueDate < new Date())
      return res.status(400).json({ message: "Overdue books cannot be renewed. Return it first." });

    // Members can only renew their own books; staff can renew any
    const isStaff = ["admin", "librarian"].includes(req.user.role);
    if (!isStaff && issue.member.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Access denied" });

    issue.dueDate = new Date(issue.dueDate.getTime() + RENEW_DAYS * 24 * 60 * 60 * 1000);
    issue.renewCount += 1;
    await issue.save();

    res.json({ message: `Renewed. New due date: ${issue.dueDate.toDateString()}`, issue });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.payFine = async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ message: "Issue record not found" });
    if (issue.status !== "returned")
      return res.status(400).json({ message: "Return the book first" });
    if (issue.fine === 0)
      return res.status(400).json({ message: "No fine on this record" });
    if (issue.finePaid)
      return res.status(400).json({ message: "Fine already paid" });

    issue.finePaid = true;
    issue.finePaidAt = new Date();
    await issue.save();

    res.json({ message: `Fine of ₹${issue.fine} marked as paid`, issue });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllIssues = async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const issues = await Issue.find(query)
      .populate("book", "title author isbn")
      .populate("member", "name email")
      .sort({ createdAt: -1 });
    res.json(issues);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getMyIssues = async (req, res) => {
  try {
    const issues = await Issue.find({ member: req.user._id })
      .populate("book", "title author")
      .sort({ createdAt: -1 });
    res.json(issues);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getOverdue = async (req, res) => {
  try {
    const issues = await Issue.find({ status: "issued", dueDate: { $lt: new Date() } })
      .populate("book", "title")
      .populate("member", "name email");
    res.json(issues);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Unpaid fines report
exports.getUnpaidFines = async (req, res) => {
  try {
    const issues = await Issue.find({ fine: { $gt: 0 }, finePaid: false })
      .populate("book", "title")
      .populate("member", "name email")
      .sort({ returnDate: -1 });

    const totalUnpaid = issues.reduce((sum, i) => sum + i.fine, 0);
    res.json({ issues, totalUnpaid });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};