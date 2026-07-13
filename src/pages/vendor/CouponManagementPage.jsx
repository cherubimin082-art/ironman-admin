import { useState, useEffect, useCallback } from "react";
import Layout from "../../components/shared/Layout";
import { useWindowSize } from "../../hooks/useWindowSize";
import api from "../../services/api";

// ── Module-level constants ──────────────────────────────────────────────────

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

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function generateCode() {
  let s = "IRN";
  for (let i = 0; i < 5; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

const EMPTY_FORM = { code: "", discount_type: "percent", discount_value: "", valid_from: "", valid_till: "", active: true };

function describeDiscount(c) {
  return c.discount_type === "percent" ? `${c.discount_value}% off` : `₹${c.discount_value} off`;
}
function isExpired(c) {
  if (!c.valid_till) return false;
  return new Date(c.valid_till) < new Date(new Date().toDateString());
}

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

// CouponForm MUST live outside CouponManagementPage so React sees a stable component
// identity. If defined inside the page, a new function reference is created on every
// render, causing React to unmount+remount the form on every keystroke → inputs lose focus.
function CouponForm({ onSubmit, form, onFieldChange, mode, onClose, saving, formErr, formOk }) {
  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <label style={labelSt}>Coupon Code *</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={{ ...inputSt, textTransform: "uppercase" }}
            placeholder="e.g. WELCOME10"
            value={form.code}
            onChange={e => onFieldChange("code", e.target.value.toUpperCase())}
            onFocus={fo} onBlur={fb}
            autoFocus
          />
          <button
            type="button"
            onClick={() => onFieldChange("code", generateCode())}
            style={{ flexShrink: 0, padding: "0 16px", borderRadius: 10, border: "1.5px solid #e5e7eb", background: "#f9fafb", color: "#374151", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
          >Generate</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={labelSt}>Discount Type *</label>
          <select
            style={inputSt}
            value={form.discount_type}
            onChange={e => onFieldChange("discount_type", e.target.value)}
            onFocus={fo} onBlur={fb}
          >
            <option value="percent">Percent (%)</option>
            <option value="flat">Flat (₹)</option>
          </select>
        </div>
        <div>
          <label style={labelSt}>Discount Value *</label>
          <input
            style={inputSt}
            type="number" min="0" step="0.01"
            placeholder={form.discount_type === "percent" ? "e.g. 10" : "e.g. 50"}
            value={form.discount_value}
            onChange={e => onFieldChange("discount_value", e.target.value)}
            onFocus={fo} onBlur={fb}
          />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label style={labelSt}>Valid From <span style={{ color: "#9ca3af", fontWeight: 500 }}>(optional)</span></label>
          <input
            style={inputSt}
            type="date"
            value={form.valid_from}
            onChange={e => onFieldChange("valid_from", e.target.value)}
            onFocus={fo} onBlur={fb}
          />
        </div>
        <div>
          <label style={labelSt}>Valid Till <span style={{ color: "#9ca3af", fontWeight: 500 }}>(optional)</span></label>
          <input
            style={inputSt}
            type="date"
            value={form.valid_till}
            onChange={e => onFieldChange("valid_till", e.target.value)}
            onFocus={fo} onBlur={fb}
          />
        </div>
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={form.active}
          onChange={e => onFieldChange("active", e.target.checked)}
          style={{ width: 16, height: 16, cursor: "pointer" }}
        />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Active — customers can use this coupon</span>
      </label>

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
          {saving ? "Saving…" : mode === "add" ? "Add Coupon" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

// ── Main page component ─────────────────────────────────────────────────────

export default function CouponManagementPage() {
  const { isMobile } = useWindowSize();

  const [coupons, setCoupons] = useState([]);
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
      const { data } = await api.get("/vendor/coupons");
      setCoupons(data.coupons || []);
    } catch { setError("Failed to load coupons. Please try again."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  function closeModal() { setModal(null); setSelected(null); setFormErr(""); setFormOk(""); }
  const handleFieldChange = (field, value) => setForm(f => ({ ...f, [field]: value }));

  function openAdd() {
    setForm(EMPTY_FORM); setFormErr(""); setFormOk("");
    setModal("add");
  }
  function openEdit(c) {
    setSelected(c);
    setForm({
      code: c.code, discount_type: c.discount_type, discount_value: String(c.discount_value),
      valid_from: c.valid_from ? c.valid_from.slice(0, 10) : "",
      valid_till: c.valid_till ? c.valid_till.slice(0, 10) : "",
      active: !!c.active,
    });
    setFormErr(""); setFormOk("");
    setModal("edit");
  }
  function openDelete(c) {
    setSelected(c); setFormErr(""); setFormOk("");
    setModal("delete");
  }

  function validate() {
    if (!form.code.trim())                          return "Coupon code is required.";
    const value = parseFloat(form.discount_value);
    if (isNaN(value) || value <= 0)                  return "Enter a valid discount value.";
    if (form.discount_type === "percent" && value > 100) return "Percent discount can't exceed 100.";
    if (form.valid_from && form.valid_till && form.valid_from > form.valid_till)
      return "Valid From date must be before Valid Till date.";
    return null;
  }

  async function handleAdd(e) {
    e.preventDefault();
    const err = validate();
    if (err) return setFormErr(err);
    setSaving(true); setFormErr(""); setFormOk("");
    try {
      await api.post("/vendor/coupons", form);
      setFormOk("Coupon added successfully.");
      await load();
      setTimeout(closeModal, 900);
    } catch (err) {
      setFormErr(err?.response?.data?.message || "Failed to add coupon.");
    } finally { setSaving(false); }
  }

  async function handleEdit(e) {
    e.preventDefault();
    const err = validate();
    if (err) return setFormErr(err);
    setSaving(true); setFormErr(""); setFormOk("");
    try {
      await api.put(`/vendor/coupons/${selected.id}`, form);
      setFormOk("Coupon updated successfully.");
      await load();
      setTimeout(closeModal, 900);
    } catch (err) {
      setFormErr(err?.response?.data?.message || "Failed to update.");
    } finally { setSaving(false); }
  }

  async function handleDelete() {
    setSaving(true); setFormErr(""); setFormOk("");
    try {
      await api.delete(`/vendor/coupons/${selected.id}`);
      setFormOk("Coupon deleted.");
      await load();
      setTimeout(closeModal, 900);
    } catch (err) {
      setFormErr(err?.response?.data?.message || "Failed to delete.");
    } finally { setSaving(false); }
  }

  const totalCount  = coupons.length;
  const activeCount = coupons.filter(c => c.active && !isExpired(c)).length;

  return (
    <Layout>
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 5px" }}>
              Offers
            </p>
            <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 28, fontWeight: 800, color: "#111827", margin: 0, lineHeight: 1.15 }}>
              Manage Coupons
            </h1>
            <p style={{ fontSize: 13.5, color: "#9ca3af", margin: "6px 0 0" }}>
              Create discount codes customers can apply at checkout.
            </p>
          </div>

          <button onClick={openAdd} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 20px", borderRadius: 12, border: "none",
            background: "linear-gradient(135deg,#10b981,#059669)",
            color: "#fff", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 14px rgba(16,185,129,0.3)", minHeight: 44,
          }}>
            <span style={{ fontSize: 19, lineHeight: 1 }}>+</span> Add Coupon
          </button>
        </div>

        {/* Summary row */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(2, 1fr)", gap: 14 }}>
          {[
            { label: "Total Coupons",  value: totalCount,  color: "#B91C1C", bg: "#FEF2F2", border: "#FECACA" },
            { label: "Active Coupons", value: activeCount, color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
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

        {/* Coupon list */}
        <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e5e7eb", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>

          {loading && (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "#9ca3af" }}>
              <div style={{ width: 28, height: 28, border: "3px solid #e5e7eb", borderTopColor: "#10b981", borderRadius: "50%", animation: "spin 0.7s linear infinite", margin: "0 auto 12px" }} />
              Loading coupons…
            </div>
          )}

          {!loading && error && (
            <div style={{ padding: "32px 24px", textAlign: "center" }}>
              <Alert type="err" msg={error} />
            </div>
          )}

          {!loading && !error && coupons.length === 0 && (
            <div style={{ padding: "56px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>🏷️</div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#374151", margin: "0 0 6px" }}>No coupons created yet</p>
              <p style={{ fontSize: 13, color: "#9ca3af", margin: "0 0 20px" }}>Create your first coupon to offer discounts to customers.</p>
              <button onClick={openAdd} style={{
                padding: "10px 22px", borderRadius: 10, border: "none",
                background: "linear-gradient(135deg,#10b981,#059669)",
                color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}>Add First Coupon</button>
            </div>
          )}

          {!loading && !error && coupons.length > 0 && (
            <>
              {/* Desktop table */}
              {!isMobile && (
                <div className="si-table-wrap">
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                    <thead>
                      <tr style={{ background: "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                        {["Code", "Discount", "Valid Period", "Status", "Actions"].map(h => (
                          <th key={h} style={{ padding: "12px 18px", fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.07em", textAlign: "left", whiteSpace: "nowrap" }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {coupons.map((c, idx) => {
                        const expired = isExpired(c);
                        return (
                          <tr
                            key={c.id}
                            style={{ borderBottom: idx < coupons.length - 1 ? "1px solid #f9fafb" : "none" }}
                            onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                          >
                            <td style={{ padding: "14px 18px", fontSize: 14, fontWeight: 700, color: "#111827", fontFamily: "monospace" }}>
                              {c.code}
                            </td>
                            <td style={{ padding: "14px 18px", fontSize: 13.5, color: "#374151" }}>
                              {describeDiscount(c)}
                            </td>
                            <td style={{ padding: "14px 18px", fontSize: 12.5, color: "#6b7280", whiteSpace: "nowrap" }}>
                              {c.valid_from || c.valid_till
                                ? `${fmtDate(c.valid_from)} – ${fmtDate(c.valid_till)}`
                                : <span style={{ color: "#d1d5db" }}>No expiry</span>}
                            </td>
                            <td style={{ padding: "14px 18px" }}>
                              {expired
                                ? <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "#f3f4f6", color: "#6b7280" }}>Expired</span>
                                : c.active
                                  ? <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" }}>Active</span>
                                  : <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>Inactive</span>}
                            </td>
                            <td style={{ padding: "14px 18px" }}>
                              <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={() => openEdit(c)} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #d1fae5", background: "#ecfdf5", color: "#059669", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Edit</button>
                                <button onClick={() => openDelete(c)} style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Delete</button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Mobile cards */}
              {isMobile && (
                <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  {coupons.map((c, idx) => {
                    const expired = isExpired(c);
                    return (
                      <div key={c.id} style={{
                        padding: "16px 18px",
                        borderBottom: idx < coupons.length - 1 ? "1px solid #f3f4f6" : "none",
                        display: "flex", alignItems: "center", gap: 14,
                      }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 2px", fontFamily: "monospace" }}>{c.code}</p>
                          <p style={{ fontSize: 12.5, color: "#6b7280", margin: "0 0 6px" }}>{describeDiscount(c)}</p>
                          {expired
                            ? <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#f3f4f6", color: "#6b7280" }}>Expired</span>
                            : c.active
                              ? <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0" }}>Active</span>
                              : <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>Inactive</span>}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          <button onClick={() => openEdit(c)} style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid #d1fae5", background: "#ecfdf5", color: "#059669", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Edit</button>
                          <button onClick={() => openDelete(c)} style={{ padding: "5px 10px", borderRadius: 8, border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Delete</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {modal === "add" && (
        <Modal title="Add Coupon" onClose={closeModal}>
          <CouponForm
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
        <Modal title={`Edit — ${selected.code}`} onClose={closeModal}>
          <CouponForm
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
        <Modal title="Delete Coupon" onClose={closeModal} maxWidth={420}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "16px 18px" }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#dc2626", margin: "0 0 8px" }}>⚠️ Cannot be undone</p>
              <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.6 }}>
                Delete coupon <strong>{selected.code}</strong>? Customers won't be able to use it anymore.
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
              }}>{saving ? "Deleting…" : "Delete Coupon"}</button>
            </div>
          </div>
        </Modal>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Layout>
  );
}
