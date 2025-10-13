import { useMemo, useRef, useState, useCallback, type MouseEvent as ReactMouseEvent } from "react";
import { Bot, X, Download as DownloadIcon } from "lucide-react";

type Risk = {
  id?: string;
  title?: string;
  description?: string;
  severity?: string;
  confidence?: number;
  score?: number;
  severityNumeric?: number;
  nodeIds?: string[];
};

type Props = {
  risks: Risk[] | null;
  loading?: boolean;
  onAccept: (r: Risk) => void;
  onDismiss: (index: number) => void;
  onExportSingle?: (r: Risk) => void;
  onClose?: () => void;
};

export default function LlmRisksPanel({ risks, loading, onAccept, onDismiss, onExportSingle, onClose }: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [heightPx, setHeightPx] = useState<number | null>(null);
  const isResizingRef = useRef(false);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);

  const rows = useMemo(() => (risks || []).slice().sort((a, b) => (b.severityNumeric || 0) - (a.severityNumeric || 0) || (b.score || 0) - (a.score || 0)), [risks]);

  const onResizeMouseDownTop = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    isResizingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = rect.height;
    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = startYRef.current - ev.clientY; // drag up to increase
      const next = Math.max(160, Math.round(startHeightRef.current + delta));
      setHeightPx(next);
    };
    const onMouseUp = () => {
      isResizingRef.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

  const onResizeDoubleClickTop = useCallback(() => setHeightPx(null), []);

  if ((!rows || rows.length === 0) && !loading) return null;

  return (
    <div
      ref={wrapperRef}
      style={{ position: "relative", flex: heightPx === null ? 1 : undefined, height: heightPx === null ? undefined : heightPx, minHeight: 160, background: "#fff", borderTop: "1px solid #e5e7eb", overflow: "hidden" }}
    >
      <div
        aria-label="Resize LLM Risks"
        title="Drag top border to resize (double-click to reset)"
        onMouseDown={onResizeMouseDownTop}
        onDoubleClick={onResizeDoubleClickTop}
        style={{ position: "absolute", left: 0, right: 0, top: 0, height: 8, cursor: "row-resize", background: "transparent", zIndex: 2 }}
      />
      <div style={{ padding: 8, display: "flex", alignItems: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#111827", fontWeight: 600 }}>
          <Bot size={16} />
          <span>LLM Risks {rows && rows.length ? `(${rows.length})` : ""}</span>
        </div>
        <span style={{ flex: 1 }} />
        {onClose && (
          <button title="Close" onClick={() => onClose()} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 28, padding: "0 8px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 12 }}>
            <X size={14} /> Close
          </button>
        )}
      </div>
      <div style={{ maxHeight: "calc(100% - 40px)", overflow: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>Title</th>
              <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>Severity</th>
              <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>Confidence</th>
              <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>Score</th>
              <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>Nodes</th>
              <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={`rk-${idx}`}>
                <td style={{ padding: "6px 8px", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ fontWeight: 600, color: "#111827" }}>{r.title}</div>
                  <div style={{ color: "#6b7280", marginTop: 2 }}>{r.description}</div>
                </td>
                <td style={{ padding: "6px 8px", borderBottom: "1px solid #f3f4f6" }}>{String(r.severity || "").toUpperCase()}</td>
                <td style={{ padding: "6px 8px", borderBottom: "1px solid #f3f4f6" }}>{typeof r.confidence === "number" ? r.confidence.toFixed(2) : "-"}</td>
                <td style={{ padding: "6px 8px", borderBottom: "1px solid #f3f4f6" }}>{typeof r.score === "number" ? r.score.toFixed(2) : "-"}</td>
                <td style={{ padding: "6px 8px", borderBottom: "1px solid #f3f4f6", maxWidth: 280, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {(r.nodeIds || []).join(" → ")}
                </td>
                <td style={{ padding: "6px 8px", borderBottom: "1px solid #f3f4f6" }}>
                  <button onClick={() => onAccept(r)} style={{ height: 28, padding: "0 8px", borderRadius: 6, border: "1px solid #10b981", background: "#10b981", color: "#fff", cursor: "pointer", fontSize: 12 }}>Accept</button>
                  <span style={{ width: 6, display: "inline-block" }} />
                  <button onClick={() => onDismiss(idx)} style={{ height: 28, padding: "0 8px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 12 }}>Dismiss</button>
                  <span style={{ width: 6, display: "inline-block" }} />
                  <button title="Export single" onClick={() => onExportSingle && onExportSingle(r)} style={{ height: 28, padding: "0 8px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <DownloadIcon size={14} /> Export
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loading && (
        <div aria-live="polite" role="status" style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" aria-label="Loading">
              <circle cx="12" cy="12" r="10" stroke="#e5e7eb" strokeWidth="4" fill="none" />
              <path d="M12 2 a10 10 0 0 1 10 10" stroke="#2563eb" strokeWidth="4" fill="none">
                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
              </path>
            </svg>
            <div style={{ fontSize: 13, color: "#374151" }}>Generating risks...</div>
          </div>
        </div>
      )}
    </div>
  );
}


