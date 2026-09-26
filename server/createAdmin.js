const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const Admin = require("./models/admin");

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const username = "Celisha";
    const password = process.env.ADMIN_PASSWORD;

    if (!password) {
      throw new Error("ADMIN_PASSWORD is missing.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await Admin.findOneAndUpdate(
      { username },
      {
        username,
        password: hashedPassword,
        role: "admin"
      },
      {
        upsert: true,
        new: true
      }
    );

    console.log("Admin account updated successfully.");

    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

createAdmin();