import { useState, useMemo, useEffect } from "react";
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

const ALL_STATUSES = [
  { value: "",                   label: "Any Status"         },
  { value: "pending",            label: "Pending"            },
  { value: "vendor_accepted",    label: "Confirmed"          },
  { value: "delivery_assigned",  label: "Assigned"           },
  { value: "picked_up",          label: "Picked Up"          },
  { value: "at_vendor",          label: "At Shop"            },
  { value: "ironing_in_progress",label: "Ironing In Progress"},
  { value: "ready_for_delivery", label: "Ready for Delivery" },
  { value: "picked_from_vendor", label: "In Transit"         },
  { value: "out_for_delivery",   label: "Out for Delivery"   },
  { value: "delivered",          label: "Delivered"          },
  { value: "cancelled",          label: "Cancelled"          },
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

const selectStyle = {
  padding: "8px 10px", border: "1.5px solid #E2E8F0", borderRadius: 10,
  fontSize: 13, color: "#374151", background: "white", outline: "none", width: "100%",
};
const labelStyle = { fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 5 };
const inputStyle = { padding: "8px 10px", border: "1.5px solid #E2E8F0", borderRadius: 10, fontSize: 13, color: "#374151", outline: "none", width: "100%", boxSizing: "border-box" };

function exportCSV(rows) {
  const STATUS_LABEL = {
    pending: "Pending", vendor_accepted: "Confirmed", delivery_assigned: "Assigned",
    picked_up: "Picked Up", at_vendor: "At Shop", ironing_in_progress: "Ironing In Progress",
    in_progress: "In Progress", ready_for_delivery: "Ready for Delivery",
    picked_from_vendor: "In Transit", out_for_delivery: "Out for Delivery",
    delivered: "Delivered", cancelled: "Cancelled",
  };
  const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const headers = ["Order ID", "Customer", "Phone", "Apartment", "Status", "Items", "Amount (₹)", "Date", "Iron's Head"];
  const lines = rows.map(o => {
    const itemCount = (o.rawItems || []).reduce((s, i) => s + (i.quantity || 1), 0);
    return [
      o.order_code || o.id,
      o.customerName || o.customer_name || "",
      o.customerPhone || o.phone || "",
      o.address || o.apartment || "",
      STATUS_LABEL[o.status] || o.status || "",
      itemCount,
      o.total_amount ?? o.total ?? "",
      o.created_at ? new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "",
      o.vendor_name || o.vendorName || "",
    ].map(esc).join(",");
  });
  const csv = [headers.map(esc).join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function OrderDetailDrawer({ order, onClose }) {
  if (!order) return null;
  const name      = order.customerName || order.customer_name || "Customer";
  const phone     = order.customerPhone || order.phone || "";
  const items     = order.rawItems || [];
  const displayId = order.order_code || `#${order.id}`;
  const hasPickupLoc   = order.pickup_latitude && order.pickup_longitude;
  const hasDeliveryLoc = order.delivery_latitude && order.delivery_longitude;

  const InfoRow = ({ label, value }) => value ? (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "9px 0", borderBottom: "1px solid #F1F5F9" }}>
      <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600, minWidth: 110 }}>{label}</span>
      <span style={{ fontSize: 13, color: "#0F172A", fontWeight: 700, textAlign: "right", maxWidth: 200 }}>{value}</span>
    </div>
  ) : null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 200 }}
      />
      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0, zIndex: 201,
        width: "min(420px, 95vw)", background: "#fff",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.18)",
        display: "flex", flexDirection: "column",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        animation: "slideIn 0.22s ease",
      }}>
        <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

        {/* Header */}
        <div style={{ padding: "18px 20px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0F172A" }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 3px" }}>Order Details</p>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 800, color: "#fff", margin: 0 }}>{displayId}</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <StatusBadge status={order.status} />
            <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "#fff", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

          {/* Delivery Boy Location — always visible */}
          <div style={{ background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 14, padding: "14px 16px", marginBottom: 18 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#15803D", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px", display: "flex", alignItems: "center", gap: 6 }}>
                <svg viewBox="0 0 24 24" style={{ width: 13, height: 13 }}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" fill="currentColor"/></svg>
                Delivery Boy Locations
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {hasPickupLoc ? (
                  <a href={`https://www.google.com/maps?q=${order.pickup_latitude},${order.pickup_longitude}`} target="_blank" rel="noreferrer" style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                    background: "#fff", borderRadius: 10, border: "1px solid #BBF7D0",
                    textDecoration: "none", color: "#111827",
                  }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg viewBox="0 0 24 24" style={{ width: 16, height: 16 }}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" fill="#16A34A"/></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12.5, fontWeight: 700, color: "#15803D", margin: "0 0 1px" }}>Pickup Location</p>
                      <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>{parseFloat(order.pickup_latitude).toFixed(5)}, {parseFloat(order.pickup_longitude).toFixed(5)}</p>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                  </a>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#fff", borderRadius: 10, border: "1px solid #E5E7EB" }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg viewBox="0 0 24 24" style={{ width: 16, height: 16 }}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" fill="#D1D5DB"/></svg>
                    </div>
                    <div>
                      <p style={{ fontSize: 12.5, fontWeight: 700, color: "#6B7280", margin: "0 0 1px" }}>Pickup Location</p>
                      <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>Not captured yet</p>
                    </div>
                  </div>
                )}
                {hasDeliveryLoc ? (
                  <a href={`https://www.google.com/maps?q=${order.delivery_latitude},${order.delivery_longitude}`} target="_blank" rel="noreferrer" style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                    background: "#fff", borderRadius: 10, border: "1px solid #FECACA",
                    textDecoration: "none", color: "#111827",
                  }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg viewBox="0 0 24 24" style={{ width: 16, height: 16 }}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" fill="#DC2626"/></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 12.5, fontWeight: 700, color: "#B91C1C", margin: "0 0 1px" }}>Delivery Location</p>
                      <p style={{ fontSize: 11, color: "#6B7280", margin: 0 }}>{parseFloat(order.delivery_latitude).toFixed(5)}, {parseFloat(order.delivery_longitude).toFixed(5)}</p>
                    </div>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                  </a>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#fff", borderRadius: 10, border: "1px solid #E5E7EB" }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg viewBox="0 0 24 24" style={{ width: 16, height: 16 }}><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" fill="#D1D5DB"/></svg>
                    </div>
                    <div>
                      <p style={{ fontSize: 12.5, fontWeight: 700, color: "#6B7280", margin: "0 0 1px" }}>Delivery Location</p>
                      <p style={{ fontSize: 11, color: "#9CA3AF", margin: 0 }}>Not captured yet</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

          {/* Order info */}
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Order Info</p>
            <InfoRow label="Customer"   value={name} />
            <InfoRow label="Phone"      value={phone} />
            <InfoRow label="Apartment"  value={order.apartment || order.address} />
            <InfoRow label="Time Slot"  value={order.time_slot} />
            <InfoRow label="Pickup Date" value={order.pickup_date ? formatDate(order.pickup_date) : null} />
            <InfoRow label="Iron's Head" value={order.vendor_name} />
            <InfoRow label="Delivery Boy" value={order.agent_name} />
            <InfoRow label="Bags" value={order.bag_numbers ? order.bag_numbers.split(",").map(n => `#${n.trim()}`).join(", ") : null} />
            <InfoRow label="Placed on"  value={order.created_at ? formatDate(order.created_at) : null} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0" }}>
              <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 600 }}>Total</span>
              <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 800, color: "#0F172A" }}>₹{parseFloat(order.total || order.total_amount || 0).toFixed(0)}</span>
            </div>
          </div>

          {/* Items */}
          {items.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 8px" }}>Items</p>
              <div style={{ background: "#F8FAFC", borderRadius: 10, overflow: "hidden" }}>
                {items.filter(i => i?.garment_name).map((item, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 14px", borderBottom: i < items.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                    <span style={{ fontSize: 13, color: "#374151", fontWeight: 600 }}>{item.garment_name}</span>
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#94A3B8" }}>×{item.quantity || 1}</span>
                      {item.subtotal && <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>₹{parseFloat(item.subtotal).toFixed(0)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function OrderManagementPage() {
  const { orders } = useOrders();
  const navigate   = useNavigate();
  const { isMobile } = useWindowSize();

  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage]                 = useState(1);
  const [search, setSearch]             = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);

  // When orders refresh via socket, push latest data into open drawer
  useEffect(() => {
    if (!selectedOrder) return;
    const updated = orders.find(o => o.id === selectedOrder.id);
    if (updated) setSelectedOrder(updated);
  }, [orders]);

  // Advanced filter state
  const [showAdv, setShowAdv] = useState(false);
  const [advStatus,   setAdvStatus]   = useState("");
  const [advVendor,   setAdvVendor]   = useState("");
  const [advDateFrom, setAdvDateFrom] = useState("");
  const [advDateTo,   setAdvDateTo]   = useState("");
  const [advSort,     setAdvSort]     = useState("newest");

  // Unique Iron's Head list
  const vendorOptions = useMemo(() => {
    const names = [...new Set(orders.map(o => o.vendor_name || o.vendorName).filter(Boolean))].sort();
    return names;
  }, [orders]);

  const advActive = advStatus || advVendor || advDateFrom || advDateTo || advSort !== "newest";

  function resetAdv() {
    setAdvStatus(""); setAdvVendor(""); setAdvDateFrom(""); setAdvDateTo(""); setAdvSort("newest");
    setPage(1);
  }

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

  const matchesAdv = (o) => {
    if (advStatus && o.status !== advStatus) return false;
    if (advVendor && (o.vendor_name || o.vendorName) !== advVendor) return false;
    if (advDateFrom) {
      const d = new Date(o.created_at);
      if (isNaN(d) || d < new Date(advDateFrom)) return false;
    }
    if (advDateTo) {
      const d = new Date(o.created_at);
      const to = new Date(advDateTo);
      to.setHours(23, 59, 59, 999);
      if (isNaN(d) || d > to) return false;
    }
    return true;
  };

  let filtered = orders.filter(o => matchesFilter(o) && matchesSearch(o) && matchesAdv(o));

  if (advSort === "oldest") filtered = [...filtered].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  else filtered = [...filtered].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

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
            <button onClick={() => exportCSV(filtered)} style={{ display: "flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 10, border: "1.5px solid #E2E8F0", background: "white", fontSize: 13, fontWeight: 600, color: "#374151", cursor: "pointer" }}>
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
              <button
                onClick={() => setShowAdv(v => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
                  borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: "pointer",
                  border: showAdv || advActive ? "1.5px solid #B91C1C" : "1.5px solid #E2E8F0",
                  background: showAdv || advActive ? "#FEF2F2" : "white",
                  color: showAdv || advActive ? "#B91C1C" : "#374151",
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="13" height="13"><line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" /></svg>
                Advanced Filters
                {advActive && (
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#B91C1C", marginLeft: 2, flexShrink: 0 }} />
                )}
              </button>
            </div>
          </div>

          {/* ── Advanced Filter Panel ── */}
          {showAdv && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #F1F5F9" }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr 1fr", gap: 14, alignItems: "end" }}>

                {/* Status */}
                <div>
                  <label style={labelStyle}>Status</label>
                  <select value={advStatus} onChange={e => { setAdvStatus(e.target.value); setPage(1); }} style={selectStyle}>
                    {ALL_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>

                {/* Iron's Head */}
                <div>
                  <label style={labelStyle}>Iron&apos;s Head</label>
                  <select value={advVendor} onChange={e => { setAdvVendor(e.target.value); setPage(1); }} style={selectStyle}>
                    <option value="">Any</option>
                    {vendorOptions.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>

                {/* Date From */}
                <div>
                  <label style={labelStyle}>Date From</label>
                  <input type="date" value={advDateFrom} onChange={e => { setAdvDateFrom(e.target.value); setPage(1); }} style={inputStyle} />
                </div>

                {/* Date To */}
                <div>
                  <label style={labelStyle}>Date To</label>
                  <input type="date" value={advDateTo} onChange={e => { setAdvDateTo(e.target.value); setPage(1); }} style={inputStyle} />
                </div>

                {/* Sort + Reset */}
                <div>
                  <label style={labelStyle}>Sort By</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <select value={advSort} onChange={e => { setAdvSort(e.target.value); setPage(1); }} style={{ ...selectStyle, flex: 1 }}>
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                    </select>
                    {advActive && (
                      <button
                        onClick={resetAdv}
                        style={{ padding: "8px 12px", borderRadius: 10, border: "1.5px solid #FECACA", background: "#FEF2F2", color: "#B91C1C", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

              </div>

              {/* Result count */}
              <p style={{ fontSize: 12, color: "#94A3B8", margin: "12px 0 0" }}>
                {filtered.length} order{filtered.length !== 1 ? "s" : ""} match your filters
              </p>
            </div>
          )}
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

          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <div style={{ minWidth: 520 }}>
              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 1fr 120px 36px", padding: "12px 20px", background: "#0F172A" }}>
                {["ORDER ID", "CUSTOMER", "DETAILS", "STATUS", ""].map(h => (
                  <span key={h} style={{ fontSize: 10.5, fontWeight: 700, color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em" }}>{h}</span>
                ))}
              </div>

              {paginated.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <p style={{ fontSize: 14, color: "#94A3B8", margin: 0 }}>No orders match the current filter</p>
                </div>
              ) : paginated.map((order, idx) => {
                const displayId = order.order_code || `#${order.id}`;
                const name      = order.customerName || order.customer_name || "Customer";
                const phone     = order.customerPhone || order.phone || "";
                const itemCount = (order.rawItems || []).reduce((s, i) => s + (i.quantity || 1), 0);
                const address   = order.address || order.apartment || "—";
                const hasLoc    = order.pickup_latitude || order.delivery_latitude;

                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    style={{
                      display: "grid", gridTemplateColumns: "120px 1fr 1fr 120px 36px",
                      padding: "16px 20px", alignItems: "center",
                      borderBottom: idx < paginated.length - 1 ? "1px solid #F8F9FB" : "none",
                      transition: "background 0.1s", cursor: "pointer",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#F8FAFF"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <div>
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: "#B91C1C" }}>{displayId}</span>
                      {hasLoc && (
                        <span style={{ display: "block", fontSize: 9.5, fontWeight: 700, color: "#10b981", letterSpacing: "0.04em", marginTop: 2 }}>📍 LOCATION SAVED</span>
                      )}
                    </div>

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

                    {/* Chevron */}
                    <svg viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="2" style={{ width: 16, height: 16, justifySelf: "center" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
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

      <OrderDetailDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} />
    </Layout>
  );
}
