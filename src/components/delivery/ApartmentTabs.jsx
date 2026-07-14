// Tab bar of apartment names derived from `jobs`, plus an "All" tab. Selecting
// one filters the page's job lists down to just that apartment.
export default function ApartmentTabs({ jobs, active, onChange }) {
  const apartments = [...new Set(jobs.map(j => j.apartment).filter(Boolean))].sort();
  if (apartments.length === 0) return null;

  const tabs = ["All", ...apartments];

  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
      {tabs.map(name => {
        const count = name === "All" ? jobs.length : jobs.filter(j => j.apartment === name).length;
        const isActive = active === name;
        return (
          <button
            key={name}
            onClick={() => onChange(name)}
            style={{
              flexShrink: 0, display: "flex", alignItems: "center", gap: 7,
              padding: "8px 16px", borderRadius: 99, fontSize: 13, fontWeight: 700,
              border: isActive ? "1.5px solid #10b981" : "1.5px solid #e5e7eb",
              background: isActive ? "#ecfdf5" : "#fff",
              color: isActive ? "#059669" : "#6b7280",
              cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            {name}
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 99,
              background: isActive ? "#d1fae5" : "#f3f4f6",
              color: isActive ? "#059669" : "#9ca3af",
            }}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
