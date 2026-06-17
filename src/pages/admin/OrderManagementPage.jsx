import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../../components/shared/Layout";
import { useOrders } from "../../context/OrderContext";
import { useWindowSize } from "../../hooks/useWindowSize";

const BG = "#F5F5F8";
const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  { key: "all",              label: "All Orders"      },
  { key: "ironing",         label: "Ironing"          },
  { key: "out_for_delivery",label: "Out for Delivery"  },
  { key: "delivered",       label: "Delivered"         },
];

const STATUS_STYLES = {
  pending:             { label: "PENDING",      bg: "#FEF3C7", color: "#92400E" },
  vendor_accepted:     { label: "CONFIRMED",    bg: "#DBEAFE", color: "#1E40AF" },
  delivery_assigned:   { label: "ASSIGNED",     bg: "#EDE9FE", color: "#5B21B6" },
  picked_up:           { label: "PICKUP",       bg: "#DBEAFE", color: "#1E40AF" },
  at_vendor:           { label: "AT SHOP",      bg: "#FEF3C7", color: "#92400E" },
  ironing_in_progress: { label: "IN PROGRESS",  bg: "#FEF3C7", color: "#92400E" },
  in_progress:         { label: "IN PROGRESS",  bg: "#FEF3C7", color: "#92400E" },
  ready_for_delivery:  { label: "READY",        bg: "#D1FAE5", color: "#065F46" },
  picked_from_vendor:  { label: "TRANSIT",      bg: "#EDE9FE", color: "#5B21B6" },
  out_for_delivery:    { label: "OUT DELIVERY", bg: "#FEE2E2", color: "#991B1B" },
  delivered:           { label: "DELIVERED",    bg: "#D1FAE5", color: "#065F46" },
  cancelled:           { label: "CANCELLED",    bg: "#F1F5F9", color: "#64748B" },
};

function StatusBadge({ status }) {
  const s = STATUS_STYLES[status] ?? { label: status?.toUpperCase() ?? "—", bg: "#F1F5F9", color: "#64748B" };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, background: s.bg, color: s.color, padding: "3px 9px", borderRadius: 99, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

function initials(name) {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}


function formatDate(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function OrderManagementPage() {
  const { orders } = useOrders();
  const navigate   = useNavigate();
  const { isMobile } = useWindowSize();

  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage]                 = useState(1);
  const [search, setSearch]             = useState("");

  const matchesFilter = (o) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "ironing") return ["ironing_in_progress", "in_progress", "at_vendor"].includes(o.status);
    if (activeFilter === "out_for_delivery") return ["out_for_delivery", "picked_from_vendor"].includes(o.status);
    return o.status === activeFilter;
  };

  const matchesSearch = (o) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const id = (o.order_code || String(o.id)).toLowerCase();
    const name = (o.customerName || o.customer_name || "").toLowerCase();
    return id.includes(q) || name.includes(q);
  };

  const filtered   = orders.filter(o => matchesFilter(o) && matchesSearch(o));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeDeliveries = orders.filter(o => ["out_for_delivery", "picked_from_vendor", "delivery_assigned"].includes(o.status)).length;

  const handleFilterChange = (key) => { setActiveFilter(key); setPage(1); };

  return (
    <Layout>
      <div style={{ background: BG, minHeight: "100vh", padding: isMobile ? "4px 0" : "32px 28px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, color: "#0F172A", margin: "0 0 4px" }}>Orders Management</h1>
            <p style={{ fontSize: 13, color: "#94A3B8", margin: 0 }}>Managing {orders.length.toLocaleString()} active logistics and laundry cycles.</p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 10, border: "1.5px solid #E2E8F0", background: "white", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              Export Report
            </button>
            <button
              onClick={() => navigate("/admin/dashboard")}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 10, border: "none", background: "#B91C1C", fontSize: 13, fontWeight: 700, color: "white", cursor: "pointer" }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              Dashboard
            </button>
          </div>
        </div>

        {/* ── Filters card ── */}
        <div style={{ background: "white", borderRadius: 16, padding: "16px 20px", marginBottom: 20, boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 10px" }}>Order Status</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {STATUS_FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => handleFilterChange(f.key)}
                  style={{
                    padding: "7px 16px", borderRadius: 99, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    border: activeFilter === f.key ? "2px solid #B91C1C" : "1.5px solid #E2E8F0",
                    background: activeFilter === f.key ? "#FEF2F2" : "white",
                    color: activeFilter === f.key ? "#B91C1C" : "#374151",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ position: "relative" }}>
                <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search orders…"
                  style={{ padding: "8px 12px 8px 32px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, color: "#374151", outline: "none", width: isMobile ? "100%" : 200 }}
                />
              </div>
              <button style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10, border: "1.5px solid #E2E8F0", background: "white", fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" /></svg>
                Advanced Filters
              </button>
            </div>
          </div>
        </div>

        {/* ── Active deliveries dark card ── */}
        <div style={{
          background: "#0F172A", borderRadius: 16, padding: "22px 28px", marginBottom: 20,
          display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative", overflow: "hidden",
        }}>
          <div>
            <p style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 6px" }}>Active Deliveries</p>
            <p style={{ fontSize: 40, fontWeight: 900, color: "white", margin: "0 0 5px", lineHeight: 1 }}>{activeDeliveries}</p>
            <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", fontWeight: 600, margin: 0 }}>currently in transit</p>
          </div>
          <div style={{ opacity: 0.08 }}>
            <svg viewBox="0 0 24 24" fill="white" width="90" height="90">
              <path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3M9 21H23M9 17h14M15 13h8" />
            </svg>
          </div>
        </div>

        {/* ── Orders table ── */}
        <div style={{ background: "white", borderRadius: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", overflow: "hidden" }}>

          {/* Scrollable table */}
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <div style={{ minWidth: 520 }}>
              {/* Table header */}
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr 100px", padding: "12px 20px", background: "#0F172A" }}>
                {["ORDER ID", "CUSTOMER", "DETAILS", "STATUS"].map(h => (
                  <span key={h} style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em" }}>{h}</span>
                ))}
              </div>

              {/* Rows */}
              {paginated.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <p style={{ fontSize: 14, color: "#94A3B8", margin: 0 }}>No orders match the current filter</p>
                </div>
              ) : paginated.map((order, idx) => {
                const displayId  = order.order_code || `#${order.id}`;
                const name       = order.customerName || order.customer_name || "Customer";
                const phone      = order.customerPhone || order.phone || "";
                const itemCount  = (order.rawItems || []).reduce((s, i) => s + (i.quantity || 1), 0);
                const address    = order.address || order.apartment || "—";

                return (
                  <div
                    key={order.id}
                    style={{
                      display: "grid", gridTemplateColumns: "120px 1fr 1fr 100px",
                      padding: "16px 20px", alignItems: "center",
                      borderBottom: idx < paginated.length - 1 ? "1px solid #F8F9FB" : "none",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#FAFAFA"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <span style={{ fontSize: 13.5, fontWeight: 800, color: "#B91C1C" }}>{displayId}</span>

                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 99, background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#B91C1C" }}>{initials(name)}</span>
                      </div>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", margin: 0 }}>{name}</p>
                        {phone && <p style={{ fontSize: 11.5, color: "#94A3B8", margin: "1px 0 0" }}>{phone}</p>}
                      </div>
                    </div>

                    <div>
                      <p style={{ fontSize: 13, color: "#374151", margin: "0 0 2px" }}>
                        {itemCount > 0 ? `${itemCount} Items` : "—"}{order.created_at ? ` · ${formatDate(order.created_at)}` : ""}
                      </p>
                      <p style={{ fontSize: 11.5, color: "#94A3B8", margin: 0 }}>{address}</p>
                    </div>

                    <StatusBadge status={order.status} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderTop: "1px solid #F4F4F8" }}>
              <p style={{ fontSize: 12, color: "#94A3B8", margin: 0 }}>
                Showing {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()} orders
              </p>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", background: "white", fontSize: 12, fontWeight: 600, color: page === 1 ? "#C8D0DC" : "#374151", cursor: page === 1 ? "default" : "pointer" }}
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pg = i + 1;
                  return (
                    <button
                      key={pg}
                      onClick={() => setPage(pg)}
                      style={{
                        width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer",
                        background: page === pg ? "#B91C1C" : "white",
                        color: page === pg ? "white" : "#374151",
                        fontSize: 12, fontWeight: 700,
                        boxShadow: page === pg ? "none" : "0 1px 3px rgba(0,0,0,0.08)",
                      }}
                    >
                      {pg}
                    </button>
                  );
                })}
                {totalPages > 5 && <span style={{ fontSize: 12, color: "#94A3B8" }}>… {totalPages}</span>}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{ padding: "6px 12px", borderRadius: 8, border: "1.5px solid #E2E8F0", background: "white", fontSize: 12, fontWeight: 600, color: page === totalPages ? "#C8D0DC" : "#374151", cursor: page === totalPages ? "default" : "pointer" }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}
