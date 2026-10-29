const Reservation = require("../models/Reservation");
const Book = require("../models/Book");

const HOLD_HOURS = 48;

// Call this when a copy becomes free (it must already be counted in availableCopies).
// Gives the copy to the first waiting member by holding it for them.
async function promoteNext(bookId) {
  const now = new Date();

  // 1. Claim the oldest waiting reservation
  const next = await Reservation.findOneAndUpdate(
    { book: bookId, status: "waiting" },
    {
      status: "ready",
      readyAt: now,
      expiresAt: new Date(now.getTime() + HOLD_HOURS * 60 * 60 * 1000),
    },
    { sort: { reservedAt: 1 }, new: true }
  );
  if (!next) return null;

  // 2. Hold the copy by removing it from the available count
  const held = await Book.findOneAndUpdate(
    { _id: bookId, availableCopies: { $gt: 0 } },
    { $inc: { availableCopies: -1 } }
  );

  // If someone grabbed the copy in between, put the member back in the queue
  if (!held) {
    await Reservation.findByIdAndUpdate(next._id, {
      status: "waiting",
      $unset: { readyAt: "", expiresAt: "" },
    });
    return null;
  }
  return next;
}

// Use when several copies may be free at once (e.g. staff increased total copies)
async function promoteWhileAvailable(bookId) {
  for (let i = 0; i < 50; i++) {
    const next = await promoteNext(bookId);
    if (!next) break;
  }
}

// Expire holds that were not collected in time
async function expireReservations() {
  const overdue = await Reservation.find({ status: "ready", expiresAt: { $lt: new Date() } });

  for (const r of overdue) {
    // The status condition makes sure only one process handles each reservation
    const claimed = await Reservation.findOneAndUpdate(
      { _id: r._id, status: "ready" },
      { status: "expired" }
    );
    if (!claimed) continue;

    await Book.findByIdAndUpdate(r.book, { $inc: { availableCopies: 1 } }); // release the held copy
    await promoteNext(r.book); // pass it to the next person
  }
}

module.exports = { promoteNext, promoteWhileAvailable, expireReservations, HOLD_HOURS };