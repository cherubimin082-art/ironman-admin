import { useState, useEffect, useCallback } from "react";
import Layout from "../../components/shared/Layout";
import api from "../../services/api";

const labelSt = { fontSize: 12, fontWeight: 700, color: "#374151", display: "block", marginBottom: 6 };
const inputSt = {
  width: "100%", padding: "10px 14px", borderRadius: 10,
  border: "1.5px solid #e5e7eb", fontSize: 14, color: "#111827",
  outline: "none", boxSizing: "border-box", background: "#fff",
};
const fo = e => { e.target.style.borderColor = "#DC2626"; };
const fb = e => { e.target.style.borderColor = "#e5e7eb"; };

function Modal({ title, onClose, children, maxWidth = 480 }) {
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(15,23,42,0.45)", backdropFilter: "blur(3px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, width: "100%", maxWidth,
        maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
      }}>
        <div style={{
          padding: "18px 22px", borderBottom: "1px solid #f3f4f6",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, background: "#fff", zIndex: 1,
        }}>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: "#111827", margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: 8, border: "none",
            background: "#f3f4f6", cursor: "pointer", fontSize: 18, color: "#6b7280",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  );
}

function Alert({ type, msg }) {
  if (!msg) return null;
  const ok = type === "ok";
  return (
    <div style={{
      background: ok ? "#f0fdf4" : "#fef2f2",
      border: `1px solid ${ok ? "#bbf7d0" : "#fecaca"}`,
      borderRadius: 8, padding: "10px 14px",
      color: ok ? "#16a34a" : "#dc2626", fontSize: 13, fontWeight: 500,
    }}>{msg}</div>
  );
}

const fmtDate = d => d
  ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  : "—";

export default function CustomerManagementPage() {
  const [customers, setCustomers] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [query, setQuery]         = useState("");
  const [modal, setModal]         = useState(null);
  const [selected, setSelected]   = useState(null);
  const [saving, setSaving]       = useState(false);
  const [formErr, setFormErr]     = useState("");
  const [formOk, setFormOk]       = useState("");
  const [form, setForm]           = useState({ name: "", phone: "", password: "", apartment: "", address: "" });

  const loadCustomers = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const { data } = await api.get("/admin/customers");
      setCustomers(data.customers || []);
    } catch { setError("Failed to load customers."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadCustomers();
    api.get("/admin/apartments-list")
      .then(({ data }) => setApartments(data.apartments || []))
      .catch(() => {});
  }, [loadCustomers]);

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));
  const closeModal = () => { setModal(null); setSelected(null); setFormErr(""); setFormOk(""); };

  function openAdd() {
    setForm({ name: "", phone: "", password: "", apartment: "", address: "" });
    setFormErr(""); setFormOk(""); setModal("add");
  }
  function openEdit(c) {
    setSelected(c);
    setForm({ name: c.name || "", phone: c.phone || "", password: "", apartment: c.apartment || "", address: c.address || "" });
    setFormErr(""); setFormOk(""); setModal("edit");
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.password)
      return setFormErr("Name, phone and password are required");
    setSaving(true); setFormErr(""); setFormOk("");
    try {
      await api.post("/admin/customers", form);
      setFormOk("Customer created!"); await loadCustomers();
      setTimeout(closeModal, 1000);
    } catch (err) { setFormErr(err.response?.data?.message || "Failed"); }
    finally { setSaving(false); }
  }

  async function handleEdit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return setFormErr("Name and phone are required");
    setSaving(true); setFormErr(""); setFormOk("");
    try {
      await api.put(`/admin/customers/${selected.id}`, form);
      setFormOk("Updated!"); await loadCustomers();
      setTimeout(closeModal, 1000);
    } catch (err) { setFormErr(err.response?.data?.message || "Failed"); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    setSaving(true); setFormErr("");
    try {
      await api.delete(`/admin/customers/${selected.id}`);
      await loadCustomers(); closeModal();
    } catch (err) { setFormErr(err.response?.data?.message || "Failed to delete"); }
    finally { setSaving(false); }
  }

  const filtered = customers.filter(c =>
    c.name?.toLowerCase().includes(query.toLowerCase()) ||
    c.phone?.includes(query) ||
    c.apartment?.toLowerCase().includes(query.toLowerCase())
  );

  const CustomerForm = ({ onSubmit, isEdit }) => (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label style={labelSt}>Full Name *</label>
        <input value={form.name} onChange={set("name")} placeholder="e.g. Ravi Kumar" style={inputSt} onFocus={fo} onBlur={fb} required />
      </div>
      <div>
        <label style={labelSt}>Phone Number *</label>
        <input value={form.phone} onChange={set("phone")} placeholder="10-digit mobile" maxLength={10} style={inputSt} onFocus={fo} onBlur={fb} required />
      </div>
      {!isEdit && (
        <div>
          <label style={labelSt}>Password *</label>
          <input type="password" value={form.password} onChange={set("password")} placeholder="Set a password" style={inputSt} onFocus={fo} onBlur={fb} required />
        </div>
      )}
      <div>
        <label style={labelSt}>Apartment</label>
        {apartments.length > 0 ? (
          <select value={form.apartment} onChange={set("apartment")} style={{ ...inputSt, cursor: "pointer" }} onFocus={fo} onBlur={fb}>
            <option value="">— Select apartment —</option>
            {apartments.map(a => (
              <option key={a.id} value={a.name}>{a.name} ({a.pickup_time})</option>
            ))}
          </select>
        ) : (
          <div style={{ padding: "10px 14px", background: "#fef9ec", border: "1.5px solid #fcd34d", borderRadius: 10, fontSize: 13, color: "#92400e" }}>
            No apartments yet — add some via the Apartments page in the sidebar.
          </div>
        )}
      </div>
      <div>
        <label style={labelSt}>Address</label>
        <input value={form.address} onChange={set("address")} placeholder="Door / block number" style={inputSt} onFocus={fo} onBlur={fb} />
      </div>
      <Alert type="error" msg={formErr} />
      <Alert type="ok"    msg={formOk}  />
      <button type="submit" disabled={saving} style={{
        padding: "11px 0", borderRadius: 10, border: "none",
        background: "#B91C1C", color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer",
      }}>
        {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Customer"}
      </button>
    </form>
  );

  return (
    <Layout>
      <div style={{ background: "#F5F5F8", minHeight: "100vh", padding: "28px 24px" }}>

        <div style={{ marginBottom: 22 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#0F172A", margin: "0 0 5px" }}>Customers</h1>
          <p style={{ fontSize: 13.5, color: "#94A3B8", margin: 0 }}>Manage customer accounts.</p>
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 340 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, pointerEvents: "none" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name, phone or apartment…"
              style={{ ...inputSt, paddingLeft: 38, fontSize: 13.5 }} onFocus={fo} onBlur={fb} />
          </div>
          <button onClick={openAdd} style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "10px 18px", borderRadius: 10, border: "none",
            background: "#B91C1C", color: "white", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Customer
          </button>
        </div>

        {error && <Alert type="error" msg={error} />}

        {/* Table */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", boxShadow: "0 2px 10px rgba(0,0,0,0.04)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                {["Name", "Phone", "Apartment", "Joined", "Actions"].map(h => (
                  <th key={h} style={{ padding: "12px 18px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", whiteSpace: "nowrap" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: "48px 18px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: "48px 18px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>{query ? "No matching customers." : "No customers yet."}</td></tr>
              ) : filtered.map((c, i) => (
                <tr key={c.id}
                  style={{ borderBottom: i < filtered.length - 1 ? "1px solid #f9fafb" : "none", transition: "background 0.1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f9fafb"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "13px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 99, background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#B91C1C" }}>{c.name?.charAt(0).toUpperCase()}</span>
                      </div>
                      <span style={{ fontSize: 13.5, fontWeight: 600, color: "#111827" }}>{c.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "13px 18px", fontSize: 13, color: "#374151" }}>{c.phone}</td>
                  <td style={{ padding: "13px 18px", fontSize: 13, color: "#6b7280" }}>{c.apartment || "—"}</td>
                  <td style={{ padding: "13px 18px", fontSize: 12, color: "#9ca3af" }}>{fmtDate(c.created_at)}</td>
                  <td style={{ padding: "13px 18px" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => openEdit(c)} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "white", fontSize: 12, fontWeight: 600, color: "#374151", cursor: "pointer" }}>Edit</button>
                      <button onClick={() => { setSelected(c); setFormErr(""); setModal("delete"); }} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", fontSize: 12, fontWeight: 600, color: "#dc2626", cursor: "pointer" }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {modal === "add" && (
          <Modal title="Add Customer" onClose={closeModal}>
            <CustomerForm onSubmit={handleAdd} isEdit={false} />
          </Modal>
        )}
        {modal === "edit" && selected && (
          <Modal title={`Edit — ${selected.name}`} onClose={closeModal}>
            <CustomerForm onSubmit={handleEdit} isEdit={true} />
          </Modal>
        )}
        {modal === "delete" && selected && (
          <Modal title="Delete Customer?" onClose={closeModal} maxWidth={380}>
            <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 18 }}>
              This will permanently delete <strong>{selected.name}</strong>. Their order history will remain.
            </p>
            <Alert type="error" msg={formErr} />
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={closeModal} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "1.5px solid #e5e7eb", background: "white", fontWeight: 700, fontSize: 13, cursor: "pointer", color: "#374151" }}>Cancel</button>
              <button onClick={handleDelete} disabled={saving} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", background: "#DC2626", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {saving ? "Deleting…" : "Delete"}
              </button>
            </div>
          </Modal>
        )}
      </div>
    </Layout>
  );
}
