import { useState } from "react";
import StatusBadge from "../shared/StatusBadge";

function isPickupReady(order) {
  if (!order.pickup_date) return true;
  const s = String(order.pickup_date);
  const dt = new Date(s.includes("T") || s.includes(" ") ? s : s + "T00:00:00");
  if (isNaN(dt)) return true;
  if (order.time_slot) {
    const startStr = order.time_slot.split(/\s*[-–]\s*/)[0].trim();
    const m = startStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (m) {
      let h = parseInt(m[1]);
      const min = parseInt(m[2]);
      const ap = (m[3] || "").toUpperCase();
      if (ap === "PM" && h !== 12) h += 12;
      else if (ap === "AM" && h === 12) h = 0;
      dt.setHours(h, min, 0, 0);
    }
  }
  return Date.now() >= dt.getTime();
}

function pickupFromLabel(order) {
  if (!order.pickup_date) return "";
  const s = String(order.pickup_date);
  const dt = new Date(s.includes("T") || s.includes(" ") ? s : s + "T00:00:00");
  const d = isNaN(dt) ? "" : dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const slot = order.time_slot ? order.time_slot.split(/\s*[-–]\s*/)[0].trim() : null;
  return slot ? `${d} from ${slot}` : d;
}

const STATUS_CONFIG = {
  pending:              { accent: "#f59e0b", avatarBg: "#fffbeb" },
  vendor_accepted:      { accent: "#3b82f6", avatarBg: "#eff6ff" },
  delivery_assigned:    { accent: "#DC2626", avatarBg: "#FEF2F2" },
  in_progress:          { accent: "#DC2626", avatarBg: "#FEF2F2" },
  picked_up:            { accent: "#0ea5e9", avatarBg: "#f0f9ff" },
  at_vendor:            { accent: "#f97316", avatarBg: "#fff7ed" },
  ready_for_delivery:   { accent: "#10b981", avatarBg: "#ecfdf5" },
  out_for_delivery:     { accent: "#06b6d4", avatarBg: "#ecfeff" },
  delivery_rescheduled: { accent: "#f59e0b", avatarBg: "#fffbeb" },
  delivered:            { accent: "#10b981", avatarBg: "#f0fdf4" },
  cancelled:            { accent: "#ef4444", avatarBg: "#fef2f2" },
};

function formatRescheduleDate(val) {
  if (!val) return null;
  const s = String(val).slice(0, 10);
  const dt = new Date(s + "T00:00:00");
  if (isNaN(dt)) return s;
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function MapsLink({ lat, lng, label, color = "#1d4ed8" }) {
  if (!lat || !lng) return null;
  const url = `https://www.google.com/maps?q=${lat},${lng}`;
  return (
    <a href={url} target="_blank" rel="noreferrer" style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 10.5, fontWeight: 700, color, textDecoration: "none",
      background: color + "12", border: `1px solid ${color}40`,
      borderRadius: 6, padding: "2px 8px",
    }}>
      <svg viewBox="0 0 24 24" style={{ width: 10, height: 10 }}>
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z" fill="currentColor"/>
      </svg>
      {label}
    </a>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 12, height: 12 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 12, height: 12 }}>
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" d="M12 6v6l3.5 2" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 12, height: 12, flexShrink: 0 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.5 1.5 0 012.122 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
    </svg>
  );
}

function InfoBadge({ icon, text, bg = "#f9fafb", border = "#e5e7eb", color = "#6b7280" }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
      padding: "10px 0", borderRadius: 10,
      background: bg, border: `1px solid ${border}`,
      fontSize: 12.5, fontWeight: 700, color,
    }}>
      {icon}
      {text}
    </div>
  );
}

const REJECT_REASONS = [
  "Slot Full",
  "Item not accepted",
  "Outside service area",
  "Other",
];

function RejectModal({ onConfirm, onClose, busy }) {
  const [reason, setReason] = useState(REJECT_REASONS[0]);
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 999,
      background: "rgba(15,23,42,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <div style={{
        background: "#fff", borderRadius: 18,
        boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
        padding: "28px 28px 24px", width: "100%", maxWidth: 380,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 18, fontWeight: 800, color: "#111827", margin: "0 0 6px" }}>
          Reject Order
        </p>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 20px" }}>
          Please select a reason for rejecting this order.
        </p>
        <label style={{ fontSize: 11.5, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.06em", display: "block", marginBottom: 6 }}>
          Reason
        </label>
        <select
          value={reason}
          onChange={e => setReason(e.target.value)}
          style={{
            width: "100%", padding: "10px 14px", borderRadius: 10,
            border: "1.5px solid #e5e7eb", fontSize: 13.5, fontWeight: 600,
            color: "#111827", background: "#f9fafb",
            outline: "none", cursor: "pointer", marginBottom: 22,
          }}
        >
          {REJECT_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            disabled={busy}
            style={{
              flex: 1, padding: "11px 0", borderRadius: 10, cursor: "pointer",
              border: "1.5px solid #e5e7eb", background: "#fff",
              color: "#374151", fontSize: 13, fontWeight: 700,
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={busy}
            style={{
              flex: 1, padding: "11px 0", borderRadius: 10, cursor: busy ? "not-allowed" : "pointer",
              border: "none", background: busy ? "#e5e7eb" : "linear-gradient(135deg,#DC2626,#B91C1C)",
              color: busy ? "#9ca3af" : "#fff", fontSize: 13, fontWeight: 700,
            }}
          >
            {busy ? "Rejecting…" : "Reject Order"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionArea({ order, onStatusChange }) {
  const [busy, setBusy] = useState(null);
  const [err,  setErr]  = useState("");
  const [showReject, setShowReject] = useState(false);
  const status = order.status;

  async function handleClick(action) {
    setBusy(action);
    setErr("");
    try {
      await onStatusChange(order.id, action);
    } catch (e) {
      setErr(e.response?.data?.message || e.message || "Action failed");
    } finally {
      setBusy(null);
    }
  }

  async function handleRejectConfirm(reason) {
    setBusy('reject');
    setErr("");
    try {
      await onStatusChange(order.id, 'reject', reason);
      setShowReject(false);
    } catch (e) {
      setErr(e.response?.data?.message || e.message || "Reject failed");
    } finally {
      setBusy(null);
    }
  }

  if (status === 'pending') {
    return (
      <>
        {showReject && (
          <RejectModal
            busy={busy === 'reject'}
            onConfirm={handleRejectConfirm}
            onClose={() => setShowReject(false)}
          />
        )}
        {(() => {
          const ready = isPickupReady(order);
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setShowReject(true)}
                  style={{
                    flex: 1, padding: "10px 0", border: "1.5px solid #fecaca",
                    borderRadius: 10, cursor: "pointer", background: "#fef2f2",
                    color: "#dc2626", fontSize: 12.5, fontWeight: 700, transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#fee2e2"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#fef2f2"; }}
                >
                  Reject
                </button>
                <button
                  onClick={() => ready && onStatusChange(order.id, 'accept')}
                  disabled={!ready}
                  style={{
                    flex: 2, padding: "10px 0", border: "none", borderRadius: 10,
                    cursor: ready ? "pointer" : "not-allowed",
                    background: ready ? "linear-gradient(135deg, #10b981, #059669)" : "#e5e7eb",
                    color: ready ? "#fff" : "#9ca3af",
                    fontSize: 12.5, fontWeight: 700, letterSpacing: "0.02em",
                    transition: "opacity 0.15s, transform 0.15s",
                  }}
                  onMouseEnter={e => { if (ready) { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "none"; }}
                >
                  {ready ? "Accept Order" : "Not Yet Available"}
                </button>
              </div>
              {!ready && (
                <p style={{ fontSize: 11.5, color: "#f59e0b", fontWeight: 600, textAlign: "center", margin: 0 }}>
                  ⏰ Pickup scheduled: {pickupFromLabel(order)}
                </p>
              )}
            </div>
          );
        })()}
      </>
    );
  }

  if (status === 'vendor_accepted') {
    return (
      <InfoBadge
        bg="#eff6ff" border="#bfdbfe" color="#1d4ed8"
        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>}
        text="Awaiting Agent Pickup"
      />
    );
  }

  if (status === 'delivery_assigned') {
    return (
      <InfoBadge
        bg="#FEF2F2" border="#FECACA" color="#B91C1C"
        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        text="Agent On the Way"
      />
    );
  }

  if (status === 'picked_up') {
    return (
      <InfoBadge
        bg="#f0f9ff" border="#bae6fd" color="#0369a1"
        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>}
        text="Clothes Picked Up — En Route"
      />
    );
  }

  if (status === 'at_vendor') {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 9, padding: "8px 12px" }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#f97316", flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#c2410c" }}>Clothes received — ready to iron</span>
        </div>
        <button
          onClick={() => handleClick('start_ironing')}
          disabled={busy !== null}
          style={{
            width: "100%", padding: "11px 0", border: "none", borderRadius: 10,
            cursor: busy !== null ? "not-allowed" : "pointer",
            background: busy !== null ? "#e5e7eb" : "linear-gradient(135deg, #DC2626, #B91C1C)",
            color: busy !== null ? "#9ca3af" : "#fff",
            fontSize: 13, fontWeight: 700, transition: "opacity 0.15s",
          }}
        >
          {busy === 'start_ironing' ? "Starting…" : "Start Ironing"}
        </button>
        {err && <p style={{ fontSize: 11.5, color: "#dc2626", fontWeight: 600, margin: 0, textAlign: "center" }}>{err}</p>}
      </div>
    );
  }

  if (status === 'ironing_in_progress' || status === 'in_progress') {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 9, padding: "9px 12px" }}>
          <span style={{ fontSize: 16 }}>🔥</span>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "#DC2626" }}>Ironing in Process…</span>
        </div>
        <button
          onClick={() => handleClick('mark_complete')}
          disabled={busy !== null}
          style={{
            width: "100%", padding: "11px 0", border: "none", borderRadius: 10,
            cursor: busy !== null ? "not-allowed" : "pointer",
            background: busy !== null ? "#e5e7eb" : "linear-gradient(135deg, #10b981, #059669)",
            color: busy !== null ? "#9ca3af" : "#fff",
            fontSize: 13, fontWeight: 700, transition: "opacity 0.15s",
          }}
        >
          {busy !== null ? "Saving…" : "Iron Complete ✓"}
        </button>
        {err && <p style={{ fontSize: 11.5, color: "#dc2626", fontWeight: 600, margin: 0, textAlign: "center" }}>{err}</p>}
      </div>
    );
  }

  if (status === 'ready_for_delivery') {
    return (
      <InfoBadge
        bg="#ecfdf5" border="#a7f3d0" color="#047857"
        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        text="Ready — Agent Picking Up"
      />
    );
  }

  if (status === 'out_for_delivery') {
    return (
      <InfoBadge
        bg="#ecfeff" border="#a5f3fc" color="#0e7490"
        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>}
        text="Out for Delivery"
      />
    );
  }

  if (status === 'delivery_rescheduled') {
    const dateLabel = formatRescheduleDate(order.delivery_date);
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fffbeb", border: "1.5px solid #fde68a", borderRadius: 10, padding: "11px 14px" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15, flexShrink: 0 }}>
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#92400e", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>Rescheduled</p>
          <p style={{ fontSize: 13, fontWeight: 800, color: "#b45309", margin: "2px 0 0" }}>{dateLabel || "Date not set"}</p>
        </div>
      </div>
    );
  }

  if (status === 'delivered') {
    return (
      <InfoBadge
        bg="#f0fdf4" border="#bbf7d0" color="#16a34a"
        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
        text="Order Completed"
      />
    );
  }

  if (status === 'cancelled') {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fef2f2", border: "1.5px solid #fecaca", borderRadius: 10, padding: "10px 14px" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15, flexShrink: 0 }}>
            <path d="M6 18L18 6M6 6l12 12"/>
          </svg>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#b91c1c" }}>
            Cancelled by {order.cancelled_by === 'vendor' ? 'Center Head' : order.cancelled_by === 'admin' ? 'Admin' : 'Customer'}
          </span>
        </div>
        {order.cancellation_reason && (
          <p style={{ fontSize: 12, color: "#6b7280", margin: 0, padding: "0 4px", fontWeight: 500 }}>
            Reason: {order.cancellation_reason}
          </p>
        )}
      </div>
    );
  }

  return null;
}

export default function OrderCard({ order, onStatusChange }) {
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
  const displayId = order.order_code || `#${order.id}`;

  return (
    <div
      style={{
        background: "#fff", borderRadius: 16,
        border: "1px solid #e5e7eb",
        boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
        overflow: "hidden", display: "flex", flexDirection: "column",
        transition: "transform 0.18s, box-shadow 0.18s",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.10)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 6px rgba(0,0,0,0.05)"; }}
    >
      {/* Top accent bar */}
      <div style={{ height: 4, background: cfg.accent, flexShrink: 0 }} />

      <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 3px" }}>
              Order ID
            </p>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 800, color: "#111827", margin: 0 }}>
              {displayId}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div style={{ height: 1, background: "#f3f4f6" }} />

        {/* Customer */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: cfg.avatarBg,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 17, fontWeight: 800, color: cfg.accent,
          }}>
            {order.customer?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {order.customer}
            </p>
            <p style={{ fontSize: 12, color: "#6b7280", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {order.items}
            </p>
          </div>
        </div>

        {/* Meta */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
            <LocationIcon /> {order.zone}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
            <ClockIcon /> {order.time}
          </span>
        </div>

        {/* Address */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 12, color: "#6b7280", fontWeight: 500, lineHeight: 1.4 }}>
          <span style={{ marginTop: 2 }}><HomeIcon /></span>
          <span>{order.customer_address || "Address not available"}</span>
        </div>

        {/* Bag numbers — shown once clothes are picked up */}
        {(order.bag_numbers || order.bag_number) && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#eff6ff", border: "1px solid #bfdbfe",
            borderRadius: 10, padding: "8px 13px",
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, flexShrink: 0 }}>
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: "#1d4ed8" }}>
              {(order.bag_numbers || String(order.bag_number)).split(",").map(n => `#${n.trim()}`).join(", ")}
            </span>
            <span style={{ fontSize: 11, color: "#93c5fd", marginLeft: "auto" }}>{order.order_code || `#${order.id}`}</span>
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 14, marginTop: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Total
            </span>
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 800, color: "#111827" }}>
              ₹{order.amount}
            </span>
          </div>
          {(order.pickup_latitude || order.delivery_latitude) && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              <MapsLink lat={order.pickup_latitude} lng={order.pickup_longitude} label="Pickup" color="#10b981" />
              <MapsLink lat={order.delivery_latitude} lng={order.delivery_longitude} label="Delivery" color="#DC2626" />
            </div>
          )}
          <ActionArea order={order} onStatusChange={onStatusChange} />
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
