const mongoose = require("mongoose");

const reservationSchema = new mongoose.Schema(
  {
    book: { type: mongoose.Schema.Types.ObjectId, ref: "Book", required: true },
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["waiting", "ready", "fulfilled", "cancelled", "expired"],
      default: "waiting",
    },
    reservedAt: { type: Date, default: Date.now },
    readyAt: { type: Date },
    expiresAt: { type: Date },
  },
  { timestamps: true },
);

reservationSchema.index({ book: 1, status: 1, reservedAt: 1 });

module.exports = mongoose.model("Reservation", reservationSchema);
