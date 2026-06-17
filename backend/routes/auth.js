const express = require("express");
const jwt     = require("jsonwebtoken");
const https   = require("https");
const pool    = require("../db");
require("dotenv").config();

const router = express.Router();

// ── WhatsApp OTP sender ─────────────────────────────────────
function sendWhatsAppOtp(phone10digit, otp) {
  const phone = "91" + phone10digit;
  const path  = `/webhook/014bb05a-ec6e-4cda-b3dc-614b418dfe79?phone_number=${phone}&otp=${otp}`;

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "automate.cherubim.in",
        path,
        method:  "POST",
        headers: { Authorization: "Basic b3RwX2F1dGg6QzAwTDc4Njk1NTk5" },
      },
      res => { res.resume(); resolve(res.statusCode); }
    );
    req.setTimeout(8000, () => { req.destroy(); reject(new Error("webhook timeout")); });
    req.on("error", reject);
    req.end();
  });
}

// ── POST /api/request-otp ───────────────────────────────────
// Finds staff user by phone, generates OTP, sends via WhatsApp.
router.post("/request-otp", async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ message: "phone is required" });

  const cleanPhone = String(phone).replace(/\D/g, "");
  if (cleanPhone.length !== 10)
    return res.status(400).json({ message: "Enter a valid 10-digit number" });

  try {
    const [rows] = await pool.query(
      "SELECT id FROM users WHERE phone = ? AND role != ?",
      [cleanPhone, "customer"]
    );
    if (!rows.length)
      return res.status(404).json({ message: "Staff account not found. Contact your admin." });

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    await pool.query("UPDATE users SET otp = ? WHERE id = ?", [otp, rows[0].id]);

    try { await sendWhatsAppOtp(cleanPhone, otp); }
    catch (err) { console.error("WhatsApp OTP error:", err.message); }

    res.json({ message: "OTP sent to your WhatsApp" });
  } catch (err) {
    console.error("request-otp error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── POST /api/verify-otp ────────────────────────────────────
// Verifies the OTP and returns a JWT on success.
router.post("/verify-otp", async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp)
    return res.status(400).json({ message: "phone and otp are required" });

  const cleanPhone = String(phone).replace(/\D/g, "");

  try {
    const [rows] = await pool.query(
      "SELECT id, name, phone, role, otp FROM users WHERE phone = ? AND role != ?",
      [cleanPhone, "customer"]
    );
    if (!rows.length)
      return res.status(404).json({ message: "Staff account not found" });

    const user = rows[0];
    if (!user.otp)
      return res.status(400).json({ message: "OTP expired. Please request a new one." });
    if (String(otp).trim() !== String(user.otp).trim())
      return res.status(400).json({ message: "Incorrect OTP. Please try again." });

    await pool.query("UPDATE users SET otp = NULL WHERE id = ?", [user.id]);

    const payload = { id: user.id, name: user.name, phone: user.phone, role: user.role };
    const token   = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "12h" });

    res.json({ message: "Login successful", user: payload, token });
  } catch (err) {
    console.error("verify-otp error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
