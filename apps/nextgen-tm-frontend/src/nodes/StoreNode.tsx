import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

export default memo(function StoreNode({ data }: { data: { label: string } }) {
  return (
    <div
      style={{
        width: 120,
        height: 70,
        border: "2px solid #059669",
        background: "#ecfdf5",
        borderRadius: 8,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#065f46",
        fontWeight: 600,
      }}
    >
      {/* cylinder top */}
      <div
        style={{
          position: "absolute",
          top: -8,
          left: 8,
          right: 8,
          height: 16,
          border: "2px solid #059669",
          borderBottom: "none",
          borderRadius: "9999px 9999px 0 0",
          background: "#ecfdf5",
        }}
      />
      {data.label}
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

