import { useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { useWindowSize } from "../../hooks/useWindowSize";

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
