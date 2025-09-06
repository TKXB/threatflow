import { memo } from "react";

export type MenuItem = {
  key: string;
  label: string;
  onClick: () => void;
};

export default memo(function ContextMenu({ x, y, items, onClose }: { x: number; y: number; items: MenuItem[]; onClose: () => void }) {
  return (
    <div
      className="context-menu"
      style={{ left: x, top: y }}
      onMouseLeave={onClose}
    >
      {items.map((it) => (
        <div key={it.key} className="context-menu-item" onClick={it.onClick}>
          {it.label}
        </div>
      ))}
    </div>
  );
});

