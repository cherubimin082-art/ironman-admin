import { useState, useEffect, useCallback } from "react";
import Layout from "../../components/shared/Layout";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { useWindowSize } from "../../hooks/useWindowSize";
import api from "../../services/api";

const RANGE_OPTS = [
  { key: "today", label: "Today" },
  { key: "week",  label: "This Week" },
  { key: "month", label: "This Month" },
];

const VENDOR_COLORS = ["#8b5cf6", "#06b6d4", "#f59e0b", "#10b981", "#ef4444"];

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
            {item.name?.includes("₹") || item.name?.toLowerCase().includes("revenue")
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

// ── Summary Cards ─────────────────────────────────────────────────────────────

function SummaryCards({ data, loading }) {
  const cards = [
    { label: "Orders Today",       value: data?.today,             fmt: v => v,                  accent: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
    { label: "Orders This Week",   value: data?.this_week,         fmt: v => v,                  accent: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe" },
    { label: "Orders This Month",  value: data?.this_month,        fmt: v => v,                  accent: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe" },
    { label: "Revenue This Month", value: data?.revenue_this_month, fmt: v => `₹${Number(v).toLocaleString("en-IN")}`, accent: "#10b981", bg: "#f0fdf4", border: "#bbf7d0" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
      {cards.map(c => (
        <div key={c.label} style={{
          background: "#fff", borderRadius: 16, border: `1px solid ${c.border}`,
          padding: "22px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 12px" }}>
            {c.label}
          </p>
          {loading ? (
            <Skeleton h={36} r={8} />
          ) : (
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 32, fontWeight: 800, color: c.accent, margin: 0, lineHeight: 1 }}>
              {c.value !== undefined ? c.fmt(c.value) : "—"}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Revenue Chart ─────────────────────────────────────────────────────────────

function RevenueSection() {
  const [range, setRange]     = useState("month");
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get(`/admin/analytics/revenue?range=${range}`);
      setData(d);
    } catch { setData(null); }
    finally { setLoading(false); }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const vendors   = data?.vendors || [];
  const chartData = data?.chartData || [];

  return (
    <Card>
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
        <div>
          <p style={{ fontSize: 10.5, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 3px" }}>
            Revenue Trends
          </p>
          <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>
            Vendor Revenue Graph
          </h3>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {RANGE_OPTS.map(o => (
            <button
              key={o.key}
              onClick={() => setRange(o.key)}
              style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", border: "none",
                background: range === o.key ? "#8b5cf6" : "#f3f4f6",
                color: range === o.key ? "#fff" : "#6b7280",
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ padding: "20px 24px" }}>
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Skeleton h={200} />
          </div>
        ) : chartData.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#9ca3af", fontSize: 14 }}>
            No delivered orders in this range yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9ca3af", fontWeight: 600 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickFormatter={v => `₹${v}`} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#f3f4f6", strokeWidth: 1 }} />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: "16px", fontSize: "12px", fontWeight: "600", color: "#6b7280" }} />
              {vendors.map((v, i) => (
                <Line
                  key={v.id}
                  type="monotone"
                  dataKey={v.name}
                  stroke={VENDOR_COLORS[i % VENDOR_COLORS.length]}
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
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
      <CardHeader subtitle="Performance" title="Top Performing Vendors" />
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
              {["Rank", "Vendor Name", "Total Orders", "Total Revenue", "Avg Rating"].map(h => (
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
                  {[1,2,3,4,5].map(j => (
                    <td key={j} style={{ padding: "14px 20px" }}><Skeleton h={16} /></td>
                  ))}
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
                    }}>
                      {i + 1}
                    </span>
                  </td>
                  <td style={{ padding: "14px 20px", fontWeight: 700, fontSize: 14, color: "#111827" }}>{v.name}</td>
                  <td style={{ padding: "14px 20px", fontSize: 14, color: "#374151", fontWeight: 600 }}>{v.total_orders}</td>
                  <td style={{ padding: "14px 20px", fontSize: 14, color: "#10b981", fontWeight: 700 }}>
                    ₹{Number(v.total_revenue).toLocaleString("en-IN")}
                  </td>
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
                      <p style={{ fontSize: 12, color: "#6366f1", margin: "0 0 3px" }}>Orders: <b>{d.orders}</b></p>
                      <p style={{ fontSize: 12, color: "#10b981", margin: 0 }}>Revenue: <b>₹{Number(d.revenue).toLocaleString("en-IN")}</b></p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="orders" name="Orders" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={28} />
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
                  {[1,2,3,4].map(j => (
                    <td key={j} style={{ padding: "14px 20px" }}><Skeleton h={16} /></td>
                  ))}
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
                      <div style={{
                        width: 34, height: 34, borderRadius: 10,
                        background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, fontWeight: 800, color: "#3b82f6", flexShrink: 0,
                      }}>
                        {a.name?.[0]?.toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>{a.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 20px", fontSize: 14, color: "#374151", fontWeight: 600 }}>{a.total_deliveries}</td>
                  <td style={{ padding: "14px 20px", fontSize: 14, color: "#10b981", fontWeight: 700 }}>
                    ₹{Number(a.total_revenue).toLocaleString("en-IN")}
                  </td>
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

  const [summary,   setSummary]   = useState(null);
  const [vendors,   setVendors]   = useState(null);
  const [apartments, setApartments] = useState(null);
  const [agents,    setAgents]    = useState(null);
  const [loadSummary,   setLoadSummary]   = useState(true);
  const [loadVendors,   setLoadVendors]   = useState(true);
  const [loadApartments, setLoadApartments] = useState(true);
  const [loadAgents,    setLoadAgents]    = useState(true);

  useEffect(() => {
    api.get("/admin/analytics")
      .then(r => setSummary(r.data))
      .catch(() => setSummary(null))
      .finally(() => setLoadSummary(false));

    api.get("/admin/analytics/top-vendors")
      .then(r => setVendors(r.data.vendors))
      .catch(() => setVendors([]))
      .finally(() => setLoadVendors(false));

    api.get("/admin/analytics/apartments")
      .then(r => setApartments(r.data.apartments))
      .catch(() => setApartments([]))
      .finally(() => setLoadApartments(false));

    api.get("/admin/analytics/delivery-performance")
      .then(r => setAgents(r.data.agents))
      .catch(() => setAgents([]))
      .finally(() => setLoadAgents(false));
  }, []);

  return (
    <Layout>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

        {/* Header */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 5px" }}>
            Admin
          </p>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 800, color: "#111827", margin: 0, lineHeight: 1.15 }}>
            Analytics
          </h1>
          <p style={{ fontSize: 13.5, color: "#9ca3af", margin: "6px 0 0" }}>
            Live platform performance metrics, vendor rankings, and delivery insights.
          </p>
        </div>

        {/* Summary cards */}
        <SummaryCards data={summary} loading={loadSummary} />

        {/* Revenue chart */}
        <RevenueSection />

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
