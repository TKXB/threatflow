import { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import { 
  FaWifi, 
  FaBluetooth, 
  FaUsb, 
  FaMicrochip,
  FaNetworkWired,
  FaPlug,
  FaDesktop,
  FaGlobe,
  FaShieldAlt
} from 'react-icons/fa';
import { IconType } from 'react-icons';

type EntryPointData = { 
  label: string; 
  technology?: string;
};

// Technology to icon mapping for entry points
const ENTRY_POINT_ICON_MAP: Record<string, IconType> = {
  wifi: FaWifi,
  ble: FaBluetooth,
  uart: FaUsb,
  jtag: FaMicrochip,
  ethernet: FaNetworkWired,
  usb: FaPlug,
  web: FaGlobe,
  desktop: FaDesktop,
  physical: FaShieldAlt,
};

// Technology color themes for entry points
const ENTRY_POINT_THEMES: Record<string, {
  iconColor: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
}> = {
  wifi: { 
    iconColor: "#059669", 
    borderColor: "#10b981", 
    bgColor: "#ecfdf5",
    textColor: "#065f46"
  },
  ble: { 
    iconColor: "#2563eb", 
    borderColor: "#3b82f6", 
    bgColor: "#eff6ff",
    textColor: "#1e40af"
  },
  uart: { 
    iconColor: "#dc2626", 
    borderColor: "#ef4444", 
    bgColor: "#fef2f2",
    textColor: "#b91c1c"
  },
  jtag: { 
    iconColor: "#7c3aed", 
    borderColor: "#8b5cf6", 
    bgColor: "#f5f3ff",
    textColor: "#6d28d9"
  },
  ethernet: { 
    iconColor: "#ea580c", 
    borderColor: "#f97316", 
    bgColor: "#fff7ed",
    textColor: "#c2410c"
  },
  usb: { 
    iconColor: "#0891b2", 
    borderColor: "#06b6d4", 
    bgColor: "#ecfeff",
    textColor: "#0e7490"
  },
  web: { 
    iconColor: "#7c2d12", 
    borderColor: "#a16207", 
    bgColor: "#fffbeb",
    textColor: "#92400e"
  },
  desktop: { 
    iconColor: "#1f2937", 
    borderColor: "#374151", 
    bgColor: "#f9fafb",
    textColor: "#111827"
  },
  physical: { 
    iconColor: "#991b1b", 
    borderColor: "#dc2626", 
    bgColor: "#fef2f2",
    textColor: "#7f1d1d"
  },
  default: { 
    iconColor: "#6b7280", 
    borderColor: "#9ca3af", 
    bgColor: "#f9fafb",
    textColor: "#4b5563"
  },
};

function getEntryPointIcon(technology?: string): IconType {
  if (!technology) return FaShieldAlt;
  return ENTRY_POINT_ICON_MAP[technology.toLowerCase()] || FaShieldAlt;
}

function getEntryPointTheme(technology?: string) {
  if (!technology) return ENTRY_POINT_THEMES.default;
  return ENTRY_POINT_THEMES[technology.toLowerCase()] || ENTRY_POINT_THEMES.default;
}

export default memo(function EntryPointNode({ data }: { data: EntryPointData }) {
  const IconComponent = getEntryPointIcon(data.technology);
  const theme = getEntryPointTheme(data.technology);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        width: 80,
        height: 80,
        borderRadius: 12,
        border: `2px solid ${theme.borderColor}`,
        background: "transparent",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 4,
        padding: 8,
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
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
      {/* 四边各一个连接点。默认隐藏，悬停显示。左/上为 target，右/下为 source。*/}
      <Handle id="left" type="target" position={Position.Left} style={{ left: -1, zIndex: 10, opacity: isHovered ? 1 : 0, pointerEvents: isHovered ? "auto" : "none" }} />
      <Handle id="top" type="target" position={Position.Top} style={{ top: -1, zIndex: 10, opacity: isHovered ? 1 : 0, pointerEvents: isHovered ? "auto" : "none" }} />
      <Handle id="right" type="source" position={Position.Right} style={{ right: -1, zIndex: 10, opacity: isHovered ? 1 : 0, pointerEvents: isHovered ? "auto" : "none" }} />
      <Handle id="bottom" type="source" position={Position.Bottom} style={{ bottom: -1, zIndex: 10, opacity: isHovered ? 1 : 0, pointerEvents: isHovered ? "auto" : "none" }} />
    </div>
  );
});