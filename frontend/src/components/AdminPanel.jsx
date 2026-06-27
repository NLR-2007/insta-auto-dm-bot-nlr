import React, { useState, useEffect, useCallback } from "react";
import {
  Users, Activity, BarChart2, RefreshCw, Power, Square,
  CheckCircle, XCircle, Clock, TrendingUp, Shield,
  UserCheck, Server, Eye, Trash2, ChevronDown, ChevronUp,
  Send, Bot, Hash, Play, Pause, ToggleLeft, ToggleRight
} from "lucide-react";
import { apiFetch } from "../api";

function StatCard({ icon: Icon, label, value, color = "#0F172A", sub }) {
  return (
    <div className="glass-card admin-stat-card">
      <div className="admin-stat-icon" style={{ background: `${color}12`, color }}>
        <Icon size={20} />
      </div>
      <div>
        <p className="stat-label">{label}</p>
        <p className="stat-value" style={{ fontSize: "26px", color }}>{value}</p>
        {sub && <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>{sub}</p>}
      </div>
    </div>
  );
}

function UserRow({ user, onToggleAdmin, onToggleEnabled, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const successRate = (user.dms_sent + user.dms_failed) > 0
    ? Math.round((user.dms_sent / (user.dms_sent + user.dms_failed)) * 100)
    : 0;

  return (
    <>
      <tr style={{ opacity: user.is_enabled ? 1 : 0.5 }}>
        <td>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div className="admin-avatar">{user.username[0].toUpperCase()}</div>
            <div>
              <p style={{ fontWeight: 600, fontSize: "13px" }}>{user.username}</p>
              <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{user.email}</p>
            </div>
          </div>
        </td>
        <td>
          {user.is_admin ? (
            <span className="badge" style={{ background: "#2563EB", color: "#FFFFFF", fontSize: "10px" }}>ADMIN</span>
          ) : (
            <span className="badge badge-pending" style={{ fontSize: "10px" }}>USER</span>
          )}
        </td>
        <td>
          <span
            className={`badge ${user.is_enabled ? "badge-sent" : "badge-failed"}`}
            style={{ fontSize: "10px", cursor: "pointer" }}
            onClick={() => onToggleEnabled(user.id, user.username, user.is_enabled)}
          >
            {user.is_enabled ? "Enabled" : "Disabled"}
          </span>
        </td>
        <td>
          <div style={{ fontSize: "12px", lineHeight: "1.8" }}>
            <div><strong>{user.ig_accounts}</strong> account(s)</div>
            <div style={{ color: "var(--success)" }}>{user.dms_sent} sent</div>
            <div style={{ color: "var(--danger)" }}>{user.dms_failed} failed</div>
            <div style={{ color: "var(--warning)" }}>{user.pending} pending</div>
            {successRate > 0 && <div style={{ color: "var(--text-muted)" }}>{successRate}% rate</div>}
          </div>
        </td>
        <td>
          <div style={{ fontSize: "12px", lineHeight: "1.8" }}>
            <div><strong>{user.tg_bots}</strong> bot(s)</div>
            <div>{user.tg_channels} channel(s)</div>
          </div>
        </td>
        <td>
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {user.accounts?.length > 0 && (
              <button className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "11px" }}
                onClick={() => setExpanded(!expanded)} title="View accounts">
                <Eye size={11} /> {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
            )}
            <button className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "11px" }}
              onClick={() => onToggleEnabled(user.id, user.username, user.is_enabled)}
              title={user.is_enabled ? "Disable user" : "Enable user"}>
              {user.is_enabled ? <Pause size={11} /> : <Play size={11} />}
            </button>
            <button className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "11px" }}
              onClick={() => onToggleAdmin(user.id, user.username, user.is_admin)}
              title={user.is_admin ? "Revoke admin" : "Grant admin"}>
              <Shield size={11} />
            </button>
            <button className="btn btn-danger" style={{ padding: "4px 8px", fontSize: "11px" }}
              onClick={() => onDelete(user.id, user.username)} title="Delete user">
              <Trash2 size={11} />
            </button>
          </div>
        </td>
      </tr>
      {expanded && user.accounts?.map(acct => (
        <tr key={acct.id} style={{ background: "var(--bg-secondary)" }}>
          <td colSpan={6} style={{ paddingLeft: "56px", fontSize: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", padding: "2px 0" }}>
              <UserCheck size={12} style={{ color: "var(--text-muted)" }} />
              <span style={{ fontWeight: 600 }}>@{acct.username}</span>
              <span className={`badge badge-${acct.status === "connected" ? "sent" : acct.status === "connecting" ? "sending" : "failed"}`}
                style={{ fontSize: "10px" }}>
                {acct.status}
              </span>
              {acct.proxy_host && (
                <span style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: "11px" }}>
                  {acct.proxy_host}:{acct.proxy_port}
                </span>
              )}
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

export default function AdminPanel() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [systemAction, setSystemAction] = useState(null);
  const [activeSection, setActiveSection] = useState("overview");
  const [error, setError] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [statsData, usersData, logsData] = await Promise.all([
        apiFetch("/api/admin/stats"),
        apiFetch("/api/admin/users"),
        apiFetch("/api/logs?limit=50"),
      ]);
      setStats(statsData);
      setUsers(usersData);
      setLogs(logsData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 15000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const handleSystemToggle = async (action) => {
    setSystemAction(action);
    try {
      await apiFetch(`/api/admin/system/${action}`, { method: "POST" });
      setTimeout(fetchAll, 600);
    } catch (e) {
      alert(e.message);
    } finally {
      setSystemAction(null);
    }
  };

  const handleToggleAdmin = async (userId, username, isAdmin) => {
    if (!window.confirm(`${isAdmin ? "Revoke" : "Grant"} admin privileges for @${username}?`)) return;
    try {
      await apiFetch(`/api/admin/users/${userId}/toggle-admin`, { method: "PATCH" });
      fetchAll();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleToggleEnabled = async (userId, username, isEnabled) => {
    if (!window.confirm(`${isEnabled ? "Disable" : "Enable"} automation for @${username}?`)) return;
    try {
      await apiFetch(`/api/admin/users/${userId}/toggle-enabled`, { method: "PATCH" });
      fetchAll();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`PERMANENTLY delete user @${username} and all their data?`)) return;
    try {
      await apiFetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      fetchAll();
    } catch (e) {
      alert(e.message);
    }
  };

  const logColors = { INFO: "#38BDF8", SUCCESS: "#4ADE80", WARNING: "#FBBF24", ERROR: "#F87171", DEBUG: "#A78BFA" };

  const sections = [
    { id: "overview", label: "Overview", icon: BarChart2 },
    { id: "users", label: "Users", icon: Users },
    { id: "logs", label: "Logs", icon: Activity },
  ];

  const allRunning = stats?.ig_bot_running && stats?.tg_service_running;
  const anyRunning = stats?.ig_bot_running || stats?.tg_service_running;

  if (loading && !stats) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px", gap: "12px", color: "var(--text-muted)" }}>
        <RefreshCw size={20} className="animate-spin" />
        <span>Loading admin dashboard...</span>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      {error && (
        <div className="auth-alert auth-alert-error" style={{ marginBottom: "16px" }}>
          {error}
        </div>
      )}

      <div className="admin-section-nav">
        {sections.map(s => (
          <button key={s.id}
            className={`admin-section-btn ${activeSection === s.id ? "active" : ""}`}
            onClick={() => setActiveSection(s.id)}>
            <s.icon size={14} /> {s.label}
          </button>
        ))}
        <div style={{ marginLeft: "auto" }}>
          <button className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={fetchAll}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* OVERVIEW */}
      {activeSection === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* System Control Center */}
          <div className="glass-card" style={{ borderLeft: "3px solid #2563EB" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                  <Server size={18} />
                  <h2 style={{ fontSize: "15px", fontWeight: 700 }}>System Control Center</h2>
                </div>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", fontSize: "12px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: stats?.ig_bot_running ? "var(--success)" : "var(--danger)", boxShadow: stats?.ig_bot_running ? "0 0 6px var(--success)" : "none" }} />
                    <span style={{ fontWeight: 600 }}>Instagram Bot</span>
                    <span style={{ color: stats?.ig_bot_running ? "var(--success)" : "var(--text-muted)" }}>
                      {stats?.ig_bot_running ? "Running" : "Stopped"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", fontSize: "12px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: stats?.tg_service_running ? "var(--success)" : "var(--danger)", boxShadow: stats?.tg_service_running ? "0 0 6px var(--success)" : "none" }} />
                    <span style={{ fontWeight: 600 }}>Telegram Service</span>
                    <span style={{ color: stats?.tg_service_running ? "var(--success)" : "var(--text-muted)" }}>
                      {stats?.tg_service_running ? "Running" : "Stopped"}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                {anyRunning ? (
                  <button className="btn btn-danger" style={{ padding: "10px 20px", fontSize: "13px" }}
                    onClick={() => handleSystemToggle("stop")}
                    disabled={systemAction !== null}>
                    {systemAction === "stop" ? <RefreshCw size={14} className="animate-spin" /> : <Square size={14} />}
                    Stop All Systems
                  </button>
                ) : (
                  <button className="btn btn-primary" style={{ padding: "10px 20px", fontSize: "13px" }}
                    onClick={() => handleSystemToggle("start")}
                    disabled={systemAction !== null}>
                    {systemAction === "start" ? <RefreshCw size={14} className="animate-spin" /> : <Power size={14} />}
                    Start All Systems
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Stats Grid - Instagram */}
          <div>
            <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "10px" }}>
              Instagram Automation
            </p>
            <div className="stats-grid">
              <StatCard icon={Users} label="Total Users" value={stats?.total_users ?? "—"} color="#0F172A" />
              <StatCard icon={UserCheck} label="IG Accounts" value={stats?.total_accounts ?? "—"} color="#2563EB" />
              <StatCard icon={CheckCircle} label="DMs Sent" value={stats?.total_dms_sent ?? "—"} color="#16A34A" />
              <StatCard icon={XCircle} label="DMs Failed" value={stats?.total_dms_failed ?? "—"} color="#DC2626" />
              <StatCard icon={Clock} label="Pending" value={stats?.total_pending_targets ?? "—"} color="#F59E0B" />
              <StatCard icon={TrendingUp} label="Success Rate"
                value={
                  stats && (stats.total_dms_sent + stats.total_dms_failed) > 0
                    ? `${Math.round((stats.total_dms_sent / (stats.total_dms_sent + stats.total_dms_failed)) * 100)}%`
                    : "—"
                } color="#16A34A" />
            </div>
          </div>

          {/* Stats Grid - Telegram */}
          <div>
            <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "10px" }}>
              Telegram Automation
            </p>
            <div className="stats-grid">
              <StatCard icon={Bot} label="TG Bots" value={stats?.total_tg_bots ?? "—"} color="#0EA5E9" />
              <StatCard icon={Hash} label="TG Channels" value={stats?.total_tg_channels ?? "—"} color="#0EA5E9" />
              <StatCard icon={Send} label="Posts Sent" value={stats?.total_tg_posts_sent ?? "—"} color="#16A34A" />
              <StatCard icon={Clock} label="Posts Pending" value={stats?.total_tg_posts_pending ?? "—"} color="#F59E0B" />
            </div>
          </div>
        </div>
      )}

      {/* USERS */}
      {activeSection === "users" && (
        <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 700 }}>
              User Directory ({users.length})
            </h2>
            <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "var(--text-muted)" }}>
              <span>{users.filter(u => u.is_enabled).length} active</span>
              <span>{users.filter(u => !u.is_enabled).length} disabled</span>
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Instagram</th>
                  <th>Telegram</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px" }}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map(u => (
                    <UserRow key={u.id} user={u}
                      onToggleAdmin={handleToggleAdmin}
                      onToggleEnabled={handleToggleEnabled}
                      onDelete={handleDeleteUser} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* LOGS */}
      {activeSection === "logs" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 700 }}>
              System Logs (last 50)
            </h2>
          </div>
          <div className="logs-console">
            {logs.length === 0 ? (
              <p style={{ color: "#525252", textAlign: "center", padding: "20px" }}>No logs yet.</p>
            ) : (
              logs.map(log => (
                <div key={log.id} className="log-line">
                  <span className="log-timestamp">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="log-level" style={{ color: logColors[log.level] || "#D4D4D4" }}>
                    [{log.level}]
                  </span>
                  <span className="log-message">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
