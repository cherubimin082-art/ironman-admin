const db = require('../config/db');

// ── GET /api/vendors/dashboard ────────────────────────────────────────────────
async function getDashboard(req, res) {
  const vendorId = req.user.id;
  const today    = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  try {
    // Today's orders
    const [todayOrders] = await db.query(
      `SELECT COUNT(*) AS total_orders,
              SUM(total_garments) AS total_garments,
              SUM(CASE WHEN status = 'Delivered' THEN total_amount ELSE 0 END) AS revenue
       FROM orders
       WHERE vendor_id = ? AND DATE(created_at) = ?`,
      [vendorId, today]
    );

    // Pending garments (not yet delivered or cancelled)
    const [pending] = await db.query(
      `SELECT COALESCE(SUM(total_garments), 0) AS pending_garments
       FROM orders
       WHERE vendor_id = ?
         AND status NOT IN ('Delivered', 'Cancelled')`,
      [vendorId]
    );

    // Status breakdown
    const [statusBreakdown] = await db.query(
      `SELECT status, COUNT(*) AS count
       FROM orders
       WHERE vendor_id = ?
       GROUP BY status`,
      [vendorId]
    );

    return res.json({
      success: true,
      dashboard: {
        today_orders:     todayOrders[0].total_orders    || 0,
        today_garments:   todayOrders[0].total_garments  || 0,
        today_revenue:    parseFloat(todayOrders[0].revenue) || 0,
        pending_garments: pending[0].pending_garments    || 0,
        status_breakdown: statusBreakdown,
      },
    });
  } catch (err) {
    console.error('vendor getDashboard error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ── GET /api/vendors/orders ───────────────────────────────────────────────────
async function getVendorOrders(req, res) {
  const vendorId = req.user.id;

  try {
    const [orders] = await db.query(
      `SELECT o.id, o.order_number, o.status, o.total_garments, o.total_amount,
              o.pickup_date, o.pickup_slot, o.delivery_date, o.delivery_slot,
              o.payment_method, o.payment_status, o.created_at,
              u.name  AS customer_name,
              u.phone AS customer_phone
       FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.vendor_id = ?
       ORDER BY o.created_at DESC`,
      [vendorId]
    );

    for (const order of orders) {
      const [items] = await db.query(
        `SELECT oi.quantity, oi.price_per_unit, oi.total_price, gt.name AS garment_name
         FROM order_items oi
         JOIN garment_types gt ON oi.garment_type_id = gt.id
         WHERE oi.order_id = ?`,
        [order.id]
      );
      order.items = items;
    }

    return res.json({ success: true, orders });
  } catch (err) {
    console.error('getVendorOrders error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ── PATCH /api/vendors/orders/:id/status ─────────────────────────────────────
async function updateOrderStatus(req, res) {
  const vendorId = req.user.id;
  const { id }   = req.params;
  const { status } = req.body;

  const ALLOWED_STATUSES = [
    'Ironing In Progress',
    'Ironing Completed',
    'Clothes Collected',
  ];

  if (!status || !ALLOWED_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}`,
    });
  }

  try {
    // Verify order belongs to this vendor
    const [rows] = await db.query(
      'SELECT id FROM orders WHERE id = ? AND vendor_id = ?',
      [id, vendorId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found or access denied.' });
    }

    await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);

    await db.query(
      `INSERT INTO order_status_history (order_id, status, updated_by_role, updated_by_id)
       VALUES (?, ?, 'vendor', ?)`,
      [id, status, vendorId]
    );

    return res.json({ success: true, message: `Order status updated to "${status}".` });
  } catch (err) {
    console.error('updateOrderStatus error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ── GET /api/vendors/capacity ─────────────────────────────────────────────────
async function getCapacity(req, res) {
  const vendorId = req.user.id;

  try {
    const [rows] = await db.query(
      'SELECT max_capacity, current_capacity FROM vendors WHERE id = ?',
      [vendorId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Vendor not found.' });
    }

    const { max_capacity, current_capacity } = rows[0];
    return res.json({
      success: true,
      capacity: {
        max_capacity,
        current_capacity,
        available_capacity: max_capacity - current_capacity,
        utilization_pct: max_capacity > 0 ? Math.round((current_capacity / max_capacity) * 100) : 0,
      },
    });
  } catch (err) {
    console.error('getCapacity error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ── PATCH /api/vendors/capacity ───────────────────────────────────────────────
async function updateCapacity(req, res) {
  const vendorId    = req.user.id;
  const { max_capacity } = req.body;

  if (!max_capacity || isNaN(max_capacity) || max_capacity < 1) {
    return res.status(400).json({ success: false, message: 'Valid max_capacity is required.' });
  }

  try {
    await db.query('UPDATE vendors SET max_capacity = ? WHERE id = ?', [max_capacity, vendorId]);
    return res.json({ success: true, message: 'Capacity updated successfully.' });
  } catch (err) {
    console.error('updateCapacity error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { getDashboard, getVendorOrders, updateOrderStatus, getCapacity, updateCapacity };
