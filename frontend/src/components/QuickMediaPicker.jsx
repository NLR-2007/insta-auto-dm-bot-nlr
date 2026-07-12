import React, { useEffect, useMemo, useState } from "react";
import { apiFetch, getApiUrl } from "../api";
import { Check, FileText, Film, Image, Loader2, Search, X } from "lucide-react";
import AuthenticatedMedia from "./AuthenticatedMedia";

export default function QuickMediaPicker({ open, onClose, onSelect, multiple = true }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setSelected([]);
    apiFetch("/api/media")
      .then(setFiles)
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  }, [open]);

  const visible = useMemo(() => files.filter((file) =>
    file.original_name.toLowerCase().includes(query.toLowerCase())
  ), [files, query]);

  if (!open) return null;

  const toggle = (file) => {
    if (!multiple) return setSelected([file]);
    setSelected((items) => items.some((item) => item.id === file.id)
      ? items.filter((item) => item.id !== file.id)
      : [...items, file]);
  };

  return (
    <div className="media-picker-backdrop" onMouseDown={onClose}>
      <section className="media-picker" onMouseDown={(event) => event.stopPropagation()} aria-modal="true" role="dialog" aria-label="Choose media from library">
        <header className="media-picker-header">
          <div><h3>Quick media access</h3><p>Reuse anything already uploaded to Lyvora.</p></div>
          <button type="button" className="header-icon-btn" onClick={onClose} aria-label="Close"><X size={17} /></button>
        </header>
        <div className="media-picker-search"><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your media library" autoFocus /></div>
        <div className="media-picker-grid">
          {loading ? <div className="media-picker-empty"><Loader2 className="animate-spin" /> Loading media…</div> : visible.length === 0 ? (
            <div className="media-picker-empty">No matching files. Upload files in Media Library first.</div>
          ) : visible.map((file) => {
            const isSelected = selected.some((item) => item.id === file.id);
            return <button type="button" key={file.id} className={`media-picker-item ${isSelected ? "selected" : ""}`} onClick={() => toggle(file)}>
              <div className="media-picker-thumb">
                {file.file_type === "image" ? <AuthenticatedMedia src={`${getApiUrl()}/api/media/${file.id}/file`} alt="" /> : file.file_type === "video" ? <Film /> : <FileText />}
                {isSelected && <span className="media-picker-check"><Check size={13} /></span>}
              </div>
              <span title={file.original_name}>{file.original_name}</span>
              <small>{file.file_type}</small>
            </button>;
          })}
        </div>
        <footer className="media-picker-footer">
          <span>{selected.length} selected</span>
          <div><button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button><button type="button" className="btn btn-primary" disabled={!selected.length} onClick={() => onSelect(selected)}><Image size={15} /> Use media</button></div>
        </footer>
      </section>
    </div>
  );
}
