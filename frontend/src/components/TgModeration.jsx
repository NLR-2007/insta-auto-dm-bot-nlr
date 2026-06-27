import React, { useState, useEffect } from "react";
import { apiFetch } from "../api";
import {
  Shield, Plus, Trash2, ToggleLeft, ToggleRight,
  Ban, Link2Off, UserPlus, X,
} from "lucide-react";

const RULE_TYPES = [
  { value: "keyword_ban", label: "Keyword Ban", icon: Ban },
  { value: "anti_link", label: "Anti-Link", icon: Link2Off },
  { value: "welcome", label: "Welcome Message", icon: UserPlus },
];

export default function TgModeration() {
  const [rules, setRules] = useState([]);
  const [channels, setChannels] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ channel_id: "", rule_type: "keyword_ban", keywords: "", welcome_message: "", anti_link_enabled: true });
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      const [r, ch] = await Promise.all([apiFetch("/api/tg/moderation/rules"), apiFetch("/api/tg/channels")]);
      setRules(r);
      setChannels(ch);
    } catch {}
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    let config = {};
    if (form.rule_type === "keyword_ban") config = { keywords: form.keywords };
    else if (form.rule_type === "anti_link") config = { enabled: form.anti_link_enabled };
    else if (form.rule_type === "welcome") config = { message: form.welcome_message };

    try {
      await apiFetch("/api/tg/moderation/rules", {
        method: "POST",
        body: JSON.stringify({ channel_id: parseInt(form.channel_id), rule_type: form.rule_type, config: JSON.stringify(config) }),
      });
      setShowForm(false);
      fetchData();
    } catch (e) { setError(e.message); }
  };

  const handleToggle = async (id) => {
    try { await apiFetch(`/api/tg/moderation/rules/${id}/toggle`, { method: "PATCH" }); fetchData(); }
    catch (e) { alert(e.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this rule?")) return;
    try { await apiFetch(`/api/tg/moderation/rules/${id}`, { method: "DELETE" }); fetchData(); }
    catch (e) { alert(e.message); }
  };

  const getRuleIcon = (type) => (RULE_TYPES.find((r) => r.value === type)?.icon || Shield);
  const getRuleLabel = (type) => (RULE_TYPES.find((r) => r.value === type)?.label || type);
  const parseConfig = (s) => { try { return JSON.parse(s); } catch { return {}; } };

  return (
    <div className="tg-section">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h3 className="tg-section-title"><Shield size={18} /> Moderation Rules</h3>
        <button className="btn btn-primary" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X size={13} /> Cancel</> : <><Plus size={13} /> Add Rule</>}
        </button>
      </div>

      {showForm && (
        <div className="glass-card" style={{ marginBottom: "16px" }}>
          {error && <div className="auth-alert auth-alert-error" style={{ marginBottom: "12px" }}>{error}</div>}
          <form onSubmit={handleCreate}>
            <div style={{ display: "flex", gap: "12px", marginBottom: "12px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "150px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>Channel</label>
                <select value={form.channel_id} onChange={(e) => setForm({ ...form, channel_id: e.target.value })} required>
                  <option value="">Select channel...</option>
                  {channels.map((ch) => <option key={ch.id} value={ch.id}>{ch.title}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: "150px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>Rule Type</label>
                <select value={form.rule_type} onChange={(e) => setForm({ ...form, rule_type: e.target.value })}>
                  {RULE_TYPES.map((rt) => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
                </select>
              </div>
            </div>

            {form.rule_type === "keyword_ban" && (
              <div style={{ marginBottom: "12px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>Banned Keywords (comma-separated)</label>
                <input type="text" value={form.keywords} onChange={(e) => setForm({ ...form, keywords: e.target.value })} placeholder="spam, scam, crypto" required />
              </div>
            )}
            {form.rule_type === "welcome" && (
              <div style={{ marginBottom: "12px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>Welcome Message (use {"{name}"} for member name)</label>
                <textarea value={form.welcome_message} onChange={(e) => setForm({ ...form, welcome_message: e.target.value })} rows={3} placeholder={"Welcome {name}! Please read the rules."} required />
              </div>
            )}
            {form.rule_type === "anti_link" && (
              <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "12px" }}>Auto-deletes any message containing URLs.</p>
            )}
            <button type="submit" className="btn btn-primary">Create Rule</button>
          </form>
        </div>
      )}

      {rules.length === 0 ? (
        <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "24px", fontSize: "14px" }}>No moderation rules configured.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {rules.map((rule) => {
            const Icon = getRuleIcon(rule.rule_type);
            const config = parseConfig(rule.config);
            return (
              <div key={rule.id} className="glass-card" style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 18px", opacity: rule.is_active ? 1 : 0.5 }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(14, 165, 233, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0EA5E9", flexShrink: 0 }}>
                  <Icon size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "2px" }}>
                    <span style={{ fontWeight: 600, fontSize: "14px" }}>{getRuleLabel(rule.rule_type)}</span>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", background: "var(--bg-tertiary)", padding: "1px 8px", borderRadius: "10px" }}>{rule.channel_title}</span>
                  </div>
                  <p style={{ fontSize: "12px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {rule.rule_type === "keyword_ban" && `Keywords: ${config.keywords || "none"}`}
                    {rule.rule_type === "anti_link" && "Deletes messages with links"}
                    {rule.rule_type === "welcome" && `Message: ${config.message || "none"}`}
                  </p>
                </div>
                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                  <button className="btn btn-secondary" style={{ padding: "6px 10px" }} onClick={() => handleToggle(rule.id)}>
                    {rule.is_active ? <ToggleRight size={16} color="var(--success)" /> : <ToggleLeft size={16} />}
                  </button>
                  <button className="btn btn-danger" style={{ padding: "6px 10px" }} onClick={() => handleDelete(rule.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
