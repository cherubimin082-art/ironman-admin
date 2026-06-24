// Navbar.jsx — Professional Redesign (Inline Styles)
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

const ROLE_CONFIG = {
  vendor: {
    label: "Center Head",
    gradient: "linear-gradient(135deg,#DC2626,#B91C1C)",
    chipBg: "#FEF2F2", chipBorder: "#FECACA", chipColor: "#DC2626",
    dotColor: "#DC2626", dotGlow: "rgba(220,38,38,0.4)",
  },
  delivery: {
    label: "Delivery",
    gradient: "linear-gradient(135deg,#10b981,#06b6d4)",
    chipBg: "#f0fdf4", chipBorder: "#bbf7d0", chipColor: "#16a34a",
    dotColor: "#10b981", dotGlow: "rgba(16,185,129,0.4)",
  },
  admin: {
    label: "Admin",
    gradient: "linear-gradient(135deg,#DC2626,#7F1D1D)",
    chipBg: "#FEF2F2", chipBorder: "#FECACA", chipColor: "#DC2626",
    dotColor: "#DC2626", dotGlow: "rgba(220,38,38,0.4)",
  },
};

export default function Navbar({ onMenuClick }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const cfg = ROLE_CONFIG[user?.role] ?? ROLE_CONFIG.admin;
  const initials = user?.name?.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() ?? "?";
  const [logoutHover, setLogoutHover] = useState(false);

  function handleSignOut() {
    signOut();
    navigate("/", { replace: true });
  }

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      background: "#ffffff",
      borderBottom: "1px solid rgba(15,23,42,0.07)",
      boxShadow: "0 1px 0 rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.03)",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 24px", height: 60, maxWidth: "100%",
      }}>

        {/* ── LEFT: Hamburger + Logo ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Mobile hamburger */}
          <button
            onClick={onMenuClick}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 36, height: 36, borderRadius: 10,
              border: "1px solid #f1f5f9", background: "white",
              color: "#64748b", cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#e2e8f0"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "white"; e.currentTarget.style.borderColor = "#f1f5f9"; }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 16, height: 16 }}>
              <line x1="4" y1="8" x2="20" y2="8" />
              <line x1="4" y1="14" x2="14" y2="14" />
              <line x1="4" y1="20" x2="20" y2="20" />
            </svg>
          </button>

          {/* Logo mark */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src="/logo.png" alt="Iron Man" style={{ height: 36, width: "auto", objectFit: "contain", mixBlendMode: "multiply", filter: "brightness(1.1)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "#22c55e",
                boxShadow: "0 0 6px rgba(34,197,94,0.6)",
              }} />
              <span style={{ fontSize: 9.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                System Live
              </span>
            </div>
          </div>
        </div>

        {/* ── CENTER: Breadcrumb / Page indicator ── */}
        <div className="nav-center" style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#f8fafc", border: "1px solid #f1f5f9",
          borderRadius: 99, padding: "6px 14px",
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: "50%",
            background: cfg.dotColor,
            boxShadow: `0 0 8px ${cfg.dotGlow}`,
          }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#475569", letterSpacing: "0.04em" }}>
            {cfg.label} Portal
          </span>
        </div>

        {/* ── RIGHT: User chip + Logout ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>

          {/* User info chip */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "white", border: "1px solid #f1f5f9",
            borderRadius: 14, padding: "7px 14px 7px 7px",
            boxShadow: "0 1px 4px rgba(15,23,42,0.04)",
          }}>
            {/* Avatar */}
            <div style={{
              width: 30, height: 30, borderRadius: 9, flexShrink: 0,
              background: cfg.gradient,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 900, color: "white",
              letterSpacing: "0.02em",
            }}>
              {initials}
            </div>
            <div className="nav-user-text">
              <p style={{ fontSize: 12, fontWeight: 800, color: "#0f172a", margin: 0, lineHeight: 1.2 }}>
                {user?.name}
              </p>
              <p style={{ fontSize: 10, fontWeight: 600, color: "#94a3b8", margin: 0, textTransform: "capitalize" }}>
                {user?.role}
              </p>
            </div>
          </div>

          {/* Role badge */}
          <div className="nav-role-badge" style={{
            background: cfg.chipBg, border: `1px solid ${cfg.chipBorder}`,
            borderRadius: 99, padding: "5px 12px",
          }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: cfg.chipColor, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {cfg.label}
            </span>
          </div>

          {/* Divider */}
          <div className="nav-divider" style={{ width: 1, height: 28, background: "#f1f5f9" }} />

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            onMouseEnter={() => setLogoutHover(true)}
            onMouseLeave={() => setLogoutHover(false)}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "8px 14px", borderRadius: 11, minHeight: 44,
              border: logoutHover ? "1px solid #fecaca" : "1px solid #f1f5f9",
              background: logoutHover ? "#fef2f2" : "white",
              color: logoutHover ? "#dc2626" : "#64748b",
              fontSize: 12, fontWeight: 700,
              cursor: "pointer", transition: "all 0.2s",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="nav-signout-text">Sign Out</span>
          </button>
        </div>
      </div>
    </header>
  );
}