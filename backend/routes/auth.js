const express  = require("express");
const bcrypt   = require("bcryptjs");
const jwt      = require("jsonwebtoken");
const pool     = require("../db");
require("dotenv").config();

const router = express.Router();

// POST /api/login  — admin / vendor / delivery login
router.post("/login", async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password)
    return res.status(400).json({ message: "phone and password are required" });

  const cleanPhone = phone.replace(/\D/g, "");
  try {
    const [rows] = await pool.query(
      "SELECT id, name, phone, role, password_hash FROM users WHERE phone = ? AND role != ?",
      [cleanPhone, "customer"]
    );
    if (!rows.length)
      return res.status(404).json({ message: "Staff account not found" });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res.status(401).json({ message: "Incorrect password" });

    const payload = { id: user.id, name: user.name, phone: user.phone, role: user.role };
    const token   = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "12h" });

    res.json({ message: "Login successful", user: payload, token });
  } catch (err) {
    console.error("admin login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
