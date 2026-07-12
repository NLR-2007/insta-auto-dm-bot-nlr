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
import MediaLibrary from "./components/MediaLibrary";
import NotificationCenter from "./components/NotificationCenter";
import ContactCRM from "./components/ContactCRM";
import ContentCalendar from "./components/ContentCalendar";
import LandingPage from "./components/LandingPage";
import LegalPrivacy from "./components/LegalPrivacy";
import TermsConditions from "./components/TermsConditions";
import LegalDisclaimer from "./components/LegalDisclaimer";
import {
  LayoutDashboard, UserCheck, Users, Mail,
  Settings as SettingsIcon, MessageSquare, Menu, X,
  Shield, LogOut, ChevronDown, Send,
  Image, Bell, Calendar, Contact, Sparkles, Wifi, WifiOff
} from "lucide-react";
import { getToken, getAuthUser, logout, apiFetch, getApiUrl, setApiUrl } from "./api";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("checking");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [legalPage, setLegalPage] = useState(null);

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
    if (legalPage === "privacy") return <LegalPrivacy onBack={() => setLegalPage(null)} />;
    if (legalPage === "terms") return <TermsConditions onBack={() => setLegalPage(null)} />;
    if (legalPage === "disclaimer") return <LegalDisclaimer onBack={() => setLegalPage(null)} />;
    if (showAuth) {
      return (
        <AuthPage
          onAuthSuccess={handleAuthSuccess}
          onBackToHome={() => setShowAuth(false)}
        />
      );
    }
    return <LandingPage onGetStarted={() => setShowAuth(true)} onNavigateLegal={setLegalPage} />;
  }

  // ── Nav items ────────────────────────────────────────────────────────────────
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "accounts", label: "IG Accounts", icon: UserCheck },
    { id: "targets", label: "Targets Queue", icon: Users },
    { id: "messages", label: "DM Templates", icon: Mail },
    { id: "comment-triggers", label: "Comment Triggers", icon: MessageSquare },
    { id: "contacts", label: "Contacts", icon: Contact },
    { id: "media", label: "Media Library", icon: Image },
    { id: "calendar", label: "Content Calendar", icon: Calendar },
    { id: "notifications", label: "Notifications", icon: Bell },
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
      case "contacts":         return <ContactCRM />;
      case "media":            return <MediaLibrary />;
      case "calendar":         return <ContentCalendar />;
      case "notifications":    return <NotificationCenter />;
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
      contacts: "Contacts CRM",
      media: "Media Library",
      calendar: "Content Calendar",
      notifications: "Notifications",
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
      contacts: "Manage your audience and leads",
      media: "Upload and organize media assets",
      calendar: "View scheduled content on a calendar",
      notifications: "Stay updated on platform activity",
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
          <span>Lyvora</span>
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
        <div className="brand brand-lockup">
          <div className="brand-mark"><Mail size={21} /></div>
          <div className="brand-copy"><span>Lyvora</span><small>Growth workspace</small></div>
        </div>

        <nav className="nav-menu">
          <div className="nav-section-label">Workspace</div>
          {navItems.map(({ id, label, icon: Icon, isAdmin, isTelegram }) => (
            <React.Fragment key={id}>
              {isTelegram && <div className="nav-separator"><span>TELEGRAM</span></div>}
              <button
                type="button"
                id={`nav-${id}`}
                className={`nav-item ${activeTab === id ? "active" : ""} ${isAdmin ? "nav-item-admin" : ""} ${isTelegram ? "nav-item-telegram" : ""}`}
                onClick={() => handleNavClick(id)}
                aria-current={activeTab === id ? "page" : undefined}
              >
                <Icon size={18} />
                <span>{label}</span>
                {isAdmin && <span className="nav-admin-badge">ADMIN</span>}
              </button>
            </React.Fragment>
          ))}
        </nav>

        {/* ── Sidebar footer ────────────────────────────────────────────────── */}
        <div className="sidebar-footer">
          {/* Connection dot */}
          {currentUser?.is_admin && (
            <div 
              className={`sidebar-connection ${connectionStatus}`}
              style={{ cursor: "pointer" }}
              onClick={() => {
                const currentUrl = getApiUrl();
                const newUrl = prompt("Configure Backend API Server URL (e.g. ngrok URL or localhost):", currentUrl);
                if (newUrl !== null) {
                  setApiUrl(newUrl.trim());
                  window.location.reload();
                }
              }}
              title="Click to configure backend API URL"
            >
              <div className="connection-dot" />
              <span>{connectionStatus === "active" ? "API Connected" : connectionStatus === "checking" ? "Connecting..." : "API Offline"}</span>
            </div>
          )}

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
          <div className="page-heading">
            <div className="page-eyebrow"><Sparkles size={12} /> Lyvora workspace</div>
            <h1 className="page-title">{pageTitle()}</h1>
            <p className="page-subtitle">{pageSubtitle()}</p>
          </div>

          {/* Compact user info chip (desktop) */}
          <div className="header-actions">
            <div className={`header-api-status ${connectionStatus}`} title="Backend API status">
              {connectionStatus === "active" ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span>{connectionStatus === "active" ? "Live" : connectionStatus === "checking" ? "Checking" : "Offline"}</span>
            </div>
            <button className="header-icon-btn" onClick={() => handleNavClick("notifications")} aria-label="Open notifications">
              <Bell size={17} />
            </button>
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
