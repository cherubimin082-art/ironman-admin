const express = require("express");
const http    = require("http");
const pool    = require("../db");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
const { getIO } = require("../socket");

const router = express.Router();
const auth   = [verifyToken, requireRole("delivery")];

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
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
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

// GET /api/delivery/completed-orders — all delivered orders for this agent
router.get("/delivery/completed-orders", ...auth, async (req, res) => {
  const agentId = req.user.id;
  try {
    const [orders] = await pool.query(
      `SELECT o.id, o.order_code, o.total, o.created_at,
              u.name AS customer_name, u.address AS customer_address,
              da.delivered_at,
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
              (SELECT COUNT(*) FROM bags WHERE vendor_id = o.vendor_id AND status = 'available') AS vendor_available_bags,
              JSON_ARRAYAGG(
                JSON_OBJECT("garment_name", oi.garment_name, "quantity", oi.quantity)
              ) AS items
         FROM orders o
         JOIN users u ON u.id = o.customer_id
         LEFT JOIN users v ON v.id = o.vendor_id
         LEFT JOIN bags b ON b.id = o.bag_id
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
  try {
    const order = await getOrderForAgent(orderId, agentId);
    if (!order || order.status !== "vendor_accepted")
      return res.status(404).json({ message: "Order not available to accept" });

    await pool.query(
      `UPDATE orders SET status = "delivery_assigned" WHERE id = ?`, [orderId]
    );
    await pool.query(
      `UPDATE delivery_assignments SET status = "accepted" WHERE order_id = ?`, [orderId]
    );
    await pool.query(
      `INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?, "delivery_assigned", ?)`,
      [orderId, agentId]
    );

    // Fetch agent name + phone to send to customer
    const [agentRows] = await pool.query(
      `SELECT name, phone FROM users WHERE id = ?`, [agentId]
    );
    const agent = agentRows[0] || {};

    try {
      const io = getIO();
      // Standard status update
      broadcast(io, { customerId: order.customer_id, vendorId: order.vendor_id }, "order_status_update", {
        orderId, status: "delivery_assigned", agentId
      });
      // Richer event so customer can show agent name + phone
      emitToCustomer(order.customer_id, "delivery_accepted", {
        orderId,
        agentName:  agent.name  || "Delivery Agent",
        agentPhone: agent.phone || "",
        status: "delivery_assigned",
      });
    } catch (_) {}

    res.json({ message: "Order accepted", orderId, status: "delivery_assigned" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
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

    emitToCustomer(order.customer_id, "show_pickup_otp", { orderId, otp: PICKUP_OTP });
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

  try {
    // Fetch stored OTP + order details from DB in one query
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
      return res.status(400).json({ message: "OTP not generated yet. Click 'Reached for Pickup' first." });

    if (String(otp).trim() !== String(pickup_otp).trim())
      return res.status(400).json({ message: "Incorrect OTP. Ask the customer for the correct code." });

    // OTP correct — update DB
    await pool.query(
      `UPDATE orders SET status = "picked_up" WHERE id = ?`, [orderId]
    );
    await pool.query(
      `UPDATE delivery_assignments
          SET status = "picked_up", pickup_otp_verified = 1, pickup_at = NOW()
        WHERE order_id = ?`,
      [orderId]
    );
    await pool.query(
      `INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?, "picked_up", ?)`,
      [orderId, agentId]
    );

    try {
      const io = getIO();
      broadcast(io, { customerId: customer_id, vendorId: vendor_id }, "order_status_update", {
        orderId, status: "picked_up"
      });
      emitToCustomer(customer_id, "order_picked_up", {
        orderId, message: "Delivery agent picked up your clothes"
      });
    } catch (_) {}

    res.json({ message: "Pickup OTP verified, order picked up", orderId, status: "picked_up" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
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

    console.log(`[end-ride] orderId=${orderId} delivery_otp=${DELIVERY_OTP}`);
    emitToCustomer(order.customer_id, "show_delivery_otp", { orderId, otp: DELIVERY_OTP });

    res.json({ message: "Customer notified with delivery OTP" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/delivery/available-bags/:vendorId
// Return bags that are currently available for the given vendor
router.get("/delivery/available-bags/:vendorId", ...auth, async (req, res) => {
  try {
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
// Body: { otp, bag_id } — verifies pickup OTP, assigns bag, marks order picked_up
router.put("/delivery/confirm-pickup/:orderId", ...auth, async (req, res) => {
  const orderId = req.params.orderId;
  const agentId = req.user.id;
  const { otp, bag_id } = req.body;

  if (!bag_id) return res.status(400).json({ message: "Please select a bag" });

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

    // Verify bag belongs to this vendor and is available
    const [bagRows] = await pool.query(
      `SELECT id, bag_number, status FROM bags WHERE id = ? AND vendor_id = ?`,
      [bag_id, vendor_id]
    );
    if (!bagRows.length)
      return res.status(400).json({ message: "Invalid bag selection" });
    if (bagRows[0].status !== "available")
      return res.status(400).json({ message: "Selected bag is already in use. Choose another." });

    // OTP correct + bag available — commit everything
    await pool.query(`UPDATE orders SET status = 'picked_up', bag_id = ? WHERE id = ?`, [bag_id, orderId]);
    await pool.query(`UPDATE bags SET status = 'in_use' WHERE id = ?`, [bag_id]);
    await pool.query(
      `UPDATE delivery_assignments SET status = 'picked_up', pickup_otp_verified = 1, pickup_at = NOW() WHERE order_id = ?`,
      [orderId]
    );
    await pool.query(
      `INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?, 'picked_up', ?)`,
      [orderId, agentId]
    );

    const { bag_number } = bagRows[0];

    try {
      const io = getIO();
      broadcast(io, { customerId: customer_id, vendorId: vendor_id }, "order_status_update", {
        orderId, status: "picked_up"
      });
      emitToCustomer(customer_id, "order_picked_up", {
        orderId, message: "Delivery agent has picked up your clothes", bag_number
      });
    } catch (_) {}

    res.json({ message: "Pickup confirmed", orderId, status: "picked_up", bag_number });
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
  const { otp }  = req.body;

  try {
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

    await pool.query(`UPDATE orders SET status = "delivered" WHERE id = ?`, [orderId]);
    await pool.query(
      `UPDATE delivery_assignments
          SET status = "delivered", delivery_otp_verified = 1, delivered_at = NOW()
        WHERE order_id = ?`,
      [orderId]
    );
    await pool.query(
      `INSERT INTO order_status_history (order_id, status, changed_by) VALUES (?, "delivered", ?)`,
      [orderId, agentId]
    );
    const [bagResult] = await pool.query(
      `UPDATE bags b JOIN orders o ON o.bag_id = b.id SET b.status = 'available' WHERE o.id = ?`,
      [orderId]
    );
    if (bagResult.affectedRows === 0) {
      console.warn(`[verify-delivery-otp] bag not released for order ${orderId} — bag_id may be null`);
    }

    try {
      const io = getIO();
      broadcast(io, { customerId: customer_id, vendorId: vendor_id }, "order_status_update", {
        orderId, status: "delivered"
      });
      broadcast(io, { customerId: customer_id, vendorId: vendor_id }, "order_delivered", {
        orderId, message: "Order delivered successfully!"
      });
    } catch (_) {}

    res.json({ message: "Delivery OTP verified, order delivered", orderId, status: "delivered" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
