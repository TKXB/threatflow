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
      role="menu"
      aria-orientation="vertical"
    >
      {items.map((it) => {
        const isDanger = it.key === "delete" || /delete|remove|danger|warning/i.test(it.label);
        return (
          <div
            key={it.key}
            className={`context-menu-item${isDanger ? " context-menu-item-danger" : ""}`}
            role="menuitem"
            tabIndex={-1}
            onClick={it.onClick}
          >
            {it.label}
          </div>
        );
      })}
    </div>
  );
});

