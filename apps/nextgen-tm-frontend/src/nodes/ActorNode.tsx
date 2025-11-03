import { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";

export default memo(function ActorNode({ data }: { data: { label: string } }) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", flexDirection: "column", gap: 6 }} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          border: "2px solid #4b5563",
          background: "#fff",
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* simple head+body glyph */}
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="1.8">
          <circle cx="12" cy="8" r="3.2" />
          <path d="M4.5 20c1.6-3.3 4.2-5 7.5-5s5.9 1.7 7.5 5" strokeLinecap="round" />
        </svg>
      </div>
      <div style={{ fontSize: 12, color: "#374151", background: "#fff" }}>{data.label}</div>
      <Handle id="left" type="target" position={Position.Left} style={{ left: -1, zIndex: 10, opacity: isHovered ? 1 : 0, pointerEvents: isHovered ? "auto" : "none" }} />
      <Handle id="right" type="source" position={Position.Right} style={{ right: -1, zIndex: 10, opacity: isHovered ? 1 : 0, pointerEvents: isHovered ? "auto" : "none" }} />
    </div>
  );
});

