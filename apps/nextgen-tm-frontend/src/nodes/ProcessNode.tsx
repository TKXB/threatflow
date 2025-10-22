import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import { FaServer } from 'react-icons/fa';

type ProcessData = { label: string; technology?: string; icon?: string };
const THEME = {
  iconColor: "#2563eb",
  borderColor: "#2563eb",
  bgColor: "#ffffff",
  textColor: "#111827",
};

function renderIcon(icon?: string) {
  if (!icon) return null;
  const trimmed = String(icon).trim();
  const isSvgMarkup = trimmed.startsWith("<svg");
  const isUrlLike = /^(?:\.|\/|https?:\/\/|data:)/i.test(trimmed);
  const isSvgUrl = isUrlLike && (/\.svg($|\?)/i.test(trimmed) || /^data:\s*image\/svg\+xml/i.test(trimmed));

  if (isSvgMarkup) {
    return (
      <span
        style={{ display: "inline-flex", width: 24, height: 24 }}
        dangerouslySetInnerHTML={{ __html: trimmed }}
      />
    );
  }
  if (isSvgUrl) {
    return (
      <img
        src={trimmed}
        alt="icon"
        width={24}
        height={24}
        style={{ display: "block", objectFit: "contain" }}
      />
    );
  }
  // Fallback: emoji or short text
  return <span style={{ fontSize: 18, lineHeight: 1 }}>{trimmed}</span>;
}

export default memo(function ProcessNode({ data }: { data: ProcessData & { __hl?: boolean } }) {
  const hl = !!(data as any).__hl;
  const theme = THEME;
  return (
    <div style={{ display: "flex", alignItems: "center", flexDirection: "column", gap: 6 }}>
      <div style={{ width: 200, height: 60, position: "relative" }}>
        {hl ? (
          <div style={{ position: "absolute", inset: 0, filter: "blur(6px)", borderRadius: 8, boxShadow: "0 0 0 4px rgba(37,99,235,0.22)" }} />
        ) : null}
        <svg width="200" height="60" viewBox="0 0 200 60" style={{ position: "absolute", inset: 0 }}>
          <rect x="3" y="3" width="194" height="54" rx="8" fill="#fff" stroke={theme.borderColor} strokeWidth={2} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", gap: 10, padding: "0 12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, flexShrink: 0 }}>
            {data.icon ? (
              renderIcon(data.icon)
            ) : (
              <FaServer size={22} color={theme.iconColor} />
            )}
          </div>
          <div style={{ fontSize: 12, color: theme.textColor, fontWeight: 700, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
            {data.label}
          </div>
        </div>
      </div>
      <Handle id="left" type="target" position={Position.Left} style={{ left: -37, zIndex: 10 }} />
      <Handle id="right" type="source" position={Position.Right} style={{ right: -37, zIndex: 10 }} />
    </div>
  );
});

