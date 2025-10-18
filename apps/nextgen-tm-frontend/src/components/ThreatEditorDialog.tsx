import { useEffect, useMemo, useRef, useState } from "react";
import type { ThreatInput, ThreatPriority, ThreatStatus } from "../types/threats";

type Props = {
  open: boolean;
  initial: Partial<ThreatInput> & { nodeIds?: string[]; sourceRiskId?: string };
  onCancel: () => void;
  onApply: (input: ThreatInput) => Promise<void>;
};

const STRIDE_TYPES = [
  "Spoofing",
  "Tampering",
  "Repudiation",
  "Information Disclosure",
  "Denial of Service",
  "Elevation of Privilege",
];

const PRIORITIES: ThreatPriority[] = ["TBD", "Low", "Medium", "High", "Critical"];
const STATUSES: ThreatStatus[] = ["NA", "Open", "Mitigated"];

export default function ThreatEditorDialog({ open, initial, onCancel, onApply }: Props) {
  const [title, setTitle] = useState(initial.title || "");
  const [type, setType] = useState(initial.type || STRIDE_TYPES[1]);
  const [status, setStatus] = useState<ThreatStatus>(initial.status || "Open");
  const [score, setScore] = useState<string>(initial.score != null ? String(initial.score) : "");
  const [priority, setPriority] = useState<ThreatPriority>(initial.priority || "TBD");
  const [description, setDescription] = useState(initial.description || "");
  const [mitigations, setMitigations] = useState(initial.mitigations || "");
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(initial.title || "");
    setType(initial.type || STRIDE_TYPES[1]);
    setStatus(initial.status || "Open");
    setScore(initial.score != null ? String(initial.score) : "");
    setPriority(initial.priority || "TBD");
    setDescription(initial.description || "");
    setMitigations(initial.mitigations || "");
  }, [open, initial]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  const valid = useMemo(() => {
    if (!title.trim()) return false;
    if (!PRIORITIES.includes(priority)) return false;
    if (!STATUSES.includes(status)) return false;
    if (score && isNaN(Number(score))) return false;
    return true;
  }, [title, priority, status, score]);

  if (!open) return null;

  const apply = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      const payload: ThreatInput = {
        title: title.trim(),
        type,
        status,
        score: score === "" ? undefined : Number(score),
        priority,
        description: description.trim() || undefined,
        mitigations: mitigations.trim() || undefined,
        nodeIds: initial.nodeIds || [],
        sourceRiskId: initial.sourceRiskId,
      };
      await onApply(payload);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="threat-editor-title" aria-describedby="threat-editor-desc" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
      <div ref={dialogRef} style={{ width: 800, maxWidth: "98vw", background: "#fff", borderRadius: 8, boxShadow: "0 10px 30px rgba(0,0,0,0.2)" }}>
        <div style={{ background: "#dc2626", color: "#fff", padding: "10px 14px", borderTopLeftRadius: 8, borderTopRightRadius: 8 }}>
          <div id="threat-editor-title" style={{ fontWeight: 700 }}>Edit Threat</div>
        </div>
        <div id="threat-editor-desc" style={{ padding: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>Title</div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New STRIDE threat" style={{ width: "100%", height: 36, border: "1px solid #d1d5db", borderRadius: 6, padding: "0 10px" }} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>Type</div>
            <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: "100%", height: 36, border: "1px solid #d1d5db", borderRadius: 6, padding: "0 10px" }}>
              {STRIDE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>Status</div>
              <div style={{ display: "flex", gap: 8 }}>
                {STATUSES.map((s) => (
                  <button key={s} onClick={() => setStatus(s)} aria-pressed={status === s} style={{ height: 32, padding: "0 10px", borderRadius: 6, border: status === s ? "1px solid #111827" : "1px solid #d1d5db", background: status === s ? "#111827" : "#f9fafb", color: status === s ? "#fff" : "#111827", cursor: "pointer" }}>{s === "NA" ? "N/A" : s}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>Score</div>
              <input inputMode="decimal" value={score} onChange={(e) => setScore(e.target.value)} placeholder="" style={{ width: "100%", height: 36, border: "1px solid #d1d5db", borderRadius: 6, padding: "0 10px" }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>Priority</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {PRIORITIES.map((p) => (
                  <button key={p} onClick={() => setPriority(p)} aria-pressed={priority === p} style={{ height: 32, padding: "0 10px", borderRadius: 6, border: priority === p ? "1px solid #111827" : "1px solid #d1d5db", background: priority === p ? "#111827" : "#f9fafb", color: priority === p ? "#fff" : "#111827", cursor: "pointer" }}>{p}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>Description</div>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Provide a description for this threat" style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: 10 }} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>Mitigations</div>
            <textarea value={mitigations} onChange={(e) => setMitigations(e.target.value)} rows={4} placeholder="Provide remediation for this threat or a reason if status is N/A" style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: 6, padding: 10 }} />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: 12 }}>
          <button onClick={onCancel} style={{ height: 36, padding: "0 14px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}>Cancel</button>
          <button disabled={!valid || submitting} onClick={apply} style={{ height: 36, padding: "0 14px", borderRadius: 6, border: "1px solid #10b981", background: submitting || !valid ? "#a7f3d0" : "#10b981", color: "#fff", cursor: submitting || !valid ? "not-allowed" : "pointer" }}>{submitting ? "Applying..." : "Apply"}</button>
        </div>
      </div>
    </div>
  );
}


