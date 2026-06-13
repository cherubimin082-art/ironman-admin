require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool   = require("./db");

const STAFF = [
  { phone: "9000000000", password: "admin123",    role: "admin"    },
  { phone: "9876543210", password: "vendor123",   role: "vendor"   },
  { phone: "9123456789", password: "delivery123", role: "delivery" },
];

async function seed() {
  for (const s of STAFF) {
    const hash = await bcrypt.hash(s.password, 10);
    await pool.query(
      "UPDATE users SET password_hash = ? WHERE phone = ? AND role = ?",
      [hash, s.phone, s.role]
    );
    console.log("Password set for", s.phone, "(" + s.role + ")");
  }
  console.log("Seed complete");
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
