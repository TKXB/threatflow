import { Download as DownloadIcon } from "lucide-react";
import { memo } from "react";

export type Risk = {
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
  risk: Risk;
  index: number;
  onAccept: (r: Risk) => void;
  onDismiss: (index: number) => void;
  onExportSingle?: (r: Risk) => void;
  onHoverRisk?: (nodeIds: string[] | null) => void;
  onFocusRisk?: (nodeIds: string[] | null) => void;
};

function Row({ risk: r, index: idx, onAccept, onDismiss, onExportSingle, onHoverRisk, onFocusRisk }: Props) {
  return (
    <tr
      onMouseEnter={() => onHoverRisk && onHoverRisk(r.nodeIds || [])}
      onMouseLeave={() => onHoverRisk && onHoverRisk(null)}
      onClick={() => onFocusRisk && onFocusRisk(r.nodeIds || [])}
      style={{ cursor: "pointer" }}
    >
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
        <button onClick={(e) => { e.stopPropagation(); onAccept(r); }} style={{ height: 28, padding: "0 8px", borderRadius: 6, border: "1px solid #10b981", background: "#10b981", color: "#fff", cursor: "pointer", fontSize: 12 }}>Edit</button>
        <span style={{ width: 6, display: "inline-block" }} />
        <button onClick={(e) => { e.stopPropagation(); onDismiss(idx); }} style={{ height: 28, padding: "0 8px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 12 }}>Dismiss</button>
        <span style={{ width: 6, display: "inline-block" }} />
        <button title="Export single" onClick={(e) => { e.stopPropagation(); onExportSingle && onExportSingle(r); }} style={{ height: 28, padding: "0 8px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
          <DownloadIcon size={14} /> Export
        </button>
      </td>
    </tr>
  );
}

export default memo(Row);


