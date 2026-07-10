import { useState } from "react";
import Layout from "../../components/shared/Layout";
import StatusBadge from "../../components/shared/StatusBadge";
import { useOrders } from "../../context/OrderContext";
import api from "../../services/api";
import { useWindowSize } from "../../hooks/useWindowSize";
import RideMapModal from "../../components/delivery/RideMapModal";

// ── Helpers ────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  const dt = new Date(String(d).includes("T") || String(d).includes(" ") ? d : d + "T00:00:00");
  if (isNaN(dt)) return "—";
  return dt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function parsePickupTime(job) {
  if (!job.pickup_date) return null;
  const s = String(job.pickup_date);
  const dt = new Date(s.includes("T") || s.includes(" ") ? s : s + "T00:00:00");
  if (isNaN(dt)) return null;
  if (job.time_slot) {
    const startStr = job.time_slot.split(/\s*[-–]\s*/)[0].trim();
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
  return dt;
}

function isPickupReady(job) {
  const t = parsePickupTime(job);
  return !t || Date.now() >= t.getTime();
}

function pickupFromLabel(job) {
  if (!job.pickup_date) return "";
  const d = fmtDate(job.pickup_date);
  const slot = job.time_slot ? job.time_slot.split(/\s*[-–]\s*/)[0].trim() : null;
  return slot ? `${d} from ${slot}` : d;
}

const S = {
  label: { fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 3px" },
  divider: { height: 1, background: "#f3f4f6" },
  sectionHead: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16 },
  sectionTitle: { fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 },
};

// ── Navigate helper ────────────────────────────────────────────
function mapsUrl(job) {
  if (job.customer_latitude && job.customer_longitude) {
    return `https://www.google.com/maps/dir/?api=1&destination=${job.customer_latitude},${job.customer_longitude}&travelmode=driving`;
  }
  const addr = job.customer_address;
  if (addr) return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}&travelmode=driving`;
  return null;
}

function NavigateBtn({ job, compact = false }) {
  const url = mapsUrl(job);
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        padding: compact ? "6px 14px" : "9px 0",
        width: compact ? "auto" : "100%",
        borderRadius: 10,
        border: "1.5px solid #bfdbfe",
        background: "#eff6ff",
        color: "#1d4ed8",
        fontSize: 12.5, fontWeight: 700,
        textDecoration: "none",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
        <path d="M3 11l19-9-9 19-2-8-8-2z"/>
      </svg>
      Navigate
    </a>
  );
}

// ── Empty state ────────────────────────────────────────────────
function EmptyState({ message }) {
  return (
    <div style={{ background: "#fff", border: "2px dashed #e5e7eb", borderRadius: 16, padding: "40px 24px", textAlign: "center" }}>
      <p style={{ fontSize: 13.5, fontWeight: 700, color: "#374151", margin: 0 }}>{message}</p>
    </div>
  );
}

// ── OTP + Bag modal ────────────────────────────────────────────
function PickupModal({ order, bags, bagsLoading, onConfirm, onClose, confirming }) {
  const [otp, setOtp]         = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [err, setErr]         = useState("");

  const showBags   = otp.length === 4;
  const canConfirm = otp.length === 4 && selectedIds.size > 0 && !confirming;

  function toggleBag(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await onConfirm(otp, [...selectedIds]);
    } catch (ex) {
      setErr(ex.response?.data?.message || "Failed. Try again.");
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: "28px 24px",
        width: "100%", maxWidth: 400, boxShadow: "0 24px 60px rgba(0,0,0,0.2)",
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>
          Confirm Pickup
        </p>
        <p style={{ fontSize: 12.5, color: "#6b7280", margin: "0 0 20px", lineHeight: 1.55 }}>
          {order.order_code || `#${order.id}`} · {order.customer}
        </p>

        <form onSubmit={handleSubmit}>
          {/* OTP input */}
          <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
            Customer OTP
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            placeholder="4-digit OTP"
            value={otp}
            onChange={e => { setOtp(e.target.value.replace(/\D/g, "")); setErr(""); }}
            autoFocus
            style={{
              width: "100%", padding: "13px 16px", borderRadius: 12, fontSize: 22, fontWeight: 800,
              letterSpacing: "0.3em", textAlign: "center",
              border: err ? "2px solid #ef4444" : "2px solid #e5e7eb",
              outline: "none", boxSizing: "border-box",
            }}
            onFocus={e => { if (!err) e.target.style.borderColor = "#3b82f6"; }}
            onBlur={e => { if (!err) e.target.style.borderColor = "#e5e7eb"; }}
          />
          <p style={{ fontSize: 11, color: "#9ca3af", margin: "5px 0 0" }}>
            Ask the customer for the 4-digit OTP sent to their WhatsApp.
          </p>

          {/* Bag checkboxes — appear when OTP is 4 digits */}
          {showBags && (
            <div style={{ marginTop: 18 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Select Bags
                </label>
                {selectedIds.size > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 700, color: "#10b981", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 99, padding: "2px 9px" }}>
                    {selectedIds.size} selected
                  </span>
                )}
              </div>
              {bagsLoading ? (
                <p style={{ fontSize: 12.5, color: "#9ca3af" }}>Loading available bags…</p>
              ) : bags.length === 0 ? (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "#dc2626", fontWeight: 600 }}>
                  No bags available at this Iron&apos;s Head right now.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {bags.map(b => {
                    const checked = selectedIds.has(b.id);
                    return (
                      <label
                        key={b.id}
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "12px 14px", borderRadius: 11, cursor: "pointer",
                          border: checked ? "2px solid #10b981" : "2px solid #e5e7eb",
                          background: checked ? "#f0fdf4" : "#fff",
                          transition: "border-color 0.15s, background 0.15s",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleBag(b.id)}
                          style={{ width: 18, height: 18, accentColor: "#10b981", flexShrink: 0, cursor: "pointer" }}
                        />
                        <span style={{ fontSize: 14, fontWeight: 700, color: checked ? "#065f46" : "#374151" }}>
                          Bag #{b.bag_number}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              <p style={{ fontSize: 11, color: "#9ca3af", margin: "8px 0 0" }}>
                Select all bags needed for this order. Tick multiple if clothes need more than one bag.
              </p>
            </div>
          )}

          {err && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 9, padding: "9px 12px", marginTop: 14, fontSize: 12.5, color: "#dc2626", fontWeight: 600 }}>
              {err}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: "12px 0", border: "1.5px solid #e5e7eb", borderRadius: 11,
                cursor: "pointer", background: "#fff", color: "#374151", fontSize: 13, fontWeight: 700,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canConfirm}
              style={{
                flex: 2, padding: "12px 0", border: "none", borderRadius: 11,
                cursor: canConfirm ? "pointer" : "not-allowed",
                background: canConfirm ? "linear-gradient(135deg, #10b981, #059669)" : "#e5e7eb",
                color: canConfirm ? "#fff" : "#9ca3af",
                fontSize: 13, fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              }}
            >
              {confirming && (
                <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
              )}
              {confirming ? "Confirming…" : `Confirm Pickup${selectedIds.size > 1 ? ` (${selectedIds.size} bags)` : ""}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── New Assignment card (vendor_accepted) ──────────────────────
function AssignmentCard({ job, onAccept, accepting }) {
  const ready = isPickupReady(job);
  const busy  = accepting === job.id;
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", boxShadow: "0 1px 6px rgba(0,0,0,0.05)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 4, background: "linear-gradient(90deg, #3b82f6, #DC2626)" }} />
      <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <p style={S.label}>Order ID</p>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 800, color: "#111827", margin: 0 }}>{job.order_code || `#${job.id}`}</p>
          </div>
          <StatusBadge status={job.status} />
        </div>
        <div style={S.divider} />
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#3b82f6", flexShrink: 0 }}>
            {job.customer?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>{job.customer}</p>
            <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.items}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" style={{ width: 14, height: 14, marginTop: 1, flexShrink: 0 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          <p style={{ fontSize: 12, color: "#6b7280", margin: 0, lineHeight: 1.5 }}>{job.customer_address || "Address not available"}</p>
        </div>
        {/* Vendor bag availability */}
        {job.vendor_name && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f9fafb", borderRadius: 9, padding: "8px 12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" style={{ width: 13, height: 13, flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016 2.993 2.993 0 002.25-1.016 3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.375.375 0 00.375-.375v-1.5a.375.375 0 00-.375-.375h-3.75a.375.375 0 00-.375.375v1.5c0 .207.168.375.375.375z" />
              </svg>
              <span style={{ fontSize: 11.5, color: "#6b7280" }}>{job.vendor_name}</span>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 99,
              background: job.vendor_bags_flag && job.vendor_available_bags > 0 ? "#f0fdf4" : "#fef2f2",
              color: job.vendor_bags_flag && job.vendor_available_bags > 0 ? "#16a34a" : "#dc2626",
              border: `1px solid ${job.vendor_bags_flag && job.vendor_available_bags > 0 ? "#bbf7d0" : "#fecaca"}`,
            }}>
              {job.vendor_bags_flag && job.vendor_available_bags > 0
                ? `${job.vendor_available_bags} bags available`
                : "No bags available"}
            </span>
          </div>
        )}
        <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 14, marginTop: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total</span>
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 800, color: "#111827" }}>₹{job.amount}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <NavigateBtn job={job} compact />
              <button
                onClick={() => onAccept(job.id)}
                disabled={busy || !ready}
                style={{
                  flex: 1, padding: "11px 0", border: "none", borderRadius: 10,
                  cursor: (busy || !ready) ? "not-allowed" : "pointer",
                  background: (busy || !ready) ? "#e5e7eb" : "linear-gradient(135deg, #3b82f6, #DC2626)",
                  color: (busy || !ready) ? "#9ca3af" : "#fff",
                  fontSize: 13, fontWeight: 700,
                }}
              >
                {busy ? "Accepting..." : !ready ? "Not Yet Available" : "Accept Assignment"}
              </button>
            </div>
            {!ready && (
              <p style={{ fontSize: 11.5, color: "#f59e0b", fontWeight: 600, textAlign: "center", margin: 0 }}>
                ⏰ Pickup scheduled: {pickupFromLabel(job)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Pending Pickup card (delivery_assigned) ────────────────────
function PendingPickupCard({ job, onReach, reaching, onRide }) {
  const busy  = reaching === job.id;
  const ready = isPickupReady(job);
  return (
    <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", boxShadow: "0 1px 6px rgba(0,0,0,0.05)", overflow: "hidden" }}>
      <div style={{ height: 4, background: "linear-gradient(90deg, #10b981, #3b82f6)" }} />
      <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <p style={S.label}>Order ID</p>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 800, color: "#111827", margin: 0 }}>{job.order_code || `#${job.id}`}</p>
          </div>
          <StatusBadge status={job.status} />
        </div>
        <div style={S.divider} />

        {/* Customer */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#10b981", flexShrink: 0 }}>
            {job.customer?.[0]?.toUpperCase() ?? "?"}
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>{job.customer}</p>
        </div>

        {/* Details grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px", background: "#f9fafb", borderRadius: 12, padding: "12px 14px" }}>
          <div>
            <p style={S.label}>Apartment</p>
            <p style={{ fontSize: 12.5, fontWeight: 600, color: "#374151", margin: 0 }}>{job.apartment || "—"}</p>
          </div>
          <div>
            <p style={S.label}>Pickup Date</p>
            <p style={{ fontSize: 12.5, fontWeight: 600, color: "#374151", margin: 0 }}>{fmtDate(job.pickup_date)}</p>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <p style={S.label}>Address</p>
            <p style={{ fontSize: 12.5, fontWeight: 600, color: "#374151", margin: 0, lineHeight: 1.45 }}>{job.customer_address || "—"}</p>
          </div>
          <div>
            <p style={S.label}>Pickup Time</p>
            <p style={{ fontSize: 12.5, fontWeight: 600, color: "#374151", margin: 0 }}>{job.time_slot || "—"}</p>
          </div>
          <div>
            <p style={S.label}>Delivery Time</p>
            <p style={{ fontSize: 12.5, fontWeight: 600, color: job.apt_delivery_time ? "#2563eb" : "#374151", margin: 0 }}>{job.apt_delivery_time || "—"}</p>
          </div>
          {job.vendor_name && (
            <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={S.label}>Center Head Shop</p>
                <p style={{ fontSize: 12.5, fontWeight: 600, color: "#374151", margin: 0 }}>{job.vendor_name}</p>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                background: job.vendor_bags_flag && job.vendor_available_bags > 0 ? "#f0fdf4" : "#fef2f2",
                color: job.vendor_bags_flag && job.vendor_available_bags > 0 ? "#16a34a" : "#dc2626",
                border: `1px solid ${job.vendor_bags_flag && job.vendor_available_bags > 0 ? "#bbf7d0" : "#fecaca"}`,
                flexShrink: 0,
              }}>
                {job.vendor_bags_flag && job.vendor_available_bags > 0 ? `${job.vendor_available_bags} bags` : "No bags"}
              </span>
            </div>
          )}
        </div>

        {/* Ride to Pickup — embedded map */}
        <button
          onClick={() => ready && onRide(job)}
          disabled={!ready}
          style={{
            width: "100%", padding: "11px 0", border: "none", borderRadius: 10,
            cursor: ready ? "pointer" : "not-allowed",
            background: ready ? "linear-gradient(135deg, #10b981, #059669)" : "#e5e7eb",
            color: ready ? "#fff" : "#9ca3af", fontSize: 13, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          Ride to Pickup
        </button>

        {/* Action row: Navigate (external) + I've Reached */}
        <div style={{ display: "flex", gap: 8 }}>
          <NavigateBtn job={job} compact />
          <button
            onClick={() => onReach(job)}
            disabled={busy || !ready}
            style={{
              flex: 1, padding: "11px 0", border: "none", borderRadius: 10,
              cursor: (busy || !ready) ? "not-allowed" : "pointer",
              background: (busy || !ready) ? "#e5e7eb" : "linear-gradient(135deg, #8B5CF6, #7C3AED)",
              color: (busy || !ready) ? "#9ca3af" : "#fff", fontSize: 13, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            {busy ? "Notifying customer…" : <>🚪 I've Reached</>}
          </button>
        </div>
        {!ready && (
          <p style={{ fontSize: 11.5, color: "#f59e0b", fontWeight: 600, textAlign: "center", margin: 0 }}>
            ⏰ Pickup scheduled: {pickupFromLabel(job)}
          </p>
        )}
        {ready && (
          <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", margin: 0 }}>
            "Ride to Pickup" shows a live map · "I've Reached" when you arrive
          </p>
        )}
      </div>
    </div>
  );
}

// ── In-Transit row (picked_up) ─────────────────────────────────
function TransitCard({ job, onDrop, transitBusy }) {
  const busy = transitBusy === job.id;
  return (
    <div style={{ background: "#fff", borderRadius: 13, border: "1px solid #e5e7eb", padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 13.5, fontWeight: 700, color: "#111827", margin: "0 0 2px" }}>
          {job.order_code || `#${job.id}`} — {job.customer}
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>{job.apartment || "—"}</p>
          {(job.bag_numbers || job.bag_number) && (
            <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
              Bag <span style={{ fontWeight: 700, color: "#374151" }}>#{String(job.bag_numbers || job.bag_number).split(",").join(", #")}</span>
            </p>
          )}
        </div>
      </div>
      <button
        onClick={() => onDrop(job.id)}
        disabled={busy}
        style={{
          padding: "8px 16px", border: "none", borderRadius: 9, flexShrink: 0,
          cursor: busy ? "not-allowed" : "pointer",
          background: busy ? "#e5e7eb" : "linear-gradient(135deg, #f97316, #ea580c)",
          color: busy ? "#9ca3af" : "#fff", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap",
        }}
      >
        {busy ? "Updating…" : "Submit to Center Head Shop"}
      </button>
    </div>
  );
}

// ── At-Vendor row (at_vendor) ──────────────────────────────────
function AtVendorRow({ job }) {
  return (
    <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#fb923c", flexShrink: 0 }} />
      <div>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#9a3412", margin: 0 }}>
          {job.order_code || `#${job.id}`} — {job.customer}
        </p>
        <p style={{ fontSize: 12, color: "#c2410c", margin: "2px 0 0" }}>
          Clothes are at the iron shop.
          {(job.bag_numbers || job.bag_number) ? ` Bag #${String(job.bag_numbers || job.bag_number).split(",").join(", #")}.` : ""} Waiting for ironing to complete…
        </p>
      </div>
    </div>
  );
}

// ── Badge pill ─────────────────────────────────────────────────
function CountBadge({ count, blue }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700,
      color: blue ? "#1d4ed8" : "#6b7280",
      background: blue ? "#eff6ff" : "#f9fafb",
      border: `1px solid ${blue ? "#bfdbfe" : "#e5e7eb"}`,
      borderRadius: 8, padding: "2px 10px",
    }}>
      {count}
    </span>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function PickupJobsPage() {
  const { pickupJobs, deliveryAction, loadData } = useOrders();

  const [accepting, setAccepting]   = useState(null);
  const [reaching, setReaching]     = useState(null);
  const [transitBusy, setTransitBusy] = useState(null);
  const { isMobile } = useWindowSize();
  const [pickupModal, setPickupModal] = useState(null);   // { order }
  const [availableBags, setAvailableBags] = useState([]);
  const [bagsLoading, setBagsLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [rideMapJob, setRideMapJob] = useState(null);     // job being ridden to

  const newJobs      = pickupJobs.filter(j => j.status === "vendor_accepted");
  const pendingPickup = pickupJobs.filter(j => j.status === "delivery_assigned");
  const inTransit    = pickupJobs.filter(j => j.status === "picked_up");
  const atVendor     = pickupJobs.filter(j => j.status === "at_vendor");

  // Accept new assignment
  async function handleAccept(jobId) {
    setAccepting(jobId);
    setError("");
    try {
      await deliveryAction(jobId, "accept");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to accept. Try again.");
      await loadData();
    } finally {
      setAccepting(null);
    }
  }

  // "I've Reached" — send OTP to customer, then fetch bags and show modal
  async function handleReach(order) {
    setReaching(order.id);
    setError("");
    try {
      await deliveryAction(order.id, "reach_pickup");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to notify customer.");
      setReaching(null);
      return;
    }
    // Fetch available bags for this vendor
    setBagsLoading(true);
    let bags = [];
    if (order.vendor_id) {
      try {
        const { data } = await api.get(`/delivery/available-bags/${order.vendor_id}`);
        bags = data.bags || [];
      } catch (_) {}
    }
    setAvailableBags(bags);
    setBagsLoading(false);
    setReaching(null);
    setPickupModal({ order });
  }

  // Confirm pickup (OTP + bag_ids[] + GPS)
  async function handleConfirmPickup(otp, bagIds) {
    if (!pickupModal) return;
    setConfirming(true);
    // Capture GPS silently — proceed without it if denied/unavailable
    let coords = null;
    try {
      coords = await new Promise(resolve => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          p => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
          () => resolve(null),
          { timeout: 5000, maximumAge: 60000 }
        );
      });
    } catch (_) {}
    try {
      await deliveryAction(pickupModal.order.id, "confirm_pickup", {
        otp, bag_ids: bagIds,
        latitude: coords?.latitude ?? null, longitude: coords?.longitude ?? null,
      });
      setPickupModal(null);
    } catch (err) {
      // Refresh bag list — another agent may have taken a selected bag
      try {
        const { data } = await api.get(`/delivery/available-bags/${pickupModal.order.vendor_id}`);
        setAvailableBags(data.bags || []);
      } catch (_) {}
      throw err;
    } finally {
      setConfirming(false);
    }
  }

  // Drop at vendor
  async function handleDrop(orderId) {
    setTransitBusy(orderId);
    setError("");
    try {
      await deliveryAction(orderId, "drop_at_vendor");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update status.");
    } finally {
      setTransitBusy(null);
    }
  }

  return (
    <Layout>
      {rideMapJob && (
        <RideMapModal
          job={rideMapJob}
          onClose={() => setRideMapJob(null)}
          onReach={handleReach}
          reaching={reaching}
        />
      )}
      {pickupModal && (
        <PickupModal
          order={pickupModal.order}
          bags={availableBags}
          bagsLoading={bagsLoading}
          onConfirm={handleConfirmPickup}
          onClose={() => setPickupModal(null)}
          confirming={confirming}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

        {/* Header */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 5px" }}>
            Deliveries
          </p>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 800, color: "#111827", margin: 0, lineHeight: 1.15 }}>
            Pickup Jobs
          </h1>
          <p style={{ fontSize: 13.5, color: "#9ca3af", margin: "6px 0 0" }}>
            Accept assignments, head to the customer, verify OTP, assign a bag.
          </p>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", color: "#dc2626", fontSize: 13, fontWeight: 600 }}>
            {error}
          </div>
        )}

        {/* Section 1 — New Assignments */}
        <section>
          <div style={S.sectionHead}>
            <h2 style={S.sectionTitle}>New Assignments</h2>
            <CountBadge count={newJobs.length} blue />
          </div>
          {newJobs.length === 0 ? (
            <EmptyState message="No new assignments right now" />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {newJobs.map(job => (
                <AssignmentCard key={job.id} job={job} onAccept={handleAccept} accepting={accepting} />
              ))}
            </div>
          )}
        </section>

        {/* Section 2 — Pending Pickup (delivery_assigned) */}
        <section>
          <div style={S.sectionHead}>
            <h2 style={S.sectionTitle}>Pending Pickup</h2>
            <CountBadge count={pendingPickup.length} />
          </div>
          {pendingPickup.length === 0 ? (
            <EmptyState message="No pending pickups" />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
              {pendingPickup.map(job => (
                <PendingPickupCard key={job.id} job={job} onReach={handleReach} reaching={reaching} onRide={setRideMapJob} />
              ))}
            </div>
          )}
        </section>

        {/* Section 3 — In Transit to Vendor (picked_up) */}
        {inTransit.length > 0 && (
          <section>
            <div style={S.sectionHead}>
              <h2 style={S.sectionTitle}>In Transit to Center Head</h2>
              <CountBadge count={inTransit.length} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {inTransit.map(job => (
                <TransitCard key={job.id} job={job} onDrop={handleDrop} transitBusy={transitBusy} />
              ))}
            </div>
          </section>
        )}

        {/* Section 4 — At Iron Shop (at_vendor) */}
        {atVendor.length > 0 && (
          <section>
            <div style={S.sectionHead}>
              <h2 style={S.sectionTitle}>Submitted to Center Head</h2>
              <CountBadge count={atVendor.length} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {atVendor.map(job => <AtVendorRow key={job.id} job={job} />)}
            </div>
          </section>
        )}

      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Layout>
  );
}
