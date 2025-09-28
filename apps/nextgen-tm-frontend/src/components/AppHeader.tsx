import { Workflow, Bell, ChevronsUpDown, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function AppHeader({ project = "Starter Project", title = "Attack Path", count, mode, onSelectMode, onMenuAction }: { project?: string; title?: string; count?: number; mode: "tm" | "ap"; onSelectMode: (m: "tm" | "ap") => void; onMenuAction?: (key: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(ev: MouseEvent) {
      if (!menuRef.current) return;
      if (ev.target instanceof Node && !menuRef.current.contains(ev.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const display = typeof count === "number" ? `${title} (${count})` : title;
  return (
    <div className="app-header" data-testid="app-header">
      <div className="header-left" data-testid="header_left_section_wrapper">
        <div className="header-tabs">
          <button type="button" className={`tab-btn${mode === "tm" ? " active" : ""}`} onClick={() => onSelectMode("tm")}>威胁建模</button>
          <button type="button" className={`tab-btn${mode === "ap" ? " active" : ""}`} onClick={() => onSelectMode("ap")}>攻击路径</button>
        </div>
      </div>
      <div className="header-center">
        <div className="menu-bar" data-testid="menu_bar_wrapper">
          <div className="header-menu-bar" data-testid="menu_flow_bar" id="menu_flow_bar_navigation">
            <div className="header-crumb" title={project}>{project}</div>
          </div>
          <div className="header-slash">/</div>
          <div className="header-chip"><Workflow size={14} /></div>
          <div className="header-title" data-testid="menu_bar_display">
            <span className="header-title-text" data-testid="flow_name">{display}</span>
          </div>
        </div>
      </div>
      <div className="header-right" data-testid="header_right_section_wrapper">
        <div ref={menuRef} className={`dropdown${menuOpen ? " open" : ""}`} data-testid="ap-menu">
          <button className="dropdown-trigger" onClick={() => setMenuOpen(v => !v)}>
            Options
            <ChevronDown size={18} />
          </button>
          <div className="dropdown-content">
            <div className="dropdown-item" onClick={() => onMenuAction && onMenuAction("clear")}>Clear All</div>
            <div className="dropdown-item" onClick={() => onMenuAction && onMenuAction("analyze")}>Analyze & Highlight</div>
            <div className="dropdown-item" onClick={() => onMenuAction && onMenuAction("topk")}>Show Top-K (Scores)</div>
            <div className="dropdown-item" onClick={() => onMenuAction && onMenuAction("methods")}>Analyze Methods</div>
            <div className="dropdown-item" onClick={() => onMenuAction && onMenuAction("llm")}>LLM Methods</div>
            <div className="dropdown-item" onClick={() => onMenuAction && onMenuAction("llm-tara")}>LLM TARA</div>
            <div className="dropdown-item" onClick={() => onMenuAction && onMenuAction("llm-settings")}>LLM Settings</div>
            <div className="dropdown-item" onClick={() => onMenuAction && onMenuAction("load-demo")}>Load Demo</div>
            <div className="dropdown-sep" />
            <div className="dropdown-item" onClick={() => onMenuAction && onMenuAction("export-otm")}>Export OTM</div>
            <div className="dropdown-item" onClick={() => onMenuAction && onMenuAction("export-threagile")}>Export Threagile</div>
            <div className="dropdown-item" onClick={() => onMenuAction && onMenuAction("export-report")}>Export Report</div>
          </div>
        </div>
        <button className="hit-area-hover" aria-label="Notifications" data-testid="notification_button">
          <span className="notif-dot" />
          <Bell size={16} />
        </button>
        <div className="v-sep" role="none" />
        <button className="user-menu" data-testid="user_menu_button" aria-haspopup="menu">
          <div className="avatar" />
          <ChevronsUpDown size={14} />
        </button>
      </div>
    </div>
  );
}

