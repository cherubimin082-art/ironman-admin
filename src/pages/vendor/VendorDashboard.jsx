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

function StarDisplay({ value }) {
  const r = parseFloat(value) || 0;
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize: 16, color: i <= Math.round(r) ? "#f59e0b" : "#e5e7eb" }}>★</span>
      ))}
      <span style={{ fontSize: 13, color: "#6b7280", marginLeft: 6, fontWeight: 700 }}>{r.toFixed(1)}</span>
    </span>
  );
}

export default function VendorDashboard() {
  const { user } = useAuth();
  const { orders, vendorAction } = useOrders();

  const [completedOrders, setCompletedOrders] = useState([]);
  const [totalRevenue, setTotalRevenue]       = useState(0);
  const [completedLoading, setCompletedLoading] = useState(true);
  const [myRating, setMyRating]               = useState(null);
  const [bagStats, setBagStats]               = useState(null);
  const [bagToggling, setBagToggling]         = useState(false);

  useEffect(() => {
    api.get("/vendor/completed-orders")
      .then(({ data }) => {
        setCompletedOrders(data.orders || []);
        setTotalRevenue(data.totalRevenue || 0);
      })
      .catch(() => {})
      .finally(() => setCompletedLoading(false));

    api.get("/vendor/my-rating")
      .then(({ data }) => setMyRating(data))
      .catch(() => {});

    api.get("/vendor/bag-stats")
      .then(({ data }) => setBagStats(data.stats))
      .catch(() => {});
  }, []);

  const toggleBagStatus = async () => {
    if (!bagStats || bagToggling) return;
    const next = bagStats.bags_available ? 0 : 1;
    setBagToggling(true);
    try {
      await api.put("/vendor/bags-available", { bags_available: next });
      setBagStats(s => ({ ...s, bags_available: next }));
    } catch (_) {}
    finally { setBagToggling(false); }
  };

  const { isMobile, isTablet } = useWindowSize();
  const pending    = orders.filter(o => o.status === "pending").length;
  const inProgress = orders.filter(o => ["ironing_in_progress", "in_progress"].includes(o.status)).length;
  const ready      = orders.filter(o => o.status === "vendor_accepted").length;
  const active     = orders.filter(o => !["delivered", "cancelled"].includes(o.status));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const bagsAvail = bagStats?.available ?? null;
  const bagsOk    = bagsAvail === null ? null : bagsAvail > 0;

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
      accent: "#DC2626", bg: "#FEF2F2", border: "#FECACA",
      icon: <span style={{ fontSize: 20, fontWeight: 900, lineHeight: 1 }}>₹</span>,
    },
    {
      label: "Bags Available",
      value: bagsAvail === null ? "—" : bagsAvail,
      sub: bagStats ? `${bagStats.in_use} in use · ${bagStats.total} total` : "Loading…",
      accent: bagsOk === null ? "#9ca3af" : bagsOk ? "#10b981" : "#dc2626",
      bg:     bagsOk === null ? "#f9fafb"  : bagsOk ? "#f0fdf4"  : "#fef2f2",
      border: bagsOk === null ? "#e5e7eb"  : bagsOk ? "#bbf7d0"  : "#fecaca",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 20, height: 20 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
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
          <div style={{ display: "flex", flexDirection: isMobile ? "row" : "column", gap: 8, alignItems: isMobile ? "stretch" : "flex-end", flexShrink: 0, width: isMobile ? "100%" : "auto", flexWrap: "wrap" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8, flex: isMobile ? 1 : "none",
              background: "#f0fdf4", border: "1px solid #bbf7d0",
              borderRadius: 10, padding: "9px 16px",
            }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 0 3px rgba(34,197,94,0.2)" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "#16a34a" }}>Shop Active</span>
            </div>

            {/* Bags availability toggle */}
            <button
              onClick={toggleBagStatus}
              disabled={bagToggling || !bagStats}
              style={{
                display: "flex", alignItems: "center", gap: 10, flex: isMobile ? 1 : "none",
                padding: "9px 16px", borderRadius: 10, border: "none", cursor: bagToggling ? "wait" : "pointer",
                background: bagStats?.bags_available ? "#f0fdf4" : "#fef2f2",
                border: `1px solid ${bagStats?.bags_available ? "#bbf7d0" : "#fecaca"}`,
                transition: "all 0.2s",
              }}
            >
              {/* toggle pill */}
              <div style={{
                width: 36, height: 20, borderRadius: 99, position: "relative",
                background: bagStats?.bags_available ? "#22c55e" : "#e5e7eb",
                transition: "background 0.2s", flexShrink: 0,
              }}>
                <div style={{
                  position: "absolute", top: 2,
                  left: bagStats?.bags_available ? 18 : 2,
                  width: 16, height: 16, borderRadius: "50%",
                  background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  transition: "left 0.2s",
                }} />
              </div>
              <span style={{
                fontSize: 13, fontWeight: 700,
                color: bagStats?.bags_available ? "#16a34a" : "#dc2626",
              }}>
                {bagToggling ? "Updating…" : bagStats?.bags_available ? "Bags Available" : "No Bags"}
              </span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : isTablet ? "repeat(3, 1fr)" : "repeat(5, 1fr)", gap: isMobile ? 10 : 16 }}>
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

        {/* My Ratings Section */}
        {myRating && parseInt(myRating.total_ratings) > 0 && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 3px" }}>
                My Ratings
              </h2>
              <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
                Based on {myRating.total_ratings} customer review{myRating.total_ratings !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Summary row */}
            <div style={{
              background: "#fff", borderRadius: 18, border: "1px solid #e5e7eb",
              boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
              padding: "24px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: myRating.reviews?.length ? 20 : 0 }}>
                <div style={{
                  width: 70, height: 70, borderRadius: 18, flexShrink: 0,
                  background: "#fffbeb", border: "1px solid #fde68a",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 26, fontWeight: 800, color: "#d97706", lineHeight: 1 }}>
                    {myRating.avg_rating}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    / 5
                  </span>
                </div>
                <div>
                  <StarDisplay value={myRating.avg_rating} />
                  <p style={{ fontSize: 12.5, color: "#6b7280", margin: "6px 0 0", fontWeight: 500 }}>
                    {myRating.total_ratings} rating{myRating.total_ratings !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {/* Recent reviews */}
              {myRating.reviews?.length > 0 && (
                <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                  {myRating.reviews.map((rv, i) => (
                    <div key={i} style={{
                      padding: "14px 16px", borderRadius: 12,
                      background: "#fafafa", border: "1px solid #f3f4f6",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: rv.vendor_review ? 8 : 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                            background: "#FEF2F2", color: "#DC2626",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 13, fontWeight: 800,
                          }}>
                            {rv.customer_name?.[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0 }}>{rv.customer_name}</p>
                            <p style={{ fontSize: 10.5, color: "#9ca3af", margin: 0 }}>
                              {new Date(rv.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          </div>
                        </div>
                        <StarDisplay value={rv.vendor_rating} />
                      </div>
                      {rv.vendor_review && (
                        <p style={{ fontSize: 13, color: "#374151", margin: 0, fontStyle: "italic", lineHeight: 1.5 }}>
                          "{rv.vendor_review}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

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
                background: "#FEF2F2", border: "1px solid #FECACA",
                borderRadius: 10, padding: "8px 16px",
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#B91C1C" }}>
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
                          <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 800, color: "#DC2626" }}>
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
