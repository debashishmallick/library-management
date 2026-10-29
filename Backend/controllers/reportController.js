const Book = require("../models/Book");
const User = require("../models/User");
const Issue = require("../models/Issue");

exports.getStats = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === "admin";

    const [totalTitles, totalMembers, issuedNow, overdue, copies, fines, topBooks, monthly, librarians] =
      await Promise.all([
        Book.countDocuments(),
        User.countDocuments({ role: "member" }),
        Issue.countDocuments({ status: "issued" }),
        Issue.countDocuments({ status: "issued", dueDate: { $lt: new Date() } }),
        Book.aggregate([
          { $group: { _id: null, total: { $sum: "$totalCopies" }, available: { $sum: "$availableCopies" } } },
        ]),
        Issue.aggregate([{ $group: { _id: null, total: { $sum: "$fine" } } }]),

        // Top 5 most borrowed books
        Issue.aggregate([
          { $group: { _id: "$book", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
          { $lookup: { from: "books", localField: "_id", foreignField: "_id", as: "book" } },
          { $unwind: "$book" },
          { $project: { _id: 0, title: "$book.title", count: 1 } },
        ]),

        // Issues per month for the last 6 months
        Issue.aggregate([
          {
            $match: {
              issueDate: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 6)) },
            },
          },
          {
            $group: {
              _id: { year: { $year: "$issueDate" }, month: { $month: "$issueDate" } },
              count: { $sum: 1 },
            },
          },
          { $sort: { "_id.year": 1, "_id.month": 1 } },
        ]),

        // Librarians: only loaded for admins
        isAdmin
          ? User.find({ role: "librarian" })
              .select("name email isBlocked createdAt")
              .sort({ createdAt: -1 })
          : Promise.resolve(null),
      ]);

    const data = {
      totalTitles,
      totalCopies: copies[0]?.total || 0,
      availableCopies: copies[0]?.available || 0,
      totalMembers,
      issuedNow,
      overdue,
      totalFines: fines[0]?.total || 0,
      topBooks,
      monthly,
    };

    // Only admins receive librarian details
    if (isAdmin) data.librarians = librarians;

    res.json(data);
  } catch (err) {
    next(err);
  }
};
