import Layout from "../../components/shared/Layout";
import OrderCard from "../../components/vendor/OrderCard";
import { useOrders } from "../../context/OrderContext";
import { useState } from "react";
import { useWindowSize } from "../../hooks/useWindowSize";

const FILTERS = [
  { key: "all",         label: "All Orders",  color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
  { key: "pending",     label: "Pending",     color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
  { key: "in-progress", label: "In Progress", color: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
  { key: "ready",       label: "Ready",       color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0" },
  { key: "delivered",   label: "Delivered",   color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" },
  { key: "cancelled",   label: "Cancelled",   color: "#ef4444", bg: "#fef2f2", border: "#fecaca" },
];

const IN_PROGRESS_STATUSES = new Set([
  "vendor_accepted", "delivery_assigned", "picked_up",
  "at_vendor", "ironing_in_progress", "in_progress",
]);

const APARTMENTS = [
  "All",
  "Green Valley Apartments",
  "Sunrise Residency",
  "Lake View Towers",
  "Palm Grove Apartments",
  "Maple Heights",
];

function FilterTab({ item, count, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 16px", borderRadius: 10, border: "none",
        background: isActive ? item.bg : "transparent",
        outline: isActive ? `1.5px solid ${item.border}` : "1.5px solid transparent",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#f9fafb"; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 600, color: isActive ? item.color : "#6b7280" }}>
        {item.label}
      </span>
      <span style={{
        fontSize: 11, fontWeight: 700,
        background: isActive ? item.color : "#e5e7eb",
        color: isActive ? "#fff" : "#6b7280",
        borderRadius: 99, padding: "1px 8px", lineHeight: 1.6,
      }}>
        {count}
      </span>
    </button>
  );
}

export default function OrderQueuePage() {
  const { orders, vendorAction } = useOrders();
  const [filter, setFilter] = useState("all");
  const [apt, setApt]       = useState("All");
  const { isMobile, isTablet } = useWindowSize();

  const byApt    = apt === "All" ? orders : orders.filter(o => o.apartment === apt);
  const matchFilter = (o) => {
    if (filter === "all")         return true;
    if (filter === "in-progress") return IN_PROGRESS_STATUSES.has(o.status);
    if (filter === "ready")       return o.status === "ready_for_delivery";
    if (filter === "delivered")   return o.status === "delivered";
    return o.status === filter;
  };
  const filtered = byApt.filter(matchFilter);
  const countFor = key => {
    if (key === "all")         return byApt.length;
    if (key === "in-progress") return byApt.filter(o => IN_PROGRESS_STATUSES.has(o.status)).length;
    if (key === "ready")       return byApt.filter(o => o.status === "ready_for_delivery").length;
    if (key === "delivered")   return byApt.filter(o => o.status === "delivered").length;
    return byApt.filter(o => o.status === key).length;
  };

  return (
    <Layout>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

        {/* Page Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#DC2626", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 5px" }}>
              Order Management
            </p>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 800, color: "#111827", margin: 0, lineHeight: 1.15 }}>
              Order Queue
            </h1>
            <p style={{ fontSize: 13.5, color: "#9ca3af", margin: "6px 0 0", fontWeight: 400 }}>
              Manage and update all pressing orders in real time.
            </p>
          </div>
          <div style={{
            background: "#fff", border: "1px solid #e5e7eb",
            borderRadius: 10, padding: "9px 18px",
            fontSize: 13, fontWeight: 700, color: "#374151",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}>
            {byApt.length} Total
          </div>
        </div>

        {/* Apartment Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "#6b7280", whiteSpace: "nowrap" }}>
            Filter by Apartment:
          </span>
          <select
            value={apt}
            onChange={e => setApt(e.target.value)}
            style={{
              padding: "7px 32px 7px 12px",
              borderRadius: 9,
              border: apt !== "All" ? "1.5px solid #F87171" : "1.5px solid #e5e7eb",
              fontSize: 13, fontWeight: 600, color: "#374151",
              background: "#fff",
              cursor: "pointer",
              outline: "none",
              appearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'%3E%3Cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 8px center",
              backgroundSize: "16px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              minWidth: 220,
            }}
          >
            {APARTMENTS.map(a => (
              <option key={a} value={a}>{a === "All" ? "All Apartments" : a}</option>
            ))}
          </select>
          {apt !== "All" && (
            <button
              onClick={() => setApt("All")}
              style={{
                padding: "6px 12px", borderRadius: 8,
                border: "1px solid #fecaca",
                background: "#fef2f2", color: "#dc2626",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >
              Clear ×
            </button>
          )}
        </div>

        {/* Filter Bar */}
        <div style={{
          background: "#fff",
          border: "1px solid #f3f4f6",
          borderRadius: 14, padding: "10px 12px",
          display: "flex", gap: 6, flexWrap: "wrap",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}>
          {FILTERS.map(f => (
            <FilterTab
              key={f.key}
              item={f}
              count={countFor(f.key)}
              isActive={filter === f.key}
              onClick={() => setFilter(f.key)}
            />
          ))}
        </div>

        {/* Orders Grid or Empty State */}
        {filtered.length === 0 ? (
          <div style={{
            background: "#fff", border: "2px dashed #e5e7eb",
            borderRadius: 16, padding: "70px 24px", textAlign: "center",
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: "#f3f4f6",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 14px",
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" style={{ width: 26, height: 26 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#374151", margin: "0 0 6px" }}>No orders here</p>
            <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Try a different filter to see more orders.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 16 }}>
            {filtered.map(order => (
              <OrderCard key={order.id} order={order} onStatusChange={vendorAction} />
            ))}
          </div>
        )}

      </div>
    </Layout>
  );
}
