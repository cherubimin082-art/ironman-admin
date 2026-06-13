require('dotenv').config();
const pool = require('./db');

async function migrate() {
  try {
    const [cols] = await pool.query('DESCRIBE orders');
    const colNames = cols.map(c => c.Field);

    // 1. Add delivery_otp column
    if (!colNames.includes('delivery_otp')) {
      await pool.query('ALTER TABLE orders ADD COLUMN delivery_otp VARCHAR(10) NULL');
      console.log('✅  Added delivery_otp column');
    } else {
      console.log('ℹ️   delivery_otp already exists');
    }

    // 2. Extend status ENUM if needed
    const statusCol = cols.find(c => c.Field === 'status');
    if (statusCol && statusCol.Type.startsWith('enum')) {
      await pool.query(`
        ALTER TABLE orders MODIFY COLUMN status ENUM(
          'pending','vendor_accepted','delivery_assigned',
          'picked_up','at_vendor','ironing_in_progress','in_progress',
          'ready_for_delivery','picked_from_vendor',
          'out_for_delivery','delivered','cancelled'
        ) NOT NULL DEFAULT 'pending'
      `);
      console.log('✅  Updated status ENUM with ironing_in_progress, picked_from_vendor');
    } else {
      console.log('ℹ️   status is VARCHAR — no ENUM modification needed');
    }

    console.log('🎉  Migration 4 complete');
    process.exit(0);
  } catch (err) {
    console.error('❌  Migration 4 failed:', err.message);
    process.exit(1);
  }
}

migrate();
