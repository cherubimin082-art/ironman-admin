import { useState } from "react";
import StatusBadge from "../shared/StatusBadge";

const STATUS_CONFIG = {
  pending:            { accent: "#f59e0b", avatarBg: "#fffbeb" },
  vendor_accepted:    { accent: "#3b82f6", avatarBg: "#eff6ff" },
  delivery_assigned:  { accent: "#DC2626", avatarBg: "#FEF2F2" },
  in_progress:        { accent: "#DC2626", avatarBg: "#FEF2F2" },
  picked_up:          { accent: "#0ea5e9", avatarBg: "#f0f9ff" },
  at_vendor:          { accent: "#f97316", avatarBg: "#fff7ed" },
  ready_for_delivery: { accent: "#10b981", avatarBg: "#ecfdf5" },
  out_for_delivery:   { accent: "#06b6d4", avatarBg: "#ecfeff" },
  delivered:          { accent: "#10b981", avatarBg: "#f0fdf4" },
  cancelled:          { accent: "#ef4444", avatarBg: "#fef2f2" },
};

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
            onClick={() => onStatusChange(order.id, 'accept')}
            style={{
              flex: 2, padding: "10px 0", border: "none", borderRadius: 10, cursor: "pointer",
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "#fff", fontSize: 12.5, fontWeight: 700, letterSpacing: "0.02em",
              transition: "opacity 0.15s, transform 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "none"; }}
          >
            Accept Order
          </button>
        </div>
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
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => handleClick('start_ironing')}
            disabled={busy !== null}
            style={{
              flex: 1, padding: "11px 0", border: "none", borderRadius: 10,
              cursor: busy !== null ? "not-allowed" : "pointer",
              background: busy === 'start_ironing' ? "#e5e7eb" : "linear-gradient(135deg, #DC2626, #B91C1C)",
              color: busy === 'start_ironing' ? "#9ca3af" : "#fff",
              fontSize: 12.5, fontWeight: 700,
              transition: "opacity 0.15s",
            }}
          >
            {busy === 'start_ironing' ? "Starting…" : "Start Ironing"}
          </button>
          <button
            onClick={() => handleClick('mark_complete')}
            disabled={busy !== null}
            style={{
              flex: 1, padding: "11px 0", border: "none", borderRadius: 10,
              cursor: busy !== null ? "not-allowed" : "pointer",
              background: busy === 'mark_complete' ? "#e5e7eb" : "linear-gradient(135deg, #f97316, #ef4444)",
              color: busy === 'mark_complete' ? "#9ca3af" : "#fff",
              fontSize: 12.5, fontWeight: 700,
              transition: "opacity 0.15s",
            }}
          >
            {busy === 'mark_complete' ? "Saving…" : "Iron Complete"}
          </button>
        </div>
        {err && (
          <p style={{ fontSize: 11.5, color: "#dc2626", fontWeight: 600, margin: 0, textAlign: "center" }}>{err}</p>
        )}
      </div>
    );
  }

  if (status === 'ironing_in_progress' || status === 'in_progress') {
    const isLegacy = status === 'in_progress';
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <button
          onClick={() => handleClick('mark_complete')}
          disabled={busy !== null}
          style={{
            width: "100%", padding: "11px 0", border: "none", borderRadius: 10,
            cursor: busy !== null ? "not-allowed" : "pointer",
            background: busy !== null ? "#e5e7eb" : "linear-gradient(135deg, #10b981, #059669)",
            color: busy !== null ? "#9ca3af" : "#fff",
            fontSize: 13, fontWeight: 700,
            transition: "opacity 0.15s",
          }}
        >
          {busy !== null ? "Saving…" : isLegacy ? "Mark Ironing Complete" : "Iron Complete"}
        </button>
        {err && (
          <p style={{ fontSize: 11.5, color: "#dc2626", fontWeight: 600, margin: 0, textAlign: "center" }}>{err}</p>
        )}
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

  if (status === 'delivered') {
    return (
      <InfoBadge
        bg="#f0fdf4" border="#bbf7d0" color="#16a34a"
        icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 14, height: 14 }}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
        text="Order Completed"
      />
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

        {/* Bag number — shown once clothes are at the shop */}
        {order.bag_number && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#eff6ff", border: "1px solid #bfdbfe",
            borderRadius: 10, padding: "8px 13px",
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, flexShrink: 0 }}>
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: "#1d4ed8" }}>Bag #{order.bag_number}</span>
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
          <ActionArea order={order} onStatusChange={onStatusChange} />
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
