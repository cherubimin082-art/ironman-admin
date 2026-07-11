import { useState, useEffect, useCallback } from "react";
import Layout from "../../components/shared/Layout";
import api from "../../services/api";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const selectSt = {
  padding: "8px 12px", borderRadius: 10, cursor: "pointer",
  border: "1.5px solid #e5e7eb", fontSize: 13, fontWeight: 600,
  color: "#111827", background: "#fff", outline: "none",
};

function Alert({ type, msg }) {
  if (!msg) return null;
  const ok = type === "ok";
  return (
    <div style={{
      background: ok ? "#f0fdf4" : "#fef2f2",
      border: `1px solid ${ok ? "#bbf7d0" : "#fecaca"}`,
      borderRadius: 8, padding: "10px 14px",
      color: ok ? "#16a34a" : "#dc2626", fontSize: 13, fontWeight: 500,
      marginBottom: 16,
    }}>
      {msg}
    </div>
  );
}

function VendorRow({ vendor, onSave }) {
  const [day, setDay]       = useState(vendor.full_day_leave || "");
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);
  const dirty = day !== (vendor.full_day_leave || "");

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(vendor.id, day || null);
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 1800);
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr style={{ borderBottom: "1px solid #f9fafb" }}>
      <td style={{ padding: "14px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: "linear-gradient(135deg, #f59e0b, #ef4444)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800, color: "#fff",
          }}>
            {vendor.name?.[0]?.toUpperCase() ?? "?"}
          </div>
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: "#111827", margin: 0 }}>{vendor.name}</p>
            <p style={{ fontSize: 11.5, color: "#9ca3af", margin: "2px 0 0" }}>{vendor.phone}</p>
          </div>
        </div>
      </td>
      <td style={{ padding: "14px 18px" }}>
        <select value={day} onChange={e => setDay(e.target.value)} style={selectSt}>
          <option value="">No weekly leave</option>
          {WEEKDAYS.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </td>
      <td style={{ padding: "14px 18px" }}>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          style={{
            padding: "7px 16px", borderRadius: 9, border: "none",
            cursor: (!dirty || saving) ? "not-allowed" : "pointer",
            background: savedTick ? "#16a34a" : (!dirty || saving) ? "#e5e7eb" : "linear-gradient(135deg,#DC2626,#B91C1C)",
            color: (!dirty || saving) ? "#9ca3af" : "#fff",
            fontSize: 12.5, fontWeight: 700, transition: "background 0.15s",
          }}
        >
          {savedTick ? "✓ Saved" : saving ? "Saving…" : "Save"}
        </button>
      </td>
    </tr>
  );
}

export default function LeaveManagementPage() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [notice,  setNotice]  = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const { data } = await api.get("/vendors");
      setVendors(data.vendors || []);
    } catch {
      setError("Failed to load centers. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSaveDay(vendorId, day) {
    setNotice("");
    try {
      await api.put(`/admin/vendors/${vendorId}/leave-day`, { full_day_leave: day });
      setVendors(prev => prev.map(v => v.id === vendorId ? { ...v, full_day_leave: day } : v));
      setNotice("Leave day updated.");
      setTimeout(() => setNotice(""), 2500);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save. Try again.");
      throw err;
    }
  }

  return (
    <Layout>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Header */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#DC2626", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 5px" }}>
            Admin
          </p>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 800, color: "#111827", margin: 0, lineHeight: 1.15 }}>
            Weekly Leave
          </h1>
          <p style={{ fontSize: 13.5, color: "#9ca3af", margin: "6px 0 0", fontWeight: 400 }}>
            Set one full-day-off weekday per center. Customers can't select that day for pickup, and it's skipped automatically when calculating delivery dates.
          </p>
        </div>

        <Alert type="err" msg={error} />
        <Alert type="ok"  msg={notice} />

        {/* Table card */}
        <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e5e7eb", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
          <div style={{
            padding: "14px 24px", borderBottom: "1px solid #f3f4f6",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>
              {loading ? "Loading…" : `${vendors.length} Center${vendors.length !== 1 ? "s" : ""}`}
            </span>
            <button onClick={load} style={{
              fontSize: 12, fontWeight: 600, color: "#DC2626",
              border: "none", background: "none", cursor: "pointer",
            }}>↻ Refresh</button>
          </div>

          {loading ? (
            <div style={{ padding: "60px 24px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
              Loading…
            </div>
          ) : vendors.length === 0 ? (
            <div style={{ padding: "60px 24px", textAlign: "center" }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#374151", margin: "0 0 6px" }}>No centers yet</p>
              <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Add a Center Head first from the Center Heads page.</p>
            </div>
          ) : (
            <div className="si-table-wrap">
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                    {["Center Head", "Weekly Leave Day", ""].map(h => (
                      <th key={h} style={{
                        padding: "12px 18px", fontSize: 11, fontWeight: 700,
                        color: "#9ca3af", textTransform: "uppercase",
                        letterSpacing: "0.07em", textAlign: "left", whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vendors.map(v => (
                    <VendorRow key={v.id} vendor={v} onSave={handleSaveDay} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
