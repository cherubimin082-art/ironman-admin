const express  = require("express");
const jwt      = require("jsonwebtoken");
const https    = require("https");
const bcrypt   = require("bcryptjs");
const pool     = require("../db");
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

function makeJwt(user) {
  const payload = { id: user.id, name: user.name, phone: user.phone, role: user.role };
  return { token: jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "12h" }), user: payload };
}

// ── POST /api/request-otp ───────────────────────────────────
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

    const otp = String(Math.floor(1000 + Math.random() * 9000));
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

    const { token, user: payload } = makeJwt(user);
    res.json({ message: "Login successful", user: payload, token });
  } catch (err) {
    console.error("verify-otp error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── POST /api/login  (password-based) ──────────────────────
router.post("/login", async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password)
    return res.status(400).json({ message: "phone and password are required" });

  const cleanPhone = String(phone).replace(/\D/g, "");

  try {
    const [rows] = await pool.query(
      "SELECT id, name, phone, role, password_hash FROM users WHERE phone = ? AND role != ?",
      [cleanPhone, "customer"]
    );
    if (!rows.length)
      return res.status(404).json({ message: "Staff account not found. Contact your admin." });

    const user = rows[0];
    if (!user.password_hash)
      return res.status(400).json({ message: "Password not set for this account. Use OTP login." });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res.status(401).json({ message: "Incorrect password. Try again." });

    const { token, user: payload } = makeJwt(user);
    res.json({ message: "Login successful", user: payload, token });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── POST /api/tablet-login (email + password for iron shop tablet) ───────────
router.post("/tablet-login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "email and password are required" });

  try {
    const [rows] = await pool.query(
      "SELECT id, name, phone, role, vendor_id, password_hash FROM users WHERE email = ? AND role = 'tablet' AND status = 'active'",
      [email.trim().toLowerCase()]
    );
    if (!rows.length)
      return res.status(404).json({ message: "Tablet account not found" });

    const user = rows[0];
    if (!user.password_hash)
      return res.status(400).json({ message: "Password not set" });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match)
      return res.status(401).json({ message: "Incorrect password" });

    const payload = { id: user.id, name: user.name, role: user.role, vendor_id: user.vendor_id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "30d" });
    res.json({ message: "Login successful", token, user: payload });
  } catch (err) {
    console.error("tablet-login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
