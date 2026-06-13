require("dotenv").config();
const pool = require("./db");
async function run() {
  const [refs] = await pool.query(
    "SELECT TABLE_NAME, CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE REFERENCED_TABLE_NAME = 'garments' AND TABLE_SCHEMA = DATABASE()"
  );
  console.log("FK refs to garments:", JSON.stringify(refs));
  process.exit(0);
}
run().catch(e => { console.error(e.message); process.exit(1); });
