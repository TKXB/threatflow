import { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { FaShieldAlt } from 'react-icons/fa';

type AssetData = { label: string; technology?: string; icon?: string };

// 统一样式与颜色（与 StoreNode 区分），固定图标与主题
const THEME = {
  iconColor: "#1f2937",
  borderColor: "#111827",
  bgColor: "#e5e7eb",
  textColor: "#111827",
};

export default memo(function AssetNode({ data }: { data: AssetData }) {
  const theme = THEME;
  const [isHovered, setIsHovered] = useState(false);

  function renderIcon(icon?: string) {
    if (!icon) return null;
    const trimmed = String(icon).trim();
    const isSvgMarkup = trimmed.startsWith("<svg");
    const isUrlLike = /^(?:\.|\/|https?:\/\/|data:)/i.test(trimmed);
    const isSvgUrl = isUrlLike && (/\.svg($|\?)/i.test(trimmed) || /^data:\s*image\/svg\+xml/i.test(trimmed));

    if (isSvgMarkup) {
      // Render inline SVG markup
      return (
        <span
          style={{ display: "inline-flex", width: 28, height: 28 }}
          dangerouslySetInnerHTML={{ __html: trimmed }}
        />
      );
    }
    if (isSvgUrl) {
      // Render SVG from URL or data URI
      return (
        <img
          src={trimmed}
          alt="icon"
          width={28}
          height={28}
          style={{ display: "block", objectFit: "contain" }}
        />
      );
    }
    // Fallback: treat as emoji or short text
    return <span style={{ fontSize: 24, lineHeight: 1 }}>{trimmed}</span>;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", flexDirection: "column", gap: 6 }} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <div style={{ width: 96, height: 96, position: "relative" }}>
        <svg width="96" height="96" viewBox="0 0 96 96" style={{ position: "absolute", inset: 0 }}>
          <rect x="3" y="3" width="90" height="90" fill="transparent" stroke={theme.borderColor} strokeWidth={2} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 6, padding: 6 }}>
          {data.icon ? (
            renderIcon(data.icon)
          ) : (
            <FaShieldAlt size={28} color={theme.iconColor} style={{ flexShrink: 0 }} />
          )}
          <div style={{ fontSize: 11, color: theme.textColor, fontWeight: 700, textAlign: "center", lineHeight: 1.2, wordBreak: "break-word", maxWidth: "100%" }}>{data.label}</div>
        </div>
      </div>
      {/* 四边各一个连接点。左/上为 target，右/下为 source。默认隐藏，悬停时显示。*/}
      <Handle id="left" type="target" position={Position.Left} style={{ left: 5, zIndex: 10, opacity: isHovered ? 1 : 0, pointerEvents: isHovered ? "auto" : "none" }} />
      <Handle id="top" type="target" position={Position.Top} style={{ top: 3, zIndex: 10, opacity: isHovered ? 1 : 0, pointerEvents: isHovered ? "auto" : "none" }} />
      <Handle id="right" type="source" position={Position.Right} style={{ right: 5, zIndex: 10, opacity: isHovered ? 1 : 0, pointerEvents: isHovered ? "auto" : "none" }} />
      <Handle id="bottom" type="source" position={Position.Bottom} style={{ bottom: 7, zIndex: 10, opacity: isHovered ? 1 : 0, pointerEvents: isHovered ? "auto" : "none" }} />
    </div>
  );
});

