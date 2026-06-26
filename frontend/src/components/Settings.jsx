import React, { useState, useEffect } from "react";
import { apiFetch, getApiUrl, setApiUrl } from "../api";
import { Save, AlertCircle, Link } from "lucide-react";

export default function Settings() {
  const [dailyLimit, setDailyLimit] = useState(30);
  const [minDelay, setMinDelay] = useState(45);
  const [maxDelay, setMaxDelay] = useState(120);
  const [workingHoursStart, setWorkingHoursStart] = useState("08:00");
  const [workingHoursEnd, setWorkingHoursEnd] = useState("22:00");
  
  const [tunnelUrl, setTunnelUrl] = useState(getApiUrl());
  const [loading, setLoading] = useState(false);

  const fetchSettings = async () => {
    try {
      const data = await apiFetch("/api/settings");
      if (data.daily_limit) setDailyLimit(parseInt(data.daily_limit));
      if (data.min_delay) setMinDelay(parseInt(data.min_delay));
      if (data.max_delay) setMaxDelay(parseInt(data.max_delay));
      if (data.working_hours_start) setWorkingHoursStart(data.working_hours_start);
      if (data.working_hours_end) setWorkingHoursEnd(data.working_hours_end);
    } catch (e) {
      console.error("Failed to load settings:", e);
    }
  };

  useEffect(() => {
    fetchSettings();
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
          working_hours_end: workingHoursEnd
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

  return (
    <div className="content-grid cols-2-wide">
      {/* Settings Form */}
      <div className="glass-card">
        <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "20px" }}>System Configuration</h3>
        <form onSubmit={handleSaveSettings}>
          
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
            <div></div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="form-group">
              <label className="form-label">Min Delay (Seconds)</label>
              <input 
                type="number" 
                className="form-input" 
                min="10" 
                value={minDelay}
                onChange={(e) => setMinDelay(parseInt(e.target.value))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Max Delay (Seconds)</label>
              <input 
                type="number" 
                className="form-input" 
                min="15" 
                value={maxDelay}
                onChange={(e) => setMaxDelay(parseInt(e.target.value))}
                required
              />
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
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: "16px" }}>
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
            <span style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
              The Vercel frontend connects to your local laptop backend via this tunnel URL.
            </span>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ marginTop: "24px" }}
            disabled={loading}
          >
            <Save size={16} /> Save Configuration
          </button>
        </form>
      </div>

      {/* Safety Notice Panel */}
      <div className="glass-card" style={{ height: "fit-content" }}>
        <h4 style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)", display: "flex", gap: "8px", alignItems: "center" }}>
          <AlertCircle size={18} style={{ color: "var(--warning)" }} /> Safety & Stealth Recommendations
        </h4>
        <div style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "12px", display: "flex", flexDirection: "column", gap: "14px", lineHeight: "1.6" }}>
          <p>
            Instagram monitors account activity patterns. Sending too many DMs or doing it too fast will result in temporary action blocks.
          </p>
          <div>
            <strong>Recommended Safe Settings:</strong>
            <ul style={{ paddingLeft: "16px", marginTop: "6px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <li>• <strong>Daily Limit</strong>: 20-40 DMs per day for established accounts. Keep it under 15 for new accounts.</li>
              <li>• <strong>Delay intervals</strong>: At least 45 to 120 seconds between DMs. High randomization is key.</li>
              <li>• <strong>Working Hours</strong>: Simulate human behavior by only sending during day/evening times (e.g. 09:00 to 22:00).</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
