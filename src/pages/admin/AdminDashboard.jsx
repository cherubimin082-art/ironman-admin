import Layout from "../../components/shared/Layout";
import RevenueChart from "../../components/admin/RevenueChart";
import { useOrders } from "../../context/OrderContext";
import { DUMMY_VENDORS, DUMMY_DELIVERY_PARTNERS } from "../../services/orderService";
import { useWindowSize } from "../../hooks/useWindowSize";

const STATUS_COLORS = {
  pending:       { color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  "in-progress": { color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  ready:         { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  delivered:     { color: "#4b5563", bg: "#f9fafb", border: "#e5e7eb" },
};

function StatCard({ label, value, sub, accent, bg, border, icon }) {
  return (
    <div
      style={{
        background: "#fff", borderRadius: 16, border: `1px solid ${border}`,
        padding: "22px 24px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        transition: "transform 0.18s, box-shadow 0.18s",
        cursor: "default",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 10px 28px rgba(0,0,0,0.09)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)";    e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)";  }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: bg, color: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {icon}
        </div>
      </div>
      <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 34, fontWeight: 800, color: "#111827", margin: "0 0 5px", lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 12.5, color: "#9ca3af", margin: 0, fontWeight: 500 }}>{sub}</p>
    </div>
  );
}

function AlertItem({ icon, title, body, bg, border, titleColor, bodyColor }) {
  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <div style={{ color: titleColor, flexShrink: 0 }}>{icon}</div>
        <p style={{ fontSize: 13, fontWeight: 700, color: titleColor, margin: 0 }}>{title}</p>
      </div>
      <p style={{ fontSize: 12, color: bodyColor, margin: 0 }}>{body}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { orders } = useOrders();
  const { isMobile, isTablet } = useWindowSize();

  const totalRevenue   = orders.filter(o => o.status === "delivered").reduce((s, o) => s + o.amount, 0);
  const activeVendors  = DUMMY_VENDORS.filter(v => v.status === "active").length;
  const activeDelivery = DUMMY_DELIVERY_PARTNERS.filter(d => d.status === "active").length;
  const pending        = orders.filter(o => o.status === "pending").length;

  const stats = [
    {
      label: "Total Orders", value: orders.length, sub: "All orders across platform",
      accent: "#DC2626", bg: "#FEF2F2", border: "#FECACA",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 20, height: 20 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
    },
    {
      label: "Total Revenue", value: `₹${totalRevenue}`, sub: "From delivered orders",
      accent: "#10b981", bg: "#f0fdf4", border: "#bbf7d0",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 20, height: 20 }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    },
    {
      label: "Active Hubs", value: activeVendors, sub: "Registered iron shops",
      accent: "#3b82f6", bg: "#eff6ff", border: "#bfdbfe",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 20, height: 20 }}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" /></svg>,
    },
    {
      label: "Delivery Fleet", value: activeDelivery, sub: "Couriers online & active",
      accent: "#f59e0b", bg: "#fffbeb", border: "#fde68a",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 20, height: 20 }}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>,
    },
  ];

  return (
    <Layout>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#DC2626", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 5px" }}>
              Admin Portal
            </p>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 30, fontWeight: 800, color: "#111827", margin: 0, lineHeight: 1.15 }}>
              Dashboard
            </h1>
            <p style={{ fontSize: 14, color: "#9ca3af", margin: "7px 0 0", fontWeight: 400 }}>
              Platform-wide overview and operational metrics.
            </p>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#FEF2F2", border: "1px solid #FECACA",
            borderRadius: 10, padding: "9px 16px", flexShrink: 0,
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 0 3px rgba(34,197,94,0.2)" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: "#B91C1C" }}>All Systems Operational</span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: isMobile ? 10 : 16 }}>
          {stats.map(s => <StatCard key={s.label} {...s} />)}
        </div>

        {/* Revenue Chart */}
        <RevenueChart />

        {/* Bottom row */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile || isTablet ? "1fr" : "1fr 300px", gap: 20 }}>

          {/* Order status breakdown */}
          <div style={{
            background: "#fff", borderRadius: 18,
            border: "1px solid #e5e7eb",
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
            overflow: "hidden",
          }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #f3f4f6" }}>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>
                Order Status Breakdown
              </h3>
            </div>
            <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)", gap: 14 }}>
              {Object.entries(STATUS_COLORS).map(([status, cfg]) => {
                const count = orders.filter(o => o.status === status).length;
                return (
                  <div key={status} style={{
                    background: cfg.bg, border: `1px solid ${cfg.border}`,
                    borderRadius: 14, padding: "20px 16px", textAlign: "center",
                  }}>
                    <p style={{ fontFamily: "'Outfit', sans-serif", fontSize: 32, fontWeight: 800, color: cfg.color, margin: "0 0 6px", lineHeight: 1 }}>
                      {count}
                    </p>
                    <p style={{ fontSize: 12, fontWeight: 600, color: cfg.color, margin: 0, textTransform: "capitalize" }}>
                      {status.replace("-", " ")}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* System alerts */}
          <div style={{
            background: "#fff", borderRadius: 18,
            border: "1px solid #e5e7eb",
            boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
            overflow: "hidden",
          }}>
            <div style={{ padding: "20px 22px", borderBottom: "1px solid #f3f4f6" }}>
              <h3 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 }}>
                System Alerts
              </h3>
            </div>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              {pending > 0 ? (
                <AlertItem
                  bg="#fffbeb" border="#fde68a" titleColor="#b45309" bodyColor="#92400e"
                  title="Queue Backlog"
                  body={`${pending} order(s) pending assignment.`}
                  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 15, height: 15 }}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>}
                />
              ) : (
                <AlertItem
                  bg="#eff6ff" border="#bfdbfe" titleColor="#1d4ed8" bodyColor="#1e40af"
                  title="No Backlog"
                  body="All queues fully processed."
                  icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 15, height: 15 }}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
              )}
              <AlertItem
                bg="#f0fdf4" border="#bbf7d0" titleColor="#15803d" bodyColor="#166534"
                title="Logistics OK"
                body="All delivery channels online."
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 15, height: 15 }}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>}
              />
              <AlertItem
                bg="#FEF2F2" border="#FECACA" titleColor="#991B1B" bodyColor="#7F1D1D"
                title="Platform Online"
                body="All services running normally."
                icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ width: 15, height: 15 }}><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" /></svg>}
              />
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
