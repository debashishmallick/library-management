const Book = require("../models/Book");
const Reservation = require("../models/Reservation");
const { promoteWhileAvailable } = require("../services/reservationService");

// Escape special characters so a search like "a(b" can't break the regex
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

exports.getBooks = async (req, res) => {
  try {
    const { search, category } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const query = {};

    if (search && search.trim()) {
      const regex = new RegExp(escapeRegex(search.trim()), "i");
      query.$or = [{ title: regex }, { author: regex }, { isbn: regex }];
    }
    if (category) query.category = category;

    const total = await Book.countDocuments(query);
    const books = await Book.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ books, total, pages: Math.ceil(total / limit), page });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });
    res.json(book);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addBook = async (req, res, next) => {
  try {
    const { title, author, isbn, category, totalCopies } = req.body;
    const book = await Book.create({
      title, author, isbn, category,
      totalCopies, availableCopies: totalCopies,
    });
    res.status(201).json(book);
  } catch (err) {
    next(err); // global handler turns duplicate ISBN into "isbn already exists"
  }
};

exports.updateBook = async (req, res, next) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });

    const { totalCopies, availableCopies, ...rest } = req.body; // availableCopies can't be set directly
    Object.assign(book, rest);

    if (totalCopies !== undefined) {
      // "issued" here also counts copies being held for reservations
      const issued = book.totalCopies - book.availableCopies;
      if (totalCopies < issued)
        return res.status(400).json({ message: `${issued} copies are currently issued or on hold` });
      book.totalCopies = totalCopies;
      book.availableCopies = totalCopies - issued;
    }

    await book.save();
    await promoteWhileAvailable(book._id); // if staff added copies, serve the waiting queue

    const fresh = await Book.findById(book._id); // reflects any copies just put on hold
    res.json(fresh);
  } catch (err) {
    next(err);
  }
};

exports.deleteBook = async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: "Book not found" });
    if (book.availableCopies < book.totalCopies)
      return res.status(400).json({ message: "Book has active issues or reservations on hold" });

    // Cancel any members still waiting for this book
    await Reservation.updateMany(
      { book: book._id, status: { $in: ["waiting", "ready"] } },
      { status: "cancelled" }
    );

    await book.deleteOne();
    res.json({ message: "Book deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await Book.distinct("category");
    res.json(categories.sort());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};