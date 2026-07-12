import React, { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { Copy, FileText, Plus, Trash2, X } from "lucide-react";

export default function TgTemplates() {
  const [templates, setTemplates] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", content: "" });
  const [error, setError] = useState("");
  const load = () => apiFetch("/api/tg/templates").then(setTemplates).catch(() => setTemplates([]));
  useEffect(() => { load(); }, []);

  const create = async (event) => {
    event.preventDefault(); setError("");
    try {
      await apiFetch("/api/tg/templates", { method: "POST", body: JSON.stringify(form) });
      setForm({ name: "", content: "" }); setShowForm(false); load();
    } catch (e) { setError(e.message); }
  };
  const remove = async (id) => {
    if (!confirm("Delete this Telegram template?")) return;
    await apiFetch(`/api/tg/templates/${id}`, { method: "DELETE" }); load();
  };

  return <div className="tg-section">
    <div className="tg-section-header"><h3 className="tg-section-title"><FileText size={18} /> Message Templates</h3><button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>{showForm ? <><X size={14}/> Cancel</> : <><Plus size={14}/> New Template</>}</button></div>
    {error && <div className="auth-alert auth-alert-error">{error}</div>}
    {showForm && <form className="glass-card tg-template-form" onSubmit={create}>
      <input value={form.name} onChange={(e) => setForm({...form, name:e.target.value})} placeholder="Template name" required />
      <textarea className="form-textarea" value={form.content} onChange={(e) => setForm({...form, content:e.target.value})} placeholder="Write a reusable Telegram message…" required />
      <button className="btn btn-primary" type="submit">Save Template</button>
    </form>}
    {templates.length === 0 ? <div className="glass-card tg-template-empty">No Telegram templates yet.</div> : <div className="tg-template-grid">{templates.map((template) => <article className="glass-card tg-template-card" key={template.id}>
      <div><h4>{template.name}</h4><p>{template.content}</p></div>
      <div className="tg-template-actions"><button className="btn btn-secondary" onClick={() => navigator.clipboard?.writeText(template.content)}><Copy size={13}/> Copy</button><button className="btn btn-danger" onClick={() => remove(template.id)}><Trash2 size={13}/></button></div>
    </article>)}</div>}
  </div>;
}
