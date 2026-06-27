import React, { useState, useEffect, useRef } from "react";
import { apiFetch, getApiUrl } from "../api";
import { Play, Square, RefreshCw, Send, AlertTriangle, CheckCircle, Clock, Loader2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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

  useEffect(() => {
    fetchStatusAndLogs();
    const interval = setInterval(fetchStatusAndLogs, 4000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll logs to bottom
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

  // Mock data for Recharts visualizing DM activity
  const chartData = [
    { name: "Mon", Sent: Math.max(0, status.total_sent - 15), Failed: 2 },
    { name: "Tue", Sent: Math.max(0, status.total_sent - 10), Failed: 0 },
    { name: "Wed", Sent: Math.max(0, status.total_sent - 6), Failed: 1 },
    { name: "Thu", Sent: Math.max(0, status.total_sent - 3), Failed: 3 },
    { name: "Fri", Sent: status.total_sent, Failed: status.failed_count },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Control row */}
      <div className="glass-card control-panel">
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: "700" }}>Execution Center</h2>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
            {!status.system_running
              ? "System is offline. An admin must start the system before you can automate."
              : status.active_account
                ? `Account: @${status.active_account}`
                : "No account connected. Go to the Accounts section to connect one."}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
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
        <div className="glass-card stat-card" style={{ borderLeft: "4px solid var(--accent)" }}>
          <div className="stat-label">Sent Today</div>
          <div className="stat-value">{status.sent_today}</div>
        </div>
        <div className="glass-card stat-card" style={{ borderLeft: "4px solid var(--info)" }}>
          <div className="stat-label">Queue Pending</div>
          <div className="stat-value">{status.pending_count}</div>
        </div>
        <div className="glass-card stat-card" style={{ borderLeft: "4px solid var(--danger)" }}>
          <div className="stat-label">Failed Deliveries</div>
          <div className="stat-value">{status.failed_count}</div>
        </div>
        <div className="glass-card stat-card" style={{ borderLeft: "4px solid var(--success)" }}>
          <div className="stat-label">Cumulative Sent</div>
          <div className="stat-value">{status.total_sent}</div>
        </div>
      </div>

      {/* Content Columns */}
      <div className="content-grid cols-2-wider">
        {/* Analytics Chart */}
        <div className="glass-card" style={{ height: "400px", display: "flex", flexDirection: "column" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "20px" }}>Campaign Analytics</h3>
          <div style={{ width: "100%", height: "100%", minHeight: "280px" }}>
            <ResponsiveContainer width="100%" height="90%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
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
