require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { apiLimiter } = require("./middleware/rateLimiter");
const { expireReservations } = require("./services/reservationService");

connectDB();
const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "10kb" }));
app.use(morgan("dev"));
app.use("/api", apiLimiter);

app.get("/", (req, res) => res.send("Library API running"));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/books", require("./routes/bookRoutes"));
app.use("/api/issues", require("./routes/issueRoutes"));
app.use("/api/members", require("./routes/memberRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));
app.use("/api/reservations", require("./routes/reservationRoutes"));
app.use("/api/ai", require("./routes/aiRoutes"));

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));

// Every 5 minutes, expire holds that were not collected in time.
// (We'll move this to node-cron in the email reminders feature.)
setInterval(() => {
  expireReservations().catch((e) => console.error("Expire job failed:", e.message));
}, 5 * 60 * 1000);