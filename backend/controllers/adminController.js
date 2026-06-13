const db = require('../config/db');

// ── GET /api/admin/dashboard ──────────────────────────────────────────────────
async function getDashboard(req, res) {
  const today = new Date().toISOString().slice(0, 10);

  try {
    // Overall order stats
    const [orderStats] = await db.query(
      `SELECT
         COUNT(*) AS total_orders,
         SUM(CASE WHEN DATE(created_at) = ? THEN 1 ELSE 0 END) AS today_orders,
         SUM(CASE WHEN status = 'Delivered' THEN total_amount ELSE 0 END) AS total_revenue,
         SUM(CASE WHEN status = 'Delivered' AND DATE(updated_at) = ? THEN total_amount ELSE 0 END) AS today_revenue
       FROM orders`,
      [today, today]
    );

    // Active vendors
    const [vendorStats] = await db.query(
      "SELECT COUNT(*) AS active_vendors FROM vendors WHERE is_active = 1"
    );

    // Active delivery partners
    const [dpStats] = await db.query(
      "SELECT COUNT(*) AS active_partners FROM delivery_partners WHERE is_active = 1"
    );

    // Order status breakdown
    const [statusBreakdown] = await db.query(
      "SELECT status, COUNT(*) AS count FROM orders GROUP BY status"
    );

    // Recent 5 orders
    const [recentOrders] = await db.query(
      `SELECT o.order_number, o.status, o.total_amount, o.created_at,
              u.name AS customer_name, v.name AS vendor_name
       FROM orders o
       JOIN users u   ON o.user_id   = u.id
       JOIN vendors v ON o.vendor_id = v.id
       ORDER BY o.created_at DESC
       LIMIT 5`
    );

    return res.json({
      success: true,
      dashboard: {
        total_orders:     orderStats[0].total_orders    || 0,
        today_orders:     orderStats[0].today_orders    || 0,
        total_revenue:    parseFloat(orderStats[0].total_revenue)  || 0,
        today_revenue:    parseFloat(orderStats[0].today_revenue)  || 0,
        active_vendors:   vendorStats[0].active_vendors  || 0,
        active_partners:  dpStats[0].active_partners     || 0,
        status_breakdown: statusBreakdown,
        recent_orders:    recentOrders,
      },
    });
  } catch (err) {
    console.error('admin getDashboard error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ── GET /api/admin/orders ─────────────────────────────────────────────────────
// Query params: ?status=&vendor_id=&date=
async function getAllOrders(req, res) {
  const { status, vendor_id, date } = req.query;

  let query  = `
    SELECT o.*,
           u.name   AS customer_name,  u.phone AS customer_phone,
           v.name   AS vendor_name,
           dp.name  AS delivery_partner_name
    FROM orders o
    JOIN users            u  ON o.user_id             = u.id
    LEFT JOIN vendors     v  ON o.vendor_id           = v.id
    LEFT JOIN delivery_partners dp ON o.delivery_partner_id = dp.id
    WHERE 1=1
  `;
  const params = [];

  if (status) {
    query += ' AND o.status = ?';
    params.push(status);
  }
  if (vendor_id) {
    query += ' AND o.vendor_id = ?';
    params.push(vendor_id);
  }
  if (date) {
    query += ' AND DATE(o.created_at) = ?';
    params.push(date);
  }

  query += ' ORDER BY o.created_at DESC';

  try {
    const [orders] = await db.query(query, params);
    return res.json({ success: true, total: orders.length, orders });
  } catch (err) {
    console.error('getAllOrders error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ── GET /api/admin/vendors ────────────────────────────────────────────────────
async function getAllVendors(req, res) {
  try {
    const [vendors] = await db.query(
      `SELECT v.*,
              COUNT(o.id)                                             AS total_orders,
              COALESCE(SUM(o.total_amount), 0)                       AS total_revenue,
              SUM(CASE WHEN o.status NOT IN ('Delivered','Cancelled')
                       THEN 1 ELSE 0 END)                           AS active_orders
       FROM vendors v
       LEFT JOIN orders o ON v.id = o.vendor_id
       GROUP BY v.id
       ORDER BY v.id`
    );

    // Remove passwords before sending
    const safe = vendors.map(({ password, ...v }) => v);
    return res.json({ success: true, vendors: safe });
  } catch (err) {
    console.error('getAllVendors error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ── GET /api/admin/delivery-partners ─────────────────────────────────────────
async function getAllDeliveryPartners(req, res) {
  try {
    const [partners] = await db.query(
      `SELECT dp.*,
              COUNT(o.id)                                                   AS assigned_orders,
              SUM(CASE WHEN o.status = 'Delivered' THEN 1 ELSE 0 END)      AS completed_deliveries
       FROM delivery_partners dp
       LEFT JOIN orders o ON dp.id = o.delivery_partner_id
       GROUP BY dp.id
       ORDER BY dp.id`
    );

    const safe = partners.map(({ password, ...p }) => p);
    return res.json({ success: true, partners: safe });
  } catch (err) {
    console.error('getAllDeliveryPartners error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { getDashboard, getAllOrders, getAllVendors, getAllDeliveryPartners };
