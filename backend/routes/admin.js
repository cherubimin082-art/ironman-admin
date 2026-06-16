const express = require("express");
const bcrypt  = require("bcryptjs");
const pool    = require("../db");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
const { getIO } = require("../socket");

const router = express.Router();
const auth   = [verifyToken, requireRole("admin")];

// GET /api/all-orders
router.get("/all-orders", ...auth, async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.*,
              uc.name  AS customer_name,  uc.phone AS customer_phone,
              uv.name  AS vendor_name,
              ua.name  AS agent_name,
              JSON_ARRAYAGG(
                JSON_OBJECT("garment_name", oi.garment_name,
                            "quantity",     oi.quantity,
                            "subtotal",     oi.subtotal)
              ) AS items
         FROM orders o
         JOIN users uc ON uc.id = o.customer_id
         LEFT JOIN users uv ON uv.id = o.vendor_id
         LEFT JOIN users ua ON ua.id = o.delivery_agent_id
         JOIN order_items oi ON oi.order_id = o.id
        GROUP BY o.id
        ORDER BY o.created_at DESC`
    );
    res.json({ orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/dashboard-stats
router.get("/dashboard-stats", ...auth, async (req, res) => {
  try {
    const [[totals]] = await pool.query(
      `SELECT
         COUNT(*) AS total_orders,
         SUM(total) AS total_revenue,
         SUM(status = "pending")          AS pending_count,
         SUM(status = "vendor_accepted")  AS accepted_count,
         SUM(status = "in_progress")      AS in_progress_count,
         SUM(status = "out_for_delivery") AS out_for_delivery_count,
         SUM(status = "delivered")        AS delivered_count,
         SUM(status = "cancelled")        AS cancelled_count
       FROM orders`
    );

    const [[customers]] = await pool.query(
      "SELECT COUNT(*) AS count FROM users WHERE role = \"customer\""
    );
    const [[vendors]] = await pool.query(
      "SELECT COUNT(*) AS count FROM users WHERE role = \"vendor\" AND status = \"active\""
    );
    const [[agents]] = await pool.query(
      "SELECT COUNT(*) AS count FROM users WHERE role = \"delivery\" AND status = \"active\""
    );

    res.json({
      stats: {
        ...totals,
        total_customers: customers.count,
        active_vendors:  vendors.count,
        active_agents:   agents.count,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/assign-delivery/:orderId
router.put("/assign-delivery/:orderId", ...auth, async (req, res) => {
  const { orderId }       = req.params;
  const { delivery_agent_id } = req.body;
  const adminId           = req.user.id;

  if (!delivery_agent_id)
    return res.status(400).json({ message: "delivery_agent_id is required" });

  try {
    // Update order
    await pool.query(
      "UPDATE orders SET delivery_agent_id = ? WHERE id = ?",
      [delivery_agent_id, orderId]
    );

    // Upsert delivery_assignments
    await pool.query(
      `INSERT INTO delivery_assignments (order_id, delivery_agent_id, assigned_by)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE delivery_agent_id = VALUES(delivery_agent_id), assigned_by = VALUES(assigned_by)`,
      [orderId, delivery_agent_id, adminId]
    );

    // Emit to the assigned delivery agent
    try {
      const io = getIO();
      io.to("delivery_" + delivery_agent_id).emit("new_assignment", { orderId });
      io.to("admin_room").emit("assignment_updated", { orderId, delivery_agent_id });
    } catch (_) {}

    res.json({ message: "Delivery agent assigned", orderId, delivery_agent_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/vendors
router.get("/vendors", ...auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.phone, u.zone, u.status, u.rating,
              COUNT(o.id) AS total_orders
         FROM users u
         LEFT JOIN orders o ON o.vendor_id = u.id
        WHERE u.role = "vendor"
        GROUP BY u.id`
    );
    res.json({ vendors: rows });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/delivery-agents
router.get("/delivery-agents", ...auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.phone, u.zone, u.status, u.rating,
              COUNT(da.id) AS total_deliveries
         FROM users u
         LEFT JOIN delivery_assignments da ON da.delivery_agent_id = u.id
        WHERE u.role = "delivery"
        GROUP BY u.id`
    );
    res.json({ agents: rows });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ── VENDOR CRUD ────────────────────────────────────────────────

// GET /api/admin/vendors
router.get("/admin/vendors", ...auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.phone, u.zone, u.address, u.status, u.created_at,
              COUNT(DISTINCT o.id) AS total_orders,
              GROUP_CONCAT(DISTINCT a.apartment ORDER BY a.apartment SEPARATOR ', ') AS apartments
         FROM users u
         LEFT JOIN orders o ON o.vendor_id = u.id
         LEFT JOIN apartment_slots a ON a.vendor_id = u.id
        WHERE u.role = 'vendor'
        GROUP BY u.id
        ORDER BY u.created_at DESC`
    );
    res.json({ vendors: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/admin/vendors
router.post("/admin/vendors", ...auth, async (req, res) => {
  const { name, phone, password, zone, address } = req.body;
  if (!name || !phone || !password)
    return res.status(400).json({ message: "name, phone and password are required" });

  try {
    const [[existing]] = await pool.query(
      "SELECT id FROM users WHERE phone = ?", [phone]
    );
    if (existing)
      return res.status(409).json({ message: "Mobile number already registered" });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (name, phone, password_hash, role, zone, address, status)
       VALUES (?, ?, ?, 'vendor', ?, ?, 'active')`,
      [name, phone, hash, zone || null, address || null]
    );
    const vendorId = result.insertId;

    // Create 20 bags for this vendor
    const bagValues = Array.from({ length: 20 }, (_, i) => [vendorId, i + 1, "available"]);
    await pool.query("INSERT INTO bags (vendor_id, bag_number, status) VALUES ?", [bagValues]);

    res.status(201).json({ message: "Vendor created successfully", vendorId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/admin/vendors/:id
router.put("/admin/vendors/:id", ...auth, async (req, res) => {
  const { id } = req.params;
  const { name, phone, zone, address, status } = req.body;
  if (!name || !phone)
    return res.status(400).json({ message: "name and phone are required" });

  try {
    const [[vendor]] = await pool.query(
      "SELECT id FROM users WHERE id = ? AND role = 'vendor'", [id]
    );
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });

    const [[dup]] = await pool.query(
      "SELECT id FROM users WHERE phone = ? AND id != ?", [phone, id]
    );
    if (dup) return res.status(409).json({ message: "Mobile number already in use by another account" });

    const allowed = ["active", "inactive", "on_leave"];
    const newStatus = allowed.includes(status) ? status : undefined;

    await pool.query(
      `UPDATE users SET name = ?, phone = ?, zone = ?, address = ?
       ${newStatus ? ", status = ?" : ""}
       WHERE id = ? AND role = 'vendor'`,
      newStatus
        ? [name, phone, zone || null, address || null, newStatus, id]
        : [name, phone, zone || null, address || null, id]
    );
    res.json({ message: "Vendor updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/admin/vendors/:id
router.delete("/admin/vendors/:id", ...auth, async (req, res) => {
  const { id } = req.params;
  try {
    const [[vendor]] = await pool.query(
      "SELECT id, name FROM users WHERE id = ? AND role = 'vendor'", [id]
    );
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });

    const [[{ activeCount }]] = await pool.query(
      `SELECT COUNT(*) AS activeCount FROM orders
       WHERE vendor_id = ? AND status NOT IN ('delivered', 'cancelled')`, [id]
    );
    if (activeCount > 0)
      return res.status(409).json({
        message: `Cannot delete: vendor has ${activeCount} active order(s). Resolve or cancel them first.`,
        activeCount,
      });

    await pool.query("DELETE FROM bags WHERE vendor_id = ?", [id]);
    await pool.query("DELETE FROM apartment_slots WHERE vendor_id = ?", [id]);
    await pool.query("DELETE FROM users WHERE id = ? AND role = 'vendor'", [id]);

    res.json({ message: "Vendor deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── DELIVERY BOY CRUD ───────────────────────────────────────────

// GET /api/admin/delivery-boys
router.get("/admin/delivery-boys", ...auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.name, u.phone, u.status, u.created_at,
              COUNT(DISTINCT da.id) AS total_deliveries
         FROM users u
         LEFT JOIN delivery_assignments da ON da.delivery_agent_id = u.id
        WHERE u.role = 'delivery'
        GROUP BY u.id
        ORDER BY u.created_at DESC`
    );
    res.json({ deliveryBoys: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/admin/delivery-boys
router.post("/admin/delivery-boys", ...auth, async (req, res) => {
  const { name, phone, password } = req.body;
  if (!name || !phone || !password)
    return res.status(400).json({ message: "name, phone and password are required" });

  try {
    const [[existing]] = await pool.query(
      "SELECT id FROM users WHERE phone = ?", [phone]
    );
    if (existing)
      return res.status(409).json({ message: "Mobile number already registered" });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (name, phone, password_hash, role, status)
       VALUES (?, ?, ?, 'delivery', 'active')`,
      [name, phone, hash]
    );
    res.status(201).json({ message: "Delivery boy created successfully", id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/admin/delivery-boys/:id
router.put("/admin/delivery-boys/:id", ...auth, async (req, res) => {
  const { id } = req.params;
  const { name, phone, status } = req.body;
  if (!name || !phone)
    return res.status(400).json({ message: "name and phone are required" });

  try {
    const [[person]] = await pool.query(
      "SELECT id FROM users WHERE id = ? AND role = 'delivery'", [id]
    );
    if (!person) return res.status(404).json({ message: "Delivery boy not found" });

    const [[dup]] = await pool.query(
      "SELECT id FROM users WHERE phone = ? AND id != ?", [phone, id]
    );
    if (dup) return res.status(409).json({ message: "Mobile number already in use" });

    const allowed = ["active", "inactive", "on_leave"];
    const newStatus = allowed.includes(status) ? status : undefined;

    await pool.query(
      `UPDATE users SET name = ?, phone = ?
       ${newStatus ? ", status = ?" : ""}
       WHERE id = ? AND role = 'delivery'`,
      newStatus ? [name, phone, newStatus, id] : [name, phone, id]
    );
    res.json({ message: "Delivery boy updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/admin/delivery-boys/:id
router.delete("/admin/delivery-boys/:id", ...auth, async (req, res) => {
  const { id } = req.params;
  try {
    const [[person]] = await pool.query(
      "SELECT id, name FROM users WHERE id = ? AND role = 'delivery'", [id]
    );
    if (!person) return res.status(404).json({ message: "Delivery boy not found" });

    const [[{ activeCount }]] = await pool.query(
      `SELECT COUNT(*) AS activeCount FROM orders
       WHERE delivery_agent_id = ? AND status NOT IN ('delivered', 'cancelled')`, [id]
    );
    if (activeCount > 0)
      return res.status(409).json({
        message: `Cannot delete: delivery boy has ${activeCount} active order(s). Resolve them first.`,
        activeCount,
      });

    await pool.query("DELETE FROM delivery_assignments WHERE delivery_agent_id = ?", [id]);
    await pool.query("DELETE FROM users WHERE id = ? AND role = 'delivery'", [id]);

    res.json({ message: "Delivery boy deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── CUSTOMER CRUD ──────────────────────────────────────────────

// GET /api/admin/customers
router.get("/admin/customers", ...auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, name, phone, apartment, address, created_at
         FROM users WHERE role = 'customer'
        ORDER BY created_at DESC`
    );
    res.json({ customers: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/admin/customers
router.post("/admin/customers", ...auth, async (req, res) => {
  const { name, phone, password, apartment, address } = req.body;
  if (!name || !phone || !password)
    return res.status(400).json({ message: "Name, phone and password are required" });
  try {
    const [[existing]] = await pool.query("SELECT id FROM users WHERE phone = ?", [phone]);
    if (existing)
      return res.status(409).json({ message: "Mobile number already registered" });
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (name, phone, password_hash, role, apartment, address)
       VALUES (?, ?, ?, 'customer', ?, ?)`,
      [name, phone, hash, apartment || null, address || null]
    );
    res.status(201).json({ message: "Customer created", id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/admin/customers/:id
router.put("/admin/customers/:id", ...auth, async (req, res) => {
  const { id } = req.params;
  const { name, phone, apartment, address } = req.body;
  if (!name || !phone)
    return res.status(400).json({ message: "Name and phone are required" });
  try {
    const [[dup]] = await pool.query(
      "SELECT id FROM users WHERE phone = ? AND id != ?", [phone, id]
    );
    if (dup) return res.status(409).json({ message: "Mobile number already in use" });
    await pool.query(
      "UPDATE users SET name = ?, phone = ?, apartment = ?, address = ? WHERE id = ? AND role = 'customer'",
      [name, phone, apartment || null, address || null, id]
    );
    res.json({ message: "Customer updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/admin/customers/:id
router.delete("/admin/customers/:id", ...auth, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM users WHERE id = ? AND role = 'customer'", [id]);
    res.json({ message: "Customer deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── APARTMENT LIST CRUD ─────────────────────────────────────────

async function ensureApartmentsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS apartments (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      name        VARCHAR(255) NOT NULL UNIQUE,
      pickup_time VARCHAR(100) NOT NULL,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// GET /api/admin/apartments-list
router.get("/admin/apartments-list", ...auth, async (req, res) => {
  try {
    await ensureApartmentsTable();
    const [rows] = await pool.query("SELECT * FROM apartments ORDER BY name ASC");
    res.json({ apartments: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/admin/apartments-list
router.post("/admin/apartments-list", ...auth, async (req, res) => {
  const { name, pickup_time } = req.body;
  if (!name?.trim() || !pickup_time?.trim())
    return res.status(400).json({ message: "Apartment name and pickup time are required" });
  try {
    await ensureApartmentsTable();
    const [result] = await pool.query(
      "INSERT INTO apartments (name, pickup_time) VALUES (?, ?)",
      [name.trim(), pickup_time.trim()]
    );
    res.status(201).json({ message: "Apartment added", id: result.insertId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(409).json({ message: "Apartment name already exists" });
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/admin/apartments-list/:id
router.put("/admin/apartments-list/:id", ...auth, async (req, res) => {
  const { id } = req.params;
  const { name, pickup_time } = req.body;
  if (!name?.trim() || !pickup_time?.trim())
    return res.status(400).json({ message: "Apartment name and pickup time are required" });
  try {
    await ensureApartmentsTable();
    const [result] = await pool.query(
      "UPDATE apartments SET name = ?, pickup_time = ? WHERE id = ?",
      [name.trim(), pickup_time.trim(), id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Apartment not found" });
    res.json({ message: "Apartment updated" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(409).json({ message: "Apartment name already exists" });
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/admin/apartments-list/:id
router.delete("/admin/apartments-list/:id", ...auth, async (req, res) => {
  const { id } = req.params;
  try {
    await ensureApartmentsTable();
    await pool.query("DELETE FROM apartments WHERE id = ?", [id]);
    res.json({ message: "Apartment deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── ANALYTICS ──────────────────────────────────────────────────

// GET /api/admin/analytics — summary counts
router.get("/admin/analytics", ...auth, async (req, res) => {
  try {
    const [[today]] = await pool.query(
      `SELECT COUNT(*) AS count FROM orders WHERE DATE(created_at) = CURDATE()`
    );
    const [[week]] = await pool.query(
      `SELECT COUNT(*) AS count FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
    );
    const [[month]] = await pool.query(
      `SELECT COUNT(*) AS count FROM orders WHERE MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW())`
    );
    const [[revenue]] = await pool.query(
      `SELECT COALESCE(SUM(total), 0) AS total FROM orders
        WHERE status = 'delivered'
          AND MONTH(created_at) = MONTH(NOW())
          AND YEAR(created_at)  = YEAR(NOW())`
    );
    res.json({
      today:               today.count,
      this_week:           week.count,
      this_month:          month.count,
      revenue_this_month:  parseFloat(revenue.total || 0),
    });
  } catch (err) {
    console.error("analytics summary error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/admin/analytics/revenue?range=today|week|month
router.get("/admin/analytics/revenue", ...auth, async (req, res) => {
  const { range = "month" } = req.query;
  const now = new Date();
  let fromDate;
  if (range === "today") {
    fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (range === "week") {
    fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  } else {
    fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }
  const fromStr = fromDate.toISOString().slice(0, 19).replace("T", " ");

  try {
    const [rows] = await pool.query(
      `SELECT u.id AS vendor_id, u.name AS vendor_name,
              DATE(o.created_at) AS date,
              SUM(o.total) AS revenue
         FROM orders o
         JOIN users u ON o.vendor_id = u.id
        WHERE o.status = 'delivered' AND o.created_at >= ?
        GROUP BY u.id, DATE(o.created_at)
        ORDER BY date ASC`,
      [fromStr]
    );

    const vendorMap = {};
    const dateArr   = [];
    const seenDates = new Set();
    rows.forEach(r => {
      const d = new Date(r.date);
      const dateStr = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      if (!seenDates.has(dateStr)) { seenDates.add(dateStr); dateArr.push(dateStr); }
      if (!vendorMap[r.vendor_id]) {
        vendorMap[r.vendor_id] = { id: r.vendor_id, name: r.vendor_name, data: {} };
      }
      vendorMap[r.vendor_id].data[dateStr] = parseFloat(r.revenue);
    });

    const vendors   = Object.values(vendorMap);
    const chartData = dateArr.map(date => {
      const pt = { date };
      vendors.forEach(v => { pt[v.name] = v.data[date] || 0; });
      return pt;
    });

    res.json({ chartData, vendors: vendors.map(v => ({ id: v.id, name: v.name })) });
  } catch (err) {
    console.error("analytics revenue error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/admin/analytics/top-vendors
router.get("/admin/analytics/top-vendors", ...auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.name,
              COUNT(o.id) AS total_orders,
              COALESCE(SUM(o.total), 0) AS total_revenue,
              COALESCE(AVG(r.vendor_rating), 0) AS avg_rating
         FROM orders o
         JOIN users u ON o.vendor_id = u.id
         LEFT JOIN ratings r ON o.id = r.order_id
        WHERE o.status = 'delivered'
        GROUP BY o.vendor_id
        ORDER BY total_orders DESC
        LIMIT 5`
    );
    res.json({ vendors: rows.map(v => ({ ...v, avg_rating: parseFloat(v.avg_rating || 0).toFixed(1) })) });
  } catch (err) {
    console.error("analytics top-vendors error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/admin/analytics/apartments
router.get("/admin/analytics/apartments", ...auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT apartment, COUNT(id) AS total_orders, COALESCE(SUM(total), 0) AS total_revenue
         FROM orders
        WHERE apartment IS NOT NULL AND apartment != ''
        GROUP BY apartment
        ORDER BY total_orders DESC`
    );
    res.json({ apartments: rows });
  } catch (err) {
    console.error("analytics apartments error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/admin/analytics/delivery-performance
router.get("/admin/analytics/delivery-performance", ...auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT u.name,
              COUNT(da.id) AS total_deliveries,
              COALESCE(SUM(o.total), 0) AS total_revenue,
              COALESCE(AVG(r.delivery_rating), 0) AS avg_rating
         FROM delivery_assignments da
         JOIN users u ON da.delivery_agent_id = u.id
         JOIN orders o ON da.order_id = o.id
         LEFT JOIN ratings r ON o.id = r.order_id
        WHERE o.status = 'delivered'
        GROUP BY da.delivery_agent_id
        ORDER BY total_deliveries DESC`
    );
    res.json({ agents: rows.map(a => ({ ...a, avg_rating: parseFloat(a.avg_rating || 0).toFixed(1) })) });
  } catch (err) {
    console.error("analytics delivery-performance error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── PRICING: CATEGORIES & GARMENTS ─────────────────────────────

// GET /api/admin/categories
router.get("/admin/categories", ...auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.id, c.name, c.created_at,
              COUNT(g.id) AS garment_count
         FROM categories c
         LEFT JOIN garments g ON g.category_id = c.id
        GROUP BY c.id
        ORDER BY c.name ASC`
    );
    res.json({ categories: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/admin/categories
router.post("/admin/categories", ...auth, async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: "Category name is required" });
  try {
    const [result] = await pool.query(
      "INSERT INTO categories (name) VALUES (?)", [name.trim()]
    );
    res.status(201).json({ message: "Category created", id: result.insertId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(409).json({ message: "Category name already exists" });
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/admin/categories/:id
router.put("/admin/categories/:id", ...auth, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: "Category name is required" });
  try {
    const [result] = await pool.query(
      "UPDATE categories SET name = ? WHERE id = ?", [name.trim(), id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Category not found" });
    res.json({ message: "Category updated" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(409).json({ message: "Category name already exists" });
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/admin/categories/:id
router.delete("/admin/categories/:id", ...auth, async (req, res) => {
  const { id } = req.params;
  try {
    const [[{ garmentCount }]] = await pool.query(
      "SELECT COUNT(*) AS garmentCount FROM garments WHERE category_id = ?", [id]
    );
    if (garmentCount > 0)
      return res.status(409).json({
        message: `Cannot delete: category has ${garmentCount} garment(s). Delete garments first.`,
        garmentCount,
      });
    const [result] = await pool.query("DELETE FROM categories WHERE id = ?", [id]);
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Category not found" });
    res.json({ message: "Category deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/admin/garments
router.get("/admin/garments", ...auth, async (req, res) => {
  try {
    const { category_id } = req.query;
    const where = category_id ? "WHERE g.category_id = ?" : "";
    const params = category_id ? [category_id] : [];
    const [rows] = await pool.query(
      `SELECT g.id, g.name, g.price, g.category_id, g.created_at,
              c.name AS category_name
         FROM garments g
         LEFT JOIN categories c ON c.id = g.category_id
         ${where}
        ORDER BY c.name ASC, g.name ASC`,
      params
    );
    res.json({ garments: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/admin/garments
router.post("/admin/garments", ...auth, async (req, res) => {
  const { category_id, name, price } = req.body;
  if (!category_id || !name?.trim() || price === undefined)
    return res.status(400).json({ message: "category_id, name and price are required" });
  const priceVal = parseFloat(price);
  if (isNaN(priceVal) || priceVal < 0)
    return res.status(400).json({ message: "Price must be a positive number" });
  try {
    const [[cat]] = await pool.query("SELECT id FROM categories WHERE id = ?", [category_id]);
    if (!cat) return res.status(404).json({ message: "Category not found" });
    const [result] = await pool.query(
      "INSERT INTO garments (category_id, name, price) VALUES (?, ?, ?)",
      [category_id, name.trim(), priceVal]
    );
    res.status(201).json({ message: "Garment added", id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/admin/garments/:id
router.put("/admin/garments/:id", ...auth, async (req, res) => {
  const { id } = req.params;
  const { category_id, name, price } = req.body;
  if (!category_id || !name?.trim() || price === undefined)
    return res.status(400).json({ message: "category_id, name and price are required" });
  const priceVal = parseFloat(price);
  if (isNaN(priceVal) || priceVal < 0)
    return res.status(400).json({ message: "Price must be a positive number" });
  try {
    const [result] = await pool.query(
      "UPDATE garments SET category_id = ?, name = ?, price = ? WHERE id = ?",
      [category_id, name.trim(), priceVal, id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Garment not found" });
    res.json({ message: "Garment updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/admin/garments/:id
router.delete("/admin/garments/:id", ...auth, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query("DELETE FROM garments WHERE id = ?", [id]);
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Garment not found" });
    res.json({ message: "Garment deleted" });
  } catch (err) {
    if (err.code === "ER_ROW_IS_REFERENCED_2")
      return res.status(409).json({ message: "Cannot delete: garment is used in existing orders. Consider deactivating it instead." });
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
