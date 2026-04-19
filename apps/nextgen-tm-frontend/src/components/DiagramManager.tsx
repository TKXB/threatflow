import React, { useEffect, useState } from "react";
import { Trash, FolderOpen, Save, X, Loader2 } from "lucide-react";
import type { SavedDiagram, DiagramPayload } from "../hooks/useDiagramStorage";

type DiagramManagerProps = {
  open: boolean;
  mode: "save" | "open";
  onClose: () => void;
  diagrams: SavedDiagram[];
  loading: boolean;
  currentDiagramId: string | null;
  currentDiagramName: string | null;
  onRefresh: () => void;
  onSave: (name: string) => void;
  onUpdate: (id: string, name: string) => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
};

export default function DiagramManager({
  open,
  mode,
  onClose,
  diagrams,
  loading,
  currentDiagramId,
  currentDiagramName,
  onRefresh,
  onSave,
  onUpdate,
  onLoad,
  onDelete,
}: DiagramManagerProps) {
  const [name, setName] = useState(currentDiagramName || "Untitled");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(currentDiagramName || "Untitled");
      setConfirmDeleteId(null);
      onRefresh();
    }
  }, [open]);

  if (!open) return null;

  function formatDate(epoch: number) {
    if (!epoch) return "";
    const d = new Date(epoch * 1000);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
      + " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }

  const isSaveMode = mode === "save";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
      <div
        role="dialog"
        aria-modal
        style={{
          position: "relative",
          zIndex: 61,
          width: "min(520px, 92vw)",
          maxHeight: "70vh",
          background: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          boxShadow: "0 24px 64px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isSaveMode ? <Save size={18} /> : <FolderOpen size={18} />}
            <span style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>
              {isSaveMode ? "Save Diagram" : "Open Diagram"}
            </span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", padding: 4 }}><X size={18} /></button>
        </div>

        {/* Save name input */}
        {isSaveMode && (
          <div style={{ padding: "12px 16px", borderBottom: "1px solid #f3f4f6" }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 4, display: "block" }}>Diagram Name</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) {
                    if (currentDiagramId) onUpdate(currentDiagramId, name.trim());
                    else onSave(name.trim());
                  }
                }}
                placeholder="Enter diagram name"
                style={{
                  flex: 1,
                  padding: "6px 10px",
                  fontSize: 13,
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  outline: "none",
                }}
              />
              {currentDiagramId ? (
                <>
                  <button
                    onClick={() => onUpdate(currentDiagramId, name.trim() || "Untitled")}
                    style={{
                      padding: "6px 14px",
                      fontSize: 13,
                      fontWeight: 600,
                      background: "#2563eb",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    Update
                  </button>
                  <button
                    onClick={() => onSave(name.trim() || "Untitled")}
                    style={{
                      padding: "6px 14px",
                      fontSize: 13,
                      fontWeight: 600,
                      background: "#fff",
                      color: "#2563eb",
                      border: "1px solid #2563eb",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    Save as New
                  </button>
                </>
              ) : (
                <button
                  onClick={() => onSave(name.trim() || "Untitled")}
                  style={{
                    padding: "6px 14px",
                    fontSize: 13,
                    fontWeight: 600,
                    background: "#2563eb",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  Save
                </button>
              )}
            </div>
          </div>
        )}

        {/* Diagram list */}
        <div style={{ flex: 1, overflow: "auto", padding: "8px 0" }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 32, color: "#6b7280" }}>
              <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
              <span style={{ marginLeft: 8, fontSize: 13 }}>Loading...</span>
            </div>
          ) : diagrams.length === 0 ? (
            <div style={{ textAlign: "center", padding: 32, color: "#9ca3af", fontSize: 13 }}>
              No saved diagrams yet
            </div>
          ) : (
            diagrams.map((d) => (
              <div
                key={d.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "8px 16px",
                  cursor: isSaveMode ? "default" : "pointer",
                  background: d.id === currentDiagramId ? "#eff6ff" : "transparent",
                  borderLeft: d.id === currentDiagramId ? "3px solid #2563eb" : "3px solid transparent",
                }}
                onMouseEnter={(e) => { if (!isSaveMode) (e.currentTarget as HTMLDivElement).style.background = "#f9fafb"; }}
                onMouseLeave={(e) => { if (!isSaveMode) (e.currentTarget as HTMLDivElement).style.background = d.id === currentDiagramId ? "#eff6ff" : "transparent"; }}
                onClick={() => { if (!isSaveMode) onLoad(d.id); }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {d.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                    {formatDate(d.updated_at)}
                  </div>
                </div>
                {confirmDeleteId === d.id ? (
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#ef4444", marginRight: 4 }}>Delete?</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(d.id); setConfirmDeleteId(null); }}
                      style={{ padding: "2px 8px", fontSize: 11, fontWeight: 600, background: "#ef4444", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
                    >
                      Yes
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                      style={{ padding: "2px 8px", fontSize: 11, fontWeight: 600, background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 4, cursor: "pointer" }}
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(d.id); }}
                    title="Delete"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", padding: 4 }}
                  >
                    <Trash size={14} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Spinner animation */}
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
