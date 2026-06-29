const express = require("express");
const bcrypt  = require("bcryptjs");
const path    = require("path");
const multer  = require("multer");
const pool    = require("../db");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
const { getIO } = require("../socket");

const router = express.Router();
const auth   = [verifyToken, requireRole("admin")];

// ── Image upload (multer) ────────────────────────────────────────
const storage = multer.diskStorage({
  destination: path.join(__dirname, "../public/uploads"),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `garment_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Images only"));
  },
});

// GET /api/all-orders
router.get("/all-orders", ...auth, async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.*,
              uc.name  AS customer_name,  uc.phone AS customer_phone,
              uv.name  AS vendor_name,
              ua.name  AS agent_name,
              da.pickup_latitude, da.pickup_longitude,
              da.delivery_latitude, da.delivery_longitude,
              COALESCE(
                (SELECT GROUP_CONCAT(DISTINCT b2.bag_number ORDER BY b2.bag_number SEPARATOR ',')
                   FROM order_bags ob2 JOIN bags b2 ON b2.id = ob2.bag_id WHERE ob2.order_id = o.id),
                (SELECT CAST(b3.bag_number AS CHAR) FROM bags b3 WHERE b3.id = o.bag_id)
              ) AS bag_numbers,
              JSON_ARRAYAGG(
                JSON_OBJECT("garment_name", oi.garment_name,
                            "quantity",     oi.quantity,
                            "subtotal",     oi.subtotal)
              ) AS items
         FROM orders o
         JOIN users uc ON uc.id = o.customer_id
         LEFT JOIN users uv ON uv.id = o.vendor_id
         LEFT JOIN users ua ON ua.id = o.delivery_agent_id
         LEFT JOIN delivery_assignments da ON da.order_id = o.id
         LEFT JOIN order_items oi ON oi.order_id = o.id
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
         SUM(CASE WHEN status != "cancelled" THEN total ELSE 0 END) AS total_revenue,
         SUM(status = "pending")          AS pending_count,
         SUM(status = "vendor_accepted")  AS accepted_count,
         SUM(status = "in_progress")      AS in_progress_count,
         SUM(status = "out_for_delivery") AS out_for_delivery_count,
         SUM(status = "delivered")        AS delivered_count,
         SUM(status = "cancelled")        AS cancelled_count,
         SUM(DATE(created_at) = CURDATE()) AS today_orders,
         SUM(DATE(created_at) = CURDATE() AND status = "delivered") AS today_delivered,
         SUM(CASE WHEN DATE(created_at) = CURDATE() AND status = "delivered" THEN total ELSE 0 END) AS today_revenue,
         SUM(status NOT IN ("delivered","cancelled")) AS ongoing_orders
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

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      "UPDATE orders SET delivery_agent_id = ? WHERE id = ?",
      [delivery_agent_id, orderId]
    );
    await conn.query(
      `INSERT INTO delivery_assignments (order_id, delivery_agent_id, assigned_by)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE delivery_agent_id = VALUES(delivery_agent_id), assigned_by = VALUES(assigned_by)`,
      [orderId, delivery_agent_id, adminId]
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }

  try {
    const io = getIO();
    io.to("delivery_" + delivery_agent_id).emit("new_assignment", { orderId });
    io.to("admin_room").emit("assignment_updated", { orderId, delivery_agent_id });
  } catch (_) {}

  res.json({ message: "Delivery agent assigned", orderId, delivery_agent_id });
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
      `SELECT u.id, u.name, u.phone, u.zone, u.address, u.status, u.bags_available, u.created_at,
              COUNT(DISTINCT o.id) AS total_orders,
              GROUP_CONCAT(DISTINCT a.apartment ORDER BY a.apartment SEPARATOR ', ') AS apartments,
              (SELECT COUNT(*) FROM bags WHERE vendor_id = u.id AND status = 'available') AS available_bags,
              (SELECT COUNT(*) FROM bags WHERE vendor_id = u.id) AS total_bags
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
  const { name, phone, password, zone, address, bagCount, apartment_names } = req.body;
  if (!name || !phone)
    return res.status(400).json({ message: "name and phone are required" });
  if (password && password.length < 6)
    return res.status(400).json({ message: "Password must be at least 6 characters" });

  const numBags = Math.max(1, Math.min(200, parseInt(bagCount) || 20));

  try {
    const [[existing]] = await pool.query(
      "SELECT id FROM users WHERE phone = ?", [phone]
    );
    if (existing)
      return res.status(409).json({ message: "Mobile number already registered" });

    const hash = password ? await bcrypt.hash(password, 10) : null;
    const [result] = await pool.query(
      `INSERT INTO users (name, phone, password_hash, role, zone, address, status)
       VALUES (?, ?, ?, 'vendor', ?, ?, 'active')`,
      [name, phone, hash, zone || null, address || null]
    );
    const vendorId = result.insertId;

    const bagValues = Array.from({ length: numBags }, (_, i) => [vendorId, i + 1, "available"]);
    await pool.query("INSERT INTO bags (vendor_id, bag_number, status) VALUES ?", [bagValues]);

    // Assign apartments if provided
    const apts = Array.isArray(apartment_names) ? apartment_names.filter(Boolean) : [];
    if (apts.length > 0) {
      const ph = apts.map(() => "?").join(",");
      const [aptRows] = await pool.query(
        `SELECT name, pickup_time, delivery_time FROM apartments WHERE name IN (${ph})`, apts
      );
      if (aptRows.length > 0) {
        await pool.query(
          "INSERT INTO apartment_slots (vendor_id, apartment, pickup_time, delivery_time) VALUES ?",
          [aptRows.map(a => [vendorId, a.name, a.pickup_time, a.delivery_time || ""])]
        );
      }
    }

    res.status(201).json({ message: "Vendor created successfully", vendorId, bagsCreated: numBags });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/admin/vendors/:id
router.put("/admin/vendors/:id", ...auth, async (req, res) => {
  const { id } = req.params;
  const { name, phone, zone, address, status, password } = req.body;
  if (!name || !phone)
    return res.status(400).json({ message: "name and phone are required" });
  if (password && password.length < 6)
    return res.status(400).json({ message: "Password must be at least 6 characters" });

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
    const newHash = password ? await bcrypt.hash(password, 10) : null;

    const setClauses = ["name = ?", "phone = ?", "zone = ?", "address = ?"];
    const values     = [name, phone, zone || null, address || null];
    if (newStatus) { setClauses.push("status = ?");        values.push(newStatus); }
    if (newHash)   { setClauses.push("password_hash = ?"); values.push(newHash);   }
    values.push(id);

    await pool.query(
      `UPDATE users SET ${setClauses.join(", ")} WHERE id = ? AND role = 'vendor'`,
      values
    );
    res.json({ message: "Vendor updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/admin/vendors/:id/apartments — replace all apartment assignments for a vendor
router.put("/admin/vendors/:id/apartments", ...auth, async (req, res) => {
  const { id } = req.params;
  const { apartment_names } = req.body;
  if (!Array.isArray(apartment_names))
    return res.status(400).json({ message: "apartment_names must be an array" });

  try {
    const [[vendor]] = await pool.query(
      "SELECT id FROM users WHERE id = ? AND role = 'vendor'", [id]
    );
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });

    await pool.query("DELETE FROM apartment_slots WHERE vendor_id = ?", [id]);

    const apts = apartment_names.filter(Boolean);
    if (apts.length > 0) {
      const ph = apts.map(() => "?").join(",");
      const [aptRows] = await pool.query(
        `SELECT name, pickup_time, delivery_time FROM apartments WHERE name IN (${ph})`, apts
      );
      if (aptRows.length > 0) {
        await pool.query(
          "INSERT INTO apartment_slots (vendor_id, apartment, pickup_time, delivery_time) VALUES ?",
          [aptRows.map(a => [id, a.name, a.pickup_time, a.delivery_time || ""])]
        );
      }
    }

    res.json({ message: "Apartment assignments updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/admin/vendors/:id
router.delete("/admin/vendors/:id", ...auth, async (req, res) => {
  const { id } = req.params;

  const [[vendor]] = await pool.query(
    "SELECT id FROM users WHERE id = ? AND role = 'vendor'", [id]
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

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("DELETE FROM bags WHERE vendor_id = ?", [id]);
    await conn.query("DELETE FROM apartment_slots WHERE vendor_id = ?", [id]);
    await conn.query("DELETE FROM users WHERE id = ? AND role = 'vendor'", [id]);
    await conn.commit();
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }

  res.json({ message: "Vendor deleted successfully" });
});

// ── BAG MANAGEMENT ─────────────────────────────────────────────

// GET /api/admin/vendors/:id/bags
router.get("/admin/vendors/:id/bags", ...auth, async (req, res) => {
  const { id } = req.params;
  try {
    const [bags] = await pool.query(
      "SELECT id, bag_number, status FROM bags WHERE vendor_id = ? ORDER BY bag_number ASC",
      [id]
    );
    res.json({ bags });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/admin/bags/:id — update bag status
router.put("/admin/bags/:id", ...auth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const allowed = ["available", "in_use", "missing", "retired"];
  if (!allowed.includes(status))
    return res.status(400).json({ message: "Invalid status" });
  try {
    const [result] = await pool.query(
      "UPDATE bags SET status = ? WHERE id = ?", [status, id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Bag not found" });
    res.json({ message: "Bag updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/admin/vendors/:id/bags — add more bags
router.post("/admin/vendors/:id/bags", ...auth, async (req, res) => {
  const { id } = req.params;
  const count = parseInt(req.body.count) || 1;
  if (count < 1 || count > 50)
    return res.status(400).json({ message: "Count must be between 1 and 50" });
  try {
    const [[{ maxNum }]] = await pool.query(
      "SELECT COALESCE(MAX(bag_number), 0) AS maxNum FROM bags WHERE vendor_id = ?", [id]
    );
    const bagValues = Array.from({ length: count }, (_, i) => [id, maxNum + i + 1, "available"]);
    await pool.query("INSERT INTO bags (vendor_id, bag_number, status) VALUES ?", [bagValues]);
    res.status(201).json({ message: `${count} bag(s) added` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/admin/bags/:id — remove a bag (only if available)
router.delete("/admin/bags/:id", ...auth, async (req, res) => {
  const { id } = req.params;
  try {
    const [[bag]] = await pool.query("SELECT status FROM bags WHERE id = ?", [id]);
    if (!bag) return res.status(404).json({ message: "Bag not found" });
    if (bag.status === "in_use")
      return res.status(409).json({ message: "Cannot delete a bag that is currently in use" });
    await pool.query("DELETE FROM bags WHERE id = ?", [id]);
    res.json({ message: "Bag deleted" });
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
      `SELECT u.id, u.name, u.phone, u.status, u.created_at, u.role_title, u.vendor_id,
              v.name AS vendor_name,
              COUNT(DISTINCT da.id) AS total_deliveries
         FROM users u
         LEFT JOIN users v ON v.id = u.vendor_id
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
  const { name, phone, password, vendor_id } = req.body;
  if (!name || !phone || !vendor_id)
    return res.status(400).json({ message: "name, phone and Center Head are required" });
  if (password && password.length < 6)
    return res.status(400).json({ message: "Password must be at least 6 characters" });

  try {
    const [[existing]] = await pool.query(
      "SELECT id FROM users WHERE phone = ?", [phone]
    );
    if (existing)
      return res.status(409).json({ message: "Mobile number already registered" });

    const [[vendor]] = await pool.query(
      "SELECT id FROM users WHERE id = ? AND role = 'vendor'", [vendor_id]
    );
    if (!vendor)
      return res.status(400).json({ message: "Invalid Center Head selected" });

    const hash = password ? await bcrypt.hash(password, 10) : null;
    const [result] = await pool.query(
      `INSERT INTO users (name, phone, password_hash, role, status, vendor_id)
       VALUES (?, ?, ?, 'delivery', 'active', ?)`,
      [name, phone, hash, vendor_id]
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
  const { name, phone, status, vendor_id, password } = req.body;
  if (!name || !phone || !vendor_id)
    return res.status(400).json({ message: "name, phone and Center Head are required" });

  if (password && password.length < 6)
    return res.status(400).json({ message: "Password must be at least 6 characters" });

  try {
    const [[person]] = await pool.query(
      "SELECT id FROM users WHERE id = ? AND role = 'delivery'", [id]
    );
    if (!person) return res.status(404).json({ message: "Delivery boy not found" });

    const [[dup]] = await pool.query(
      "SELECT id FROM users WHERE phone = ? AND id != ?", [phone, id]
    );
    if (dup) return res.status(409).json({ message: "Mobile number already in use" });

    const [[vendor]] = await pool.query(
      "SELECT id FROM users WHERE id = ? AND role = 'vendor'", [vendor_id]
    );
    if (!vendor)
      return res.status(400).json({ message: "Invalid Center Head selected" });

    const allowed = ["active", "inactive", "on_leave"];
    const newStatus = allowed.includes(status) ? status : undefined;
    const newHash   = password ? await bcrypt.hash(password, 10) : null;

    const setClauses = ["name = ?", "phone = ?", "vendor_id = ?"];
    const values     = [name, phone, vendor_id];
    if (newStatus) { setClauses.push("status = ?");        values.push(newStatus); }
    if (newHash)   { setClauses.push("password_hash = ?"); values.push(newHash);   }
    values.push(id);

    await pool.query(
      `UPDATE users SET ${setClauses.join(", ")} WHERE id = ? AND role = 'delivery'`,
      values
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

  const [[person]] = await pool.query(
    "SELECT id FROM users WHERE id = ? AND role = 'delivery'", [id]
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

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("DELETE FROM delivery_assignments WHERE delivery_agent_id = ?", [id]);
    await conn.query("DELETE FROM users WHERE id = ? AND role = 'delivery'", [id]);
    await conn.commit();
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }

  res.json({ message: "Delivery boy deleted successfully" });
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
    const [result] = await pool.query("DELETE FROM users WHERE id = ? AND role = 'customer'", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Customer not found" });
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
      id            INT AUTO_INCREMENT PRIMARY KEY,
      name          VARCHAR(255) NOT NULL UNIQUE,
      pickup_time   VARCHAR(100) NOT NULL,
      delivery_time VARCHAR(100) NULL,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // add delivery_time if missing (existing installs)
  await pool.query(`
    ALTER TABLE apartments ADD COLUMN IF NOT EXISTS delivery_time VARCHAR(100) NULL
  `).catch(() => {});
}

// GET /api/admin/apartments-list
router.get("/admin/apartments-list", ...auth, async (req, res) => {
  try {
    await ensureApartmentsTable();
    const [rows] = await pool.query(
      `SELECT a.*,
              s.vendor_id,
              u.name AS vendor_name
         FROM apartments a
         LEFT JOIN apartment_slots s ON s.apartment = a.name
         LEFT JOIN users u ON u.id = s.vendor_id AND u.role = 'vendor'
        ORDER BY a.name ASC`
    );
    res.json({ apartments: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/admin/apartments-list
router.post("/admin/apartments-list", ...auth, async (req, res) => {
  const { name, pickup_time, delivery_time, vendor_id } = req.body;
  if (!name?.trim() || !pickup_time?.trim())
    return res.status(400).json({ message: "Apartment name and pickup time are required" });
  try {
    await ensureApartmentsTable();
    const [result] = await pool.query(
      "INSERT INTO apartments (name, pickup_time, delivery_time) VALUES (?, ?, ?)",
      [name.trim(), pickup_time.trim(), delivery_time?.trim() || null]
    );

    if (vendor_id) {
      // Remove this apartment from any other vendor's slots, then assign to the chosen one
      await pool.query("DELETE FROM apartment_slots WHERE apartment = ?", [name.trim()]);
      await pool.query(
        "INSERT INTO apartment_slots (vendor_id, apartment, pickup_time, delivery_time) VALUES (?, ?, ?, ?)",
        [vendor_id, name.trim(), pickup_time.trim(), delivery_time?.trim() || ""]
      );
    }

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
  const { name, pickup_time, delivery_time, vendor_id } = req.body;
  if (!name?.trim() || !pickup_time?.trim())
    return res.status(400).json({ message: "Apartment name and pickup time are required" });
  try {
    await ensureApartmentsTable();
    const [result] = await pool.query(
      "UPDATE apartments SET name = ?, pickup_time = ?, delivery_time = ? WHERE id = ?",
      [name.trim(), pickup_time.trim(), delivery_time?.trim() || null, id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Apartment not found" });

    // Update apartment_slots — remove old assignment, add new one if vendor chosen
    await pool.query("DELETE FROM apartment_slots WHERE apartment = ?", [name.trim()]);
    if (vendor_id) {
      await pool.query(
        "INSERT INTO apartment_slots (vendor_id, apartment, pickup_time, delivery_time) VALUES (?, ?, ?, ?)",
        [vendor_id, name.trim(), pickup_time.trim(), delivery_time?.trim() || ""]
      );
    }

    // Notify vendor and delivery agents so their pages reload without refresh
    try {
      const io = getIO();
      io.to('vendor_room').emit('order_status_update', { apartment: name.trim(), pickup_time: pickup_time.trim(), delivery_time: delivery_time?.trim() });

      await pool.query(
        `UPDATE orders SET time_slot = ? WHERE apartment = ? AND status NOT IN ('delivered','cancelled')`,
        [pickup_time.trim(), name.trim()]
      );

      const [affected] = await pool.query(
        `SELECT DISTINCT delivery_agent_id FROM orders WHERE apartment = ? AND delivery_agent_id IS NOT NULL AND status NOT IN ('delivered','cancelled')`,
        [name.trim()]
      );
      for (const { delivery_agent_id } of affected) {
        io.to('delivery_' + delivery_agent_id).emit('order_status_update', { apartment: name.trim(), pickup_time: pickup_time.trim() });
      }
    } catch (_) {}

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
    const [result] = await pool.query("DELETE FROM apartments WHERE id = ?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ message: "Apartment not found" });
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
      `SELECT COUNT(*) AS count FROM orders WHERE DATE(created_at) = CURDATE() AND status != 'cancelled'`
    );
    const [[week]] = await pool.query(
      `SELECT COUNT(*) AS count FROM orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND status != 'cancelled'`
    );
    const [[month]] = await pool.query(
      `SELECT COUNT(*) AS count FROM orders WHERE MONTH(created_at) = MONTH(NOW()) AND YEAR(created_at) = YEAR(NOW()) AND status != 'cancelled'`
    );
    const [[revenue]] = await pool.query(
      `SELECT COALESCE(SUM(total), 0) AS total FROM orders
        WHERE status = 'delivered'
          AND MONTH(created_at) = MONTH(NOW())
          AND YEAR(created_at)  = YEAR(NOW())`
    );
    const [[cancelled]] = await pool.query(
      `SELECT COUNT(*) AS count, COALESCE(SUM(total), 0) AS amount FROM orders
        WHERE status = 'cancelled'
          AND MONTH(created_at) = MONTH(NOW())
          AND YEAR(created_at)  = YEAR(NOW())`
    );
    res.json({
      today:                    today.count,
      this_week:                week.count,
      this_month:               month.count,
      revenue_this_month:       parseFloat(revenue.total || 0),
      cancelled_this_month:     cancelled.count,
      cancelled_amount_this_month: parseFloat(cancelled.amount || 0),
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
      `SELECT apartment,
              SUM(status != 'cancelled') AS total_orders,
              COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END), 0) AS total_revenue
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
              SUM(g.is_active = 1) AS garment_count
         FROM categories c
         LEFT JOIN garments g ON g.category_id = c.id
        GROUP BY c.id
        ORDER BY c.id ASC`
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
    const where = category_id
      ? "WHERE g.is_active = 1 AND g.category_id = ?"
      : "WHERE g.is_active = 1";
    const params = category_id ? [category_id] : [];
    const [rows] = await pool.query(
      `SELECT g.id, g.name, g.price, g.category_id, g.image_url, g.icon, g.is_active, g.created_at,
              c.name AS category_name
         FROM garments g
         LEFT JOIN categories c ON c.id = g.category_id
         ${where}
        ORDER BY g.id ASC`,
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
  const { category_id, name, price, image_url } = req.body;
  if (!category_id || !name?.trim() || price === undefined)
    return res.status(400).json({ message: "category_id, name and price are required" });
  const priceVal = parseFloat(price);
  if (isNaN(priceVal) || priceVal < 0)
    return res.status(400).json({ message: "Price must be a positive number" });
  try {
    const [[cat]] = await pool.query("SELECT id FROM categories WHERE id = ?", [category_id]);
    if (!cat) return res.status(404).json({ message: "Category not found" });
    const [result] = await pool.query(
      "INSERT INTO garments (category_id, name, price, image_url, is_active) VALUES (?, ?, ?, ?, 1)",
      [category_id, name.trim(), priceVal, image_url?.trim() || null]
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
  const { category_id, name, price, image_url } = req.body;
  if (!category_id || !name?.trim() || price === undefined)
    return res.status(400).json({ message: "category_id, name and price are required" });
  const priceVal = parseFloat(price);
  if (isNaN(priceVal) || priceVal < 0)
    return res.status(400).json({ message: "Price must be a positive number" });
  try {
    const [result] = await pool.query(
      "UPDATE garments SET category_id = ?, name = ?, price = ?, image_url = ? WHERE id = ?",
      [category_id, name.trim(), priceVal, image_url?.trim() || null, id]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Garment not found" });
    res.json({ message: "Garment updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/admin/garments/:id  (soft-delete — hides from customer, preserves order history)
router.delete("/admin/garments/:id", ...auth, async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query("UPDATE garments SET is_active = 0 WHERE id = ?", [id]);
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Garment not found" });
    res.json({ message: "Garment removed from catalogue" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/admin/upload-image
router.post("/admin/upload-image", ...auth, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  const url = `https://admin.ironman.today/api/uploads/${req.file.filename}`;
  res.json({ url });
});

// GET /api/app-version — public, used by delivery APK to check for updates
const DELIVERY_APK_VERSION = "1.2.0";
router.get("/app-version", (_req, res) => {
  res.json({
    version: DELIVERY_APK_VERSION,
    download_url: "https://admin.ironman.today/downloads/ironman-delivery.apk",
    force_update: false,
  });
});

// GET /api/admin/activity-log
router.get("/admin/activity-log", ...auth, async (req, res) => {
  try {
    const [logs] = await pool.query(
      `SELECT
         al.id,
         al.order_id,
         o.order_code,
         al.bag_number,
         uc.name                                                              AS customer_name,
         uv.name                                                              AS vendor_name,
         al.iron_start_time,
         al.iron_complete_time,
         TIMESTAMPDIFF(MINUTE, al.iron_start_time, al.iron_complete_time)    AS duration_minutes,
         al.created_at
       FROM order_activity_log al
       JOIN orders o ON o.id  = al.order_id
       JOIN users uc ON uc.id = o.customer_id
       JOIN users uv ON uv.id = al.vendor_id
       ORDER BY al.created_at DESC
       LIMIT 500`
    );
    res.json({ logs });
  } catch (err) {
    console.error("activity-log GET error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
