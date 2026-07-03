import React, { useState, useEffect } from "react";
import { apiFetch } from "../api";
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle, ExternalLink, Loader2 } from "lucide-react";

const CATEGORY_CONFIG = {
  info: { icon: Info, color: "var(--info)", label: "Info" },
  success: { icon: CheckCircle, color: "var(--success)", label: "Success" },
  warning: { icon: AlertTriangle, color: "var(--warning)", label: "Warning" },
  error: { icon: AlertTriangle, color: "var(--danger)", label: "Error" },
};

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchNotifications = async () => {
    try {
      const data = await apiFetch("/api/notifications?limit=100");
      setNotifications(data);
    } catch (e) {
      console.error("Failed to load notifications:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const markRead = async (id) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      setNotifications(ns => ns.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) {
      console.error(e);
    }
  };

  const markAllRead = async () => {
    try {
      await apiFetch("/api/notifications/read-all", { method: "POST" });
      setNotifications(ns => ns.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = filter === "all"
    ? notifications
    : filter === "unread"
      ? notifications.filter(n => !n.is_read)
      : notifications.filter(n => n.category === filter);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div className="glass-card" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Bell size={20} />
          <span style={{ fontSize: "16px", fontWeight: "600" }}>Notifications</span>
          {unreadCount > 0 && (
            <span className="badge" style={{ background: "var(--accent)", color: "#fff" }}>{unreadCount} unread</span>
          )}
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {["all", "unread", "info", "success", "warning", "error"].map(f => (
            <button
              key={f}
              className={`btn ${filter === f ? "btn-primary" : "btn-secondary"}`}
              style={{ padding: "4px 12px", fontSize: "12px", textTransform: "capitalize" }}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
          {unreadCount > 0 && (
            <button className="btn btn-secondary" style={{ padding: "4px 12px", fontSize: "12px" }} onClick={markAllRead}>
              <CheckCheck size={14} /> Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="glass-card" style={{ minHeight: "200px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
            <Loader2 size={32} className="animate-spin" style={{ color: "var(--accent)" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
            <Bell size={48} style={{ opacity: 0.3, marginBottom: "16px" }} />
            <p>No notifications</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {filtered.map(n => {
              const cfg = CATEGORY_CONFIG[n.category] || CATEGORY_CONFIG.info;
              const Icon = cfg.icon;
              return (
                <div
                  key={n.id}
                  className="glass-card"
                  style={{
                    display: "flex", gap: "12px", alignItems: "flex-start", padding: "14px 16px",
                    opacity: n.is_read ? 0.7 : 1,
                    borderLeft: `3px solid ${cfg.color}`,
                    cursor: n.is_read ? "default" : "pointer",
                  }}
                  onClick={() => !n.is_read && markRead(n.id)}
                >
                  <Icon size={18} style={{ color: cfg.color, marginTop: "2px", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: "600", fontSize: "14px" }}>{n.title}</span>
                      <span style={{ fontSize: "11px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                        {new Date(n.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>{n.message}</p>
                    {n.link && (
                      <a href={n.link} style={{ fontSize: "12px", color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "6px" }}>
                        View Details <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                  {!n.is_read && (
                    <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent)", flexShrink: 0, marginTop: "6px" }} />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
