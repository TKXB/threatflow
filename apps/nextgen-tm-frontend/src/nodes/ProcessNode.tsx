import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

type ProcessData = { label: string; technology?: string };

function Shape({ tech, highlight }: { tech: string; highlight?: boolean }) {
  // Render distinct, simple SVG shapes per technology, size: 120x60
  const common = { strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" } as const;

  switch (tech) {
    case "application-server":
      return (
        <svg width="120" height="60" viewBox="0 0 120 60">
          <rect x="2" y="2" width="116" height="56" rx="8" fill="#ede9fe" stroke="#7c3aed" {...common} />
          <rect x="2" y="2" width="116" height="14" rx="8" fill="#ddd6fe" stroke="#7c3aed" {...common} />
          {highlight ? <rect x="2" y="2" width="116" height="56" rx="8" fill="none" stroke="#2563eb" strokeWidth="3" /> : null}
        </svg>
      );
    case "web-server":
      return (
        <svg width="120" height="60" viewBox="0 0 120 60">
          <rect x="2" y="2" width="116" height="56" rx="6" fill="#e0f2f1" stroke="#0d9488" {...common} />
          <circle cx="14" cy="12" r="3" fill="#0d9488" />
          <circle cx="26" cy="12" r="3" fill="#10b981" />
          <circle cx="38" cy="12" r="3" fill="#14b8a6" />
          <line x1="2" y1="18" x2="118" y2="18" stroke="#0d9488" strokeWidth="1.5" />
          {highlight ? <rect x="2" y="2" width="116" height="56" rx="6" fill="none" stroke="#2563eb" strokeWidth="3" /> : null}
        </svg>
      );
    case "load-balancer":
      return (
        <svg width="120" height="60" viewBox="0 0 120 60">
          <polygon points="60,4 116,30 60,56 4,30" fill="#fef3c7" stroke="#d97706" {...common} />
          {highlight ? <polygon points="60,4 116,30 60,56 4,30" fill="none" stroke="#2563eb" strokeWidth="3" /> : null}
        </svg>
      );
    case "message-queue":
      return (
        <svg width="120" height="60" viewBox="0 0 120 60">
          <rect x="6" y="8" width="108" height="44" rx="8" fill="#fce7f3" stroke="#db2777" {...common} />
          <path d="M20 18 L40 30 L20 42" fill="none" stroke="#db2777" strokeWidth="3" />
          <path d="M50 18 L70 30 L50 42" fill="none" stroke="#db2777" strokeWidth="3" />
          <path d="M80 18 L100 30 L80 42" fill="none" stroke="#db2777" strokeWidth="3" />
          {highlight ? <rect x="6" y="8" width="108" height="44" rx="8" fill="none" stroke="#2563eb" strokeWidth="3" /> : null}
        </svg>
      );
    case "gateway":
      return (
        <svg width="120" height="60" viewBox="0 0 120 60">
          <path d="M60 6 L108 24 L108 36 L60 54 L12 36 L12 24 Z" fill="#f3f4f6" stroke="#6b7280" {...common} />
          {highlight ? <path d="M60 6 L108 24 L108 36 L60 54 L12 36 L12 24 Z" fill="none" stroke="#2563eb" strokeWidth="3" /> : null}
        </svg>
      );
    case "task":
    case "scheduler":
      return (
        <svg width="120" height="60" viewBox="0 0 120 60">
          <rect x="2" y="2" width="116" height="56" rx="10" fill="#ecfccb" stroke="#65a30d" {...common} />
          <circle cx="60" cy="30" r="14" fill="#d9f99d" stroke="#65a30d" strokeWidth="2" />
          <line x1="60" y1="30" x2="60" y2="20" stroke="#3f6212" strokeWidth="2.5" />
          <line x1="60" y1="30" x2="70" y2="30" stroke="#3f6212" strokeWidth="2.5" />
          {highlight ? <rect x="2" y="2" width="116" height="56" rx="10" fill="none" stroke="#2563eb" strokeWidth="3" /> : null}
        </svg>
      );
    case "web-application":
    default:
      return (
        <svg width="120" height="60" viewBox="0 0 120 60">
          <rect x="2" y="2" width="116" height="56" rx="20" fill="#eff6ff" stroke="#2563eb" {...common} />
          {highlight ? <rect x="2" y="2" width="116" height="56" rx="20" fill="none" stroke="#2563eb" strokeWidth="3" /> : null}
        </svg>
      );
  }
}

export default memo(function ProcessNode({ data }: { data: ProcessData & { __hl?: boolean } }) {
  const tech = (data?.technology as string) || "web-application";
  const hl = !!(data as any).__hl;
  return (
    <div style={{ display: "flex", alignItems: "center", flexDirection: "column", gap: 6 }}>
      <div style={{ width: 120, height: 60, position: "relative" }}>
        {hl ? <div style={{ position: "absolute", inset: 0, filter: "blur(6px)", borderRadius: 12, boxShadow: "0 0 0 4px rgba(37,99,235,0.22)" }} /> : null}
        <div style={{ position: "absolute", inset: 0 }}>
          <Shape tech={tech} highlight={hl} />
        </div>
      </div>
      <div style={{ fontSize: 12, color: "#374151", background: "#fff" }}>{data.label}</div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

