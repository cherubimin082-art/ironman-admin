import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { requestOtp, verifyOtp, loginWithPassword } from "../../services/authService";
import { useAuth } from "../../context/AuthContext";
import { useWindowSize } from "../../hooks/useWindowSize";

const ROLE_REDIRECT = {
  vendor:   "/vendor/dashboard",
  delivery: "/delivery/dashboard",
  admin:    "/admin/dashboard",
};

const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 20, height: 20 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    title: "Real-time Operations",
    desc: "Live order tracking across all Iron's Heads and delivery agents.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 20, height: 20 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    title: "Role-Based Access",
    desc: "Secure, scoped dashboards for Admin, Iron's Head & Delivery staff.",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 20, height: 20 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    title: "Advanced Analytics",
    desc: "Revenue trends, capacity metrics, and performance reports.",
  },
];

export default function LoginPage() {
  // "otp-phone" | "otp-verify" | "password"
  const [method, setMethod]     = useState("otp");   // "otp" | "password"
  const [step, setStep]         = useState("phone"); // otp flow: "phone" | "verify"
  const [phone, setPhone]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [digits, setDigits]     = useState(["", "", "", ""]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [countdown, setCountdown] = useState(0);

  const inputRefs = [useRef(), useRef(), useRef(), useRef()];
  const timerRef  = useRef(null);

  const { user, signIn } = useAuth();
  const navigate    = useNavigate();

  // If already logged in (e.g. APK reopened), go straight to dashboard
  useEffect(() => {
    if (user) navigate(ROLE_REDIRECT[user.role] || "/", { replace: true });
  }, [user]);
  const { isMobile, isTablet } = useWindowSize();
  const isCompact   = isMobile || isTablet;

  useEffect(() => {
    if (step === "verify") {
      setTimeout(() => inputRefs[0].current?.focus(), 80);
      startCountdown();
    }
  }, [step]);

  useEffect(() => () => clearInterval(timerRef.current), []);

  function switchMethod(m) {
    setMethod(m);
    setStep("phone");
    setError("");
    setDigits(["", "", "", ""]);
    setPassword("");
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

  // ── OTP Step 1 ──
  async function handleRequestOtp(e) {
    e.preventDefault();
    const clean = phone.replace(/\D/g, "");
    if (clean.length < 10) { setError("Enter a valid 10-digit mobile number"); return; }
    setLoading(true); setError("");
    try {
      await requestOtp(clean);
      setStep("verify");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Try again.");
    } finally { setLoading(false); }
  }

  // ── OTP Step 2 ──
  async function handleVerifyOtp(otp) {
    setLoading(true); setError("");
    try {
      finish(await verifyOtp(phone.replace(/\D/g, ""), otp));
    } catch (err) {
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
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP.");
    } finally { setLoading(false); }
  }

  // ── Password login ──
  async function handlePasswordLogin(e) {
    e.preventDefault();
    const clean = phone.replace(/\D/g, "");
    if (clean.length < 10) { setError("Enter a valid 10-digit mobile number"); return; }
    if (!password) { setError("Enter your password"); return; }
    setLoading(true); setError("");
    try {
      finish(await loginWithPassword(clean, password));
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Try again.");
    } finally { setLoading(false); }
  }

  const maskedPhone = phone ? `+91 ${phone.slice(0, 2)}XXXXXXX${phone.slice(-1)}` : "";

  // ── Tab bar ──
  const tabBar = (
    <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 14, padding: 4, gap: 4 }}>
      {[
        { key: "otp", label: "OTP Login", icon: (
          <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 15, height: 15 }}>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        )},
        { key: "password", label: "Password", icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 15, height: 15 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        )},
      ].map(t => (
        <button
          key={t.key}
          onClick={() => switchMethod(t.key)}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "9px 12px", borderRadius: 10, border: "none", cursor: "pointer",
            fontSize: 13, fontWeight: 700, transition: "all 0.2s",
            background: method === t.key ? "#fff" : "transparent",
            color: method === t.key ? "#B91C1C" : "#94a3b8",
            boxShadow: method === t.key ? "0 1px 6px rgba(0,0,0,0.10)" : "none",
          }}
        >
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  );

  // ── Phone field (shared) ──
  const phoneField = (
    <div style={styles.fieldGroup}>
      <label style={styles.label}>Mobile Number</label>
      <div style={styles.inputWrap}>
        <span style={styles.inputIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </span>
        <input
          type="tel"
          value={phone}
          onChange={e => { setPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setError(""); }}
          placeholder="Enter your 10-digit number"
          maxLength={10}
          autoFocus
          required
          style={styles.input}
          onFocus={e => { e.target.parentNode.style.borderColor = "#DC2626"; e.target.parentNode.style.boxShadow = "0 0 0 3px rgba(220,38,38,0.08)"; }}
          onBlur={e => { e.target.parentNode.style.borderColor = "#e2e8f0"; e.target.parentNode.style.boxShadow = "none"; }}
        />
      </div>
    </div>
  );

  const spinner = (
    <svg style={{ animation: "spin 0.8s linear infinite", width: 18, height: 18 }} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
      <path d="M22 12a10 10 0 00-10-10" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );

  // ── OTP flow ──
  const otpContent = step === "phone" ? (
    <form onSubmit={handleRequestOtp} style={styles.form}>
      {phoneField}
      {error && <div style={styles.errorBanner}>{error}</div>}
      <button type="submit" disabled={loading} style={{ ...styles.submitBtn, opacity: loading ? 0.75 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
        {loading
          ? <span style={styles.btnInner}>{spinner} Sending OTP…</span>
          : <span style={styles.btnInner}>
              Send OTP via WhatsApp
              <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 17, height: 17 }}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </span>
        }
      </button>
    </form>
  ) : (
    <div style={styles.form}>
      {/* WhatsApp banner */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "12px 16px" }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg style={{ width: 18, height: 18 }} fill="#16a34a" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#16a34a", margin: 0 }}>OTP sent to WhatsApp</p>
          <p style={{ fontSize: 12, color: "#4ade80", margin: "2px 0 0", fontWeight: 500 }}>{maskedPhone}</p>
        </div>
      </div>

      {/* 4-digit OTP boxes */}
      <div>
        <label style={styles.label}>Enter 4-digit OTP</label>
        <div style={{ display: "flex", gap: isMobile ? 6 : 8, marginTop: 8 }} onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i} ref={inputRefs[i]} type="tel" inputMode="numeric" maxLength={1} value={d}
              onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              style={{
                flex: 1, minWidth: 0, height: isMobile ? 46 : 52, textAlign: "center",
                fontSize: isMobile ? 18 : 20, fontWeight: 700,
                border: `2px solid ${d ? "#DC2626" : "#e2e8f0"}`,
                borderRadius: isMobile ? 10 : 12, outline: "none",
                background: d ? "#fef2f2" : "#fff", color: d ? "#DC2626" : "#111827",
                transition: "all 0.15s", boxSizing: "border-box",
              }}
              onFocus={e => { e.target.style.borderColor = "#DC2626"; e.target.style.boxShadow = "0 0 0 3px rgba(220,38,38,0.08)"; }}
              onBlur={e => { if (!d) { e.target.style.borderColor = "#e2e8f0"; e.target.style.boxShadow = "none"; } }}
            />
          ))}
        </div>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      <button
        onClick={() => handleVerifyOtp(digits.join(""))}
        disabled={loading || digits.some(d => !d)}
        style={{ ...styles.submitBtn, opacity: (loading || digits.some(d => !d)) ? 0.6 : 1, cursor: (loading || digits.some(d => !d)) ? "not-allowed" : "pointer" }}
      >
        {loading ? <span style={styles.btnInner}>{spinner} Verifying…</span> : "Verify & Sign In"}
      </button>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          onClick={() => { setStep("phone"); setDigits(["","","",""]); setError(""); clearInterval(timerRef.current); }}
          style={{ fontSize: 12, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          ← Change number
        </button>
        {countdown > 0
          ? <span style={{ fontSize: 12, color: "#94a3b8" }}>Resend in {countdown}s</span>
          : <button onClick={handleResend} disabled={loading} style={{ fontSize: 12, fontWeight: 700, color: "#DC2626", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              {loading ? "Sending…" : "Resend OTP"}
            </button>
        }
      </div>
    </div>
  );

  // ── Password flow ──
  const passwordContent = (
    <form onSubmit={handlePasswordLogin} style={styles.form}>
      {phoneField}

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
            onChange={e => { setPassword(e.target.value); setError(""); }}
            placeholder="Enter your password"
            required
            style={{ ...styles.input, paddingRight: 44 }}
            onFocus={e => { e.target.parentNode.style.borderColor = "#DC2626"; e.target.parentNode.style.boxShadow = "0 0 0 3px rgba(220,38,38,0.08)"; }}
            onBlur={e => { e.target.parentNode.style.borderColor = "#e2e8f0"; e.target.parentNode.style.boxShadow = "none"; }}
          />
          <button
            type="button"
            onClick={() => setShowPass(p => !p)}
            style={{ position: "absolute", right: 12, background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center", padding: 4 }}
          >
            {showPass
              ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 17, height: 17 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 17, height: 17 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            }
          </button>
        </div>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      <button type="submit" disabled={loading} style={{ ...styles.submitBtn, opacity: loading ? 0.75 : 1, cursor: loading ? "not-allowed" : "pointer" }}>
        {loading ? <span style={styles.btnInner}>{spinner} Signing in…</span> : "Sign In"}
      </button>
    </form>
  );

  return (
    <div style={{ ...styles.root, flexDirection: isCompact ? "column" : "row" }}>

      {/* ── Left branding panel — desktop only ── */}
      <div style={{ ...styles.leftPanel, display: isCompact ? "none" : "flex" }}>
        <div style={styles.blob1} /><div style={styles.blob2} /><div style={styles.blob3} />
        <div style={styles.gridOverlay} />
        <div style={styles.leftContent}>
          <div style={styles.brandRow}>
            <img src="/logo1.png" alt="Iron Man" style={{ height: 110, width: "auto", objectFit: "contain", filter: "brightness(0) invert(1)" }} />
          </div>
          <div style={styles.heroBlock}>
            <div style={styles.tagPill}><span style={styles.tagDot} />Operations Platform</div>
            <h1 style={styles.heroHeading}>Manage your<br /><span style={styles.heroAccent}>laundry empire</span><br />with precision.</h1>
            <p style={styles.heroSub}>One unified dashboard for Iron's Heads, delivery teams, and administrators — built for speed and scale.</p>
          </div>
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

      {/* ── Right form panel ── */}
      <div style={{ ...styles.rightPanel, padding: isCompact ? "28px 20px 40px" : "48px 24px", alignItems: isCompact ? "flex-start" : "center", overflowY: "auto" }}>
        <div style={{ ...styles.formContainer, maxWidth: isCompact ? "100%" : 420, gap: isCompact ? 18 : 24 }}>

          {/* Mobile compact logo */}
          {isCompact && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ width: 80, height: 80, borderRadius: 20, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.10)", border: "1px solid #e5e7eb" }}>
                <img src="/logo.png" alt="Iron Man" style={{ height: 60, width: "auto", objectFit: "contain" }} />
              </div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: "0.12em", textTransform: "uppercase", margin: 0 }}>
                Operations Portal
              </p>
            </div>
          )}

          {/* Header */}
          <div style={styles.formHeader}>
            <h2 style={{ ...styles.formTitle, fontSize: isCompact ? 24 : 28, textAlign: isCompact ? "center" : "left" }}>
              Welcome back
            </h2>
            <p style={{ ...styles.formSub, textAlign: isCompact ? "center" : "left" }}>
              {method === "otp" && step === "verify"
                ? "Enter the 4-digit code sent to your WhatsApp"
                : "Sign in to your staff account"}
            </p>
          </div>

          {/* Tab switcher */}
          {(method === "otp" && step === "phone") || method === "password" ? tabBar : null}

          {/* Form */}
          {method === "otp" ? otpContent : passwordContent}

          <p style={styles.footerNote}>
            🔒 &nbsp;Secure staff-only portal. Unauthorized access is prohibited.
          </p>
        </div>
      </div>

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

/* ─── Styles ─────────────────────────────────────────────── */
const styles = {
  root: { display: "flex", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', sans-serif", background: "#f8fafc", overflow: "hidden" },
  leftPanel: { flex: "0 0 50%", background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%)", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", padding: "48px" },
  blob1: { position: "absolute", top: "-80px", left: "-80px", width: 400, height: 400, background: "radial-gradient(circle, rgba(220,38,38,0.4) 0%, transparent 70%)", borderRadius: "50%", animation: "floatBlob 10s ease-in-out infinite", opacity: 0 },
  blob2: { position: "absolute", bottom: "-60px", right: "-60px", width: 350, height: 350, background: "radial-gradient(circle, rgba(220,38,38,0.35) 0%, transparent 70%)", borderRadius: "50%", animation: "floatBlob 13s ease-in-out infinite reverse", opacity: 0 },
  blob3: { position: "absolute", top: "50%", left: "40%", width: 250, height: 250, background: "radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 70%)", borderRadius: "50%", animation: "floatBlob 8s ease-in-out infinite 2s", opacity: 0 },
  gridOverlay: { position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none" },
  leftContent: { position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 40, maxWidth: 440 },
  brandRow: { display: "flex", alignItems: "center", gap: 12 },
  heroBlock: { display: "flex", flexDirection: "column", gap: 16 },
  tagPill: { display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", padding: "4px 12px", borderRadius: 99, width: "fit-content" },
  tagDot: { width: 7, height: 7, borderRadius: "50%", background: "#F87171", boxShadow: "0 0 8px #F87171" },
  heroHeading: { fontFamily: "'Outfit', sans-serif", fontSize: 38, fontWeight: 800, lineHeight: 1.2, color: "white", margin: 0 },
  heroAccent: { background: "linear-gradient(90deg, #F87171, #F87171)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  heroSub: { fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.55)", margin: 0 },
  featureList: { display: "flex", flexDirection: "column", gap: 16 },
  featureItem: { display: "flex", alignItems: "flex-start", gap: 14 },
  featureIcon: { width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#FCA5A5" },
  featureTitle: { fontSize: 13, fontWeight: 700, color: "white", margin: "0 0 2px" },
  featureDesc: { fontSize: 12, color: "rgba(255,255,255,0.45)", margin: 0, lineHeight: 1.5 },
  trustedRow: { display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, width: "fit-content" },
  avatarStack: { display: "flex", alignItems: "center" },
  avatar: { width: 28, height: 28, borderRadius: "50%", border: "2px solid rgba(30,27,75,0.8)" },
  trustedText: { fontSize: 12, color: "rgba(255,255,255,0.55)", fontWeight: 500 },
  rightPanel: { flex: 1, display: "flex", justifyContent: "center", background: "#f8fafc", minHeight: "100vh" },
  formContainer: { width: "100%", maxWidth: 420, display: "flex", flexDirection: "column" },
  formHeader: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 },
  formTitle: { fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 800, color: "#0f172a", margin: 0 },
  formSub: { fontSize: 13.5, color: "#94a3b8", margin: 0, fontWeight: 500 },
  errorBanner: { display: "flex", alignItems: "center", gap: 10, background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "12px 16px", fontSize: 13, fontWeight: 600, color: "#dc2626" },
  form: { display: "flex", flexDirection: "column", gap: 16, marginTop: 20 },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 7 },
  label: { fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" },
  inputWrap: { position: "relative", display: "flex", alignItems: "center", background: "white", border: "1.5px solid #e2e8f0", borderRadius: 14, transition: "border-color 0.2s, box-shadow 0.2s", overflow: "hidden" },
  inputIcon: { position: "absolute", left: 14, color: "#94a3b8", display: "flex", alignItems: "center", pointerEvents: "none" },
  input: { width: "100%", border: "none", outline: "none", background: "transparent", paddingLeft: 42, paddingRight: 14, paddingTop: 13, paddingBottom: 13, fontSize: 14, color: "#1e293b", fontFamily: "'Plus Jakarta Sans', sans-serif" },
  submitBtn: { width: "100%", padding: "14px 24px", background: "linear-gradient(135deg, #B91C1C 0%, #B91C1C 100%)", border: "none", borderRadius: 14, color: "white", fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 700, letterSpacing: "0.02em", transition: "transform 0.2s, box-shadow 0.2s", boxShadow: "0 6px 24px rgba(185,28,28,0.3)", marginTop: 4 },
  btnInner: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8 },
  footerNote: { textAlign: "center", fontSize: 11.5, color: "#94a3b8", fontWeight: 500, margin: "20px 0 0" },
};
