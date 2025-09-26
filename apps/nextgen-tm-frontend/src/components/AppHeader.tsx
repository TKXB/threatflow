import { Workflow, Bell, ChevronsUpDown } from "lucide-react";

export default function AppHeader({ project = "Starter Project", title = "Attack Path", count, mode, onSelectMode }: { project?: string; title?: string; count?: number; mode: "tm" | "ap"; onSelectMode: (m: "tm" | "ap") => void }) {
  const display = typeof count === "number" ? `${title} (${count})` : title;
  return (
    <div className="app-header" data-testid="app-header">
      <div className="header-left" data-testid="header_left_section_wrapper">
        {/* left placeholder (removed back icon) */}
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
          <div className="header-tabs">
            <button type="button" className={`tab-btn${mode === "tm" ? " active" : ""}`} onClick={() => onSelectMode("tm")}>威胁建模</button>
            <button type="button" className={`tab-btn${mode === "ap" ? " active" : ""}`} onClick={() => onSelectMode("ap")}>攻击路径</button>
          </div>
        </div>
      </div>
      <div className="header-right" data-testid="header_right_section_wrapper">
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

