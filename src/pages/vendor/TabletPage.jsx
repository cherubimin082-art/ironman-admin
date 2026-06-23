import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

function BagCard({ bag, activeBagId, actionBagId, onStart, onComplete }) {
  const isIroning  = bag.ironing_status === "ironing";
  const isDisabled = activeBagId && !isIroning;
  const isLoading  = actionBagId === bag.bag_id;

  let items = [];
  try { items = typeof bag.items === "string" ? JSON.parse(bag.items) : (bag.items || []); } catch {}
  items = items.filter(i => i?.garment_name);

  return (
    <div style={{
      background: isIroning ? "linear-gradient(135deg,#064E3B,#065F46)" : "#1E293B",
      border: `2px solid ${isIroning ? "#10B981" : isDisabled ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.1)"}`,
      borderRadius: 24, padding: 28,
      opacity: isDisabled ? 0.38 : 1,
      transition: "all 0.3s ease",
      animation: isIroning ? "ironGlow 2s ease-in-out infinite" : "none",
    }}>
      {/* Bag header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: isIroning ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.07)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>
            👜
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: isIroning ? "#6EE7B7" : "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 2px" }}>Bag Number</p>
            <p style={{ fontSize: 32, fontWeight: 900, color: isIroning ? "#10B981" : "white", margin: 0, lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}>#{bag.bag_number}</p>
          </div>
        </div>
        {isIroning && (
          <div style={{ background: "rgba(16,185,129,0.2)", border: "1.5px solid #10B981", borderRadius: 99, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981", display: "inline-block", animation: "blink 1s infinite" }} />
            <span style={{ fontSize: 12, fontWeight: 800, color: "#10B981", letterSpacing: "0.06em" }}>IRONING</span>
          </div>
        )}
      </div>

      {/* Order info */}
      <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 12, padding: "12px 14px", marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 3px" }}>Order</p>
            <p style={{ fontSize: 15, fontWeight: 800, color: "rgba(255,255,255,0.85)", margin: "0 0 2px" }}>{bag.order_code || `#${bag.order_id}`}</p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", margin: 0 }}>{bag.customer_name}</p>
          </div>
        </div>
      </div>

      {/* Items list */}
      {items.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>Clothes in bag</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {items.map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 9 }}>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>{item.garment_name}</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: isIroning ? "#10B981" : "rgba(255,255,255,0.45)", background: isIroning ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.07)", padding: "3px 12px", borderRadius: 99 }}>×{item.quantity || 1}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action button */}
      {!isDisabled && (
        isIroning ? (
          <button
            onClick={() => !isLoading && onComplete(bag.bag_id)}
            disabled={isLoading}
            style={{
              width: "100%", padding: "18px", borderRadius: 14, border: "none",
              cursor: isLoading ? "wait" : "pointer",
              background: isLoading ? "rgba(16,185,129,0.5)" : "linear-gradient(135deg,#059669,#10B981)",
              color: "white", fontSize: 17, fontWeight: 800, letterSpacing: "0.02em",
              boxShadow: "0 6px 20px rgba(16,185,129,0.35)", transition: "all 0.2s",
            }}
          >
            {isLoading ? "⏳  Saving..." : "✅  Complete Ironing"}
          </button>
        ) : (
          <button
            onClick={() => !isLoading && onStart(bag.bag_id)}
            disabled={isLoading}
            style={{
              width: "100%", padding: "18px", borderRadius: 14, border: "none",
              cursor: isLoading ? "wait" : "pointer",
              background: isLoading ? "rgba(185,28,28,0.5)" : "linear-gradient(135deg,#B91C1C,#DC2626)",
              color: "white", fontSize: 17, fontWeight: 800, letterSpacing: "0.02em",
              boxShadow: "0 6px 20px rgba(185,28,28,0.35)", transition: "all 0.2s",
            }}
          >
            {isLoading ? "⏳  Starting..." : "🔥  Start Ironing"}
          </button>
        )
      )}
      {isDisabled && (
        <div style={{ padding: "14px", textAlign: "center", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)" }}>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.2)", fontWeight: 600 }}>Waiting — finish active bag first</span>
        </div>
      )}
    </div>
  );
}

export default function TabletPage() {
  const { user } = useAuth();
  const [bags, setBags]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [actionBagId, setAction]  = useState(null);
  const [toast, setToast]         = useState(null);
  const socketRef                 = useRef(null);

  const loadBags = useCallback(async () => {
    try {
      const { data } = await api.get("/vendor/tablet-bags");
      setBags(data.bags || []);
    } catch (err) {
      console.error("tablet-bags load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBags();

    const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:5002", {
      reconnection: true, reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on("connect", () => socket.emit("join_vendor", user?.id));
    socket.on("reconnect", loadBags);
    socket.on("tablet_bag_update", loadBags);
    socket.on("order_status_update", loadBags);
    socket.on("order_at_vendor", loadBags);

    return () => socket.disconnect();
  }, [user?.id, loadBags]);

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
      if (data.orderReady) showToast("Order ready! Delivery boy notified 🚀");
      else showToast("Bag done! Move to next bag ✅");
    } catch (err) {
      showToast(err.response?.data?.message || "Error completing iron", "#DC2626");
    } finally {
      setAction(null);
    }
  };

  const activeBagId = bags.find(b => b.ironing_status === "ironing")?.bag_id ?? null;
  const ironingCount = bags.filter(b => b.ironing_status === "ironing").length;
  const waitingCount = bags.filter(b => b.ironing_status === "waiting").length;

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
              <h1 style={{ fontSize: 26, fontWeight: 900, color: "white", margin: 0, fontFamily: "'Outfit', sans-serif" }}>{user?.name || "Iron Shop"}</h1>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            {/* Stats */}
            {ironingCount > 0 && (
              <div style={{ background: "rgba(16,185,129,0.15)", border: "1.5px solid rgba(16,185,129,0.4)", borderRadius: 14, padding: "10px 18px", textAlign: "center" }}>
                <p style={{ fontSize: 22, fontWeight: 900, color: "#10B981", margin: 0, lineHeight: 1 }}>{ironingCount}</p>
                <p style={{ fontSize: 10, color: "#6EE7B7", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "3px 0 0" }}>Ironing</p>
              </div>
            )}
            <div style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.1)", borderRadius: 14, padding: "10px 18px", textAlign: "center" }}>
              <p style={{ fontSize: 22, fontWeight: 900, color: "white", margin: 0, lineHeight: 1 }}>{waitingCount}</p>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", margin: "3px 0 0" }}>Waiting</p>
            </div>
            {/* Live indicator */}
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
              {bags.length} bag{bags.length !== 1 ? "s" : ""} pending
              {activeBagId ? " • 1 being ironed now — others locked until complete" : " • tap a bag to start ironing"}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
              {bags.map(bag => (
                <BagCard
                  key={bag.bag_id}
                  bag={bag}
                  activeBagId={activeBagId}
                  actionBagId={actionBagId}
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
        @keyframes blink {
          0%,100% { opacity:1; } 50% { opacity:0.35; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideDown {
          from { opacity:0; transform: translateX(-50%) translateY(-16px); }
          to   { opacity:1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
