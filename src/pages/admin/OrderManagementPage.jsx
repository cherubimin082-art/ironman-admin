import Layout from "../../components/shared/Layout";
import UserTable from "../../components/admin/UserTable";
import { useOrders } from "../../context/OrderContext";

const COLUMNS = [
  { key: "id",       label: "Order ID"  },
  { key: "customer", label: "Customer"  },
  { key: "items",    label: "Items"     },
  { key: "zone",     label: "Zone"      },
  { key: "time",     label: "Time"      },
  { key: "amount",   label: "Amount"    },
  { key: "status",   label: "Status", badge: true },
];

export default function OrderManagementPage() {
  const { orders } = useOrders();
  const rows = orders.map(o => ({ ...o, amount: `₹${o.amount}` }));

  return (
    <Layout>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#DC2626", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 5px" }}>
              Admin
            </p>
            <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 800, color: "#111827", margin: 0, lineHeight: 1.15 }}>
              Order Management
            </h1>
            <p style={{ fontSize: 13.5, color: "#9ca3af", margin: "6px 0 0", fontWeight: 400 }}>
              Monitor laundry jobs, statuses, and revenue details.
            </p>
          </div>
          <div style={{
            background: "#FEF2F2", border: "1px solid #FECACA",
            borderRadius: 10, padding: "9px 16px",
            fontSize: 13, fontWeight: 700, color: "#B91C1C",
          }}>
            {orders.length} Total Orders
          </div>
        </div>

        <UserTable columns={COLUMNS} rows={rows} />
      </div>
    </Layout>
  );
}
