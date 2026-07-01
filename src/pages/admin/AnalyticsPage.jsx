import { useState, useEffect, useCallback } from "react";
import Layout from "../../components/shared/Layout";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { useWindowSize } from "../../hooks/useWindowSize";
import api from "../../services/api";

const VENDOR_COLORS = ["#DC2626", "#06b6d4", "#f59e0b", "#10b981", "#ef4444"];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoStr(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function monthStartStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

const PRESETS = [
  { label: "Today",      from: () => todayStr(),      to: () => todayStr() },
  { label: "This Week",  from: () => daysAgoStr(6),   to: () => todayStr() },
  { label: "This Month", from: () => monthStartStr(),  to: () => todayStr() },
];

// ── Shared helpers ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", border: "1px solid #f3f4f6",
      borderRadius: 10, padding: "10px 14px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
    }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>
        {label}
      </p>
      {payload.map((item, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: i < payload.length - 1 ? 4 : 0 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{item.name}:</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: item.color }}>
            {item.name?.toLowerCase().includes("revenue")
              ? `₹${Number(item.value).toLocaleString("en-IN")}`
              : item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 18,
      border: "1px solid #e5e7eb",
      boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
      overflow: "hidden",
      ...style,
    }}>
      {children}
    </div>
  );
}

function CardHeader({ subtitle, title }) {
  return (
    <div style={{ padding: "20px 24px", borderBottom: "1px solid #f3f4f6" }}>
      <p style={{ fontSize: 10.5, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 3px" }}>
        {subtitle}
      </p>
      <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>
        {title}
      </h3>
    </div>
  );
}

function Stars({ rating }) {
  const r = parseFloat(rating) || 0;
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize: 13, color: i <= Math.round(r) ? "#f59e0b" : "#e5e7eb" }}>★</span>
      ))}
      <span style={{ fontSize: 12, color: "#6b7280", marginLeft: 4, fontWeight: 600 }}>{r.toFixed(1)}</span>
    </span>
  );
}

function Skeleton({ h = 20, w = "100%", r = 8 }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: r,
      background: "linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.4s infinite",
    }} />
  );
}

// ── Date Range Picker ─────────────────────────────────────────────────────────

function DateRangePicker({ from, to, onChange }) {
  const [activePreset, setActivePreset] = useState("This Month");

  function applyPreset(p) {
    setActivePreset(p.label);
    onChange({ from: p.from(), to: p.to() });
  }

  function handleFrom(e) {
    setActivePreset(null);
    onChange({ from: e.target.value, to });
  }

  function handleTo(e) {
    setActivePreset(null);
    onChange({ from, to: e.target.value });
  }

  const inputSt = {
    padding: "7px 10px", border: "1.5px solid #E2E8F0", borderRadius: 8,
    fontSize: 13, color: "#374151", outline: "none", background: "#fff",
    cursor: "pointer",
  };

  return (
    <div style={{
      background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb",
      padding: "14px 18px", display: "flex", alignItems: "center",
      gap: 12, flexWrap: "wrap", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      {/* Calendar icon */}
      <svg viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>

      {/* Preset buttons */}
      <div style={{ display: "flex", gap: 6 }}>
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => applyPreset(p)}
            style={{
              padding: "6px 13px", borderRadius: 8, fontSize: 12, fontWeight: 700,
              cursor: "pointer", border: "none",
              background: activePreset === p.label ? "#DC2626" : "#f3f4f6",
              color: activePreset === p.label ? "#fff" : "#6b7280",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 24, background: "#e5e7eb" }} />

      {/* Custom date inputs */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>From</span>
        <input type="date" value={from} onChange={handleFrom} style={inputSt} />
        <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>To</span>
        <input type="date" value={to} max={todayStr()} onChange={handleTo} style={inputSt} />
      </div>
    </div>
  );
}

// ── Summary Cards ─────────────────────────────────────────────────────────────

function SummaryCards({ data, loading }) {
  if (data?.is_range) {
    const cards = [
      { label: "Total Orders",     value: data.total_orders,    fmt: v => v,                                          accent: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
      { label: "Delivered",        value: data.delivered_count, fmt: v => v,                                          accent: "#10b981", bg: "#f0fdf4", border: "#bbf7d0" },
      { label: "Revenue",          value: data.total_revenue,   fmt: v => `₹${Number(v).toLocaleString("en-IN")}`,   accent: "#10b981", bg: "#f0fdf4", border: "#bbf7d0" },
      { label: "Cancelled",        value: data.cancelled_count, fmt: v => v,                                          accent: "#6b7280", bg: "#f9fafb", border: "#e5e7eb",
        sub: data.cancelled_amount > 0 ? `₹${Number(data.cancelled_amount).toLocaleString("en-IN")} lost` : null },
    ];
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 16 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background: "#fff", borderRadius: 16, border: `1px solid ${c.border}`, padding: "20px 22px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>{c.label}</p>
            {loading ? <Skeleton h={34} r={8} /> : (
              <>
                <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 30, fontWeight: 800, color: c.accent, margin: 0, lineHeight: 1 }}>
                  {c.value !== undefined ? c.fmt(c.value) : "—"}
                </p>
                {c.sub && <p style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", margin: "6px 0 0" }}>{c.sub}</p>}
              </>
            )}
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    { label: "Orders Today",       value: data?.today,              fmt: v => v,                                         accent: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
    { label: "Orders This Week",   value: data?.this_week,          fmt: v => v,                                         accent: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
    { label: "Orders This Month",  value: data?.this_month,         fmt: v => v,                                         accent: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
    { label: "Revenue This Month", value: data?.revenue_this_month, fmt: v => `₹${Number(v).toLocaleString("en-IN")}`,  accent: "#10b981", bg: "#f0fdf4", border: "#bbf7d0" },
    {
      label: "Cancelled This Month",
      value: data?.cancelled_this_month,
      fmt: v => v,
      accent: "#6b7280", bg: "#f9fafb", border: "#e5e7eb",
      sub: data?.cancelled_amount_this_month > 0
        ? `₹${Number(data.cancelled_amount_this_month).toLocaleString("en-IN")} lost`
        : null,
    },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
      {cards.map(c => (
        <div key={c.label} style={{ background: "#fff", borderRadius: 16, border: `1px solid ${c.border}`, padding: "22px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px" }}>{c.label}</p>
          {loading ? <Skeleton h={36} r={8} /> : (
            <>
              <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 32, fontWeight: 800, color: c.accent, margin: 0, lineHeight: 1 }}>
                {c.value !== undefined ? c.fmt(c.value) : "—"}
              </p>
              {c.sub && <p style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", margin: "6px 0 0" }}>{c.sub}</p>}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Revenue Chart ─────────────────────────────────────────────────────────────

function RevenueSection({ dateFrom, dateTo }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get(`/admin/analytics/revenue?from=${dateFrom}&to=${dateTo}`);
      setData(d);
    } catch { setData(null); }
    finally { setLoading(false); }
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const vendors   = data?.vendors || [];
  const chartData = data?.chartData || [];

  return (
    <Card>
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #f3f4f6" }}>
        <p style={{ fontSize: 10.5, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 3px" }}>
          Revenue Trends
        </p>
        <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>
          Center Head Revenue Graph
        </h3>
      </div>
      <div style={{ padding: "20px 24px" }}>
        {loading ? (
          <Skeleton h={200} />
        ) : chartData.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af", fontSize: 14 }}>
            No delivered orders in this range yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9ca3af", fontWeight: 600 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }} tickFormatter={v => `₹${v}`} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#f3f4f6", strokeWidth: 1 }} />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: "16px", fontSize: "12px", fontWeight: "600", color: "#6b7280" }} />
              {vendors.map((v, i) => (
                <Line key={v.id} type="monotone" dataKey={v.name}
                  stroke={VENDOR_COLORS[i % VENDOR_COLORS.length]}
                  strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

// ── Top Vendors Table ─────────────────────────────────────────────────────────

function TopVendorsTable({ data, loading }) {
  return (
    <Card>
      <CardHeader subtitle="Performance" title="Top Performing Center Heads" />
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
              {["Rank", "Center Head", "Total Orders", "Total Revenue", "Avg Rating"].map(h => (
                <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3].map(i => (
                <tr key={i} style={{ borderBottom: "1px solid #f9fafb" }}>
                  {[1,2,3,4,5].map(j => <td key={j} style={{ padding: "14px 20px" }}><Skeleton h={16} /></td>)}
                </tr>
              ))
            ) : !data?.length ? (
              <tr><td colSpan={5} style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>No data yet</td></tr>
            ) : (
              data.map((v, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f9fafb" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "14px 20px" }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center",
                      background: i === 0 ? "#fef3c7" : i === 1 ? "#f3f4f6" : "#fff7ed",
                      color:      i === 0 ? "#92400e" : i === 1 ? "#374151" : "#c2410c",
                      fontWeight: 800, fontSize: 13,
                    }}>{i + 1}</span>
                  </td>
                  <td style={{ padding: "14px 20px", fontWeight: 700, fontSize: 14, color: "#111827" }}>{v.name}</td>
                  <td style={{ padding: "14px 20px", fontSize: 14, color: "#374151", fontWeight: 600 }}>{v.total_orders}</td>
                  <td style={{ padding: "14px 20px", fontSize: 14, color: "#10b981", fontWeight: 700 }}>₹{Number(v.total_revenue).toLocaleString("en-IN")}</td>
                  <td style={{ padding: "14px 20px" }}>
                    {parseFloat(v.avg_rating) > 0 ? <Stars rating={v.avg_rating} /> : <span style={{ color: "#d1d5db", fontSize: 13 }}>No ratings</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Apartments Chart ──────────────────────────────────────────────────────────

function ApartmentsChart({ data, loading }) {
  const chartData = (data || []).map(a => ({
    name:    a.apartment?.length > 14 ? a.apartment.slice(0, 14) + "…" : a.apartment,
    fullName: a.apartment,
    orders:  a.total_orders,
    revenue: parseFloat(a.total_revenue),
  }));

  return (
    <Card>
      <CardHeader subtitle="Activity" title="Most Active Apartments" />
      <div style={{ padding: "20px 24px" }}>
        {loading ? (
          <Skeleton h={220} />
        ) : !chartData.length ? (
          <div style={{ textAlign: "center", padding: "50px 0", color: "#9ca3af", fontSize: 14 }}>No order data yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#374151", fontWeight: 600 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div style={{ background: "#fff", border: "1px solid #f3f4f6", borderRadius: 10, padding: "10px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.10)" }}>
                      <p style={{ fontWeight: 700, fontSize: 13, color: "#111827", margin: "0 0 6px" }}>{d.fullName}</p>
                      <p style={{ fontSize: 12, color: "#DC2626", margin: "0 0 3px" }}>Orders: <b>{d.orders}</b></p>
                      <p style={{ fontSize: 12, color: "#10b981", margin: 0 }}>Revenue: <b>₹{Number(d.revenue).toLocaleString("en-IN")}</b></p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="orders" name="Orders" fill="#DC2626" radius={[6, 6, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

// ── Delivery Performance Table ────────────────────────────────────────────────

function DeliveryTable({ data, loading }) {
  return (
    <Card>
      <CardHeader subtitle="Performance" title="Delivery Boy Performance" />
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
              {["Delivery Boy", "Total Deliveries", "Revenue Generated", "Avg Rating"].map(h => (
                <th key={h} style={{ padding: "12px 20px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1,2,3].map(i => (
                <tr key={i} style={{ borderBottom: "1px solid #f9fafb" }}>
                  {[1,2,3,4].map(j => <td key={j} style={{ padding: "14px 20px" }}><Skeleton h={16} /></td>)}
                </tr>
              ))
            ) : !data?.length ? (
              <tr><td colSpan={4} style={{ padding: "40px 20px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>No delivery data yet</td></tr>
            ) : (
              data.map((a, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #f9fafb" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#3b82f6", flexShrink: 0 }}>
                        {a.name?.[0]?.toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{a.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: 14, color: "#374151", fontWeight: 600 }}>{a.total_deliveries}</td>
                  <td style={{ padding: "14px 20px", fontSize: 14, color: "#10b981", fontWeight: 700 }}>₹{Number(a.total_revenue).toLocaleString("en-IN")}</td>
                  <td style={{ padding: "14px 20px" }}>
                    {parseFloat(a.avg_rating) > 0 ? <Stars rating={a.avg_rating} /> : <span style={{ color: "#d1d5db", fontSize: 13 }}>No ratings</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { isMobile } = useWindowSize();

  const [dateFrom, setDateFrom] = useState(monthStartStr());
  const [dateTo,   setDateTo]   = useState(todayStr());

  const [summary,    setSummary]    = useState(null);
  const [vendors,    setVendors]    = useState(null);
  const [apartments, setApartments] = useState(null);
  const [agents,     setAgents]     = useState(null);
  const [loadSummary,    setLoadSummary]    = useState(true);
  const [loadVendors,    setLoadVendors]    = useState(true);
  const [loadApartments, setLoadApartments] = useState(true);
  const [loadAgents,     setLoadAgents]     = useState(true);

  const fetchAll = useCallback((from, to) => {
    const q = `from=${from}&to=${to}`;

    setLoadSummary(true);
    api.get(`/admin/analytics?${q}`)
      .then(r => setSummary(r.data))
      .catch(() => setSummary(null))
      .finally(() => setLoadSummary(false));

    setLoadVendors(true);
    api.get(`/admin/analytics/top-vendors?${q}`)
      .then(r => setVendors(r.data.vendors))
      .catch(() => setVendors([]))
      .finally(() => setLoadVendors(false));

    setLoadApartments(true);
    api.get(`/admin/analytics/apartments?${q}`)
      .then(r => setApartments(r.data.apartments))
      .catch(() => setApartments([]))
      .finally(() => setLoadApartments(false));

    setLoadAgents(true);
    api.get(`/admin/analytics/delivery-performance?${q}`)
      .then(r => setAgents(r.data.agents))
      .catch(() => setAgents([]))
      .finally(() => setLoadAgents(false));
  }, []);

  useEffect(() => { fetchAll(dateFrom, dateTo); }, [fetchAll, dateFrom, dateTo]);

  function handleDateChange({ from, to }) {
    setDateFrom(from);
    setDateTo(to);
  }

  return (
    <Layout>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#DC2626", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 5px" }}>Admin</p>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 800, color: "#111827", margin: 0, lineHeight: 1.15 }}>Analytics</h1>
            <p style={{ fontSize: 13.5, color: "#9ca3af", margin: "6px 0 0" }}>Platform performance metrics, Center Head rankings, and delivery insights.</p>
          </div>
        </div>

        {/* Date range picker */}
        <DateRangePicker from={dateFrom} to={dateTo} onChange={handleDateChange} />

        {/* Summary cards */}
        <SummaryCards data={summary} loading={loadSummary} />

        {/* Revenue chart */}
        <RevenueSection dateFrom={dateFrom} dateTo={dateTo} />

        {/* Top vendors + Apartments */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}>
          <TopVendorsTable data={vendors} loading={loadVendors} />
          <ApartmentsChart data={apartments} loading={loadApartments} />
        </div>

        {/* Delivery performance */}
        <DeliveryTable data={agents} loading={loadAgents} />

      </div>
    </Layout>
  );
}
