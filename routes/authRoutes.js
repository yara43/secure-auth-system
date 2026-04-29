const express = require("express");
const bcrypt = require("bcrypt");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const jwt = require("jsonwebtoken");
const db = require("../database");

const router = express.Router();

router.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (!["Admin", "Manager", "User"].includes(role)) {
    return res.status(400).json({ message: "Role must be Admin, Manager, or User" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const secret = speakeasy.generateSecret({
      name: `SecureAuthSystem (${email})`
    });

    db.run(
      `INSERT INTO users (name, email, password, role, two_factor_secret)
       VALUES (?, ?, ?, ?, ?)`,
      [name, email, hashedPassword, role, secret.base32],
      async function (err) {
        if (err) {
          return res.status(400).json({ message: "Email already exists" });
        }

        const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

        res.status(201).json({
          message: "User registered successfully",
          userId: this.lastID,
          email,
          role,
          qrCodeUrl
        });
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.get("SELECT * FROM users WHERE email = ?", [email], async (err, user) => {
    if (err) return res.status(500).json({ message: "Database error" });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    res.json({
      message: "Password correct. Please enter 2FA code",
      email: user.email
    });
  });
});

router.post("/verify-2fa", (req, res) => {
  const { email, token } = req.body;

  db.get("SELECT * FROM users WHERE email = ?", [email], (err, user) => {
    if (err) return res.status(500).json({ message: "Database error" });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: "base32",
      token,
      window: 1
    });

    if (!verified) {
      return res.status(400).json({ message: "Invalid 2FA code" });
    }

    const jwtToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      message: "Login successful",
      token: jwtToken,
      role: user.role
    });
  });
});

module.exports = router;