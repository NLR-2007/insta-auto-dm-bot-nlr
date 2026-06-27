import React, { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import Accounts from "./components/Accounts";
import Targets from "./components/Targets";
import Messages from "./components/Messages";
import Settings from "./components/Settings";
import CommentTriggers from "./components/CommentTriggers";
import AdminPanel from "./components/AdminPanel";
import AuthPage from "./components/AuthPage";
import TelegramPanel from "./components/TelegramPanel";
import LandingPage from "./components/LandingPage";
import {
  LayoutDashboard, UserCheck, Users, Mail,
  Settings as SettingsIcon, MessageSquare, Menu, X,
  Shield, LogOut, ChevronDown, Send
} from "lucide-react";
import { getToken, getAuthUser, logout, apiFetch } from "./api";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("checking");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  // ── Check existing session on mount ──────────────────────────────────────────
  useEffect(() => {
    const token = getToken();
    const user = getAuthUser();
    if (token && user) {
      setIsAuthenticated(true);
      setCurrentUser(user);
      verifyConnection();
    }
  }, []);

  const verifyConnection = async () => {
    setConnectionStatus("checking");
    try {
      await apiFetch("/");
      setConnectionStatus("active");
    } catch {
      setConnectionStatus("error");
    }
  };

  const handleAuthSuccess = (data) => {
    setCurrentUser({ username: data.username, is_admin: data.is_admin });
    setIsAuthenticated(true);
    verifyConnection();
    setActiveTab("dashboard");
  };

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();         // clears localStorage + reloads
  };

  const handleNavClick = (tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
    setUserMenuOpen(false);
  };

  // ── Auth gate ────────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    if (showAuth) {
      return (
        <AuthPage
          onAuthSuccess={handleAuthSuccess}
          onBackToHome={() => setShowAuth(false)}
        />
      );
    }
    return <LandingPage onGetStarted={() => setShowAuth(true)} />;
  }

  // ── Nav items ────────────────────────────────────────────────────────────────
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "accounts", label: "IG Accounts", icon: UserCheck },
    { id: "targets", label: "Targets Queue", icon: Users },
    { id: "messages", label: "DM Templates", icon: Mail },
    { id: "comment-triggers", label: "Comment Triggers", icon: MessageSquare },
    { id: "telegram", label: "Telegram", icon: Send, isTelegram: true },
    { id: "settings", label: "Settings", icon: SettingsIcon },
    ...(currentUser?.is_admin
      ? [
          { id: "admin", label: "Admin Panel", icon: Shield, isAdmin: true },
        ]
      : []),
  ];

  const renderActiveComponent = () => {
    switch (activeTab) {
      case "dashboard":        return <Dashboard />;
      case "accounts":         return <Accounts />;
      case "targets":          return <Targets />;
      case "messages":         return <Messages />;
      case "comment-triggers": return <CommentTriggers />;
      case "telegram":         return <TelegramPanel />;
      case "settings":         return <Settings />;
      case "admin":            return currentUser?.is_admin ? <AdminPanel /> : <Dashboard />;
      default:                 return <Dashboard />;
    }
  };

  const pageTitle = () => {
    const map = {
      dashboard: "Dashboard",
      accounts: "Instagram Accounts",
      targets: "Targets Queue",
      messages: "DM Templates",
      "comment-triggers": "Comment Triggers",
      telegram: "Telegram Automation",
      settings: "Settings",
      admin: "Admin Panel",
    };
    return map[activeTab] || activeTab;
  };

  const pageSubtitle = () => {
    const map = {
      dashboard: "Overview of your automation activity",
      accounts: "Manage connected Instagram accounts",
      targets: "Queue of users to send DMs to",
      messages: "Create and manage message templates",
      "comment-triggers": "Auto-DM users who comment on posts",
      telegram: "Manage bots, schedule posts & moderate channels",
      settings: "Configure bot behavior and limits",
      admin: "System management & monitoring",
    };
    return map[activeTab] || "";
  };

  return (
    <div className="app-container">
      {/* SVG gradient helper (must stay for brand icon) */}
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <linearGradient id="brand-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#60A5FA" />
          </linearGradient>
        </defs>
      </svg>

      {/* ── Mobile header ─────────────────────────────────────────────────────── */}
      <div className="mobile-header">
        <div className="brand" style={{ fontSize: "16px" }}>
          <Mail size={20} style={{ stroke: "url(#brand-grad)" }} />
          <span>GramGlide</span>
        </div>
        <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* ── Sidebar overlay (mobile) ───────────────────────────────────────────── */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Sidebar ───────────────────────────────────────────────────────────── */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <Mail size={24} style={{ stroke: "url(#brand-grad)" }} />
          <span>GramGlide</span>
        </div>

        <nav className="nav-menu">
          {navItems.map(({ id, label, icon: Icon, isAdmin, isTelegram }) => (
            <React.Fragment key={id}>
              {isTelegram && <div className="nav-separator"><span>TELEGRAM</span></div>}
              <div
                id={`nav-${id}`}
                className={`nav-item ${activeTab === id ? "active" : ""} ${isAdmin ? "nav-item-admin" : ""} ${isTelegram ? "nav-item-telegram" : ""}`}
                onClick={() => handleNavClick(id)}
              >
                <Icon size={18} />
                <span>{label}</span>
                {isAdmin && <span className="nav-admin-badge">ADMIN</span>}
              </div>
            </React.Fragment>
          ))}
        </nav>

        {/* ── Sidebar footer ────────────────────────────────────────────────── */}
        <div className="sidebar-footer">
          {/* Connection dot */}
          <div className="sidebar-connection">
            <div
              className="connection-dot"
              style={{
                background:
                  connectionStatus === "active"
                    ? "var(--success)"
                    : connectionStatus === "checking"
                    ? "var(--warning)"
                    : "var(--danger)",
                boxShadow:
                  connectionStatus === "active"
                    ? "0 0 6px var(--success)"
                    : "none",
              }}
            />
            <span>
              {connectionStatus === "active"
                ? "API Connected"
                : connectionStatus === "checking"
                ? "Connecting..."
                : "API Offline"}
            </span>
          </div>

          {/* User menu */}
          <div className="sidebar-user" onClick={() => setUserMenuOpen(!userMenuOpen)}>
            <div className="sidebar-avatar">
              {currentUser?.username?.[0]?.toUpperCase() || "U"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="sidebar-username">{currentUser?.username}</p>
              <p className="sidebar-role">
                {currentUser?.is_admin ? "Administrator" : "User"}
              </p>
            </div>
            <ChevronDown size={14} style={{ color: "var(--sidebar-text)", transition: "transform 0.2s", transform: userMenuOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
          </div>

          {userMenuOpen && (
            <div className="user-menu-popup">
              <button id="logout-btn" className="user-menu-item danger" onClick={handleLogout}>
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────────────────────── */}
      <main className="main-content">
        {/* Page header — no tunnel input visible to users */}
        <header className="page-header">
          <div>
            <h1 className="page-title">{pageTitle()}</h1>
            <p className="page-subtitle">{pageSubtitle()}</p>
          </div>

          {/* Compact user info chip (desktop) */}
          <div className="header-user-chip">
            <div className="chip-avatar">{currentUser?.username?.[0]?.toUpperCase()}</div>
            <span>{currentUser?.username}</span>
            {currentUser?.is_admin && (
              <span className="chip-admin-badge">
                <Shield size={10} /> Admin
              </span>
            )}
            <button id="header-logout-btn" className="chip-logout-btn" onClick={handleLogout} title="Sign out">
              <LogOut size={13} />
            </button>
          </div>
        </header>

        {/* Active view */}
        <div style={{ flex: 1 }}>
          {renderActiveComponent()}
        </div>
      </main>
    </div>
  );
}
