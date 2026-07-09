import React, { useState, useEffect } from "react";
import { apiFetch } from "../api";
import { Bot, Plus, Trash2, RefreshCw, Hash, X, ChevronDown, ChevronUp } from "lucide-react";

export default function TgBots() {
  const [bots, setBots] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const [manualChat, setManualChat] = useState({ botId: "", chatId: "" });
  const [expandedBots, setExpandedBots] = useState([]);
  const [filterType, setFilterType] = useState("all"); // 'all', 'channel', 'group'

  const toggleExpandBot = (id) => {
    if (expandedBots.includes(id)) {
      setExpandedBots(expandedBots.filter(x => x !== id));
    } else {
      setExpandedBots([...expandedBots, id]);
    }
  };

  const handleRemoveChannel = async (channelId) => {
    if (!window.confirm("Remove this channel/group?")) return;
    try {
      await apiFetch(`/api/tg/channels/${channelId}`, { method: "DELETE" });
      fetchBots();
    } catch (e) {
      alert(e.message);
    }
  };

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
      <div className="tg-section-header">
        <h3 className="tg-section-title"><Bot size={18} /> Bot Management</h3>
        <div className="tg-btn-group">
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
          <form onSubmit={handleAdd} className="tg-form-inline">
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
          <form onSubmit={handleManualAdd} className="tg-form-inline">
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
            <div key={bot.id} className="glass-card" style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(14, 165, 233, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0EA5E9", flexShrink: 0 }}>
                  <Bot size={20} />
                </div>
                <div style={{ flex: 1, minWidth: "120px" }}>
                  <p style={{ fontWeight: 600 }}>@{bot.bot_username}</p>
                  <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                    {bot.bot_name} &middot; {bot.channel_count} chat(s) connected
                  </p>
                </div>
                <div className="tg-card-actions" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <button className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }} onClick={() => toggleExpandBot(bot.id)}>
                    {expandedBots.includes(bot.id) ? (
                      <>Hide <ChevronUp size={13} /></>
                    ) : (
                      <>Chats <ChevronDown size={13} /></>
                    )}
                  </button>
                  <button className="btn btn-secondary" style={{ padding: "6px 10px" }} onClick={() => handleRefresh(bot.id)} disabled={refreshing === bot.id}>
                    <RefreshCw size={13} className={refreshing === bot.id ? "animate-spin" : ""} />
                  </button>
                  <button className="btn btn-danger" style={{ padding: "6px 10px" }} onClick={() => handleDelete(bot.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {expandedBots.includes(bot.id) && (
                <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "12px", marginTop: "4px" }}>
                  {/* Filter Selector */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Connected Channels & Groups
                    </span>
                    <div style={{ display: "flex", background: "var(--bg-tertiary)", borderRadius: "6px", padding: "2px", gap: "2px" }}>
                      {[
                        { key: "all", label: "All" },
                        { key: "channel", label: "Channels" },
                        { key: "group", label: "Groups" }
                      ].map((t) => (
                        <button 
                          key={t.key} 
                          type="button" 
                          onClick={() => setFilterType(t.key)}
                          style={{
                            padding: "3px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, border: "none",
                            background: filterType === t.key ? "var(--bg-primary)" : "transparent",
                            color: filterType === t.key ? "#2563EB" : "var(--text-muted)",
                            cursor: "pointer", transition: "all 0.15s"
                          }}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Channels & Groups List */}
                  {(!bot.channels || bot.channels.length === 0) ? (
                    <p style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center", padding: "8px 0" }}>
                      No chats connected. Click "Add Channel" to add one.
                    </p>
                  ) : (
                    (() => {
                      const filtered = bot.channels.filter(ch => {
                        if (filterType === "all") return true;
                        if (filterType === "channel") return ch.chat_type === "channel";
                        return ch.chat_type === "group" || ch.chat_type === "supergroup";
                      });

                      if (filtered.length === 0) {
                        return (
                          <p style={{ fontSize: "12px", color: "var(--text-muted)", textAlign: "center", padding: "8px 0" }}>
                            No {filterType === "channel" ? "channels" : "groups"} found.
                          </p>
                        );
                      }

                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {filtered.map(ch => {
                            const isGroup = ch.chat_type === "group" || ch.chat_type === "supergroup";
                            return (
                              <div key={ch.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--bg-secondary)", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                                  <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", background: isGroup ? "rgba(245, 158, 11, 0.08)" : "rgba(14, 165, 233, 0.08)", color: isGroup ? "var(--warning)" : "var(--info)" }}>
                                    {isGroup ? "Group" : "Channel"}
                                  </span>
                                  <span style={{ fontWeight: 600, fontSize: "13px", color: "var(--text-primary)" }}>{ch.title}</span>
                                  {ch.username && (
                                    <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>@{ch.username}</span>
                                  )}
                                </div>
                                <button 
                                  type="button" 
                                  onClick={() => handleRemoveChannel(ch.id)}
                                  style={{ background: "rgba(239, 68, 68, 0.08)", border: "none", color: "var(--danger)", cursor: "pointer", display: "inline-flex", padding: "4px", borderRadius: "4px" }}
                                  title="Remove chat"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
