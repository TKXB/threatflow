import { memo } from "react";
import { Handle, Position } from "@xyflow/react";

export default memo(function ProcessNode({ data }: { data: { label: string } }) {
  return (
    <div
      style={{
        width: 120,
        height: 60,
        borderRadius: 9999,
        border: "2px solid #2563eb",
        background: "#eff6ff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#1e3a8a",
        fontWeight: 600,
      }}
    >
      {data.label}
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

