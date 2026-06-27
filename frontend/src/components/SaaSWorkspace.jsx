import React, { useEffect, useState } from "react";
import { apiFetch } from "../api";
import { Building2, Rocket, Server, ShieldCheck, Plus, RefreshCcw } from "lucide-react";

export default function SaaSWorkspace() {
  const [me, setMe] = useState(null);
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [runners, setRunners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runnerName, setRunnerName] = useState("Local Creator Runner");
  const [runnerToken, setRunnerToken] = useState("");
  const [campaignName, setCampaignName] = useState("Comment-to-DM Campaign");

  const load = async () => {
    setLoading(true);
    try {
      const [meData, planData, subscriptionData, campaignData, runnerData] = await Promise.all([
        apiFetch("/api/me"),
        apiFetch("/api/plans"),
        apiFetch("/api/billing/subscription"),
        apiFetch("/api/campaigns"),
        apiFetch("/api/runners"),
      ]);
      setMe(meData);
      setPlans(planData);
      setSubscription(subscriptionData);
      setCampaigns(campaignData);
      setRunners(runnerData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createCampaign = async () => {
    if (!campaignName.trim()) return;
    await apiFetch("/api/campaigns", {
      method: "POST",
      body: JSON.stringify({
        name: campaignName.trim(),
        channel: "instagram",
        mode: "comment_trigger",
        consent_source: "comment_keyword",
        daily_limit: 30,
      }),
    });
    setCampaignName("");
    load();
  };

  const createRunner = async () => {
    if (!runnerName.trim()) return;
    const data = await apiFetch("/api/runners", {
      method: "POST",
      body: JSON.stringify({
        name: runnerName.trim(),
        runner_type: "local",
      }),
    });
    setRunnerToken(data.token);
    load();
  };

  const workspace = me?.workspace;
  const activePlan = plans.find((p) => p.slug === workspace?.plan_slug);

  return (
    <div className="content-grid" style={{ gridTemplateColumns: "1.1fr 0.9fr", gap: "20px" }}>
      <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "flex-start" }}>
          <div>
            <h3 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "18px", fontWeight: 700 }}>
              <Building2 size={20} style={{ color: "var(--accent)" }} />
              SaaS Workspace
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "4px" }}>
              Multi-tenant foundation for plans, campaigns, and creator-owned runners.
            </p>
          </div>
          <button className="btn btn-secondary" onClick={load} disabled={loading}>
            <RefreshCcw size={14} /> Refresh
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "12px" }}>
          <div className="stat-card">
            <span className="stat-label">Workspace</span>
            <strong className="stat-value" style={{ fontSize: "18px" }}>{workspace?.name || "Loading..."}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Plan</span>
            <strong className="stat-value" style={{ fontSize: "18px", textTransform: "capitalize" }}>{workspace?.plan_slug || "-"}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Billing</span>
            <strong className="stat-value" style={{ fontSize: "18px", textTransform: "capitalize" }}>{subscription?.status || "-"}</strong>
          </div>
        </div>

        <div style={{ border: "1px solid var(--border-color)", borderRadius: "8px", padding: "14px" }}>
          <h4 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 700 }}>
            <ShieldCheck size={16} style={{ color: "var(--success)" }} />
            Current Plan Limits
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px", marginTop: "12px" }}>
            {activePlan &&
              Object.entries(activePlan.limits).map(([key, value]) => (
                <div key={key} style={{ background: "rgba(255,255,255,0.03)", borderRadius: "8px", padding: "10px" }}>
                  <div style={{ color: "var(--text-muted)", fontSize: "11px", textTransform: "capitalize" }}>{key.replaceAll("_", " ")}</div>
                  <div style={{ color: "var(--text-primary)", fontWeight: 700, marginTop: "4px" }}>{value}</div>
                </div>
              ))}
          </div>
        </div>

        <div style={{ border: "1px solid var(--border-color)", borderRadius: "8px", padding: "14px" }}>
          <h4 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 700 }}>
            <Rocket size={16} style={{ color: "var(--accent)" }} />
            Campaigns
          </h4>
          <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
            <input className="form-input" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
            <button className="btn btn-primary" onClick={createCampaign}>
              <Plus size={14} /> Add
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "12px" }}>
            {campaigns.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>No SaaS campaigns yet.</p>}
            {campaigns.map((campaign) => (
              <div key={campaign.id} style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border-color)", paddingTop: "8px" }}>
                <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{campaign.name}</span>
                <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>{campaign.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <h3 style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "18px", fontWeight: 700 }}>
          <Server size={20} style={{ color: "var(--accent)" }} />
          Local Runner
        </h3>
        <p style={{ color: "var(--text-muted)", fontSize: "12px", lineHeight: 1.5 }}>
          This is the safer SaaS path for creators without Meta API access: the cloud dashboard manages campaigns while a user-owned runner can process local automation.
        </p>
        <div style={{ display: "flex", gap: "8px" }}>
          <input className="form-input" value={runnerName} onChange={(e) => setRunnerName(e.target.value)} />
          <button className="btn btn-primary" onClick={createRunner}>
            <Plus size={14} /> Token
          </button>
        </div>
        {runnerToken && (
          <div style={{ border: "1px solid var(--border-color)", borderRadius: "8px", padding: "12px", background: "rgba(16,185,129,0.06)" }}>
            <div style={{ color: "var(--success)", fontWeight: 700, fontSize: "12px", marginBottom: "8px" }}>Runner token created. Store it now.</div>
            <code style={{ color: "var(--text-primary)", fontSize: "11px", overflowWrap: "anywhere" }}>{runnerToken}</code>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {runners.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>No runners yet.</p>}
          {runners.map((runner) => (
            <div key={runner.id} style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border-color)", paddingTop: "8px" }}>
              <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{runner.name}</span>
              <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>{runner.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
