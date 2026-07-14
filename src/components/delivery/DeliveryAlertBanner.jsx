import { createPortal } from "react-dom";

// Stack of "ironing complete, deliver now" banners - one per order, so a
// second alert never silently overwrites/hides the first. Shared between
// DeliveryDashboard and ActiveDeliveryPage so both show the same alerts.
export default function DeliveryAlertBanner({ alerts, onDismiss }) {
  if (!alerts.length) return null;
  return createPortal(
    <div style={{
      position: "fixed", top: "calc(16px + env(safe-area-inset-top, 0px))", left: "50%", transform: "translateX(-50%)",
      zIndex: 1100, width: "calc(100% - 32px)", maxWidth: 480,
      display: "flex", flexDirection: "column", gap: 10,
    }}>
      {alerts.map(alert => (
        <div key={alert.orderId} style={{
          background: "#065f46", borderRadius: 16,
          boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
          display: "flex", alignItems: "center", gap: 14, padding: "16px 18px",
          animation: "slideDown 0.3s ease",
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
              <path d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: "white", margin: "0 0 2px" }}>Ironing Complete!</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.75)", margin: 0, fontWeight: 500 }}>
              Order #{alert.orderId} — deliver to customer now
            </p>
          </div>
          <button onClick={() => onDismiss(alert.orderId)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.6)", padding: 4, flexShrink: 0, display: "flex" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="18" height="18"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
}
