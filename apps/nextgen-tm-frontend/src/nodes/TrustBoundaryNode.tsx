import { memo } from "react";
import { NodeResizer } from "@xyflow/react";

export default memo(function TrustBoundaryNode({ selected }: { selected?: boolean }) {
  return (
    <div
      style={{
        width: 260,
        height: 160,
        border: "2px dashed #9ca3af",
        borderRadius: 12,
        background: "rgba(203,213,225,0.15)",
      }}
    >
      <NodeResizer isVisible={!!selected} minWidth={160} minHeight={100} />
    </div>
  );
});

