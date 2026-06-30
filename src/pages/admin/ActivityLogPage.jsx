import { useState, useEffect } from "react";
import api from "../../services/api";
import Sidebar from "../../components/shared/Sidebar";

function fmt(dt) {
  if (!dt) return "—";
  const d = new Date(dt);
  return d.toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function duration(secs) {
  if (secs == null || secs < 0) return "—";
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export default function ActivityLogPage() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");

  useEffect(() => {
    api.get("/admin/activity-log")
      .then(r => setLogs(r.data.logs || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = logs.filter(l =>
    !search ||
    l.order_code?.toLowerCase().includes(search.toLowerCase()) ||
    l.bag_number?.toString().includes(search) ||
    l.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    l.vendor_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "32px 28px", overflowY: "auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", margin: 0 }}>Iron Activity Log</h1>
          <p style={{ fontSize: 14, color: "#64748B", margin: "4px 0 0" }}>
            Start and complete times for every bag ironed at the shop
          </p>
        </div>

        {/* Search + count */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div style={{ position: "relative", flex: 1, maxWidth: 340 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2"
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, pointerEvents: "none" }}>
              <circle cx="11" cy="11" r="8"/><path strokeLinecap="round" d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search order, bag, customer…"
              style={{ width: "100%", paddingLeft: 38, paddingRight: 14, paddingTop: 10, paddingBottom: 10,
                border: "1.5px solid #E2E8F0", borderRadius: 12, fontSize: 13, outline: "none",
                background: "#fff", boxSizing: "border-box", color: "#1E293B" }}
            />
          </div>
          <span style={{ fontSize: 13, color: "#94A3B8", whiteSpace: "nowrap" }}>
            {filtered.length} record{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #E2E8F0", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: "center", color: "#94A3B8", fontSize: 14 }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "#94A3B8", fontSize: 14 }}>No activity logs yet</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                    {["Order", "Bag", "Customer", "Vendor", "Iron Start", "Iron Complete", "Duration"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontWeight: 700,
                        color: "#64748B", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em",
                        whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log, i) => (
                    <tr key={log.id}
                      style={{ borderBottom: i < filtered.length - 1 ? "1px solid #F1F5F9" : "none",
                        background: i % 2 === 0 ? "#fff" : "#FAFAFA" }}>
                      <td style={{ padding: "13px 16px", fontWeight: 700, color: "#B91C1C" }}>
                        {log.order_code || `#${log.order_id}`}
                      </td>
                      <td style={{ padding: "13px 16px" }}>
                        <span style={{ background: "#FEF2F2", color: "#B91C1C", fontWeight: 700,
                          padding: "3px 10px", borderRadius: 99, fontSize: 12 }}>
                          Bag {log.bag_number}
                        </span>
                      </td>
                      <td style={{ padding: "13px 16px", color: "#374151", fontWeight: 500 }}>{log.customer_name || "—"}</td>
                      <td style={{ padding: "13px 16px", color: "#374151" }}>{log.vendor_name || "—"}</td>
                      <td style={{ padding: "13px 16px", color: "#0F172A", whiteSpace: "nowrap" }}>{fmt(log.iron_start_time)}</td>
                      <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}>
                        {log.iron_complete_time
                          ? <span style={{ color: "#059669", fontWeight: 600 }}>{fmt(log.iron_complete_time)}</span>
                          : <span style={{ color: "#F59E0B", fontWeight: 600, fontSize: 12 }}>In progress…</span>}
                      </td>
                      <td style={{ padding: "13px 16px" }}>
                        {log.duration_seconds != null
                          ? <span style={{ background: "#ECFDF5", color: "#065F46", fontWeight: 700,
                              padding: "3px 10px", borderRadius: 99, fontSize: 12 }}>
                              {duration(log.duration_seconds)}
                            </span>
                          : <span style={{ color: "#94A3B8" }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
