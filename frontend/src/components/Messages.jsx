import React, { useState, useEffect, useRef } from "react";
import { apiFetch } from "../api";
import { Plus, Trash2, Sparkles, MessageSquare, Eye, Copy, RefreshCw } from "lucide-react";

export default function Messages() {
  const [templates, setTemplates] = useState([]);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewSeed, setPreviewSeed] = useState(0); // to force random preview re-generation
  const textareaRef = useRef(null);

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

  // Helper to insert quick tags at the cursor position
  const insertPlaceholder = (tag) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);
    
    setContent(before + tag + after);
    
    // Focus back and set cursor position right after the inserted tag
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 10);
  };

  // Generate dynamic live preview from the spintax content
  const getLivePreview = (text) => {
    if (!text.trim()) return "Start typing to generate a live outreach preview...";
    
    // Replace placeholders
    let preview = text.replace(/@username/g, "@nlr2007").replace(/\{username\}/g, "nlr2007");
    
    // Evaluate spintax (either pick first option or pseudo-random option based on previewSeed)
    const pattern = /\{([^{}]+)\}/;
    let iterations = 0;
    while (pattern.test(preview) && iterations < 50) {
      const match = preview.match(pattern);
      const options = match[1].split('|');
      
      // Determine index based on seed (so it updates on refresh button click)
      const index = Math.abs(previewSeed + iterations) % options.length;
      preview = preview.replace(match[0], options[index]);
      iterations++;
    }
    return preview;
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "28px" }}>
      {/* Templates List Column */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div className="glass-card">
          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "16px" }}>
            <MessageSquare size={20} style={{ color: "var(--accent-pink)" }} />
            <h3 style={{ fontSize: "18px", fontWeight: "700" }}>Outreach Templates</h3>
          </div>
          
          {templates.length === 0 ? (
            <div style={{ padding: "60px 40px", textAlign: "center", color: "var(--text-secondary)" }}>
              No message templates registered yet. Create your first template using the editor.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {templates.map((tpl) => (
                <div 
                  key={tpl.id} 
                  className="glass-card" 
                  style={{ 
                    padding: "20px", 
                    background: "rgba(255, 255, 255, 0.015)",
                    border: tpl.is_active ? "1px solid rgba(124, 77, 255, 0.25)" : "1px solid var(--border-color)",
                    display: "flex", 
                    flexDirection: "column", 
                    gap: "14px",
                    boxShadow: tpl.is_active ? "0 4px 20px rgba(124, 77, 255, 0.08)" : "none"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h4 style={{ fontWeight: "600", fontSize: "16px", color: "var(--text-primary)" }}>{tpl.name}</h4>
                      {tpl.is_active && (
                        <span style={{ fontSize: "11px", color: "var(--accent-purple)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          ● Active Target Template
                        </span>
                      )}
                    </div>
                    
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button 
                        className={`btn ${tpl.is_active ? "btn-primary" : "btn-secondary"}`}
                        style={{ padding: "6px 12px", fontSize: "12px", height: "30px" }}
                        onClick={() => handleToggleActive(tpl.id)}
                      >
                        {tpl.is_active ? "Active" : "Inactive"}
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: "6px 10px", height: "30px" }}
                        onClick={() => handleDeleteTemplate(tpl.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  
                  <div 
                    style={{ 
                      background: "rgba(0,0,0,0.25)", 
                      padding: "16px", 
                      borderRadius: "10px", 
                      color: "var(--text-secondary)", 
                      fontSize: "13.5px",
                      fontFamily: "monospace",
                      whiteSpace: "pre-wrap",
                      border: "1px solid rgba(255,255,255,0.02)",
                      lineHeight: "1.5"
                    }}
                  >
                    {tpl.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Editor & Guide Column */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* Modern Interactive Editor */}
        <div className="glass-card">
          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "20px" }}>
            <Sparkles size={20} style={{ color: "var(--accent-purple)" }} />
            <h3 style={{ fontSize: "18px", fontWeight: "700" }}>Create Template</h3>
          </div>
          
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
            
            <div className="form-group" style={{ marginBottom: "12px" }}>
              <label className="form-label">Message Content</label>
              <textarea 
                ref={textareaRef}
                id="template-content-textarea"
                className="form-textarea" 
                style={{ height: "140px", lineHeight: "1.6" }}
                placeholder="e.g. {Hello|Hi|Hey} @username! {Thanks for commenting|Appreciate the comment}..." 
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            
            {/* Quick Insertion Pills */}
            <div style={{ marginBottom: "20px" }}>
              <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "600", display: "block", marginBottom: "8px" }}>
                ⚡ Quick Insert Placeholders
              </span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: "4px 10px", fontSize: "11px", borderRadius: "6px" }}
                  onClick={() => insertPlaceholder("@username")}
                >
                  + @username
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: "4px 10px", fontSize: "11px", borderRadius: "6px" }}
                  onClick={() => insertPlaceholder("{Hello|Hi|Hey}")}
                >
                  + Greetings
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: "4px 10px", fontSize: "11px", borderRadius: "6px" }}
                  onClick={() => insertPlaceholder("{Thanks for commenting!|Thank you for commenting!|Appreciate the support!}")}
                >
                  + Comment Thanks
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: "4px 10px", fontSize: "11px", borderRadius: "6px" }}
                  onClick={() => insertPlaceholder("{Check out the link|Here is the link}: ")}
                >
                  + Link Intro
                </button>
              </div>
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: "100%", height: "45px" }}
              disabled={loading}
            >
              <Plus size={16} /> Save Template
            </button>
          </form>
        </div>

        {/* Live Preview Console */}
        <div 
          className="glass-card" 
          style={{ 
            background: "rgba(124, 77, 255, 0.02)",
            border: "1px dashed rgba(124, 77, 255, 0.2)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <Eye size={16} style={{ color: "var(--accent-purple)" }} />
              <h4 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>
                Live Message Preview
              </h4>
            </div>
            <button 
              type="button"
              className="btn btn-secondary" 
              style={{ padding: "4px 8px", fontSize: "10px", height: "24px", display: "flex", gap: "4px" }}
              onClick={() => setPreviewSeed(s => s + 1)}
              disabled={!content.trim()}
            >
              <RefreshCw size={10} /> Alternate Option
            </button>
          </div>
          
          <div 
            style={{ 
              background: "#05070a", 
              padding: "16px", 
              borderRadius: "12px", 
              color: content.trim() ? "var(--text-primary)" : "var(--text-muted)", 
              fontSize: "13.5px",
              fontFamily: "sans-serif",
              border: "1px solid var(--border-color)",
              minHeight: "80px",
              display: "flex",
              alignItems: "center",
              lineHeight: "1.6",
              whiteSpace: "pre-wrap"
            }}
          >
            {getLivePreview(content)}
          </div>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px", display: "block", textAlign: "right" }}>
            * Previewed for target user `@nlr2007`
          </span>
        </div>
      </div>
    </div>
  );
}
