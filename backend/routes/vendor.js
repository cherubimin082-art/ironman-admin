const express = require("express");
const http    = require("http");
const path    = require("path");
const multer  = require("multer");
const bcrypt  = require("bcryptjs");
const pool    = require("../db");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
const { getIO } = require("../socket");

// ── Image upload (multer) — used by vendor Pricing Management ──────────
const uploadStorage = multer.diskStorage({
  destination: path.join(__dirname, "../public/uploads"),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `garment_${Date.now()}${ext}`);
  },
});
const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Images only"));
  },
});

// Bridge — customer frontend listens on port 5001; this backend is on 5002.
function emitToCustomer(customerId, event, payload) {
  const body = JSON.stringify({ room: `customer_${customerId}`, event, payload });
  try {
    const req = http.request(
      {
        hostname: "localhost", port: 5001, path: "/api/internal/notify",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          "x-internal-secret": process.env.INTERNAL_SECRET || "",
        },
      },
      (res) => res.resume()
    );
    req.on("error", (err) => {
      console.error(`[vendor emitToCustomer] failed for customer_${customerId}:`, err.message);
    });
    req.write(body);
    req.end();
  } catch (err) {
    console.error(`[vendor emitToCustomer] setup error for customer_${customerId}:`, err.message);
  }
}

const router     = express.Router();
const auth       = [verifyToken, requireRole("vendor")];
const tabletAuth = [verifyToken, requireRole("vendor", "tablet", "iron_boy")];

// GET /api/vendor/completed-orders — all delivered orders for this vendor
router.get("/vendor/completed-orders", ...auth, async (req, res) => {
  const vendorId = req.user.id;
  try {
    const [orders] = await pool.query(
      `SELECT o.id, o.order_code, o.total, o.created_at, o.updated_at,
              u.name AS customer_name,
              JSON_ARRAYAGG(
                JSON_OBJECT('garment_name', oi.garment_name, 'quantity', oi.quantity)
              ) AS items
         FROM orders o
         JOIN users u ON u.id = o.customer_id
         JOIN order_items oi ON oi.order_id = o.id
        WHERE o.vendor_id = ? AND o.status = 'delivered'
        GROUP BY o.id
        ORDER BY o.updated_at DESC`,
      [vendorId]
    );
    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
    res.json({ orders, totalRevenue });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/vendor/reports — weekly stats + category breakdown for this vendor
router.get("/vendor/reports", ...auth, async (req, res) => {
  const vendorId = req.user.id;
  try {
    const [[summary]] = await pool.query(
      `SELECT
         COUNT(*)                                                        AS total_orders,
         COALESCE(SUM(total), 0)                                         AS total_revenue,
         SUM(DATE(created_at) = CURDATE())                               AS today_orders,
         COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN total ELSE 0 END), 0) AS today_revenue
       FROM orders
       WHERE vendor_id = ? AND status = "delivered"`,
      [vendorId]
    );

    const [weekly] = await pool.query(
      `SELECT
         DAYNAME(created_at)    AS day_name,
         DAYOFWEEK(created_at)  AS day_num,
         COUNT(*)               AS orders,
         COALESCE(SUM(total),0) AS revenue
       FROM orders
       WHERE vendor_id = ?
         AND status = "delivered"
         AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY day_num, day_name
       ORDER BY day_num`,
      [vendorId]
    );

    const [categories] = await pool.query(
      `SELECT oi.garment_name AS name, SUM(oi.quantity) AS count
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
        WHERE o.vendor_id = ? AND o.status = "delivered"
        GROUP BY oi.garment_name
        ORDER BY count DESC
        LIMIT 10`,
      [vendorId]
    );

    res.json({ summary, weekly, categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/vendor-orders — pending orders + this vendor's accepted/active orders
router.get("/vendor-orders", ...auth, async (req, res) => {
  const vendorId = req.user.id;
  try {
    const [orders] = await pool.query(
      `SELECT o.*, u.name AS customer_name, u.phone AS customer_phone, u.address AS customer_address,
              da.pickup_latitude, da.pickup_longitude,
              da.delivery_latitude, da.delivery_longitude,
              COALESCE(
                (SELECT GROUP_CONCAT(DISTINCT b2.bag_number ORDER BY b2.bag_number SEPARATOR ',')
                   FROM order_bags ob2 JOIN bags b2 ON b2.id = ob2.bag_id WHERE ob2.order_id = o.id),
                (SELECT CAST(b3.bag_number AS CHAR) FROM bags b3 WHERE b3.id = o.bag_id)
              ) AS bag_numbers,
              JSON_ARRAYAGG(
                JSON_OBJECT("garment_name", oi.garment_name, "quantity", oi.quantity,
                            "unit_price", oi.unit_price, "subtotal", oi.subtotal)
              ) AS items
         FROM orders o
         JOIN users u ON u.id = o.customer_id
         JOIN order_items oi ON oi.order_id = o.id
         LEFT JOIN delivery_assignments da ON da.order_id = o.id
        WHERE o.vendor_id = ?
           OR (o.vendor_id IS NULL AND o.status IN ('pending', 'cancelled'))
        GROUP BY o.id
        ORDER BY o.created_at DESC`,
      [vendorId]
    );
    res.json({ orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/pending-orders
router.get("/pending-orders", ...auth, async (_req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.*, u.name AS customer_name, u.phone AS customer_phone, u.address AS customer_address,
              JSON_ARRAYAGG(
                JSON_OBJECT("garment_name", oi.garment_name, "quantity", oi.quantity,
                            "unit_price", oi.unit_price, "subtotal", oi.subtotal)
              ) AS items
         FROM orders o
         JOIN users u ON u.id = o.customer_id
         JOIN order_items oi ON oi.order_id = o.id
        WHERE o.status = "pending"
        GROUP BY o.id
        ORDER BY o.created_at ASC`
    );
    res.json({ orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/accept-order/:id — vendor accepts, auto-assigns delivery agent
router.put("/accept-order/:id", ...auth, async (req, res) => {
  const orderId  = req.params.id;
  const vendorId = req.user.id;
  const conn     = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Mark order accepted
    const [result] = await conn.query(
      `UPDATE orders SET status = "vendor_accepted", vendor_id = ?
        WHERE id = ? AND status = "pending"`,
      [vendorId, orderId]
    );
    if (!result.affectedRows) {
      await conn.rollback();
      return res.status(404).json({ message: "Order not found or already actioned" });
    }

    // 2. Log history
    await conn.query(
      `INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?, "vendor_accepted", ?)`,
      [orderId, vendorId]
    );

    // 3. Find least-loaded active delivery agent belonging to this vendor
    const [agents] = await conn.query(
      `SELECT u.id FROM users u
         LEFT JOIN delivery_assignments da
                ON da.delivery_agent_id = u.id
               AND da.status NOT IN ("delivered","cancelled")
        WHERE u.role = "delivery" AND u.status = "active" AND u.vendor_id = ?
        GROUP BY u.id
        ORDER BY COUNT(da.id) ASC
        LIMIT 1`,
      [vendorId]
    );

    let agentId = null;
    if (agents.length > 0) {
      agentId = agents[0].id;

      // 4. Create delivery assignment — pre-accepted, so the delivery boy
      // never sees a manual "Accept Assignment" step for this order.
      await conn.query(
        `INSERT INTO delivery_assignments (order_id, delivery_agent_id, assigned_by, status)
         VALUES (?, ?, ?, "accepted")`,
        [orderId, agentId, vendorId]
      );

      // 5. Update order with delivery_agent_id and skip straight to
      // delivery_assigned (the state PendingPickupCard / "I've Reached" reads).
      await conn.query(
        `UPDATE orders SET delivery_agent_id = ?, status = "delivery_assigned" WHERE id = ?`,
        [agentId, orderId]
      );
      await conn.query(
        `INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?, "delivery_assigned", ?)`,
        [orderId, vendorId]
      );
    }

    const [rows] = await conn.query(
      `SELECT customer_id FROM orders WHERE id = ?`, [orderId]
    );
    const customerId = rows[0].customer_id;

    await conn.commit();

    // Emit to all relevant parties
    try {
      const io = getIO();
      const finalStatus = agentId ? "delivery_assigned" : "vendor_accepted";
      emitToCustomer(customerId, "order_status_update", {
        orderId, status: finalStatus
      });
      io.to("admin_room").emit("order_status_update", {
        orderId, status: finalStatus, vendorId
      });
      if (agentId) {
        const [agentRows] = await pool.query(`SELECT name, phone FROM users WHERE id = ?`, [agentId]);
        const agent = agentRows[0] || {};
        io.to("delivery_" + agentId).emit("new_delivery_order", {
          orderId, message: "New order ready for pickup"
        });
        emitToCustomer(customerId, "delivery_accepted", {
          orderId,
          agentName:  agent.name  || "Delivery Agent",
          agentPhone: agent.phone || "",
          status: "delivery_assigned",
        });
      }
    } catch (_) {}

    res.json({ message: "Order accepted", orderId, status: agentId ? "delivery_assigned" : "vendor_accepted", agentId });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }
});

// PUT /api/reject-order/:id
router.put("/reject-order/:id", ...auth, async (req, res) => {
  const orderId  = req.params.id;
  const vendorId = req.user.id;
  const { reason } = req.body;
  try {
    const [result] = await pool.query(
      `UPDATE orders
          SET status = 'cancelled',
              cancellation_reason = ?,
              cancelled_by = 'vendor'
        WHERE id = ? AND status = 'pending'`,
      [reason?.trim() || null, orderId]
    );
    if (!result.affectedRows)
      return res.status(404).json({ message: "Order not found or already actioned" });

    await pool.query(
      `INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?, 'cancelled', ?)`,
      [orderId, vendorId]
    );

    const [rows] = await pool.query(`SELECT customer_id FROM orders WHERE id = ?`, [orderId]);
    try {
      if (rows.length > 0) {
        emitToCustomer(rows[0].customer_id, "order_rejected", {
          orderId: parseInt(orderId), reason: reason?.trim() || null
        });
      }
      getIO().to("admin_room").emit("order_rejected", { orderId: parseInt(orderId) });
    } catch (_) {}

    res.json({ message: "Order rejected", orderId, status: "cancelled" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/vendor/start-ironing/:orderId — vendor starts ironing
router.put("/vendor/start-ironing/:orderId", ...auth, async (req, res) => {
  const orderId  = req.params.orderId;
  const vendorId = req.user.id;
  try {
    const [result] = await pool.query(
      `UPDATE orders SET status = "ironing_in_progress"
        WHERE id = ? AND vendor_id = ? AND status = "at_vendor"`,
      [orderId, vendorId]
    );
    if (!result.affectedRows)
      return res.status(404).json({ message: "Order not found or not at vendor stage" });

    try {
      await pool.query(
        `INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?, "ironing_in_progress", ?)`,
        [orderId, vendorId]
      );
    } catch (_) {}

    // Log iron start time - one row per bag on this order, matching the
    // tablet flow's per-bag rows. Previously this omitted ob_id entirely and
    // sent bag_number=NULL, but both columns are NOT NULL on this table, so
    // the insert always failed ER_BAD_NULL_ERROR - silently, since it's
    // wrapped in try/catch - and no log row was ever created for orders
    // started this way (non-tablet, whole-order "Start Ironing").
    try {
      const [orderBags] = await pool.query(
        `SELECT ob.id AS ob_id, b.bag_number
           FROM order_bags ob JOIN bags b ON b.id = ob.bag_id
          WHERE ob.order_id = ?`,
        [orderId]
      );
      for (const ob of orderBags) {
        await pool.query(
          `INSERT INTO order_activity_log (order_id, ob_id, bag_number, vendor_id, iron_start_time)
           VALUES (?, ?, ?, ?, NOW())`,
          [orderId, ob.ob_id, ob.bag_number, vendorId]
        );
      }
    } catch (_) {}

    const [rows] = await pool.query(
      `SELECT customer_id, delivery_agent_id FROM orders WHERE id = ?`, [orderId]
    );
    try {
      const io = getIO();
      emitToCustomer(rows[0].customer_id, "order_status_update", { orderId, status: "ironing_in_progress" });
      io.to("admin_room").emit("order_status_update", { orderId, status: "ironing_in_progress" });
      io.to("admin_room").emit("order_ironing", { orderId });
      if (rows[0].delivery_agent_id)
        io.to("delivery_" + rows[0].delivery_agent_id).emit("order_status_update", { orderId, status: "ironing_in_progress" });
    } catch (_) {}

    res.json({ message: "Ironing started", orderId, status: "ironing_in_progress" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/mark-complete/:id — vendor marks ironing done, ready for final delivery
router.put("/mark-complete/:id", ...auth, async (req, res) => {
  const orderId  = req.params.id;
  const vendorId = req.user.id;
  try {
    // Skip straight to out_for_delivery — the delivery boy no longer taps
    // "Picked from Vendor" / "Start Ride" as separate steps; ironing complete
    // itself starts the delivery leg and only "I've Reached" remains.
    const [result] = await pool.query(
      `UPDATE orders SET status = "out_for_delivery"
        WHERE id = ? AND vendor_id = ? AND status IN ("at_vendor", "ironing_in_progress")`,
      [orderId, vendorId]
    );
    if (!result.affectedRows)
      return res.status(404).json({ message: "Order not found or not at vendor stage" });

    // Release bags — ironing done, bag is free for the next order
    const [bagResult] = await pool.query(
      `UPDATE bags b JOIN order_bags ob ON ob.bag_id = b.id SET b.status = 'available' WHERE ob.order_id = ?`,
      [orderId]
    );
    if (bagResult.affectedRows === 0) {
      await pool.query(
        `UPDATE bags b JOIN orders o ON o.bag_id = b.id SET b.status = 'available' WHERE o.id = ?`,
        [orderId]
      );
    }

    try {
      await pool.query(
        `INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?, "ready_for_delivery", ?)`,
        [orderId, vendorId]
      );
      await pool.query(
        `INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?, "picked_from_vendor", ?)`,
        [orderId, vendorId]
      );
      await pool.query(
        `INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?, "out_for_delivery", ?)`,
        [orderId, vendorId]
      );
    } catch (_) {}

    // Log iron complete time
    try {
      await pool.query(
        `UPDATE order_activity_log SET iron_complete_time = NOW()
         WHERE order_id = ? AND iron_complete_time IS NULL`,
        [orderId]
      );
    } catch (_) {}

    const [rows] = await pool.query(
      `SELECT o.customer_id, o.delivery_agent_id FROM orders o WHERE o.id = ?`, [orderId]
    );
    const { customer_id, delivery_agent_id } = rows[0];

    if (delivery_agent_id) {
      await pool.query(
        `UPDATE delivery_assignments SET status = "out_for_delivery" WHERE order_id = ?`,
        [orderId]
      );
    }

    try {
      const io = getIO();
      emitToCustomer(customer_id, "order_status_update", {
        orderId, status: "out_for_delivery"
      });
      io.to("admin_room").emit("order_status_update", {
        orderId, status: "out_for_delivery"
      });
      if (delivery_agent_id) {
        io.to("delivery_" + delivery_agent_id).emit("order_ready_for_delivery", {
          orderId, message: "Ironing complete — deliver to customer now"
        });
      }
    } catch (_) {}

    res.json({ message: "Marked ready for delivery", orderId, status: "out_for_delivery" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/vendor/apartment-slot — upsert pickup/delivery time for an apartment
router.put("/vendor/apartment-slot", ...auth, async (req, res) => {
  const vendorId = req.user.id;
  const { apartment, pickup_time, delivery_time } = req.body;

  if (!apartment?.trim())    return res.status(400).json({ message: "Apartment is required" });
  if (!pickup_time?.trim())  return res.status(400).json({ message: "Pickup time is required" });
  if (!delivery_time?.trim()) return res.status(400).json({ message: "Delivery time is required" });

  try {
    await pool.query(
      `INSERT INTO apartment_slots (vendor_id, apartment, pickup_time, delivery_time)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE pickup_time = VALUES(pickup_time), delivery_time = VALUES(delivery_time), updated_at = NOW()`,
      [vendorId, apartment.trim(), pickup_time.trim(), delivery_time.trim()]
    );

    // Keep apartments table in sync so all display queries (which JOIN apartments) get correct times
    await pool.query(
      `UPDATE apartments SET pickup_time = ?, delivery_time = ? WHERE name = ?`,
      [pickup_time.trim(), delivery_time.trim(), apartment.trim()]
    );

    // Sync time_slot on all active orders for this apartment so vendor/delivery see correct pickup time
    await pool.query(
      `UPDATE orders SET time_slot = ? WHERE apartment = ? AND status NOT IN ('delivered','cancelled')`,
      [pickup_time.trim(), apartment.trim()]
    );

    // Notify admin and assigned delivery agents in real time
    try {
      const io = getIO();
      io.to('admin_room').emit('order_status_update', { apartment: apartment.trim(), pickup_time: pickup_time.trim() });

      const [affected] = await pool.query(
        `SELECT DISTINCT delivery_agent_id FROM orders WHERE apartment = ? AND delivery_agent_id IS NOT NULL AND status NOT IN ('delivered','cancelled')`,
        [apartment.trim()]
      );
      for (const { delivery_agent_id } of affected) {
        io.to('delivery_' + delivery_agent_id).emit('order_status_update', { apartment: apartment.trim(), pickup_time: pickup_time.trim() });
      }
    } catch (_) {}

    res.json({ message: "Slot updated", apartment: apartment.trim(), pickup_time: pickup_time.trim(), delivery_time: delivery_time.trim() });
  } catch (err) {
    console.error("apartment-slot PUT error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/vendor/my-apartments — real apartments assigned to this vendor by admin
// (used by the Apartment Management page's dropdown instead of any hardcoded list)
router.get("/vendor/my-apartments", ...auth, async (req, res) => {
  const vendorId = req.user.id;
  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT a.id, a.name
         FROM apartment_slots s
         JOIN apartments a ON a.name = s.apartment
        WHERE s.vendor_id = ?
        ORDER BY a.name ASC`,
      [vendorId]
    );
    res.json({ apartments: rows });
  } catch (err) {
    console.error("vendor/my-apartments GET error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/vendor/apartment-slots — list all apartment slot configs for this vendor
router.get("/vendor/apartment-slots", ...auth, async (req, res) => {
  const vendorId = req.user.id;
  try {
    const [rows] = await pool.query(
      `SELECT apartment, pickup_time, delivery_time FROM apartment_slots WHERE vendor_id = ? ORDER BY apartment ASC`,
      [vendorId]
    );
    res.json({ slots: rows });
  } catch (err) {
    console.error("apartment-slots GET error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/vendor/orders-by-apartment/:apartment — orders for this vendor grouped by apartment
router.get("/vendor/orders-by-apartment/:apartment", ...auth, async (req, res) => {
  const vendorId  = req.user.id;
  const apartment = decodeURIComponent(req.params.apartment);
  try {
    const [orders] = await pool.query(
      `SELECT o.id, o.order_code, o.status, o.pickup_date, o.time_slot, o.total, o.created_at,
              u.name AS customer_name, u.phone AS customer_phone,
              apt.delivery_time AS apt_delivery_time,
              JSON_ARRAYAGG(
                JSON_OBJECT("garment_name", oi.garment_name, "quantity", oi.quantity)
              ) AS items
         FROM orders o
         JOIN users u ON u.id = o.customer_id
         LEFT JOIN apartments apt ON apt.name = o.apartment
         JOIN order_items oi ON oi.order_id = o.id
        WHERE o.vendor_id = ? AND o.apartment = ?
        GROUP BY o.id
        ORDER BY o.created_at DESC`,
      [vendorId, apartment]
    );
    res.json({ orders, apartment });
  } catch (err) {
    console.error("orders-by-apartment error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Capacity Management ────────────────────────────────────────────────

// GET /api/vendor/capacity — all capacity limits for this vendor
router.get("/vendor/capacity", ...auth, async (req, res) => {
  const vendorId = req.user.id;
  try {
    const [rows] = await pool.query(
      `SELECT apartment, max_orders_per_day, updated_at
         FROM vendor_capacity WHERE vendor_id = ? ORDER BY apartment ASC`,
      [vendorId]
    );
    res.json({ capacities: rows });
  } catch (err) {
    console.error("vendor/capacity GET error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/vendor/capacity/:apartment — limit for one apartment
router.get("/vendor/capacity/:apartment", ...auth, async (req, res) => {
  const vendorId  = req.user.id;
  const apartment = decodeURIComponent(req.params.apartment);
  try {
    const [[row]] = await pool.query(
      `SELECT max_orders_per_day FROM vendor_capacity WHERE vendor_id = ? AND apartment = ?`,
      [vendorId, apartment]
    );
    res.json({ max_orders_per_day: row ? row.max_orders_per_day : null });
  } catch (err) {
    console.error("vendor/capacity/:apt GET error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/vendor/capacity — upsert (insert or update) limit
router.put("/vendor/capacity", ...auth, async (req, res) => {
  const vendorId = req.user.id;
  const { apartment, max_orders_per_day } = req.body;
  if (!apartment || max_orders_per_day === undefined || max_orders_per_day === null)
    return res.status(400).json({ message: "apartment and max_orders_per_day are required" });
  const limit = parseInt(max_orders_per_day);
  if (isNaN(limit) || limit < 1)
    return res.status(400).json({ message: "max_orders_per_day must be a positive integer" });
  try {
    await pool.query(
      `INSERT INTO vendor_capacity (vendor_id, apartment, max_orders_per_day)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE max_orders_per_day = VALUES(max_orders_per_day), updated_at = NOW()`,
      [vendorId, apartment, limit]
    );
    res.json({ message: "Capacity saved", apartment, max_orders_per_day: limit });
  } catch (err) {
    console.error("vendor/capacity PUT error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/vendor/capacity/:apartment — remove limit (= unlimited)
router.delete("/vendor/capacity/:apartment", ...auth, async (req, res) => {
  const vendorId  = req.user.id;
  const apartment = decodeURIComponent(req.params.apartment);
  try {
    await pool.query(
      `DELETE FROM vendor_capacity WHERE vendor_id = ? AND apartment = ?`,
      [vendorId, apartment]
    );
    res.json({ message: "Capacity limit removed" });
  } catch (err) {
    console.error("vendor/capacity DELETE error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Pricing Management: Categories & Garments (vendor-scoped) ──────────

// categories.vendor_id was added directly on some environments' databases
// without ever going through a migration script - the original migrate.js
// CREATE TABLE has no vendor_id column and a global UNIQUE(name) instead.
// Any environment that only ran migrate.js (e.g. production, if it was never
// hand-patched like dev was) still has that old schema, so every query here
// referencing vendor_id fails with "Unknown column 'vendor_id'". Bring any
// such environment up to date here, the same way addColumnIfMissing works
// in admin.js.
async function ensureCategoriesVendorScoped() {
  const [[col]] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND COLUMN_NAME = 'vendor_id'`
  );
  if (col.cnt === 0) {
    await pool.query("ALTER TABLE categories ADD COLUMN vendor_id INT NULL");
  }

  const [indexes] = await pool.query(
    `SELECT INDEX_NAME, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS cols, NON_UNIQUE
       FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'categories' AND INDEX_NAME != 'PRIMARY'
      GROUP BY INDEX_NAME, NON_UNIQUE`
  );
  const hasComposite = indexes.some(i => i.cols === 'name,vendor_id' || i.cols === 'vendor_id,name');
  for (const idx of indexes) {
    if (Number(idx.NON_UNIQUE) === 0 && idx.cols === 'name') {
      await pool.query(`ALTER TABLE categories DROP INDEX \`${idx.INDEX_NAME}\``);
    }
  }
  if (!hasComposite) {
    await pool.query("ALTER TABLE categories ADD UNIQUE INDEX uq_vendor_category_name (vendor_id, name)");
  }
}

// Same problem, sibling table: garments predates vendor_id/category_id/icon/
// image_url/is_active (the original schema only had the legacy `category`
// ENUM column) - these were hand-added on dev but never captured in a
// migration, so an environment that never got the same hand-patch 500s with
// "Unknown column" the moment any of these are referenced (confirmed live on
// production: "Unknown column 'g.vendor_id' in 'on clause'").
async function ensureGarmentsSchema() {
  const [cols] = await pool.query(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'garments'`
  );
  const have = new Set(cols.map(c => c.COLUMN_NAME));
  const wanted = [
    ['vendor_id',   'INT NULL'],
    ['category_id', 'INT NULL'],
    ['icon',        'VARCHAR(10) NULL'],
    ['image_url',   'VARCHAR(500) NULL'],
    ['is_active',   'TINYINT(1) NOT NULL DEFAULT 1'],
  ];
  for (const [name, definition] of wanted) {
    if (!have.has(name)) {
      await pool.query(`ALTER TABLE garments ADD COLUMN ${name} ${definition}`);
    }
  }
}

// coupons is owned by the vendor (Center Head) here, but read at checkout by
// the customer backend too - each side self-provisions with an identical
// CREATE TABLE IF NOT EXISTS rather than assuming the other one ran first,
// same lesson as order_block_minutes.
async function ensureCouponsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS coupons (
      id INT AUTO_INCREMENT PRIMARY KEY,
      vendor_id INT NOT NULL,
      code VARCHAR(30) NOT NULL UNIQUE,
      discount_type ENUM('percent','flat') NOT NULL DEFAULT 'percent',
      discount_value DECIMAL(10,2) NOT NULL,
      valid_from DATE NULL,
      valid_till DATE NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  const [[col1]] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'coupon_code'`
  );
  if (col1.cnt === 0) {
    await pool.query("ALTER TABLE orders ADD COLUMN coupon_code VARCHAR(30) NULL");
  }
  const [[col2]] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'discount_amount'`
  );
  if (col2.cnt === 0) {
    await pool.query("ALTER TABLE orders ADD COLUMN discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0");
  }
  // apartments = NULL means "all of this vendor's apartments"; otherwise a
  // JSON array of apartment names this coupon is restricted to.
  const [[col3]] = await pool.query(
    `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'coupons' AND COLUMN_NAME = 'apartments'`
  );
  if (col3.cnt === 0) {
    await pool.query("ALTER TABLE coupons ADD COLUMN apartments TEXT NULL");
  }
}

// GET /api/vendor/categories
router.get("/vendor/categories", ...auth, async (req, res) => {
  const vendorId = req.user.id;
  try {
    await ensureCategoriesVendorScoped();
    await ensureGarmentsSchema();
    const [rows] = await pool.query(
      `SELECT c.id, c.name, c.created_at,
              SUM(g.is_active = 1) AS garment_count
         FROM categories c
         LEFT JOIN garments g ON g.category_id = c.id AND g.vendor_id = c.vendor_id
        WHERE c.vendor_id = ?
        GROUP BY c.id
        ORDER BY c.id ASC`,
      [vendorId]
    );
    res.json({ categories: rows });
  } catch (err) {
    console.error("vendor/categories GET error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/vendor/categories
router.post("/vendor/categories", ...auth, async (req, res) => {
  const vendorId = req.user.id;
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: "Category name is required" });
  try {
    await ensureCategoriesVendorScoped();
    const [result] = await pool.query(
      "INSERT INTO categories (vendor_id, name) VALUES (?, ?)", [vendorId, name.trim()]
    );
    res.status(201).json({ message: "Category created", id: result.insertId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(409).json({ message: "Category name already exists" });
    console.error("vendor/categories POST error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/vendor/categories/:id
router.put("/vendor/categories/:id", ...auth, async (req, res) => {
  const vendorId = req.user.id;
  const { id } = req.params;
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: "Category name is required" });
  try {
    await ensureCategoriesVendorScoped();
    const [result] = await pool.query(
      "UPDATE categories SET name = ? WHERE id = ? AND vendor_id = ?", [name.trim(), id, vendorId]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Category not found" });
    res.json({ message: "Category updated" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(409).json({ message: "Category name already exists" });
    console.error("vendor/categories PUT error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/vendor/categories/:id
router.delete("/vendor/categories/:id", ...auth, async (req, res) => {
  const vendorId = req.user.id;
  const { id } = req.params;
  try {
    await ensureCategoriesVendorScoped();
    await ensureGarmentsSchema();
    const [[{ garmentCount }]] = await pool.query(
      "SELECT COUNT(*) AS garmentCount FROM garments WHERE category_id = ? AND vendor_id = ?", [id, vendorId]
    );
    if (garmentCount > 0)
      return res.status(409).json({
        message: `Cannot delete: category has ${garmentCount} garment(s). Delete garments first.`,
        garmentCount,
      });
    const [result] = await pool.query("DELETE FROM categories WHERE id = ? AND vendor_id = ?", [id, vendorId]);
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Category not found" });
    res.json({ message: "Category deleted" });
  } catch (err) {
    console.error("vendor/categories DELETE error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/vendor/garments
router.get("/vendor/garments", ...auth, async (req, res) => {
  const vendorId = req.user.id;
  try {
    await ensureGarmentsSchema();
    const { category_id } = req.query;
    const where = category_id
      ? "WHERE g.is_active = 1 AND g.vendor_id = ? AND g.category_id = ?"
      : "WHERE g.is_active = 1 AND g.vendor_id = ?";
    const params = category_id ? [vendorId, category_id] : [vendorId];
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
    console.error("vendor/garments GET error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/vendor/garments
router.post("/vendor/garments", ...auth, async (req, res) => {
  const vendorId = req.user.id;
  const { category_id, name, price, image_url } = req.body;
  if (!category_id || !name?.trim() || price === undefined)
    return res.status(400).json({ message: "category_id, name and price are required" });
  const priceVal = parseFloat(price);
  if (isNaN(priceVal) || priceVal < 0)
    return res.status(400).json({ message: "Price must be a positive number" });
  try {
    await ensureCategoriesVendorScoped();
    await ensureGarmentsSchema();
    const [[cat]] = await pool.query("SELECT id FROM categories WHERE id = ? AND vendor_id = ?", [category_id, vendorId]);
    if (!cat) return res.status(404).json({ message: "Category not found" });
    const [result] = await pool.query(
      "INSERT INTO garments (vendor_id, category_id, name, price, image_url, is_active) VALUES (?, ?, ?, ?, ?, 1)",
      [vendorId, category_id, name.trim(), priceVal, image_url?.trim() || null]
    );
    res.status(201).json({ message: "Garment added", id: result.insertId });
  } catch (err) {
    console.error("vendor/garments POST error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/vendor/garments/:id
router.put("/vendor/garments/:id", ...auth, async (req, res) => {
  const vendorId = req.user.id;
  const { id } = req.params;
  const { category_id, name, price, image_url } = req.body;
  if (!category_id || !name?.trim() || price === undefined)
    return res.status(400).json({ message: "category_id, name and price are required" });
  const priceVal = parseFloat(price);
  if (isNaN(priceVal) || priceVal < 0)
    return res.status(400).json({ message: "Price must be a positive number" });
  try {
    await ensureCategoriesVendorScoped();
    await ensureGarmentsSchema();
    const [[cat]] = await pool.query("SELECT id FROM categories WHERE id = ? AND vendor_id = ?", [category_id, vendorId]);
    if (!cat) return res.status(404).json({ message: "Category not found" });
    const [result] = await pool.query(
      "UPDATE garments SET category_id = ?, name = ?, price = ?, image_url = ? WHERE id = ? AND vendor_id = ?",
      [category_id, name.trim(), priceVal, image_url?.trim() || null, id, vendorId]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Garment not found" });
    res.json({ message: "Garment updated" });
  } catch (err) {
    console.error("vendor/garments PUT error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/vendor/garments/:id  (soft-delete — hides from customer, preserves order history)
router.delete("/vendor/garments/:id", ...auth, async (req, res) => {
  const vendorId = req.user.id;
  const { id } = req.params;
  try {
    await ensureGarmentsSchema();
    const [result] = await pool.query("UPDATE garments SET is_active = 0 WHERE id = ? AND vendor_id = ?", [id, vendorId]);
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Garment not found" });
    res.json({ message: "Garment removed from catalogue" });
  } catch (err) {
    console.error("vendor/garments DELETE error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Coupons ──────────────────────────────────────────────────────────────

// apartments comes from the client as either "all" or an array of apartment
// names. Stored as NULL for "all" (matches any of this vendor's apartments)
// or a JSON array string restricting the coupon to just those.
function serializeApartments(apartments) {
  if (!apartments || apartments === "all" || (Array.isArray(apartments) && apartments.length === 0)) return null;
  if (Array.isArray(apartments)) return JSON.stringify(apartments);
  return null;
}
function parseApartments(row) {
  if (!row.apartments) return { ...row, apartments: null };
  try { return { ...row, apartments: JSON.parse(row.apartments) }; }
  catch { return { ...row, apartments: null }; }
}

// GET /api/vendor/coupons
router.get("/vendor/coupons", ...auth, async (req, res) => {
  const vendorId = req.user.id;
  try {
    await ensureCouponsTable();
    const [rows] = await pool.query(
      "SELECT * FROM coupons WHERE vendor_id = ? ORDER BY created_at DESC", [vendorId]
    );
    res.json({ coupons: rows.map(parseApartments) });
  } catch (err) {
    console.error("vendor/coupons GET error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/vendor/coupons
router.post("/vendor/coupons", ...auth, async (req, res) => {
  const vendorId = req.user.id;
  const { code, discount_type, discount_value, valid_from, valid_till, active, apartments } = req.body;
  if (!code?.trim()) return res.status(400).json({ message: "Coupon code is required" });
  if (!["percent", "flat"].includes(discount_type))
    return res.status(400).json({ message: "Discount type must be percent or flat" });
  const value = parseFloat(discount_value);
  if (isNaN(value) || value <= 0) return res.status(400).json({ message: "Enter a valid discount value" });

  try {
    await ensureCouponsTable();
    const [result] = await pool.query(
      `INSERT INTO coupons (vendor_id, code, discount_type, discount_value, valid_from, valid_till, active, apartments)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [vendorId, code.trim().toUpperCase(), discount_type, value, valid_from || null, valid_till || null, active ? 1 : 0, serializeApartments(apartments)]
    );
    res.status(201).json({ message: "Coupon created", id: result.insertId });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(409).json({ message: "This coupon code already exists" });
    console.error("vendor/coupons POST error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/vendor/coupons/:id
router.put("/vendor/coupons/:id", ...auth, async (req, res) => {
  const vendorId = req.user.id;
  const { id } = req.params;
  const { code, discount_type, discount_value, valid_from, valid_till, active, apartments } = req.body;
  if (!code?.trim()) return res.status(400).json({ message: "Coupon code is required" });
  if (!["percent", "flat"].includes(discount_type))
    return res.status(400).json({ message: "Discount type must be percent or flat" });
  const value = parseFloat(discount_value);
  if (isNaN(value) || value <= 0) return res.status(400).json({ message: "Enter a valid discount value" });

  try {
    await ensureCouponsTable();
    const [result] = await pool.query(
      `UPDATE coupons SET code = ?, discount_type = ?, discount_value = ?, valid_from = ?, valid_till = ?, active = ?, apartments = ?
        WHERE id = ? AND vendor_id = ?`,
      [code.trim().toUpperCase(), discount_type, value, valid_from || null, valid_till || null, active ? 1 : 0, serializeApartments(apartments), id, vendorId]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Coupon not found" });
    res.json({ message: "Coupon updated" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY")
      return res.status(409).json({ message: "This coupon code already exists" });
    console.error("vendor/coupons PUT error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/vendor/coupons/:id
router.delete("/vendor/coupons/:id", ...auth, async (req, res) => {
  const vendorId = req.user.id;
  const { id } = req.params;
  try {
    await ensureCouponsTable();
    const [result] = await pool.query(
      "DELETE FROM coupons WHERE id = ? AND vendor_id = ?", [id, vendorId]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Coupon not found" });
    res.json({ message: "Coupon deleted" });
  } catch (err) {
    console.error("vendor/coupons DELETE error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/vendor/upload-image
router.post("/vendor/upload-image", ...auth, upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  const url = `https://devadmin.ironman.today/api/uploads/${req.file.filename}`;
  res.json({ url });
});

// ── Staff Management ───────────────────────────────────────────────────

// GET /api/vendor/staff — list delivery boys belonging to this vendor
router.get("/vendor/staff", ...auth, async (req, res) => {
  const vendorId = req.user.id;
  try {
    const [rows] = await pool.query(
      `SELECT id, name, phone AS mobile_number, role_title, status, created_at
         FROM users WHERE role = 'delivery' AND vendor_id = ? AND status != 'inactive'
         ORDER BY created_at DESC`,
      [vendorId]
    );
    res.json({ staff: rows });
  } catch (err) {
    console.error("vendor/staff GET error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/vendor/staff — create delivery boy account linked to this vendor
router.post("/vendor/staff", ...auth, async (req, res) => {
  const vendorId = req.user.id;
  const { name, mobile_number, role_title, password } = req.body;
  if (!name?.trim() || !mobile_number?.trim())
    return res.status(400).json({ message: "Name and mobile number are required" });
  try {
    const [[existing]] = await pool.query(
      "SELECT id FROM users WHERE phone = ?", [mobile_number.trim()]
    );
    if (existing)
      return res.status(409).json({ message: "Mobile number already registered" });

    const hash = password ? await bcrypt.hash(password, 10) : null;
    const [result] = await pool.query(
      `INSERT INTO users (name, phone, password_hash, role, status, vendor_id, role_title)
       VALUES (?, ?, ?, 'delivery', 'active', ?, ?)`,
      [name.trim(), mobile_number.trim(), hash, vendorId, role_title?.trim() || null]
    );
    res.status(201).json({ message: "Delivery boy added", id: result.insertId });
  } catch (err) {
    console.error("vendor/staff POST error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/vendor/staff/:id — update delivery boy (vendor can only edit their own)
router.put("/vendor/staff/:id", ...auth, async (req, res) => {
  const vendorId = req.user.id;
  const { id }   = req.params;
  const { name, mobile_number, role_title, password } = req.body;
  if (!name?.trim() || !mobile_number?.trim())
    return res.status(400).json({ message: "Name and mobile number are required" });
  try {
    const [[person]] = await pool.query(
      "SELECT id FROM users WHERE id = ? AND vendor_id = ? AND role = 'delivery'", [id, vendorId]
    );
    if (!person) return res.status(404).json({ message: "Delivery boy not found" });

    const [[dup]] = await pool.query(
      "SELECT id FROM users WHERE phone = ? AND id != ?", [mobile_number.trim(), id]
    );
    if (dup) return res.status(409).json({ message: "Mobile number already in use" });

    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await pool.query(
        `UPDATE users SET name=?, phone=?, role_title=?, password_hash=? WHERE id=? AND vendor_id=?`,
        [name.trim(), mobile_number.trim(), role_title?.trim() || null, hash, id, vendorId]
      );
    } else {
      await pool.query(
        `UPDATE users SET name=?, phone=?, role_title=? WHERE id=? AND vendor_id=?`,
        [name.trim(), mobile_number.trim(), role_title?.trim() || null, id, vendorId]
      );
    }
    res.json({ message: "Delivery boy updated" });
  } catch (err) {
    console.error("vendor/staff PUT error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/vendor/staff/:id — remove delivery boy (vendor can only delete their own)
// Soft-delete (deactivate) rather than hard DELETE: users.id is FK-referenced by
// orders.delivery_agent_id, delivery_assignments.delivery_agent_id, and
// order_status_history.changed_by, so any delivery boy who has ever handled a
// real order would fail a hard delete with a FK constraint violation. Marking
// them inactive also removes them from the auto-assign pool (accept-order only
// picks u.status = "active" agents).
router.delete("/vendor/staff/:id", ...auth, async (req, res) => {
  const vendorId = req.user.id;
  const { id }   = req.params;
  try {
    const [result] = await pool.query(
      `UPDATE users SET status = 'inactive' WHERE id = ? AND vendor_id = ? AND role = 'delivery' AND status != 'inactive'`,
      [id, vendorId]
    );
    if (!result.affectedRows)
      return res.status(404).json({ message: "Delivery boy not found" });
    res.json({ message: "Delivery boy deleted" });
  } catch (err) {
    console.error("vendor/staff DELETE error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/order-in-progress/:id  (kept for backward compat)
router.put("/order-in-progress/:id", ...auth, async (req, res) => {
  const orderId  = req.params.id;
  const vendorId = req.user.id;
  try {
    const [result] = await pool.query(
      `UPDATE orders SET status = "in_progress" WHERE id = ? AND vendor_id = ?`,
      [orderId, vendorId]
    );
    if (!result.affectedRows)
      return res.status(404).json({ message: "Order not found or not yours" });
    await pool.query(
      `INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?, "in_progress", ?)`,
      [orderId, vendorId]
    );
    const [rows] = await pool.query(`SELECT customer_id FROM orders WHERE id = ?`, [orderId]);
    try {
      const io = getIO();
      if (rows.length > 0) emitToCustomer(rows[0].customer_id, "order_status_update", { orderId, status: "in_progress" });
      io.to("admin_room").emit("order_status_update", { orderId, status: "in_progress" });
    } catch (_) {}
    res.json({ message: "Order marked in progress", orderId, status: "in_progress" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/vendor/my-rating
router.get("/vendor/my-rating", ...auth, async (req, res) => {
  const vendorId = req.user.id;
  try {
    const [[summary]] = await pool.query(
      `SELECT
         COUNT(*)             AS total_ratings,
         AVG(vendor_rating)   AS avg_rating
       FROM ratings WHERE vendor_id = ? AND vendor_rating IS NOT NULL`,
      [vendorId]
    );
    const [reviews] = await pool.query(
      `SELECT r.vendor_rating, r.vendor_review, r.created_at,
              u.name AS customer_name
         FROM ratings r
         JOIN users u ON u.id = r.customer_id
        WHERE r.vendor_id = ? AND r.vendor_rating IS NOT NULL
        ORDER BY r.created_at DESC LIMIT 10`,
      [vendorId]
    );
    res.json({
      avg_rating:    parseFloat(summary.avg_rating || 0).toFixed(1),
      total_ratings: parseInt(summary.total_ratings || 0),
      reviews,
    });
  } catch (err) {
    console.error("my-rating error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/vendor/bag-stats — vendor sees their own bag availability summary
router.get("/vendor/bag-stats", ...auth, async (req, res) => {
  const vendorId = req.user.id;
  try {
    const [[stats]] = await pool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(status = 'available') AS available,
         SUM(status = 'in_use') AS in_use,
         SUM(status = 'missing') AS missing
       FROM bags WHERE vendor_id = ?`,
      [vendorId]
    );
    const [[user]] = await pool.query(
      "SELECT bags_available, status FROM users WHERE id = ?", [vendorId]
    );
    res.json({ stats: {
      total:          parseInt(stats.total     || 0),
      available:      parseInt(stats.available || 0),
      in_use:         parseInt(stats.in_use    || 0),
      missing:        parseInt(stats.missing   || 0),
      bags_available: user?.bags_available ?? 1,
      vendor_status:  user?.status ?? "active",
    }});
  } catch (err) {
    console.error("bag-stats error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ── Iron Shop Tablet ───────────────────────────────────────────────────────

// GET /api/vendor/tablet-bags — all vendor bags: active-order bags + available/empty bags
router.get("/vendor/tablet-bags", ...tabletAuth, async (req, res) => {
  const vendorId = req.user.vendor_id || req.user.id;
  try {
    // Bags currently assigned to active orders
    // ob_id = order_bags.id  (used by start/complete API routes)
    // bag_number             (unique physical bag label, used as React key)
    const [activeBags] = await pool.query(
      `SELECT
         ob.id          AS ob_id,
         b.bag_number,
         ob.ironing_status,
         o.id           AS order_id,
         o.order_code,
         o.status       AS order_status,
         o.delivery_agent_id,
         u.name         AS customer_name,
         JSON_ARRAYAGG(
           JSON_OBJECT('garment_name', oi.garment_name, 'quantity', oi.quantity)
         ) AS items
       FROM order_bags ob
       JOIN bags b         ON b.id  = ob.bag_id
       JOIN orders o       ON o.id  = ob.order_id
       JOIN users u        ON u.id  = o.customer_id
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.vendor_id = ?
         AND o.status IN ('picked_up', 'at_vendor', 'ironing_in_progress')
         AND ob.ironing_status != 'completed'
       GROUP BY ob.id, b.bag_number, ob.ironing_status,
                o.id, o.order_code, o.status, o.delivery_agent_id, u.name`,
      [vendorId]
    );

    // All vendor bags not currently showing as active
    const activeBagNumbers = activeBags.map(b => b.bag_number);
    const [allBags] = await pool.query(
      `SELECT bag_number FROM bags WHERE vendor_id = ? ORDER BY bag_number`,
      [vendorId]
    );
    const emptyBags = allBags
      .filter(b => !activeBagNumbers.includes(b.bag_number))
      .map(b => ({
        ob_id: null,
        bag_number: b.bag_number,
        ironing_status: null,
        order_id: null,
        order_code: null,
        order_status: 'available',
        delivery_agent_id: null,
        customer_name: null,
        items: [],
      }));

    // Active bags first (sorted: ironing → at_vendor → picked_up), then empty bags by number
    const sorted = [
      ...activeBags.sort((a, b) => {
        const rank = s => s === 'ironing_in_progress' ? 0 : s === 'at_vendor' ? 1 : 2;
        return rank(a.order_status) - rank(b.order_status) || a.bag_number - b.bag_number;
      }),
      ...emptyBags,
    ];

    res.json({ bags: sorted });
  } catch (err) {
    console.error("tablet-bags GET error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/vendor/tablet-bags/:bagId/start-iron
router.put("/vendor/tablet-bags/:bagId/start-iron", ...tabletAuth, async (req, res) => {
  const vendorId = req.user.vendor_id || req.user.id;
  const bagId    = req.params.bagId;
  try {
    // Only one bag can be ironed at a time — scoped to active orders only, so a
    // bag left at 'ironing' by an order that later got delivered/cancelled through
    // another path can't permanently block new ironing sessions for this vendor.
    const [active] = await pool.query(
      `SELECT ob.id FROM order_bags ob
       JOIN orders o ON o.id = ob.order_id
       WHERE o.vendor_id = ? AND ob.ironing_status = 'ironing'
         AND o.status NOT IN ('delivered', 'cancelled')
       LIMIT 1`,
      [vendorId]
    );
    if (active.length > 0)
      return res.status(400).json({ message: "Another bag is already being ironed" });

    await pool.query(
      `UPDATE order_bags SET ironing_status = 'ironing' WHERE id = ?`, [bagId]
    );
    const [[bag]] = await pool.query(
      `SELECT ob.order_id, o.customer_id, o.delivery_agent_id, b.bag_number, o.vendor_id AS vid
       FROM order_bags ob
       JOIN orders o ON o.id = ob.order_id
       JOIN bags b   ON b.id = ob.bag_id
       WHERE ob.id = ?`, [bagId]
    );
    await pool.query(
      `UPDATE orders SET status = 'ironing_in_progress' WHERE id = ? AND status = 'at_vendor'`,
      [bag.order_id]
    );

    // Log iron start time
    await pool.query(
      `INSERT INTO order_activity_log (order_id, ob_id, bag_number, vendor_id, iron_start_time)
       VALUES (?, ?, ?, ?, NOW())`,
      [bag.order_id, bagId, bag.bag_number, bag.vid || vendorId]
    );

    try {
      const io = getIO();
      emitToCustomer(bag.customer_id, "order_status_update", { orderId: bag.order_id, status: "ironing_in_progress" });
      io.to("admin_room").emit("order_status_update", { orderId: bag.order_id, status: "ironing_in_progress" });
      io.to("admin_room").emit("order_ironing", { orderId: bag.order_id });
      io.to(`vendor_${vendorId}`).emit("order_status_update", { orderId: bag.order_id, status: "ironing_in_progress" });
      io.to(`vendor_${vendorId}`).emit("tablet_bag_update", { bagId, status: "ironing" });
      if (bag.delivery_agent_id)
        io.to(`delivery_${bag.delivery_agent_id}`).emit("order_status_update", { orderId: bag.order_id, status: "ironing_in_progress" });
    } catch (_) {}

    res.json({ message: "Ironing started", bagId, status: "ironing" });
  } catch (err) {
    console.error("start-iron error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/vendor/tablet-bags/:bagId/complete-iron
router.put("/vendor/tablet-bags/:bagId/complete-iron", ...tabletAuth, async (req, res) => {
  const vendorId = req.user.vendor_id || req.user.id;
  const bagId    = req.params.bagId;
  const conn = await pool.getConnection();
  let bag, orderReady = false;
  try {
    await conn.beginTransaction();

    await conn.query(
      `UPDATE order_bags SET ironing_status = 'completed' WHERE id = ?`, [bagId]
    );

    const [[bagRow]] = await conn.query(
      `SELECT ob.order_id, o.customer_id, o.delivery_agent_id
       FROM order_bags ob JOIN orders o ON o.id = ob.order_id WHERE ob.id = ?`, [bagId]
    );
    bag = bagRow;

    // Close out this bag's activity-log row. Also falls back to an order-level
    // row (ob_id IS NULL) so a bag started via the center-head "start-ironing"
    // flow still gets its complete time recorded when finished from the tablet —
    // the two flows track the same work under different keys (ob_id vs order_id),
    // so completion must recognize either.
    await conn.query(
      `UPDATE order_activity_log SET iron_complete_time = NOW()
       WHERE iron_complete_time IS NULL AND (ob_id = ? OR (ob_id IS NULL AND order_id = ?))
       ORDER BY id DESC LIMIT 1`,
      [bagId, bag.order_id]
    );

    // FOR UPDATE locks the rows so concurrent completions can't both see cnt=0
    const [[remaining]] = await conn.query(
      `SELECT COUNT(*) AS cnt FROM order_bags
       WHERE order_id = ? AND ironing_status != 'completed' FOR UPDATE`,
      [bag.order_id]
    );

    if (remaining.cnt === 0) {
      // Skip straight to out_for_delivery — no manual "Picked from Vendor" /
      // "Start Ride" steps; only "I've Reached" remains for the delivery boy.
      // Guard on the actual pre-delivery statuses (not just "!= out_for_delivery")
      // so a late/duplicate bag-complete call can't resurrect an order that has
      // already moved past this point (delivered, cancelled, etc).
      await conn.query(
        `UPDATE orders SET status = 'out_for_delivery'
         WHERE id = ? AND status IN ('at_vendor', 'ironing_in_progress', 'in_progress')`, [bag.order_id]
      );
      await conn.query(
        `UPDATE bags b JOIN order_bags ob ON ob.bag_id = b.id SET b.status = 'available' WHERE ob.order_id = ?`,
        [bag.order_id]
      );
      await conn.query(
        `INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?, "ready_for_delivery", ?)`,
        [bag.order_id, vendorId]
      );
      await conn.query(
        `INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?, "picked_from_vendor", ?)`,
        [bag.order_id, vendorId]
      );
      await conn.query(
        `INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?, "out_for_delivery", ?)`,
        [bag.order_id, vendorId]
      );
      if (bag.delivery_agent_id) {
        await conn.query(
          `UPDATE delivery_assignments SET status = "out_for_delivery" WHERE order_id = ?`,
          [bag.order_id]
        );
      }
      orderReady = true;
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error("complete-iron error:", err);
    return res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }

  try {
    const io = getIO();
    if (orderReady) {
      emitToCustomer(bag.customer_id, "order_status_update", { orderId: bag.order_id, status: "out_for_delivery" });
      io.to("admin_room").emit("order_status_update", { orderId: bag.order_id, status: "out_for_delivery" });
      io.to(`vendor_${vendorId}`).emit("order_status_update", { orderId: bag.order_id, status: "out_for_delivery" });
      io.to(`vendor_${vendorId}`).emit("tablet_bag_update", { bagId, status: "completed", orderReady: true });
      if (bag.delivery_agent_id) {
        io.to(`delivery_${bag.delivery_agent_id}`).emit("order_ready_for_delivery", {
          orderId: bag.order_id, message: "Ironing complete — deliver to customer now"
        });
      }
    } else {
      io.to(`vendor_${vendorId}`).emit("tablet_bag_update", { bagId, status: "completed", orderReady: false });
      io.to(`vendor_${vendorId}`).emit("order_status_update", { orderId: bag.order_id });
      io.to("admin_room").emit("order_status_update", { orderId: bag.order_id });
    }
  } catch (_) {}

  return res.json(orderReady
    ? { message: "All bags done — order ready for delivery", bagId, orderReady: true }
    : { message: "Bag ironing completed", bagId, orderReady: false }
  );
});

// PUT /api/vendor/bags-available — vendor toggles their bag availability status
router.put("/vendor/bags-available", ...auth, async (req, res) => {
  const vendorId = req.user.id;
  const { bags_available } = req.body;
  if (bags_available === undefined)
    return res.status(400).json({ message: "bags_available (0 or 1) is required" });
  try {
    await pool.query(
      "UPDATE users SET bags_available = ? WHERE id = ?",
      [bags_available ? 1 : 0, vendorId]
    );
    res.json({ message: "Updated", bags_available: bags_available ? 1 : 0 });
  } catch (err) {
    console.error("bags-available error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
