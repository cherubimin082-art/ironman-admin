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
const fo = e => { e.target.style.borderColor = "#DC2626"; };
const fb = e => { e.target.style.borderColor = "#e5e7eb"; };

// ── Modal overlay ───────────────────────────────────────────────
function Modal({ title, onClose, children, maxWidth = 520 }) {
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

// ── Status badge ────────────────────────────────────────────────
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

// ── Alert box ───────────────────────────────────────────────────
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

const fmtDate = d => d
  ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  : "—";

const BAG_STATUSES = ["available", "in_use", "missing", "retired"];
const BAG_COLORS = {
  available: { bg: "#f0fdf4", color: "#16a34a", border: "#bbf7d0" },
  in_use:    { bg: "#eff6ff", color: "#2563eb", border: "#bfdbfe" },
  missing:   { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  retired:   { bg: "#f9fafb", color: "#6b7280", border: "#e5e7eb" },
};

function BagsModal({ vendor, onClose }) {
  const [bags, setBags]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [updating, setUpdating] = useState(null); // bag id being updated
  const [addCount, setAddCount] = useState(1);
  const [adding, setAdding]     = useState(false);
  const [err, setErr]           = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/vendors/${vendor.id}/bags`);
      setBags(data.bags || []);
    } catch { setErr("Failed to load bags"); }
    finally { setLoading(false); }
  }, [vendor.id]);

  useEffect(() => { load(); }, [load]);

  async function changeStatus(bag, status) {
    setUpdating(bag.id); setErr("");
    try {
      await api.put(`/admin/bags/${bag.id}`, { status });
      setBags(prev => prev.map(b => b.id === bag.id ? { ...b, status } : b));
    } catch (e) { setErr(e.response?.data?.message || "Failed to update"); }
    finally { setUpdating(null); }
  }

  async function handleAdd() {
    setAdding(true); setErr("");
    try {
      await api.post(`/admin/vendors/${vendor.id}/bags`, { count: addCount });
      await load();
    } catch (e) { setErr(e.response?.data?.message || "Failed to add bags"); }
    finally { setAdding(false); }
  }

  async function handleDelete(bag) {
    setUpdating(bag.id); setErr("");
    try {
      await api.delete(`/admin/bags/${bag.id}`);
      setBags(prev => prev.filter(b => b.id !== bag.id));
    } catch (e) { setErr(e.response?.data?.message || "Failed to delete"); }
    finally { setUpdating(null); }
  }

  const counts = BAG_STATUSES.reduce((acc, s) => {
    acc[s] = bags.filter(b => b.status === s).length;
    return acc;
  }, {});

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()} style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(15,23,42,0.45)", backdropFilter: "blur(3px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, width: "100%", maxWidth: 640,
        maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 22px", borderBottom: "1px solid #f3f4f6",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, background: "#fff", zIndex: 1,
        }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: "#111827", margin: "0 0 2px" }}>
              Bags — {vendor.name}
            </h2>
            <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>{bags.length} bags total</p>
          </div>
          <button onClick={onClose} style={{
            width: 30, height: 30, borderRadius: 8, border: "none",
            background: "#f3f4f6", cursor: "pointer", fontSize: 18, color: "#6b7280",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>

        <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Summary chips */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {BAG_STATUSES.map(s => {
              const c = BAG_COLORS[s];
              return (
                <div key={s} style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "4px 12px", borderRadius: 99,
                  background: c.bg, border: `1px solid ${c.border}`,
                }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: c.color }}>{counts[s]}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: c.color, textTransform: "capitalize" }}>
                    {s.replace("_", " ")}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Add bags row */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#f9fafb", borderRadius: 12, padding: "12px 16px" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", flex: 1 }}>Add more bags</span>
            <input
              type="number" min={1} max={50} value={addCount}
              onChange={e => setAddCount(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
              style={{ width: 64, padding: "6px 10px", borderRadius: 8, border: "1.5px solid #e5e7eb", fontSize: 14, textAlign: "center", outline: "none" }}
            />
            <button onClick={handleAdd} disabled={adding} style={{
              padding: "7px 16px", borderRadius: 8, border: "none",
              background: "#B91C1C", color: "white", fontWeight: 700, fontSize: 13, cursor: "pointer",
            }}>
              {adding ? "Adding…" : "Add"}
            </button>
          </div>

          {err && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "9px 14px", fontSize: 13, color: "#dc2626" }}>
              {err}
            </div>
          )}

          {/* Bags grid */}
          {loading ? (
            <p style={{ color: "#9ca3af", fontSize: 14, textAlign: "center", padding: "24px 0" }}>Loading…</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
              {bags.map(bag => {
                const c = BAG_COLORS[bag.status] || BAG_COLORS.available;
                const busy = updating === bag.id;
                return (
                  <div key={bag.id} style={{
                    borderRadius: 12, border: `1.5px solid ${c.border}`,
                    background: c.bg, padding: "12px 14px",
                    display: "flex", flexDirection: "column", gap: 8,
                    opacity: busy ? 0.6 : 1, transition: "opacity 0.15s",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#111827" }}>#{bag.bag_number}</span>
                      <button
                        onClick={() => handleDelete(bag)}
                        disabled={busy}
                        title="Delete bag"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#d1d5db", fontSize: 14, padding: 0, lineHeight: 1 }}
                      >×</button>
                    </div>
                    <select
                      value={bag.status}
                      onChange={e => changeStatus(bag, e.target.value)}
                      disabled={busy}
                      style={{
                        fontSize: 11, fontWeight: 700, color: c.color,
                        background: "transparent", border: "none", outline: "none",
                        cursor: "pointer", padding: 0, textTransform: "capitalize",
                        width: "100%",
                      }}
                    >
                      {BAG_STATUSES.map(s => (
                        <option key={s} value={s}>{s.replace("_", " ")}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Vendor form fields (module-level so React doesn't remount on each keystroke) ──
function VendorFields({ form, onChange, isEdit, isMobile }) {
  return (
    <>
      <div>
        <label style={labelSt}>Full Name *</label>
        <input style={inputSt} placeholder="e.g. Ravi Iron Works" value={form.name}
          onChange={onChange("name")} onFocus={fo} onBlur={fb} />
      </div>
      <div>
        <label style={labelSt}>Mobile Number *</label>
        <input style={inputSt} placeholder="10-digit mobile" value={form.phone}
          onChange={onChange("phone")} onFocus={fo} onBlur={fb} />
      </div>
      {!isEdit && (
        <div>
          <label style={labelSt}>Password *</label>
          <input type="password" style={inputSt} placeholder="Min 6 characters" value={form.password}
            onChange={onChange("password")} onFocus={fo} onBlur={fb} />
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
        <div>
          <label style={labelSt}>Zone / Area</label>
          <input style={inputSt} placeholder="e.g. Anna Nagar" value={form.zone}
            onChange={onChange("zone")} onFocus={fo} onBlur={fb} />
        </div>
        {isEdit && (
          <div>
            <label style={labelSt}>Status</label>
            <select style={{ ...inputSt, cursor: "pointer" }} value={form.status}
              onChange={onChange("status")} onFocus={fo} onBlur={fb}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="on_leave">On Leave</option>
            </select>
          </div>
        )}
      </div>
      <div>
        <label style={labelSt}>Shop Address</label>
        <input style={inputSt} placeholder="e.g. 12 Park St, T. Nagar" value={form.address}
          onChange={onChange("address")} onFocus={fo} onBlur={fb} />
      </div>
    </>
  );
}

// ── Main page ───────────────────────────────────────────────────
export default function VendorManagementPage() {
  const { isMobile } = useWindowSize();

  const [vendors, setVendors]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState("");

  // modal state
  const [modal,    setModal]    = useState(null); // null | 'add' | 'edit' | 'delete'
  const [selected, setSelected] = useState(null);
  const [bagsVendor, setBagsVendor] = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [formErr,  setFormErr]  = useState("");
  const [formOk,   setFormOk]   = useState("");

  const [form, setForm] = useState({
    name: "", phone: "", password: "", zone: "", address: "", status: "active",
  });

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const { data } = await api.get("/admin/vendors");
      setVendors(data.vendors || []);
    } catch {
      setError("Failed to load vendors. Is the server running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setForm({ name: "", phone: "", password: "", zone: "", address: "", status: "active" });
    setFormErr(""); setFormOk("");
    setModal("add");
  }

  function openEdit(v) {
    setSelected(v);
    setForm({ name: v.name || "", phone: v.phone || "", password: "", zone: v.zone || "", address: v.address || "", status: v.status || "active" });
    setFormErr(""); setFormOk("");
    setModal("edit");
  }

  function openDelete(v) {
    setSelected(v);
    setFormErr(""); setFormOk("");
    setModal("delete");
  }

  function closeModal() { setModal(null); setSelected(null); }

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.password)
      return setFormErr("Name, phone and password are required");
    setSaving(true); setFormErr(""); setFormOk("");
    try {
      await api.post("/admin/vendors", form);
      setFormOk("Vendor created! 20 bags assigned automatically.");
      await load();
      setTimeout(closeModal, 1200);
    } catch (err) {
      setFormErr(err.response?.data?.message || "Failed to create vendor");
    } finally { setSaving(false); }
  }

  async function handleEdit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim())
      return setFormErr("Name and phone are required");
    setSaving(true); setFormErr(""); setFormOk("");
    try {
      await api.put(`/admin/vendors/${selected.id}`, {
        name: form.name, phone: form.phone,
        zone: form.zone, address: form.address, status: form.status,
      });
      setFormOk("Vendor updated successfully");
      await load();
      setTimeout(closeModal, 900);
    } catch (err) {
      setFormErr(err.response?.data?.message || "Failed to update vendor");
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    setSaving(true); setFormErr(""); setFormOk("");
    try {
      await api.delete(`/admin/vendors/${selected.id}`);
      setFormOk("Vendor deleted");
      await load();
      setTimeout(closeModal, 900);
    } catch (err) {
      setFormErr(err.response?.data?.message || "Failed to delete vendor");
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
              Vendor Management
            </h1>
            <p style={{ fontSize: 13.5, color: "#9ca3af", margin: "6px 0 0", fontWeight: 400 }}>
              Create, edit, and manage iron shop vendor accounts.
            </p>
          </div>
          <button
            onClick={openAdd}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 20px", borderRadius: 12, border: "none",
              background: "linear-gradient(135deg, #DC2626, #DC2626)",
              color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 4px 14px rgba(220,38,38,0.35)", minHeight: 44,
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = "0.88"}
            onMouseLeave={e => e.currentTarget.style.opacity = "1"}
          >
            <span style={{ fontSize: 20, lineHeight: 1, marginTop: -1 }}>+</span>
            Add Vendor
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
              {loading ? "Loading…" : `${vendors.length} Vendor${vendors.length !== 1 ? "s" : ""} Registered`}
            </span>
            <button onClick={load} style={{
              fontSize: 12, fontWeight: 600, color: "#DC2626",
              border: "none", background: "none", cursor: "pointer",
            }}>↻ Refresh</button>
          </div>

          {loading ? (
            <div style={{ padding: "60px 24px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>
              Loading vendors…
            </div>
          ) : vendors.length === 0 ? (
            <div style={{ padding: "60px 24px", textAlign: "center" }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#374151", margin: "0 0 6px" }}>No vendors yet</p>
              <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Click "Add Vendor" to create the first one.</p>
            </div>
          ) : (
            <div className="si-table-wrap">
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                    {["#", "Name / Address", "Phone", "Zone", "Apartments", "Orders", "Status", "Created", "Actions"].map(h => (
                      <th key={h} style={{
                        padding: "12px 16px", fontSize: 11, fontWeight: 700,
                        color: "#9ca3af", textTransform: "uppercase",
                        letterSpacing: "0.07em", textAlign: "left", whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((v, idx) => (
                    <tr
                      key={v.id}
                      style={{ borderBottom: idx < vendors.length - 1 ? "1px solid #f9fafb" : "none" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "14px 16px", fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>{v.id}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <p style={{ fontSize: 13.5, fontWeight: 700, color: "#111827", margin: 0 }}>{v.name}</p>
                        {v.address && <p style={{ fontSize: 11.5, color: "#9ca3af", margin: "2px 0 0" }}>{v.address}</p>}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 13, color: "#374151", whiteSpace: "nowrap" }}>{v.phone || "—"}</td>
                      <td style={{ padding: "14px 16px", fontSize: 13, color: "#6b7280" }}>{v.zone || "—"}</td>
                      <td style={{ padding: "14px 16px", fontSize: 12, color: "#6b7280", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {v.apartments || <span style={{ color: "#d1d5db" }}>None assigned</span>}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontFamily: "'Outfit', sans-serif", fontSize: 15, fontWeight: 800, color: "#DC2626" }}>
                          {v.total_orders || 0}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}><StatusBadge status={v.status} /></td>
                      <td style={{ padding: "14px 16px", fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap" }}>{fmtDate(v.created_at)}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => setBagsVendor(v)} style={{
                            padding: "5px 12px", borderRadius: 8,
                            border: "1px solid #bfdbfe", background: "#eff6ff",
                            color: "#2563eb", fontSize: 12, fontWeight: 700, cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}>Bags</button>
                          <button onClick={() => openEdit(v)} style={{
                            padding: "5px 12px", borderRadius: 8,
                            border: "1px solid #FEE2E2", background: "#FEF2F2",
                            color: "#DC2626", fontSize: 12, fontWeight: 700, cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}>Edit</button>
                          <button onClick={() => openDelete(v)} style={{
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

      {/* ── Bags Modal ── */}
      {bagsVendor && <BagsModal vendor={bagsVendor} onClose={() => setBagsVendor(null)} />}

      {/* ── Add Modal ── */}
      {modal === "add" && (
        <Modal title="Add New Vendor" onClose={closeModal}>
          <form onSubmit={handleAdd} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <VendorFields form={form} onChange={set} isEdit={false} isMobile={isMobile} />
            <div style={{
              background: "#FEF2F2", border: "1px solid #FECACA",
              borderRadius: 10, padding: "10px 14px", fontSize: 12.5, color: "#B91C1C",
            }}>
              ℹ️ 20 laundry bags will be automatically created for this vendor.
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
                background: saving ? "#e5e7eb" : "linear-gradient(135deg,#DC2626,#DC2626)",
                color: saving ? "#9ca3af" : "#fff",
                fontSize: 13, fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
              }}>{saving ? "Creating…" : "Create Vendor"}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit Modal ── */}
      {modal === "edit" && selected && (
        <Modal title={`Edit — ${selected.name}`} onClose={closeModal}>
          <form onSubmit={handleEdit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <VendorFields form={form} onChange={set} isEdit={true} isMobile={isMobile} />
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
                background: saving ? "#e5e7eb" : "linear-gradient(135deg,#DC2626,#DC2626)",
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
        <Modal title="Delete Vendor" onClose={closeModal} maxWidth={460}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{
              background: "#fef2f2", border: "1px solid #fecaca",
              borderRadius: 12, padding: "16px 18px",
            }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#dc2626", margin: "0 0 8px" }}>
                ⚠️ This cannot be undone
              </p>
              <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.6 }}>
                Delete <strong>{selected.name}</strong>? This will also remove all their bag
                assignments and apartment slot configurations.
                {Number(selected.total_orders) > 0 && (
                  <span style={{ display: "block", marginTop: 6, color: "#dc2626", fontWeight: 600 }}>
                    Warning: this vendor has {selected.total_orders} order(s) on record.
                  </span>
                )}
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
              }}>{saving ? "Deleting…" : "Yes, Delete Vendor"}</button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
