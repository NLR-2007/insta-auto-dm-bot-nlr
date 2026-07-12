import React, { useState, useEffect, useCallback } from "react";
import {
  Users, Activity, BarChart2, RefreshCw, Power, Square,
  CheckCircle, XCircle, Clock, TrendingUp, Shield,
  UserCheck, Server, Eye, Trash2, ChevronDown, ChevronUp,
  Send, Bot, Hash, Play, Pause, ToggleLeft, ToggleRight,
  FileText, Cpu, HardDrive, Database, Flag, Plus, Save, X, Coins, Search
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

function UserRow({ user, onToggleAdmin, onToggleEnabled, onDelete, onResetCost }) {
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
            <strong>{user.tg_bots}</strong> bot(s)
            <div>{user.tg_channels} channel(s)</div>
            <div style={{ color: "var(--text-muted)", fontSize: "11px" }}>{user.tg_posts_sent} sent</div>
          </div>
        </td>
        <td>
          <div style={{ fontSize: "12px", lineHeight: "1.8" }}>
            <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>₹{(user.total_cost ?? 0).toFixed(2)}</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>IG: ₹{(user.ig_cost ?? 0).toFixed(2)}</div>
            <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>TG: ₹{(user.tg_cost ?? 0).toFixed(2)}</div>
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
            <button className="btn btn-secondary" style={{ padding: "4px 8px", fontSize: "11px" }}
              onClick={() => onResetCost(user.id, user.username)} title="Reset user cost to zero">
              <Coins size={11} /> Reset
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
          <td colSpan={7} style={{ paddingLeft: "56px", fontSize: "12px" }}>
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

  // New state for enhanced sections
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditFilter, setAuditFilter] = useState("");
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState("");
  const [featureFlags, setFeatureFlags] = useState([]);
  const [showFlagForm, setShowFlagForm] = useState(false);
  const [flagForm, setFlagForm] = useState({ key: "", value: "on", scope: "global" });
  const [userSearch, setUserSearch] = useState("");

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

  const fetchAuditLogs = async () => {
    try {
      let url = "/api/admin/audit-logs?limit=100";
      if (auditFilter) url += `&action=${encodeURIComponent(auditFilter)}`;
      const data = await apiFetch(url);
      setAuditLogs(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHealth = async () => {
    setHealthLoading(true);
    setHealthError("");
    try {
      const data = await apiFetch("/api/admin/health");
      setHealthData(data);
    } catch (e) {
      setHealthError(e.message || "Unable to load system health.");
    } finally {
      setHealthLoading(false);
    }
  };

  const fetchFlags = async () => {
    try {
      const data = await apiFetch("/api/admin/feature-flags");
      setFeatureFlags(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 15000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  useEffect(() => {
    if (activeSection === "audit") fetchAuditLogs();
    if (activeSection === "health") fetchHealth();
    if (activeSection === "config") fetchFlags();
  }, [activeSection, auditFilter]);

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

  const handleResetCost = async (userId, username) => {
    if (!window.confirm(`Reset the accumulated cost for @${username} to ₹0.00? New usage will be charged from now.`)) return;
    try {
      await apiFetch(`/api/admin/users/${userId}/reset-cost`, { method: "POST" });
      fetchAll();
    } catch (e) { alert(e.message); }
  };

  const handleCreateFlag = async (e) => {
    e.preventDefault();
    try {
      await apiFetch("/api/admin/feature-flags", { method: "POST", body: JSON.stringify(flagForm) });
      setShowFlagForm(false);
      setFlagForm({ key: "", value: "on", scope: "global" });
      fetchFlags();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleToggleFlag = async (flag) => {
    try {
      await apiFetch(`/api/admin/feature-flags/${flag.id}`, {
        method: "PATCH",
        body: JSON.stringify({ value: flag.value === "on" ? "off" : "on" }),
      });
      fetchFlags();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDeleteFlag = async (id) => {
    if (!confirm("Delete this feature flag?")) return;
    try {
      await apiFetch(`/api/admin/feature-flags/${id}`, { method: "DELETE" });
      fetchFlags();
    } catch (e) {
      alert(e.message);
    }
  };

  const logColors = { INFO: "#38BDF8", SUCCESS: "#4ADE80", WARNING: "#FBBF24", ERROR: "#F87171", DEBUG: "#A78BFA" };

  const formatBytes = (bytes) => {
    if (!bytes) return "—";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + " GB";
  };

  const formatUptime = (secs) => {
    if (!secs) return "—";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const sections = [
    { id: "overview", label: "Overview", icon: BarChart2 },
    { id: "users", label: "Users", icon: Users },
    { id: "audit", label: "Audit Log", icon: FileText },
    { id: "health", label: "Health", icon: Cpu },
    { id: "config", label: "Config", icon: Flag },
    { id: "logs", label: "Logs", icon: Activity },
  ];

  const allRunning = stats?.ig_bot_running && stats?.tg_service_running;
  const anyRunning = stats?.ig_bot_running || stats?.tg_service_running;
  const visibleUsers = users.filter((user) => `${user.username} ${user.email}`.toLowerCase().includes(userSearch.toLowerCase()));

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
          <button className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={() => activeSection === "health" ? fetchHealth() : fetchAll()}>
            <RefreshCw size={13} className={(loading || healthLoading) ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>

      {/* OVERVIEW */}
      {activeSection === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
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
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", borderRadius: "8px", border: "1px solid var(--border-color)", fontSize: "12px", background: "rgba(22, 163, 74, 0.05)" }}>
                    <Coins size={14} style={{ color: "var(--success)" }} />
                    <span style={{ fontWeight: 600 }}>Total System Cost:</span>
                    <span style={{ color: "var(--success)", fontWeight: 700 }}>
                      ₹{(stats?.total_system_cost ?? 0).toFixed(2)}
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
              <StatCard icon={Coins} label="IG Cost" value={stats?.total_ig_cost != null ? `₹${stats.total_ig_cost.toFixed(2)}` : "—"} color="#10B981" />
            </div>
          </div>

          <div>
            <p style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: "10px" }}>
              Telegram Automation
            </p>
            <div className="stats-grid">
              <StatCard icon={Bot} label="TG Bots" value={stats?.total_tg_bots ?? "—"} color="#0EA5E9" />
              <StatCard icon={Hash} label="TG Channels" value={stats?.total_tg_channels ?? "—"} color="#0EA5E9" />
              <StatCard icon={Send} label="Posts Sent" value={stats?.total_tg_posts_sent ?? "—"} color="#16A34A" />
              <StatCard icon={Clock} label="Posts Pending" value={stats?.total_tg_posts_pending ?? "—"} color="#F59E0B" />
              <StatCard icon={Coins} label="TG Cost" value={stats?.total_tg_cost != null ? `₹${stats.total_tg_cost.toFixed(2)}` : "—"} color="#10B981" />
            </div>
          </div>
        </div>
      )}

      {/* USERS */}
      {activeSection === "users" && (
        <div className="glass-card admin-users-card">
          <div className="admin-card-header">
            <div><h2>User Directory</h2><p>{users.length} total · {users.filter(u => u.is_enabled).length} active · {users.filter(u => !u.is_enabled).length} disabled</p></div>
            <div className="admin-search"><Search size={15}/><input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Search users…" /></div>
          </div>
          <div className="table-container admin-table-container">
            <table className="admin-users-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Instagram</th>
                  <th>Telegram</th>
                  <th>Usage Cost</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px" }}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  visibleUsers.map(u => (
                    <UserRow key={u.id} user={u}
                      onToggleAdmin={handleToggleAdmin}
                      onToggleEnabled={handleToggleEnabled}
                      onResetCost={handleResetCost}
                      onDelete={handleDeleteUser} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AUDIT LOG */}
      {activeSection === "audit" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="glass-card" style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <FileText size={18} />
            <h2 style={{ fontSize: "15px", fontWeight: 700 }}>Audit Log</h2>
            <input
              className="form-input"
              placeholder="Filter by action..."
              value={auditFilter}
              onChange={e => setAuditFilter(e.target.value)}
              style={{ marginLeft: "auto", maxWidth: "220px" }}
            />
          </div>
          <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Action</th>
                    <th>User ID</th>
                    <th>Entity</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px" }}>No audit logs</td></tr>
                  ) : (
                    auditLogs.map(log => (
                      <tr key={log.id}>
                        <td style={{ fontSize: "11px", whiteSpace: "nowrap" }}>
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td><span className="badge" style={{ fontSize: "10px" }}>{log.action}</span></td>
                        <td>{log.user_id ?? "—"}</td>
                        <td>{log.entity_type ? `${log.entity_type}#${log.entity_id}` : "—"}</td>
                        <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "11px", fontFamily: "monospace" }}>
                          {log.metadata_json || "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SYSTEM HEALTH */}
      {activeSection === "health" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="glass-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Cpu size={18} />
              <h2 style={{ fontSize: "15px", fontWeight: 700 }}>System Health</h2>
            </div>
            <button className="btn btn-secondary" style={{ padding: "6px 12px", fontSize: "12px" }} onClick={fetchHealth} disabled={healthLoading}>
              <RefreshCw size={13} className={healthLoading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
          {healthError ? (
            <div className="auth-alert auth-alert-error" style={{ margin: 0 }}>
              <strong>Health check failed.</strong> {healthError}
            </div>
          ) : healthData ? (
            <div className="stats-grid">
              <StatCard icon={Server} label="Platform" value={healthData.platform || "—"} color="#0F172A" sub={`Python ${healthData.python_version || "?"}`} />
              <StatCard icon={Cpu} label="CPU" value={healthData.cpu_percent != null ? `${healthData.cpu_percent}%` : "—"} color={healthData.cpu_percent > 80 ? "#DC2626" : "#16A34A"} />
              <StatCard icon={HardDrive} label="Memory" value={healthData.memory ? `${healthData.memory.percent}%` : "—"} color={healthData.memory?.percent > 80 ? "#DC2626" : "#2563EB"} sub={healthData.memory ? `${formatBytes(healthData.memory.used)} / ${formatBytes(healthData.memory.total)}` : ""} />
              <StatCard icon={HardDrive} label="Disk" value={healthData.disk ? `${healthData.disk.percent}%` : "—"} color={healthData.disk?.percent > 90 ? "#DC2626" : "#0EA5E9"} sub={healthData.disk ? `${formatBytes(healthData.disk.used)} / ${formatBytes(healthData.disk.total)}` : ""} />
              <StatCard icon={Database} label="DB Size" value={formatBytes(healthData.db_size_bytes)} color="#8b5cf6" />
              <StatCard icon={Clock} label="Uptime" value={formatUptime(healthData.uptime_seconds)} color="#16A34A" />
            </div>
          ) : (
            <div className="glass-card" style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}><RefreshCw size={18} className="animate-spin" style={{ marginRight: "8px" }} /> Loading health data...</div>
          )}

          <div className="glass-card admin-service-card">
            <h3 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "12px" }}>Service Status</h3>
            <div className="admin-service-grid">
              {[
                { label: "Instagram Bot", running: healthData?.ig_bot_running },
                { label: "Telegram Service", running: healthData?.tg_service_running },
              ].map(s => (
                <div key={s.label} className={`admin-service-item ${s.running ? "running" : "stopped"}`}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: s.running ? "var(--success)" : "var(--danger)", boxShadow: s.running ? "0 0 6px var(--success)" : "none" }} />
                  <span style={{ fontSize: "13px", fontWeight: "500" }}>{s.label}</span>
                  <span style={{ fontSize: "12px", color: s.running ? "var(--success)" : "var(--text-muted)" }}>
                    {s.running ? "Running" : "Stopped"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FEATURE FLAGS / CONFIG */}
      {activeSection === "config" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="glass-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Flag size={18} />
              <h2 style={{ fontSize: "15px", fontWeight: 700 }}>Feature Flags</h2>
            </div>
            <button className="btn btn-primary" style={{ padding: "6px 14px", fontSize: "12px" }} onClick={() => setShowFlagForm(!showFlagForm)}>
              <Plus size={13} /> New Flag
            </button>
          </div>

          {showFlagForm && (
            <div className="glass-card">
              <form onSubmit={handleCreateFlag} style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
                <div className="form-group" style={{ flex: 1, minWidth: "150px" }}>
                  <label className="form-label">Key</label>
                  <input className="form-input" value={flagForm.key} onChange={e => setFlagForm({ ...flagForm, key: e.target.value })} required placeholder="e.g. maintenance_mode" />
                </div>
                <div className="form-group" style={{ minWidth: "100px" }}>
                  <label className="form-label">Value</label>
                  <select className="form-select" value={flagForm.value} onChange={e => setFlagForm({ ...flagForm, value: e.target.value })}>
                    <option value="on">On</option>
                    <option value="off">Off</option>
                  </select>
                </div>
                <div className="form-group" style={{ minWidth: "100px" }}>
                  <label className="form-label">Scope</label>
                  <select className="form-select" value={flagForm.scope} onChange={e => setFlagForm({ ...flagForm, scope: e.target.value })}>
                    <option value="global">Global</option>
                    <option value="workspace">Workspace</option>
                    <option value="user">User</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" style={{ padding: "8px 16px" }}><Save size={14} /> Create</button>
                <button type="button" className="btn btn-secondary" style={{ padding: "8px" }} onClick={() => setShowFlagForm(false)}><X size={14} /></button>
              </form>
            </div>
          )}

          <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Key</th><th>Value</th><th>Scope</th><th>Updated</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {featureFlags.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px" }}>No feature flags configured</td></tr>
                  ) : (
                    featureFlags.map(f => (
                      <tr key={f.id}>
                        <td style={{ fontWeight: "600", fontFamily: "monospace", fontSize: "12px" }}>{f.key}</td>
                        <td>
                          <span
                            className={`badge ${f.value === "on" ? "badge-sent" : "badge-failed"}`}
                            style={{ fontSize: "10px", cursor: "pointer" }}
                            onClick={() => handleToggleFlag(f)}
                          >
                            {f.value.toUpperCase()}
                          </span>
                        </td>
                        <td><span className="badge" style={{ fontSize: "10px" }}>{f.scope}{f.scope_id ? `#${f.scope_id}` : ""}</span></td>
                        <td style={{ fontSize: "11px" }}>{new Date(f.updated_at).toLocaleString()}</td>
                        <td>
                          <div style={{ display: "flex", gap: "4px" }}>
                            <button className="btn btn-secondary" style={{ padding: "4px 8px" }} onClick={() => handleToggleFlag(f)}>
                              {f.value === "on" ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                            </button>
                            <button className="btn btn-danger" style={{ padding: "4px 8px" }} onClick={() => handleDeleteFlag(f.id)}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
                    {new Date(log.timestamp.endsWith("Z") ? log.timestamp : log.timestamp + "Z").toLocaleTimeString()}
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
