import { useState } from "react";
import StatusBadge from "../shared/StatusBadge";

export default function UserTable({ columns, rows, emptyText = "No data found." }) {
  const [query, setQuery] = useState("");

  const filtered = rows.filter(row =>
    columns.some(col => {
      const val = row[col.key];
      if (val == null) return false;
      return String(val).toLowerCase().includes(query.toLowerCase());
    })
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Search bar */}
      <div style={{ position: "relative", maxWidth: 380 }}>
        <svg
          viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8"
          style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, pointerEvents: "none" }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search..."
          style={{
            width: "100%", boxSizing: "border-box",
            background: "#fff", border: "1px solid #e5e7eb",
            borderRadius: 12, paddingLeft: 42, paddingRight: 16,
            paddingTop: 10, paddingBottom: 10,
            fontSize: 13.5, color: "#111827",
            outline: "none",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            transition: "border-color 0.15s, box-shadow 0.15s",
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = "#DC2626";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(220,38,38,0.10)";
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = "#e5e7eb";
            e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
          }}
        />
      </div>

      {/* Table */}
      <div style={{
        background: "#fff", borderRadius: 16,
        border: "1px solid #e5e7eb",
        boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
        overflow: "hidden",
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                {columns.map(col => (
                  <th key={col.key} style={{
                    padding: "13px 20px", textAlign: "left",
                    fontSize: 11, fontWeight: 700, color: "#9ca3af",
                    textTransform: "uppercase", letterSpacing: "0.07em",
                    whiteSpace: "nowrap",
                  }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    style={{ padding: "60px 24px", textAlign: "center", fontSize: 14, color: "#9ca3af", fontWeight: 500 }}
                  >
                    {query ? "No matching records found." : emptyText}
                  </td>
                </tr>
              ) : (
                filtered.map((row, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: i < filtered.length - 1 ? "1px solid #f9fafb" : "none",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    {columns.map(col => {
                      const isId     = col.key === "id" || col.key === "orderId";
                      const isRating = col.key === "rating";
                      return (
                        <td key={col.key} style={{ padding: "14px 20px", fontSize: 13, color: "#374151", whiteSpace: "nowrap" }}>
                          {col.badge ? (
                            <StatusBadge status={row[col.key]} />
                          ) : isId ? (
                            <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, color: "#111827" }}>
                              {row[col.key]}
                            </span>
                          ) : isRating ? (
                            <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 800, color: "#d97706" }}>
                              {row[col.key]}
                            </span>
                          ) : (
                            row[col.key]
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
