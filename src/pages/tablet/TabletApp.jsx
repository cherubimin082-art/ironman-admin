import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import axios from "axios";

const API_BASE  = import.meta.env.VITE_API_URL || "https://admin.ironman.today/api";
const TOKEN_KEY = "tablet_token";
const USER_KEY  = "tablet_user";

function tabletApi(token) {
  return axios.create({
    baseURL: API_BASE,
    headers: { Authorization: `Bearer ${token}` },
  });
}

// ── Login Screen ─────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [showPass, setShowPass] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await axios.post(`${API_BASE}/tablet-login`, { email: email.trim(), password });
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0A0F1E",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Plus Jakarta Sans', sans-serif", padding: 24,
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <img src="/logo.png" alt="logo" style={{ height: 56, objectFit: "contain", marginBottom: 20, display: "block", margin: "0 auto 20px" }} />
          <h1 style={{ fontSize: 28, fontWeight: 900, color: "white", margin: "0 0 6px", fontFamily: "'Outfit', sans-serif" }}>
            Iron Shop Tablet
          </h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", margin: 0 }}>Sign in to start ironing</p>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@ironman.com"
              required
              style={{
                width: "100%", padding: "14px 16px", borderRadius: 12, border: "1.5px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.05)", color: "white", fontSize: 15,
                outline: "none", boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: "100%", padding: "14px 48px 14px 16px", borderRadius: 12, border: "1.5px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.05)", color: "white", fontSize: 15,
                  outline: "none", boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                style={{
                  position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", padding: 4,
                  color: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center",
                }}
              >
                {showPass ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div style={{ background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.4)", borderRadius: 10, padding: "12px 16px", color: "#FCA5A5", fontSize: 14, fontWeight: 600 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: 16, borderRadius: 12, border: "none",
              background: loading ? "rgba(185,28,28,0.5)" : "linear-gradient(135deg,#B91C1C,#DC2626)",
              color: "white", fontSize: 16, fontWeight: 800, cursor: loading ? "wait" : "pointer",
              boxShadow: "0 6px 20px rgba(185,28,28,0.35)", marginTop: 4,
            }}
          >
            {loading ? "Signing in..." : "Sign In →"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Bag Card ─────────────────────────────────────────────────
function BagCard({ bag, activeObId, actionObId, onStart, onComplete }) {
  const isEmpty    = bag.order_status === "available";
  const isAtShop   = bag.order_status === "at_vendor" || bag.order_status === "ironing_in_progress";
  const isIroning  = bag.ironing_status === "ironing";
  const isDisabled = !isEmpty && activeObId && !isIroning;
  const isLoading  = actionObId === bag.ob_id;

  if (isEmpty) {
    return (
      <div style={{
        background: "#111827", border: "1.5px dashed rgba(255,255,255,0.08)",
        borderRadius: 24, padding: 28, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", minHeight: 180, gap: 12,
        opacity: 0.5,
      }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>
          🛍️
        </div>
        <p style={{ fontSize: 32, fontWeight: 900, color: "rgba(255,255,255,0.2)", margin: 0, fontFamily: "'Outfit', sans-serif", lineHeight: 1 }}>#{bag.bag_number}</p>
        <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.2)", margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>Empty</p>
      </div>
    );
  }

  const cardBg     = isIroning ? "linear-gradient(135deg,#064E3B,#065F46)" : isAtShop ? "#1E293B" : "#111827";
  const borderColor = isIroning ? "#10B981" : isAtShop ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)";

  return (
    <div style={{
      background: cardBg,
      border: `2px solid ${borderColor}`,
      borderRadius: 24, padding: 28,
      opacity: isDisabled ? 0.38 : 1,
      transition: "all 0.3s ease",
      animation: isIroning ? "ironGlow 2s ease-in-out infinite" : "none",
      position: "relative",
    }}>
      {/* Status pill top-right */}
      {!isAtShop && (
        <div style={{
          position: "absolute", top: 18, right: 18,
          background: "rgba(107,114,128,0.2)", border: "1px solid rgba(107,114,128,0.35)",
          borderRadius: 99, padding: "4px 12px",
          fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.06em",
        }}>
          ON THE WAY
        </div>
      )}
      {isIroning && (
        <div style={{
          position: "absolute", top: 18, right: 18,
          background: "rgba(16,185,129,0.2)", border: "1.5px solid #10B981",
          borderRadius: 99, padding: "5px 14px",
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981", display: "inline-block", animation: "blink 1s infinite" }} />
          <span style={{ fontSize: 11, fontWeight: 800, color: "#10B981", letterSpacing: "0.06em" }}>IRONING</span>
        </div>
      )}

      {/* Bag header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: isIroning ? "rgba(16,185,129,0.2)" : isAtShop ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.04)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
        }}>
          {isAtShop ? "👜" : "🚴"}
        </div>
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: isIroning ? "#6EE7B7" : isAtShop ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 2px" }}>Bag Number</p>
          <p style={{ fontSize: 32, fontWeight: 900, color: isIroning ? "#10B981" : isAtShop ? "white" : "rgba(255,255,255,0.35)", margin: 0, lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}>
            #{bag.bag_number}
          </p>
        </div>
      </div>

      {/* Order info */}
      <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "12px 14px", marginBottom: 18 }}>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 3px" }}>Order</p>
        <p style={{ fontSize: 15, fontWeight: 800, color: isAtShop ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.4)", margin: "0 0 2px" }}>{bag.order_code || `#${bag.order_id}`}</p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0 }}>{bag.customer_name}</p>
      </div>


      {/* Action */}
      {!isAtShop ? (
        <div style={{ padding: "14px", textAlign: "center", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.08)" }}>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.2)", fontWeight: 600 }}>Waiting for delivery boy to arrive</span>
        </div>
      ) : isDisabled ? (
        <div style={{ padding: "14px", textAlign: "center", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)" }}>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.2)", fontWeight: 600 }}>Waiting — finish active bag first</span>
        </div>
      ) : isIroning ? (
        <button
          onClick={() => !isLoading && onComplete(bag.ob_id)}
          disabled={isLoading}
          style={{
            width: "100%", padding: "18px", borderRadius: 14, border: "none",
            cursor: isLoading ? "wait" : "pointer",
            background: isLoading ? "rgba(16,185,129,0.5)" : "linear-gradient(135deg,#059669,#10B981)",
            color: "white", fontSize: 17, fontWeight: 800,
            boxShadow: "0 6px 20px rgba(16,185,129,0.35)", transition: "all 0.2s",
          }}
        >
          {isLoading ? "⏳  Saving..." : "✅  Complete Ironing"}
        </button>
      ) : (
        <button
          onClick={() => !isLoading && onStart(bag.ob_id)}
          disabled={isLoading}
          style={{
            width: "100%", padding: "18px", borderRadius: 14, border: "none",
            cursor: isLoading ? "wait" : "pointer",
            background: isLoading ? "rgba(185,28,28,0.5)" : "linear-gradient(135deg,#B91C1C,#DC2626)",
            color: "white", fontSize: 17, fontWeight: 800,
            boxShadow: "0 6px 20px rgba(185,28,28,0.35)", transition: "all 0.2s",
          }}
        >
          {isLoading ? "⏳  Starting..." : "🔥  Start Ironing"}
        </button>
      )}
    </div>
  );
}

// ── Main Tablet App ───────────────────────────────────────────
export default function TabletApp() {
  const [token, setToken]         = useState(() => sessionStorage.getItem(TOKEN_KEY));
  const [user,  setUser]          = useState(() => { try { return JSON.parse(sessionStorage.getItem(USER_KEY)); } catch { return null; } });
  const [bags,  setBags]          = useState([]);
  const [loading, setLoading]     = useState(false);
  const [actionObId, setAction]   = useState(null);
  const [toast, setToast]         = useState(null);
  const socketRef                 = useRef(null);

  const handleLogin = (tok, usr) => {
    sessionStorage.setItem(TOKEN_KEY, tok);
    sessionStorage.setItem(USER_KEY, JSON.stringify(usr));
    setToken(tok);
    setUser(usr);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
    setBags([]);
    if (socketRef.current) socketRef.current.disconnect();
  };

  const api = token ? tabletApi(token) : null;

  const loadBags = useCallback(async () => {
    if (!api) return;
    try {
      const { data } = await api.get("/vendor/tablet-bags");
      setBags(data.bags || []);
    } catch (err) {
      if (err.response?.status === 401) handleLogout();
      console.error("tablet-bags load error:", err);
    } finally {
      setLoading(false);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!token || !user) return;
    setLoading(true);
    loadBags();

    const vendorId = user.vendor_id;
    const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5002", {
      reconnection: true, reconnectionDelay: 1000,
    });
    socketRef.current = socket;
    socket.on("connect", () => socket.emit("join_vendor", vendorId));
    socket.on("reconnect", loadBags);
    socket.on("tablet_bag_update",   loadBags);
    socket.on("order_status_update", loadBags);
    socket.on("order_at_vendor",     loadBags);

    return () => socket.disconnect();
  }, [token, user?.vendor_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const showToast = (msg, color = "#10B981") => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 3000);
  };

  const startIron = async (bagId) => {
    setAction(bagId);
    try {
      await api.put(`/vendor/tablet-bags/${bagId}/start-iron`);
      await loadBags();
      showToast("Ironing started! 🔥");
    } catch (err) {
      showToast(err.response?.data?.message || "Error starting iron", "#DC2626");
    } finally {
      setAction(null);
    }
  };

  const completeIron = async (bagId) => {
    setAction(bagId);
    try {
      const { data } = await api.put(`/vendor/tablet-bags/${bagId}/complete-iron`);
      await loadBags();
      if (data.orderReady) showToast("Order ready! Delivery notified 🚀");
      else showToast("Bag done! Move to next bag ✅");
    } catch (err) {
      showToast(err.response?.data?.message || "Error completing iron", "#DC2626");
    } finally {
      setAction(null);
    }
  };

  if (!token || !user) return <LoginScreen onLogin={handleLogin} />;

  const activeObId    = bags.find(b => b.ironing_status === "ironing")?.ob_id ?? null;
  const ironingCount  = bags.filter(b => b.ironing_status === "ironing").length;
  const atShopCount   = bags.filter(b => b.order_status === "at_vendor" || b.order_status === "ironing_in_progress").length;
  const comingCount   = bags.filter(b => b.order_status === "picked_up").length;
  const emptyCount    = bags.filter(b => b.order_status === "available").length;

  return (
    <div style={{ minHeight: "100vh", background: "#0A0F1E", fontFamily: "'Plus Jakarta Sans', sans-serif", position: "relative" }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 24, left: "50%", transform: "translateX(-50%)",
          background: toast.color, color: "white", padding: "14px 28px",
          borderRadius: 99, fontSize: 15, fontWeight: 700, zIndex: 9999,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)", whiteSpace: "nowrap",
          animation: "slideDown 0.3s ease",
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "28px 24px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 36, flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img src="/logo.png" alt="logo" style={{ height: 48, width: "auto", objectFit: "contain" }} />
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", textTransform: "uppercase", margin: "0 0 3px" }}>Iron Shop Tablet</p>
              <h1 style={{ fontSize: 26, fontWeight: 900, color: "white", margin: 0, fontFamily: "'Outfit', sans-serif" }}>Ironing Queue</h1>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            {ironingCount > 0 && (
              <div style={{ background: "rgba(16,185,129,0.15)", border: "1.5px solid rgba(16,185,129,0.4)", borderRadius: 14, padding: "10px 18px", textAlign: "center" }}>
                <p style={{ fontSize: 22, fontWeight: 900, color: "#10B981", margin: 0, lineHeight: 1 }}>{ironingCount}</p>
                <p style={{ fontSize: 10, color: "#6EE7B7", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "3px 0 0" }}>Ironing</p>
              </div>
            )}
            {atShopCount > 0 && (
              <div style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "10px 18px", textAlign: "center" }}>
                <p style={{ fontSize: 22, fontWeight: 900, color: "white", margin: 0, lineHeight: 1 }}>{atShopCount}</p>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "3px 0 0" }}>At Shop</p>
              </div>
            )}
            {comingCount > 0 && (
              <div style={{ background: "rgba(107,114,128,0.1)", border: "1.5px solid rgba(107,114,128,0.2)", borderRadius: 14, padding: "10px 18px", textAlign: "center" }}>
                <p style={{ fontSize: 22, fontWeight: 900, color: "rgba(255,255,255,0.4)", margin: 0, lineHeight: 1 }}>{comingCount}</p>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "3px 0 0" }}>Coming</p>
              </div>
            )}
            {emptyCount > 0 && (
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.08)", borderRadius: 14, padding: "10px 18px", textAlign: "center" }}>
                <p style={{ fontSize: 22, fontWeight: 900, color: "rgba(255,255,255,0.2)", margin: 0, lineHeight: 1 }}>{emptyCount}</p>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.15)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "3px 0 0" }}>Empty</p>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(16,185,129,0.1)", border: "1.5px solid rgba(16,185,129,0.25)", borderRadius: 99, padding: "8px 16px" }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#10B981", display: "inline-block", animation: "blink 1.4s infinite" }} />
              <span style={{ fontSize: 13, fontWeight: 800, color: "#10B981" }}>LIVE</span>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "100px 0" }}>
            <div style={{ width: 48, height: 48, border: "4px solid rgba(255,255,255,0.1)", borderTopColor: "#B91C1C", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 20px" }} />
            <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 15 }}>Loading bags...</p>
          </div>
        ) : bags.length === 0 ? (
          <div style={{ textAlign: "center", padding: "100px 0" }}>
            <div style={{ fontSize: 80, marginBottom: 20 }}>✅</div>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: "white", margin: "0 0 10px" }}>All bags ironed!</h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.4)", margin: 0 }}>No bags waiting. Great work!</p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 24, fontWeight: 600 }}>
              {atShopCount + comingCount} bag{atShopCount + comingCount !== 1 ? "s" : ""} with clothes • {emptyCount} empty
              {activeObId ? " • 1 being ironed — others locked until complete" : atShopCount > 0 ? " • tap a green bag to start ironing" : ""}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
              {bags.map(bag => (
                <BagCard
                  key={bag.bag_number}
                  bag={bag}
                  activeObId={activeObId}
                  actionObId={actionObId}
                  onStart={startIron}
                  onComplete={completeIron}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes ironGlow {
          0%,100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.3); }
          50%      { box-shadow: 0 0 0 14px rgba(16,185,129,0); }
        }
        @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.35; } }
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes slideDown {
          from { opacity:0; transform: translateX(-50%) translateY(-16px); }
          to   { opacity:1; transform: translateX(-50%) translateY(0); }
        }
        input::placeholder { color: rgba(255,255,255,0.2); }
        input:focus { border-color: rgba(185,28,28,0.6) !important; }
      `}</style>
    </div>
  );
}
