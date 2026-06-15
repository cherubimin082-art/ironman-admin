// LoginPage.jsx — Professional Split-Panel Design
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";

const ROLE_REDIRECT = {
  vendor: "/vendor/dashboard",
  delivery: "/delivery/dashboard",
  admin: "/admin/dashboard",
};

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: "Real-time Operations",
    desc: "Live order tracking across all vendors and delivery agents.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: "Role-Based Access",
    desc: "Secure, scoped dashboards for Admin, Vendor & Delivery staff.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: "Advanced Analytics",
    desc: "Revenue trends, capacity metrics, and performance reports.",
  },
];

const quickAccounts = [
  { label: "Vendor", phone: "9876543210", pass: "vendor123", role: "vendor", color: "#0ea5e9", bg: "rgba(14,165,233,0.08)", border: "rgba(14,165,233,0.2)" },
  { label: "Delivery", phone: "9123456789", pass: "delivery123", role: "delivery", color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)" },
  { label: "Admin", phone: "9000000000", pass: "admin123", role: "admin", color: "#DC2626", bg: "rgba(220,38,38,0.08)", border: "rgba(220,38,38,0.2)" },
];

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await login(phone.trim(), password);
      signIn(result.user, result.token);
      navigate(ROLE_REDIRECT[result.user.role], { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Invalid phone number or password.");
    } finally {
      setLoading(false);
    }
  }

  const quickLogin = async (phoneNum, pass, role) => {
    setPhone(phoneNum);
    setPassword(pass);
    setError("");
    setLoading(true);
    try {
      const result = await login(phoneNum, pass);
      signIn(result.user, result.token);
      navigate(ROLE_REDIRECT[role], { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Invalid phone number or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-root" style={styles.root}>
      {/* ── LEFT BRANDING PANEL ── */}
      <div className="login-left" style={styles.leftPanel}>
        {/* Animated mesh blobs */}
        <div style={styles.blob1} />
        <div style={styles.blob2} />
        <div style={styles.blob3} />

        {/* Grid texture overlay */}
        <div style={styles.gridOverlay} />

        <div style={styles.leftContent}>
          {/* Brand mark */}
          <div style={styles.brandRow}>
            <div style={styles.logoBox}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ width: 22, height: 22 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <span style={styles.brandName}>Smart Iron</span>
          </div>

          {/* Hero text */}
          <div style={styles.heroBlock}>
            <div style={styles.tagPill}>
              <span style={styles.tagDot} />
              Operations Platform
            </div>
            <h1 style={styles.heroHeading}>
              Manage your<br />
              <span style={styles.heroAccent}>laundry empire</span><br />
              with precision.
            </h1>
            <p style={styles.heroSub}>
              One unified dashboard for vendors, delivery teams, and administrators — built for speed and scale.
            </p>
          </div>

          {/* Feature list */}
          <div style={styles.featureList}>
            {features.map((f, i) => (
              <div key={i} style={styles.featureItem}>
                <div style={styles.featureIcon}>{f.icon}</div>
                <div>
                  <p style={styles.featureTitle}>{f.title}</p>
                  <p style={styles.featureDesc}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom trusted badge */}
          <div style={styles.trustedRow}>
            <div style={styles.avatarStack}>
              {["#f59e0b","#10b981","#3b82f6"].map((c, i) => (
                <div key={i} style={{ ...styles.avatar, background: c, marginLeft: i === 0 ? 0 : -10, zIndex: 3 - i }} />
              ))}
            </div>
            <span style={styles.trustedText}>Trusted by 200+ staff members daily</span>
          </div>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div style={styles.rightPanel}>
        <div style={styles.formContainer}>
          {/* Header */}
          <div style={styles.formHeader}>
            <h2 style={styles.formTitle}>Welcome back</h2>
            <p style={styles.formSub}>Sign in to your staff account to continue</p>
          </div>

          {/* Error banner */}
          {error && (
            <div style={styles.errorBanner}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, flexShrink: 0 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={styles.form}>
            {/* Phone */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Phone Number</label>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter 10-digit phone"
                  maxLength={10}
                  required
                  style={styles.input}
                  onFocus={e => { e.target.parentNode.style.borderColor = "#DC2626"; e.target.parentNode.style.boxShadow = "0 0 0 3px rgba(220,38,38,0.08)"; }}
                  onBlur={e => { e.target.parentNode.style.borderColor = "#e2e8f0"; e.target.parentNode.style.boxShadow = "none"; }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Password</label>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </span>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  style={{ ...styles.input, paddingRight: 48 }}
                  onFocus={e => { e.target.parentNode.style.borderColor = "#DC2626"; e.target.parentNode.style.boxShadow = "0 0 0 3px rgba(220,38,38,0.08)"; }}
                  onBlur={e => { e.target.parentNode.style.borderColor = "#e2e8f0"; e.target.parentNode.style.boxShadow = "none"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={styles.eyeBtn}
                  tabIndex={-1}
                >
                  {showPass ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitBtn,
                opacity: loading ? 0.75 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
              onMouseEnter={e => !loading && (e.target.style.transform = "translateY(-1px)")}
              onMouseLeave={e => (e.target.style.transform = "translateY(0)")}
            >
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <svg style={{ animation: "spin 0.8s linear infinite", width: 18, height: 18 }} viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
                    <path d="M22 12a10 10 0 00-10-10" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Authenticating...
                </span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  Sign In to Portal
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: 16, height: 16 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={styles.divider}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>Quick Demo Access</span>
            <div style={styles.dividerLine} />
          </div>

          {/* Quick Demo Accounts */}
          <div style={styles.quickGrid}>
            {quickAccounts.map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => quickLogin(acc.phone, acc.pass, acc.role)}
                style={{
                  ...styles.quickBtn,
                  background: acc.bg,
                  border: `1px solid ${acc.border}`,
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = `0 6px 20px ${acc.border}`; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{ ...styles.quickRoleDot, background: acc.color }} />
                <div>
                  <p style={{ ...styles.quickRoleLabel, color: acc.color }}>{acc.label}</p>
                  <p style={styles.quickRolePhone}>{acc.phone.slice(0, 5)}•••••</p>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke={acc.color} strokeWidth="2" style={{ width: 14, height: 14, marginLeft: "auto", opacity: 0.7 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            ))}
          </div>

          {/* Footer note */}
          <p style={styles.footerNote}>
            🔒 &nbsp;Secure staff-only portal. Unauthorized access is prohibited.
          </p>
        </div>
      </div>

      {/* Spin keyframe injected inline */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes floatBlob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 30px) scale(0.97); }
        }
      `}</style>
    </div>
  );
}

/* ─── Styles ──────────────────────────────────────────────────────────────── */
const styles = {
  root: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    background: "#f8fafc",
  },

  /* LEFT PANEL */
  leftPanel: {
    flex: "0 0 50%",
    background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%)",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    padding: "48px",
  },
  blob1: {
    position: "absolute", top: "-80px", left: "-80px",
    width: 400, height: 400,
    background: "radial-gradient(circle, rgba(220,38,38,0.4) 0%, transparent 70%)",
    borderRadius: "50%",
    animation: "floatBlob 10s ease-in-out infinite",
    opacity: 0,
  },
  blob2: {
    position: "absolute", bottom: "-60px", right: "-60px",
    width: 350, height: 350,
    background: "radial-gradient(circle, rgba(220,38,38,0.35) 0%, transparent 70%)",
    borderRadius: "50%",
    animation: "floatBlob 13s ease-in-out infinite reverse",
    opacity: 0,
  },
  blob3: {
    position: "absolute", top: "50%", left: "40%",
    width: 250, height: 250,
    background: "radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 70%)",
    borderRadius: "50%",
    animation: "floatBlob 8s ease-in-out infinite 2s",
    opacity: 0,
  },
  gridOverlay: {
    position: "absolute", inset: 0,
    backgroundImage: `linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)`,
    backgroundSize: "40px 40px",
    pointerEvents: "none",
  },
  leftContent: {
    position: "relative", zIndex: 1,
    display: "flex", flexDirection: "column", gap: 40,
    maxWidth: 440,
  },
  brandRow: {
    display: "flex", alignItems: "center", gap: 12,
  },
  logoBox: {
    width: 44, height: 44,
    borderRadius: 12,
    background: "rgba(255,255,255,0.15)",
    border: "1px solid rgba(255,255,255,0.2)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  brandName: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 20, fontWeight: 700,
    color: "white", letterSpacing: "0.04em",
  },
  heroBlock: {
    display: "flex", flexDirection: "column", gap: 16,
  },
  tagPill: {
    display: "inline-flex", alignItems: "center", gap: 8,
    background: "rgba(255,255,255,0.1)",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "rgba(255,255,255,0.8)",
    fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
    padding: "4px 12px", borderRadius: 99,
    width: "fit-content",
  },
  tagDot: {
    width: 7, height: 7, borderRadius: "50%",
    background: "#F87171",
    boxShadow: "0 0 8px #F87171",
  },
  heroHeading: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 38, fontWeight: 800, lineHeight: 1.2,
    color: "white", margin: 0,
  },
  heroAccent: {
    background: "linear-gradient(90deg, #F87171, #F87171)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  heroSub: {
    fontSize: 14, lineHeight: 1.7,
    color: "rgba(255,255,255,0.55)",
    margin: 0,
  },
  featureList: {
    display: "flex", flexDirection: "column", gap: 16,
  },
  featureItem: {
    display: "flex", alignItems: "flex-start", gap: 14,
  },
  featureIcon: {
    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.12)",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "#FCA5A5",
  },
  featureTitle: {
    fontSize: 13, fontWeight: 700, color: "white", margin: "0 0 2px",
  },
  featureDesc: {
    fontSize: 12, color: "rgba(255,255,255,0.45)", margin: 0, lineHeight: 1.5,
  },
  trustedRow: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "14px 18px",
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 14, width: "fit-content",
  },
  avatarStack: { display: "flex", alignItems: "center" },
  avatar: {
    width: 28, height: 28, borderRadius: "50%",
    border: "2px solid rgba(30,27,75,0.8)",
  },
  trustedText: {
    fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: 500,
  },

  /* RIGHT PANEL */
  rightPanel: {
    flex: 1,
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: "48px 24px",
    background: "#f8fafc",
  },
  formContainer: {
    width: "100%", maxWidth: 420,
    display: "flex", flexDirection: "column", gap: 24,
  },
  formHeader: {
    display: "flex", flexDirection: "column", gap: 6,
  },
  formTitle: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 28, fontWeight: 800, color: "#0f172a",
    margin: 0,
  },
  formSub: {
    fontSize: 13.5, color: "#94a3b8", margin: 0, fontWeight: 500,
  },

  /* Error */
  errorBanner: {
    display: "flex", alignItems: "center", gap: 10,
    background: "rgba(239,68,68,0.07)",
    border: "1px solid rgba(239,68,68,0.2)",
    borderRadius: 12, padding: "12px 16px",
    fontSize: 13, fontWeight: 600, color: "#dc2626",
  },

  /* Form */
  form: { display: "flex", flexDirection: "column", gap: 20 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 7 },
  label: {
    fontSize: 11, fontWeight: 700,
    color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em",
  },
  inputWrap: {
    position: "relative",
    display: "flex", alignItems: "center",
    background: "white",
    border: "1.5px solid #e2e8f0",
    borderRadius: 14,
    transition: "border-color 0.2s, box-shadow 0.2s",
    overflow: "hidden",
  },
  inputIcon: {
    position: "absolute", left: 14, color: "#94a3b8",
    display: "flex", alignItems: "center",
    pointerEvents: "none",
  },
  input: {
    width: "100%", border: "none", outline: "none",
    background: "transparent",
    paddingLeft: 42, paddingRight: 14, paddingTop: 13, paddingBottom: 13,
    fontSize: 14, color: "#1e293b",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
  },
  eyeBtn: {
    position: "absolute", right: 14,
    background: "none", border: "none", cursor: "pointer",
    color: "#94a3b8", display: "flex", alignItems: "center",
    padding: 4, borderRadius: 6,
  },

  /* Submit */
  submitBtn: {
    width: "100%", padding: "14px 24px",
    background: "linear-gradient(135deg, #B91C1C 0%, #B91C1C 100%)",
    border: "none", borderRadius: 14,
    color: "white", fontFamily: "'Outfit', sans-serif",
    fontSize: 15, fontWeight: 700, letterSpacing: "0.02em",
    transition: "transform 0.2s, box-shadow 0.2s",
    boxShadow: "0 6px 24px rgba(79,70,229,0.3)",
    marginTop: 4,
  },

  /* Divider */
  divider: {
    display: "flex", alignItems: "center", gap: 12,
  },
  dividerLine: { flex: 1, height: 1, background: "#e2e8f0" },
  dividerText: {
    fontSize: 11, fontWeight: 700, color: "#94a3b8",
    textTransform: "uppercase", letterSpacing: "0.08em",
    whiteSpace: "nowrap",
  },

  /* Quick accounts */
  quickGrid: { display: "flex", flexDirection: "column", gap: 10 },
  quickBtn: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "12px 16px", borderRadius: 12,
    cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s",
    textAlign: "left",
  },
  quickRoleDot: { width: 10, height: 10, borderRadius: "50%", flexShrink: 0 },
  quickRoleLabel: {
    fontSize: 12, fontWeight: 800,
    textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 2px",
  },
  quickRolePhone: {
    fontSize: 11, color: "#94a3b8", fontFamily: "monospace", margin: 0,
  },

  /* Footer */
  footerNote: {
    textAlign: "center", fontSize: 11.5,
    color: "#94a3b8", fontWeight: 500, margin: 0,
  },
};