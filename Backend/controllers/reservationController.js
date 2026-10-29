const Reservation = require("../models/Reservation");
const Book = require("../models/Book");
const Issue = require("../models/Issue");
const { promoteNext, HOLD_HOURS } = require("../services/reservationService");

const ACTIVE = ["waiting", "ready"];

// Member reserves an unavailable book
exports.reserveBook = async (req, res, next) => {
  try {
    const { bookId } = req.body;
    const memberId = req.user._id;

    if (req.user.isBlocked) return res.status(403).json({ message: "Your account is blocked" });

    const book = await Book.findById(bookId);
    if (!book) return res.status(404).json({ message: "Book not found" });

    if (book.availableCopies > 0)
      return res.status(400).json({ message: "This book is available. You can borrow it from the library." });

    if (await Issue.findOne({ book: bookId, member: memberId, status: "issued" }))
      return res.status(400).json({ message: "You already have this book" });

    if (await Reservation.findOne({ book: bookId, member: memberId, status: { $in: ACTIVE } }))
      return res.status(400).json({ message: "You already reserved this book" });

    const reservation = await Reservation.create({ book: bookId, member: memberId });
    const position = await Reservation.countDocuments({ book: bookId, status: "waiting" });

    res.status(201).json({
      message: `Reserved. You are number ${position} in the queue.`,
      reservation,
    });
  } catch (err) {
    next(err);
  }
};

// Member's own reservations, with queue position for waiting ones
exports.getMyReservations = async (req, res, next) => {
  try {
    const list = await Reservation.find({ member: req.user._id })
      .populate("book", "title author")
      .sort({ createdAt: -1 })
      .limit(50);

    const result = await Promise.all(
      list.map(async (r) => {
        const obj = r.toObject();
        if (r.status === "waiting" && r.book) {
          obj.position =
            (await Reservation.countDocuments({
              book: r.book._id,
              status: "waiting",
              reservedAt: { $lt: r.reservedAt },
            })) + 1;
        }
        return obj;
      })
    );

    res.json(result);
  } catch (err) {
    next(err);
  }
};

// Staff: all reservations, optional ?status=ready
exports.getAllReservations = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.status) query.status = req.query.status;

    const list = await Reservation.find(query)
      .populate("book", "title author availableCopies")
      .populate("member", "name email")
      .sort({ reservedAt: -1 })
      .limit(200);

    res.json(list);
  } catch (err) {
    next(err);
  }
};

// Member cancels their own; staff can cancel any
exports.cancelReservation = async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: "Reservation not found" });

    const isStaff = ["admin", "librarian"].includes(req.user.role);
    if (!isStaff && reservation.member.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Access denied" });

    if (!ACTIVE.includes(reservation.status))
      return res.status(400).json({ message: `Reservation is already ${reservation.status}` });

    // Atomic claim. It returns the document as it was before the update.
    const before = await Reservation.findOneAndUpdate(
      { _id: reservation._id, status: { $in: ACTIVE } },
      { status: "cancelled" }
    );
    if (!before) return res.status(400).json({ message: "Reservation is no longer active" });

    // If a copy was being held for them, release it to the next person
    if (before.status === "ready") {
      await Book.findByIdAndUpdate(before.book, { $inc: { availableCopies: 1 } });
      await promoteNext(before.book);
    }

    res.json({ message: "Reservation cancelled" });
  } catch (err) {
    next(err);
  }
};

exports.HOLD_HOURS = HOLD_HOURS;