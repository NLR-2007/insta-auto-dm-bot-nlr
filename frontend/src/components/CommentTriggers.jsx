import React, { useState, useEffect } from "react";
import { apiFetch } from "../api";
import { Plus, Trash2, Link, FileText, CheckCircle2, XCircle, Loader2, Sparkles, MessageCircle } from "lucide-react";

export default function CommentTriggers() {
  const [monitors, setMonitors] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [history, setHistory] = useState([]);

  const [postUrl, setPostUrl] = useState("");
  const [keyword, setKeyword] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const fetchData = async () => {
    setFetching(true);
    try {
      const [postsData, templatesData, accountsData, historyData] = await Promise.all([
        apiFetch("/api/posts"),
        apiFetch("/api/messages"),
        apiFetch("/api/accounts"),
        apiFetch("/api/history"),
      ]);
      setMonitors(postsData);
      setTemplates(templatesData);
      setAccounts(accountsData);
      setHistory(historyData);
      if (!accountId && accountsData.length > 0) {
        setAccountId(String(accountsData[0].id));
      }
    } catch (e) {
      console.error("Failed to load comment triggers data:", e);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleAddMonitor = async (e) => {
    e.preventDefault();
    if (!postUrl.trim() || !keyword.trim() || !templateId || !accountId) {
      alert("Please fill in all trigger details and select an account.");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/api/posts", {
        method: "POST",
        body: JSON.stringify({
          post_url: postUrl.trim(),
          trigger_keyword: keyword.trim(),
          template_id: parseInt(templateId),
          account_id: parseInt(accountId),
          is_active: true
        })
      });
      setPostUrl("");
      setKeyword("");
      setTemplateId("");
      fetchData();
    } catch (e) {
      alert(e.message || "Failed to configure trigger.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id) => {
    try {
      await apiFetch(`/api/posts/${id}`, { method: "PATCH" });
      fetchData();
    } catch (e) {
      alert(e.message || "Failed to toggle trigger status.");
    }
  };

  const handleDeleteMonitor = async (id) => {
    if (!confirm("Are you sure you want to stop monitoring this post?")) return;
    try {
      await apiFetch(`/api/posts/${id}`, { method: "DELETE" });
      fetchData();
    } catch (e) {
      alert(e.message || "Failed to remove post trigger.");
    }
  };

  const getTemplateName = (id) => {
    const tpl = templates.find((t) => t.id === id);
    return tpl ? tpl.name : "N/A";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Configuration Row */}
      <div className="content-grid cols-2-wide">
        
        {/* Setup Form */}
        <div className="glass-card">
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "16px" }}>
            <Sparkles size={20} style={{ color: "var(--accent)" }} />
            <h3 style={{ fontSize: "18px", fontWeight: "700" }}>Configure Comment Trigger</h3>
          </div>
          
          <form onSubmit={handleAddMonitor}>
            <div className="form-group">
              <label className="form-label">Post or Reel URL</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="https://www.instagram.com/p/C-xyz123abc/" 
                value={postUrl}
                onChange={(e) => setPostUrl(e.target.value)}
                disabled={loading}
                required
              />
            </div>
            
            <div className="form-row-2col">
              <div className="form-group">
                <label className="form-label">Trigger Word / Letter</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. INFO or C"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Instagram Account</label>
                <select
                  className="form-input"
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  disabled={loading}
                  required
                  style={{ height: "45px" }}
                >
                  <option value="">-- Select Account --</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>@{a.username} ({a.status})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Connect DM Template</label>
              <select
                className="form-input"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                disabled={loading}
                required
                style={{ height: "45px" }}
              >
                <option value="">-- Choose Template --</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            
            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: "100%", marginTop: "16px" }}
              disabled={loading || templates.length === 0}
            >
              <Plus size={16} /> Link Comment Trigger
            </button>
            {templates.length === 0 && (
              <span style={{ fontSize: "12px", color: "var(--danger)", marginTop: "8px", display: "block" }}>
                * Create a message template first in 'DM Templates' section.
              </span>
            )}
          </form>
        </div>

        {/* Informational Panel */}
        <div className="glass-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <h4 style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)", display: "flex", gap: "8px", alignItems: "center", marginBottom: "12px" }}>
              <MessageCircle size={18} style={{ color: "var(--accent)" }} /> Comment-to-DM Rules
            </h4>
            <div style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: "1.6", display: "flex", flexDirection: "column", gap: "12px" }}>
              <p>
                When a user leaves a comment on your post containing your **Trigger Word/Letter**, the backend Playwright script automatically detects it, opens their profile page, and sends them your connected DM template.
              </p>
              <ul style={{ paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                <li>• **Case-Insensitive**: Matches whether comments are lowercase or uppercase (e.g. `java`, `JAVA` or `Java` all trigger outreach).</li>
                <li>• **Deduplication Check**: The bot keeps track of commenter history. It will only send **one** trigger message per user, per post.</li>
                <li>• **Stealth Speed**: A delay of 45-120 seconds will be enforced between comment-triggered DMs to keep your account safe.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Active Monitors List */}
      <div className="glass-card">
        <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px" }}>Active Comment Monitors</h3>
        {monitors.length === 0 ? (
          <div style={{ padding: "30px", textAlign: "center", color: "var(--text-secondary)" }}>
            No active post triggers configured. Use the form above to add your first post monitor.
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Post Link</th>
                  <th>Trigger Keyword</th>
                  <th>Linked Template</th>
                  <th>Monitoring Status</th>
                  <th style={{ width: "60px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {monitors.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <a 
                        href={item.post_url} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ color: "var(--accent)", textDecoration: "underline", display: "inline-flex", gap: "4px", alignItems: "center" }}
                      >
                        <Link size={12} /> View Post
                      </a>
                    </td>
                    <td>
                      <span style={{ fontFamily: "monospace", fontSize: "14px", background: "var(--bg-tertiary)", padding: "4px 8px", borderRadius: "4px" }}>
                        {item.trigger_keyword}
                      </span>
                    </td>
                    <td>{getTemplateName(item.template_id)}</td>
                    <td>
                      <button 
                        className={`btn ${item.is_active ? "btn-primary" : "btn-secondary"}`}
                        style={{ padding: "6px 12px", fontSize: "12px" }}
                        onClick={() => handleToggleActive(item.id)}
                      >
                        {item.is_active ? "Active" : "Paused"}
                      </button>
                    </td>
                    <td>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: "6px 10px", borderColor: "transparent" }}
                        onClick={() => handleDeleteMonitor(item.id)}
                      >
                        <Trash2 size={14} style={{ color: "var(--text-muted)" }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Trigger History Logs */}
      <div className="glass-card">
        <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px" }}>Comment-to-DM Dispatch History</h3>
        {history.length === 0 ? (
          <div style={{ padding: "30px", textAlign: "center", color: "var(--text-secondary)" }}>
            No comment-trigger history recorded yet. The bot checks for comments when started.
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Commenter</th>
                  <th>Comment Text</th>
                  <th>Trigger Word</th>
                  <th>Dispatch Status</th>
                  <th>Processed Time</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <a 
                        href={`https://instagram.com/${item.username}`} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ color: "var(--accent)", fontWeight: "500" }}
                      >
                        @{item.username}
                      </a>
                    </td>
                    <td style={{ color: "var(--text-secondary)", fontStyle: "italic" }}>
                      "{item.comment_text}"
                    </td>
                    <td>
                      <span style={{ background: "var(--bg-tertiary)", padding: "3px 6px", borderRadius: "4px", fontSize: "12px", fontFamily: "monospace" }}>
                        {item.trigger_keyword}
                      </span>
                    </td>
                    <td>
                      {item.status === "sent" ? (
                        <span className="badge badge-sent" style={{ gap: "4px" }}>
                          <CheckCircle2 size={12} /> DM Sent
                        </span>
                      ) : (
                        <span className="badge badge-failed" style={{ gap: "4px" }}>
                          <XCircle size={12} /> Failed
                        </span>
                      )}
                    </td>
                    <td>
                      {new Date(item.processed_at).toLocaleString()}
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
