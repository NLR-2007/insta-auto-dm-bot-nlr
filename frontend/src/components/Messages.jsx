import React, { useState, useEffect } from "react";
import { apiFetch } from "../api";
import { Plus, Trash2, CheckCircle2, XCircle, RefreshCw } from "lucide-react";

export default function Messages() {
  const [templates, setTemplates] = useState([]);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchTemplates = async () => {
    try {
      const data = await apiFetch("/api/messages");
      setTemplates(data);
    } catch (e) {
      console.error("Failed to load templates:", e);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleAddTemplate = async (e) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;
    setLoading(true);
    try {
      await apiFetch("/api/messages", {
        method: "POST",
        body: JSON.stringify({ name, content, is_active: true }),
      });
      setName("");
      setContent("");
      fetchTemplates();
    } catch (e) {
      alert(e.message || "Failed to add template.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id) => {
    try {
      await apiFetch(`/api/messages/${id}`, { method: "PATCH" });
      fetchTemplates();
    } catch (e) {
      alert(e.message || "Failed to toggle template.");
    }
  };

  const handleDeleteTemplate = async (id) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      await apiFetch(`/api/messages/${id}`, { method: "DELETE" });
      fetchTemplates();
    } catch (e) {
      alert(e.message || "Failed to delete template.");
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>
      {/* Templates List */}
      <div className="glass-card">
        <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px" }}>Message Templates</h3>
        {templates.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
            No message templates registered. Create one using the form on the right.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {templates.map((tpl) => (
              <div 
                key={tpl.id} 
                className="glass-card" 
                style={{ 
                  padding: "20px", 
                  background: "rgba(255,255,255,0.01)", 
                  display: "flex", 
                  flexDirection: "column", 
                  gap: "12px" 
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4 style={{ fontWeight: "600", fontSize: "16px", color: "var(--text-primary)" }}>{tpl.name}</h4>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button 
                      className={`btn ${tpl.is_active ? "btn-primary" : "btn-secondary"}`}
                      style={{ padding: "6px 12px", fontSize: "12px" }}
                      onClick={() => handleToggleActive(tpl.id)}
                    >
                      {tpl.is_active ? "Active" : "Inactive"}
                    </button>
                    <button 
                      className="btn btn-danger" 
                      style={{ padding: "6px 10px" }}
                      onClick={() => handleDeleteTemplate(tpl.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div 
                  style={{ 
                    background: "rgba(0,0,0,0.2)", 
                    padding: "12px", 
                    borderRadius: "8px", 
                    color: "var(--text-secondary)", 
                    fontSize: "14px",
                    fontFamily: "monospace",
                    whiteSpace: "pre-wrap"
                  }}
                >
                  {tpl.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Configuration & Guide */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Form */}
        <div className="glass-card">
          <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px" }}>Create Template</h3>
          <form onSubmit={handleAddTemplate}>
            <div className="form-group">
              <label className="form-label">Template Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Outreach Version A" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            
            <div className="form-group">
              <label className="form-label">Message Content</label>
              <textarea 
                className="form-textarea" 
                style={{ height: "120px" }}
                placeholder="e.g. {Hello|Hi|Hey} @username! {Saw your profile|Loved your feed}..." 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: "100%" }}
              disabled={loading}
            >
              <Plus size={16} /> Save Template
            </button>
          </form>
        </div>

        {/* Spintax Helper */}
        <div className="glass-card">
          <h4 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "8px" }}>
            💡 What is Spintax?
          </h4>
          <p style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: "1.6" }}>
            Instagram detects identical messages sent to multiple people as spam. 
            Use spintax formatting (curly brackets and vertical bars) to generate unique combinations automatically.
            <br /><br />
            <strong>Example Syntax:</strong>
            <br />
            <code>{"{Hello|Hi|Hey} there! I {liked|loved} your content."}</code>
            <br /><br />
            <strong>Possible variations sent:</strong>
            <ul style={{ paddingLeft: "16px", marginTop: "4px" }}>
              <li>• "Hello there! I liked your content."</li>
              <li>• "Hi there! I loved your content."</li>
              <li>• "Hey there! I liked your content."</li>
            </ul>
          </p>
        </div>
      </div>
    </div>
  );
}
