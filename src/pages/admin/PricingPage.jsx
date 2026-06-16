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

// ── Modal ───────────────────────────────────────────────────────
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
            background: "#f3f4f6", cursor: "pointer", fontSize: 18,
            color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center",
          }}>×</button>
        </div>
        <div style={{ padding: 24 }}>{children}</div>
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
      color: ok ? "#16a34a" : "#dc2626", fontSize: 13,
    }}>{msg}</div>
  );
}

const fmtDate = d => d
  ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  : "—";

// ── Tab button ──────────────────────────────────────────────────
function Tab({ label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "9px 20px", borderRadius: 10, border: "none", cursor: "pointer",
        background: active ? "linear-gradient(135deg,#DC2626,#DC2626)" : "#f3f4f6",
        color: active ? "#fff" : "#6b7280",
        fontSize: 13, fontWeight: 700, transition: "all 0.15s",
        display: "flex", alignItems: "center", gap: 8,
      }}
    >
      {label}
      {count !== undefined && (
        <span style={{
          fontSize: 11, fontWeight: 800,
          background: active ? "rgba(255,255,255,0.25)" : "#e5e7eb",
          color: active ? "#fff" : "#6b7280",
          borderRadius: 99, padding: "1px 7px",
        }}>{count}</span>
      )}
    </button>
  );
}

// ── Image picker (module-level so it isn't remounted on each keystroke) ──
function ImageField({ value, onChange }) {
  const [imgTab, setImgTab] = useState("url");
  const [uploading, setUploading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const { data } = await api.post("/admin/upload-image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onChange(data.url);
    } catch {
      alert("Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label style={labelSt}>
        Image <span style={{ fontWeight: 400, color: "#9ca3af" }}>(optional)</span>
      </label>
      <div style={{ display: "flex", gap: 0, marginBottom: 10, border: "1.5px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
        {["url", "upload"].map(t => (
          <button key={t} type="button" onClick={() => setImgTab(t)} style={{
            flex: 1, padding: "8px 0", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
            background: imgTab === t ? "#DC2626" : "#fff",
            color: imgTab === t ? "#fff" : "#6b7280",
            transition: "all 0.15s",
          }}>
            {t === "url" ? "🔗 URL" : "📁 Upload File"}
          </button>
        ))}
      </div>
      {imgTab === "url" ? (
        <input style={inputSt} placeholder="https://..." value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={fo} onBlur={fb} />
      ) : (
        <label style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 6, padding: "20px 14px", borderRadius: 10, cursor: uploading ? "wait" : "pointer",
          border: "1.5px dashed #d1d5db", background: "#fafafa", fontSize: 13, color: "#6b7280",
        }}>
          {uploading ? "Uploading…" : "Click to choose image (max 5 MB)"}
          <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} disabled={uploading} />
        </label>
      )}
      {value && (
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
          <img src={value} alt="preview"
            style={{ width: 44, height: 44, objectFit: "contain", borderRadius: 9, background: "#f3f4f6", padding: 4 }}
            onError={e => { e.target.style.display = "none"; }} />
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#374151", margin: 0 }}>Preview</p>
            <p style={{ fontSize: 11, color: "#9ca3af", margin: 0, wordBreak: "break-all", maxWidth: 260 }}>{value.split("/").pop()}</p>
          </div>
          <button type="button" onClick={() => onChange("")}
            style={{ marginLeft: "auto", fontSize: 18, background: "none", border: "none", cursor: "pointer", color: "#9ca3af" }}>×</button>
        </div>
      )}
    </div>
  );
}

// ── Garment form fields (module-level so React doesn't remount on each keystroke) ──
function GarmentFields({ gmtForm, setGmtForm, categories }) {
  const setG = k => e => setGmtForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <>
      <div>
        <label style={labelSt}>Category *</label>
        <select style={{ ...inputSt, cursor: "pointer" }} value={gmtForm.category_id}
          onChange={setG("category_id")} onFocus={fo} onBlur={fb}>
          <option value="">— Select category —</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={labelSt}>Garment Name *</label>
        <input style={inputSt} placeholder="e.g. Shirt / T-Shirt" value={gmtForm.name}
          onChange={setG("name")} onFocus={fo} onBlur={fb} />
      </div>
      <div>
        <label style={labelSt}>Price (₹) *</label>
        <input type="number" min="0" step="0.01" style={inputSt}
          placeholder="e.g. 25" value={gmtForm.price}
          onChange={setG("price")} onFocus={fo} onBlur={fb} />
      </div>
      <ImageField
        value={gmtForm.image_url}
        onChange={url => setGmtForm(f => ({ ...f, image_url: url }))}
      />
    </>
  );
}

// ── Main page ───────────────────────────────────────────────────
export default function PricingPage() {
  const { isMobile } = useWindowSize();

  const [activeTab,  setActiveTab]  = useState("categories");
  const [categories, setCategories] = useState([]);
  const [garments,   setGarments]   = useState([]);
  const [filterCat,  setFilterCat]  = useState("");   // category_id filter for garments
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");

  // Modal state
  const [modal,    setModal]    = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [formErr,  setFormErr]  = useState("");
  const [formOk,   setFormOk]   = useState("");

  // Forms
  const [catForm, setCatForm] = useState({ name: "" });
  const [gmtForm, setGmtForm] = useState({ category_id: "", name: "", price: "", image_url: "" });

  // ── Loaders ──────────────────────────────────────────────────
  const loadCategories = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const { data } = await api.get("/admin/categories");
      setCategories(data.categories || []);
    } catch { setError("Failed to load categories"); }
    finally { setLoading(false); }
  }, []);

  const loadGarments = useCallback(async (catId) => {
    setLoading(true); setError("");
    try {
      const url = catId ? `/admin/garments?category_id=${catId}` : "/admin/garments";
      const { data } = await api.get(url);
      setGarments(data.garments || []);
    } catch { setError("Failed to load garments"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  useEffect(() => {
    if (activeTab === "garments") loadGarments(filterCat);
  }, [activeTab, filterCat, loadGarments]);

  function closeModal() { setModal(null); setSelected(null); }
  const setC = k => e => setCatForm(f => ({ ...f, [k]: e.target.value }));

  // ── Category handlers ────────────────────────────────────────
  function openAddCat() {
    setCatForm({ name: "" });
    setFormErr(""); setFormOk("");
    setModal("addCat");
  }
  function openEditCat(cat) {
    setSelected(cat);
    setCatForm({ name: cat.name });
    setFormErr(""); setFormOk("");
    setModal("editCat");
  }
  function openDelCat(cat) {
    setSelected(cat);
    setFormErr(""); setFormOk("");
    setModal("delCat");
  }

  async function handleAddCat(e) {
    e.preventDefault();
    if (!catForm.name.trim()) return setFormErr("Category name is required");
    setSaving(true); setFormErr(""); setFormOk("");
    try {
      await api.post("/admin/categories", { name: catForm.name });
      setFormOk("Category created");
      await loadCategories();
      setTimeout(closeModal, 900);
    } catch (err) {
      setFormErr(err.response?.data?.message || "Failed to create category");
    } finally { setSaving(false); }
  }

  async function handleEditCat(e) {
    e.preventDefault();
    if (!catForm.name.trim()) return setFormErr("Category name is required");
    setSaving(true); setFormErr(""); setFormOk("");
    try {
      await api.put(`/admin/categories/${selected.id}`, { name: catForm.name });
      setFormOk("Category updated");
      await loadCategories();
      setTimeout(closeModal, 900);
    } catch (err) {
      setFormErr(err.response?.data?.message || "Failed to update");
    } finally { setSaving(false); }
  }

  async function handleDelCat() {
    setSaving(true); setFormErr(""); setFormOk("");
    try {
      await api.delete(`/admin/categories/${selected.id}`);
      setFormOk("Category deleted");
      await loadCategories();
      setTimeout(closeModal, 900);
    } catch (err) {
      setFormErr(err.response?.data?.message || "Failed to delete");
    } finally { setSaving(false); }
  }

  // ── Garment handlers ─────────────────────────────────────────
  function openAddGmt() {
    setGmtForm({ category_id: categories[0]?.id ?? "", name: "", price: "", image_url: "" });
    setFormErr(""); setFormOk("");
    setModal("addGmt");
  }
  function openEditGmt(g) {
    setSelected(g);
    setGmtForm({ category_id: g.category_id ?? "", name: g.name, price: String(g.price), image_url: g.image_url || "" });
    setFormErr(""); setFormOk("");
    setModal("editGmt");
  }
  function openDelGmt(g) {
    setSelected(g);
    setFormErr(""); setFormOk("");
    setModal("delGmt");
  }

  async function handleAddGmt(e) {
    e.preventDefault();
    if (!gmtForm.category_id || !gmtForm.name.trim() || gmtForm.price === "")
      return setFormErr("Category, name and price are all required");
    setSaving(true); setFormErr(""); setFormOk("");
    try {
      await api.post("/admin/garments", {
        category_id: Number(gmtForm.category_id),
        name: gmtForm.name,
        price: gmtForm.price,
        image_url: gmtForm.image_url || null,
      });
      setFormOk("Garment added");
      await loadGarments(filterCat);
      setTimeout(closeModal, 900);
    } catch (err) {
      setFormErr(err.response?.data?.message || "Failed to add garment");
    } finally { setSaving(false); }
  }

  async function handleEditGmt(e) {
    e.preventDefault();
    if (!gmtForm.category_id || !gmtForm.name.trim() || gmtForm.price === "")
      return setFormErr("Category, name and price are all required");
    setSaving(true); setFormErr(""); setFormOk("");
    try {
      await api.put(`/admin/garments/${selected.id}`, {
        category_id: Number(gmtForm.category_id),
        name: gmtForm.name,
        price: gmtForm.price,
        image_url: gmtForm.image_url || null,
      });
      setFormOk("Garment updated");
      await loadGarments(filterCat);
      setTimeout(closeModal, 900);
    } catch (err) {
      setFormErr(err.response?.data?.message || "Failed to update");
    } finally { setSaving(false); }
  }

  async function handleDelGmt() {
    setSaving(true); setFormErr(""); setFormOk("");
    try {
      await api.delete(`/admin/garments/${selected.id}`);
      setFormOk("Garment deleted");
      await loadGarments(filterCat);
      setTimeout(closeModal, 900);
    } catch (err) {
      setFormErr(err.response?.data?.message || "Failed to delete");
    } finally { setSaving(false); }
  }

  const primaryBtn = (_label, loading2) => ({
    flex: 2, padding: "11px 0", borderRadius: 10, border: "none",
    background: loading2 ? "#e5e7eb" : "linear-gradient(135deg,#DC2626,#DC2626)",
    color: loading2 ? "#9ca3af" : "#fff",
    fontSize: 13, fontWeight: 700,
    cursor: loading2 ? "not-allowed" : "pointer",
    display: "block", width: "100%",
  });
  const cancelBtn = {
    flex: 1, padding: "11px 0", borderRadius: 10,
    border: "1.5px solid #e5e7eb", background: "#fff",
    color: "#374151", fontSize: 13, fontWeight: 700, cursor: "pointer",
  };

  return (
    <Layout>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

        {/* Header */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#DC2626", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 5px" }}>
            Admin
          </p>
          <h1 style={{ fontFamily: "'Outfit',sans-serif", fontSize: 28, fontWeight: 800, color: "#111827", margin: 0, lineHeight: 1.15 }}>
            Pricing Management
          </h1>
          <p style={{ fontSize: 13.5, color: "#9ca3af", margin: "6px 0 0", fontWeight: 400 }}>
            Manage garment categories and set prices for each item.
          </p>
        </div>

        {error && <Alert type="err" msg={error} />}

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Tab label="Categories" count={categories.length}
            active={activeTab === "categories"} onClick={() => setActiveTab("categories")} />
          <Tab label="Garments" count={garments.length}
            active={activeTab === "garments"}
            onClick={() => { setActiveTab("garments"); if (categories.length === 0) loadCategories(); }} />
        </div>

        {/* ── CATEGORIES TAB ── */}
        {activeTab === "categories" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button onClick={openAddCat} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "9px 18px", borderRadius: 11, border: "none",
                background: "linear-gradient(135deg,#DC2626,#DC2626)",
                color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 4px 14px rgba(220,38,38,0.3)", minHeight: 40,
              }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add Category
              </button>
            </div>

            <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e5e7eb", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
              {loading ? (
                <div style={{ padding: "48px 24px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>Loading…</div>
              ) : categories.length === 0 ? (
                <div style={{ padding: "48px 24px", textAlign: "center" }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#374151", margin: "0 0 6px" }}>No categories yet</p>
                  <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>Click "Add Category" to create the first one.</p>
                </div>
              ) : (
                <div className="si-table-wrap">
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 400 }}>
                    <thead>
                      <tr style={{ background: "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                        {["#", "Category Name", "Garments", "Created", "Actions"].map(h => (
                          <th key={h} style={{
                            padding: "12px 16px", fontSize: 11, fontWeight: 700,
                            color: "#9ca3af", textTransform: "uppercase",
                            letterSpacing: "0.07em", textAlign: "left", whiteSpace: "nowrap",
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((cat, idx) => (
                        <tr key={cat.id}
                          style={{ borderBottom: idx < categories.length - 1 ? "1px solid #f9fafb" : "none" }}
                          onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <td style={{ padding: "14px 16px", fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>{cat.id}</td>
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{
                                width: 32, height: 32, borderRadius: 9,
                                background: "linear-gradient(135deg,#DC2626,#DC2626)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 13, fontWeight: 800, color: "#fff",
                              }}>
                                {cat.name?.[0]}
                              </div>
                              <span style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{cat.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <button
                              onClick={() => { setActiveTab("garments"); setFilterCat(String(cat.id)); }}
                              style={{
                                fontFamily: "'Outfit',sans-serif", fontSize: 15, fontWeight: 800,
                                color: "#DC2626", background: "none", border: "none", cursor: "pointer",
                                padding: 0,
                              }}
                            >
                              {cat.garment_count || 0}
                            </button>
                          </td>
                          <td style={{ padding: "14px 16px", fontSize: 12, color: "#9ca3af", whiteSpace: "nowrap" }}>{fmtDate(cat.created_at)}</td>
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button onClick={() => openEditCat(cat)} style={{
                                padding: "5px 12px", borderRadius: 8,
                                border: "1px solid #FEE2E2", background: "#FEF2F2",
                                color: "#DC2626", fontSize: 12, fontWeight: 700, cursor: "pointer",
                              }}>Edit</button>
                              <button onClick={() => openDelCat(cat)} style={{
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
        )}

        {/* ── GARMENTS TAB ── */}
        {activeTab === "garments" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              {/* Category filter */}
              <select
                value={filterCat}
                onChange={e => setFilterCat(e.target.value)}
                style={{
                  padding: "9px 14px", borderRadius: 10,
                  border: "1.5px solid #e5e7eb", fontSize: 13, fontWeight: 600,
                  color: "#374151", background: "#fff", cursor: "pointer",
                  outline: "none", minWidth: isMobile ? "100%" : 200,
                }}
              >
                <option value="">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>

              <button onClick={openAddGmt} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "9px 18px", borderRadius: 11, border: "none",
                background: "linear-gradient(135deg,#DC2626,#DC2626)",
                color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 4px 14px rgba(220,38,38,0.3)", minHeight: 40,
              }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add Garment
              </button>
            </div>

            <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #e5e7eb", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}>
              {loading ? (
                <div style={{ padding: "48px 24px", textAlign: "center", color: "#9ca3af", fontSize: 14 }}>Loading…</div>
              ) : garments.length === 0 ? (
                <div style={{ padding: "48px 24px", textAlign: "center" }}>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#374151", margin: "0 0 6px" }}>No garments found</p>
                  <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
                    {filterCat ? "Try clearing the category filter." : "Click \"Add Garment\" to create the first one."}
                  </p>
                </div>
              ) : (
                <div className="si-table-wrap">
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 450 }}>
                    <thead>
                      <tr style={{ background: "#f9fafb", borderBottom: "1px solid #f3f4f6" }}>
                        {["#", "Garment Name", "Category", "Price", "Actions"].map(h => (
                          <th key={h} style={{
                            padding: "12px 16px", fontSize: 11, fontWeight: 700,
                            color: "#9ca3af", textTransform: "uppercase",
                            letterSpacing: "0.07em", textAlign: "left", whiteSpace: "nowrap",
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {garments.map((g, idx) => (
                        <tr key={g.id}
                          style={{ borderBottom: idx < garments.length - 1 ? "1px solid #f9fafb" : "none" }}
                          onMouseEnter={e => e.currentTarget.style.background = "#fafafa"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                          <td style={{ padding: "14px 16px", fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>{g.id}</td>
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div style={{ width: 36, height: 36, borderRadius: 9, background: "#f3f4f6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                {g.image_url
                                  ? <img src={g.image_url} alt={g.name} style={{ width: 24, height: 24, objectFit: "contain" }} />
                                  : <span style={{ fontSize: 18 }}>{g.icon || "👗"}</span>}
                              </div>
                              <span style={{ fontSize: 13.5, fontWeight: 700, color: "#111827" }}>{g.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            {g.category_name ? (
                              <span style={{
                                fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                                background: "#FEF2F2", color: "#B91C1C", border: "1px solid #FECACA",
                              }}>{g.category_name}</span>
                            ) : <span style={{ color: "#d1d5db", fontSize: 12 }}>—</span>}
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <span style={{
                              fontFamily: "'Outfit',sans-serif", fontSize: 16, fontWeight: 800, color: "#111827",
                            }}>₹{parseFloat(g.price).toFixed(0)}</span>
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ display: "flex", gap: 6 }}>
                              <button onClick={() => openEditGmt(g)} style={{
                                padding: "5px 12px", borderRadius: 8,
                                border: "1px solid #FEE2E2", background: "#FEF2F2",
                                color: "#DC2626", fontSize: 12, fontWeight: 700, cursor: "pointer",
                              }}>Edit</button>
                              <button onClick={() => openDelGmt(g)} style={{
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
        )}
      </div>

      {/* ── Add Category Modal ── */}
      {modal === "addCat" && (
        <Modal title="Add Category" onClose={closeModal}>
          <form onSubmit={handleAddCat} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelSt}>Category Name *</label>
              <input style={inputSt} placeholder="e.g. Men's Wear" value={catForm.name}
                onChange={setC("name")} onFocus={fo} onBlur={fb} autoFocus />
            </div>
            <Alert type="err" msg={formErr} />
            <Alert type="ok"  msg={formOk}  />
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={closeModal} style={cancelBtn}>Cancel</button>
              <button type="submit" disabled={saving} style={primaryBtn(saving ? "Loading…" : "Create", saving)}>
                {saving ? "Creating…" : "Create Category"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit Category Modal ── */}
      {modal === "editCat" && selected && (
        <Modal title={`Edit — ${selected.name}`} onClose={closeModal}>
          <form onSubmit={handleEditCat} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelSt}>Category Name *</label>
              <input style={inputSt} value={catForm.name}
                onChange={setC("name")} onFocus={fo} onBlur={fb} autoFocus />
            </div>
            <Alert type="err" msg={formErr} />
            <Alert type="ok"  msg={formOk}  />
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={closeModal} style={cancelBtn}>Cancel</button>
              <button type="submit" disabled={saving} style={primaryBtn(saving, saving)}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete Category Modal ── */}
      {modal === "delCat" && selected && (
        <Modal title="Delete Category" onClose={closeModal} maxWidth={420}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "16px 18px" }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#dc2626", margin: "0 0 8px" }}>⚠️ Cannot be undone</p>
              <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.6 }}>
                Delete category <strong>{selected.name}</strong>?
                {Number(selected.garment_count) > 0 && (
                  <span style={{ display: "block", marginTop: 6, fontWeight: 700, color: "#dc2626" }}>
                    This category has {selected.garment_count} garment(s). Delete them first.
                  </span>
                )}
              </p>
            </div>
            <Alert type="err" msg={formErr} />
            <Alert type="ok"  msg={formOk}  />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={closeModal} style={cancelBtn}>Cancel</button>
              <button onClick={handleDelCat} disabled={saving || Number(selected.garment_count) > 0} style={{
                flex: 2, padding: "11px 0", borderRadius: 10, border: "none",
                background: saving || Number(selected.garment_count) > 0 ? "#e5e7eb" : "#dc2626",
                color: saving || Number(selected.garment_count) > 0 ? "#9ca3af" : "#fff",
                fontSize: 13, fontWeight: 700,
                cursor: saving || Number(selected.garment_count) > 0 ? "not-allowed" : "pointer",
              }}>{saving ? "Deleting…" : "Delete Category"}</button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Add Garment Modal ── */}
      {modal === "addGmt" && (
        <Modal title="Add Garment" onClose={closeModal}>
          <form onSubmit={handleAddGmt} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <GarmentFields gmtForm={gmtForm} setGmtForm={setGmtForm} categories={categories} />
            <Alert type="err" msg={formErr} />
            <Alert type="ok"  msg={formOk}  />
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={closeModal} style={cancelBtn}>Cancel</button>
              <button type="submit" disabled={saving} style={primaryBtn(saving, saving)}>
                {saving ? "Adding…" : "Add Garment"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit Garment Modal ── */}
      {modal === "editGmt" && selected && (
        <Modal title={`Edit — ${selected.name}`} onClose={closeModal}>
          <form onSubmit={handleEditGmt} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <GarmentFields gmtForm={gmtForm} setGmtForm={setGmtForm} categories={categories} />
            <Alert type="err" msg={formErr} />
            <Alert type="ok"  msg={formOk}  />
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={closeModal} style={cancelBtn}>Cancel</button>
              <button type="submit" disabled={saving} style={primaryBtn(saving, saving)}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete Garment Modal ── */}
      {modal === "delGmt" && selected && (
        <Modal title="Delete Garment" onClose={closeModal} maxWidth={420}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "16px 18px" }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#dc2626", margin: "0 0 8px" }}>⚠️ Cannot be undone</p>
              <p style={{ fontSize: 13, color: "#374151", margin: 0, lineHeight: 1.6 }}>
                Delete <strong>{selected.name}</strong>?
                If this garment appears in existing orders, deletion will be blocked — consider leaving it as-is.
              </p>
            </div>
            <Alert type="err" msg={formErr} />
            <Alert type="ok"  msg={formOk}  />
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={closeModal} style={cancelBtn}>Cancel</button>
              <button onClick={handleDelGmt} disabled={saving} style={{
                flex: 2, padding: "11px 0", borderRadius: 10, border: "none",
                background: saving ? "#e5e7eb" : "#dc2626",
                color: saving ? "#9ca3af" : "#fff",
                fontSize: 13, fontWeight: 700,
                cursor: saving ? "not-allowed" : "pointer",
              }}>{saving ? "Deleting…" : "Delete Garment"}</button>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
