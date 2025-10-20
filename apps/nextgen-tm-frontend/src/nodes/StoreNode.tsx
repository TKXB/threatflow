import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import {
  FaDatabase,
  FaServer,
  FaCloud,
  FaCamera,
  FaHdd,
  FaLinux,
  FaNetworkWired,
  FaMobileAlt,
  FaGlobe,
  FaMicrochip,
  FaShieldAlt,
} from 'react-icons/fa';
import type { IconType } from 'react-icons';

type StoreData = { label: string; technology?: string };

const ASSET_ICON_MAP: Record<string, IconType> = {
  linux: FaLinux,
  spi: FaMicrochip,
  postgres: FaDatabase,
  http: FaGlobe,
  mqtt: FaServer,
  camera: FaCamera,
  'sd-card': FaHdd,
  flash: FaHdd,
  plc: FaServer,
  can: FaNetworkWired,
  s3: FaCloud,
  'mobile-app': FaMobileAlt,
};

const ASSET_THEMES: Record<string, {
  iconColor: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
}> = {
  linux: { iconColor: "#2563eb", borderColor: "#3b82f6", bgColor: "#eff6ff", textColor: "#1e40af" },
  spi: { iconColor: "#7c3aed", borderColor: "#8b5cf6", bgColor: "#f5f3ff", textColor: "#6d28d9" },
  postgres: { iconColor: "#0ea5e9", borderColor: "#38bdf8", bgColor: "#f0f9ff", textColor: "#0369a1" },
  http: { iconColor: "#a16207", borderColor: "#ca8a04", bgColor: "#fffbeb", textColor: "#92400e" },
  mqtt: { iconColor: "#0e7490", borderColor: "#06b6d4", bgColor: "#ecfeff", textColor: "#155e75" },
  camera: { iconColor: "#374151", borderColor: "#6b7280", bgColor: "#f9fafb", textColor: "#111827" },
  'sd-card': { iconColor: "#475569", borderColor: "#64748b", bgColor: "#f8fafc", textColor: "#1f2937" },
  flash: { iconColor: "#be185d", borderColor: "#db2777", bgColor: "#fdf2f8", textColor: "#9d174d" },
  plc: { iconColor: "#ea580c", borderColor: "#f97316", bgColor: "#fff7ed", textColor: "#c2410c" },
  can: { iconColor: "#059669", borderColor: "#10b981", bgColor: "#ecfdf5", textColor: "#065f46" },
  s3: { iconColor: "#0284c7", borderColor: "#0ea5e9", bgColor: "#f0f9ff", textColor: "#075985" },
  'mobile-app': { iconColor: "#7c3aed", borderColor: "#8b5cf6", bgColor: "#faf5ff", textColor: "#6d28d9" },
  default: { iconColor: "#6b7280", borderColor: "#9ca3af", bgColor: "#f9fafb", textColor: "#4b5563" },
};

function getAssetIcon(technology?: string): IconType {
  if (!technology) return FaShieldAlt;
  return ASSET_ICON_MAP[technology.toLowerCase()] || FaShieldAlt;
}

function getAssetTheme(technology?: string) {
  if (!technology) return ASSET_THEMES.default;
  return ASSET_THEMES[technology.toLowerCase()] || ASSET_THEMES.default;
}

export default memo(function StoreNode({ data }: { data: StoreData & { __hl?: boolean } }) {
  const IconComponent = getAssetIcon(data.technology);
  const theme = getAssetTheme(data.technology);
  const hl = !!(data as any).__hl;

  return (
    <div
      style={{
        width: 80,
        height: 80,
        borderRadius: 12,
        border: hl ? "2px solid #2563eb" : `2px solid ${theme.borderColor}`,
        background: "transparent",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 4,
        padding: 8,
        boxShadow: hl ? "0 0 0 4px rgba(37,99,235,0.18)" : "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <IconComponent size={24} color={theme.iconColor} style={{ flexShrink: 0 }} />
        <div
          style={{
            fontSize: 10,
            color: theme.textColor,
            fontWeight: 600,
            textAlign: "center",
            lineHeight: 1.2,
            wordBreak: "break-word",
            maxWidth: "100%",
          }}
        >
          {data.label}
        </div>
      </div>
      {/* Assets typically have both incoming and outgoing connections */}
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
});

