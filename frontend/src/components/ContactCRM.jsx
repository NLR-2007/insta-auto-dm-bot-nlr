import React, { useState, useEffect } from "react";
import { apiFetch } from "../api";
import {
  Users, Plus, Search, Edit2, Trash2, Tag, Upload,
  Loader2, X, Save, Filter
} from "lucide-react";

const STATUS_COLORS = {
  lead: "var(--info)",
  active: "var(--success)",
  inactive: "var(--text-muted)",
  blocked: "var(--danger)",
  converted: "#8b5cf6",
};

export default function ContactCRM() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPlatform, setFilterPlatform] = useState("");
  const [form, setForm] = useState({ username: "", platform: "instagram", display_name: "", tags: "", notes: "", status: "lead" });
  const [importing, setImporting] = useState(false);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      let url = "/api/contacts";
      const params = [];
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      if (filterStatus) params.push(`status=${filterStatus}`);
      if (filterPlatform) params.push(`platform=${filterPlatform}`);
      if (params.length) url += "?" + params.join("&");
      const data = await apiFetch(url);
      setContacts(data);
    } catch (e) {
      console.error("Failed to load contacts:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchContacts(); }, [filterStatus, filterPlatform]);

  useEffect(() => {
    const t = setTimeout(fetchContacts, 400);
    return () => clearTimeout(t);
  }, [search]);

  const resetForm = () => {
    setForm({ username: "", platform: "instagram", display_name: "", tags: "", notes: "", status: "lead" });
    setEditing(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await apiFetch(`/api/contacts/${editing}`, { method: "PATCH", body: JSON.stringify({ display_name: form.display_name, tags: form.tags, notes: form.notes, status: form.status }) });
      } else {
        await apiFetch("/api/contacts", { method: "POST", body: JSON.stringify(form) });
      }
      resetForm();
      fetchContacts();
    } catch (e) {
      alert(e.message || "Failed to save contact");
    }
  };

  const handleEdit = (c) => {
    setForm({ username: c.username, platform: c.platform, display_name: c.display_name || "", tags: c.tags || "", notes: c.notes || "", status: c.status });
    setEditing(c.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this contact?")) return;
    try {
      await apiFetch(`/api/contacts/${id}`, { method: "DELETE" });
      setContacts(contacts.filter(c => c.id !== id));
    } catch (e) {
      alert(e.message || "Delete failed");
    }
  };

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter(l => l.trim());
      const contacts = lines.slice(1).map(line => {
        const [username, platform, display_name, tags, notes, status] = line.split(",").map(s => s.trim());
        return { username, platform: platform || "instagram", display_name, tags, notes, status: status || "lead" };
      }).filter(c => c.username);
      const result = await apiFetch("/api/contacts/import", { method: "POST", body: JSON.stringify(contacts) });
      alert(`Imported ${result.imported} contacts, ${result.skipped} skipped (duplicates)`);
      fetchContacts();
    } catch (err) {
      alert(err.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Toolbar */}
      <div className="glass-card" style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              className="form-input"
              placeholder="Search contacts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: "32px", minWidth: "200px" }}
            />
          </div>
          <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ minWidth: "110px" }}>
            <option value="">All Statuses</option>
            <option value="lead">Lead</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="blocked">Blocked</option>
            <option value="converted">Converted</option>
          </select>
          <select className="form-select" value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)} style={{ minWidth: "110px" }}>
            <option value="">All Platforms</option>
            <option value="instagram">Instagram</option>
            <option value="telegram">Telegram</option>
          </select>
          <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>{contacts.length} contacts</span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <label className="btn btn-secondary" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Import CSV
            <input type="file" accept=".csv" hidden onChange={handleImportCSV} />
          </label>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={14} /> Add Contact
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="glass-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600" }}>{editing ? "Edit Contact" : "New Contact"}</h3>
            <button className="btn btn-secondary" style={{ padding: "4px" }} onClick={resetForm}><X size={16} /></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input className="form-input" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required disabled={!!editing} />
              </div>
              <div className="form-group">
                <label className="form-label">Platform</label>
                <select className="form-select" value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} disabled={!!editing}>
                  <option value="instagram">Instagram</option>
                  <option value="telegram">Telegram</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Display Name</label>
                <input className="form-input" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="lead">Lead</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="blocked">Blocked</option>
                  <option value="converted">Converted</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label className="form-label">Tags (comma-separated)</label>
                <input className="form-input" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} placeholder="vip, influencer, cold-lead" />
              </div>
              <div className="form-group" style={{ gridColumn: "span 2" }}>
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ height: "80px" }} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "12px" }}>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>
              <button type="submit" className="btn btn-primary"><Save size={14} /> {editing ? "Update" : "Create"}</button>
            </div>
          </form>
        </div>
      )}

      {/* Contacts Table */}
      <div className="glass-card">
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
            <Loader2 size={32} className="animate-spin" style={{ color: "var(--accent)" }} />
          </div>
        ) : contacts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
            <Users size={48} style={{ opacity: 0.3, marginBottom: "16px" }} />
            <p>No contacts found</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%" }}>
              <thead>
                <tr><th>Username</th><th>Platform</th><th>Display Name</th><th>Status</th><th>Tags</th><th>Last Contacted</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {contacts.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: "600" }}>@{c.username}</td>
                    <td><span className="badge">{c.platform}</span></td>
                    <td>{c.display_name || "-"}</td>
                    <td>
                      <span className="badge" style={{ background: STATUS_COLORS[c.status] || "var(--text-muted)", color: "#fff" }}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.tags || "-"}</td>
                    <td>{c.last_contacted_at ? new Date(c.last_contacted_at).toLocaleDateString() : "-"}</td>
                    <td style={{ display: "flex", gap: "6px" }}>
                      <button className="btn btn-secondary" style={{ padding: "4px 8px" }} onClick={() => handleEdit(c)}><Edit2 size={14} /></button>
                      <button className="btn btn-danger" style={{ padding: "4px 8px" }} onClick={() => handleDelete(c.id)}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
