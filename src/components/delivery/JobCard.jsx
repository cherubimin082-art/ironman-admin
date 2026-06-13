import StatusBadge from "../shared/StatusBadge";

function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 13, height: 13 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}

function PackageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 13, height: 13 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 13, height: 13 }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 13, height: 13 }}>
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" d="M12 6v6l3.5 2" />
    </svg>
  );
}

export default function JobCard({ job, onAccept }) {
  const isAvailable = job.status === "available";
  const accent = isAvailable ? "#10b981" : "#6b7280";

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        border: "1px solid #e5e7eb",
        boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.18s, box-shadow 0.18s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.10)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 1px 6px rgba(0,0,0,0.05)";
      }}
    >
      {/* Accent strip */}
      <div style={{ height: 4, background: accent, flexShrink: 0 }} />

      <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 3px" }}>
              Job ID
            </p>
            <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 800, color: "#111827", margin: 0 }}>
              {job.id}
            </p>
          </div>
          <StatusBadge status={job.status} />
        </div>

        <div style={{ height: 1, background: "#f3f4f6" }} />

        {/* Vendor info */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 11, flexShrink: 0,
            background: isAvailable ? "#f0fdf4" : "#f9fafb",
            color: accent,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <PinIcon />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 3px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {job.vendor}
            </p>
            <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>{job.address}</p>
          </div>
        </div>

        {/* Meta chips */}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
            <PackageIcon /> {job.orders} orders
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
            <RouteIcon /> {job.distance}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
            <ClockIcon /> {job.time}
          </span>
        </div>

        {/* Action */}
        <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 14, marginTop: "auto" }}>
          {isAvailable ? (
            <button
              onClick={() => onAccept(job.id)}
              style={{
                width: "100%", padding: "11px 0", border: "none",
                borderRadius: 10, cursor: "pointer",
                background: "linear-gradient(135deg, #10b981, #059669)",
                color: "#fff", fontSize: 13, fontWeight: 700,
                letterSpacing: "0.03em",
                transition: "opacity 0.15s, transform 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "none"; }}
            >
              Accept Job
            </button>
          ) : (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "9px 0", borderRadius: 10,
              background: "#f9fafb", border: "1px solid #e5e7eb",
              fontSize: 12, fontWeight: 700, color: "#6b7280",
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 13, height: 13 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Job Accepted
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
