import { useState, useEffect } from "react";
import Layout from "../../components/shared/Layout";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { useWindowSize } from "../../hooks/useWindowSize";
import api from "../../services/api";

const DAY_ORDER = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const CAT_COLORS = ["#DC2626","#3b82f6","#B91C1C","#f59e0b","#10b981","#8b5cf6","#ec4899","#06b6d4","#84cc16","#f97316"];

const WEEKLY_PLACEHOLDER = DAY_ORDER.slice(1).concat("Sun").map(day => ({ day, orders: 0, revenue: 0 }));

function ChartTooltip({ active, payload, prefix = "" }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", border: "1px solid #f3f4f6",
      borderRadius: 10, padding: "9px 14px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
      fontSize: 13, fontWeight: 700, color: "#111827",
    }}>
      <span style={{ color: payload[0].color }}>{payload[0].name}: </span>
      {prefix}{payload[0].value}
    </div>
  );
}

function MetricCard({ label, value, sub, accentColor, icon }) {
  return (
    <div
      style={{
        background: "#fff", borderRadius: 16,
        border: "1px solid #e5e7eb",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        overflow: "hidden",
        transition: "transform 0.18s, box-shadow 0.18s",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 28px rgba(0,0,0,0.09)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)"; }}
    >
      <div style={{ height: 3, background: accentColor }} />
      <div style={{ padding: "20px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11, flexShrink: 0,
            background: accentColor + "18",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: accentColor,
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
        {sub && <p style={{ fontSize: 12.5, color: "#9ca3af", margin: 0, fontWeight: 500 }}>{sub}</p>}
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 18,
      border: "1px solid #e5e7eb",
      boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
      overflow: "hidden",
    }}>
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #f3f4f6" }}>
        <p style={{ fontSize: 10.5, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 3px" }}>
          {subtitle}
        </p>
        <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>
          {title}
        </h3>
      </div>
      <div style={{ padding: "20px 24px" }}>{children}</div>
    </div>
  );
}

export default function ReportsPage() {
  const { isMobile, isTablet } = useWindowSize();

  const [loading, setLoading]     = useState(true);
  const [summary, setSummary]     = useState({ total_orders: 0, total_revenue: 0, today_orders: 0, today_revenue: 0 });
  const [weekly, setWeekly]       = useState(WEEKLY_PLACEHOLDER);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.get("/vendor/reports")
      .then(({ data }) => {
        setSummary(data.summary || {});

        // Merge DB rows into full Mon–Sun skeleton
        const map = {};
        (data.weekly || []).forEach(r => {
          const short = r.day_name.slice(0, 3);
          map[short] = { orders: Number(r.orders), revenue: Number(r.revenue) };
        });
        setWeekly(WEEKLY_PLACEHOLDER.map(d => ({ ...d, ...(map[d.day] || {}) })));

        setCategories(
          (data.categories || []).map((c, i) => ({
            name: c.name,
            count: Number(c.count),
            color: CAT_COLORS[i % CAT_COLORS.length],
          }))
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalOrders  = Number(summary.total_orders  || 0);
  const totalRevenue = Number(summary.total_revenue || 0);
  const avgPerOrder  = totalOrders ? Math.round(totalRevenue / totalOrders) : 0;
  const bestDay      = weekly.reduce((a, b) => (b.revenue > a.revenue ? b : a), weekly[0]);
  const totalCatItems = categories.reduce((s, c) => s + c.count, 0);

  const metrics = [
    {
      label: "Total Orders",
      value: loading ? "…" : totalOrders,
      sub: "All-time delivered",
      accentColor: "#DC2626",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 20, height: 20 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      label: "Total Revenue",
      value: loading ? "…" : `₹${Math.round(totalRevenue).toLocaleString()}`,
      sub: `Avg ₹${avgPerOrder} per order`,
      accentColor: "#10b981",
      icon: <span style={{ fontSize: 20, fontWeight: 900, lineHeight: 1 }}>₹</span>,
    },
    {
      label: "Avg per Order",
      value: loading ? "…" : `₹${avgPerOrder}`,
      sub: "Revenue efficiency",
      accentColor: "#f59e0b",
      icon: <span style={{ fontSize: 20, fontWeight: 900, lineHeight: 1 }}>₹</span>,
    },
  ];

  return (
    <Layout>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 5px" }}>
              Analytics
            </p>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 800, color: "#111827", margin: 0, lineHeight: 1.15 }}>
              Weekly Reports
            </h1>
            <p style={{ fontSize: 13.5, color: "#9ca3af", margin: "6px 0 0", fontWeight: 400 }}>
              Performance metrics and revenue breakdown for this week.
            </p>
          </div>
          {!loading && bestDay && bestDay.revenue > 0 && (
            <div style={{
              background: "#f0fdf4", border: "1px solid #bbf7d0",
              borderRadius: 10, padding: "9px 16px",
              fontSize: 13, fontWeight: 700, color: "#16a34a",
            }}>
              Best day: {bestDay.day} — ₹{Math.round(bestDay.revenue)}
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 16 }}>
          {metrics.map(m => <MetricCard key={m.label} {...m} />)}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}>
          <ChartCard title="Orders This Week" subtitle="Volume Trend">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weekly} margin={{ left: -20, right: 0, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9ca3af", fontWeight: 600 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f9fafb" }} />
                <Bar dataKey="orders" name="Orders" fill="#DC2626" radius={[5, 5, 0, 0]} barSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Revenue This Week" subtitle="Earnings Summary">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={weekly} margin={{ left: -20, right: 0, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#10b981" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9ca3af", fontWeight: 600 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <Tooltip content={<ChartTooltip prefix="₹" />} cursor={{ stroke: "#f3f4f6", strokeWidth: 1 }} />
                <Area
                  dataKey="revenue" name="Revenue" stroke="#10b981" strokeWidth={2.5}
                  fill="url(#revGrad)"
                  dot={{ fill: "#10b981", r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#10b981", strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <ChartCard title="Orders by Clothing Type" subtitle="Category Distribution">
          {loading ? (
            <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 13, margin: 0 }}>Loading…</p>
          ) : categories.length === 0 ? (
            <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 13, margin: 0 }}>No delivered orders yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {categories.map(cat => {
                const pct = totalCatItems ? Math.round((cat.count / totalCatItems) * 100) : 0;
                return (
                  <div key={cat.name} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                    <span style={{ width: 80, fontSize: 13, fontWeight: 600, color: "#374151", flexShrink: 0 }}>{cat.name}</span>
                    <div style={{ flex: 1, background: "#f3f4f6", borderRadius: 99, height: 7, overflow: "hidden" }}>
                      <div style={{
                        width: `${pct}%`, height: "100%",
                        background: cat.color, borderRadius: 99,
                        transition: "width 0.55s cubic-bezier(0.4, 0, 0.2, 1)",
                      }} />
                    </div>
                    <div style={{ display: "flex", gap: 8, width: 64, justifyContent: "flex-end", flexShrink: 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>{cat.count}</span>
                      <span style={{ fontSize: 12, color: "#9ca3af" }}>{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ChartCard>

      </div>
    </Layout>
  );
}
