import { useState, useEffect, useCallback } from "react";
import Layout from "../../components/shared/Layout";
import { useWindowSize } from "../../hooks/useWindowSize";
import api from "../../services/api";

// ── Shared styles ───────────────────────────────────────────────
const labelSt = {
  fontSize: 12, fontWeight: 700, color: "#374151",
  display: "block", marginBottom: 6,
};
const inputSt = {
  width: "100%", padding: "10px 14px", borderRadius: 10,
  border: "1.5px solid #e5e7eb", fontSize: 14, color: "#111827",
  outline: "none", boxSizing: "border-box", background: "#fff",
  transition: "border-color 0.15s",
};
const fo = e => { e.target.style.borderColor = "#10b981"; };
const fb = e => { e.target.style.borderColor = "#e5e7eb"; };

// ── Modal overlay ───────────────────────────────────────────────
function Modal({ title, onClose, children, maxWidth = 480 }) {
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(15,23,42,0.45)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div style={{
        background: "#fff", borderRadius: 20,
        boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
        width: "100%", maxWidth,
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{
          padding: "20px 24px", borderBottom: "1px solid #f3f4f6",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, background: "#fff", zIndex: 1,
        }}>
          <h2 style={{
            fontFamily: "'Outfit', sans-serif", fontSize: 18,
            fontWeight: 800, color: "#111827", margin: 0,
          }}>
            {title}
          </h2>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: "none",
            background: "#f3f4f6", cursor: "pointer", fontSize: 18,
            color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const MAP = {
    active:   { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
    inactive: { bg: "#f9fafb", color: "#6b7280", border: "#e5e7eb" },
    on_leave: { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  };
  const c = MAP[status] ?? MAP.inactive;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      whiteSpace: "nowrap", textTransform: "capitalize",
    }}>
      {(status || "unknown").replace(/_/g, " ")}
    </span>
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
    }}>
      {msg}
    </div>
  );
}


// ── Main page ───────────────────────────────────────────────────
export default function DeliveryManagementPage() {
  const { isMobile } = useWindowSize();

  const [boys,    setBoys]    = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const [modal,    setModal]    = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [formErr,  setFormErr]  = useState("");
  const [formOk,   setFormOk]   = useState("");

  const [form, setForm] = useState({ name: "", phone: "", password: "", status: "active", vendor_id: "" });

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [boysRes, vendorsRes] = await Promise.all([
        api.get("/admin/delivery-boys"),
        api.get("/vendors"),
      ]);
      setBoys(boysRes.data.deliveryBoys || []);
      setVendors(vendorsRes.data.vendors || []);
    } catch {
      setError("Failed to load data. Is the server running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setForm({ name: "", phone: "", password: "", status: "active", vendor_id: "" });
    setFormErr(""); setFormOk("");
    setModal("add");
  }

  function openEdit(b) {
    setSelected(b);
    setForm({ name: b.name || "", phone: b.phone || "", password: "", status: b.status || "active", vendor_id: b.vendor_id ? String(b.vendor_id) : "" });
    setFormErr(""); setFormOk("");
    setModal("edit");
  }

  function openDelete(b) {
    setSelected(b);
    setFormErr(""); setFormOk("");
    setModal("delete");
  }

  function closeModal() { setModal(null); setSelected(null); }

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.password || !form.vendor_id)
      return setFormErr("Name, phone, password and Iron's Head are required");
    setSaving(true); setFormErr(""); setFormOk("");
    try {
      await api.post("/admin/delivery-boys", form);
      setFormOk("Delivery boy created successfully");
      await load();
      setTimeout(closeModal, 1000);
    } catch (err) {
      setFormErr(err.response?.data?.message || "Failed to create account");
    } finally { setSaving(false); }
  }

  async function handleEdit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.vendor_id)
      return setFormErr("Name, phone and Iron's Head are required");
    setSaving(true); setFormErr(""); setFormOk("");
    try {
      await api.put(`/admin/delivery-boys/${selected.id}`, {
        name: form.name, phone: form.phone, status: form.status, vendor_id: form.vendor_id,
      });
      setFormOk("Updated successfully");
      await load();
      setTimeout(closeModal, 900);
    } catch (err) {
      setFormErr(err.response?.data?.message || "Failed to update");
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    setSaving(true); setFormErr(""); setFormOk("");
    try {
      await api.delete(`/admin/delivery-boys/${selected.id}`);
      setFormOk("Deleted successfully");
      await load();
      setTimeout(closeModal, 900);
    } catch (err) {
      setFormErr(err.response?.data?.message || "Failed to delete");
    } finally { setSaving(false); }
  }

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
              Delivery Management
            </h1>
            <p style={{ fontSize: 13.5, color: "#9ca3af", margin: "6px 0 0", fontWeight: 400 }}>
              Create and manage delivery boy accounts.
            </p>
          </div>
          <button
            onClick={openAdd}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 20px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 4px 14px rgba(16,185,129,0.35)", minHeight: 44,
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            <span style={{ fontSize: 20, lineHeight: 1, marginTop: -1 }}>+</span>
            Add Delivery Boy
          </button>
        </div>

        {error && <Alert type="err" msg={error} />}

        {/* Table card */}
        <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e5e7eb", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
          <div style={{
            padding: "14px 24px", borderBottom: "1px solid #f3f4f6",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>
              {loading ? "Loading…" : `${boys.length} Delivery Boy${boys.length !== 1 ? "s" : ""} Registered`}
            </span>
            <button onClick={load} style={{
              fontSize: 12, fontWeight: 600, color: "#10b981",
              border: "none", background: "none", cursor: "pointer",
            }}>↻ Refresh</button>
          </div>

          {loading ? (
            <div style={{ padding: "60px 24px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
              Loading…
            </div>
          ) : boys.length === 0 ? (
            <div style={{ padding: "60px 24px", textAlign: "center" }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#374151", margin: "0 0 6px" }}>No delivery boys yet</p>
              <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Click "Add Delivery Boy" to create the first one.</p>
            </div>
          ) : (
            <div className="si-table-wrap">
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                    {(isMobile ? ["Name", "Status", "Actions"] : ["#", "Name", "Phone", "Iron's Head", "Deliveries", "Status", "Actions"]).map(h => (
                      <th key={h} style={{
                        padding: "12px 16px", fontSize: 11, fontWeight: 700,
                        color: "#9ca3af", textTransform: "uppercase",
                        letterSpacing: "0.07em", textAlign: "left", whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {boys.map((b, idx) => (
                    <tr
                      key={b.id}
                      style={{ borderBottom: idx < boys.length - 1 ? "1px solid #f9fafb" : "none" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      {!isMobile && <td style={{ padding: "14px 16px", fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>{b.id}</td>}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                            background: "linear-gradient(135deg, #10b981, #06b6d4)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 13, fontWeight: 800, color: "#fff",
                          }}>
                            {b.name?.[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div>
                            <span style={{ fontSize: 13.5, fontWeight: 700, color: "#111827", display: "block" }}>{b.name}</span>
                            {isMobile && <span style={{ fontSize: 12, color: "#6b7280" }}>{b.phone || "—"}</span>}
                          </div>
                        </div>
                      </td>
                      {!isMobile && <td style={{ padding: "14px 16px", fontSize: 13, color: "#374151", whiteSpace: "nowrap" }}>{b.phone || "—"}</td>}
                      {!isMobile && (
                        <td style={{ padding: "14px 16px" }}>
                          {b.vendor_name
                            ? <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "#FEF2F2", color: "#B91C1C", border: "1px solid #FECACA" }}>{b.vendor_name}</span>
                            : <span style={{ fontSize: 12, color: "#d1d5db" }}>Admin</span>}
                        </td>
                      )}
                      {!isMobile && <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 800, color: "#10b981" }}>
                          {b.total_deliveries || 0}
                        </span>
                      </td>}
                      <td style={{ padding: "14px 16px" }}><StatusBadge status={b.status} /></td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => openEdit(b)} style={{
                            padding: "5px 12px", borderRadius: 8,
                            border: "1px solid #bbf7d0", background: "#f0fdf4",
                            color: "#16a34a", fontSize: 12, fontWeight: 700, cursor: "pointer",
                          }}>Edit</button>
                          <button onClick={() => openDelete(b)} style={{
                            padding: "5px 12px", borderRadius: 8,
                            border: "1px solid #fecaca", background: "#fef2f2",
                            color: "#dc2626", fontSize: 12, fontWeight: 700, cursor: "pointer",
                          }}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Add Modal ── */}
      {modal === "add" && (
        <Modal title="Add New Delivery Boy" onClose={closeModal}>
          <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelSt}>Iron&apos;s Head *</label>
              <select style={{ ...inputSt, cursor: "pointer" }} value={form.vendor_id}
                onChange={set("vendor_id")} onFocus={fo} onBlur={fb}>
                <option value="">— Select Iron&apos;s Head —</option>
                {vendors.map(v => (
                  <option key={v.id} value={String(v.id)}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelSt}>Full Name *</label>
              <input style={inputSt} placeholder="e.g. Kumar" value={form.name}
                onChange={set("name")} onFocus={fo} onBlur={fb} />
            </div>
            <div>
              <label style={labelSt}>Mobile Number *</label>
              <input style={inputSt} placeholder="10-digit mobile" value={form.phone}
                onChange={set("phone")} onFocus={fo} onBlur={fb} />
            </div>
            <div>
              <label style={labelSt}>Password *</label>
              <input type="password" style={inputSt} placeholder="Min 6 characters" value={form.password}
                onChange={set("password")} onFocus={fo} onBlur={fb} />
            </div>
            <Alert type="err" msg={formErr} />
            <Alert type="ok"  msg={formOk}  />
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={closeModal} style={{
                flex: 1, padding: "11px 0", borderRadius: 10,
                border: "1.5px solid #e5e7eb", background: "#fff",
                color: "#374151", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>Cancel</button>
              <button type="submit" disabled={saving} style={{
                flex: 2, padding: "11px 0", borderRadius: 10, border: "none",
                background: saving ? "#e5e7eb" : "linear-gradient(135deg,#10b981,#059669)",
                color: saving ? "#9ca3af" : "#fff",
                fontSize: 13, fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
              }}>{saving ? "Creating…" : "Create Delivery Boy"}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit Modal ── */}
      {modal === "edit" && selected && (
        <Modal title={`Edit — ${selected.name}`} onClose={closeModal}>
          <form onSubmit={handleEdit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelSt}>Iron&apos;s Head *</label>
              <select style={{ ...inputSt, cursor: "pointer" }} value={form.vendor_id}
                onChange={set("vendor_id")} onFocus={fo} onBlur={fb}>
                <option value="">— Select Iron&apos;s Head —</option>
                {vendors.map(v => (
                  <option key={v.id} value={String(v.id)}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelSt}>Full Name *</label>
              <input style={inputSt} value={form.name}
                onChange={set("name")} onFocus={fo} onBlur={fb} />
            </div>
            <div>
              <label style={labelSt}>Mobile Number *</label>
              <input style={inputSt} value={form.phone}
                onChange={set("phone")} onFocus={fo} onBlur={fb} />
            </div>
            <div>
              <label style={labelSt}>Status</label>
              <select style={{ ...inputSt, cursor: "pointer" }} value={form.status}
                onChange={set("status")} onFocus={fo} onBlur={fb}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on_leave">On Leave</option>
              </select>
            </div>
            <Alert type="err" msg={formErr} />
            <Alert type="ok"  msg={formOk}  />
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={closeModal} style={{
                flex: 1, padding: "11px 0", borderRadius: 10,
                border: "1.5px solid #e5e7eb", background: "#fff",
                color: "#374151", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>Cancel</button>
              <button type="submit" disabled={saving} style={{
                flex: 2, padding: "11px 0", borderRadius: 10, border: "none",
                background: saving ? "#e5e7eb" : "linear-gradient(135deg,#10b981,#059669)",
                color: saving ? "#9ca3af" : "#fff",
                fontSize: 13, fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
              }}>{saving ? "Saving…" : "Save Changes"}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete Modal ── */}
      {modal === "delete" && selected && (
        <Modal title="Delete Delivery Boy" onClose={closeModal} maxWidth={440}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca",
              borderRadius: 12, padding: "16px 18px",
            }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#dc2626", margin: "0 0 8px" }}>
                ⚠️ This cannot be undone
              </p>
              <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.6 }}>
                Delete <strong>{selected.name}</strong>? All their delivery assignment records will also be removed.
              </p>
            </div>
            <Alert type="err" msg={formErr} />
            <Alert type="ok"  msg={formOk}  />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={closeModal} style={{
                flex: 1, padding: "11px 0", borderRadius: 10,
                border: "1.5px solid #e5e7eb", background: "#fff",
                color: "#374151", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>Cancel</button>
              <button onClick={handleDelete} disabled={saving} style={{
                flex: 2, padding: "11px 0", borderRadius: 10, border: "none",
                background: saving ? "#e5e7eb" : "#dc2626",
                color: saving ? "#9ca3af" : "#fff",
                fontSize: 13, fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
              }}>{saving ? "Deleting…" : "Yes, Delete"}</button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
