import { useState, useEffect } from "react";
import Layout from "../../components/shared/Layout";
import api from "../../services/api";
import { useWindowSize } from "../../hooks/useWindowSize";

function formatDt(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function CompletedOrdersPage() {
  const [orders, setOrders]   = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const { isMobile } = useWindowSize();

  useEffect(() => {
    api.get("/delivery/completed-orders")
      .then(({ data }) => {
        setOrders(data.orders || []);
        setTotal(data.totalRevenue || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = orders.filter(o =>
    !search ||
    (o.order_code || `#${o.id}`).toLowerCase().includes(search.toLowerCase()) ||
    (o.customer_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: isMobile ? 22 : 28, fontWeight: 800, color: "#111827", margin: 0 }}>
              Completed Orders
            </h1>
            <p style={{ fontSize: 14, color: "#9ca3af", margin: "6px 0 0", fontWeight: 400 }}>
              All orders you have delivered
            </p>
          </div>
          {!loading && (
            <div style={{
              background: "#f0fdf4", border: "1px solid #bbf7d0",
              borderRadius: 12, padding: "10px 20px", textAlign: "center",
              width: isMobile ? "100%" : "auto",
            }}>
              <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 800, color: "#16a34a", margin: 0 }}>
                ₹{total.toFixed(0)}
              </p>
              <p style={{ fontSize: 11, color: "#4ade80", margin: "2px 0 0", fontWeight: 600 }}>Total Earned</p>
            </div>
          )}
        </div>

        {/* Search */}
        <div style={{ position: "relative", maxWidth: isMobile ? "100%" : 340 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            width: 16, height: 16, pointerEvents: "none",
          }}>
            <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search order or customer…"
            style={{
              width: "100%", boxSizing: "border-box",
              padding: "9px 12px 9px 36px",
              border: "1px solid #e5e7eb", borderRadius: 10,
              fontSize: 13, outline: "none", background: "#fff",
              color: "#374151",
            }}
          />
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af", fontSize: 14 }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{
            background: "#fff", border: "2px dashed #e5e7eb", borderRadius: 16,
            padding: "60px 24px", textAlign: "center",
          }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#374151", margin: "0 0 6px" }}>
              {search ? "No orders match your search" : "No completed orders yet"}
            </p>
            <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
              {search ? "Try a different keyword." : "Delivered orders will appear here."}
            </p>
          </div>
        ) : isMobile ? (
          /* ── Mobile: card list ── */
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              {filtered.length} order{filtered.length !== 1 ? "s" : ""}
            </span>
            {filtered.map(o => (
              <div key={o.id} style={{
                background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)", padding: "14px 16px",
                display: "flex", flexDirection: "column", gap: 8,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 14, fontWeight: 800, color: "#111827" }}>
                    {o.order_code || `#${o.id}`}
                  </span>
                  <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 800, color: "#10b981" }}>
                    ₹{parseFloat(o.total || 0).toFixed(0)}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: "#f0fdf4", color: "#16a34a",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 800,
                  }}>
                    {o.customer_name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{o.customer_name || "—"}</span>
                </div>
                {o.customer_address && (
                  <p style={{ fontSize: 12, color: "#6b7280", margin: 0, lineHeight: 1.4 }}>{o.customer_address}</p>
                )}
                <p style={{ fontSize: 11.5, color: "#9ca3af", margin: 0, fontWeight: 500 }}>
                  {formatDt(o.delivered_at)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          /* ── Desktop: table ── */
          <div style={{
            background: "#fff", borderRadius: 18, border: "1px solid #e5e7eb",
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)", overflow: "hidden",
          }}>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {filtered.length} order{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="si-table-wrap">
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                    {["Order ID", "Customer", "Address", "Amount", "Delivered On"].map((h, i) => (
                      <th key={h} style={{
                        padding: "11px 20px", fontSize: 11, fontWeight: 700, color: "#9ca3af",
                        textTransform: "uppercase", letterSpacing: "0.07em",
                        textAlign: i === 3 ? "right" : "left",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o, idx) => (
                    <tr
                      key={o.id}
                      style={{
                        borderBottom: idx < filtered.length - 1 ? "1px solid #f9fafb" : "none",
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "14px 20px" }}>
                        <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13, fontWeight: 700, color: "#111827" }}>
                          {o.order_code || `#${o.id}`}
                        </span>
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: 13, fontWeight: 600, color: "#374151" }}>
                        {o.customer_name}
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: 12.5, color: "#6b7280", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
