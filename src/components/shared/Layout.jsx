import { useState, useEffect } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { useWindowSize } from "../../hooks/useWindowSize";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const APP_VERSION = "1.1.0";

function UpdateBanner() {
  const [show, setShow] = useState(false);
  const [url, setUrl]   = useState("");
  const { user } = useAuth();

  useEffect(() => {
    if (user?.role !== "delivery") return;
    api.get("/app-version").then(({ data }) => {
      if (data.version && data.version !== APP_VERSION) {
        setUrl(data.download_url || "");
        setShow(true);
      }
    }).catch(() => {});
  }, [user]);

  if (!show) return null;
  return (
    <div style={{
      background: "linear-gradient(90deg,#1d4ed8,#2563eb)",
      color: "#fff", padding: "10px 20px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      fontSize: 13, fontWeight: 600, gap: 12, flexWrap: "wrap",
      position: "relative", zIndex: 60,
    }}>
      <span>🚀 New version available! Update the Iron Delivery app for the latest features.</span>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {url && (
          <a href={url} style={{
            background: "#fff", color: "#1d4ed8", borderRadius: 8,
            padding: "5px 14px", fontWeight: 700, fontSize: 12, textDecoration: "none",
          }}>
            Update Now
          </a>
        )}
        <button onClick={() => setShow(false)} style={{
          background: "transparent", border: "none", color: "rgba(255,255,255,0.7)",
          cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 4px",
        }}>×</button>
      </div>
    </div>
  );
}

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isMobile, isTablet } = useWindowSize();

  const mainPadding = isMobile ? "16px" : isTablet ? "20px 24px" : "28px 32px";

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", flexDirection: "column" }}>
      {/* Dot grid background */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0,
        backgroundImage: "radial-gradient(circle, #e2e8f0 1px, transparent 1px)",
        backgroundSize: "28px 28px", pointerEvents: "none", opacity: 0.5,
      }} />

      {/* App update banner (delivery role only) */}
      <UpdateBanner />

      {/* Navbar */}
      <div style={{ position: "relative", zIndex: 50 }}>
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
      </div>

      {/* Mobile sidebar — lives outside body row so its zIndex:200 is in the root
          stacking context and can paint above the navbar (zIndex:50) */}
      {isMobile && (
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} isMobile={true} />
      )}

      {/* Body row: desktop Sidebar + Main.
          zIndex:1 > dot-grid zIndex:0, so content paints above the dot grid.
          This creates a stacking context, but the mobile sidebar is now a sibling
          so it is NOT trapped inside it. */}
      <div style={{ display: "flex", flex: 1, minHeight: 0, position: "relative", zIndex: 1 }}>
        {!isMobile && (
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} isMobile={false} />
        )}
        <main style={{
          flex: 1, overflowY: "auto",
          padding: mainPadding,
          minWidth: 0,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>
          <div style={{ maxWidth: 1400, margin: "0 auto" }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
