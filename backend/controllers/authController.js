const db  = require('../config/db');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// ── helpers ──────────────────────────────────────────────────────────────────

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// In-memory OTP store (replace with Redis / DB in production)
const otpStore = {};

// ── POST /api/auth/customer/send-otp ─────────────────────────────────────────
async function sendOTP(req, res) {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ success: false, message: 'Phone number is required.' });
  }

  try {
    // Check if user exists; create if not
    const [rows] = await db.query('SELECT id, name, phone, role FROM users WHERE phone = ?', [phone]);

    if (rows.length === 0) {
      await db.query(
        'INSERT INTO users (name, phone, role) VALUES (?, ?, ?)',
        [`User_${phone.slice(-4)}`, phone, 'customer']
      );
    }

    // Dummy OTP — always 123456 for development
    const otp = '123456';
    otpStore[phone] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 }; // 5 min TTL

    console.log(`OTP for ${phone}: ${otp}`);

    return res.json({ success: true, otp, message: 'OTP sent successfully.' });
  } catch (err) {
    console.error('sendOTP error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ── POST /api/auth/customer/verify-otp ───────────────────────────────────────
async function verifyOTP(req, res) {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ success: false, message: 'Phone and OTP are required.' });
  }

  const record = otpStore[phone];

  if (!record || record.otp !== String(otp)) {
    return res.status(400).json({ success: false, message: 'Invalid OTP.' });
  }

  if (Date.now() > record.expiresAt) {
    delete otpStore[phone];
    return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
  }

  delete otpStore[phone];

  try {
    const [rows] = await db.query(
      'SELECT id, name, phone, role FROM users WHERE phone = ?',
      [phone]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const user  = rows[0];
    const token = signToken({ id: user.id, role: user.role, phone: user.phone });

    return res.json({ success: true, token, user });
  } catch (err) {
    console.error('verifyOTP error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ── POST /api/auth/staff/login ────────────────────────────────────────────────
async function staffLogin(req, res) {
  const { phone, password } = req.body;

  if (!phone || !password) {
    return res.status(400).json({ success: false, message: 'Phone and password are required.' });
  }

  try {
    // 1. Check vendors
    let [rows] = await db.query(
      'SELECT id, name, phone, password FROM vendors WHERE phone = ? AND is_active = 1',
      [phone]
    );

    if (rows.length > 0) {
      const vendor = rows[0];
      if (vendor.password !== password) {
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });
      }
      const token = signToken({ id: vendor.id, role: 'vendor', phone: vendor.phone });
      const { password: _, ...safeVendor } = vendor;
      return res.json({ success: true, token, user: { ...safeVendor, role: 'vendor' } });
    }

    // 2. Check delivery_partners
    [rows] = await db.query(
      'SELECT id, name, phone, password FROM delivery_partners WHERE phone = ? AND is_active = 1',
      [phone]
    );

    if (rows.length > 0) {
      const partner = rows[0];
      if (partner.password !== password) {
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });
      }
      const token = signToken({ id: partner.id, role: 'delivery', phone: partner.phone });
      const { password: _, ...safePartner } = partner;
      return res.json({ success: true, token, user: { ...safePartner, role: 'delivery' } });
    }

    // 3. Check users (admin)
    [rows] = await db.query(
      "SELECT id, name, phone, password, role FROM users WHERE phone = ? AND role = 'admin' AND is_active = 1",
      [phone]
    );

    if (rows.length > 0) {
      const admin = rows[0];
      if (admin.password !== password) {
        return res.status(401).json({ success: false, message: 'Invalid credentials.' });
      }
      const token = signToken({ id: admin.id, role: 'admin', phone: admin.phone });
      const { password: _, ...safeAdmin } = admin;
      return res.json({ success: true, token, user: safeAdmin });
    }

    return res.status(401).json({ success: false, message: 'No account found with this phone number.' });
  } catch (err) {
    console.error('staffLogin error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { sendOTP, verifyOTP, staffLogin };
