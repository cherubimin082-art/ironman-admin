import { useState, useEffect } from "react";
import Layout from "../../components/shared/Layout";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import api from "../../services/api";

const WEEKLY_PLACEHOLDER = [
  { day: "Mon", earnings: 0 },
  { day: "Tue", earnings: 0 },
  { day: "Wed", earnings: 0 },
  { day: "Thu", earnings: 0 },
  { day: "Fri", earnings: 0 },
  { day: "Sat", earnings: 0 },
  { day: "Sun", earnings: 0 },
];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", border: "1px solid #f3f4f6",
      borderRadius: 10, padding: "9px 14px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
      fontSize: 13, fontWeight: 700, color: "#111827",
    }}>
      <p style={{ fontSize: 11, color: "#9ca3af", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
      <span style={{ color: "#10b981" }}>₹{payload[0].value}</span>
    </div>
  );
}

function MetricCard({ label, value, sub, accent, bg, border, icon }) {
  return (
    <div
      style={{
        background: "#fff", borderRadius: 16,
        border: `1px solid ${border}`,
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        overflow: "hidden",
        transition: "transform 0.18s, box-shadow 0.18s",
        cursor: "default",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 10px 28px rgba(0,0,0,0.09)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)"; }}
    >
      <div style={{ height: 3, background: accent }} />
      <div style={{ padding: "20px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11, flexShrink: 0,
            background: bg, color: accent,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {icon}
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            {label}
          </span>
        </div>
        <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 32, fontWeight: 800, color: "#111827", margin: "0 0 5px", lineHeight: 1 }}>
          {value}
        </p>
        <p style={{ fontSize: 12.5, color: "#9ca3af", margin: 0, fontWeight: 500 }}>{sub}</p>
      </div>
    </div>
  );
}

function fmtDate(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function EarningsPage() {
  const [orders, setOrders]           = useState([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    api.get("/delivery/completed-orders")
      .then(({ data }) => {
        setOrders(data.orders || []);
        setTotalRevenue(data.totalRevenue || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const todayOrders = orders.filter(o => {
    const d = new Date(o.delivered_at || o.created_at);
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  });
  const todayRevenue = todayOrders.reduce((s, o) => s + parseFloat(o.total || 0), 0);
  const avgPerTrip   = orders.length ? Math.round(totalRevenue / orders.length) : 0;

  // Build weekly chart from real orders (last 7 days)
  const weeklyMap = {};
  const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  orders.forEach(o => {
    const d = new Date(o.delivered_at || o.created_at);
    const key = DAYS[d.getDay()];
    weeklyMap[key] = (weeklyMap[key] || 0) + parseFloat(o.total || 0);
  });
  const weekly = WEEKLY_PLACEHOLDER.map(d => ({ ...d, earnings: Math.round(weeklyMap[d.day] || 0) }));

  const metrics = [
    {
      label: "Total Earned", value: loading ? "…" : `₹${Math.round(totalRevenue)}`,
      sub: `${orders.length} total deliveries`,
      accent: "#10b981", bg: "#f0fdf4", border: "#bbf7d0",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 20, height: 20 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Today's Payout", value: loading ? "…" : `₹${Math.round(todayRevenue)}`,
      sub: `${todayOrders.length} deliveries today`,
      accent: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 20, height: 20 }}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path strokeLinecap="round" d="M2 10h20" />
        </svg>
      ),
    },
    {
      label: "Avg Per Trip", value: loading ? "…" : `₹${avgPerTrip}`,
      sub: "All-time average",
      accent: "#DC2626", bg: "#FEF2F2", border: "#FECACA",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 20, height: 20 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
      ),
    },
  ];

  return (
    <Layout>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 5px" }}>
            Financials
          </p>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 800, color: "#111827", margin: 0, lineHeight: 1.15 }}>
            Earnings
          </h1>
          <p style={{ fontSize: 13.5, color: "#9ca3af", margin: "6px 0 0", fontWeight: 400 }}>
            Track your revenue, trip history, and payout trends.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {metrics.map(m => <MetricCard key={m.label} {...m} />)}
        </div>

        <div style={{
          background: "#fff", borderRadius: 18, border: "1px solid #e5e7eb",
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)", overflow: "hidden",
        }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #f3f4f6" }}>
            <p style={{ fontSize: 10.5, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 3px" }}>
              Revenue Trend
            </p>
            <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>
              Earnings by Day (₹)
            </h3>
          </div>
          <div style={{ padding: "20px 24px" }}>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={weekly} margin={{ left: -20, right: 0, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="earningsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#10b981" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9ca3af", fontWeight: 600 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#f3f4f6", strokeWidth: 1 }} />
                <Area type="monotone" dataKey="earnings" stroke="#10b981" strokeWidth={2.5}
                  fill="url(#earningsGrad)"
                  dot={{ fill: "#10b981", r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#10b981", strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{
          background: "#fff", borderRadius: 18, border: "1px solid #e5e7eb",
          boxShadow: "0 2px 10px rgba(0,0,0,0.05)", overflow: "hidden",
        }}>
          <div style={{ padding: "20px 24px", borderBottom: "1px solid #f3f4f6" }}>
            <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>
              Delivery History
            </h3>
          </div>

          {loading ? (
            <div style={{ padding: "40px 24px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Loading…</div>
          ) : orders.length === 0 ? (
            <div style={{ padding: "40px 24px", textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No deliveries yet.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                  {["Order ID", "Customer", "Date", "Amount"].map((h, i) => (
                    <th key={h} style={{
                      padding: "12px 20px", fontSize: 11, fontWeight: 700, color: "#9ca3af",
                      textTransform: "uppercase", letterSpacing: "0.07em",
                      textAlign: i === 3 ? "right" : "left",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o, idx) => (
                  <tr key={o.id}
                    style={{ borderBottom: idx < orders.length - 1 ? "1px solid #f9fafb" : "none", transition: "background 0.12s" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "14px 20px", fontSize: 13, fontWeight: 700, color: "#111827" }}>{o.order_code || `#${o.id}`}</td>
                    <td style={{ padding: "14px 20px", fontSize: 13, fontWeight: 600, color: "#374151" }}>{o.customer_name}</td>
                    <td style={{ padding: "14px 20px", fontSize: 13, color: "#9ca3af" }}>{fmtDate(o.delivered_at || o.created_at)}</td>
                    <td style={{ padding: "14px 20px", textAlign: "right" }}>
                      <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 800, color: "#10b981" }}>
                        ₹{parseFloat(o.total || 0).toFixed(0)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </Layout>
  );
}
