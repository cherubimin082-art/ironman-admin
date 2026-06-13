import Layout from "../../components/shared/Layout";
import RevenueChart from "../../components/admin/RevenueChart";
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { useWindowSize } from "../../hooks/useWindowSize";

const ZONE_DATA = [
  { name: "Anna Nagar", value: 42 },
  { name: "T. Nagar",   value: 35 },
  { name: "Adyar",      value: 28 },
  { name: "Velachery",  value: 22 },
  { name: "Guindy",     value: 18 },
];

const ITEM_DATA = [
  { item: "Shirts",   count: 85 },
  { item: "Trousers", count: 62 },
  { item: "Sarees",   count: 40 },
  { item: "Kurtas",   count: 35 },
  { item: "Coats",    count: 18 },
];

const PIE_COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div style={{
      background: "#fff", border: "1px solid #f3f4f6",
      borderRadius: 10, padding: "9px 14px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.payload?.fill ?? item.color, display: "inline-block" }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
          {item.name ?? item.payload?.item}:
        </span>
        <span style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>{item.value}</span>
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

export default function AnalyticsPage() {
  const { isMobile } = useWindowSize();
  return (
    <Layout>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

        {/* Header */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#8b5cf6", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 5px" }}>
            Admin
          </p>
          <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 800, color: "#111827", margin: 0, lineHeight: 1.15 }}>
            Analytics
          </h1>
          <p style={{ fontSize: 13.5, color: "#9ca3af", margin: "6px 0 0", fontWeight: 400 }}>
            Platform performance metrics, zones, and popular garments.
          </p>
        </div>

        {/* Revenue chart */}
        <RevenueChart />

        {/* Zone + Items charts */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}>

          <ChartCard title="Orders by Zone" subtitle="Distribution">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={ZONE_DATA} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" outerRadius={88} innerRadius={52}
                  paddingAngle={4}
                >
                  {ZONE_DATA.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: "12px", fontWeight: "600", color: "#6b7280", paddingTop: "8px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Popular Items" subtitle="Demand">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ITEM_DATA} layout="vertical" margin={{ left: -10, right: 10, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis
                  type="number" tickLine={false} axisLine={false}
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                />
                <YAxis
                  dataKey="item" type="category" tickLine={false} axisLine={false}
                  tick={{ fontSize: 12, fill: "#374151", fontWeight: 600 }} width={68}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "#f9fafb" }} />
                <Bar dataKey="count" name="Orders" fill="#8b5cf6" radius={[0, 6, 6, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

        </div>
      </div>
    </Layout>
  );
}
