import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/shared/Layout";
import { useAuth } from "../../context/AuthContext";
import { useOrders } from "../../context/OrderContext";
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
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 10px 28px rgba(0,0,0,0.09)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)"; }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {label}
        </span>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: bg, color: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
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

const ACTIVE_STATUSES = new Set(["delivery_assigned", "picked_up", "at_vendor", "ready_for_delivery", "out_for_delivery"]);

function formatDt(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function DeliveryDashboard() {
  const { user } = useAuth();
  const { pickupJobs, loading, loadData } = useOrders();
  const navigate = useNavigate();

  const [completedOrders, setCompletedOrders] = useState([]);
  const [totalEarnings, setTotalEarnings]     = useState(0);
  const [completedLoading, setCompletedLoading] = useState(true);
  const [myRating, setMyRating] = useState(null);
  const { isMobile, isTablet } = useWindowSize();

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    api.get("/delivery/completed-orders")
      .then(({ data }) => {
        setCompletedOrders(data.orders || []);
        setTotalEarnings(data.totalRevenue || 0);
      })
      .catch(() => {})
      .finally(() => setCompletedLoading(false));
  }, []);

  useEffect(() => {
    api.get("/delivery/my-rating")
      .then(({ data }) => setMyRating(data))
      .catch(() => {});
  }, []);

  const newAssignments = pickupJobs.filter(j => j.status === "vendor_accepted");
  const activeJobs     = pickupJobs.filter(j => ACTIVE_STATUSES.has(j.status));

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const stats = [
    {
      label: "New Assignments", value: newAssignments.length, sub: "Awaiting your acceptance",
      accent: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 20, height: 20 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
    {
      label: "Active Deliveries", value: activeJobs.length, sub: "In progress right now",
      accent: "#f59e0b", bg: "#fffbeb", border: "#fde68a",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 20, height: 20 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
        </svg>
      ),
    },
    {
      label: "Completed", value: completedLoading ? "—" : completedOrders.length, sub: "All-time delivered",
      accent: "#10b981", bg: "#f0fdf4", border: "#bbf7d0",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 20, height: 20 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Total Earnings", value: completedLoading ? "—" : `₹${totalEarnings.toFixed(0)}`, sub: "Sum of delivered orders",
      accent: "#DC2626", bg: "#FEF2F2", border: "#FECACA",
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

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ fontSize: 12.5, color: "#6b7280", fontWeight: 500, margin: "0 0 5px" }}>{today}</p>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 30, fontWeight: 800, color: "#111827", margin: 0, lineHeight: 1.15 }}>
              {greeting}, {user?.name}
            </h1>
            <p style={{ fontSize: 14, color: "#9ca3af", margin: "7px 0 0", fontWeight: 400 }}>
              Manage your delivery assignments and pickups.
            </p>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#f0fdf4", border: "1px solid #bbf7d0",
            borderRadius: 10, padding: "9px 16px", flexShrink: 0,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 0 3px rgba(34,197,94,0.2)" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#16a34a" }}>On Duty</span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: isMobile ? 10 : 16 }}>
          {stats.map(s => <StatCard key={s.label} {...s} />)}
        </div>

        {/* New Assignments alert */}
        {newAssignments.length > 0 && (
          <div style={{
            background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 16,
            padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 13, background: "#3b82f6",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ width: 22, height: 22 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
              </div>
              <div>
                <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 800, color: "#1e40af", margin: 0 }}>
                  {newAssignments.length} New Order{newAssignments.length > 1 ? "s" : ""} Assigned
                </p>
                <p style={{ fontSize: 13, color: "#3b82f6", margin: "3px 0 0" }}>
                  Tap below to view and accept your assignments
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/delivery/pickups")}
              style={{
                padding: "10px 22px", border: "none", borderRadius: 10, cursor: "pointer",
                background: "#3b82f6", color: "#fff", fontSize: 13, fontWeight: 700,
                transition: "opacity 0.15s", flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
            >
              View Pickups
            </button>
          </div>
        )}

        {/* Active orders summary */}
        {activeJobs.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>
                Active Orders
              </h2>
              <button
                onClick={() => navigate("/delivery/active")}
                style={{
                  padding: "7px 16px", border: "1px solid #e5e7eb", borderRadius: 9, cursor: "pointer",
                  background: "#fff", color: "#374151", fontSize: 12.5, fontWeight: 600,
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = "#f9fafb"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#fff"; }}
              >
                Manage All →
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {activeJobs.slice(0, 3).map(job => (
                <div key={job.id} style={{
                  background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb",
                  padding: "14px 18px", display: "flex", alignItems: "center", gap: 14,
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12, background: "#f0fdf4",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    fontSize: 16, fontWeight: 800, color: "#10b981",
                  }}>
                    {job.customer?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 700, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {job.order_code || `#${job.id}`} — {job.customer}
                    </p>
                    <p style={{ fontSize: 12, color: "#9ca3af", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {job.items}
                    </p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#374151", background: "#f3f4f6", borderRadius: 7, padding: "3px 10px", flexShrink: 0 }}>
                    {job.status?.replace(/_/g, " ")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {myRating !== null && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, background: "#fef9c3",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0,
              }}>⭐</div>
              <div>
                <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 700, color: "#111827", margin: 0 }}>
                  My Ratings
                </h2>
                <p style={{ fontSize: 13, color: "#9ca3af", margin: "2px 0 0" }}>
                  {myRating.total_ratings} review{myRating.total_ratings !== 1 ? "s" : ""} from customers
                </p>
              </div>
              <div style={{
                marginLeft: "auto",
                background: "#fef9c3", border: "1px solid #fde047",
                borderRadius: 12, padding: "10px 20px", textAlign: "center", flexShrink: 0,
              }}>
                <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 800, color: "#854d0e", margin: 0, lineHeight: 1 }}>
                  {myRating.avg_rating}
                </p>
                <div style={{ display: "flex", justifyContent: "center", gap: 2, margin: "4px 0 2px" }}>
                  {[1,2,3,4,5].map(s => (
                    <span key={s} style={{ fontSize: 14, color: parseFloat(myRating.avg_rating) >= s ? "#f59e0b" : "#d1d5db" }}>★</span>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: "#92400e", margin: 0, fontWeight: 600 }}>Average</p>
              </div>
            </div>

            {myRating.reviews && myRating.reviews.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {myRating.reviews.map((rv, idx) => (
                  <div key={idx} style={{
                    background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb",
                    padding: "16px 20px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 10, background: "#f0fdf4",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 14, fontWeight: 800, color: "#10b981", flexShrink: 0,
                        }}>
                          {rv.customer_name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>{rv.customer_name}</span>
                      </div>
                      <div style={{ display: "flex", gap: 2 }}>
                        {[1,2,3,4,5].map(s => (
                          <span key={s} style={{ fontSize: 14, color: rv.delivery_rating >= s ? "#f59e0b" : "#d1d5db" }}>★</span>
                        ))}
                      </div>
                    </div>
                    {rv.delivery_review && (
                      <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 6px", lineHeight: 1.5 }}>
                        "{rv.delivery_review}"
                      </p>
                    )}
                    <p style={{ fontSize: 11.5, color: "#9ca3af", margin: 0, fontWeight: 500 }}>
                      {new Date(rv.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                background: "#f9fafb", border: "1px dashed #e5e7eb", borderRadius: 14,
                padding: "30px 24px", textAlign: "center",
              }}>
                <p style={{ fontSize: 14, color: "#9ca3af", margin: 0 }}>No reviews yet. Complete deliveries to receive ratings.</p>
              </div>
            )}
          </div>
        )}

        {!loading && pickupJobs.length === 0 && completedOrders.length === 0 && (
          <div style={{
            background: "#fff", border: "2px dashed #e5e7eb", borderRadius: 16,
            padding: "60px 24px", textAlign: "center",
          }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#374151", margin: "0 0 6px" }}>No orders assigned yet</p>
            <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>New orders will appear here automatically when assigned.</p>
          </div>
        )}

        {/* Completed Orders */}
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
                background: "#f0fdf4", border: "1px solid #bbf7d0",
                borderRadius: 10, padding: "8px 16px",
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#16a34a" }}>
                  Total: ₹{totalEarnings.toFixed(0)}
                </span>
              </div>
            </div>

            <div className="si-table-wrap" style={{
              background: "#fff", borderRadius: 18, border: "1px solid #e5e7eb",
              boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
            }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                    {["Order ID", "Customer", "Delivery Address", "Amount", "Delivered On"].map((h, i) => (
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
                  {completedOrders.map((o, idx) => (
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
                      <td style={{ padding: "14px 20px" }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: 0 }}>{o.customer_name}</p>
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: 12.5, color: "#6b7280", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {o.customer_address || "—"}
                      </td>
                      <td style={{ padding: "14px 20px", textAlign: "right" }}>
                        <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 800, color: "#10b981" }}>
                          ₹{parseFloat(o.total || 0).toFixed(0)}
                        </span>
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: 12.5, color: "#9ca3af", fontWeight: 500, whiteSpace: "nowrap" }}>
                        {formatDt(o.delivered_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
