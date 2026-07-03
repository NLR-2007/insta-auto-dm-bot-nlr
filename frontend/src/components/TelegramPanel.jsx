import React, { useState, useEffect } from "react";
import { apiFetch } from "../api";
import { Send as SendIcon, Bot, Hash } from "lucide-react";
import TgBots from "./TgBots";
import TgSchedule from "./TgSchedule";
import TgModeration from "./TgModeration";

export default function TelegramPanel() {
  const [activeTab, setActiveTab] = useState("bots");
  const [channels, setChannels] = useState([]);

  const fetchChannels = async () => {
    try {
      const ch = await apiFetch("/api/tg/channels");
      setChannels(ch);
    } catch {}
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const tabs = [
    { id: "bots", label: "Bots & Channels", icon: Bot },
    { id: "schedule", label: "Schedule", icon: SendIcon },
    { id: "moderation", label: "Moderation", icon: Hash },
  ];

  return (
    <div>
      <div className="glass-card" style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "rgba(14, 165, 233, 0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#0EA5E9" }}>
          <SendIcon size={18} />
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: "15px" }}>Telegram Automation</p>
          <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            {channels.length} channel(s) connected — service controlled by admin
          </p>
        </div>
      </div>

      <div className="tg-tab-bar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
              padding: "10px", border: "none", borderRadius: "8px", cursor: "pointer",
              fontSize: "13px", fontWeight: 600, fontFamily: "inherit", transition: "all 0.2s",
              background: activeTab === tab.id ? "var(--bg-secondary)" : "transparent",
              color: activeTab === tab.id ? "#2563EB" : "var(--text-muted)",
            }}
          >
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "bots" && <TgBots />}
      {activeTab === "schedule" && <TgSchedule />}
      {activeTab === "moderation" && <TgModeration />}
    </div>
  );
}
