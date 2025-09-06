import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { NodeResizer } from "@xyflow/react";

type TBData = { label?: string; boundaryType?: string };

export default memo(function TrustBoundaryNode({ selected, width, height }: NodeProps<TBData>) {
  const w = width ?? 260;
  const h = height ?? 160;
  return (
    <div
      style={{
        width: w,
        height: h,
        border: "2px dashed #9ca3af",
        borderRadius: 12,
        background: "rgba(203,213,225,0.15)",
      }}
    >
      <NodeResizer isVisible={!!selected} minWidth={160} minHeight={100} />
    </div>
  );
});

