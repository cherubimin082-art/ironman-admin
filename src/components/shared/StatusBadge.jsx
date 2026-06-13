const STATUS_CONFIG = {
  pending:              { color: "#b45309", bg: "#fffbeb", border: "#fde68a", dot: "#f59e0b", label: "Pending"            },
  vendor_accepted:      { color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", dot: "#3b82f6", label: "Accepted"           },
  delivery_assigned:    { color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", dot: "#8b5cf6", label: "Agent Assigned"     },
  in_progress:          { color: "#4338ca", bg: "#eef2ff", border: "#c7d2fe", dot: "#6366f1", label: "In Progress"        },
  picked_up:            { color: "#0369a1", bg: "#f0f9ff", border: "#bae6fd", dot: "#0ea5e9", label: "Picked Up"          },
  at_vendor:            { color: "#c2410c", bg: "#fff7ed", border: "#fed7aa", dot: "#f97316", label: "At Iron Shop"        },
  ironing_in_progress:  { color: "#92400e", bg: "#fffbeb", border: "#fde68a", dot: "#f59e0b", label: "Ironing in Progress" },
  ready_for_delivery:   { color: "#047857", bg: "#ecfdf5", border: "#a7f3d0", dot: "#10b981", label: "Ready for Delivery"  },
  picked_from_vendor:   { color: "#5b21b6", bg: "#f5f3ff", border: "#ddd6fe", dot: "#8b5cf6", label: "Picked from Vendor"  },
  out_for_delivery:     { color: "#0e7490", bg: "#ecfeff", border: "#a5f3fc", dot: "#06b6d4", label: "Out for Delivery"    },
  delivered:            { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", dot: "#22c55e", label: "Delivered"          },
  cancelled:            { color: "#b91c1c", bg: "#fef2f2", border: "#fecaca", dot: null,      label: "Cancelled"          },
  // non-order statuses
  "in-progress":        { color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", dot: "#3b82f6", label: "In Progress"       },
  ready:                { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", dot: "#22c55e", label: "Ready"              },
  active:               { color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0", dot: "#22c55e", label: "Active"             },
  inactive:             { color: "#b91c1c", bg: "#fef2f2", border: "#fecaca", dot: null,      label: "Inactive"           },
  available:            { color: "#0f766e", bg: "#f0fdfa", border: "#99f6e4", dot: "#14b8a6", label: "Available"          },
  taken:                { color: "#4b5563", bg: "#f9fafb", border: "#e5e7eb", dot: null,      label: "Taken"              },
  "on-leave":           { color: "#c2410c", bg: "#fff7ed", border: "#fed7aa", dot: null,      label: "On Leave"           },
};

export default function StatusBadge({ status }) {
  const key = status?.toLowerCase() ?? "";
  const cfg = STATUS_CONFIG[key] ?? { color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb", dot: null, label: status };

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 10px", borderRadius: 99,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      fontSize: 11, fontWeight: 700, color: cfg.color,
      whiteSpace: "nowrap", lineHeight: 1.6,
    }}>
      {cfg.dot && (
        <span style={{
          width: 6, height: 6, borderRadius: "50%",
          background: cfg.dot, flexShrink: 0,
          boxShadow: `0 0 0 2px ${cfg.dot}33`,
        }} />
      )}
      {cfg.label}
    </span>
  );
}
