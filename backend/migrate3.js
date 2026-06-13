require("dotenv").config();
const pool = require("./db");

async function run() {
  const [cols] = await pool.query("DESCRIBE orders");
  const fields = cols.map(c => c.Field);

  if (!fields.includes("customer_latitude")) {
    await pool.query("ALTER TABLE orders ADD COLUMN customer_latitude DECIMAL(10,8) NULL");
    console.log("Added customer_latitude column");
  } else {
    console.log("customer_latitude already exists");
  }

  if (!fields.includes("customer_longitude")) {
    await pool.query("ALTER TABLE orders ADD COLUMN customer_longitude DECIMAL(11,8) NULL");
    console.log("Added customer_longitude column");
  } else {
    console.log("customer_longitude already exists");
  }

  console.log("Migration 3 complete");
  process.exit(0);
}

run().catch(e => { console.error(e.message); process.exit(1); });
