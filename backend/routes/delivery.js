const express = require("express");
const http    = require("http");
const https   = require("https");
const pool    = require("../db");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
const { getIO } = require("../socket");

const router = express.Router();
const auth   = [verifyToken, requireRole("delivery")];

// ── WhatsApp OTP sender ─────────────────────────────────────
function sendWhatsAppOtp(phone10digit, otp) {
  const phone = "91" + phone10digit;
  const path  = `/webhook/014bb05a-ec6e-4cda-b3dc-614b418dfe79?phone_number=${phone}&otp=${otp}`;
  return new Promise((resolve, reject) => {
    const req = https.request(
      { hostname: "automate.cherubim.in", path, method: "POST",
        headers: { Authorization: "Basic b3RwX2F1dGg6QzAwTDc4Njk1NTk5" } },
      res => { res.resume(); resolve(res.statusCode); }
    );
    req.setTimeout(8000, () => { req.destroy(); reject(new Error("webhook timeout")); });
    req.on("error", reject);
    req.end();
  });
}

// Bridge: customer frontend connects to port 5001 (customer backend).
// This backend runs on 5002 with its own Socket.IO instance, so direct
// io.to("customer_*") emits would never reach the customer.
// Instead, POST to the customer backend's internal notify endpoint.
function emitToCustomer(customerId, event, payload) {
  const body = JSON.stringify({ room: `customer_${customerId}`, event, payload });
  const req = http.request(
    {
      hostname: "localhost", port: 5001, path: "/api/internal/notify",
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body), "x-internal-secret": process.env.INTERNAL_SECRET },
    },
    (res) => res.resume() // consume response body to free the socket
  );
  req.on("error", (err) => {
    console.error(`[emitToCustomer] failed to reach customer_${customerId}:`, err.message);
  });
  req.write(body);
  req.end();
}

// Helper — emit to customer + admin + optional extra rooms
function broadcast(io, { customerId, agentId, vendorId }, event, payload) {
  try {
    if (customerId) emitToCustomer(customerId, event, payload);
    io.to("admin_room").emit(event, payload);
    if (agentId)   io.to("delivery_" + agentId).emit(event, payload);
    if (vendorId)  io.to("vendor_"   + vendorId).emit(event, payload);
  } catch (_) {}
}

// Helper — fetch order with all parties, verify it belongs to this agent
// Uses the LATEST assignment row to prevent a previously-assigned agent
// from acting on a re-assigned order.
async function getOrderForAgent(orderId, agentId) {
  const [rows] = await pool.query(
    `SELECT o.id, o.status, o.customer_id, o.vendor_id, o.delivery_agent_id
       FROM orders o
       JOIN delivery_assignments da
            ON  da.order_id = o.id
            AND da.delivery_agent_id = ?
            AND da.id = (SELECT MAX(da2.id) FROM delivery_assignments da2 WHERE da2.order_id = o.id)
      WHERE o.id = ?`,
    [agentId, orderId]
  );
  return rows[0] || null;
}

// GET /api/delivery/my-vendor — returns the Center Head this delivery boy belongs to
router.get("/delivery/my-vendor", ...auth, async (req, res) => {
  try {
    const [[row]] = await pool.query(
      `SELECT v.id AS vendor_id, v.name AS vendor_name, v.phone AS vendor_phone
         FROM users u
         LEFT JOIN users v ON v.id = u.vendor_id
        WHERE u.id = ?`,
      [req.user.id]
    );
    res.json({ vendor_id: row?.vendor_id || null, vendor_name: row?.vendor_name || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/delivery/completed-orders — all delivered orders for this agent
router.get("/delivery/completed-orders", ...auth, async (req, res) => {
  const agentId = req.user.id;
  try {
    const [orders] = await pool.query(
      `SELECT o.id, o.order_code, o.total, o.created_at,
              u.name AS customer_name, u.address AS customer_address, u.apartment AS customer_apartment,
              da.delivered_at,
              da.pickup_latitude, da.pickup_longitude,
              da.delivery_latitude, da.delivery_longitude,
              JSON_ARRAYAGG(
                JSON_OBJECT('garment_name', oi.garment_name, 'quantity', oi.quantity)
              ) AS items
         FROM orders o
         JOIN delivery_assignments da ON da.order_id = o.id
         JOIN users u ON u.id = o.customer_id
         JOIN order_items oi ON oi.order_id = o.id
        WHERE da.delivery_agent_id = ? AND o.status = 'delivered'
        GROUP BY o.id
        ORDER BY da.delivered_at DESC`,
      [agentId]
    );
    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
    res.json({ orders, totalRevenue });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/delivery/assigned-orders — all active orders for this delivery agent
router.get("/delivery/assigned-orders", ...auth, async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.*, u.name AS customer_name, u.phone AS customer_phone, u.address AS customer_address,
              v.name AS vendor_name, v.address AS vendor_address, v.bags_available AS vendor_bags_flag,
              da.status AS assignment_status, da.current_latitude, da.current_longitude,
              b.bag_number,
              COALESCE(
                (SELECT GROUP_CONCAT(DISTINCT b2.bag_number ORDER BY b2.bag_number SEPARATOR ',')
                   FROM order_bags ob2 JOIN bags b2 ON b2.id = ob2.bag_id WHERE ob2.order_id = o.id),
                IF(b.bag_number IS NOT NULL, CAST(b.bag_number AS CHAR), NULL)
              ) AS bag_numbers,
              apt.delivery_time AS apt_delivery_time,
              (SELECT COUNT(*) FROM bags WHERE vendor_id = o.vendor_id AND status = 'available') AS vendor_available_bags,
              JSON_ARRAYAGG(
                JSON_OBJECT("garment_name", oi.garment_name, "quantity", oi.quantity)
              ) AS items
         FROM orders o
         JOIN users u ON u.id = o.customer_id
         LEFT JOIN users v ON v.id = o.vendor_id
         LEFT JOIN bags b ON b.id = o.bag_id
         LEFT JOIN apartments apt ON apt.name = o.apartment
         JOIN order_items oi ON oi.order_id = o.id
         JOIN delivery_assignments da ON da.order_id = o.id
        WHERE da.delivery_agent_id = ?
          AND o.status NOT IN ("delivered","cancelled")
        GROUP BY o.id
        ORDER BY o.created_at ASC`,
      [req.user.id]
    );
    res.json({ orders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/delivery/accept-order/:id
// Delivery boy accepts assignment → delivery_assigned
router.put("/delivery/accept-order/:id", ...auth, async (req, res) => {
  const orderId = req.params.id;
  const agentId = req.user.id;
  const conn = await pool.getConnection();
  let orderRow;
  try {
    await conn.beginTransaction();

    const [upd] = await conn.query(
      `UPDATE orders SET status = "delivery_assigned"
        WHERE id = ? AND status = "vendor_accepted"`, [orderId]
    );
    if (!upd.affectedRows) {
      await conn.rollback();
      return res.status(404).json({ message: "Order not available to accept" });
    }
    await conn.query(
      `UPDATE delivery_assignments SET status = "accepted" WHERE order_id = ?`, [orderId]
    );
    await conn.query(
      `INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?, "delivery_assigned", ?)`,
      [orderId, agentId]
    );

    const [[row]] = await conn.query(
      `SELECT customer_id, vendor_id FROM orders WHERE id = ?`, [orderId]
    );
    orderRow = row;
    await conn.commit();
  } catch (err) {
    await conn.rollback().catch(() => {});
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  } finally {
    conn.release();
  }

  // Post-commit: fetch agent info and emit socket events
  const [agentRows] = await pool.query(
    `SELECT name, phone FROM users WHERE id = ?`, [agentId]
  );
  const agent = agentRows[0] || {};

  try {
    const io = getIO();
    broadcast(io, { customerId: orderRow.customer_id, vendorId: orderRow.vendor_id }, "order_status_update", {
      orderId, status: "delivery_assigned", agentId
    });
    emitToCustomer(orderRow.customer_id, "delivery_accepted", {
      orderId,
      agentName:  agent.name  || "Delivery Agent",
      agentPhone: agent.phone || "",
      status: "delivery_assigned",
    });
  } catch (_) {}

  res.json({ message: "Order accepted", orderId, status: "delivery_assigned" });
});

// POST /api/delivery/update-location/:orderId
// Delivery boy sends live location; backend forwards to customer
router.post("/delivery/update-location/:orderId", ...auth, async (req, res) => {
  const orderId = req.params.orderId;
  const agentId = req.user.id;
  const { latitude, longitude } = req.body;

  if (latitude == null || longitude == null)
    return res.status(400).json({ message: "latitude and longitude required" });

  try {
    const order = await getOrderForAgent(orderId, agentId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    await pool.query(
      `UPDATE delivery_assignments
          SET current_latitude = ?, current_longitude = ?, last_location_update = NOW()
        WHERE order_id = ?`,
      [latitude, longitude, orderId]
    );

    try {
      emitToCustomer(order.customer_id, "location_update", {
        orderId, latitude, longitude, agentId
      });
    } catch (_) {}

    res.json({ message: "Location updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/delivery/reached-for-pickup/:orderId
// Agent at customer location for pickup — stores OTP and sends to customer
router.put("/delivery/reached-for-pickup/:orderId", ...auth, async (req, res) => {
  const orderId = req.params.orderId;
  const agentId = req.user.id;
  try {
    const order = await getOrderForAgent(orderId, agentId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status !== "delivery_assigned")
      return res.status(400).json({ message: "Order is not at pickup stage" });

    // Reuse existing OTP on double-tap — prevents customer seeing a different
    // code from what the agent will enter in verify-pickup-otp
    const [[{ pickup_otp: existing }]] = await pool.query(
      `SELECT pickup_otp FROM orders WHERE id = ?`, [orderId]
    );
    const PICKUP_OTP = existing || String(Math.floor(1000 + Math.random() * 9000));

    if (!existing) {
      await pool.query(`UPDATE orders SET pickup_otp = ? WHERE id = ?`, [PICKUP_OTP, orderId]);
    }

    // Send OTP to customer via WhatsApp
    const [[customer]] = await pool.query(`SELECT phone FROM users WHERE id = ?`, [order.customer_id]);
    if (customer?.phone) {
      try { await sendWhatsAppOtp(customer.phone, PICKUP_OTP); }
      catch (err) { console.error("[pickup-otp] WhatsApp error:", err.message); }
    }

    emitToCustomer(order.customer_id, "show_pickup_otp", { orderId });
    broadcast(getIO(), { vendorId: order.vendor_id }, "order_status_update", { orderId, status: "reached_for_pickup" });
    res.json({ message: "Customer notified with pickup OTP" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/delivery/verify-pickup-otp/:orderId
// Agent verifies OTP spoken by customer; marks order picked_up
router.put("/delivery/verify-pickup-otp/:orderId", ...auth, async (req, res) => {
  const orderId = req.params.orderId;
  const agentId = req.user.id;
  const { otp }  = req.body;

  // Validate OTP before opening a connection
  const [rows] = await pool.query(
    `SELECT o.pickup_otp, o.customer_id, o.vendor_id
       FROM orders o
       JOIN delivery_assignments da ON da.order_id = o.id
      WHERE o.id = ? AND da.delivery_agent_id = ?`,
    [orderId, agentId]
  );
  if (!rows.length) return res.status(404).json({ message: "Order not found" });

  const { pickup_otp, customer_id, vendor_id } = rows[0];
  if (!pickup_otp)
    return res.status(400).json({ message: "OTP not generated yet. Click 'Reached for Pickup' first." });
  if (String(otp).trim() !== String(pickup_otp).trim())
    return res.status(400).json({ message: "Incorrect OTP. Ask the customer for the correct code." });

  // OTP correct — write all DB changes atomically
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(`UPDATE orders SET status = "picked_up" WHERE id = ?`, [orderId]);
    await conn.query(
      `UPDATE delivery_assignments
          SET status = "picked_up", pickup_otp_verified = 1, pickup_at = NOW()
        WHERE order_id = ?`, [orderId]
    );
    await conn.query(
      `INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?, "picked_up", ?)`,
      [orderId, agentId]
    );

    // Auto-assign an available bag so tablet can show it as "on the way" immediately
    const [[existingBag]] = await conn.query(
      `SELECT COUNT(*) AS cnt FROM order_bags WHERE order_id = ?`, [orderId]
    );
    if (existingBag.cnt === 0) {
      const [[availBag]] = await conn.query(
        `SELECT id FROM bags WHERE vendor_id = ? AND status = 'available' ORDER BY id LIMIT 1 FOR UPDATE`,
        [vendor_id]
      );
      if (availBag) {
        await conn.query(`INSERT IGNORE INTO order_bags (order_id, bag_id) VALUES (?, ?)`, [orderId, availBag.id]);
        await conn.query(`UPDATE bags SET status = 'in_use' WHERE id = ?`, [availBag.id]);
        await conn.query(`UPDATE orders SET bag_id = ? WHERE id = ? AND bag_id IS NULL`, [availBag.id, orderId]);
      }
    }

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
    broadcast(io, { customerId: customer_id, vendorId: vendor_id }, "order_status_update", { orderId, status: "picked_up" });
    emitToCustomer(customer_id, "order_picked_up", { orderId, message: "Delivery agent picked up your clothes" });
  } catch (_) {}

  res.json({ message: "Pickup OTP verified, order picked up", orderId, status: "picked_up" });
});

// PUT /api/delivery/dropped-at-vendor/:orderId
// Agent drops clothes at iron shop → at_vendor
router.put("/delivery/dropped-at-vendor/:orderId", ...auth, async (req, res) => {
  const orderId = req.params.orderId;
  const agentId = req.user.id;
  try {
    const order = await getOrderForAgent(orderId, agentId);
    if (!order || order.status !== "picked_up")
      return res.status(404).json({ message: "Order not at picked_up stage" });

    await pool.query(
      `UPDATE orders SET status = "at_vendor" WHERE id = ?`, [orderId]
    );
    await pool.query(
      `UPDATE delivery_assignments SET status = "at_vendor" WHERE order_id = ?`, [orderId]
    );
    await pool.query(
      `INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?, "at_vendor", ?)`,
      [orderId, agentId]
    );

    // Auto-assign an available bag if none were assigned during pickup
    const [[existing]] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM order_bags WHERE order_id = ?`, [orderId]
    );
    if (existing.cnt === 0) {
      const [[availBag]] = await pool.query(
        `SELECT id FROM bags WHERE vendor_id = ? AND status = 'available' ORDER BY id LIMIT 1`,
        [order.vendor_id]
      );
      if (availBag) {
        await pool.query(
          `INSERT IGNORE INTO order_bags (order_id, bag_id) VALUES (?, ?)`, [orderId, availBag.id]
        );
        await pool.query(`UPDATE bags SET status = 'in_use' WHERE id = ?`, [availBag.id]);
        await pool.query(`UPDATE orders SET bag_id = ? WHERE id = ? AND bag_id IS NULL`, [availBag.id, orderId]);
      }
    }

    try {
      broadcast(getIO(), { customerId: order.customer_id, vendorId: order.vendor_id }, "order_status_update", {
        orderId, status: "at_vendor"
      });
      getIO().to("vendor_" + order.vendor_id).emit("order_at_vendor", {
        orderId, message: "Clothes delivered to your shop for ironing"
      });
    } catch (_) {}

    res.json({ message: "Dropped at vendor", orderId, status: "at_vendor" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/delivery/picked-from-vendor/:orderId
// Agent picks up ironed clothes from vendor → picked_from_vendor
router.put("/delivery/picked-from-vendor/:orderId", ...auth, async (req, res) => {
  const orderId = req.params.orderId;
  const agentId = req.user.id;
  try {
    const order = await getOrderForAgent(orderId, agentId);
    if (!order || order.status !== "ready_for_delivery")
      return res.status(400).json({ message: "Order not ready for pickup yet" });

    await pool.query(
      `UPDATE orders SET status = "picked_from_vendor" WHERE id = ?`, [orderId]
    );
    await pool.query(
      `UPDATE delivery_assignments SET status = "picked_from_vendor" WHERE order_id = ?`, [orderId]
    );
    await pool.query(
      `INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?, "picked_from_vendor", ?)`,
      [orderId, agentId]
    );

    try {
      broadcast(getIO(), { customerId: order.customer_id, vendorId: order.vendor_id }, "order_status_update", {
        orderId, status: "picked_from_vendor"
      });
    } catch (_) {}

    res.json({ message: "Picked from vendor", orderId, status: "picked_from_vendor" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/delivery/start-ride/:orderId
// Agent begins final ride to customer → out_for_delivery
router.put("/delivery/start-ride/:orderId", ...auth, async (req, res) => {
  const orderId = req.params.orderId;
  const agentId = req.user.id;
  try {
    const order = await getOrderForAgent(orderId, agentId);
    if (!order || order.status !== "picked_from_vendor")
      return res.status(400).json({ message: "Order not at picked_from_vendor stage" });

    await pool.query(
      `UPDATE orders SET status = "out_for_delivery" WHERE id = ?`, [orderId]
    );
    await pool.query(
      `UPDATE delivery_assignments SET status = "out_for_delivery" WHERE order_id = ?`, [orderId]
    );
    await pool.query(
      `INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?, "out_for_delivery", ?)`,
      [orderId, agentId]
    );

    try {
      broadcast(getIO(), { customerId: order.customer_id, vendorId: order.vendor_id }, "order_status_update", {
        orderId, status: "out_for_delivery"
      });
    } catch (_) {}

    res.json({ message: "Ride started, out for delivery", orderId, status: "out_for_delivery" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/delivery/end-ride/:orderId
// Agent arrives at customer for final delivery — generates real OTP, sends to customer
router.put("/delivery/end-ride/:orderId", ...auth, async (req, res) => {
  const orderId = req.params.orderId;
  const agentId = req.user.id;
  try {
    const order = await getOrderForAgent(orderId, agentId);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status !== "out_for_delivery")
      return res.status(400).json({ message: "Order is not out for delivery" });

    // Reuse existing OTP on double-tap to stay in sync with customer's screen
    const [[{ delivery_otp: existing }]] = await pool.query(
      `SELECT delivery_otp FROM orders WHERE id = ?`, [orderId]
    );
    const DELIVERY_OTP = existing || String(Math.floor(1000 + Math.random() * 9000));

    if (!existing) {
      await pool.query(`UPDATE orders SET delivery_otp = ? WHERE id = ?`, [DELIVERY_OTP, orderId]);
    }

    // Send OTP to customer via WhatsApp
    const [[customer]] = await pool.query(`SELECT phone FROM users WHERE id = ?`, [order.customer_id]);
    if (customer?.phone) {
      try { await sendWhatsAppOtp(customer.phone, DELIVERY_OTP); }
      catch (err) { console.error("[delivery-otp] WhatsApp error:", err.message); }
    }

    emitToCustomer(order.customer_id, "show_delivery_otp", { orderId });
    broadcast(getIO(), { vendorId: order.vendor_id }, "order_status_update", { orderId, status: "reached_for_delivery" });
    res.json({ message: "Customer notified with delivery OTP" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/delivery/available-bags/:vendorId
// Return bags that are currently available for the given vendor (only when vendor has bags_available ON)
router.get("/delivery/available-bags/:vendorId", ...auth, async (req, res) => {
  try {
    const [[vendor]] = await pool.query(
      "SELECT bags_available FROM users WHERE id = ? AND role = 'vendor'",
      [req.params.vendorId]
    );
    if (!vendor || !vendor.bags_available) {
      return res.json({ bags: [] });
    }
    const [bags] = await pool.query(
      `SELECT id, bag_number FROM bags WHERE vendor_id = ? AND status = 'available' ORDER BY bag_number ASC`,
      [req.params.vendorId]
    );
    res.json({ bags });
  } catch (err) {
    console.error("available-bags error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/delivery/confirm-pickup/:orderId
// Body: { otp, bag_ids: [id, ...] } — verifies pickup OTP, assigns bags, marks order picked_up
router.put("/delivery/confirm-pickup/:orderId", ...auth, async (req, res) => {
  const orderId = req.params.orderId;
  const agentId = req.user.id;
  const { otp, bag_ids, latitude, longitude } = req.body;

  const ids = Array.isArray(bag_ids) ? bag_ids.map(Number).filter(Boolean) : [];
  if (!ids.length) return res.status(400).json({ message: "Please select at least one bag" });

  try {
    const [rows] = await pool.query(
      `SELECT o.pickup_otp, o.customer_id, o.vendor_id
         FROM orders o
         JOIN delivery_assignments da ON da.order_id = o.id
        WHERE o.id = ? AND da.delivery_agent_id = ?`,
      [orderId, agentId]
    );
    if (!rows.length)
      return res.status(404).json({ message: "Order not found" });

    const { pickup_otp, customer_id, vendor_id } = rows[0];

    if (!pickup_otp)
      return res.status(400).json({ message: "OTP not generated yet. Tap 'I've Reached' first." });
    if (String(otp).trim() !== String(pickup_otp).trim())
      return res.status(400).json({ message: "Incorrect OTP. Ask the customer for the correct code." });

    // Lock all selected bags atomically to prevent race conditions
    const bagConn = await pool.getConnection();
    let bag_numbers;
    try {
      await bagConn.beginTransaction();
      const ph = ids.map(() => "?").join(",");
      const [bagRows] = await bagConn.query(
        `SELECT id, bag_number, status FROM bags WHERE id IN (${ph}) AND vendor_id = ? FOR UPDATE`,
        [...ids, vendor_id]
      );
      if (bagRows.length !== ids.length) {
        await bagConn.rollback();
        bagConn.release();
        return res.status(400).json({ message: "One or more selected bags are invalid" });
      }
      const inUse = bagRows.filter(b => b.status !== "available");
      if (inUse.length) {
        await bagConn.rollback();
        bagConn.release();
        return res.status(400).json({
          message: `Bag${inUse.length > 1 ? "s" : ""} #${inUse.map(b => b.bag_number).join(", #")} already in use. Choose others.`
        });
      }
      bag_numbers = bagRows.map(b => b.bag_number).sort((a, b) => a - b);

      await bagConn.query(`UPDATE orders SET status = 'picked_up', bag_id = ? WHERE id = ?`, [ids[0], orderId]);
      await bagConn.query(`UPDATE bags SET status = 'in_use' WHERE id IN (${ph})`, ids);
      await bagConn.query(
        `INSERT IGNORE INTO order_bags (order_id, bag_id) VALUES ${ids.map(() => "(?, ?)").join(",")}`,
        ids.flatMap(bid => [orderId, bid])
      );
      await bagConn.query(
        `UPDATE delivery_assignments SET status = 'picked_up', pickup_otp_verified = 1, pickup_at = NOW(),
          pickup_latitude = ?, pickup_longitude = ? WHERE order_id = ?`,
        [latitude ?? null, longitude ?? null, orderId]
      );
      await bagConn.query(
        `INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?, 'picked_up', ?)`,
        [orderId, agentId]
      );
      await bagConn.commit();
    } catch (e) {
      await bagConn.rollback().catch(() => {});
      bagConn.release();
      throw e;
    }
    bagConn.release();

    try {
      const io = getIO();
      broadcast(io, { customerId: customer_id, vendorId: vendor_id }, "order_status_update", {
        orderId, status: "picked_up"
      });
      emitToCustomer(customer_id, "order_picked_up", {
        orderId, message: "Delivery agent has picked up your clothes", bag_numbers
      });
    } catch (_) {}

    res.json({ message: "Pickup confirmed", orderId, status: "picked_up", bag_numbers });
  } catch (err) {
    console.error("confirm-pickup error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/delivery/verify-delivery-otp/:orderId
// Agent verifies final OTP → delivered
router.put("/delivery/verify-delivery-otp/:orderId", ...auth, async (req, res) => {
  const orderId = req.params.orderId;
  const agentId = req.user.id;
  const { otp, latitude, longitude } = req.body;

  // Validate OTP before opening a connection
  const [rows] = await pool.query(
    `SELECT o.delivery_otp, o.customer_id, o.vendor_id
       FROM orders o
       JOIN delivery_assignments da ON da.order_id = o.id
      WHERE o.id = ? AND da.delivery_agent_id = ?`,
    [orderId, agentId]
  );
  if (!rows.length) return res.status(404).json({ message: "Order not found" });

  const { delivery_otp, customer_id, vendor_id } = rows[0];
  if (!delivery_otp)
    return res.status(400).json({ message: "OTP not generated yet. Tap 'End Ride' first." });
  if (String(otp).trim() !== String(delivery_otp).trim())
    return res.status(400).json({ message: "Incorrect OTP. Ask the customer for the correct code." });

  // OTP correct — write all DB changes atomically
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(`UPDATE orders SET status = "delivered" WHERE id = ?`, [orderId]);
    await conn.query(
      `UPDATE delivery_assignments
          SET status = "delivered", delivery_otp_verified = 1, delivered_at = NOW(),
              delivery_latitude = ?, delivery_longitude = ?
        WHERE order_id = ?`,
      [latitude ?? null, longitude ?? null, orderId]
    );
    await conn.query(
      `INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?, "delivered", ?)`,
      [orderId, agentId]
    );

    // Release bags — try order_bags JOIN first, fallback to orders.bag_id
    const [bagResult] = await conn.query(
      `UPDATE bags b JOIN order_bags ob ON ob.bag_id = b.id SET b.status = 'available' WHERE ob.order_id = ?`,
      [orderId]
    );
    if (bagResult.affectedRows === 0) {
      await conn.query(
        `UPDATE bags b JOIN orders o ON o.bag_id = b.id SET b.status = 'available' WHERE o.id = ?`,
        [orderId]
      );
    }

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
    broadcast(io, { customerId: customer_id, vendorId: vendor_id }, "order_status_update", { orderId, status: "delivered" });
    broadcast(io, { customerId: customer_id, vendorId: vendor_id }, "order_delivered", { orderId, message: "Order delivered successfully!" });
  } catch (_) {}

  res.json({ message: "Delivery OTP verified, order delivered", orderId, status: "delivered" });
});

// GET /api/delivery/my-rating
router.get("/delivery/my-rating", ...auth, async (req, res) => {
  const agentId = req.user.id;
  try {
    const [[summary]] = await pool.query(
      `SELECT
         COUNT(*)               AS total_ratings,
         AVG(delivery_rating)   AS avg_rating
       FROM ratings WHERE delivery_agent_id = ? AND delivery_rating IS NOT NULL`,
      [agentId]
    );
    const [reviews] = await pool.query(
      `SELECT r.delivery_rating, r.delivery_review, r.created_at,
              u.name AS customer_name
         FROM ratings r
         JOIN users u ON u.id = r.customer_id
        WHERE r.delivery_agent_id = ? AND r.delivery_rating IS NOT NULL
        ORDER BY r.created_at DESC LIMIT 10`,
      [agentId]
    );
    res.json({
      avg_rating:    parseFloat(summary.avg_rating || 0).toFixed(1),
      total_ratings: parseInt(summary.total_ratings || 0),
      reviews,
    });
  } catch (err) {
    console.error("delivery my-rating error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
