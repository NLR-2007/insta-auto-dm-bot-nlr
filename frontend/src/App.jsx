import React, { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import Accounts from "./components/Accounts";
import Targets from "./components/Targets";
import Messages from "./components/Messages";
import Settings from "./components/Settings";
import CommentTriggers from "./components/CommentTriggers";
import { getApiUrl, setApiUrl, apiFetch } from "./api";
import { LayoutDashboard, UserCheck, Users, Mail, Settings as SettingsIcon, Link2, Check, RefreshCw, MessageSquare, Menu, X } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [tunnelUrlInput, setTunnelUrlInput] = useState(getApiUrl());
  const [isSaved, setIsSaved] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("checking");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNavClick = (tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  const verifyConnection = async () => {
    setConnectionStatus("checking");
    try {
      await apiFetch("/api/status");
      setConnectionStatus("active");
    } catch (e) {
      setConnectionStatus("error");
    }
  };

  useEffect(() => {
    verifyConnection();
  }, [tunnelUrlInput]);

  const handleSaveTunnel = (e) => {
    e.preventDefault();
    setApiUrl(tunnelUrlInput);
    setIsSaved(true);
    verifyConnection();
    setTimeout(() => setIsSaved(false), 2000);
  };

  const renderActiveComponent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard />;
      case "accounts":
        return <Accounts />;
      case "targets":
        return <Targets />;
      case "messages":
        return <Messages />;
      case "comment-triggers":
        return <CommentTriggers />;
      case "settings":
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app-container">
      {/* Mobile header */}
      <div className="mobile-header">
        <div className="brand" style={{ fontSize: "16px" }}>
          <Mail size={20} style={{ stroke: "url(#brand-grad)" }} />
          <span>GramGlide</span>
        </div>
        <button className="hamburger-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar overlay (mobile) */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="brand">
          <Mail size={24} style={{ stroke: "url(#brand-grad)" }} />
          <span>GramGlide</span>
        </div>

        <nav className="nav-menu">
          <div
            className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => handleNavClick("dashboard")}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </div>

          <div
            className={`nav-item ${activeTab === "accounts" ? "active" : ""}`}
            onClick={() => handleNavClick("accounts")}
          >
            <UserCheck size={18} />
            <span>IG Accounts</span>
          </div>

          <div
            className={`nav-item ${activeTab === "targets" ? "active" : ""}`}
            onClick={() => handleNavClick("targets")}
          >
            <Users size={18} />
            <span>Targets Queue</span>
          </div>

          <div
            className={`nav-item ${activeTab === "messages" ? "active" : ""}`}
            onClick={() => handleNavClick("messages")}
          >
            <Mail size={18} />
            <span>DM Templates</span>
          </div>

          <div
            className={`nav-item ${activeTab === "comment-triggers" ? "active" : ""}`}
            onClick={() => handleNavClick("comment-triggers")}
          >
            <MessageSquare size={18} />
            <span>Comment Triggers</span>
          </div>

          <div
            className={`nav-item ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => handleNavClick("settings")}
          >
            <SettingsIcon size={18} />
            <span>Settings</span>
          </div>
        </nav>

        {/* Connection status footer */}
        <div style={{ marginTop: "auto", borderTop: "1px solid var(--border-color)", paddingTop: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                background: connectionStatus === "active" ? "var(--success)" : connectionStatus === "checking" ? "var(--warning)" : "var(--danger)"
              }}
            />
            <span style={{ fontSize: "12px", color: "var(--sidebar-text)", fontWeight: "500" }}>
              {connectionStatus === "active" ? "Connected to Local API" : connectionStatus === "checking" ? "Checking connection..." : "Tunnel Link Offline"}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <main className="main-content">
        {/* Header bar */}
        <header className="page-header">
          <div>
            <h1 className="page-title" style={{ textTransform: "capitalize" }}>
              {activeTab === "messages" ? "DM Templates" : activeTab === "comment-triggers" ? "Comment Triggers" : activeTab === "accounts" ? "Instagram Accounts" : activeTab}
            </h1>
            <p className="page-subtitle">Manage automated Instagram messaging campaigns</p>
          </div>

          {/* Quick Tunnel Setting */}
          <form onSubmit={handleSaveTunnel} style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Tunnel URL..." 
                value={tunnelUrlInput}
                onChange={(e) => setTunnelUrlInput(e.target.value)}
                style={{ width: "260px", paddingLeft: "32px", height: "38px", fontSize: "13px" }}
              />
              <Link2 size={13} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            </div>
            <button 
              type="submit" 
              className={`btn ${isSaved ? "btn-primary" : "btn-secondary"}`}
              style={{ height: "38px", padding: "0 12px", fontSize: "13px" }}
            >
              {isSaved ? <Check size={14} /> : "Update Tunnel"}
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ height: "38px", padding: "0 10px" }}
              onClick={verifyConnection}
            >
              <RefreshCw size={14} />
            </button>
          </form>
        </header>

        {/* Content Render */}
        <div style={{ flex: 1 }}>
          {renderActiveComponent()}
        </div>
      </main>
      
      {/* Brand SVG gradient helper */}
      <svg width="0" height="0">
        <linearGradient id="brand-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#FB923C" />
        </linearGradient>
      </svg>
    </div>
  );
}
