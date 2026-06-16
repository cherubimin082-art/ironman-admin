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
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
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
  const [otp, setOtp]     = useState("");
  const [bagId, setBagId] = useState("");
  const [err, setErr]     = useState("");

  const showBag  = otp.length === 4;
  const canConfirm = otp.length === 4 && bagId && !confirming;

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await onConfirm(otp, bagId);
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
            onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
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
            Ask the customer for the OTP shown on their screen.
          </p>

          {/* Bag dropdown — appears when OTP is 4 digits */}
          {showBag && (
            <div style={{ marginTop: 18 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", display: "block", marginBottom: 8 }}>
                Assign Bag Number
              </label>
              {bagsLoading ? (
                <p style={{ fontSize: 12.5, color: "#9ca3af" }}>Loading available bags…</p>
              ) : bags.length === 0 ? (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "#dc2626", fontWeight: 600 }}>
                  No bags available at this vendor right now.
                </div>
              ) : (
                <select
                  value={bagId}
                  onChange={e => setBagId(e.target.value)}
                  style={{
                    width: "100%", padding: "11px 14px", borderRadius: 11, fontSize: 14, fontWeight: 600,
                    border: "2px solid #e5e7eb", outline: "none", background: "#fff",
                    appearance: "none", boxSizing: "border-box", cursor: "pointer",
                  }}
                  onFocus={e => { e.target.style.borderColor = "#3b82f6"; }}
                  onBlur={e => { e.target.style.borderColor = "#e5e7eb"; }}
                >
                  <option value="" disabled>Select a bag…</option>
                  {bags.map(b => (
                    <option key={b.id} value={b.id}>Bag #{b.bag_number}</option>
                  ))}
                </select>
              )}
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
              {confirming ? "Confirming…" : "Confirm Pickup"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── New Assignment card (vendor_accepted) ──────────────────────
function AssignmentCard({ job, onAccept, accepting }) {
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
        <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 14, marginTop: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total</span>
            <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 22, fontWeight: 800, color: "#111827" }}>₹{job.amount}</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <NavigateBtn job={job} compact />
            <button
              onClick={() => onAccept(job.id)}
              disabled={accepting === job.id}
              style={{
                flex: 1, padding: "11px 0", border: "none", borderRadius: 10,
                cursor: accepting === job.id ? "not-allowed" : "pointer",
                background: accepting === job.id ? "#e5e7eb" : "linear-gradient(135deg, #3b82f6, #DC2626)",
                color: accepting === job.id ? "#9ca3af" : "#fff",
                fontSize: 13, fontWeight: 700,
              }}
            >
              {accepting === job.id ? "Accepting..." : "Accept Assignment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Pending Pickup card (delivery_assigned) ────────────────────
function PendingPickupCard({ job, onReach, reaching, onRide }) {
  const busy = reaching === job.id;
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
          <div style={{ gridColumn: "1 / -1" }}>
            <p style={S.label}>Pickup Time</p>
            <p style={{ fontSize: 12.5, fontWeight: 600, color: "#374151", margin: 0 }}>{job.time_slot || "—"}</p>
          </div>
        </div>

        {/* Ride to Pickup — embedded map */}
        <button
          onClick={() => onRide(job)}
          style={{
            width: "100%", padding: "11px 0", border: "none", borderRadius: 10,
            cursor: "pointer",
            background: "linear-gradient(135deg, #10b981, #059669)",
            color: "#fff", fontSize: 13, fontWeight: 700,
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
            disabled={busy}
            style={{
              flex: 1, padding: "11px 0", border: "none", borderRadius: 10,
              cursor: busy ? "not-allowed" : "pointer",
              background: busy ? "#e5e7eb" : "linear-gradient(135deg, #3b82f6, #DC2626)",
              color: busy ? "#9ca3af" : "#fff", fontSize: 13, fontWeight: 700,
            }}
          >
            {busy ? "Notifying customer…" : "I've Reached"}
          </button>
        </div>
        <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", margin: 0 }}>
          "Ride to Pickup" shows a live map · "I've Reached" when you arrive
        </p>
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
          {job.bag_number && (
            <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
              Bag <span style={{ fontWeight: 700, color: "#374151" }}>#{job.bag_number}</span>
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
        {busy ? "Updating…" : "Submit to Vendor Shop"}
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
          {job.bag_number ? ` Bag #${job.bag_number}.` : ""} Waiting for ironing to complete…
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
    try {
      const { data } = await api.get(`/delivery/available-bags/${order.vendor_id}`);
      bags = data.bags || [];
    } catch (_) {}
    setAvailableBags(bags);
    setBagsLoading(false);
    setReaching(null);
    setPickupModal({ order });
  }

  // Confirm pickup (OTP + bag)
  async function handleConfirmPickup(otp, bagId) {
    if (!pickupModal) return;
    setConfirming(true);
    try {
      await deliveryAction(pickupModal.order.id, "confirm_pickup", { otp, bag_id: bagId });
      setPickupModal(null);
    } catch (err) {
      // Refresh bag list — another agent may have taken the selected bag
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
              <h2 style={S.sectionTitle}>In Transit to Vendor</h2>
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
              <h2 style={S.sectionTitle}>Submitted to Vendor</h2>
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
