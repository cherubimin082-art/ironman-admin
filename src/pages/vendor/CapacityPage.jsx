import { useState, useEffect, useCallback } from "react";
import Layout from "../../components/shared/Layout";
import api from "../../services/api";

const APARTMENTS = [
  "Green Valley Apartments",
  "Sunrise Residency",
  "Lake View Towers",
  "Palm Grove Apartments",
  "Maple Heights",
];

const labelSt = {
  fontSize: 11, fontWeight: 700, color: "#6b7280",
  textTransform: "uppercase", letterSpacing: "0.08em",
  display: "block", marginBottom: 7,
};
const selectSt = (hasVal) => ({
  width: "100%", border: "1.5px solid #e5e7eb", borderRadius: 10,
  padding: "10px 40px 10px 14px", fontSize: 14,
  color: hasVal ? "#111827" : "#9ca3af",
  background: "#fff", outline: "none", boxSizing: "border-box",
  appearance: "none", cursor: "pointer",
});

function ChevronDown() {
  return (
    <svg style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", width: 17, height: 17, color: "#9ca3af" }}
      fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function Alert({ type, msg }) {
  if (!msg) return null;
  const ok = type === "ok";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      background: ok ? "#f0fdf4" : "#fef2f2",
      border: `1px solid ${ok ? "#bbf7d0" : "#fecaca"}`,
      borderRadius: 10, padding: "10px 14px",
    }}>
      {ok
        ? <svg style={{ width: 15, height: 15, color: "#15803d", flexShrink: 0 }} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        : <svg style={{ width: 15, height: 15, color: "#dc2626", flexShrink: 0 }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      }
      <span style={{ fontSize: 12.5, fontWeight: ok ? 700 : 400, color: ok ? "#15803d" : "#dc2626" }}>{msg}</span>
    </div>
  );
}

// Confirm overlay for Delete Limit
function ConfirmModal({ apartment, onConfirm, onCancel, saving }) {
  return (
    <div
      onClick={e => e.target === e.currentTarget && onCancel()}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(15,23,42,0.45)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div style={{
        background: "#fff", borderRadius: 18, boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
        width: "100%", maxWidth: 420, padding: 28,
      }}>
        <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 18, fontWeight: 800, color: "#111827", margin: "0 0 12px" }}>
          Remove Capacity Limit
        </h2>
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "14px 16px", marginBottom: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#dc2626", margin: "0 0 6px" }}>⚠️ Orders will be unlimited</p>
          <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.6 }}>
            Remove the daily order cap for <strong>{apartment}</strong>?
            Customers will be able to place unlimited orders for any date.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: "11px 0", borderRadius: 10,
            border: "1.5px solid #e5e7eb", background: "#fff",
            color: "#374151", fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={onConfirm} disabled={saving} style={{
            flex: 2, padding: "11px 0", borderRadius: 10, border: "none",
            background: saving ? "#e5e7eb" : "#dc2626",
            color: saving ? "#9ca3af" : "#fff",
            fontSize: 13, fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
          }}>{saving ? "Removing…" : "Remove Limit"}</button>
        </div>
      </div>
    </div>
  );
}

export default function CapacityPage() {
  const [capacities, setCapacities]   = useState({});  // { apartment: max_orders_per_day }
  const [selectedApt, setSelectedApt] = useState("");
  const [limitInput, setLimitInput]   = useState("");   // string from <input>
  const [currentLimit, setCurrentLimit] = useState(null); // null = no limit set

  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveMsg, setSaveMsg]   = useState("");
  const [saveErr, setSaveErr]   = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [loadingApt, setLoadingApt]   = useState(false);

  // Load all capacity settings on mount (for overview chips)
  const loadAll = useCallback(async () => {
    try {
      const { data } = await api.get("/vendor/capacity");
      const map = {};
      (data.capacities || []).forEach(c => { map[c.apartment] = c.max_orders_per_day; });
      setCapacities(map);
    } catch (_) {}
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // When apartment changes, fetch its specific limit
  const handleAptChange = async (apt) => {
    setSelectedApt(apt);
    setSaveMsg(""); setSaveErr("");
    setLoadingApt(true);
    try {
      const { data } = await api.get(`/vendor/capacity/${encodeURIComponent(apt)}`);
      const val = data.max_orders_per_day;
      setCurrentLimit(val);
      setLimitInput(val !== null && val !== undefined ? String(val) : "");
    } catch (_) {
      setCurrentLimit(null); setLimitInput("");
    } finally {
      setLoadingApt(false);
    }
  };

  const handleSave = async () => {
    if (!selectedApt) return setSaveErr("Select an apartment first.");
    const parsed = parseInt(limitInput);
    if (!limitInput || isNaN(parsed) || parsed < 1)
      return setSaveErr("Enter a valid number (minimum 1).");
    setSaveErr(""); setSaving(true);
    try {
      await api.put("/vendor/capacity", { apartment: selectedApt, max_orders_per_day: parsed });
      setCurrentLimit(parsed);
      setCapacities(prev => ({ ...prev, [selectedApt]: parsed }));
      setSaveMsg(`Limit saved: max ${parsed} orders/day for ${selectedApt}`);
      setTimeout(() => setSaveMsg(""), 4000);
    } catch (err) {
      setSaveErr(err?.response?.data?.message || "Failed to save. Try again.");
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/vendor/capacity/${encodeURIComponent(selectedApt)}`);
      setCurrentLimit(null); setLimitInput("");
      setCapacities(prev => { const n = { ...prev }; delete n[selectedApt]; return n; });
      setShowConfirm(false);
      setSaveMsg(`Limit removed — ${selectedApt} now accepts unlimited orders.`);
      setTimeout(() => setSaveMsg(""), 4000);
    } catch (err) {
      setShowConfirm(false);
      setSaveErr(err?.response?.data?.message || "Failed to remove limit.");
    } finally { setDeleting(false); }
  };

  const savedApts   = Object.keys(capacities);
  const limitedCount = savedApts.length;

  return (
    <Layout>
      <div style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 720 }}>

        {/* Header */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 5px" }}>
            Shop Operations
          </p>
          <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 28, fontWeight: 800, color: "#111827", margin: 0, lineHeight: 1.15 }}>
            Capacity Management
          </h1>
          <p style={{ fontSize: 13.5, color: "#9ca3af", margin: "6px 0 0" }}>
            Set daily order limits per apartment. Customers are blocked from booking once the limit is reached for a date.
          </p>
        </div>

        {/* Overview strip */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <div style={{
            flex: 1, minWidth: 140,
            background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 14,
            padding: "16px 20px", display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, background: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="1.8" style={{ width: 22, height: 22 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
              </svg>
            </div>
            <div>
              <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 26, fontWeight: 800, color: "#d97706", margin: 0, lineHeight: 1 }}>
                {limitedCount}
              </p>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#92400e", margin: "3px 0 0" }}>Apartments with Limits</p>
            </div>
          </div>

          <div style={{
            flex: 1, minWidth: 140,
            background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 14,
            padding: "16px 20px", display: "flex", alignItems: "center", gap: 14,
          }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12, background: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" style={{ width: 22, height: 22 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 26, fontWeight: 800, color: "#374151", margin: 0, lineHeight: 1 }}>
                {APARTMENTS.length - limitedCount}
              </p>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", margin: "3px 0 0" }}>Unlimited</p>
            </div>
          </div>
        </div>

        {/* Apartment selector card */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "22px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <label style={labelSt}>Select Apartment</label>
          <div style={{ position: "relative", maxWidth: 440 }}>
            <select value={selectedApt} onChange={e => handleAptChange(e.target.value)} style={selectSt(!!selectedApt)}>
              <option value="" disabled>Choose an apartment…</option>
              {APARTMENTS.map(apt => (
                <option key={apt} value={apt}>{apt}</option>
              ))}
            </select>
            <ChevronDown />
          </div>

          {/* Quick-jump chips */}
          {selectedApt && (
            <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {APARTMENTS.map(apt => {
                const hasLimit = capacities[apt] !== undefined;
                const isSel    = apt === selectedApt;
                return (
                  <button key={apt} onClick={() => handleAptChange(apt)} style={{
                    fontSize: 11.5, fontWeight: 700, padding: "4px 12px", borderRadius: 99,
                    border: "none", cursor: "pointer",
                    background: isSel ? "#fef3c7" : hasLimit ? "#f0fdf4" : "#f9fafb",
                    color:      isSel ? "#92400e" : hasLimit ? "#15803d" : "#9ca3af",
                    outline:    isSel ? "1.5px solid #fde68a" : hasLimit ? "1.5px solid #bbf7d0" : "1.5px solid #e5e7eb",
                  }}>
                    {hasLimit ? `✓ ${apt.split(" ")[0]} (${capacities[apt]}/day)` : apt.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Limit editor — shown when apartment is selected */}
        {selectedApt && (
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>

            {/* Section title + status badge */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 22 }}>
              <div>
                <p style={{ fontSize: 14, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>
                  Daily Order Limit — {selectedApt}
                </p>
                <p style={{ fontSize: 12.5, color: "#9ca3af", margin: 0 }}>
                  {currentLimit !== null
                    ? `Currently capped at ${currentLimit} orders/day. Update below.`
                    : "No limit set — this apartment accepts unlimited orders."}
                </p>
              </div>
              <span style={{
                fontSize: 11.5, fontWeight: 700, padding: "4px 12px", borderRadius: 99,
                background: currentLimit !== null ? "#fffbeb" : "#f0fdf4",
                color:      currentLimit !== null ? "#d97706"  : "#15803d",
                border:     `1px solid ${currentLimit !== null ? "#fde68a" : "#bbf7d0"}`,
                whiteSpace: "nowrap",
              }}>
                {loadingApt ? "Loading…" : currentLimit !== null ? `${currentLimit} orders/day` : "Unlimited"}
              </span>
            </div>

            {/* Input row */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 200px", maxWidth: 280 }}>
                <label style={labelSt}>Max Orders Per Day</label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 20"
                  value={limitInput}
                  onChange={e => { setLimitInput(e.target.value); setSaveErr(""); setSaveMsg(""); }}
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 10,
                    border: "1.5px solid #e5e7eb", fontSize: 15, fontWeight: 700,
                    color: "#111827", outline: "none", boxSizing: "border-box",
                  }}
                  onFocus={e => e.target.style.borderColor = "#f59e0b"}
                  onBlur={e  => e.target.style.borderColor = "#e5e7eb"}
                />
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: "10px 24px", borderRadius: 10, border: "none",
                  background: saving ? "#e5e7eb" : "linear-gradient(135deg,#f59e0b,#d97706)",
                  color: saving ? "#9ca3af" : "#fff",
                  fontSize: 13.5, fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                  boxShadow: saving ? "none" : "0 4px 12px rgba(245,158,11,0.35)",
                  minHeight: 44, whiteSpace: "nowrap",
                }}
              >
                {saving ? "Saving…" : currentLimit !== null ? "Update Limit" : "Save Limit"}
              </button>

              {currentLimit !== null && (
                <button
                  onClick={() => setShowConfirm(true)}
                  style={{
                    padding: "10px 20px", borderRadius: 10,
                    border: "1.5px solid #fecaca", background: "#fef2f2",
                    color: "#dc2626", fontSize: 13, fontWeight: 700, cursor: "pointer",
                    minHeight: 44, whiteSpace: "nowrap",
                  }}
                >
                  Delete Limit
                </button>
              )}
            </div>

            {/* Messages */}
            {(saveErr || saveMsg) && (
              <div style={{ marginTop: 14 }}>
                {saveErr && <Alert type="err" msg={saveErr} />}
                {saveMsg && <Alert type="ok"  msg={saveMsg} />}
              </div>
            )}

            {/* Info box */}
            <div style={{
              marginTop: 20, background: "#f8fafc", border: "1px solid #e2e8f0",
              borderRadius: 10, padding: "12px 16px",
            }}>
              <p style={{ fontSize: 12.5, color: "#64748b", margin: 0, lineHeight: 1.7 }}>
                <strong style={{ color: "#374151" }}>How it works:</strong> When a customer tries to book this apartment on a date that already has {currentLimit ?? "N"} orders, their booking is rejected with "Slot full for selected date, please choose another date". Setting a limit to 0 is not allowed — delete the limit to go unlimited.
              </p>
            </div>
          </div>
        )}

        {/* Placeholder when no apartment selected */}
        {!selectedApt && (
          <div style={{
            background: "#fff", border: "1.5px dashed #e5e7eb", borderRadius: 16,
            padding: "50px 24px", textAlign: "center",
          }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🏢</div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#374151", margin: "0 0 6px" }}>Select an Apartment</p>
            <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
              Choose an apartment above to view or set its daily order capacity limit.
            </p>
          </div>
        )}

        {/* All limits summary table */}
        {limitedCount > 0 && (
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <div style={{ padding: "16px 22px", borderBottom: "1px solid #f3f4f6" }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: "#111827", margin: 0 }}>Active Limits Overview</p>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Apartment", "Max Orders / Day", ""].map(h => (
                    <th key={h} style={{ padding: "10px 18px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "1px solid #f3f4f6" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {APARTMENTS.filter(apt => capacities[apt] !== undefined).map((apt, idx, arr) => (
                  <tr key={apt}
                    style={{ borderBottom: idx < arr.length - 1 ? "1px solid #f9fafb" : "none" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "13px 18px", fontSize: 13.5, fontWeight: 600, color: "#111827" }}>{apt}</td>
                    <td style={{ padding: "13px 18px" }}>
                      <span style={{
                        fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 800,
                        color: "#d97706",
                        background: "#fffbeb", border: "1px solid #fde68a",
                        borderRadius: 99, padding: "2px 14px",
                      }}>{capacities[apt]}<span style={{ fontSize: 12, fontWeight: 600, color: "#92400e", marginLeft: 4 }}>/day</span></span>
                    </td>
                    <td style={{ padding: "13px 18px", textAlign: "right" }}>
                      <button onClick={() => handleAptChange(apt)} style={{
                        fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 8,
                        border: "1px solid #FEE2E2", background: "#FEF2F2", color: "#DC2626", cursor: "pointer",
                      }}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {showConfirm && (
        <ConfirmModal
          apartment={selectedApt}
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
          saving={deleting}
        />
      )}
    </Layout>
  );
}
