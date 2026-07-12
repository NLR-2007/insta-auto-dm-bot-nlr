import React, { useState, useEffect, useRef } from "react";
import { apiFetch, getApiUrl } from "../api";
import { Play, Square, RefreshCw, Send, AlertTriangle, CheckCircle, Clock, Loader2, TrendingUp, Users, FileText, UserCheck, Coins } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";

export default function Dashboard() {
  const [status, setStatus] = useState({
    bot_running: false,
    system_running: false,
    user_automation_active: false,
    active_account: null,
    sent_today: 0,
    pending_count: 0,
    failed_count: 0,
    total_sent: 0,
  });
  const [logs, setLogs] = useState([]);
  const [targetInput, setTargetInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const logConsoleRef = useRef(null);

  const fetchStatusAndLogs = async () => {
    try {
      const statusData = await apiFetch("/api/status");
      setStatus(statusData);

      const logsData = await apiFetch("/api/logs?limit=50");
      setLogs(logsData);
    } catch (e) {
      console.error("Failed to load status/logs:", e);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const data = await apiFetch(`/api/analytics/dashboard?days=${analyticsDays}`);
      setAnalytics(data);
    } catch (e) {
      console.error("Failed to load analytics:", e);
    }
  };

  useEffect(() => {
    fetchStatusAndLogs();
    fetchAnalytics();
    const interval = setInterval(fetchStatusAndLogs, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [analyticsDays]);

  useEffect(() => {
    if (logConsoleRef.current) {
      logConsoleRef.current.scrollTop = logConsoleRef.current.scrollHeight;
    }
  }, [logs]);

  const handleStartBot = async () => {
    setActionLoading(true);
    try {
      await apiFetch("/api/bot/start", { method: "POST" });
      await fetchStatusAndLogs();
    } catch (e) {
      alert(e.message || "Failed to start bot.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopBot = async () => {
    setActionLoading(true);
    try {
      await apiFetch("/api/bot/stop", { method: "POST" });
      await fetchStatusAndLogs();
    } catch (e) {
      alert(e.message || "Failed to stop bot.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!targetInput.trim()) return;
    setLoading(true);
    try {
      const handles = targetInput.split(/[,\n]+/).map(h => h.trim()).filter(Boolean);
      await apiFetch("/api/targets", {
        method: "POST",
        body: JSON.stringify({ usernames: handles }),
      });
      setTargetInput("");
      await fetchStatusAndLogs();
    } catch (e) {
      alert(e.message || "Failed to add targets.");
    } finally {
      setLoading(false);
    }
  };

  const chartData = analytics?.time_series?.map(p => ({
    name: new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    Sent: p.sent,
    Failed: p.failed,
    Pending: p.pending,
  })) || [];

  return (
    <div className="dashboard-view">
      {/* Control row */}
      <div className={`glass-card control-panel ${status.user_automation_active ? "is-running" : ""}`}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div className="section-kicker">Automation control</div>
          <h2>Execution Center</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            {!status.system_running
              ? "System is offline. An admin must start the system before you can automate."
              : status.active_account
                ? `Account: @${status.active_account}`
                : "No account connected. Go to the Accounts section to connect one."}
          </p>
        </div>
        <div className="control-actions">
          {!status.system_running ? (
            <>
              <div className="status-indicator stopped">
                <span className="status-dot"></span>
                SYSTEM OFFLINE
              </div>
              <button className="btn btn-secondary" disabled title="Admin must start the system first">
                <Play size={16} /> Waiting for Admin
              </button>
            </>
          ) : status.user_automation_active ? (
            <>
              <div className="status-indicator running">
                <span className="status-dot"></span>
                YOUR AUTOMATION ACTIVE
              </div>
              <button
                className="btn btn-danger"
                onClick={handleStopBot}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <><Loader2 size={16} className="animate-spin" /> Stopping...</>
                ) : (
                  <><Square size={16} /> Stop My Automation</>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="status-indicator stopped">
                <span className="status-dot"></span>
                YOUR AUTOMATION PAUSED
              </div>
              <button
                className="btn btn-primary"
                onClick={handleStartBot}
                disabled={actionLoading || !status.active_account}
              >
                {actionLoading ? (
                  <><Loader2 size={16} className="animate-spin" /> Starting...</>
                ) : (
                  <><Play size={16} /> Start My Automation</>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="stats-grid">
        <div className="glass-card stat-card tone-blue">
          <div className="stat-icon" style={{ color: "var(--accent)" }}><TrendingUp size={20} /></div>
          <div className="stat-label">Total Sent</div>
          <div className="stat-value">{analytics?.total_sent ?? status.total_sent}</div>
        </div>
        <div className="glass-card stat-card tone-cyan">
          <div className="stat-icon" style={{ color: "var(--info)" }}><Clock size={20} /></div>
          <div className="stat-label">Pending</div>
          <div className="stat-value">{analytics?.total_pending ?? status.pending_count}</div>
        </div>
        <div className="glass-card stat-card tone-red">
          <div className="stat-icon" style={{ color: "var(--danger)" }}><AlertTriangle size={20} /></div>
          <div className="stat-label">Failed</div>
          <div className="stat-value">{analytics?.total_failed ?? status.failed_count}</div>
        </div>
        <div className="glass-card stat-card tone-green">
          <div className="stat-icon" style={{ color: "var(--success)" }}><Users size={20} /></div>
          <div className="stat-label">Contacts</div>
          <div className="stat-value">{analytics?.total_contacts ?? 0}</div>
        </div>
        <div className="glass-card stat-card tone-violet">
          <div className="stat-icon" style={{ color: "#8b5cf6" }}><FileText size={20} /></div>
          <div className="stat-label">Templates</div>
          <div className="stat-value">{analytics?.total_templates ?? 0}</div>
        </div>
        <div className="glass-card stat-card tone-amber">
          <div className="stat-icon" style={{ color: "#f59e0b" }}><UserCheck size={20} /></div>
          <div className="stat-label">Accounts</div>
          <div className="stat-value">{analytics?.total_accounts ?? 0}</div>
        </div>
        <div className="glass-card stat-card tone-emerald">
          <div className="stat-icon" style={{ color: "#10b981" }}><Coins size={20} /></div>
          <div className="stat-label" title="Instagram (₹0.45/msg) & Telegram (₹0.27/msg)">Total Cost</div>
          <div className="stat-value">₹{(analytics?.total_cost ?? 0).toFixed(2)}</div>
          <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "-4px" }}>
            ₹{(analytics?.ig_cost ?? 0).toFixed(2)} IG / ₹{(analytics?.tg_cost ?? 0).toFixed(2)} TG
          </div>
        </div>
      </div>

      {/* Content Columns */}
      <div className="content-grid cols-2-wider">
        {/* Analytics Chart */}
        <div className="glass-card" style={{ height: "420px", display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600" }}>Campaign Analytics</h3>
            <div style={{ display: "flex", gap: "6px" }}>
              {[7, 14, 30].map(d => (
                <button
                  key={d}
                  className={`btn ${analyticsDays === d ? "btn-primary" : "btn-secondary"}`}
                  style={{ padding: "4px 10px", fontSize: "11px" }}
                  onClick={() => setAnalyticsDays(d)}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <div style={{ width: "100%", height: "100%", minHeight: "280px" }}>
            <ResponsiveContainer width="100%" height="90%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--danger)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--danger)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="var(--text-muted)" style={{ fontSize: "12px" }} />
                <YAxis stroke="var(--text-muted)" style={{ fontSize: "12px" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--bg-secondary)",
                    borderColor: "var(--border-color)",
                    borderRadius: "8px",
                    color: "var(--text-primary)"
                  }}
                />
                <Area type="monotone" dataKey="Sent" stroke="var(--accent)" fillOpacity={1} fill="url(#colorSent)" />
                <Area type="monotone" dataKey="Failed" stroke="var(--danger)" fillOpacity={1} fill="url(#colorFailed)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Add Form */}
        <div className="glass-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>Enqueue Target Handles</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "20px" }}>
              Add Instagram usernames to the automation queue. Separate multiple names by commas or line breaks.
            </p>
            <form onSubmit={handleQuickAdd}>
              <div className="form-group">
                <textarea
                  className="form-textarea"
                  style={{ height: "150px" }}
                  placeholder="e.g. john_doe, travel_nomad, fitness_guru"
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%" }}
                disabled={loading}
              >
                <Send size={16} /> Enqueue Targets
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Real-time Logs Console */}
      <div className="glass-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "600" }}>System Audit Logs</h3>
          <button className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={fetchStatusAndLogs}>
            <RefreshCw size={12} /> Sync Log Stream
          </button>
        </div>
        <div className="logs-console" ref={logConsoleRef}>
          {logs.length === 0 ? (
            <div className="log-line">
              <span className="log-message" style={{ color: "var(--text-muted)" }}>[Idle] Waiting for logs stream...</span>
            </div>
          ) : (
            logs.slice().reverse().map((log) => {
              const dateStr = log.timestamp.endsWith("Z") ? log.timestamp : log.timestamp + "Z";
              const formattedTime = new Date(dateStr).toLocaleTimeString();
              return (
                <div key={log.id} className="log-line">
                  <span className="log-timestamp">{formattedTime}</span>
                  <span className={`log-level ${log.level}`}>{log.level}</span>
                  <span className="log-message">{log.message}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
