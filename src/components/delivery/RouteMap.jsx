export default function RouteMap({ stops = [] }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 18,
      border: "1px solid #e5e7eb",
      boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
      padding: "22px 26px",
    }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 4px" }}>
        Route Overview
      </p>
      <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 24px" }}>
        Today's Delivery Route
      </h3>

      <div style={{ position: "relative", paddingLeft: 42 }}>
        {/* Dashed vertical timeline */}
        <div style={{
          position: "absolute",
          left: 13,
          top: 14,
          bottom: 14,
          borderLeft: "2px dashed #e5e7eb",
        }} />

        {stops.map((stop, i) => {
          const isFirst = i === 0;
          const isLast  = i === stops.length - 1;
          const markerColor = isFirst ? "#10b981" : isLast ? "#ef4444" : "#3b82f6";

          return (
            <div
              key={i}
              style={{
                position: "relative",
                display: "flex",
                alignItems: "flex-start",
                gap: 14,
                marginBottom: i < stops.length - 1 ? 24 : 0,
              }}
            >
              {/* Marker */}
              <div style={{
                position: "absolute",
                left: -42,
                width: 28, height: 28,
                borderRadius: 9,
                background: markerColor,
                boxShadow: `0 3px 10px ${markerColor}40`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                zIndex: 1,
              }}>
                {isFirst ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" style={{ width: 13, height: 13 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75" />
                  </svg>
                ) : isLast ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" style={{ width: 13, height: 13 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{i}</span>
                )}
              </div>

              {/* Text */}
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: "#111827", margin: "0 0 3px" }}>
                  {stop.label}
                </p>
                <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>{stop.address}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
