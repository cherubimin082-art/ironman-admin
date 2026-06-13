require('dotenv').config();
const pool = require('./db');

async function fix() {
  try {
    await pool.query(`
      ALTER TABLE delivery_assignments MODIFY COLUMN status
      ENUM('assigned','accepted','picked_up','at_vendor',
           'ironing_in_progress','picked_from_vendor',
           'out_for_delivery','delivered','cancelled')
      NOT NULL DEFAULT 'assigned'
    `);
    console.log('OK  delivery_assignments.status ENUM updated');
    process.exit(0);
  } catch (err) {
    console.error('FAIL', err.message);
    process.exit(1);
  }
}
fix();
