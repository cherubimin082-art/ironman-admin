const db = require('../config/db');
const { generateOrderNumber, generateOTP, calculateTotal } = require('../helpers/orderHelper');

// ── POST /api/orders/create ───────────────────────────────────────────────────
async function createOrder(req, res) {
  const userId = req.user.id;
  const {
    garments,          // [{ garment_type_id, quantity }]
    pickup_date,
    pickup_slot,
    delivery_date,
    delivery_slot,
    pickup_address_id,
    payment_method = 'UPI',
    special_instructions,
  } = req.body;

  if (!garments || !Array.isArray(garments) || garments.length === 0) {
    return res.status(400).json({ success: false, message: 'Garments list is required.' });
  }

  try {
    // Fetch garment prices
    const [garmentRows] = await db.query('SELECT id, price FROM garment_types WHERE is_active = 1');
    const priceMap = {};
    garmentRows.forEach((g) => { priceMap[g.id] = parseFloat(g.price); });

    // Validate garment IDs
    for (const item of garments) {
      if (!priceMap[item.garment_type_id]) {
        return res.status(400).json({ success: false, message: `Invalid garment_type_id: ${item.garment_type_id}` });
      }
    }

    const totalAmount   = calculateTotal(garments, priceMap);
    const totalGarments = garments.reduce((s, g) => s + g.quantity, 0);

    // Pick first active vendor
    const [vendors] = await db.query(
      'SELECT id FROM vendors WHERE is_active = 1 ORDER BY id LIMIT 1'
    );
    if (vendors.length === 0) {
      return res.status(503).json({ success: false, message: 'No vendors available right now.' });
    }
    const vendorId = vendors[0].id;

    const orderNumber = generateOrderNumber();
    const otp         = generateOTP(4);

    // Insert order
    const [orderResult] = await db.query(
      `INSERT INTO orders
         (order_number, user_id, vendor_id, status, total_garments, total_amount,
          pickup_address_id, pickup_date, pickup_slot, delivery_date, delivery_slot,
          payment_method, payment_status, special_instructions, otp)
       VALUES (?, ?, ?, 'Order Placed', ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)`,
      [
        orderNumber, userId, vendorId, totalGarments, totalAmount,
        pickup_address_id || null, pickup_date || null, pickup_slot || null,
        delivery_date || null, delivery_slot || null,
        payment_method, special_instructions || null, otp,
      ]
    );

    const orderId = orderResult.insertId;

    // Insert order items
    const itemValues = garments.map((item) => [
      orderId,
      item.garment_type_id,
      item.quantity,
      priceMap[item.garment_type_id],
      priceMap[item.garment_type_id] * item.quantity,
    ]);
    await db.query(
      'INSERT INTO order_items (order_id, garment_type_id, quantity, price_per_unit, total_price) VALUES ?',
      [itemValues]
    );

    // Insert initial status history
    await db.query(
      `INSERT INTO order_status_history (order_id, status, updated_by_role, updated_by_id, notes)
       VALUES (?, 'Order Placed', 'customer', ?, 'Order created via app')`,
      [orderId, userId]
    );

    // Update vendor current capacity
    await db.query(
      'UPDATE vendors SET current_capacity = current_capacity + ? WHERE id = ?',
      [totalGarments, vendorId]
    );

    // Fetch full order to return
    const [newOrder] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);

    return res.status(201).json({ success: true, order: newOrder[0] });
  } catch (err) {
    console.error('createOrder error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ── GET /api/orders/my-orders ─────────────────────────────────────────────────
async function getMyOrders(req, res) {
  const userId = req.user.id;

  try {
    const [orders] = await db.query(
      `SELECT o.*,
              v.name  AS vendor_name,
              v.phone AS vendor_phone
       FROM orders o
       LEFT JOIN vendors v ON o.vendor_id = v.id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`,
      [userId]
    );

    // Attach items to each order
    for (const order of orders) {
      const [items] = await db.query(
        `SELECT oi.*, gt.name AS garment_name, gt.icon
         FROM order_items oi
         JOIN garment_types gt ON oi.garment_type_id = gt.id
         WHERE oi.order_id = ?`,
        [order.id]
      );
      order.items = items;
    }

    return res.json({ success: true, orders });
  } catch (err) {
    console.error('getMyOrders error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

// ── GET /api/orders/:id ───────────────────────────────────────────────────────
async function getOrderById(req, res) {
  const { id } = req.params;
  const user   = req.user;

  try {
    const [orders] = await db.query(
      `SELECT o.*,
              u.name  AS customer_name,
              u.phone AS customer_phone,
              v.name  AS vendor_name,
              dp.name AS delivery_partner_name
       FROM orders o
       LEFT JOIN users            u  ON o.user_id             = u.id
       LEFT JOIN vendors          v  ON o.vendor_id           = v.id
       LEFT JOIN delivery_partners dp ON o.delivery_partner_id = dp.id
       WHERE o.id = ?`,
      [id]
    );

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = orders[0];

    // Customers can only view their own orders
    if (user.role === 'customer' && order.user_id !== user.id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // Fetch items
    const [items] = await db.query(
      `SELECT oi.*, gt.name AS garment_name, gt.icon
       FROM order_items oi
       JOIN garment_types gt ON oi.garment_type_id = gt.id
       WHERE oi.order_id = ?`,
      [id]
    );

    // Fetch status history
    const [history] = await db.query(
      'SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC',
      [id]
    );

    order.items   = items;
    order.history = history;

    return res.json({ success: true, order });
  } catch (err) {
    console.error('getOrderById error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
}

module.exports = { createOrder, getMyOrders, getOrderById };
