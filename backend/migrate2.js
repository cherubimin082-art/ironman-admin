require("dotenv").config();
const pool = require("./db");

async function run() {
  // 1. vendor_capacity
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendor_capacity (
      id               INT AUTO_INCREMENT PRIMARY KEY,
      vendor_id        INT NOT NULL,
      apartment        VARCHAR(200) NOT NULL,
      max_orders_per_day INT NOT NULL DEFAULT 10,
      created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_vendor_apt (vendor_id, apartment),
      CONSTRAINT fk_vc_vendor FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log("vendor_capacity table OK");

  // 2. vendor_staff
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vendor_staff (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      vendor_id      INT NOT NULL,
      name           VARCHAR(100) NOT NULL,
      mobile_number  VARCHAR(20)  NOT NULL,
      role_title     VARCHAR(100),
      created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_vs_vendor FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
  console.log("vendor_staff table OK");

  console.log("Migration 2 complete");
  process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
