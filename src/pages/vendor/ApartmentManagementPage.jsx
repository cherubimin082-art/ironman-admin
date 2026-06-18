import { useState, useEffect, useCallback } from "react";
import Layout from "../../components/shared/Layout";
import api from "../../services/api";
import { useWindowSize } from "../../hooks/useWindowSize";

const APARTMENTS = [
  "Green Valley Apartments",
  "Sunrise Residency",
  "Lake View Towers",
  "Palm Grove Apartments",
  "Maple Heights",
];

const TIME_SLOTS = {
  Morning: [
    "7:00 AM - 8:00 AM",
    "7:30 AM - 8:30 AM",
    "8:00 AM - 9:00 AM",
    "8:30 AM - 9:30 AM",
    "9:00 AM - 10:00 AM",
    "9:30 AM - 10:30 AM",
    "10:00 AM - 11:00 AM",
    "10:30 AM - 11:30 AM",
    "11:00 AM - 12:00 PM",
  ],
  Afternoon: [
    "12:00 PM - 1:00 PM",
    "1:00 PM - 2:00 PM",
    "2:00 PM - 3:00 PM",
    "3:00 PM - 4:00 PM",
    "4:00 PM - 5:00 PM",
  ],
  Evening: [
    "5:00 PM - 6:00 PM",
    "5:30 PM - 6:30 PM",
    "6:00 PM - 7:00 PM",
    "6:30 PM - 7:30 PM",
    "7:00 PM - 8:00 PM",
    "7:30 PM - 8:30 PM",
    "8:00 PM - 9:00 PM",
  ],
};

const STATUS_COLORS = {
  pending:             { bg: "#fffbeb", color: "#d97706", border: "#fde68a" },
  vendor_accepted:     { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  delivery_assigned:   { bg: "#FEF2F2", color: "#B91C1C", border: "#FECACA" },
  picked_up:           { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  at_vendor:           { bg: "#fefce8", color: "#ca8a04", border: "#fef08a" },
  in_progress:         { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  ready_for_delivery:  { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  out_for_delivery:    { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" },
  delivered:           { bg: "#f9fafb", color: "#6b7280", border: "#e5e7eb" },
  cancelled:           { bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
};

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || { bg: "#f9fafb", color: "#6b7280", border: "#e5e7eb" };
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      whiteSpace: "nowrap",
    }}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function parseItems(raw) {
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
    return arr.filter(i => i?.garment_name).map(i => `${i.quantity}× ${i.garment_name}`).join(", ") || "—";
  } catch { return "—"; }
}

const fmtDate = d => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default function ApartmentManagementPage() {
  const [selectedApt, setSelectedApt] = useState("");
  const [savedSlots, setSavedSlots]   = useState({});    // { [apartment]: { pickup_time, delivery_time } }
  const [pickupTime, setPickupTime]   = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [saving, setSaving]           = useState(false);
  const [saveMsg, setSaveMsg]         = useState("");
  const [saveErr, setSaveErr]         = useState("");

  const [orders, setOrders]           = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersErr, setOrdersErr]     = useState("");
  const { isMobile } = useWindowSize();

  // Fetch all saved slot configs for this vendor on mount
  useEffect(() => {
    api.get("/vendor/apartment-slots")
      .then(({ data }) => {
        const map = {};
        (data.slots || []).forEach(s => { map[s.apartment] = { pickup_time: s.pickup_time, delivery_time: s.delivery_time }; });
        setSavedSlots(map);
      })
      .catch(() => {});
  }, []);

  // When apartment changes, pre-fill fields and fetch orders
  const fetchOrders = useCallback(async (apt) => {
    if (!apt) return;
    setLoadingOrders(true);
    setOrdersErr("");
    setOrders([]);
    try {
      const { data } = await api.get(`/vendor/orders-by-apartment/${encodeURIComponent(apt)}`);
      setOrders(data.orders || []);
    } catch {
      setOrdersErr("Failed to load orders.");
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  const handleAptChange = (apt) => {
    setSelectedApt(apt);
    setSaveMsg("");
    setSaveErr("");
    const saved = savedSlots[apt];
    setPickupTime(saved?.pickup_time || "");
    setDeliveryTime(saved?.delivery_time || "");
    fetchOrders(apt);
  };

  const handleSave = async () => {
    if (!selectedApt)        { setSaveErr("Select an apartment first."); return; }
    if (!pickupTime.trim())  { setSaveErr("Pickup time is required."); return; }
    if (!deliveryTime.trim()) { setSaveErr("Delivery time is required."); return; }
    setSaveErr("");
    setSaving(true);
    try {
      await api.put("/vendor/apartment-slot", {
        apartment:     selectedApt,
        pickup_time:   pickupTime.trim(),
        delivery_time: deliveryTime.trim(),
      });
      setSavedSlots(prev => ({
        ...prev,
        [selectedApt]: { pickup_time: pickupTime.trim(), delivery_time: deliveryTime.trim() },
      }));
      setSaveMsg("Times saved successfully.");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch (err) {
      setSaveErr(err?.response?.data?.message || "Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const selectStyle = (hasValue) => ({
    width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 10,
    padding: "10px 40px 10px 14px", fontSize: 14,
    color: hasValue ? "#111827" : "#9ca3af",
    background: "#fff", outline: "none", boxSizing: "border-box",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    appearance: "none", cursor: "pointer",
  });
  const labelStyle = { fontSize: 11, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 7 };

  const ChevronDown = () => (
    <svg style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", width: 17, height: 17, color: "#9ca3af" }}
      fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );

  return (
    <Layout>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

        {/* ── Page Header ── */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#DC2626", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 5px" }}>
            Vendor Tools
          </p>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 800, color: "#111827", margin: 0, lineHeight: 1.15 }}>
            Apartment Management
          </h1>
          <p style={{ fontSize: 13.5, color: "#9ca3af", margin: "6px 0 0", fontWeight: 400 }}>
            Set pickup & delivery times per apartment and view all orders for each.
          </p>
        </div>

        {/* ── Apartment Selector ── */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "22px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <label style={labelStyle}>Select Apartment</label>
          <div style={{ position: "relative", maxWidth: 400 }}>
            <select
              value={selectedApt}
              onChange={e => handleAptChange(e.target.value)}
              style={selectStyle(!!selectedApt)}
            >
              <option value="" disabled>Choose an apartment…</option>
              {APARTMENTS.map(apt => (
                <option key={apt} value={apt}>{apt}</option>
              ))}
            </select>
            <svg style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", width: 17, height: 17, color: "#9ca3af" }}
              fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {/* Saved indicator dots */}
          {selectedApt && (
            <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {APARTMENTS.map(apt => {
                const isSaved = !!savedSlots[apt];
                const isSelected = apt === selectedApt;
                return (
                  <button
                    key={apt}
                    onClick={() => handleAptChange(apt)}
                    style={{
                      fontSize: 11.5, fontWeight: 700, padding: "4px 11px", borderRadius: 99, border: "none",
                      cursor: "pointer",
                      background: isSelected ? "#FEF2F2" : isSaved ? "#f0fdf4" : "#f9fafb",
                      color:     isSelected ? "#B91C1C" : isSaved ? "#15803d" : "#9ca3af",
                      outline:   isSelected ? "1.5px solid #FECACA" : isSaved ? "1.5px solid #bbf7d0" : "1.5px solid #e5e7eb",
                    }}
                  >
                    {isSaved ? "✓ " : ""}{apt.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Slot Editor + Orders (only when apartment is selected) ── */}
        {selectedApt && (
          <>
            {/* ── Slot Editor ── */}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "22px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <div style={{ marginBottom: 18 }}>
                <p style={{ fontSize: 13, fontWeight: 800, color: "#111827", margin: "0 0 3px" }}>
                  Pickup & Delivery Times
                </p>
                <p style={{ fontSize: 12.5, color: "#9ca3af", margin: 0 }}>
                  Set the default times for <strong style={{ color: "#374151" }}>{selectedApt}</strong>. Customers see these when placing orders.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Pickup Time</label>
                  <div style={{ position: "relative" }}>
                    <select
                      value={pickupTime}
                      onChange={e => { setPickupTime(e.target.value); setSaveErr(""); }}
                      style={selectStyle(!!pickupTime)}
                    >
                      <option value="" disabled>Select pickup time…</option>
                      {Object.entries(TIME_SLOTS).map(([group, slots]) => (
                        <optgroup key={group} label={group}>
                          {slots.map(slot => (
                            <option key={slot} value={slot}>{slot}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <ChevronDown />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Delivery Time</label>
                  <div style={{ position: "relative" }}>
                    <select
                      value={deliveryTime}
                      onChange={e => { setDeliveryTime(e.target.value); setSaveErr(""); }}
                      style={selectStyle(!!deliveryTime)}
                    >
                      <option value="" disabled>Select delivery time…</option>
                      {Object.entries(TIME_SLOTS).map(([group, slots]) => (
                        <optgroup key={group} label={group}>
                          {slots.map(slot => (
                            <option key={slot} value={slot}>{slot}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                    <ChevronDown />
                  </div>
                </div>
              </div>

              {saveErr && (
                <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "10px 14px" }}>
                  <svg style={{ width: 15, height: 15, color: "#dc2626", flexShrink: 0 }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <span style={{ fontSize: 12.5, color: "#dc2626" }}>{saveErr}</span>
                </div>
              )}

              {saveMsg && (
                <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "10px 14px" }}>
                  <svg style={{ width: 15, height: 15, color: "#15803d", flexShrink: 0 }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "#15803d" }}>{saveMsg}</span>
                </div>
              )}

              <div style={{ marginTop: 18 }}>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    background: saving ? "#a5b4fc" : "#B91C1C",
                    color: "#fff", border: "none", borderRadius: 10,
                    padding: "10px 24px", fontSize: 13.5, fontWeight: 700,
                    cursor: saving ? "not-allowed" : "pointer",
                    transition: "background 0.15s",
                  }}
                >
                  {saving && (
                    <span style={{
                      width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff", borderRadius: "50%",
                      display: "inline-block", animation: "spin 0.7s linear infinite",
                    }} />
                  )}
                  {saving ? "Saving…" : "Save Times"}
                </button>
              </div>
            </div>

            {/* ── Orders for this apartment ── */}
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              {/* Section header */}
              <div style={{ padding: "18px 24px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "#111827", margin: 0 }}>
                    Orders — {selectedApt}
                  </p>
                  <p style={{ fontSize: 12, color: "#9ca3af", margin: "3px 0 0" }}>
                    All orders from this apartment, any status
                  </p>
                </div>
                {!loadingOrders && (
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    background: "#FEF2F2", color: "#B91C1C",
                    border: "1px solid #FECACA", borderRadius: 99,
                    padding: "3px 12px",
                  }}>
                    {orders.length} order{orders.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Loading */}
              {loadingOrders && (
                <div style={{ padding: "40px 24px", textAlign: "center" }}>
                  <div style={{
                    width: 28, height: 28, border: "3px solid #e5e7eb", borderTopColor: "#DC2626",
                    borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 12px",
                  }} />
                  <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Loading orders…</p>
                </div>
              )}

              {/* Error */}
              {!loadingOrders && ordersErr && (
                <div style={{ padding: "24px", color: "#dc2626", fontSize: 13 }}>{ordersErr}</div>
              )}

              {/* Empty */}
              {!loadingOrders && !ordersErr && orders.length === 0 && (
                <div style={{ padding: "40px 24px", textAlign: "center" }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>📦</div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "#374151", margin: "0 0 4px" }}>No orders yet</p>
                  <p style={{ fontSize: 12.5, color: "#9ca3af", margin: 0 }}>No orders have been placed from {selectedApt}.</p>
                </div>
              )}

              {/* Orders table */}
              {!loadingOrders && orders.length > 0 && (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: "#f9fafb" }}>
                        {["Order ID", "Customer", "Garments", "Pickup Date", "Pickup Time", "Delivery Time", "Amount", "Status"].map(h => (
                          <th key={h} style={{
                            padding: "10px 16px", textAlign: "left",
                            fontSize: 11, fontWeight: 700, color: "#9ca3af",
                            textTransform: "uppercase", letterSpacing: "0.06em",
                            borderBottom: "1px solid #f3f4f6", whiteSpace: "nowrap",
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order, idx) => (
                        <tr key={order.id} style={{ background: idx % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "12px 16px", fontWeight: 700, color: "#B91C1C", whiteSpace: "nowrap" }}>
                            {order.order_code || `#${order.id}`}
                          </td>
                          <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0 }}>{order.customer_name}</p>
                            <p style={{ fontSize: 11.5, color: "#9ca3af", margin: "2px 0 0" }}>{order.customer_phone}</p>
                          </td>
                          <td style={{ padding: "12px 16px", color: "#374151", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {parseItems(order.items)}
                          </td>
                          <td style={{ padding: "12px 16px", color: "#374151", whiteSpace: "nowrap" }}>
                            {fmtDate(order.pickup_date)}
                          </td>
                          <td style={{ padding: "12px 16px", color: "#374151", whiteSpace: "nowrap" }}>
                            {order.time_slot || "—"}
                          </td>
                          <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                            {order.apt_delivery_time
                              ? <span style={{ color: "#2563eb", fontWeight: 600 }}>{order.apt_delivery_time}</span>
                              : <span style={{ color: "#9ca3af" }}>—</span>}
                          </td>
                          <td style={{ padding: "12px 16px", fontWeight: 700, color: "#111827", whiteSpace: "nowrap" }}>
                            ₹{parseFloat(order.total || 0).toFixed(0)}
                          </td>
                          <td style={{ padding: "12px 16px" }}>
                            <StatusBadge status={order.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Placeholder when no apartment selected */}
        {!selectedApt && (
          <div style={{
            background: "#fff", border: "1.5px dashed #e5e7eb", borderRadius: 16,
            padding: "50px 24px", textAlign: "center",
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🏢</div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#374151", margin: "0 0 6px" }}>Select an Apartment</p>
            <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
              Choose an apartment above to manage pickup/delivery times and view its orders.
            </p>
          </div>
        )}

      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Layout>
  );
}
