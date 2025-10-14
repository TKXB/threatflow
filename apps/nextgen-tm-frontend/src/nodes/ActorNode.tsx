import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

export default memo(function ActorNode({ data }: { data: { label: string; __hl?: boolean } }) {
  const hl = !!(data as any).__hl;
  return (
    <div style={{ display: "flex", alignItems: "center", flexDirection: "column", gap: 6 }}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          border: hl ? "2px solid #2563eb" : "2px solid #4b5563",
          background: "#fff",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: hl ? "0 0 0 4px rgba(37,99,235,0.18)" : undefined,
        }}
      >
        {/* simple head+body glyph */}
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="1.8">
          <circle cx="12" cy="8" r="3.2" />
          <path d="M4.5 20c1.6-3.3 4.2-5 7.5-5s5.9 1.7 7.5 5" strokeLinecap="round" />
        </svg>
      </div>
      <div style={{ fontSize: 12, color: "#374151", background: "#fff" }}>{data.label}</div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

