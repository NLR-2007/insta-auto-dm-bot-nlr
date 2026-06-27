import React, { useState, useEffect } from "react";
import { apiFetch, getApiUrl, getToken } from "../api";
import { Trash2, Upload, FileText, Search, X, Loader2, ArrowRight, UserCheck } from "lucide-react";

export default function Targets() {
  const [targets, setTargets] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [singleInput, setSingleInput] = useState("");

  const fetchTargets = async () => {
    try {
      const [data, accts] = await Promise.all([
        apiFetch("/api/targets"),
        apiFetch("/api/accounts"),
      ]);
      setTargets(data);
      setAccounts(accts);
      if (!accountId && accts.length > 0) {
        setAccountId(String(accts[0].id));
      }
    } catch (e) {
      console.error("Failed to load targets:", e);
    }
  };

  useEffect(() => {
    fetchTargets();
  }, []);

  const handleAddSingle = async (e) => {
    e.preventDefault();
    if (!singleInput.trim() || !accountId) {
      alert("Please enter a username and select an account.");
      return;
    }
    setLoading(true);
    try {
      const handle = singleInput.trim().replace("@", "");
      await apiFetch("/api/targets", {
        method: "POST",
        body: JSON.stringify({ usernames: [handle], account_id: parseInt(accountId) }),
      });
      setSingleInput("");
      fetchTargets();
    } catch (e) {
      alert(e.message || "Failed to add target.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !accountId) {
      alert("Please select an account before uploading.");
      return;
    }
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    const token = getToken();
    try {
      const response = await fetch(`${getApiUrl()}/api/targets/upload?account_id=${accountId}`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "ngrok-skip-browser-warning": "69420",
        },
        body: formData,
      });
      if (!response.ok) throw new Error("Upload failed");
      const resData = await response.json();
      alert(resData.message || "Targets imported successfully!");
      fetchTargets();
    } catch (err) {
      alert(err.message || "Failed to upload file.");
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  const handleDeleteTarget = async (id) => {
    try {
      await apiFetch(`/api/targets/${id}`, { method: "DELETE" });
      fetchTargets();
    } catch (e) {
      alert(e.message || "Failed to delete target.");
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to clear the entire targets queue?")) return;
    try {
      await apiFetch("/api/targets", { method: "DELETE" });
      fetchTargets();
    } catch (e) {
      alert(e.message || "Failed to clear queue.");
    }
  };

  // Filter & Search Logic
  const filteredTargets = targets.filter((t) => {
    const matchesSearch = t.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Upper upload/adding row */}
      <div className="content-grid cols-2">
        {/* Manual Add */}
        <div className="glass-card">
          <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px" }}>Add Single Target</h3>
          <div className="form-group" style={{ marginBottom: "12px" }}>
            <label className="form-label">Send From Account</label>
            <select
              className="form-input"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              style={{ height: "42px" }}
            >
              <option value="">-- Select Account --</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>@{a.username} ({a.status})</option>
              ))}
            </select>
          </div>
          <form onSubmit={handleAddSingle} style={{ display: "flex", gap: "10px" }}>
            <input
              type="text"
              className="form-input"
              placeholder="Instagram Handle (e.g. michelle_photos)"
              value={singleInput}
              onChange={(e) => setSingleInput(e.target.value)}
              disabled={loading}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary" disabled={loading || !accountId}>
              Enqueue
            </button>
          </form>
        </div>

        {/* File Bulk Upload */}
        <div className="glass-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "4px" }}>Bulk Import Queue</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>
              Upload a text file or CSV containing one username per line.
            </p>
          </div>
          <label className="btn btn-secondary" style={{ cursor: "pointer", position: "relative" }}>
            {uploading ? (
              <>
                <Loader2 className="animate-spin" size={16} /> Uploading...
              </>
            ) : (
              <>
                <Upload size={16} /> Import File
              </>
            )}
            <input 
              type="file" 
              accept=".txt,.csv" 
              style={{ display: "none" }} 
              onChange={handleFileUpload} 
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* Main Table view */}
      <div className="glass-card">
        {/* Filtering Options */}
        <div className="targets-filter-row" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", marginBottom: "20px" }}>
          <div className="filter-buttons" style={{ display: "flex", gap: "8px" }}>
            {["all", "pending", "sending", "sent", "failed"].map((status) => (
              <button 
                key={status}
                className={`btn ${filterStatus === status ? "btn-primary" : "btn-secondary"}`}
                style={{ padding: "8px 16px", fontSize: "12px", textTransform: "capitalize" }}
                onClick={() => setFilterStatus(status)}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="targets-search-row" style={{ display: "flex", gap: "12px" }}>
            <div style={{ position: "relative" }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="Search username..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: "36px", minWidth: "160px" }}
              />
              <Search size={14} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            </div>

            {targets.length > 0 && (
              <button className="btn btn-danger" style={{ padding: "8px 16px", fontSize: "12px" }} onClick={handleClearAll}>
                Clear Queue
              </button>
            )}
          </div>
        </div>

        {/* Table data */}
        <div className="table-container">
          {filteredTargets.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
              No targets found matching current criteria.
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Target Profile</th>
                  <th>Delivery Status</th>
                  <th>Last Interaction</th>
                  <th>Details / Error</th>
                  <th style={{ width: "60px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTargets.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <a 
                        href={`https://instagram.com/${item.username}`} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ color: "var(--accent)", textDecoration: "underline", fontWeight: "500" }}
                      >
                        @{item.username}
                      </a>
                    </td>
                    <td>
                      <span className={`badge badge-${item.status}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>
                      {item.sent_at ? new Date(item.sent_at).toLocaleString() : "Never"}
                    </td>
                    <td style={{ color: item.status === "failed" ? "var(--danger)" : "var(--text-secondary)", fontSize: "13px" }}>
                      {item.status === "failed" && item.error_message}
                      {item.status === "sent" && (
                        <span style={{ fontStyle: "italic" }}>
                          "{item.message_sent?.substring(0, 40)}..."
                        </span>
                      )}
                      {item.status === "pending" && "Enqueued"}
                      {item.status === "sending" && "Executing via browser..."}
                    </td>
                    <td>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: "6px 10px", borderColor: "transparent" }}
                        onClick={() => handleDeleteTarget(item.id)}
                      >
                        <Trash2 size={14} style={{ color: "var(--text-muted)" }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
