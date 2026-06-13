import { useState, useEffect, useCallback } from "react";
import Layout from "../../components/shared/Layout";
import { useWindowSize } from "../../hooks/useWindowSize";
import api from "../../services/api";

// ── Module-level constants ──────────────────────────────────────────────────

const AVATAR_BG = [
  "linear-gradient(135deg,#f59e0b,#ef4444)",
  "linear-gradient(135deg,#3b82f6,#8b5cf6)",
  "linear-gradient(135deg,#10b981,#06b6d4)",
  "linear-gradient(135deg,#f43f5e,#ec4899)",
  "linear-gradient(135deg,#8b5cf6,#6366f1)",
];

const labelSt = {
  fontSize: 12, fontWeight: 700, color: "#374151",
  display: "block", marginBottom: 6,
};
const inputSt = {
  width: "100%", padding: "10px 14px", borderRadius: 10,
  border: "1.5px solid #e5e7eb", fontSize: 14, color: "#111827",
  outline: "none", boxSizing: "border-box", background: "#fff",
};
const cancelBtn = {
  flex: 1, padding: "11px 0", borderRadius: 10,
  border: "1.5px solid #e5e7eb", background: "#fff",
  color: "#374151", fontSize: 13, fontWeight: 700, cursor: "pointer",
};
const fo = e => { e.target.style.borderColor = "#10b981"; };
const fb = e => { e.target.style.borderColor = "#e5e7eb"; };

const fmtDate = d => d
  ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  : "—";

const EMPTY_FORM = { name: "", mobile_number: "", role_title: "" };

// ── Shared UI components ────────────────────────────────────────────────────

function Alert({ type, msg }) {
  if (!msg) return null;
  const ok = type === "ok";
  return (
    <div style={{
      background: ok ? "#f0fdf4" : "#fef2f2",
      border: `1px solid ${ok ? "#bbf7d0" : "#fecaca"}`,
      borderRadius: 8, padding: "10px 14px",
      color: ok ? "#16a34a" : "#dc2626", fontSize: 13,
    }}>{msg}</div>
  );
}

function Modal({ title, onClose, children, maxWidth = 460 }) {
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
        width: "100%", maxWidth, maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{
          padding: "20px 24px", borderBottom: "1px solid #f3f4f6",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, background: "#fff", zIndex: 1,
        }}>
          <h2 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 18, fontWeight: 800, color: "#111827", margin: 0 }}>
            {title}
          </h2>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: "none",
            background: "#f3f4f6", cursor: "pointer", fontSize: 18, color: "#6b7280",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
      </div>
    </div>
  );
}

// StaffForm MUST live outside StaffPage so React sees a stable component identity.
// If defined inside StaffPage, a new function reference is created on every render,
// causing React to unmount+remount the form on every keystroke → inputs lose focus.
function StaffForm({ onSubmit, form, onFieldChange, mode, onClose, saving, formErr, formOk }) {
  const remaining = 10 - form.mobile_number.length;
  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <label style={labelSt}>Full Name *</label>
        <input
          style={inputSt}
          placeholder="e.g. Ramu"
          value={form.name}
          onChange={e => onFieldChange("name", e.target.value)}
          onFocus={fo} onBlur={fb}
          autoFocus
        />
      </div>
      <div>
        <label style={labelSt}>Mobile Number *</label>
        <input
          style={inputSt}
          placeholder="10-digit mobile number"
          value={form.mobile_number}
          inputMode="numeric"
          maxLength={10}
          onChange={e => onFieldChange("mobile_number", e.target.value.replace(/\D/g, "").slice(0, 10))}
          onFocus={fo} onBlur={fb}
        />
        {form.mobile_number.length > 0 && form.mobile_number.length < 10 && (
          <p style={{ fontSize: 11, color: "#d97706", margin: "4px 0 0", fontWeight: 600 }}>
            {remaining} more digit{remaining !== 1 ? "s" : ""} needed
          </p>
        )}
      </div>
      <div>
        <label style={labelSt}>
          Role / Title{" "}
          <span style={{ color: "#9ca3af", fontWeight: 500 }}>(optional)</span>
        </label>
        <input
          style={inputSt}
          placeholder="e.g. Ironing Staff, Helper"
          value={form.role_title}
          onChange={e => onFieldChange("role_title", e.target.value)}
          onFocus={fo} onBlur={fb}
        />
      </div>
      <Alert type="err" msg={formErr} />
      <Alert type="ok"  msg={formOk}  />
      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
        <button
          type="submit"
          disabled={saving}
          style={{
            flex: 2, padding: "11px 0", borderRadius: 10, border: "none",
            background: saving ? "#e5e7eb" : "linear-gradient(135deg,#10b981,#059669)",
            color: saving ? "#9ca3af" : "#fff",
            fontSize: 13, fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
            width: "100%",
          }}
        >
          {saving ? "Saving…" : mode === "add" ? "Add Staff" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

// ── Main page component ─────────────────────────────────────────────────────

export default function StaffPage() {
  const { isMobile, isTablet } = useWindowSize();

  const [staff,   setStaff]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const [modal,    setModal]    = useState(null);  // null | 'add' | 'edit' | 'delete'
  const [selected, setSelected] = useState(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [formErr,  setFormErr]  = useState("");
  const [formOk,   setFormOk]   = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const { data } = await api.get("/vendor/staff");
      setStaff(data.staff || []);
    } catch { setError("Failed to load staff. Please try again."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function closeModal() { setModal(null); setSelected(null); setFormErr(""); setFormOk(""); }
  const handleFieldChange = (field, value) => setForm(f => ({ ...f, [field]: value }));

  function openAdd() {
    setForm(EMPTY_FORM); setFormErr(""); setFormOk("");
    setModal("add");
  }
  function openEdit(s) {
    setSelected(s);
    setForm({ name: s.name, mobile_number: s.mobile_number, role_title: s.role_title || "" });
    setFormErr(""); setFormOk("");
    setModal("edit");
  }
  function openDelete(s) {
    setSelected(s); setFormErr(""); setFormOk("");
    setModal("delete");
  }

  function validate() {
    if (!form.name.trim())                        return "Full name is required.";
    if (!form.mobile_number)                       return "Mobile number is required.";
    if (!/^\d{10}$/.test(form.mobile_number))     return "Enter a valid 10-digit mobile number.";
    return null;
  }

  async function handleAdd(e) {
    e.preventDefault();
    const err = validate();
    if (err) return setFormErr(err);
    setSaving(true); setFormErr(""); setFormOk("");
    try {
      await api.post("/vendor/staff", form);
      setFormOk("Staff member added successfully.");
      await load();
      setTimeout(closeModal, 900);
    } catch (err) {
      setFormErr(err?.response?.data?.message || "Failed to add staff.");
    } finally { setSaving(false); }
  }

  async function handleEdit(e) {
    e.preventDefault();
    const err = validate();
    if (err) return setFormErr(err);
    setSaving(true); setFormErr(""); setFormOk("");
    try {
      await api.put(`/vendor/staff/${selected.id}`, form);
      setFormOk("Staff member updated successfully.");
      await load();
      setTimeout(closeModal, 900);
    } catch (err) {
      setFormErr(err?.response?.data?.message || "Failed to update.");
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    setSaving(true); setFormErr(""); setFormOk("");
    try {
      await api.delete(`/vendor/staff/${selected.id}`);
      setFormOk("Staff member removed.");
      await load();
      setTimeout(closeModal, 900);
    } catch (err) {
      setFormErr(err?.response?.data?.message || "Failed to delete.");
    } finally { setSaving(false); }
  }

  const totalCount = staff.length;

  return (
    <Layout>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 5px" }}>
              Team Management
            </p>
            <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 28, fontWeight: 800, color: "#111827", margin: 0, lineHeight: 1.15 }}>
              Manage Staff
            </h1>
            <p style={{ fontSize: 13.5, color: "#9ca3af", margin: "6px 0 0" }}>
              Add and manage your ironing shop staff members.
            </p>
          </div>

          <button onClick={openAdd} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 20px", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg,#10b981,#059669)",
            color: "#fff", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 14px rgba(16,185,129,0.3)", minHeight: 44,
          }}>
            <span style={{ fontSize: 19, lineHeight: 1 }}>+</span> Add Staff
          </button>
        </div>

        {/* Summary row */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : isTablet ? "repeat(2, 1fr)" : "repeat(3, 1fr)", gap: 14 }}>
          {[
            { label: "Total Staff",      value: totalCount,                                                                                          color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe" },
            { label: "Added This Month", value: staff.filter(s => new Date(s.created_at).getMonth() === new Date().getMonth()).length, color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" },
            { label: "With Role Title",  value: staff.filter(s => s.role_title).length,                                                              color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
          ].map(item => (
            <div key={item.label} style={{
              background: item.bg, border: `1px solid ${item.border}`,
              borderRadius: 14, padding: "18px 22px",
              display: "flex", alignItems: "center", gap: 16,
            }}>
              <div>
                <p style={{ fontFamily: "'Outfit',sans-serif", fontSize: 28, fontWeight: 800, color: item.color, margin: 0, lineHeight: 1 }}>
                  {item.value}
                </p>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", margin: "4px 0 0" }}>{item.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Staff list */}
        <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e5e7eb", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>

          {loading && (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "#9ca3af" }}>
              <div style={{ width: 28, height: 28, border: "3px solid #e5e7eb", borderTopColor: "#10b981", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 12px" }} />
              Loading staff…
            </div>
          )}

          {!loading && error && (
            <div style={{ padding: "32px 24px", textAlign: "center" }}>
              <Alert type="err" msg={error} />
            </div>
          )}

          {!loading && !error && staff.length === 0 && (
            <div style={{ padding: "56px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>👥</div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#374151", margin: "0 0 6px" }}>No staff added yet</p>
              <p style={{ fontSize: 13, color: "#9ca3af", margin: "0 0 20px" }}>Add your first staff member to get started.</p>
              <button onClick={openAdd} style={{
                padding: "10px 22px", borderRadius: 10, border: "none",
                background: "linear-gradient(135deg,#10b981,#059669)",
                color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>Add First Staff Member</button>
            </div>
          )}

          {!loading && !error && staff.length > 0 && (
            <>
              {/* Desktop table */}
              {!isMobile && (
                <div className="si-table-wrap">
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 540 }}>
                    <thead>
                      <tr style={{ background: "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                        {["Staff Member", "Mobile Number", "Role / Title", "Added On", "Actions"].map(h => (
                          <th key={h} style={{ padding: "12px 18px", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", textAlign: "left", whiteSpace: "nowrap" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {staff.map((s, idx) => (
                        <tr
                          key={s.id}
                          style={{ borderBottom: idx < staff.length - 1 ? "1px solid #f9fafb" : "none" }}
                          onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <td style={{ padding: "14px 18px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <div style={{
                                width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                                background: AVATAR_BG[idx % AVATAR_BG.length],
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 15, fontWeight: 800, color: "#fff",
                              }}>{s.name[0]}</div>
                              <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{s.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: "14px 18px", fontSize: 13.5, color: "#374151", fontFamily: "monospace" }}>
                            {s.mobile_number}
                          </td>
                          <td style={{ padding: "14px 18px" }}>
                            {s.role_title
                              ? <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" }}>{s.role_title}</span>
                              : <span style={{ color: "#d1d5db", fontSize: 12 }}>—</span>}
                          </td>
                          <td style={{ padding: "14px 18px", fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap" }}>
                            {fmtDate(s.created_at)}
                          </td>
                          <td style={{ padding: "14px 18px" }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button onClick={() => openEdit(s)} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #d1fae5", background: "#ecfdf5", color: "#059669", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Edit</button>
                              <button onClick={() => openDelete(s)} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Mobile cards */}
              {isMobile && (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {staff.map((s, idx) => (
                    <div key={s.id} style={{
                      padding: "16px 18px",
                      borderBottom: idx < staff.length - 1 ? "1px solid #f3f4f6" : "none",
                      display: "flex", alignItems: "center", gap: 14,
                    }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                        background: AVATAR_BG[idx % AVATAR_BG.length],
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 18, fontWeight: 800, color: "#fff",
                      }}>{s.name[0]}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 2px" }}>{s.name}</p>
                        <p style={{ fontSize: 12.5, color: "#6b7280", margin: "0 0 6px", fontFamily: "monospace" }}>{s.mobile_number}</p>
                        {s.role_title && (
                          <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" }}>{s.role_title}</span>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <button onClick={() => openEdit(s)} style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid #d1fae5", background: "#ecfdf5", color: "#059669", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Edit</button>
                        <button onClick={() => openDelete(s)} style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {modal === "add" && (
        <Modal title="Add Staff Member" onClose={closeModal}>
          <StaffForm
            onSubmit={handleAdd}
            form={form}
            onFieldChange={handleFieldChange}
            mode="add"
            onClose={closeModal}
            saving={saving}
            formErr={formErr}
            formOk={formOk}
          />
        </Modal>
      )}

      {/* Edit Modal */}
      {modal === "edit" && selected && (
        <Modal title={`Edit — ${selected.name}`} onClose={closeModal}>
          <StaffForm
            onSubmit={handleEdit}
            form={form}
            onFieldChange={handleFieldChange}
            mode="edit"
            onClose={closeModal}
            saving={saving}
            formErr={formErr}
            formOk={formOk}
          />
        </Modal>
      )}

      {/* Delete Modal */}
      {modal === "delete" && selected && (
        <Modal title="Remove Staff Member" onClose={closeModal} maxWidth={420}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "16px 18px" }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#dc2626", margin: "0 0 8px" }}>⚠️ Cannot be undone</p>
              <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.6 }}>
                Remove <strong>{selected.name}</strong>
                {selected.role_title ? ` (${selected.role_title})` : ""} from your staff list?
              </p>
            </div>
            <Alert type="err" msg={formErr} />
            <Alert type="ok"  msg={formOk}  />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={closeModal} style={cancelBtn}>Cancel</button>
              <button onClick={handleDelete} disabled={saving} style={{
                flex: 2, padding: "11px 0", borderRadius: 10, border: "none",
                background: saving ? "#e5e7eb" : "#dc2626",
                color: saving ? "#9ca3af" : "#fff",
                fontSize: 13, fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
              }}>{saving ? "Removing…" : "Remove Staff"}</button>
            </div>
          </div>
        </Modal>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Layout>
  );
}
