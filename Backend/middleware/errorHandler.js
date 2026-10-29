exports.notFound = (req, res, next) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

exports.errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Invalid MongoDB ObjectId
  if (err.name === "CastError")
    return res.status(400).json({ message: "Invalid ID format" });

  // Duplicate key (e.g. same ISBN or email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ message: `${field} already exists` });
  }

  // Mongoose validation error
  if (err.name === "ValidationError")
    return res.status(400).json({ message: Object.values(err.errors)[0].message });

  res.status(err.statusCode || 500).json({ message: err.message || "Server error" });
};