import React, { useState, useEffect } from "react";
import { apiFetch } from "../api";
import { Bot, Plus, Trash2, RefreshCw, Hash, X } from "lucide-react";

export default function TgBots() {
  const [bots, setBots] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const [manualChat, setManualChat] = useState({ botId: "", chatId: "" });

  const fetchBots = async () => {
    try { setBots(await apiFetch("/api/tg/bots")); } catch {}
  };

  useEffect(() => { fetchBots(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await apiFetch("/api/tg/bots", { method: "POST", body: JSON.stringify({ bot_token: token }) });
      setToken("");
      setShowForm(false);
      fetchBots();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this bot and all its channels?")) return;
    try { await apiFetch(`/api/tg/bots/${id}`, { method: "DELETE" }); fetchBots(); }
    catch (e) { alert(e.message); }
  };

  const handleRefresh = async (id) => {
    setRefreshing(id);
    try { await apiFetch(`/api/tg/bots/${id}/refresh-channels`, { method: "POST" }); fetchBots(); }
    catch (e) { alert(e.message); }
    finally { setRefreshing(null); }
  };

  const handleManualAdd = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await apiFetch(`/api/tg/channels/add-manual?bot_id=${manualChat.botId}&chat_id=${manualChat.chatId}`, { method: "POST" });
      setManualChat({ botId: "", chatId: "" });
      setShowManual(false);
      fetchBots();
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="tg-section">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h3 className="tg-section-title"><Bot size={18} /> Bot Management</h3>
        <div style={{ display: "flex", gap: "8px" }}>
          <button className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={() => setShowManual(!showManual)}>
            {showManual ? <><X size={13} /> Cancel</> : <><Hash size={13} /> Add Channel</>}
          </button>
          <button className="btn btn-primary" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={() => setShowForm(!showForm)}>
            {showForm ? <><X size={13} /> Cancel</> : <><Plus size={13} /> Add Bot</>}
          </button>
        </div>
      </div>

      {error && <div className="auth-alert auth-alert-error" style={{ marginBottom: "12px" }}>{error}</div>}

      {showForm && (
        <div className="glass-card" style={{ marginBottom: "16px" }}>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "12px" }}>
            Get your bot token from <b>@BotFather</b> on Telegram.
          </p>
          <form onSubmit={handleAdd} style={{ display: "flex", gap: "10px" }}>
            <input
              type="text" value={token} onChange={(e) => setToken(e.target.value)}
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              style={{ flex: 1 }} required
            />
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Validating..." : "Add"}
            </button>
          </form>
        </div>
      )}

      {showManual && (
        <div className="glass-card" style={{ marginBottom: "16px" }}>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "12px" }}>
            Enter the chat ID (e.g. <b>-1001234567890</b>) or username (e.g. <b>@mychannel</b>). Bot must be admin in the channel first.
          </p>
          <form onSubmit={handleManualAdd} style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <select value={manualChat.botId} onChange={(e) => setManualChat({ ...manualChat, botId: e.target.value })} required style={{ minWidth: "150px" }}>
              <option value="">Select bot...</option>
              {bots.map((b) => <option key={b.id} value={b.id}>@{b.bot_username}</option>)}
            </select>
            <input
              type="text" value={manualChat.chatId} onChange={(e) => setManualChat({ ...manualChat, chatId: e.target.value })}
              placeholder="-1001234567890 or @channel" style={{ flex: 1 }} required
            />
            <button type="submit" className="btn btn-primary">Add</button>
          </form>
        </div>
      )}

      {bots.length === 0 ? (
        <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "24px", fontSize: "14px" }}>
          No bots added yet. Click "Add Bot" to connect your Telegram bot.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {bots.map((bot) => (
            <div key={bot.id} className="glass-card" style={{ display: "flex", alignItems: "center", gap: "14px", padding: "14px 18px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(14, 165, 233, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0EA5E9", flexShrink: 0 }}>
                <Bot size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600 }}>@{bot.bot_username}</p>
                <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>{bot.bot_name} &middot; {bot.channel_count} channel(s)</p>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button className="btn btn-secondary" style={{ padding: "6px 10px" }} onClick={() => handleRefresh(bot.id)} disabled={refreshing === bot.id}>
                  <RefreshCw size={13} className={refreshing === bot.id ? "animate-spin" : ""} />
                </button>
                <button className="btn btn-danger" style={{ padding: "6px 10px" }} onClick={() => handleDelete(bot.id)}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
