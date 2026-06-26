import React, { useState, useEffect } from "react";
import { apiFetch } from "../api";
import { Shield, ShieldAlert, Plus, Trash2, Key, HelpCircle, Check, Loader2 } from "lucide-react";

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [usernameInput, setUsernameInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const fetchAccounts = async () => {
    setFetching(true);
    try {
      const data = await apiFetch("/api/accounts");
      setAccounts(data);
    } catch (e) {
      console.error("Failed to load accounts:", e);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
    const interval = setInterval(fetchAccounts, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;
    setLoading(true);
    try {
      const cleanUsername = usernameInput.trim().replace("@", "");
      await apiFetch("/api/accounts", {
        method: "POST",
        body: JSON.stringify({ username: cleanUsername }),
      });
      setUsernameInput("");
      fetchAccounts();
    } catch (e) {
      alert(e.message || "Failed to add account.");
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerLogin = async (username) => {
    try {
      await apiFetch(`/api/accounts/${username}/login`, { method: "POST" });
      alert("Manual Login browser is launching on your laptop! Please look at your laptop screen to input credentials and 2FA.");
      fetchAccounts();
    } catch (e) {
      alert(e.message || "Failed to launch login session.");
    }
  };

  const handleForceConnected = async (username) => {
    try {
      await apiFetch(`/api/accounts/${username}/mark-connected`, { method: "POST" });
      fetchAccounts();
    } catch (e) {
      alert(e.message || "Failed to force connection status.");
    }
  };

  const handleDeleteAccount = async (username) => {
    if (!confirm(`Are you sure you want to delete @${username}?`)) return;
    try {
      await apiFetch(`/api/accounts/${username}`, { method: "DELETE" });
      fetchAccounts();
    } catch (e) {
      alert(e.message || "Failed to delete account.");
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "24px" }}>
      {/* Account List */}
      <div className="glass-card">
        <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px" }}>Linked Accounts</h3>
        {fetching && accounts.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
            <Loader2 className="animate-spin" size={24} style={{ margin: "0 auto 12px" }} />
            Loading accounts database...
          </div>
        ) : accounts.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
            No Instagram accounts registered. Use the configuration form on the right to link your profile.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {accounts.map((acc) => (
              <div 
                key={acc.id} 
                className="glass-card" 
                style={{ 
                  padding: "16px 20px", 
                  background: "rgba(255,255,255,0.01)", 
                  display: "flex", 
                  justifyContent: "space-between", 
                  alignItems: "center" 
                }}
              >
                <div>
                  <h4 style={{ fontWeight: "600", fontSize: "16px", color: "var(--text-primary)" }}>@{acc.username}</h4>
                  <div style={{ display: "flex", gap: "10px", marginTop: "6px", alignItems: "center" }}>
                    {acc.status === "connected" && (
                      <span className="badge badge-sent">
                        <Check size={12} style={{ marginRight: "4px" }} /> Connected / Session Active
                      </span>
                    )}
                    {acc.status === "connecting" && (
                      <span className="badge badge-sending">
                        <Loader2 size={12} className="animate-spin" style={{ marginRight: "4px" }} /> Awaiting Laptop Login...
                      </span>
                    )}
                    {acc.status === "disconnected" && (
                      <span className="badge badge-pending">
                        <Key size={12} style={{ marginRight: "4px" }} /> Authentication Required
                      </span>
                    )}
                    {acc.status === "verification_needed" && (
                      <span className="badge badge-failed">
                        <ShieldAlert size={12} style={{ marginRight: "4px" }} /> Verification Needed
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  {acc.status !== "connected" && (
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: "8px 12px", fontSize: "12px" }}
                      onClick={() => handleTriggerLogin(acc.username)}
                    >
                      Authenticate (Playwright)
                    </button>
                  )}
                  {acc.status === "connecting" && (
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: "8px 12px", fontSize: "12px" }}
                      onClick={() => handleForceConnected(acc.username)}
                    >
                      Force Verify
                    </button>
                  )}
                  <button 
                    className="btn btn-danger" 
                    style={{ padding: "8px 12px" }}
                    onClick={() => handleDeleteAccount(acc.username)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Account Panel */}
      <div className="glass-card" style={{ height: "fit-content" }}>
        <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "12px" }}>Register Account</h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "20px" }}>
          Link a new Instagram account. The password is not required if you plan to log in manually via the Playwright browser session.
        </p>
        
        <form onSubmit={handleAddAccount}>
          <div className="form-group">
            <label className="form-label">Instagram Username</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. travel_blogger_2026"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
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
            <Plus size={16} /> Add Account
          </button>
        </form>

        <div style={{ marginTop: "32px", borderTop: "1px solid var(--border-color)", paddingTop: "20px" }}>
          <h4 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", display: "flex", gap: "8px", alignItems: "center" }}>
            <Shield size={16} /> Playwright Security Notice
          </h4>
          <p style={{ color: "var(--text-secondary)", fontSize: "12px", marginTop: "8px", lineHeight: "1.6" }}>
            When you click <strong>Authenticate</strong>, an automated browser starts on your laptop. You can manually type your password, complete 2-factor authentication, or verify security emails. 
            Once logged in, close the browser or click Stop; your browser cookies will remain active for automated runs.
          </p>
        </div>
      </div>
    </div>
  );
}
