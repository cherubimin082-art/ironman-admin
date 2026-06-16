import { useNavigate } from "react-router-dom";
import Layout from "../../components/shared/Layout";
import { useOrders } from "../../context/OrderContext";
import api from "../../services/api";
import { useEffect, useState } from "react";

const BG = "#F5F5F8";

// ── Stat card ────────────────────────────────────────────────
function StatCard({ label, value, sub, subColor, icon, iconBg }) {
  return (
    <div style={{
      background: "white", borderRadius: 16, padding: "20px 22px",
      boxShadow: "0 1px 4px rgba(0,0,0,0.05)", flex: 1, minWidth: 0,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <p style={{ fontSize: 10.5, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>{label}</p>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {icon}
        </div>
      </div>
      <p style={{ fontSize: 30, fontWeight: 900, color: "#0F172A", margin: "0 0 5px", lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 12, color: subColor ?? "#94A3B8", margin: 0, fontWeight: 500 }}>{sub}</p>
    </div>
  );
}

// ── Status badge ─────────────────────────────────────────────
const STATUS_STYLES = {
  pending:             { label: "PENDING",     bg: "#FEF3C7", color: "#92400E" },
  vendor_accepted:     { label: "CONFIRMED",   bg: "#DBEAFE", color: "#1E40AF" },
  delivery_assigned:   { label: "ASSIGNED",    bg: "#EDE9FE", color: "#5B21B6" },
  picked_up:           { label: "PICKUP",      bg: "#DBEAFE", color: "#1E40AF" },
  at_vendor:           { label: "AT SHOP",     bg: "#FEF3C7", color: "#92400E" },
  ironing_in_progress: { label: "IN PROGRESS", bg: "#FEF3C7", color: "#92400E" },
  in_progress:         { label: "IN PROGRESS", bg: "#FEF3C7", color: "#92400E" },
  ready_for_delivery:  { label: "READY",       bg: "#D1FAE5", color: "#065F46" },
  picked_from_vendor:  { label: "TRANSIT",     bg: "#EDE9FE", color: "#5B21B6" },
  out_for_delivery:    { label: "DELIVERY",    bg: "#FEE2E2", color: "#991B1B" },
  delivered:           { label: "DELIVERED",   bg: "#D1FAE5", color: "#065F46" },
  cancelled:           { label: "CANCELLED",   bg: "#F1F5F9", color: "#64748B" },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] ?? { label: status.toUpperCase(), bg: "#F1F5F9", color: "#64748B" };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, background: s.bg, color: s.color, padding: "3px 8px", borderRadius: 99, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

function initials(name) {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ── Quick action button ───────────────────────────────────────
function QuickBtn({ label, icon }) {
  return (
    <button style={{
      width: "100%", display: "flex", alignItems: "center", gap: 12,
      padding: "14px 16px", borderRadius: 12, border: "none",
      background: "#0F172A", cursor: "pointer", textAlign: "left",
    }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color: "white" }}>{label}</span>
    </button>
  );
}

export default function AdminDashboard() {
  const { orders } = useOrders();
  const navigate   = useNavigate();

  const [stats, setStats] = useState({ totalToday: 0, ongoing: 0, completedToday: 0, revenueToday: 0 });

  useEffect(() => {
    api.get("/dashboard-stats").then(({ data }) => {
      const s = data.stats || {};
      setStats({
        totalToday:     s.today_orders     ?? 0,
        ongoing:        s.ongoing_orders   ?? 0,
        completedToday: s.today_delivered  ?? 0,
        revenueToday:   s.today_revenue    ?? 0,
      });
    }).catch(() => {
      setStats({
        totalToday:     orders.filter(o => { const d = new Date(o.created_at); const t = new Date(); return d.toDateString() === t.toDateString(); }).length,
        ongoing:        orders.filter(o => !["delivered","cancelled"].includes(o.status)).length,
        completedToday: orders.filter(o => o.status === "delivered").length,
        revenueToday:   orders.filter(o => o.status === "delivered").reduce((s,o) => s + (parseFloat(o.total) || 0), 0),
      });
    });
  }, [orders]);

  const liveOrders = orders.slice(0, 6);

  return (
    <Layout>
      <div style={{ background: BG, minHeight: "100vh", padding: "32px 28px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#0F172A", margin: "0 0 5px" }}>Dashboard Overview</h1>
            <p style={{ fontSize: 13.5, color: "#94A3B8", margin: 0 }}>Welcome back. Here&apos;s what&apos;s happening today.</p>
          </div>
          <button
            onClick={() => navigate("/admin/orders")}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "11px 20px", borderRadius: 12, border: "none",
              background: "#B91C1C", color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            New Order
          </button>
        </div>

        {/* ── Stats row ── */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <StatCard
            label="Total Orders Today"
            value={stats.totalToday}
            sub="orders placed today"
            iconBg="#FEE2E2"
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="#B91C1C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.95-1.57L23 6H6" /></svg>}
          />
          <StatCard
            label="Ongoing Orders"
            value={stats.ongoing}
            sub="active now"
            iconBg="#FEF3C7"
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
          />
          <StatCard
            label="Completed Today"
            value={stats.completedToday}
            sub="delivered today"
            iconBg="#D1FAE5"
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
          />
          <StatCard
            label="Revenue Today"
            value={`₹${Math.round(stats.revenueToday).toLocaleString()}`}
            sub="from delivered orders"
            iconBg="#EDE9FE"
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></svg>}
          />
        </div>

        {/* ── Live Orders + Quick Actions ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 20, alignItems: "start" }}>

          {/* Live Orders table */}
          <div style={{ background: "white", borderRadius: 18, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid #F4F4F8" }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", margin: 0 }}>Live Orders</h2>
              <button onClick={() => navigate("/admin/orders")} style={{ fontSize: 13, fontWeight: 700, color: "#B91C1C", background: "none", border: "none", cursor: "pointer" }}>
                View All Orders
              </button>
            </div>

            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 130px 60px 120px 100px 80px", gap: 0, padding: "10px 22px", background: "#F8F9FB", borderBottom: "1px solid #F4F4F8" }}>
              {["ORDER ID", "CUSTOMER", "STATUS", "ITEMS", "TIMING", "STAFF", "ACTION"].map(h => (
                <span key={h} style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.06em" }}>{h}</span>
              ))}
            </div>

            {/* Rows */}
            {liveOrders.length === 0 ? (
              <div style={{ padding: "32px 22px", textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "#94A3B8", margin: 0 }}>No orders yet today</p>
              </div>
            ) : liveOrders.map((order, idx) => {
              const ini = initials(order.customerName || order.customer_name || "");
              const displayId = order.order_code || `#${order.id}`;
              const itemCount = (() => {
                const arr = order.rawItems || [];
                const n = arr.reduce((s, i) => s + (i.quantity || 1), 0);
                return n || "—";
              })();
              return (
                <div
                  key={order.id}
                  style={{
                    display: "grid", gridTemplateColumns: "110px 1fr 130px 60px 120px 100px 80px",
                    gap: 0, padding: "14px 22px", alignItems: "center",
                    borderBottom: idx < liveOrders.length - 1 ? "1px solid #F8F9FB" : "none",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#FAFAFA"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#B91C1C" }}>{displayId}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 99, background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: "#B91C1C" }}>{ini}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{order.customerName || order.customer_name || "Customer"}</span>
                  </div>
                  <div><StatusBadge status={order.status} /></div>
                  <span style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>{itemCount}</span>
                  <div>
                    <p style={{ fontSize: 11, color: "#94A3B8", margin: "0 0 2px" }}>{formatDate(order.pickup_date)}</p>
                    <p style={{ fontSize: 11, color: "#94A3B8", margin: 0 }}>{order.time || "—"}</p>
                  </div>
                  <span style={{ fontSize: 12, color: "#64748B", fontWeight: 500 }}>{order.vendor_name || order.vendorName || "Unassigned"}</span>
                  <button
                    onClick={() => navigate("/admin/orders")}
                    style={{ fontSize: 11.5, fontWeight: 700, color: "#B91C1C", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    View Detail
                  </button>
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div style={{ background: "white", borderRadius: 18, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", padding: "18px 16px" }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: "#0F172A", margin: "0 0 14px" }}>Quick Actions</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <QuickBtn
                label="Assign Pickup"
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3" /><rect x="9" y="11" width="14" height="10" rx="2" /><circle cx="12" cy="21" r="1" /><circle cx="20" cy="21" r="1" /></svg>}
              />
              <QuickBtn
                label="Inventory Check"
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6M9 16h4" /></svg>}
              />
              <QuickBtn
                label="View Reports"
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>}
              />
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
