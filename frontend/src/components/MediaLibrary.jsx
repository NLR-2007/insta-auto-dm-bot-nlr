import React, { useState, useEffect, useCallback } from "react";
import { apiFetch, getApiUrl, getToken } from "../api";
import {
  Upload, Trash2, Image, Film, FileText, Music, FolderOpen,
  Search, Grid, List, Download, Eye, Loader2, X
} from "lucide-react";
import AuthenticatedMedia from "./AuthenticatedMedia";

export default function MediaLibrary() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState({ folder: "", file_type: "" });
  const [viewMode, setViewMode] = useState("grid");
  const [preview, setPreview] = useState(null);
  const [presentationPreview, setPresentationPreview] = useState(null);
  const [previewError, setPreviewError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      let url = "/api/media";
      const params = [];
      if (filter.folder) params.push(`folder=${filter.folder}`);
      if (filter.file_type) params.push(`file_type=${filter.file_type}`);
      if (params.length) url += "?" + params.join("&");
      const data = await apiFetch(url);
      setFiles(data);
    } catch (e) {
      console.error("Failed to fetch media:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFiles(); }, [filter.folder, filter.file_type]);

  const handleUpload = async (fileList) => {
    setUploading(true);
    try {
      for (const file of fileList) {
        const formData = new FormData();
        formData.append("file", file);
        const url = `${getApiUrl()}/api/media/upload?folder=${filter.folder || "general"}`;
        const token = getToken();
        const response = await fetch(url, {
          method: "POST",
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: formData,
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(`${file.name}: ${payload.detail || `Upload failed (${response.status})`}`);
        }
      }
      await fetchFiles();
    } catch (e) {
      alert(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this file?")) return;
    try {
      await apiFetch(`/api/media/${id}`, { method: "DELETE" });
      setFiles(files.filter(f => f.id !== id));
      if (preview?.id === id) setPreview(null);
    } catch (e) {
      alert(e.message || "Delete failed");
    }
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) handleUpload(Array.from(e.dataTransfer.files));
  }, [filter.folder]);

  const typeIcon = (type) => {
    switch (type) {
      case "image": return <Image size={20} />;
      case "video": return <Film size={20} />;
      case "audio": return <Music size={20} />;
      default: return <FileText size={20} />;
    }
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const fileUrl = (id) => `${getApiUrl()}/api/media/${id}/file`;

  useEffect(() => {
    if (!preview?.original_name?.toLowerCase().endsWith(".pptx")) { setPresentationPreview(null); setPreviewError(""); return; }
    setPresentationPreview(null); setPreviewError("");
    apiFetch(`/api/media/${preview.id}/presentation-preview`)
      .then(setPresentationPreview)
      .catch((error) => setPreviewError(error.message));
  }, [preview]);

  const handleDownload = async (file) => {
    try {
      const response = await fetch(fileUrl(file.id), { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!response.ok) throw new Error("Download failed");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = file.original_name;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) { alert(error.message); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Toolbar */}
      <div className="glass-card" style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <select className="form-select" value={filter.file_type} onChange={e => setFilter(f => ({ ...f, file_type: e.target.value }))} style={{ minWidth: "120px" }}>
            <option value="">All Types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="audio">Audio</option>
            <option value="document">Documents</option>
          </select>
          <select className="form-select" value={filter.folder} onChange={e => setFilter(f => ({ ...f, folder: e.target.value }))} style={{ minWidth: "120px" }}>
            <option value="">All Folders</option>
            <option value="general">General</option>
            <option value="instagram">Instagram</option>
            <option value="telegram">Telegram</option>
            <option value="templates">Templates</option>
          </select>
          <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>{files.length} files</span>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <button className={`btn ${viewMode === "grid" ? "btn-primary" : "btn-secondary"}`} style={{ padding: "6px 10px" }} onClick={() => setViewMode("grid")}><Grid size={16} /></button>
          <button className={`btn ${viewMode === "list" ? "btn-primary" : "btn-secondary"}`} style={{ padding: "6px 10px" }} onClick={() => setViewMode("list")}><List size={16} /></button>
          <label className="btn btn-primary" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            Upload
            <input type="file" multiple accept="image/*,video/*,audio/*,.pdf,.ppt,.pptx,.doc,.docx,.txt,.csv" hidden onChange={e => handleUpload(Array.from(e.target.files))} />
          </label>
        </div>
      </div>

      {/* Drop Zone + Grid/List */}
      <div
        className="glass-card"
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        style={{
          minHeight: "300px",
          border: dragOver ? "2px dashed var(--accent)" : "2px dashed transparent",
          transition: "border-color 0.2s",
        }}
      >
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
            <Loader2 size={32} className="animate-spin" style={{ color: "var(--accent)" }} />
          </div>
        ) : files.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-muted)" }}>
            <Upload size={48} style={{ marginBottom: "16px", opacity: 0.4 }} />
            <p style={{ fontSize: "16px", marginBottom: "8px" }}>No files yet</p>
            <p style={{ fontSize: "13px" }}>Drag and drop files here or click Upload</p>
          </div>
        ) : viewMode === "grid" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px" }}>
            {files.map(f => (
              <div key={f.id} className="glass-card" style={{ padding: "0", overflow: "hidden", cursor: "pointer", transition: "transform 0.15s", position: "relative" }}>
                <div
                  style={{ height: "140px", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-tertiary)" }}
                  onClick={() => setPreview(f)}
                >
                  {f.file_type === "image" ? (
                    <AuthenticatedMedia src={fileUrl(f.id)} alt={f.original_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ color: "var(--text-muted)" }}>{typeIcon(f.file_type)}</div>
                  )}
                </div>
                <div style={{ padding: "10px" }}>
                  <p style={{ fontSize: "12px", fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.original_name}</p>
                  <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>{formatSize(f.file_size)}</p>
                </div>
                <button
                  className="btn btn-danger"
                  style={{ position: "absolute", top: "6px", right: "6px", padding: "4px", borderRadius: "50%", minWidth: "unset" }}
                  onClick={(e) => { e.stopPropagation(); handleDelete(f.id); }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <table className="data-table" style={{ width: "100%" }}>
            <thead>
              <tr><th>Name</th><th>Type</th><th>Size</th><th>Folder</th><th>Uploaded</th><th></th></tr>
            </thead>
            <tbody>
              {files.map(f => (
                <tr key={f.id}>
                  <td style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {typeIcon(f.file_type)}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }}>{f.original_name}</span>
                  </td>
                  <td><span className="badge">{f.file_type}</span></td>
                  <td>{formatSize(f.file_size)}</td>
                  <td>{f.folder}</td>
                  <td>{new Date(f.created_at).toLocaleDateString()}</td>
                  <td style={{ display: "flex", gap: "6px" }}>
                    <button className="btn btn-secondary" style={{ padding: "4px 8px" }} onClick={() => setPreview(f)}><Eye size={14} /></button>
                    <button className="btn btn-danger" style={{ padding: "4px 8px" }} onClick={() => handleDelete(f.id)}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Preview Modal */}
      {preview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setPreview(null)}>
          <div className="glass-card" style={{ maxWidth: "700px", width: "90%", maxHeight: "80vh", overflow: "auto", position: "relative" }} onClick={e => e.stopPropagation()}>
            <button className="btn btn-secondary" style={{ position: "absolute", top: "12px", right: "12px", padding: "4px" }} onClick={() => setPreview(null)}><X size={18} /></button>
            <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "16px", paddingRight: "32px" }}>{preview.original_name}</h3>
            {preview.file_type === "image" && (
              <AuthenticatedMedia src={fileUrl(preview.id)} alt={preview.original_name} style={{ width: "100%", borderRadius: "8px" }} />
            )}
            {preview.file_type === "video" && (
              <AuthenticatedMedia as="video" src={fileUrl(preview.id)} controls style={{ width: "100%", borderRadius: "8px" }} />
            )}
            {preview.file_type === "audio" && (
              <AuthenticatedMedia as="audio" src={fileUrl(preview.id)} controls style={{ width: "100%" }} />
            )}
            {preview.file_type === "document" && preview.original_name.toLowerCase().endsWith(".pptx") && (
              <div className="ppt-preview">
                {!presentationPreview && !previewError && <div className="media-picker-empty"><Loader2 className="animate-spin" size={18}/> Preparing slide preview…</div>}
                {previewError && <div className="auth-alert auth-alert-error">{previewError}</div>}
                {presentationPreview && <><div className="ppt-preview-meta">{presentationPreview.slide_count} slides · Text preview</div><div className="ppt-slide-grid">{presentationPreview.slides.map((slide) => <article key={slide.number} className="ppt-slide"><span>Slide {slide.number}</span><div>{slide.text.length ? slide.text.map((line, index) => <p key={index}>{line}</p>) : <p className="ppt-empty">No text on this slide</p>}</div></article>)}</div></>}
              </div>
            )}
            {preview.file_type === "document" && !preview.original_name.toLowerCase().endsWith(".pptx") && (
              <div style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
                <FileText size={48} />
                <p style={{ marginTop: "12px" }}>Preview not available for this file type</p>
              </div>
            )}
            <div style={{ marginTop: "16px", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => handleDownload(preview)} className="btn btn-primary">
                <Download size={14} /> Download
              </button>
              <button className="btn btn-danger" onClick={() => { handleDelete(preview.id); }}><Trash2 size={14} /> Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
