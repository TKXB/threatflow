import { memo, useState } from "react";
import { Handle, Position, useStore } from "@xyflow/react";
import { FaShieldAlt } from 'react-icons/fa';

type AssetData = { label: string; technology?: string; icon?: string };

// 统一样式与颜色（与 StoreNode 区分），固定图标与主题
const THEME = {
  iconColor: "#1f2937",
  borderColor: "#111827",
  bgColor: "#e5e7eb",
  textColor: "#111827",
};

const connectionSelector = (s: any) => s.connection?.inProgress;

export default memo(function AssetNode({ data }: { data: AssetData }) {
  const theme = THEME;
  const [isHovered, setIsHovered] = useState(false);
  const isConnecting = useStore(connectionSelector);

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

  const targetStyle = (base: React.CSSProperties) => ({
    ...base,
    zIndex: isConnecting ? 12 : 10,
    opacity: isHovered ? 1 : 0,
    pointerEvents: (isConnecting && isHovered) ? "auto" : "none",
  } as React.CSSProperties);

  const sourceStyle = (base: React.CSSProperties) => ({
    ...base,
    zIndex: !isConnecting ? 12 : 10,
    opacity: isHovered ? 1 : 0,
    pointerEvents: (!isConnecting && isHovered) ? "auto" : "none",
  } as React.CSSProperties);

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
      {/* 四边各一个连接点。每个位置同时放置 Source 和 Target Handle。 */}
      
      {/* Left */}
      <Handle id="left" type="target" position={Position.Left} style={targetStyle({ left: 5 })} />
      <Handle id="left" type="source" position={Position.Left} style={sourceStyle({ left: 5 })} />
      
      {/* Top */}
      <Handle id="top" type="target" position={Position.Top} style={targetStyle({ top: 3 })} />
      <Handle id="top" type="source" position={Position.Top} style={sourceStyle({ top: 3 })} />
      
      {/* Right */}
      <Handle id="right" type="target" position={Position.Right} style={targetStyle({ right: 5 })} />
      <Handle id="right" type="source" position={Position.Right} style={sourceStyle({ right: 5 })} />
      
      {/* Bottom */}
      <Handle id="bottom" type="target" position={Position.Bottom} style={targetStyle({ bottom: 7 })} />
      <Handle id="bottom" type="source" position={Position.Bottom} style={sourceStyle({ bottom: 7 })} />
    </div>
  );
});
