const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/admin");

const router = express.Router();

router.post("/login", async (req, res) => {
  try {
    const username = req.body.username?.trim();
    const password = req.body.password;

    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required."
      });
    }

    const admin = await Admin.findOne({
      username: username
    });

    console.log("LOGIN USER:", username);
    console.log("ADMIN FOUND:", !!admin);

    if (!admin) {
      return res.status(401).json({
        message: "Invalid username or password."
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      admin.password
    );

    console.log("PASSWORD MATCH:", passwordMatches);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid username or password."
      });
    }

    const token = jwt.sign(
      {
        id: admin._id.toString(),
        username: admin.username,
        role: admin.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "8h"
      }
    );

    return res.json({
      message: "Login successful.",
      token,
      admin: {
        id: admin._id.toString(),
        username: admin.username,
        role: admin.role
      }
    });

  } catch (error) {
    console.error("Admin login error:", error);

    return res.status(500).json({
      message: "Server error."
    });
  }
});