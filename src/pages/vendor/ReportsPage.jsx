import Layout from "../../components/shared/Layout";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";
import { useWindowSize } from "../../hooks/useWindowSize";

const WEEKLY = [
  { day: "Mon", orders: 12, revenue: 480  },
  { day: "Tue", orders: 18, revenue: 720  },
  { day: "Wed", orders: 15, revenue: 600  },
  { day: "Thu", orders: 22, revenue: 880  },
  { day: "Fri", orders: 20, revenue: 800  },
  { day: "Sat", orders: 30, revenue: 1200 },
  { day: "Sun", orders:  8, revenue: 320  },
];

const CATEGORIES = [
  { name: "Shirts",   count: 42, color: "#6366f1" },
  { name: "Trousers", count: 28, color: "#3b82f6" },
  { name: "Sarees",   count: 18, color: "#ec4899" },
  { name: "Kurtas",   count: 15, color: "#f59e0b" },
  { name: "Coats",    count:  7, color: "#10b981" },
];

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
      {/* Top accent strip */}
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
  const totalOrders  = WEEKLY.reduce((s, d) => s + d.orders, 0);
  const totalRevenue = WEEKLY.reduce((s, d) => s + d.revenue, 0);
  const avgPerOrder  = Math.round(totalRevenue / totalOrders);
  const bestDay      = WEEKLY.reduce((a, b) => (b.revenue > a.revenue ? b : a));
  const totalCatOrders = CATEGORIES.reduce((s, c) => s + c.count, 0);

  const metrics = [
    {
      label: "Total Orders",
      value: totalOrders,
      sub: "Across all days this week",
      accentColor: "#6366f1",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 20, height: 20 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      label: "Total Revenue",
      value: `₹${totalRevenue}`,
      sub: `Avg ₹${avgPerOrder} per order`,
      accentColor: "#10b981",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 20, height: 20 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Avg per Order",
      value: `₹${avgPerOrder}`,
      sub: "Revenue efficiency index",
      accentColor: "#f59e0b",
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

        {/* Page Header */}
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
          <div style={{
            background: "#f0fdf4", border: "1px solid #bbf7d0",
            borderRadius: 10, padding: "9px 16px",
            fontSize: 13, fontWeight: 700, color: "#16a34a",
          }}>
            Best day: {bestDay.day} — ₹{bestDay.revenue}
          </div>
        </div>

        {/* Metric Cards */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 16 }}>
          {metrics.map(m => <MetricCard key={m.label} {...m} />)}
        </div>

        {/* Charts Row */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}>
          <ChartCard title="Orders This Week" subtitle="Volume Trend">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={WEEKLY} margin={{ left: -20, right: 0, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9ca3af", fontWeight: 600 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f9fafb" }} />
                <Bar dataKey="orders" name="Orders" fill="#6366f1" radius={[5, 5, 0, 0]} barSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Revenue This Week" subtitle="Earnings Summary">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={WEEKLY} margin={{ left: -20, right: 0, top: 4, bottom: 0 }}>
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

        {/* Category Distribution */}
        <ChartCard title="Orders by Clothing Type" subtitle="Category Distribution">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {CATEGORIES.map(cat => {
              const pct = Math.round((cat.count / totalCatOrders) * 100);
              return (
                <div key={cat.name} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: cat.color, flexShrink: 0,
                  }} />
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
        </ChartCard>

      </div>
    </Layout>
  );
}
