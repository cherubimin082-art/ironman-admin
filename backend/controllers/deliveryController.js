const db = require('../config/db');

// ── GET /api/delivery/dashboard ───────────────────────────────────────────────
async function getDashboard(req, res) {
  const partnerId = req.user.id;
  const today     = new Date().toISOString().slice(0, 10);

  try {
    // Today's stats
    const [stats] = await db.query(
      `SELECT
         COUNT(*) AS total_jobs,
         SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END) AS delivered_today,
         SUM(CASE WHEN status = 'Delivered' THEN total_amount * 0.1 ELSE 0 END) AS earnings_today
       FROM orders
       WHERE delivery_partner_id = ? AND DATE(updated_at) = ?`,
      [partnerId, today]
    );

    // Pending pickups (assigned but not yet collected)
    const [pending] = await db.query(
      `SELECT COUNT(*) AS pending_pickups
       FROM orders
       WHERE delivery_partner_id = ?
         AND status IN ('Pickup Scheduled', 'Ironing Completed', 'Out for Delivery')`,
      [partnerId]
    );

    return res.json({
      success: true,
      dashboard: {
        total_jobs:      stats[0].total_jobs       || 0,
        delivered_today: stats[0].delivered_today  || 0,
        earnings_today:  parseFloat(stats[0].earnings_today) || 0,
        pending_pickups: pending[0].pending_pickups || 0,
      },
    });
  } catch (err) {
    console.error('delivery getDashboard error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ── GET /api/delivery/jobs ────────────────────────────────────────────────────
async function getJobs(req, res) {
  const partnerId = req.user.id;

  try {
    const [orders] = await db.query(
      `SELECT o.id, o.order_number, o.status, o.total_garments, o.total_amount,
              o.pickup_date, o.pickup_slot, o.delivery_date, o.delivery_slot, o.otp,
              u.name     AS customer_name,
              u.phone    AS customer_phone,
              v.name     AS vendor_name,
              v.address  AS vendor_address,
              a.address_line AS delivery_address,
              a.area, a.city, a.pincode, a.landmark
       FROM orders o
       JOIN users    u ON o.user_id   = u.id
       JOIN vendors  v ON o.vendor_id = v.id
       LEFT JOIN addresses a ON o.pickup_address_id = a.id
       WHERE o.delivery_partner_id = ?
       ORDER BY o.created_at DESC`,
      [partnerId]
    );

    return res.json({ success: true, jobs: orders });
  } catch (err) {
    console.error('getJobs error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ── PATCH /api/delivery/orders/:id/pickup-confirm ─────────────────────────────
async function confirmPickup(req, res) {
  const partnerId = req.user.id;
  const { id }    = req.params;
  const { otp }   = req.body;

  if (!otp) {
    return res.status(400).json({ success: false, message: 'OTP is required.' });
  }

  try {
    const [rows] = await db.query(
      'SELECT id, otp, status FROM orders WHERE id = ? AND delivery_partner_id = ?',
      [id, partnerId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found or access denied.' });
    }

    const order = rows[0];

    if (String(order.otp) !== String(otp)) {
      return res.status(400).json({ success: false, message: 'Invalid OTP.' });
    }

    await db.query(
      "UPDATE orders SET status = 'Clothes Collected' WHERE id = ?",
      [id]
    );

    await db.query(
      `INSERT INTO order_status_history (order_id, status, updated_by_role, updated_by_id, notes)
       VALUES (?, 'Clothes Collected', 'delivery', ?, 'OTP verified — clothes collected from customer')`,
      [id, partnerId]
    );

    return res.json({ success: true, message: 'Pickup confirmed. Status: Clothes Collected.' });
  } catch (err) {
    console.error('confirmPickup error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ── PATCH /api/delivery/orders/:id/delivery-confirm ───────────────────────────
async function confirmDelivery(req, res) {
  const partnerId = req.user.id;
  const { id }    = req.params;
  const { otp }   = req.body;

  if (!otp) {
    return res.status(400).json({ success: false, message: 'OTP is required.' });
  }

  try {
    const [rows] = await db.query(
      'SELECT id, otp, status FROM orders WHERE id = ? AND delivery_partner_id = ?',
      [id, partnerId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found or access denied.' });
    }

    const order = rows[0];

    if (String(order.otp) !== String(otp)) {
      return res.status(400).json({ success: false, message: 'Invalid OTP.' });
    }

    await db.query(
      "UPDATE orders SET status = 'Delivered' WHERE id = ?",
      [id]
    );

    await db.query(
      `INSERT INTO order_status_history (order_id, status, updated_by_role, updated_by_id, notes)
       VALUES (?, 'Delivered', 'delivery', ?, 'OTP verified — order delivered to customer')`,
      [id, partnerId]
    );

    // Increment partner total_deliveries
    await db.query(
      'UPDATE delivery_partners SET total_deliveries = total_deliveries + 1 WHERE id = ?',
      [partnerId]
    );

    return res.json({ success: true, message: 'Delivery confirmed. Status: Delivered.' });
  } catch (err) {
    console.error('confirmDelivery error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { getDashboard, getJobs, confirmPickup, confirmDelivery };
