import { useState, useRef, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { requestOtp, verifyOtp, loginWithPassword } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { useWindowSize } from "../../hooks/useWindowSize";

const ROLE_REDIRECT = {
  vendor:   "/vendor/dashboard",
  delivery: "/delivery/dashboard",
  admin:    "/admin/dashboard",
};

const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
    label: "Real-time Operations",
    desc: "Live order tracking across all branches",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    label: "Role-Based Access",
    desc: "Admin, Center Head & Delivery dashboards",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    label: "Advanced Analytics",
    desc: "Revenue trends & performance reports",
  },
];

export default function LoginPage() {
  const [method, setMethod]       = useState("otp");
  const [step, setStep]           = useState("phone");
  const [phone, setPhone]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [digits, setDigits]       = useState(["", "", "", ""]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [countdown, setCountdown] = useState(0);

  const inputRefs = [useRef(), useRef(), useRef(), useRef()];
  const timerRef  = useRef(null);

  const { user, signIn } = useAuth();
  const navigate = useNavigate();
  const { isMobile, isTablet } = useWindowSize();
  const isCompact = isMobile || isTablet;

  useEffect(() => {
    if (step === "verify") {
      setTimeout(() => inputRefs[0].current?.focus(), 80);
      startCountdown();
    }
  }, [step]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  if (user) return <Navigate to={ROLE_REDIRECT[user.role] || "/"} replace />;

  function switchMethod(m) {
    setMethod(m); setStep("phone"); setError("");
    setDigits(["", "", "", ""]); setPassword("");
    clearInterval(timerRef.current);
  }

  function startCountdown() {
    clearInterval(timerRef.current);
    setCountdown(30);
    timerRef.current = setInterval(() => {
      setCountdown(c => { if (c <= 1) { clearInterval(timerRef.current); return 0; } return c - 1; });
    }, 1000);
  }

  function finish(result) {
    signIn(result.user, result.token);
    navigate(ROLE_REDIRECT[result.user.role], { replace: true });
  }

  async function handleRequestOtp(e) {
    e.preventDefault();
    const clean = phone.replace(/\D/g, "");
    if (clean.length < 10) { setError("Enter a valid 10-digit mobile number"); return; }
    setLoading(true); setError("");
    try { await requestOtp(clean); setStep("verify"); }
    catch (err) { setError(err.response?.data?.message || "Something went wrong. Try again."); }
    finally { setLoading(false); }
  }

  async function handleVerifyOtp(otp) {
    setLoading(true); setError("");
    try { finish(await verifyOtp(phone.replace(/\D/g, ""), otp)); }
    catch (err) {
      setError(err.response?.data?.message || "Incorrect OTP. Try again.");
      setDigits(["", "", "", ""]);
      setTimeout(() => inputRefs[0].current?.focus(), 50);
    } finally { setLoading(false); }
  }

  function handleDigit(idx, val) {
    const d = val.replace(/\D/g, "").slice(-1);
    const next = [...digits]; next[idx] = d; setDigits(next); setError("");
    if (d && idx < 3) inputRefs[idx + 1].current?.focus();
    if (next.every(x => x) && idx === 3) handleVerifyOtp(next.join(""));
  }

  function handleKeyDown(idx, e) {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) inputRefs[idx - 1].current?.focus();
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (pasted.length === 4) { setDigits(pasted.split("")); inputRefs[3].current?.focus(); handleVerifyOtp(pasted); }
  }

  async function handleResend() {
    if (countdown > 0 || loading) return;
    setLoading(true); setError("");
    try {
      await requestOtp(phone.replace(/\D/g, ""));
      setDigits(["", "", "", ""]);
      setTimeout(() => inputRefs[0].current?.focus(), 50);
      startCountdown();
    } catch (err) { setError(err.response?.data?.message || "Failed to resend OTP."); }
    finally { setLoading(false); }
  }

  async function handlePasswordLogin(e) {
    if (e?.preventDefault) e.preventDefault();
    const clean = phone.replace(/\D/g, "");
    if (clean.length < 10) { setError("Enter a valid 10-digit mobile number"); return; }
    if (!password) { setError("Enter your password"); return; }
    setLoading(true); setError("");
    try { finish(await loginWithPassword(clean, password)); }
    catch (err) { setError(err.response?.data?.message || "Login failed. Try again."); }
    finally { setLoading(false); }
  }

  const maskedPhone = phone ? `+91 ${phone.slice(0, 2)}XXXXXXX${phone.slice(-1)}` : "";

  const inputBase = {
    width: "100%", border: "none", outline: "none", background: "transparent",
    paddingLeft: 44, paddingRight: 14, paddingTop: 14, paddingBottom: 14,
    fontSize: 14, color: "#0F172A", fontFamily: "inherit", boxSizing: "border-box",
  };

  const PhoneInput = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Mobile Number
      </label>
      <div style={{ position: "relative", display: "flex", alignItems: "center", background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 14, transition: "border-color 0.2s, box-shadow 0.2s" }}
        onFocusCapture={e => { e.currentTarget.style.borderColor = "#B91C1C"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(185,28,28,0.08)"; }}
        onBlurCapture={e => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.boxShadow = "none"; }}
      >
        <span style={{ position: "absolute", left: 14, color: "#94A3B8", display: "flex", pointerEvents: "none" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
            <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
          </svg>
        </span>
        <input type="tel" value={phone}
          onChange={e => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(""); }}
          placeholder="10-digit mobile number" maxLength={10} autoFocus required style={inputBase}
        />
      </div>
    </div>
  );

  /* ── Tab switcher ── */
  const TabBar = () => (
    <div style={{ display: "flex", background: "#F1F5F9", borderRadius: 14, padding: 4, gap: 4 }}>
      {[
        { key: "otp", label: "OTP Login", icon: <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg> },
        { key: "password", label: "Password", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> },
      ].map(t => (
        <button key={t.key} onClick={() => switchMethod(t.key)} style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          padding: "9px 12px", borderRadius: 10, border: "none", cursor: "pointer",
          fontSize: 13, fontWeight: 700, transition: "all 0.2s",
          background: method === t.key ? "#fff" : "transparent",
          color: method === t.key ? "#B91C1C" : "#94A3B8",
          boxShadow: method === t.key ? "0 1px 6px rgba(0,0,0,0.08)" : "none",
        }}>
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  );

  /* ── OTP flow ── */
  const OtpContent = () => step === "phone" ? (
    <form onSubmit={handleRequestOtp} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {PhoneInput()}
      {error && <ErrorBanner msg={error} />}
      <SubmitBtn loading={loading} loadingLabel="Sending OTP…">
        <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          Send OTP via WhatsApp
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        </span>
      </SubmitBtn>
    </form>
  ) : (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* WhatsApp sent banner */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 14, padding: "14px 16px" }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: "#22C55E", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg fill="white" viewBox="0 0 24 24" width="20" height="20"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#15803D", margin: 0 }}>OTP sent to WhatsApp</p>
          <p style={{ fontSize: 12, color: "#16A34A", margin: "2px 0 0", fontWeight: 500 }}>{maskedPhone}</p>
        </div>
      </div>

      {/* OTP boxes */}
      <div>
        <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 10 }}>Enter 4-digit OTP</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }} onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input key={i} ref={inputRefs[i]} type="tel" inputMode="numeric" maxLength={1} value={d}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              style={{
                width: "100%", height: 60, textAlign: "center", fontSize: 24, fontWeight: 800,
                border: `2.5px solid ${d ? "#B91C1C" : "#E2E8F0"}`,
                borderRadius: 14, outline: "none",
                background: d ? "#FEF2F2" : "#F8FAFC", color: d ? "#B91C1C" : "#0F172A",
                transition: "all 0.15s", boxSizing: "border-box",
              }}
              onFocus={e => { e.target.style.borderColor = "#B91C1C"; e.target.style.boxShadow = "0 0 0 3px rgba(185,28,28,0.1)"; }}
              onBlur={e => { if (!d) { e.target.style.borderColor = "#E2E8F0"; e.target.style.boxShadow = "none"; } }}
            />
          ))}
        </div>
      </div>

      {error && <ErrorBanner msg={error} />}

      <SubmitBtn
        loading={loading} loadingLabel="Verifying…"
        disabled={loading || digits.some(d => !d)}
        onClick={() => handleVerifyOtp(digits.join(""))}
        type="button"
      >
        Verify & Sign In
      </SubmitBtn>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => { setStep("phone"); setDigits(["","","",""]); setError(""); clearInterval(timerRef.current); }}
          style={{ fontSize: 12, color: "#94A3B8", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}>
          ← Change number
        </button>
        {countdown > 0
          ? <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500 }}>Resend in {countdown}s</span>
          : <button onClick={handleResend} disabled={loading}
              style={{ fontSize: 12, fontWeight: 700, color: "#B91C1C", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              Resend OTP
            </button>
        }
      </div>
    </div>
  );

  /* ── Password flow ── */
  const PasswordContent = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {PhoneInput()}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em" }}>Password</label>
        <div style={{ position: "relative", display: "flex", alignItems: "center", background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 14, transition: "border-color 0.2s, box-shadow 0.2s" }}
          onFocusCapture={e => { e.currentTarget.style.borderColor = "#B91C1C"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(185,28,28,0.08)"; }}
          onBlurCapture={e => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.boxShadow = "none"; }}
        >
          <span style={{ position: "absolute", left: 14, color: "#94A3B8", display: "flex", pointerEvents: "none" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          </span>
          <input type={showPass ? "text" : "password"} value={password}
            onChange={e => { setPassword(e.target.value); setError(""); }}
            onKeyDown={e => e.key === "Enter" && handlePasswordLogin(e)}
            placeholder="Enter your password"
            style={{ ...inputBase, paddingRight: 46 }}
          />
          <button type="button" onClick={() => setShowPass(p => !p)}
            style={{ position: "absolute", right: 12, background: "none", border: "none", cursor: "pointer", color: "#94A3B8", display: "flex", alignItems: "center", padding: 4 }}>
            {showPass
              ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/></svg>
              : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            }
          </button>
        </div>
      </div>
      {error && <ErrorBanner msg={error} />}
      <SubmitBtn type="button" onClick={handlePasswordLogin} loading={loading} loadingLabel="Signing in…">Sign In</SubmitBtn>
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F8FAFC", fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>

      {/* ── Left branding panel — desktop only ── */}
      {!isCompact && (
        <div style={{ width: "48%", flexShrink: 0, background: "#0F172A", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", padding: "52px 52px" }}>
          {/* Background accents */}
          <div style={{ position: "absolute", top: -100, right: -100, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(185,28,28,0.25) 0%, transparent 65%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -80, left: -60, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(185,28,28,0.15) 0%, transparent 65%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)", backgroundSize: "44px 44px", pointerEvents: "none" }} />

          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 44, maxWidth: 460, width: "100%" }}>

            {/* Brand */}
            <img src="/logo1.png" alt="Iron Man" style={{ height: 72, width: "auto", objectFit: "contain", alignSelf: "flex-start" }} />

            {/* Hero text */}
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(185,28,28,0.15)", border: "1px solid rgba(185,28,28,0.3)", borderRadius: 99, padding: "5px 14px", marginBottom: 20 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#F87171", boxShadow: "0 0 8px #F87171" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#FCA5A5", letterSpacing: "0.08em", textTransform: "uppercase" }}>Operations Platform</span>
              </div>
              <h1 style={{ fontSize: 40, fontWeight: 900, lineHeight: 1.15, color: "white", margin: "0 0 16px" }}>
                Manage your<br />
                <span style={{ background: "linear-gradient(90deg, #F87171, #FCA5A5)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  ironing empire
                </span><br />
                with precision.
              </h1>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.45)", margin: 0 }}>
                One unified dashboard for Center Heads, delivery teams, and administrators — built for speed and scale.
              </p>
            </div>

            {/* Features */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {FEATURES.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "14px 18px" }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: "rgba(185,28,28,0.2)", border: "1px solid rgba(185,28,28,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#FCA5A5" }}>
                    {f.icon}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "white", margin: "0 0 2px" }}>{f.label}</p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0 }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Social proof */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ display: "flex" }}>
                {["#F59E0B", "#10B981", "#3B82F6", "#8B5CF6"].map((c, i) => (
                  <div key={i} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: "2px solid #0F172A", marginLeft: i === 0 ? 0 : -8, zIndex: 4 - i, position: "relative" }} />
                ))}
              </div>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>Trusted by 200+ staff members daily</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Right form panel ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: isCompact ? "36px 20px 48px" : "48px 24px", overflowY: "auto" }}>
        <div style={{ width: "100%", maxWidth: 420 }}>

          {/* Mobile brand header */}
          {isCompact && (
            <div style={{ marginBottom: 28 }}>
              <img src="/logo1.png" alt="Iron Man" style={{ height: 40, width: "auto", objectFit: "contain" }} />
            </div>
          )}

          {/* Heading */}
          <div style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: isCompact ? 26 : 30, fontWeight: 900, color: "#0F172A", margin: "0 0 6px" }}>
              {method === "otp" && step === "verify" ? "Enter your OTP" : "Welcome back"}
            </h2>
            <p style={{ fontSize: 14, color: "#94A3B8", margin: 0, fontWeight: 500 }}>
              {method === "otp" && step === "verify"
                ? "Check your WhatsApp for the 4-digit code"
                : "Sign in to your staff account"}
            </p>
          </div>

          {/* Tab bar */}
          {(method === "otp" && step === "phone") || method === "password" ? <div style={{ marginBottom: 24 }}>{TabBar()}</div> : null}

          {/* Form */}
          {method === "otp" ? OtpContent() : PasswordContent()}

          <p style={{ textAlign: "center", fontSize: 11.5, color: "#CBD5E1", fontWeight: 500, margin: "28px 0 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            Secure staff-only portal. Unauthorized access is prohibited.
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ErrorBanner({ msg }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#FEF2F2", border: "1px solid #FECDD3", borderRadius: 12, padding: "12px 16px" }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      <span style={{ fontSize: 13, fontWeight: 600, color: "#DC2626" }}>{msg}</span>
    </div>
  );
}

function SubmitBtn({ children, loading, loadingLabel, disabled, onClick, type = "submit" }) {
  const isDisabled = disabled ?? loading;
  return (
    <button type={type} onClick={onClick} disabled={isDisabled} style={{
      width: "100%", padding: "15px 24px", background: "linear-gradient(135deg, #B91C1C, #DC2626)",
      border: "none", borderRadius: 14, color: "white", fontSize: 15, fontWeight: 800,
      cursor: isDisabled ? "not-allowed" : "pointer", opacity: isDisabled ? 0.65 : 1,
      boxShadow: isDisabled ? "none" : "0 6px 24px rgba(185,28,28,0.3)",
      transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    }}>
      {loading ? (
        <>
          <svg style={{ animation: "spin 0.8s linear infinite", width: 18, height: 18 }} viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
            <path d="M22 12a10 10 0 00-10-10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          {loadingLabel}
        </>
      ) : children}
    </button>
  );
}
