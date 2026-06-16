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

const TIME_SLOTS = [
  "6:00 AM – 7:00 AM",
  "7:00 AM – 8:00 AM",
  "8:00 AM – 9:00 AM",
  "9:00 AM – 10:00 AM",
  "10:00 AM – 11:00 AM",
  "11:00 AM – 12:00 PM",
  "12:00 PM – 1:00 PM",
  "1:00 PM – 2:00 PM",
  "2:00 PM – 3:00 PM",
  "3:00 PM – 4:00 PM",
  "4:00 PM – 5:00 PM",
  "5:00 PM – 6:00 PM",
  "6:00 PM – 7:00 PM",
  "7:00 PM – 8:00 PM",
];

function Modal({ title, onClose, children, maxWidth = 440 }) {
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

function AptForm({ form, set, modal, saving, formErr, formOk, onSubmit }) {
  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label style={labelSt}>Apartment Name *</label>
        <input value={form.name} onChange={set("name")} placeholder="e.g. Green Valley Apartments" style={inputSt} onFocus={fo} onBlur={fb} required />
      </div>
      <div>
        <label style={labelSt}>Pickup Time Slot *</label>
        <select value={form.pickup_time} onChange={set("pickup_time")} style={{ ...inputSt, cursor: "pointer" }} onFocus={fo} onBlur={fb} required>
          <option value="">— Select a time slot —</option>
          {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <Alert type="error" msg={formErr} />
      <Alert type="ok"    msg={formOk}  />
      <button type="submit" disabled={saving} style={{ padding: "11px 0", borderRadius: 10, border: "none", background: "#B91C1C", color: "white", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
        {saving ? "Saving…" : modal === "edit" ? "Save Changes" : "Add Apartment"}
      </button>
    </form>
  );
}

export default function ApartmentsPage() {
  const [apartments, setApartments] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(null);
  const [selected, setSelected]     = useState(null);
  const [saving, setSaving]         = useState(false);
  const [formErr, setFormErr]       = useState("");
  const [formOk, setFormOk]         = useState("");
  const [form, setForm]             = useState({ name: "", pickup_time: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/apartments-list");
      setApartments(data.apartments || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));
  const closeModal = () => { setModal(null); setSelected(null); setFormErr(""); setFormOk(""); };

  function openAdd() { setForm({ name: "", pickup_time: "" }); setFormErr(""); setFormOk(""); setModal("add"); }
  function openEdit(a) { setSelected(a); setForm({ name: a.name, pickup_time: a.pickup_time }); setFormErr(""); setFormOk(""); setModal("edit"); }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.pickup_time.trim()) return setFormErr("Both fields are required");
    setSaving(true); setFormErr(""); setFormOk("");
    try {
      await api.post("/admin/apartments-list", form);
      setFormOk("Apartment added!"); await load();
      setTimeout(closeModal, 900);
    } catch (err) { setFormErr(err.response?.data?.message || "Failed"); }
    finally { setSaving(false); }
  }

  async function handleEdit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.pickup_time.trim()) return setFormErr("Both fields are required");
    setSaving(true); setFormErr(""); setFormOk("");
    try {
      await api.put(`/admin/apartments-list/${selected.id}`, form);
      setFormOk("Updated!"); await load();
      setTimeout(closeModal, 900);
    } catch (err) { setFormErr(err.response?.data?.message || "Failed"); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    setSaving(true); setFormErr("");
    try {
      await api.delete(`/admin/apartments-list/${selected.id}`);
      await load(); closeModal();
    } catch (err) { setFormErr(err.response?.data?.message || "Failed"); }
    finally { setSaving(false); }
  }


  return (
    <Layout>
      <div style={{ background: "#F5F5F8", minHeight: "100vh", padding: "28px 24px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: "#0F172A", margin: "0 0 5px" }}>Apartments</h1>
            <p style={{ fontSize: 13.5, color: "#94A3B8", margin: 0 }}>Manage apartment pickup locations and time slots.</p>
          </div>
          <button onClick={openAdd} style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "10px 18px", borderRadius: 10, border: "none",
            background: "#B91C1C", color: "white", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Apartment
          </button>
        </div>

        {/* Empty state */}
        {!loading && apartments.length === 0 && (
          <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb", padding: "56px 24px", textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="24" height="24">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#374151", margin: "0 0 6px" }}>No apartments yet</p>
            <p style={{ fontSize: 13, color: "#9ca3af", margin: "0 0 18px" }}>Add apartments to assign pickup slots to customers.</p>
            <button onClick={openAdd} style={{ padding: "9px 22px", borderRadius: 10, border: "none", background: "#B91C1C", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              Add First Apartment
            </button>
          </div>
        )}

        {/* Cards grid */}
        {!loading && apartments.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {apartments.map(a => (
              <div key={a.id} style={{
                background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)", padding: "16px 18px",
                display: "flex", flexDirection: "column", gap: 12,
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "#FEE2E2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="#B91C1C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="19" height="19">
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</p>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 99, padding: "3px 10px" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="11" height="11"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: "#16a34a" }}>{a.pickup_time}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => openEdit(a)} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "1px solid #e5e7eb", background: "white", fontSize: 12.5, fontWeight: 700, color: "#374151", cursor: "pointer" }}>Edit</button>
                  <button onClick={() => { setSelected(a); setFormErr(""); setModal("delete"); }} style={{ flex: 1, padding: "7px 0", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", fontSize: 12.5, fontWeight: 700, color: "#dc2626", cursor: "pointer" }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading && <p style={{ color: "#9ca3af", fontSize: 14 }}>Loading…</p>}

        {modal === "add"  && <Modal title="Add Apartment" onClose={closeModal}><AptForm form={form} set={set} modal={modal} saving={saving} formErr={formErr} formOk={formOk} onSubmit={handleAdd} /></Modal>}
        {modal === "edit" && selected && <Modal title={`Edit — ${selected.name}`} onClose={closeModal}><AptForm form={form} set={set} modal={modal} saving={saving} formErr={formErr} formOk={formOk} onSubmit={handleEdit} /></Modal>}
        {modal === "delete" && selected && (
          <Modal title="Delete Apartment?" onClose={closeModal} maxWidth={380}>
            <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 18 }}>
              Delete <strong>{selected.name}</strong>? Customers already assigned to it won't be affected.
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
