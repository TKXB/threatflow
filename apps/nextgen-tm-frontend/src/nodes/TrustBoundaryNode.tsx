import { memo } from "react";
import type { NodeProps } from "@xyflow/react";
import { NodeResizer } from "@xyflow/react";

type TBData = { label?: string; boundaryType?: string };

export default memo(function TrustBoundaryNode({ selected, width, height, data }: NodeProps<TBData & { __hl?: boolean }>) {
  const w = width ?? 260;
  const h = height ?? 160;
  const hl = !!((data as any)?.__hl);
  return (
    <div
      style={{
        width: w,
        height: h,
        border: hl ? "2px dashed #2563eb" : "2px dashed #9ca3af",
        borderRadius: 12,
        background: hl ? "rgba(37,99,235,0.08)" : "rgba(203,213,225,0.15)",
      }}
    >
      <NodeResizer isVisible={!!selected} minWidth={160} minHeight={100} />
    </div>
  );
});

