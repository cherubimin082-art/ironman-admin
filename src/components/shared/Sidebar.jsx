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
    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
    <rect x="9" y="3" width="6" height="4" rx="1" />
    <line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" />
  </svg>
);
const CustomersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);
const IronsHeadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const DeliveryBoyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <circle cx="5.5" cy="17.5" r="2.5" />
    <circle cx="18.5" cy="17.5" r="2.5" />
    <path d="M5.5 17.5h7L15 9l2 3h3" />
    <path d="M12 17.5l-2-5 4-3.5" />
    <circle cx="15" cy="5" r="1.5" />
  </svg>
);
const ApartmentIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <rect x="1" y="3" width="15" height="18" rx="1" />
    <path d="M16 8h4l3 3v9h-7" />
    <line x1="5" y1="8" x2="5" y2="8.01" /><line x1="9" y1="8" x2="9" y2="8.01" />
    <line x1="5" y1="12" x2="5" y2="12.01" /><line x1="9" y1="12" x2="9" y2="12.01" />
    <line x1="5" y1="16" x2="5" y2="16.01" /><line x1="9" y1="16" x2="9" y2="16.01" />
  </svg>
);
const PricingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
  </svg>
);
const AnalyticsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
    <line x1="2" y1="20" x2="22" y2="20" />
  </svg>
);
const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);
const CapacityIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);
const LocationIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
const PickupIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M21 10H3" /><path d="M21 6H3" />
    <path d="M12 14H3" /><path d="M12 18H3" />
    <polyline points="17 14 20 17 17 20" />
    <line x1="20" y1="17" x2="13" y2="17" />
  </svg>
);
const TruckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <rect x="1" y="3" width="15" height="13" rx="1" />
    <path d="M16 8h4l3 3v5h-7V8z" />
    <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);
const CompletedIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const EarningsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
  </svg>
);
const ActivityLogIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <path d="M12 8v4l3 3" />
    <circle cx="12" cy="12" r="9" />
  </svg>
);

// ── Nav configs per role ──────────────────────────────────────
const ADMIN_LINKS = [
  { to: "/admin/dashboard",     label: "Dashboard",    Icon: DashboardIcon    },
  { to: "/admin/orders",        label: "Orders",       Icon: OrdersIcon       },
  { to: "/admin/customers",     label: "Customers",    Icon: CustomersIcon    },
  { to: "/admin/vendors",       label: "Center Heads", Icon: IronsHeadIcon    },
  { to: "/admin/delivery",      label: "Delivery Boys",Icon: DeliveryBoyIcon  },
  { to: "/admin/apartments",    label: "Apartments",   Icon: ApartmentIcon    },
  { to: "/admin/activity-log",  label: "Iron Log",     Icon: ActivityLogIcon  },
  { to: "/admin/analytics",     label: "Settings",     Icon: SettingsIcon     },
];

const TabletIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <line x1="12" y1="18" x2="12" y2="18.01" />
  </svg>
);

const VENDOR_LINKS = [
  { to: "/vendor/dashboard",  label: "Dashboard",   Icon: DashboardIcon  },
  { to: "/tablet",            label: "Iron Tablet",  Icon: TabletIcon,    external: true },
  { to: "/vendor/orders",     label: "Orders",       Icon: OrdersIcon     },
  { to: "/vendor/staff",      label: "Delivery Boy", Icon: DeliveryBoyIcon },
  { to: "/vendor/capacity",   label: "Capacity",     Icon: CapacityIcon   },
  { to: "/vendor/pricing",    label: "Pricing",      Icon: PricingIcon    },
  { to: "/vendor/reports",    label: "Reports",      Icon: AnalyticsIcon  },
  { to: "/vendor/apartments", label: "Locations",    Icon: LocationIcon   },
];

const DELIVERY_LINKS = [
  { to: "/delivery/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { to: "/delivery/pickups",   label: "Pickups",   Icon: PickupIcon    },
  { to: "/delivery/active",    label: "Deliveries",Icon: TruckIcon     },
  { to: "/delivery/completed", label: "Completed", Icon: CompletedIcon },
  { to: "/delivery/earnings",  label: "Earnings",  Icon: EarningsIcon  },
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

function ExternalNavItem({ to, label, Icon, onClose }) {
  return (
    <a href={to} target="_blank" rel="noopener noreferrer" onClick={onClose} style={{ textDecoration: "none" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "10px 14px", borderRadius: 10, marginBottom: 2,
        background: "transparent", cursor: "pointer", transition: "background 0.15s",
      }}>
        <span style={{ color: "rgba(255,255,255,0.45)", display: "flex", flexShrink: 0 }}>
          <Icon />
        </span>
        <span style={{ fontSize: 13.5, fontWeight: 500, color: "rgba(255,255,255,0.55)", flex: 1 }}>
          {label}
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="12" height="12" style={{ color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>
          <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
          <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </div>
    </a>
  );
}

// ── Mobile bottom tab bar (delivery role only) ─────────────────
function BottomNav({ links }) {
  return (
    <nav style={{
      position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 200,
      background: SIDEBAR_BG,
      borderTop: "1px solid rgba(255,255,255,0.08)",
      boxShadow: "0 -2px 16px rgba(0,0,0,0.25)",
      display: "flex",
      paddingBottom: "env(safe-area-inset-bottom, 0px)",
    }}>
      {links.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} style={{ textDecoration: "none", flex: 1 }}>
          {({ isActive }) => (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 3, padding: "9px 2px 7px",
            }}>
              <span style={{ color: isActive ? "white" : "rgba(255,255,255,0.45)", display: "flex" }}>
                <Icon />
              </span>
              <span style={{
                fontSize: 10, fontWeight: isActive ? 700 : 600,
                color: isActive ? "white" : "rgba(255,255,255,0.45)",
                whiteSpace: "nowrap",
              }}>
                {label}
              </span>
            </div>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

// ── Sidebar ──────────────────────────────────────────────────
export default function Sidebar({ open, onClose, isMobile }) {
  const { user } = useAuth();
  const role = user?.role ?? "admin";
  const links = role === "vendor" ? VENDOR_LINKS : role === "delivery" ? DELIVERY_LINKS : ADMIN_LINKS;
  const initials = user?.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? "?";

  // Delivery role gets a bottom tab bar on mobile instead of the slide-out drawer.
  if (isMobile && role === "delivery") {
    return <BottomNav links={links} />;
  }

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
            link.external
              ? <ExternalNavItem key={link.to} {...link} onClose={onClose} />
              : <NavItem key={link.to} {...link} onClose={onClose} />
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
              {role === "admin" ? "Administrator" : role === "vendor" ? "Center Head Account" : "Delivery Partner"}
            </p>
          </div>
        </div>

      </aside>
    </>
  );
}
