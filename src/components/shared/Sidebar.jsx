import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// ── Icons ─────────────────────────────────────────────────────
const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);
const OrdersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
    <path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 001.95-1.57L23 6H6" />
  </svg>
);
const CustomersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);
const StaffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const PaymentsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);
const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);

// ── Nav configs per role ──────────────────────────────────────
const ADMIN_LINKS = [
  { to: "/admin/dashboard",  label: "Dashboard",  Icon: DashboardIcon },
  { to: "/admin/orders",     label: "Orders",     Icon: OrdersIcon    },
  { to: "/admin/vendors",    label: "Vendors",    Icon: StaffIcon     },
  { to: "/admin/delivery",   label: "Staff",      Icon: StaffIcon     },
  { to: "/admin/apartments", label: "Apartments", Icon: CustomersIcon },
  { to: "/admin/pricing",    label: "Payments",   Icon: PaymentsIcon  },
  { to: "/admin/analytics",  label: "Settings",   Icon: SettingsIcon  },
];

const VENDOR_LINKS = [
  { to: "/vendor/dashboard",  label: "Dashboard", Icon: DashboardIcon },
  { to: "/vendor/orders",     label: "Orders",    Icon: OrdersIcon    },
  { to: "/vendor/staff",      label: "Staff",     Icon: StaffIcon     },
  { to: "/vendor/capacity",   label: "Capacity",  Icon: PaymentsIcon  },
  { to: "/vendor/reports",    label: "Reports",   Icon: SettingsIcon  },
  { to: "/vendor/apartments", label: "Locations", Icon: CustomersIcon },
];

const CompletedIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const DELIVERY_LINKS = [
  { to: "/delivery/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { to: "/delivery/pickups",   label: "Pickups",   Icon: OrdersIcon    },
  { to: "/delivery/active",    label: "Deliveries",Icon: StaffIcon     },
  { to: "/delivery/completed", label: "Completed", Icon: CompletedIcon },
  { to: "/delivery/earnings",  label: "Earnings",  Icon: PaymentsIcon  },
];

const SIDEBAR_BG = "#0D1B2A";

// ── NavItem ──────────────────────────────────────────────────
function NavItem({ to, label, Icon, onClose }) {
  return (
    <NavLink to={to} onClick={onClose} style={{ textDecoration: "none" }}>
      {({ isActive }) => (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "10px 14px", borderRadius: 10, marginBottom: 2,
          background: isActive ? "#B91C1C" : "transparent",
          cursor: "pointer", transition: "background 0.15s",
        }}>
          <span style={{ color: isActive ? "white" : "rgba(255,255,255,0.45)", display: "flex", flexShrink: 0 }}>
            <Icon />
          </span>
          <span style={{
            fontSize: 13.5, fontWeight: isActive ? 700 : 500,
            color: isActive ? "white" : "rgba(255,255,255,0.55)",
            flex: 1,
          }}>
            {label}
          </span>
        </div>
      )}
    </NavLink>
  );
}

// ── Sidebar ──────────────────────────────────────────────────
export default function Sidebar({ open, onClose, isMobile }) {
  const { user } = useAuth();
  const role = user?.role ?? "admin";
  const links = role === "vendor" ? VENDOR_LINKS : role === "delivery" ? DELIVERY_LINKS : ADMIN_LINKS;
  const initials = user?.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? "?";

  const sidebarStyle = isMobile
    ? {
        position: "fixed", top: 0, left: 0, height: "100%", width: 260, zIndex: 200,
        display: "flex", flexDirection: "column",
        background: SIDEBAR_BG,
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.26s cubic-bezier(0.4,0,0.2,1)",
        boxShadow: open ? "4px 0 24px rgba(0,0,0,0.35)" : "none",
      }
    : {
        position: "relative", width: 220, flexShrink: 0,
        display: "flex", flexDirection: "column",
        background: SIDEBAR_BG,
        minHeight: 0,
      };

  return (
    <>
      {/* Backdrop — mobile only */}
      {isMobile && (
        <div
          onClick={onClose}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 199,
            opacity: open ? 1 : 0,
            pointerEvents: open ? "auto" : "none",
            transition: "opacity 0.26s",
          }}
        />
      )}

      <aside style={sidebarStyle}>

        {/* ── Brand + close button ── */}
        <div style={{
          padding: "18px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: "white", letterSpacing: "-0.01em" }}>IRON MAN</span>
          {isMobile && (
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8, border: "none",
                background: "rgba(255,255,255,0.1)", color: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0,
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" width="16" height="16">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* ── Nav ── */}
        <nav style={{ flex: 1, padding: "14px 10px", overflowY: "auto" }}>
          {links.map(link => (
            <NavItem key={link.to} {...link} onClose={onClose} />
          ))}
        </nav>

        {/* ── User footer ── */}
        <div style={{
          padding: "14px 16px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 99, flexShrink: 0,
            background: "#B91C1C",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 13, fontWeight: 800, color: "white",
          }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "white", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.name}
            </p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: 0, textTransform: "capitalize" }}>
              {role === "admin" ? "Administrator" : role === "vendor" ? "Vendor Account" : "Delivery Partner"}
            </p>
          </div>
        </div>

      </aside>
    </>
  );
}
