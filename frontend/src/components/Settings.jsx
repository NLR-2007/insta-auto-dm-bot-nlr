import React, { useState, useEffect } from "react";
import { apiFetch, getApiUrl, setApiUrl } from "../api";
import { Save, AlertCircle, Link, Shield, Trash2, Plus, Lock, Key, CheckCircle } from "lucide-react";

export default function Settings() {
  // Base settings
  const [dailyLimit, setDailyLimit] = useState(30);
  const [minDelay, setMinDelay] = useState(45);
  const [maxDelay, setMaxDelay] = useState(120);
  const [workingHoursStart, setWorkingHoursStart] = useState("08:00");
  const [workingHoursEnd, setWorkingHoursEnd] = useState("22:00");
  const [tunnelUrl, setTunnelUrl] = useState(getApiUrl());
  
  // Compliance Settings
  const [apiMode, setApiMode] = useState("sandbox"); // sandbox or official
  const [optOutKeywords, setOptOutKeywords] = useState("stop, unsubscribe, optout, stopdm");
  const [consentEnforce, setConsentEnforce] = useState(true);
  const [metaPageAccessToken, setMetaPageAccessToken] = useState("");
  const [metaVerifyToken, setMetaVerifyToken] = useState("");

  // Blocklist states
  const [blocklist, setBlocklist] = useState([]);
  const [newBlockedUser, setNewBlockedUser] = useState("");
  const [loading, setLoading] = useState(false);
  const [blocklistLoading, setBlocklistLoading] = useState(false);

  const fetchSettings = async () => {
    try {
      const data = await apiFetch("/api/settings");
      if (data.daily_limit) setDailyLimit(parseInt(data.daily_limit));
      if (data.min_delay) setMinDelay(parseInt(data.min_delay));
      if (data.max_delay) setMaxDelay(parseInt(data.max_delay));
      if (data.working_hours_start) setWorkingHoursStart(data.working_hours_start);
      if (data.working_hours_end) setWorkingHoursEnd(data.working_hours_end);
      
      if (data.api_mode) setApiMode(data.api_mode);
      if (data.opt_out_keywords) setOptOutKeywords(data.opt_out_keywords);
      if (data.consent_enforce !== undefined) {
        setConsentEnforce(data.consent_enforce === "true" || data.consent_enforce === true);
      }
      if (data.meta_page_access_token) setMetaPageAccessToken(data.meta_page_access_token);
      if (data.meta_verify_token) setMetaVerifyToken(data.meta_verify_token);
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
  };

  const fetchBlocklist = async () => {
    try {
      const data = await apiFetch("/api/optouts");
      setBlocklist(data);
    } catch (e) {
      console.error("Failed to load blocklist:", e);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchBlocklist();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Save backend settings
      await apiFetch("/api/settings", {
        method: "POST",
        body: JSON.stringify({
          daily_limit: dailyLimit,
          min_delay: minDelay,
          max_delay: maxDelay,
          working_hours_start: workingHoursStart,
          working_hours_end: workingHoursEnd,
          api_mode: apiMode,
          opt_out_keywords: optOutKeywords,
          consent_enforce: consentEnforce,
          meta_page_access_token: metaPageAccessToken,
          meta_verify_token: metaVerifyToken
        }),
      });

      // Save local storage API Tunnel URL
      setApiUrl(tunnelUrl);
      
      alert("All settings saved successfully!");
      fetchSettings();
    } catch (e) {
      alert(e.message || "Failed to save settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddBlocklist = async (e) => {
    e.preventDefault();
    if (!newBlockedUser.trim()) return;
    setBlocklistLoading(true);
    try {
      await apiFetch("/api/optouts", {
        method: "POST",
        body: JSON.stringify({ username: newBlockedUser.trim() })
      });
      setNewBlockedUser("");
      fetchBlocklist();
    } catch (e) {
      alert(e.message || "Failed to block user.");
    } finally {
      setBlocklistLoading(false);
    }
  };

  const handleDeleteBlocklist = async (id) => {
    if (!confirm("Remove this username from blocklist? They will receive automated messages if triggered.")) return;
    try {
      await apiFetch(`/api/optouts/${id}`, { method: "DELETE" });
      fetchBlocklist();
    } catch (e) {
      alert(e.message || "Failed to remove user from blocklist.");
    }
  };

  return (
    <div className="content-grid cols-2-wide">
      {/* Column 1: Settings Form */}
      <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div>
          <h3 style={{ fontSize: "18px", fontWeight: "700", display: "flex", gap: "8px", alignItems: "center" }}>
            <Shield size={20} style={{ color: "var(--accent)" }} /> GramGlide Configurations
          </h3>
          <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "4px" }}>
            Configure delivery rules, security compliance, and messaging adapters.
          </p>
        </div>

        <form onSubmit={handleSaveSettings} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Engine Mode selector */}
          <div className="form-group" style={{ background: "rgba(255, 255, 255, 0.02)", padding: "16px", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <label className="form-label" style={{ fontWeight: "600", fontSize: "14px", marginBottom: "8px" }}>Messaging Engine Integration</label>
            <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "var(--text-primary)" }}>
                <input 
                  type="radio" 
                  name="apiMode" 
                  value="sandbox" 
                  checked={apiMode === "sandbox"} 
                  onChange={() => setApiMode("sandbox")} 
                />
                <span style={{ fontSize: "13px" }}>Sandbox Mode (Playwright Automation)</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", color: "var(--text-primary)" }}>
                <input 
                  type="radio" 
                  name="apiMode" 
                  value="official" 
                  checked={apiMode === "official"} 
                  onChange={() => setApiMode("official")} 
                />
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#FB923C" }}>Official Meta API Mode (Compliant)</span>
              </label>
            </div>
            <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "10px", lineHeight: "1.4" }}>
              {apiMode === "sandbox" 
                ? "Sandbox Mode uses human simulation (randomized delays and typing) through browser cookies. Ideal for personal testing and developer evaluation." 
                : "Official Mode routes messages officially via Meta's Graph API. Zero risk of account blocks, 100% compliant, webhooks based, requires Developer credentials."
              }
            </p>
          </div>

          {/* Conditional Meta Developer settings */}
          {apiMode === "official" && (
            <div className="form-group" style={{ padding: "16px", background: "rgba(249, 115, 22, 0.05)", borderRadius: "8px", border: "1px dashed #F97316", display: "flex", flexDirection: "column", gap: "12px" }}>
              <h4 style={{ fontSize: "13px", fontWeight: "600", color: "#F97316", display: "flex", gap: "6px", alignItems: "center" }}>
                <Key size={14} /> Meta Developer Integration API Keys
              </h4>
              
              <div>
                <label className="form-label" style={{ fontSize: "11px" }}>Facebook Page Access Token (Instagram IGSID Messaging)</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="e.g. EAAGt3..." 
                  value={metaPageAccessToken}
                  onChange={(e) => setMetaPageAccessToken(e.target.value)}
                  style={{ height: "36px", fontSize: "12px" }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: "11px" }}>Webhook Verify Token (Configured in Meta Developer Portal)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. gram_glide_secret_token" 
                  value={metaVerifyToken}
                  onChange={(e) => setMetaVerifyToken(e.target.value)}
                  style={{ height: "36px", fontSize: "12px" }}
                />
              </div>

              <span style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: "1.4" }}>
                Set your Meta Developer App Webhook callback URL to: <code style={{ color: "#F97316" }}>{tunnelUrl ? `${tunnelUrl}/api/webhooks/instagram` : "[configure tunnel url below]"}</code>
              </span>
            </div>
          )}

          {/* Base limits & delays */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="form-group">
              <label className="form-label">Daily Message Limit</label>
              <input 
                type="number" 
                className="form-input" 
                min="1" 
                max="100" 
                value={dailyLimit}
                onChange={(e) => setDailyLimit(parseInt(e.target.value))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Min Delay (Seconds)</label>
              <input 
                type="number" 
                className="form-input" 
                min="10" 
                value={minDelay}
                onChange={(e) => setMinDelay(parseInt(e.target.value))}
                disabled={apiMode === "official"}
                required
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="form-group">
              <label className="form-label">Max Delay (Seconds)</label>
              <input 
                type="number" 
                className="form-input" 
                min="15" 
                value={maxDelay}
                onChange={(e) => setMaxDelay(parseInt(e.target.value))}
                disabled={apiMode === "official"}
                required
              />
            </div>
            <div className="form-group" style={{ display: "flex", flexDirection: "column" }}>
              <label className="form-label">Enforce Consent Keyword</label>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
                <input 
                  type="checkbox" 
                  checked={consentEnforce} 
                  onChange={(e) => setConsentEnforce(e.target.checked)}
                  style={{ width: "16px", height: "16px" }}
                />
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Only DM on Comment Keyword Match</span>
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="form-group">
              <label className="form-label">Start Work Hour</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="08:00"
                value={workingHoursStart}
                onChange={(e) => setWorkingHoursStart(e.target.value)}
                disabled={apiMode === "official"}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Work Hour</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="22:00"
                value={workingHoursEnd}
                onChange={(e) => setWorkingHoursEnd(e.target.value)}
                disabled={apiMode === "official"}
                required
              />
            </div>
          </div>

          {/* Compliance Opt-Out Keywords */}
          <div className="form-group">
            <label className="form-label">Auto Opt-Out / Unsubscribe Keywords</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. stop, unsubscribe, block, optout" 
              value={optOutKeywords}
              onChange={(e) => setOptOutKeywords(e.target.value)}
              required
            />
            <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
              Comma-separated list. If users comment or reply with these terms, they are auto-added to the blocklist.
            </span>
          </div>

          {/* Tunnel settings */}
          <div className="form-group">
            <label className="form-label" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <Link size={14} /> Backend Tunnel URL (Ngrok / Cloudflare)
            </label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. https://your-tunnel-subdomain.ngrok-free.app" 
              value={tunnelUrl}
              onChange={(e) => setTunnelUrl(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ marginTop: "8px", background: "var(--accent-gradient)" }}
            disabled={loading}
          >
            <Save size={16} /> Save Configuration
          </button>
        </form>
      </div>

      {/* Column 2: Blocklist & Compliance Notices */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        
        {/* Blocklist Manager */}
        <div className="glass-card">
          <h3 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "8px" }}>Manage Opt-Out Blocklist</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "12px", marginBottom: "16px" }}>
            Usernames listed here will be skipped automatically from all outbound automated DMs.
          </p>

          <form onSubmit={handleAddBlocklist} style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
            <input 
              type="text" 
              className="form-input" 
              placeholder="Instagram Username..." 
              value={newBlockedUser}
              onChange={(e) => setNewBlockedUser(e.target.value)}
              disabled={blocklistLoading}
              required
            />
            <button 
              type="submit" 
              className="btn btn-secondary" 
              style={{ display: "flex", gap: "6px", alignItems: "center" }}
              disabled={blocklistLoading}
            >
              <Plus size={14} /> Add Block
            </button>
          </form>

          {blocklist.length === 0 ? (
            <div style={{ padding: "30px", textAlign: "center", color: "var(--text-secondary)", fontSize: "13px", border: "1px dashed var(--border-color)", borderRadius: "8px" }}>
              No users opted-out currently.
            </div>
          ) : (
            <div style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid var(--border-color)", borderRadius: "8px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ background: "rgba(255,255,255,0.03)", textAlign: "left" }}>
                    <th style={{ padding: "10px 16px", fontWeight: "600", color: "var(--text-secondary)" }}>Username</th>
                    <th style={{ padding: "10px 16px", fontWeight: "600", color: "var(--text-secondary)" }}>Blocked Date</th>
                    <th style={{ padding: "10px 16px", textAlign: "right" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {blocklist.map((u) => (
                    <tr key={u.id} style={{ borderTop: "1px solid var(--border-color)" }}>
                      <td style={{ padding: "10px 16px", fontWeight: "500", color: "var(--text-primary)" }}>@{u.username}</td>
                      <td style={{ padding: "10px 16px", color: "var(--text-muted)" }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "10px 16px", textAlign: "right" }}>
                        <button 
                          className="btn btn-danger" 
                          style={{ padding: "6px 8px" }}
                          onClick={() => handleDeleteBlocklist(u.id)}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Safety Notice Panel */}
        <div className="glass-card" style={{ height: "fit-content" }}>
          <h4 style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)", display: "flex", gap: "8px", alignItems: "center" }}>
            <AlertCircle size={18} style={{ color: "#FB923C" }} /> GDPR & Compliance Recommendations
          </h4>
          <div style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "12px", display: "flex", flexDirection: "column", gap: "14px", lineHeight: "1.6" }}>
            <p>
              To maintain legal compliance under digital privacy frameworks:
            </p>
            <ul style={{ paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <li>
                • <strong>Consent Validation:</strong> Enable the <em>Enforce Consent Keyword</em> setting to ensure DMs are only triggered by explicit follower comments.
              </li>
              <li>
                • <strong>Opt-Out Transparency:</strong> Always include unsubscribe instructions inside your message templates (e.g. <em>"Reply STOP to unsubscribe"</em>).
              </li>
              <li>
                • <strong>Upgrade Path:</strong> If you are handling large campaign volumes, connect Page credentials and use <strong>Official Meta API Mode</strong> to ensure permanent immunity from platform spam blocks.
              </li>
            </ul>
            <div style={{ marginTop: "6px", display: "flex", gap: "8px", background: "rgba(16, 185, 129, 0.05)", border: "1px solid rgba(16, 185, 129, 0.2)", padding: "10px 14px", borderRadius: "6px", alignItems: "center" }}>
              <CheckCircle size={16} style={{ color: "var(--success)" }} />
              <span style={{ fontSize: "12px", color: "var(--success)", fontWeight: "500" }}>Compliance engine is active.</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
