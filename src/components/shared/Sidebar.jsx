// Sidebar.jsx — Professional Redesign (Inline Styles)
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import * as Icons from "./Icons";
import { useState, useEffect } from "react";

/* ─── Nav Links ─────────────────────────────────────────── */
const VENDOR_LINKS = [
  { to: "/vendor/dashboard",    label: "Dashboard",    icon: Icons.HomeIcon,     emoji: "🏠" },
  { to: "/vendor/orders",       label: "Order Queue",  icon: Icons.OrderIcon,    emoji: "📋" },
  { to: "/vendor/capacity",     label: "Capacity",     icon: Icons.CapacityIcon, emoji: "⚡" },
  { to: "/vendor/staff",        label: "Staff",        icon: Icons.StaffIcon,    emoji: "👥" },
  { to: "/vendor/reports",      label: "Reports",      icon: Icons.ReportIcon,   emoji: "📊" },
  { to: "/vendor/apartments",   label: "Apartments",   icon: Icons.MapPinIcon,   emoji: "🏢" },
];

const DELIVERY_LINKS = [
  { to: "/delivery/dashboard", label: "Dashboard",       icon: Icons.HomeIcon,     emoji: "🏠" },
  { to: "/delivery/pickups",   label: "Pickup Jobs",     icon: Icons.OrderIcon,    emoji: "📦" },
  { to: "/delivery/active",    label: "Delivery Jobs",   icon: Icons.DeliveryIcon, emoji: "🚚" },
  { to: "/delivery/earnings",  label: "Earnings",        icon: Icons.PricingIcon,  emoji: "💰" },
];

const ADMIN_LINKS = [
  { to: "/admin/dashboard",  label: "Dashboard",  icon: Icons.HomeIcon,      emoji: "🏠" },
  { to: "/admin/orders",     label: "Orders",     icon: Icons.OrderIcon,     emoji: "📋" },
  { to: "/admin/vendors",    label: "Vendors",    icon: Icons.StaffIcon,     emoji: "🏪" },
  { to: "/admin/delivery",   label: "Delivery",   icon: Icons.DeliveryIcon,  emoji: "🚚" },
  { to: "/admin/pricing",    label: "Pricing",    icon: Icons.PricingIcon,   emoji: "💲" },
  { to: "/admin/analytics",  label: "Analytics",  icon: Icons.AnalyticsIcon, emoji: "📈" },
];

/* ─── Role Theming ──────────────────────────────────────── */
const ROLE_THEME = {
  vendor: {
    gradient: "linear-gradient(135deg,#DC2626,#B91C1C)",
    activeText: "#DC2626",
    activeBg: "#FEF2F2",
    activeBorder: "#FECACA",
    activeIconBg: "#FEE2E2",
    glow: "rgba(220,38,38,0.15)",
    dot: "#DC2626",
    portal: "Vendor Portal",
  },
  delivery: {
    gradient: "linear-gradient(135deg,#10b981,#06b6d4)",
    activeText: "#059669",
    activeBg: "#f0fdf4",
    activeBorder: "#bbf7d0",
    activeIconBg: "#d1fae5",
    glow: "rgba(16,185,129,0.15)",
    dot: "#10b981",
    portal: "Delivery Portal",
  },
  admin: {
    gradient: "linear-gradient(135deg,#DC2626,#7F1D1D)",
    activeText: "#DC2626",
    activeBg: "#FEF2F2",
    activeBorder: "#FECACA",
    activeIconBg: "#FEE2E2",
    glow: "rgba(220,38,38,0.15)",
    dot: "#DC2626",
    portal: "Admin Portal",
  },
};

/* ─── Single Nav Item ───────────────────────────────────── */
function NavItem({ to, label, icon: IconComponent, theme, onClose }) {
  const [hovered, setHovered] = useState(false);

  return (
    <NavLink
      to={to}
      onClick={onClose}
      style={{ textDecoration: "none" }}
    >
      {({ isActive }) => (
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "10px 12px", borderRadius: 12, cursor: "pointer",
            marginBottom: 2,
            background: isActive
              ? theme.activeBg
              : hovered ? "#f8fafc" : "transparent",
            border: isActive
              ? `1px solid ${theme.activeBorder}`
              : "1px solid transparent",
            transition: "all 0.15s",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Active left bar */}
          {isActive && (
            <div style={{
              position: "absolute", left: 0, top: "20%", bottom: "20%",
              width: 3, borderRadius: "0 3px 3px 0",
              background: theme.activeText,
            }} />
          )}

          {/* Icon box */}
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: isActive ? theme.activeIconBg : hovered ? "#f1f5f9" : "#f8fafc",
            border: `1px solid ${isActive ? theme.activeBorder : "#f1f5f9"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: isActive ? theme.activeText : "#64748b",
            transition: "all 0.15s",
          }}>
            <IconComponent
              style={{ width: 16, height: 16 }}
              strokeWidth={isActive ? 2.2 : 1.8}
            />
          </div>

          {/* Label */}
          <span style={{
            fontSize: 13, fontWeight: isActive ? 700 : 600,
            color: isActive ? theme.activeText : hovered ? "#334155" : "#64748b",
            flex: 1, transition: "color 0.15s",
          }}>
            {label}
          </span>

          {/* Active dot indicator */}
          {isActive && (
            <div style={{
              width: 7, height: 7, borderRadius: "50%",
              background: theme.activeText,
              boxShadow: `0 0 8px ${theme.dot}`,
              flexShrink: 0,
            }} />
          )}
        </div>
      )}
    </NavLink>
  );
}

/* ─── Sidebar ───────────────────────────────────────────── */
export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const role = user?.role ?? "admin";
  const links = role === "vendor" ? VENDOR_LINKS : role === "delivery" ? DELIVERY_LINKS : ADMIN_LINKS;
  const theme = ROLE_THEME[role] ?? ROLE_THEME.admin;
  const initials = user?.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? "?";

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  const asideStyle = isMobile
    ? {
        position: "fixed", top: 0, left: 0, height: "100%",
        width: 252, zIndex: 40,
        display: "flex", flexDirection: "column",
        background: "white",
        borderRight: "1px solid #f1f5f9",
        boxShadow: "4px 0 24px rgba(15,23,42,0.05)",
        transform: open ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
        fontFamily: "'Plus Jakarta Sans',sans-serif",
      }
    : {
        position: "relative",
        width: 252, flexShrink: 0,
        display: "flex", flexDirection: "column",
        background: "white",
        borderRight: "1px solid #f1f5f9",
        fontFamily: "'Plus Jakarta Sans',sans-serif",
      };

  return (
    <>
      {/* Mobile overlay — only rendered on small screens when sidebar is open */}
      {isMobile && open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(15,23,42,0.45)",
            zIndex: 30,
          }}
        />
      )}

      <aside style={asideStyle}>

        {/* ── BRAND HEADER ── */}
        <div style={{
          padding: "20px 18px 16px",
          borderBottom: "1px solid #f1f5f9",
          position: "relative", overflow: "hidden",
        }}>
          {/* Subtle glow bg */}
          <div style={{
            position: "absolute", top: -30, right: -30,
            width: 120, height: 120,
            background: theme.gradient, opacity: 0.06,
            borderRadius: "50%",
            pointerEvents: "none",
          }} />

          {/* Logo row */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, position: "relative" }}>
            <img src="/logo.png" alt="Iron Man" style={{ height: 44, width: "auto", objectFit: "contain" }} />
            <div style={{
              background: theme.activeBg, border: `1px solid ${theme.activeBorder}`,
              borderRadius: 99, padding: "1px 8px",
            }}>
              <span style={{ fontSize: 9, fontWeight: 800, color: theme.activeText, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                {theme.portal}
              </span>
            </div>
          </div>
        </div>

        {/* ── USER MINI PROFILE ── */}
        <div style={{
          margin: "12px 14px",
          background: "#f8fafc", border: "1px solid #f1f5f9",
          borderRadius: 14, padding: "12px 14px",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 11, flexShrink: 0,
            background: theme.gradient,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 900, color: "white",
            boxShadow: `0 3px 10px ${theme.glow}`,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12.5, fontWeight: 800, color: "#0f172a", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user?.name}
            </p>
            <p style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", margin: 0, textTransform: "capitalize" }}>
              {role} Account
            </p>
          </div>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "#22c55e",
            boxShadow: "0 0 6px rgba(34,197,94,0.5)",
            flexShrink: 0,
          }} />
        </div>

        {/* ── NAVIGATION ── */}
        <nav style={{ flex: 1, padding: "4px 10px", overflowY: "auto" }}>
          <p style={{ fontSize: 9.5, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.12em", padding: "6px 12px 8px", margin: 0 }}>
            Navigation
          </p>
          {links.map(link => (
            <NavItem key={link.to} {...link} theme={theme} onClose={onClose} />
          ))}
        </nav>

        {/* ── FOOTER ── */}
        <div style={{
          padding: "14px 18px",
          borderTop: "1px solid #f1f5f9",
          background: "#fafbfc",
        }}>
          {/* Status row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div style={{
                width: 7, height: 7, borderRadius: "50%",
                background: "#22c55e",
                boxShadow: "0 0 6px rgba(34,197,94,0.5)",
              }} />
              <span style={{ fontSize: 10.5, fontWeight: 700, color: "#64748b" }}>All Systems Online</span>
            </div>
            <span style={{ fontSize: 9.5, fontWeight: 600, color: "#94a3b8" }}>v2.0</span>
          </div>

          {/* Time */}
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 500 }}>Smart Iron Operations</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#475569", fontVariantNumeric: "tabular-nums" }}>
              {timeStr}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}