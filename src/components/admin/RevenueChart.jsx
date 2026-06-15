import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { REVENUE_DATA } from "../../services/orderService";

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
          <span style={{ fontSize: 13, fontWeight: 800, color: item.color }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function RevenueChart() {
  return (
    <div style={{
      background: "#fff", borderRadius: 18,
      border: "1px solid #e5e7eb",
      boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
      overflow: "hidden",
    }}>
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #f3f4f6" }}>
        <p style={{ fontSize: 10.5, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 3px" }}>
          Platform Activity
        </p>
        <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>
          Revenue & Orders (2026)
        </h3>
      </div>
      <div style={{ padding: "20px 24px" }}>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={REVENUE_DATA} margin={{ top: 4, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="adminRevGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#DC2626" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#DC2626" stopOpacity={0}    />
              </linearGradient>
              <linearGradient id="adminOrdGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#06b6d4" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9ca3af", fontWeight: 600 }} />
            <YAxis yAxisId="left"  tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }} />
            <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9ca3af" }} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#f3f4f6", strokeWidth: 1 }} />
            <Legend iconType="circle" wrapperStyle={{ paddingTop: "16px", fontSize: "12px", fontWeight: "600", color: "#6b7280" }} />
            <Area yAxisId="left"  type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#DC2626" strokeWidth={2.5} fill="url(#adminRevGrad)" dot={{ r: 0 }} activeDot={{ r: 5, fill: "#DC2626",  strokeWidth: 0 }} />
            <Area yAxisId="right" type="monotone" dataKey="orders"  name="Orders"      stroke="#06b6d4" strokeWidth={2.5} fill="url(#adminOrdGrad)" dot={{ r: 0 }} activeDot={{ r: 5, fill: "#06b6d4", strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
