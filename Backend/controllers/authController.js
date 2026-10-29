const jwt = require("jsonwebtoken");
const User = require("../models/User");

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (await User.findOne({ email }))
      return res.status(400).json({ message: "Email already registered" });

    // role is always "member" here; promote admins manually (see note below)
    const user = await User.create({ name, email, password });
    res.status(201).json({
      _id: user._id, name: user.name, email: user.email,
      role: user.role, token: generateToken(user._id),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: "Invalid email or password" });
    if (user.isBlocked)
      return res.status(403).json({ message: "Account is blocked" });

    res.json({
      _id: user._id, name: user.name, email: user.email,
      role: user.role, token: generateToken(user._id),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



exports.updateProfile = async (req, res, next) => {
  try {
    const name = req.body.name?.trim();
    if (!name) return res.status(400).json({ message: "Name is required" });
    if (name.length > 60) return res.status(400).json({ message: "Name is too long" });

    const user = await User.findById(req.user._id).select("-password");
    user.name = name;
    await user.save();

    res.json({ _id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: "Current and new password are required" });
    if (newPassword.length < 6)
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    if (currentPassword === newPassword)
      return res.status(400).json({ message: "New password must be different" });

    // req.user has no password field, so load it fresh
    const user = await User.findById(req.user._id);
    if (!(await user.matchPassword(currentPassword)))
      return res.status(400).json({ message: "Current password is incorrect" });

    user.password = newPassword; // hashed by the pre-save hook
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    next(err);
  }
};

exports.getMe = (req, res) => res.json(req.user);