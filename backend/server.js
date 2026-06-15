require("dotenv").config();
const express       = require("express");
const http          = require("http");
const cors          = require("cors");
const pool          = require("./db");
const socketMod     = require("./socket");
const authRoutes    = require("./routes/auth");
const vendorRoutes  = require("./routes/vendor");
const deliveryRoutes= require("./routes/delivery");
const adminRoutes   = require("./routes/admin");

const app    = express();
const server = http.createServer(app);

app.use(cors({ origin: "*" }));
app.use(express.json());

socketMod.init(server);

app.use("/api", authRoutes);
app.use("/api", vendorRoutes);
app.use("/api", deliveryRoutes);
app.use("/api", adminRoutes);

// Internal bridge — customer backend (port 5001) POSTs here to reach vendor/admin via THIS socket.io instance
app.post("/api/internal/notify", (req, res) => {
  const { room, event, payload } = req.body || {};
  if (!room || !event) return res.status(400).json({ ok: false });
  try {
    socketMod.getIO().to(room).emit(event, payload);
    res.json({ ok: true });
  } catch (err) {
    console.error("[socket-bridge] admin:", err.message);
    res.status(500).json({ ok: false });
  }
});

app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", service: "smart-iron-admin", port: process.env.PORT })
);

const PORT = parseInt(process.env.PORT) || 5002;

async function start() {
  try {
    const conn = await pool.getConnection();
    conn.release();
    console.log("OK  MySQL connected  =>  iron_platform");
  } catch (err) {
    console.error("FAIL  MySQL connection failed:", err.message);
    process.exit(1);
  }
  server.listen(PORT, () => {
    console.log("Smart-iron ADMIN API running on http://localhost:" + PORT);
  });
}

start();
