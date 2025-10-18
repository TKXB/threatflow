import { useMemo, useRef, useState, useCallback, type MouseEvent as ReactMouseEvent } from "react";
import { Bot, X } from "lucide-react";
import ThreatEditorDialog from "./ThreatEditorDialog";
import LlmRiskRow from "./LlmRiskRow";
import type { ThreatInput, ThreatPriority } from "../types/threats";

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
  // 兼容旧行为：如果未提供新回调，则直接调用旧 onAccept
  onAccept?: (r: Risk) => void;
  onCreateThreatFromRisk?: (input: ThreatInput) => Promise<{ threatId: string }>;
  onUndoAccept?: (sourceRiskId: string, threatId: string) => Promise<void>;
  onDismiss: (index: number) => void;
  onExportSingle?: (r: Risk) => void;
  onClose?: () => void;
  onHoverRisk?: (nodeIds: string[] | null) => void;
  onFocusRisk?: (nodeIds: string[] | null) => void;
};

export default function LlmRisksPanel({ risks, loading, onAccept, onCreateThreatFromRisk, onUndoAccept, onDismiss, onExportSingle, onClose, onHoverRisk, onFocusRisk }: Props) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [heightPx, setHeightPx] = useState<number | null>(null);
  const isResizingRef = useRef(false);
  const startYRef = useRef<number>(0);
  const startHeightRef = useRef<number>(0);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogInitial, setDialogInitial] = useState<Partial<ThreatInput> & { nodeIds?: string[]; sourceRiskId?: string }>({});
  const [toast, setToast] = useState<{ message: string; action?: { label: string; onClick: () => void } } | null>(null);

  const rows = useMemo(() => (risks || []).slice().sort((a, b) => (b.severityNumeric || 0) - (a.severityNumeric || 0) || (b.score || 0) - (a.score || 0)), [risks]);
  const [activeTab, setActiveTab] = useState<"suggested" | "accepted" | "dismissed">("suggested");
  const filteredRows = useMemo(() => {
    // 暂时没有持久状态区分，先全部显示在“建议”；后续由上层传入状态后生效
    if (activeTab === "suggested") return rows;
    return [];
  }, [rows, activeTab]);

  const mapSeverityToPriority = useCallback((sev?: string, sevNum?: number): ThreatPriority => {
    const s = (sev || "").toLowerCase();
    if (s === "critical") return "Critical";
    if (s === "high") return "High";
    if (s === "medium" || s === "moderate") return "Medium";
    if (s === "low") return "Low";
    if (typeof sevNum === "number") {
      if (sevNum >= 80) return "Critical";
      if (sevNum >= 60) return "High";
      if (sevNum >= 40) return "Medium";
      if (sevNum > 0) return "Low";
    }
    return "TBD";
  }, []);

  const openThreatDialog = useCallback((r: Risk) => {
    setDialogInitial({
      title: r.title || "",
      description: r.description || "",
      score: typeof r.score === "number" ? r.score : undefined,
      priority: mapSeverityToPriority(r.severity, r.severityNumeric),
      status: "Open",
      type: "Tampering",
      nodeIds: r.nodeIds || [],
      sourceRiskId: r.id,
    });
    setShowDialog(true);
  }, [mapSeverityToPriority]);

  const handleApplyThreat = useCallback(async (input: ThreatInput) => {
    if (!onCreateThreatFromRisk) {
      // 无后端回调时，直接关闭并提示，确保用户有反馈
      setShowDialog(false);
      setToast({ message: "Accepted (no backend handler)" });
      setTimeout(() => setToast(null), 2500);
      return;
    }
    try {
      const res = await onCreateThreatFromRisk(input);
      const threatId = res?.threatId;
      if (input.sourceRiskId && threatId && onUndoAccept) {
        const riskId = input.sourceRiskId;
        setToast({
          message: "已接受 1 个风险",
          action: {
            label: "撤销",
            onClick: async () => {
              await onUndoAccept(riskId, threatId);
              setToast({ message: "已撤销" });
              setTimeout(() => setToast(null), 2000);
            },
          },
        });
        setTimeout(() => setToast(null), 5000);
      } else {
        setToast({ message: "已接受 1 个风险" });
        setTimeout(() => setToast(null), 3000);
      }
    } finally {
      setShowDialog(false);
    }
  }, [onCreateThreatFromRisk, onUndoAccept]);

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
          <span>LLM Risks</span>
        </div>
        <div style={{ marginLeft: 12, display: "inline-flex", gap: 8 }}>
          {[
            { key: "suggested", label: "建议" },
            { key: "accepted", label: "已接受" },
            { key: "dismissed", label: "已忽略" },
          ].map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key as any)} aria-pressed={activeTab === t.key} style={{ height: 28, padding: "0 10px", borderRadius: 6, border: activeTab === t.key ? "1px solid #111827" : "1px solid #d1d5db", background: activeTab === t.key ? "#111827" : "#fff", color: activeTab === t.key ? "#fff" : "#111827", cursor: "pointer", fontSize: 12 }}>
              {t.label}
            </button>
          ))}
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
            {filteredRows.map((r, idx) => (
              <LlmRiskRow
                key={`rk-${idx}`}
                risk={r}
                index={idx}
                onAccept={openThreatDialog}
                onDismiss={onDismiss}
                onExportSingle={onExportSingle}
                onHoverRisk={onHoverRisk}
                onFocusRisk={onFocusRisk}
              />
            ))}
          </tbody>
        </table>
      </div>
      {showDialog && (
        <ThreatEditorDialog
          open={showDialog}
          initial={dialogInitial}
          onCancel={() => setShowDialog(false)}
          onApply={handleApplyThreat}
        />
      )}
      {toast && (
        <div aria-live="polite" style={{ position: "fixed", bottom: 16, left: 16, background: "#111827", color: "#fff", padding: "10px 12px", borderRadius: 8, display: "flex", alignItems: "center", gap: 12, zIndex: 60 }}>
          <span>{toast.message}</span>
          {toast.action && (
            <button onClick={toast.action.onClick} style={{ height: 28, padding: "0 10px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", color: "#111827", cursor: "pointer", fontSize: 12 }}>{toast.action.label}</button>
          )}
        </div>
      )}
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


