import React, { useState, useEffect } from "react";
import { apiFetch } from "../api";
import {
  CalendarClock, Plus, Send, Trash2, RefreshCw,
  CheckCircle, XCircle, Clock, Repeat, X,
} from "lucide-react";

const STATUS_COLORS = {
  pending: "var(--warning)", sent: "var(--success)", failed: "var(--danger)", cancelled: "var(--text-muted)",
};

export default function TgSchedule() {
  const [posts, setPosts] = useState([]);
  const [channels, setChannels] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ channel_id: "", content: "", scheduled_at: "", is_recurring: false, recurrence_rule: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [p, ch] = await Promise.all([apiFetch("/api/tg/posts"), apiFetch("/api/tg/channels")]);
      setPosts(p);
      setChannels(ch);
    } catch {}
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const localDate = new Date(form.scheduled_at);
      const utcScheduledAt = localDate.toISOString();

      await apiFetch("/api/tg/posts/schedule", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          scheduled_at: utcScheduledAt,
          channel_id: parseInt(form.channel_id),
          recurrence_rule: form.is_recurring ? form.recurrence_rule : null,
        }),
      });
      setShowForm(false);
      setForm({ channel_id: "", content: "", scheduled_at: "", is_recurring: false, recurrence_rule: "" });
      fetchData();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this post?")) return;
    try { await apiFetch(`/api/tg/posts/${id}`, { method: "DELETE" }); fetchData(); }
    catch (e) { alert(e.message); }
  };

  const handleSendNow = async (id) => {
    if (!window.confirm("Send this post now?")) return;
    try { await apiFetch(`/api/tg/posts/${id}/send-now`, { method: "POST" }); fetchData(); }
    catch (e) { alert(e.message); }
  };

  return (
    <div className="tg-section">
      <div className="tg-section-header">
        <h3 className="tg-section-title"><CalendarClock size={18} /> Scheduled Posts</h3>
        <div className="tg-btn-group">
          <button className="btn btn-primary" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={() => setShowForm(!showForm)}>
            {showForm ? <><X size={13} /> Cancel</> : <><Plus size={13} /> New Post</>}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="glass-card" style={{ marginBottom: "16px" }}>
          {error && <div className="auth-alert auth-alert-error" style={{ marginBottom: "12px" }}>{error}</div>}
          <form onSubmit={handleCreate}>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>Channel</label>
              <select value={form.channel_id} onChange={(e) => setForm({ ...form, channel_id: e.target.value })} required>
                <option value="">Select channel...</option>
                {channels.map((ch) => <option key={ch.id} value={ch.id}>{ch.title} ({ch.chat_type})</option>)}
              </select>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>Content (HTML supported)</label>
              <textarea
                value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={4} placeholder={"Your message here... Use <b>bold</b>, <i>italic</i>, <a href='url'>links</a>"}
                required
              />
            </div>
            <div style={{ display: "flex", gap: "12px", marginBottom: "12px", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", display: "block" }}>Schedule Date & Time</label>
                <input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} required />
              </div>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <input type="checkbox" checked={form.is_recurring} onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })} /> Recurring
                </label>
                {form.is_recurring && (
                  <select value={form.recurrence_rule} onChange={(e) => setForm({ ...form, recurrence_rule: e.target.value })} style={{ marginTop: "6px" }}>
                    <option value="">Select interval...</option>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                )}
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Scheduling..." : "Schedule Post"}
            </button>
          </form>
        </div>
      )}

      {posts.length === 0 ? (
        <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "24px", fontSize: "14px" }}>
          No scheduled posts yet.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {posts.map((post) => (
            <div key={post.id} className="glass-card" style={{ padding: "14px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#0EA5E9", background: "rgba(14, 165, 233, 0.08)", padding: "2px 10px", borderRadius: "12px" }}>{post.channel_title}</span>
                <span style={{ fontSize: "11px", fontWeight: 700, color: STATUS_COLORS[post.status], display: "flex", alignItems: "center", gap: "4px", textTransform: "uppercase" }}>
                  {post.status === "sent" && <CheckCircle size={12} />}
                  {post.status === "failed" && <XCircle size={12} />}
                  {post.status === "pending" && <Clock size={12} />}
                  {post.status}
                </span>
              </div>
              <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "8px", whiteSpace: "pre-wrap", maxHeight: "80px", overflow: "hidden" }}>{post.content}</p>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", fontSize: "12px", color: "var(--text-muted)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><CalendarClock size={11} /> {new Date(post.scheduled_at).toLocaleString()}</span>
                {post.is_recurring && <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--warning)" }}><Repeat size={11} /> {post.recurrence_rule}</span>}
                <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
                  {post.status === "pending" && (
                    <button className="btn btn-primary" style={{ padding: "4px 10px", fontSize: "11px" }} onClick={() => handleSendNow(post.id)}>
                      <Send size={11} /> Send Now
                    </button>
                  )}
                  <button className="btn btn-danger" style={{ padding: "4px 10px", fontSize: "11px" }} onClick={() => handleDelete(post.id)}>
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
              {post.error_message && <p style={{ marginTop: "6px", fontSize: "12px", color: "var(--danger)", padding: "4px 8px", background: "rgba(239,68,68,0.06)", borderRadius: "6px" }}>{post.error_message}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
