import React, { useState, useEffect, useRef } from "react";
import { apiFetch } from "../api";
import { Plus, Trash2, Sparkles, MessageSquare, Eye, Copy, RefreshCw, Zap, PenLine, Wand2 } from "lucide-react";

const SPINTAX_MAP = [
  { match: /\bthanks for commenting\b/gi, replace: "{Thanks for commenting!|Thank you for commenting!|Appreciate the comment!}" },
  { match: /\bthanks for the comment\b/gi, replace: "{Thanks for the comment!|Thank you for commenting!|Appreciate the support!}" },
  { match: /\bthanks for reaching out\b/gi, replace: "{Thanks for reaching out|Thank you for reaching out|Appreciate you reaching out}" },
  { match: /\bthanks for your interest\b/gi, replace: "{Thanks for your interest|Thank you for your interest|Appreciate the interest}" },
  { match: /\bthanks for following\b/gi, replace: "{Thanks for following|Thank you for the follow|Appreciate the follow}" },
  { match: /\bcheck out the link\b/gi, replace: "{Check out the link|Here is the link|Have a look at the link}" },
  { match: /\bcheck out\b/gi, replace: "{Check out|Have a look at|Take a look at}" },
  { match: /\bcheck this out\b/gi, replace: "{Check this out|Have a look at this|Take a look}" },
  { match: /\bi wanted to reach out\b/gi, replace: "{I wanted to reach out|Just wanted to connect|Thought I'd reach out}" },
  { match: /\bi wanted to\b/gi, replace: "{I wanted to|I'd like to|Just wanted to}" },
  { match: /\blet me know\b/gi, replace: "{Let me know|Feel free to reply|Drop me a message}" },
  { match: /\bfeel free to\b/gi, replace: "{Feel free to|Don't hesitate to|You're welcome to}" },
  { match: /\bhope you're doing well\b/gi, replace: "{Hope you're doing well|Hope you're having a great day|Hope all is well}" },
  { match: /\bhave a great day\b/gi, replace: "{Have a great day|Have an awesome day|Wishing you a great day}" },
  { match: /\bthank you\b/gi, replace: "{Thank you|Thanks|Much appreciated}" },
  { match: /\bthanks\b/gi, replace: "{Thanks|Thank you|Appreciate it}" },
  { match: /\bhello\b/gi, replace: "{Hello|Hi|Hey}" },
  { match: /\bhey there\b/gi, replace: "{Hey there|Hi there|Hello there}" },
  { match: /\bhi there\b/gi, replace: "{Hi there|Hey there|Hello there}" },
  { match: /\bhey\b/gi, replace: "{Hey|Hi|Hello}" },
  { match: /\bhi\b/gi, replace: "{Hi|Hey|Hello}" },
  { match: /\bamazing\b/gi, replace: "{Amazing|Awesome|Incredible}" },
  { match: /\bawesome\b/gi, replace: "{Awesome|Amazing|Fantastic}" },
  { match: /\bgreat\b/gi, replace: "{Great|Awesome|Amazing}" },
  { match: /\blove your\b/gi, replace: "{Love your|Really like your|A big fan of your}" },
  { match: /\breally like\b/gi, replace: "{Really like|Love|Am a fan of}" },
  { match: /\binterested\b/gi, replace: "{Interested|Curious|Keen}" },
];

function plainToSpintax(text) {
  if (!text.trim()) return "";
  if (/\{[^}]*\|[^}]*\}/.test(text)) return text;

  let result = text;
  const replaced = new Set();

  for (const rule of SPINTAX_MAP) {
    const matches = result.match(rule.match);
    if (matches) {
      for (const m of matches) {
        const key = m.toLowerCase();
        if (replaced.has(key)) continue;
        replaced.add(key);
        result = result.replace(m, rule.replace);
        break;
      }
    }
  }
  return result;
}

function resolveSpintax(text, seed = 0) {
  if (!text.trim()) return "Start typing to see a live preview...";
  let preview = text.replace(/@username/g, "@nlr2007").replace(/\{username\}/g, "nlr2007");
  const pattern = /\{([^{}]+)\}/;
  let i = 0;
  while (pattern.test(preview) && i < 50) {
    const match = preview.match(pattern);
    const options = match[1].split("|");
    const index = Math.abs(seed + i) % options.length;
    preview = preview.replace(match[0], options[index]);
    i++;
  }
  return preview;
}

export default function Messages() {
  const [templates, setTemplates] = useState([]);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [spintaxOutput, setSpintaxOutput] = useState("");
  const [mode, setMode] = useState("plain");
  const [loading, setLoading] = useState(false);
  const [previewSeed, setPreviewSeed] = useState(0);
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

  useEffect(() => {
    if (mode === "plain") {
      setSpintaxOutput(plainToSpintax(content));
    } else {
      setSpintaxOutput(content);
    }
  }, [content, mode]);

  const handleAddTemplate = async (e) => {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;
    setLoading(true);
    try {
      const finalContent = mode === "plain" ? spintaxOutput : content;
      await apiFetch("/api/messages", {
        method: "POST",
        body: JSON.stringify({ name, content: finalContent, is_active: true }),
      });
      setName("");
      setContent("");
      setSpintaxOutput("");
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

  const insertPlaceholder = (tag) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    setContent(text.substring(0, start) + tag + text.substring(end));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + tag.length, start + tag.length);
    }, 10);
  };

  const savedContent = mode === "plain" ? spintaxOutput : content;

  return (
    <div className="content-grid cols-2-left">
      {/* Templates List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div className="glass-card">
          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "16px" }}>
            <MessageSquare size={20} style={{ color: "var(--accent)" }} />
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
                    border: tpl.is_active ? "1px solid rgba(37, 99, 235, 0.3)" : "1px solid var(--border-color)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px",
                    boxShadow: tpl.is_active ? "0 4px 20px rgba(37, 99, 235, 0.08)" : "none",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h4 style={{ fontWeight: "600", fontSize: "16px", color: "var(--text-primary)" }}>{tpl.name}</h4>
                      {tpl.is_active && (
                        <span style={{ fontSize: "11px", color: "var(--accent)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Active Target Template
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
                      background: "var(--bg-secondary)",
                      padding: "16px",
                      borderRadius: "10px",
                      color: "var(--text-secondary)",
                      fontSize: "13.5px",
                      fontFamily: "monospace",
                      whiteSpace: "pre-wrap",
                      border: "1px solid var(--border-color)",
                      lineHeight: "1.5",
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

      {/* Editor Column */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div className="glass-card">
          <div style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "20px" }}>
            <Sparkles size={20} style={{ color: "var(--accent)" }} />
            <h3 style={{ fontSize: "18px", fontWeight: "700" }}>Create Template</h3>
          </div>

          {/* Mode Toggle */}
          <div style={{ display: "flex", gap: "4px", marginBottom: "20px", background: "var(--bg-secondary)", borderRadius: "10px", padding: "4px" }}>
            <button
              type="button"
              onClick={() => setMode("plain")}
              style={{
                flex: 1,
                padding: "10px 16px",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                transition: "all 0.2s",
                background: mode === "plain" ? "var(--accent)" : "transparent",
                color: mode === "plain" ? "white" : "var(--text-secondary)",
              }}
            >
              <Wand2 size={14} /> Smart Mode
            </button>
            <button
              type="button"
              onClick={() => setMode("spintax")}
              style={{
                flex: 1,
                padding: "10px 16px",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "600",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                transition: "all 0.2s",
                background: mode === "spintax" ? "var(--accent)" : "transparent",
                color: mode === "spintax" ? "white" : "var(--text-secondary)",
              }}
            >
              <PenLine size={14} /> Manual Spintax
            </button>
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
              <label className="form-label">
                {mode === "plain" ? "Type Your Message (plain text)" : "Write Spintax Template"}
              </label>
              <textarea
                ref={textareaRef}
                className="form-textarea"
                style={{ height: "120px", lineHeight: "1.6" }}
                placeholder={
                  mode === "plain"
                    ? "e.g. Hey @username! Thanks for commenting, check out the link below..."
                    : "e.g. {Hello|Hi|Hey} @username! {Thanks for commenting|Appreciate the comment}..."
                }
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {/* Quick Insert Pills */}
            {mode === "spintax" && (
              <div style={{ marginBottom: "20px" }}>
                <span style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: "600", display: "block", marginBottom: "8px" }}>
                  Quick Insert Placeholders
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {[
                    { label: "+ @username", tag: "@username" },
                    { label: "+ Greetings", tag: "{Hello|Hi|Hey}" },
                    { label: "+ Comment Thanks", tag: "{Thanks for commenting!|Thank you for commenting!|Appreciate the support!}" },
                    { label: "+ Link Intro", tag: "{Check out the link|Here is the link}: " },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: "4px 10px", fontSize: "11px", borderRadius: "6px" }}
                      onClick={() => insertPlaceholder(item.tag)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Spintax Output Box (Smart Mode) */}
            {mode === "plain" && content.trim() && (
              <div style={{ marginBottom: "20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                  <Zap size={13} style={{ color: "var(--accent)" }} />
                  <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    Auto-Generated Spintax
                  </span>
                </div>
                <div
                  style={{
                    background: "var(--bg-secondary)",
                    border: "1px solid rgba(37, 99, 235, 0.2)",
                    borderRadius: "10px",
                    padding: "14px 16px",
                    fontFamily: "monospace",
                    fontSize: "13px",
                    lineHeight: "1.6",
                    color: "var(--text-primary)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {spintaxOutput}
                </div>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "6px", display: "block" }}>
                  This spintax version will be saved. Each send picks a random variation.
                </span>
              </div>
            )}

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

        {/* Live Preview */}
        <div
          className="glass-card"
          style={{
            background: "var(--accent-light)",
            border: "1px dashed rgba(37, 99, 235, 0.2)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <Eye size={16} style={{ color: "var(--accent)" }} />
              <h4 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)" }}>Live Message Preview</h4>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: "4px 8px", fontSize: "10px", height: "24px", display: "flex", gap: "4px" }}
              onClick={() => setPreviewSeed((s) => s + 1)}
              disabled={!content.trim()}
            >
              <RefreshCw size={10} /> Alternate
            </button>
          </div>
          <div
            style={{
              background: "var(--bg-primary)",
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
              whiteSpace: "pre-wrap",
            }}
          >
            {resolveSpintax(savedContent, previewSeed)}
          </div>
          <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "8px", display: "block", textAlign: "right" }}>
            * Previewed for target user `@nlr2007`
          </span>
        </div>
      </div>
    </div>
  );
}
