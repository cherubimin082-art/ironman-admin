// Tappable customer phone number - opens the phone dialer via tel:.
// Shared between Pickup Jobs and Active Deliveries cards.
export default function CallCustomerLink({ phone, compact = false }) {
  if (!phone) return null;
  return (
    <a
      href={`tel:${phone}`}
      onClick={e => e.stopPropagation()}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: compact ? "4px 10px" : "6px 12px",
        borderRadius: 8, background: "#f0fdf4", color: "#16a34a",
        fontSize: compact ? 11.5 : 12.5, fontWeight: 700, textDecoration: "none",
        border: "1px solid #bbf7d0", width: "fit-content",
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: compact ? 12 : 13, height: compact ? 12 : 13, flexShrink: 0 }}>
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.8 19.79 19.79 0 0110 2.18C10.51 2 11.06 2 11.62 2A2 2 0 0114 3.87c.15.6.35 1.19.59 1.76a2 2 0 01-.45 2.11L13 8.91a16 16 0 006.08 6.08l1.17-1.17a2 2 0 012.11-.45c.57.24 1.16.44 1.76.59a2 2 0 011.88 2.04z"/>
      </svg>
      {phone}
    </a>
  );
}
