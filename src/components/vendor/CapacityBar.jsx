export default function CapacityBar({ label, current, max, color = "indigo" }) {
  const pct = max > 0 ? Math.min(Math.round((current / max) * 100), 100) : 0;

  const palette = {
    indigo: { bar: "linear-gradient(90deg, #DC2626, #F87171)", track: "#FEE2E2", text: "#B91C1C" },
    green:  { bar: "linear-gradient(90deg, #10b981, #34d399)", track: "#d1fae5", text: "#059669" },
    amber:  { bar: "linear-gradient(90deg, #f59e0b, #fbbf24)", track: "#fef3c7", text: "#d97706" },
    red:    { bar: "linear-gradient(90deg, #ef4444, #f87171)", track: "#fee2e2", text: "#dc2626" },
  };

  const resolved = pct >= 90 ? palette.red : pct >= 70 ? palette.amber : (palette[color] ?? palette.indigo);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* Label row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#6b7280" }}>
            {current}<span style={{ color: "#d1d5db" }}> / {max}</span>
          </span>
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: resolved.text,
            background: resolved.track,
            borderRadius: 6, padding: "2px 7px",
          }}>
            {pct}%
          </span>
        </div>
      </div>

      {/* Track */}
      <div style={{ height: 7, borderRadius: 99, background: resolved.track, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: resolved.bar,
          borderRadius: 99,
          transition: "width 0.55s cubic-bezier(0.4, 0, 0.2, 1)",
        }} />
      </div>
    </div>
  );
}
