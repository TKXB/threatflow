import { Workflow, Bell, ChevronsUpDown, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function AppHeader({ project = "Starter Project", title = "Attack Path", count, mode, onSelectMode, onMenuAction }: { project?: string; title?: string; count?: number; mode: "tm" | "ap"; onSelectMode: (m: "tm" | "ap") => void; onMenuAction?: (key: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [googleUser, setGoogleUser] = useState<{ name?: string; email?: string; picture?: string } | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);

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

  useEffect(() => {
    // Google Identity Services (GIS) minimal integration
    const CLIENT_ID = "833855760970-n88dvfaq7ha229dh1c9pifrsjso14mt5.apps.googleusercontent.com";

    function base64UrlToJson(b64url: string): any | null {
      try {
        let b64 = b64url.replace(/-/g, "+").replace(/_/g, "/");
        const pad = b64.length % 4;
        if (pad) b64 += "=".repeat(4 - pad);
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const jsonStr = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8").decode(bytes) : decodeURIComponent(escape(binary));
        return JSON.parse(jsonStr);
      } catch {
        return null;
      }
    }

    function handleCredentialResponse(response: any) {
      try {
        const token = response && response.credential;
        if (!token) return;
        const parts = token.split(".");
        const payload = parts && parts[1] ? base64UrlToJson(parts[1]) : null;
        const name = payload?.name ?? "";
        const email = payload?.email ?? "";
        const picture = payload?.picture ?? "";
        setGoogleUser({ name, email, picture });
        setIdToken(token);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(e);
      }
    }

    function init() {
      const g: any = (window as any).google;
      if (!g?.accounts?.id) return;
      g.accounts.id.initialize({ client_id: CLIENT_ID, callback: handleCredentialResponse, auto_select: false });
      if (googleButtonRef.current) {
        g.accounts.id.renderButton(googleButtonRef.current, {
          type: "standard",
          shape: "rectangular",
          theme: "outline",
          text: "signin_with",
          size: "large",
          logo_alignment: "left",
        });
      }
      // Optionally show prompt on load if desired
      // g.accounts.id.prompt();
    }

    const g: any = (window as any).google;
    if (g?.accounts?.id) {
      init();
      return;
    }
    const scriptId = "google-gis-client";
    if (document.getElementById(scriptId)) return; // already loading
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.id = scriptId;
    script.onload = init;
    document.head.appendChild(script);
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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div ref={googleButtonRef} />
          <button className="hit-area-hover" onClick={() => (window as any).google?.accounts?.id?.prompt?.()} title="重新显示登录">Login</button>
          <button className="hit-area-hover" onClick={() => { (window as any).google?.accounts?.id?.disableAutoSelect?.(); setGoogleUser(null); setIdToken(null); }} title="清除选择">Clear</button>
        </div>
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
          <div className="avatar" style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", background: "#e5e7eb" }}>
            {googleUser?.picture ? (
              <img src={googleUser.picture} alt="avatar" referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            ) : null}
          </div>
          {googleUser?.name ? <span className="user-name" style={{ marginLeft: 8 }} title={googleUser.email || undefined}>{googleUser.name}</span> : null}
          <ChevronsUpDown size={14} />
        </button>
      </div>
    </div>
  );
}

