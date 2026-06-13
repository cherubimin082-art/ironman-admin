import { useEffect, useState } from "react";
import Layout from "../../components/shared/Layout";
import OrderCard from "../../components/vendor/OrderCard";
import { useOrders } from "../../context/OrderContext";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import { useWindowSize } from "../../hooks/useWindowSize";

function StatCard({ label, value, sub, accent, bg, border, icon }) {
  return (
    <div
      style={{
        background: "#fff", borderRadius: 16, border: `1px solid ${border}`,
        padding: "22px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        transition: "transform 0.18s, box-shadow 0.18s", cursor: "default",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 10px 28px rgba(0,0,0,0.09)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)";
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {label}
        </span>
        <div style={{
          width: 38, height: 38, borderRadius: 11,
          background: bg, color: accent,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {icon}
        </div>
      </div>
      <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 34, fontWeight: 800, color: "#111827", margin: "0 0 5px", lineHeight: 1 }}>
        {value}
      </p>
      <p style={{ fontSize: 12.5, color: "#9ca3af", margin: 0, fontWeight: 500 }}>{sub}</p>
    </div>
  );
}

function formatDt(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function VendorDashboard() {
  const { user } = useAuth();
  const { orders, vendorAction } = useOrders();

  const [completedOrders, setCompletedOrders] = useState([]);
  const [totalRevenue, setTotalRevenue]       = useState(0);
  const [completedLoading, setCompletedLoading] = useState(true);

  useEffect(() => {
    api.get("/vendor/completed-orders")
      .then(({ data }) => {
        setCompletedOrders(data.orders || []);
        setTotalRevenue(data.totalRevenue || 0);
      })
      .catch(() => {})
      .finally(() => setCompletedLoading(false));
  }, []);

  const { isMobile, isTablet } = useWindowSize();
  const pending    = orders.filter(o => o.status === "pending").length;
  const inProgress = orders.filter(o => o.status === "in_progress").length;
  const ready      = orders.filter(o => o.status === "vendor_accepted").length;
  const active     = orders.filter(o => !["delivered", "cancelled"].includes(o.status));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const stats = [
    {
      label: "Pending", value: pending, sub: "Awaiting processing",
      accent: "#f59e0b", bg: "#fffbeb", border: "#fde68a",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 20, height: 20 }}>
          <circle cx="12" cy="12" r="10" />
          <path strokeLinecap="round" d="M12 6v6l3.5 2" />
        </svg>
      ),
    },
    {
      label: "In Progress", value: inProgress, sub: "Currently being ironed",
      accent: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 20, height: 20 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
      ),
    },
    {
      label: "Ready", value: ready, sub: "Awaiting pickup",
      accent: "#10b981", bg: "#f0fdf4", border: "#bbf7d0",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 20, height: 20 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Revenue",
      value: completedLoading ? "—" : `₹${totalRevenue.toFixed(0)}`,
      sub: completedLoading ? "Loading…" : `${completedOrders.length} orders delivered`,
      accent: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 20, height: 20 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <Layout>
      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

        {/* Page Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ fontSize: 12.5, color: "#6b7280", fontWeight: 500, margin: "0 0 5px" }}>{today}</p>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 30, fontWeight: 800, color: "#111827", margin: 0, lineHeight: 1.15 }}>
              {greeting}, {user?.name}
            </h1>
            <p style={{ fontSize: 14, color: "#9ca3af", margin: "7px 0 0", fontWeight: 400 }}>
              Here's your shop performance overview for today.
            </p>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#f0fdf4", border: "1px solid #bbf7d0",
            borderRadius: 10, padding: "9px 16px", flexShrink: 0,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 0 3px rgba(34,197,94,0.2)" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#16a34a" }}>Shop Active</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: isMobile ? 10 : 16 }}>
          {stats.map(s => <StatCard key={s.label} {...s} />)}
        </div>

        {/* Active Orders Section */}
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>
                Active Orders
              </h2>
              <p style={{ fontSize: 13, color: "#9ca3af", margin: "3px 0 0" }}>
                {active.length} order{active.length !== 1 ? "s" : ""} in queue
              </p>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              background: active.length > 0 ? "#eff6ff" : "#f9fafb",
              border: `1px solid ${active.length > 0 ? "#bfdbfe" : "#e5e7eb"}`,
              borderRadius: 8, padding: "5px 12px",
            }}>
              {active.length > 0 && (
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#3b82f6", boxShadow: "0 0 0 2px rgba(59,130,246,0.25)" }} />
              )}
              <span style={{ fontSize: 12, fontWeight: 700, color: active.length > 0 ? "#2563eb" : "#9ca3af" }}>
                Live Queue
              </span>
            </div>
          </div>

          {active.length === 0 ? (
            <div style={{
              background: "#fff", border: "2px dashed #e5e7eb",
              borderRadius: 16, padding: "60px 24px", textAlign: "center",
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16, background: "#f0fdf4",
                display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px",
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="1.8" style={{ width: 26, height: 26 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#374151", margin: "0 0 6px" }}>All caught up!</p>
              <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>New orders assigned to your shop will appear here.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 16 }}>
              {active.map(order => (
                <OrderCard key={order.id} order={order} onStatusChange={vendorAction} />
              ))}
            </div>
          )}
        </div>

        {/* Completed Orders Section */}
        {!completedLoading && completedOrders.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>
                  Completed Orders
                </h2>
                <p style={{ fontSize: 13, color: "#9ca3af", margin: "3px 0 0" }}>
                  {completedOrders.length} order{completedOrders.length !== 1 ? "s" : ""} delivered
                </p>
              </div>
              <div style={{
                background: "#f5f3ff", border: "1px solid #ddd6fe",
                borderRadius: 10, padding: "8px 16px",
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#7c3aed" }}>
                  Total Revenue: ₹{totalRevenue.toFixed(0)}
                </span>
              </div>
            </div>

            <div style={{
              background: "#fff", borderRadius: 18, border: "1px solid #e5e7eb",
              boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
            }}>
            <div className="si-table-wrap">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                    {["Order ID", "Customer", "Items", "Amount", "Completed On"].map((h, i) => (
                      <th key={h} style={{
                        padding: "12px 20px", fontSize: 11, fontWeight: 700, color: "#9ca3af",
                        textTransform: "uppercase", letterSpacing: "0.07em",
                        textAlign: i === 3 ? "right" : "left",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {completedOrders.map((o, idx) => {
                    let itemsArr = [];
                    try { itemsArr = typeof o.items === "string" ? JSON.parse(o.items) : (Array.isArray(o.items) ? o.items : []); } catch {}
                    const itemsText = itemsArr.filter(i => i?.garment_name).map(i => `${i.quantity}× ${i.garment_name}`).join(", ") || "—";
                    return (
                      <tr
                        key={o.id}
                        style={{
                          borderBottom: idx < completedOrders.length - 1 ? "1px solid #f9fafb" : "none",
                          transition: "background 0.12s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={{ padding: "14px 20px", fontSize: 13, fontWeight: 700, color: "#111827" }}>
                          {o.order_code || `#${o.id}`}
                        </td>
                        <td style={{ padding: "14px 20px", fontSize: 13, fontWeight: 600, color: "#374151" }}>
                          {o.customer_name}
                        </td>
                        <td style={{ padding: "14px 20px", fontSize: 12.5, color: "#6b7280", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {itemsText}
                        </td>
                        <td style={{ padding: "14px 20px", textAlign: "right" }}>
                          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 800, color: "#8b5cf6" }}>
                            ₹{parseFloat(o.total || 0).toFixed(0)}
                          </span>
                        </td>
                        <td style={{ padding: "14px 20px", fontSize: 12.5, color: "#9ca3af", fontWeight: 500, whiteSpace: "nowrap" }}>
                          {formatDt(o.updated_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>{/* si-table-wrap */}
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
