const User = require("../models/User");
const Issue = require("../models/Issue");

// Escape special characters so a search like "a(b" can't break the regex
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// List members with search and pagination
exports.getMembers = async (req, res) => {
  try {
    const { search } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const query = { role: "member" };

    if (search && search.trim()) {
      const regex = new RegExp(escapeRegex(search.trim()), "i");
      query.$or = [{ name: regex }, { email: regex }];
    }

    const total = await User.countDocuments(query);
    const members = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({ members, total, pages: Math.ceil(total / limit), page });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Single member with borrowing history
exports.getMember = async (req, res) => {
  try {
    const member = await User.findOne({ _id: req.params.id, role: "member" }).select("-password");
    if (!member) return res.status(404).json({ message: "Member not found" });

    const history = await Issue.find({ member: member._id })
      .populate("book", "title author")
      .sort({ createdAt: -1 });

    const totalFine = history.reduce((sum, i) => sum + i.fine, 0);
    const unpaidFine = history
      .filter((i) => i.fine > 0 && !i.finePaid)
      .reduce((sum, i) => sum + i.fine, 0);

    res.json({ member, history, totalFine, unpaidFine });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Block or unblock a member
exports.toggleBlock = async (req, res) => {
  try {
    const member = await User.findOne({ _id: req.params.id, role: "member" });
    if (!member) return res.status(404).json({ message: "Member not found" });

    member.isBlocked = !member.isBlocked;
    await member.save();
    res.json({
      message: member.isBlocked ? "Member blocked" : "Member unblocked",
      isBlocked: member.isBlocked,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Admin creates a librarian or member account
exports.createUser = async (req, res, next) => {
  try {
    const { name, password } = req.body;
    const email = req.body.email?.toLowerCase().trim();
    const role = req.body.role || "member";

    if (!name || !email || !password)
      return res.status(400).json({ message: "Name, email and password are required" });
    if (password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters" });

    // Only these two roles can be created here
    if (!["member", "librarian"].includes(role))
      return res.status(400).json({ message: "Role must be member or librarian" });

    if (await User.findOne({ email }))
      return res.status(400).json({ message: "Email already registered" });

    const user = await User.create({ name, email, password, role, createdBy: req.user._id });
    res.status(201).json({ _id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    next(err); // global error handler formats duplicate/validation errors
  }
};

// Admin: list all librarians with who created them
exports.getLibrarians = async (req, res, next) => {
  try {
    const librarians = await User.find({ role: "librarian" })
      .select("-password")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });
    res.json(librarians);
  } catch (err) {
    next(err);
  }
};

// Admin: block or unblock a librarian
exports.toggleLibrarianBlock = async (req, res, next) => {
  try {
    const librarian = await User.findOne({ _id: req.params.id, role: "librarian" });
    if (!librarian) return res.status(404).json({ message: "Librarian not found" });

    librarian.isBlocked = !librarian.isBlocked;
    await librarian.save();
    res.json({
      message: librarian.isBlocked ? "Librarian blocked" : "Librarian unblocked",
      isBlocked: librarian.isBlocked,
    });
  } catch (err) {
    next(err);
  }
};