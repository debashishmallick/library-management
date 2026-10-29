require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) {
      console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env first");
      process.exit(1);
    }

    const existing = await User.findOne({ email });
    if (existing) {
      console.log("Admin already exists:", email);
    } else {
      await User.create({
        name: process.env.ADMIN_NAME || "Admin",
        email,
        password, // hashed automatically by the model
        role: "admin",
      });
      console.log("Admin created:", email);
    }
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

run();