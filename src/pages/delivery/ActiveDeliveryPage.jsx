import { useState, useRef, useEffect } from "react";
import Layout from "../../components/shared/Layout";
import StatusBadge from "../../components/shared/StatusBadge";
import { useOrders } from "../../context/OrderContext";
import api from "../../services/api";
import { useWindowSize } from "../../hooks/useWindowSize";

const ACTIVE_STATUSES = ["ready_for_delivery", "picked_from_vendor", "out_for_delivery", "delivery_rescheduled"];

// ── OTP Modal ─────────────────────────────────────────────────
function OtpModal({ title, hint, onVerify, onClose, loading }) {
  const [otp, setOtp] = useState("");
  const [err, setErr]  = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await onVerify(otp);
    } catch (ex) {
      setErr(ex.response?.data?.message || "Incorrect OTP. Try again.");
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: "32px 28px",
        width: "100%", maxWidth: 380, boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
      }}>
        <h2 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 800, color: "#111827", margin: "0 0 8px" }}>
          {title}
        </h2>
        <p style={{ fontSize: 13, color: "#6b7280", margin: "0 0 24px", lineHeight: 1.6 }}>{hint}</p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            placeholder="Enter 4-digit OTP"
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
            style={{
              width: "100%", padding: "14px 16px", borderRadius: 12, fontSize: 20, fontWeight: 800,
              letterSpacing: "0.3em", textAlign: "center",
              border: err ? "2px solid #ef4444" : "2px solid #e5e7eb",
              outline: "none", boxSizing: "border-box",
              transition: "border-color 0.15s",
            }}
            onFocus={e => { if (!err) e.target.style.borderColor = "#3b82f6"; }}
            onBlur={e => { if (!err) e.target.style.borderColor = "#e5e7eb"; }}
            autoFocus
          />
          {err && <p style={{ fontSize: 12, color: "#ef4444", margin: "8px 0 0", fontWeight: 600 }}>{err}</p>}

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1, padding: "12px 0", border: "1.5px solid #e5e7eb", borderRadius: 11, cursor: "pointer",
                background: "#fff", color: "#374151", fontSize: 13, fontWeight: 700,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={otp.length !== 4 || loading}
              style={{
                flex: 2, padding: "12px 0", border: "none", borderRadius: 11,
                cursor: otp.length !== 4 || loading ? "not-allowed" : "pointer",
                background: otp.length === 4 && !loading ? "linear-gradient(135deg, #3b82f6, #DC2626)" : "#e5e7eb",
                color: otp.length === 4 && !loading ? "#fff" : "#9ca3af",
                fontSize: 13, fontWeight: 700,
              }}
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Navigate helper ───────────────────────────────────────────
function mapsUrl(order) {
  if (order.customer_latitude && order.customer_longitude) {
    return `https://www.google.com/maps/dir/?api=1&destination=${order.customer_latitude},${order.customer_longitude}&travelmode=driving`;
  }
  const addr = order.customer_address;
  if (addr) return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}&travelmode=driving`;
  return null;
}

// ── Action Button ─────────────────────────────────────────────
function ActionBtn({ label, onClick, color = "#10b981", disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%", padding: "11px 0", border: "none", borderRadius: 10,
        cursor: disabled ? "not-allowed" : "pointer",
        background: disabled ? "#e5e7eb" : `linear-gradient(135deg, ${color}, ${color}cc)`,
        color: disabled ? "#9ca3af" : "#fff",
        fontSize: 13, fontWeight: 700, letterSpacing: "0.02em",
        transition: "opacity 0.15s, transform 0.15s",
      }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
      onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "none"; }}
    >
      {label}
    </button>
  );
}

// ── Per-order action area ─────────────────────────────────────
function OrderActions({ order, onAction, busyId }) {
  const { id, status } = order;
  const busy = busyId === id;

  if (status === "ready_for_delivery") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <ActionBtn label={busy ? "Updating..." : "Picked from Vendor"} disabled={busy}
          color="#10b981" onClick={() => onAction(id, "pick_from_vendor")} />
        <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", margin: 0 }}>
          Tap after collecting ironed clothes from the vendor shop
        </p>
      </div>
    );
  }

  if (status === "picked_from_vendor") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <ActionBtn label={busy ? "Starting..." : "Start Ride to Customer"} disabled={busy}
          color="#DC2626" onClick={() => onAction(id, "start_ride")} />
        <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", margin: 0 }}>
          Tap to begin the final delivery ride to the customer
        </p>
      </div>
    );
  }

  if (status === "out_for_delivery") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <ActionBtn label={busy ? "Notifying..." : "End Ride — Send OTP"} disabled={busy}
          color="#f97316" onClick={() => onAction(id, "end_ride")} />
        <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", margin: 0 }}>
          Tap when you arrive at customer — sends them a delivery OTP
        </p>
      </div>
    );
  }

  if (status === "delivery_rescheduled") {
    const delivDateStr = order.delivery_date ? String(order.delivery_date).slice(0, 10) : null;
    const todayStr = new Date().toLocaleDateString("en-CA");
    const canDeliver = delivDateStr ? delivDateStr <= todayStr : false;
    const dateLabel = delivDateStr
      ? new Date(delivDateStr + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "a new date";

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 13px", display: "flex", alignItems: "flex-start", gap: 9 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2 }}>
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <p style={{ fontSize: 11.5, color: "#92400e", margin: 0, fontWeight: 600 }}>
            {canDeliver
              ? `Rescheduled date is today — you can deliver now`
              : `Customer rescheduled for ${dateLabel}`}
          </p>
        </div>
        <ActionBtn
          label={busy ? "Starting..." : "Start Delivery Again"}
          disabled={!canDeliver || busy}
          color="#DC2626"
          onClick={() => onAction(id, "restart_delivery")}
        />
        {!canDeliver && (
          <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", margin: 0 }}>
            Available on {dateLabel}
          </p>
        )}
      </div>
    );
  }

  return null;
}

// ── Location sharing ──────────────────────────────────────────
function useLocationShare(orderId) {
  const timerRef = useRef(null);
  const [sharing, setSharing] = useState(false);

  function start() {
    if (sharing) return;
    setSharing(true);
    function send() {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(pos => {
        api.post(`/delivery/update-location/${orderId}`, {
          latitude:  pos.coords.latitude,
          longitude: pos.coords.longitude,
        }).catch(() => {});
      }, () => {});
    }
    send();
    timerRef.current = setInterval(send, 12000);
  }

  function stop() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setSharing(false);
  }

  return { sharing, start, stop };
}

// ── Order Detail Card ─────────────────────────────────────────
function OrderCard({ order, onAction, busyId, onShowOtpModal }) {
  const { sharing, start, stop } = useLocationShare(order.id);

  const needOtp = order.status === "out_for_delivery";
  const autoStartedRef = useRef(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (needOtp && !autoStartedRef.current) {
      autoStartedRef.current = true;
      start();
    }
    if (!needOtp) autoStartedRef.current = false;
  }, [needOtp]);

  function handleAction(id, action) {
    if (action === "end_ride") {
      onShowOtpModal(id, "delivery");
    } else {
      onAction(id, action);
    }
  }

  return (
    <div style={{
      background: "#fff", borderRadius: 18, border: "1px solid #e5e7eb",
      boxShadow: "0 2px 10px rgba(0,0,0,0.05)", overflow: "hidden",
    }}>
      {/* Status bar */}
      <div style={{ height: 4, background: "linear-gradient(90deg, #10b981, #3b82f6)" }} />

      <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 3px" }}>
              Order ID
            </p>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 18, fontWeight: 800, color: "#111827", margin: 0 }}>
              {order.order_code || `#${order.id}`}
            </p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        <div style={{ height: 1, background: "#f3f4f6" }} />

        {/* Customer */}
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>
            Customer
          </p>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11, background: "#f0fdf4",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 15, fontWeight: 800, color: "#10b981", flexShrink: 0,
            }}>
              {order.customer?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0 }}>{order.customer}</p>
              {order.apartment && (
                <p style={{ fontSize: 11.5, fontWeight: 700, color: "#059669", margin: "2px 0 0" }}>{order.apartment}</p>
              )}
              <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0" }}>{order.customer_address || "—"}</p>
              {(() => {
                const url = mapsUrl(order);
                return url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      marginTop: 8, padding: "6px 14px",
                      borderRadius: 8, background: "#eff6ff", color: "#1d4ed8",
                      fontSize: 11, fontWeight: 700, textDecoration: "none",
                      border: "1px solid #bfdbfe",
                    }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
                      <path d="M3 11l19-9-9 19-2-8-8-2z"/>
                    </svg>
                    Navigate
                    {order.customer_latitude ? " (GPS)" : " (Address)"}
                  </a>
                ) : null;
              })()}
            </div>
          </div>
        </div>

        {/* Items + amount */}
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 4px" }}>
              Items
            </p>
            <p style={{ fontSize: 12.5, color: "#374151", margin: 0 }}>{order.items}</p>
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 4px" }}>
              Amount
            </p>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>
              ₹{order.amount}
            </p>
          </div>
        </div>

        {/* Bag number(s) */}
        {(order.bag_numbers || order.bag_number) && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "8px 13px" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, flexShrink: 0 }}>
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
            </svg>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "#15803d" }}>
              {String(order.bag_numbers || order.bag_number).split(",").map(n => `#${n.trim()}`).join(", ")}
            </span>
          </div>
        )}

        {/* Location sharing (when active delivery) */}
        {needOtp && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "#f9fafb", borderRadius: 10, border: "1px solid #f3f4f6" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: sharing ? "#22c55e" : "#d1d5db", boxShadow: sharing ? "0 0 0 3px rgba(34,197,94,0.25)" : "none" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
                {sharing ? "Sharing location" : "Location off"}
              </span>
            </div>
            <button
              onClick={sharing ? stop : start}
              style={{
                padding: "5px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700,
                background: sharing ? "#fef2f2" : "#f0fdf4",
                color: sharing ? "#dc2626" : "#16a34a",
                transition: "opacity 0.15s",
              }}
            >
              {sharing ? "Stop" : "Share"}
            </button>
          </div>
        )}

        {/* Actions */}
        <OrderActions order={order} onAction={handleAction} busyId={busyId} />
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function ActiveDeliveryPage() {
  const { pickupJobs, deliveryAction, deliveryAlert, clearDeliveryAlert } = useOrders();
  const [busyId, setBusyId]     = useState(null);
  const { isMobile } = useWindowSize();
  const [otpModal, setOtpModal] = useState(null); // { orderId, type: "pickup"|"delivery" }
  const [otpLoading, setOtpLoading] = useState(false);

  const activeOrders = pickupJobs.filter(j => ACTIVE_STATUSES.includes(j.status));

  async function handleAction(orderId, action, body = {}) {
    setBusyId(orderId);
    try {
      await deliveryAction(orderId, action, body);
    } catch (err) {
      console.error("Delivery action failed:", err.response?.data || err.message);
    } finally {
      setBusyId(null);
    }
  }

  function showOtpModal(orderId, type) {
    // Trigger the "reached/end-ride" notification first (generates & sends OTP), then show input
    const action = type === "pickup" ? "reach_pickup" : "end_ride";
    setBusyId(orderId);
    deliveryAction(orderId, action)
      .catch(() => {})
      .finally(() => {
        setBusyId(null);
        setOtpModal({ orderId, type });
      });
  }

  async function handleOtpVerify(otp) {
    if (!otpModal) return;
    const action = otpModal.type === "pickup" ? "verify_pickup_otp" : "verify_delivery_otp";
    setOtpLoading(true);
    // Capture GPS for delivery confirmation; skip silently if unavailable
    let coords = null;
    if (otpModal.type === "delivery") {
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
    }
    try {
      await deliveryAction(otpModal.orderId, action, {
        otp,
        latitude: coords?.latitude ?? null, longitude: coords?.longitude ?? null,
      });
      setOtpModal(null);
    } finally {
      setOtpLoading(false);
    }
  }

  return (
    <Layout>
      {deliveryAlert && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
          zIndex: 1100, width: "calc(100% - 32px)", maxWidth: 480,
          background: "#065f46", borderRadius: 16,
          boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
          display: "flex", alignItems: "center", gap: 14, padding: "16px 18px",
          animation: "slideDown 0.3s ease",
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
              <path d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: "white", margin: "0 0 2px" }}>Ironing Complete!</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", margin: 0, fontWeight: 500 }}>
              Order #{deliveryAlert.orderId} — Pick up from vendor and deliver to customer
            </p>
          </div>
          <button onClick={clearDeliveryAlert} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", padding: 4, flexShrink: 0, display: "flex" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="18" height="18"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      )}
      {otpModal && (
        <OtpModal
          title={otpModal.type === "pickup" ? "Verify Pickup OTP" : "Verify Delivery OTP"}
          hint={otpModal.type === "pickup"
            ? "Ask the customer for the 4-digit OTP sent to their WhatsApp."
            : "Ask the customer for the 4-digit delivery OTP sent to their WhatsApp."}
          onVerify={handleOtpVerify}
          onClose={() => setOtpModal(null)}
          loading={otpLoading}
        />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

        {/* Page Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 5px" }}>
              Deliveries
            </p>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 800, color: "#111827", margin: 0, lineHeight: 1.15 }}>
              Active Deliveries
            </h1>
            <p style={{ fontSize: 13.5, color: "#9ca3af", margin: "6px 0 0" }}>
              Manage your current pickups and deliveries step by step.
            </p>
          </div>
          {activeOrders.length > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 7,
              background: "#fffbeb", border: "1px solid #fde68a",
              borderRadius: 10, padding: "9px 16px",
            }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#f59e0b" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "#d97706" }}>
                {activeOrders.length} Active
              </span>
            </div>
          )}
        </div>

        {/* Status legend */}
        <div style={{
          background: "#f8fafc", border: "1px solid #f1f5f9", borderRadius: 14, padding: "14px 18px",
        }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 10px" }}>
            Order Flow
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {[
              { label: "Ready", color: "#10b981" },
              { label: "→" },
              { label: "Picked from Vendor", color: "#DC2626" },
              { label: "→" },
              { label: "Start Ride", color: "#f97316" },
              { label: "→" },
              { label: "End Ride", color: "#c2410c" },
              { label: "→" },
              { label: "Delivery OTP", color: "#16a34a" },
            ].map((item, i) => (
              item.label === "→"
                ? <span key={i} style={{ fontSize: 11, color: "#d1d5db" }}>→</span>
                : <span key={i} style={{ fontSize: 10.5, fontWeight: 700, color: item.color, background: item.color + "12", borderRadius: 6, padding: "2px 8px" }}>{item.label}</span>
            ))}
          </div>
        </div>

        {/* Orders */}
        {activeOrders.length === 0 ? (
          <div style={{
            background: "#fff", border: "2px dashed #e5e7eb",
            borderRadius: 16, padding: "60px 24px", textAlign: "center",
          }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#374151", margin: "0 0 6px" }}>
              No active deliveries
            </p>
            <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
              Accept assignments from the Pickup Jobs page to see them here.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(340px, 1fr))", gap: 20 }}>
            {activeOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onAction={handleAction}
                busyId={busyId}
                onShowOtpModal={showOtpModal}
              />
            ))}
          </div>
        )}

      </div>
      <style>{`@keyframes slideDown { from { opacity:0; transform:translateX(-50%) translateY(-12px); } to { opacity:1; transform:translateX(-50%) translateY(0); } }`}</style>
    </Layout>
  );
}
