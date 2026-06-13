require("dotenv").config();
const pool = require("./db");

async function run() {
  await pool.query("DROP TABLE IF EXISTS vendor_capacity");
  await pool.query(
    "CREATE TABLE vendor_capacity (" +
    "  id                 INT AUTO_INCREMENT PRIMARY KEY," +
    "  vendor_id          INT NOT NULL," +
    "  apartment          VARCHAR(200) NOT NULL," +
    "  max_orders_per_day INT NOT NULL DEFAULT 10," +
    "  created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP," +
    "  updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP," +
    "  UNIQUE KEY uq_vendor_apt (vendor_id, apartment)," +
    "  CONSTRAINT fk_vc_vendor FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE" +
    ")"
  );
  console.log("vendor_capacity recreated OK");
  process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
