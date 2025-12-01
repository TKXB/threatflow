import { Workflow, Bell, ChevronsUpDown, ChevronDown } from "lucide-react";
import { renderWeChatLogin } from "../auth/wechatLogin";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function AppHeader({ project = "Starter Project", title = "Attack Path", count, mode, onSelectMode, onMenuAction }: { project?: string; title?: string; count?: number; mode: "tm" | "ap"; onSelectMode: (m: "tm" | "ap") => void; onMenuAction?: (key: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const [loginMenuOpen, setLoginMenuOpen] = useState<boolean>(false);
  const loginMenuRef = useRef<HTMLDivElement | null>(null);
  const [loginGoogleHover, setLoginGoogleHover] = useState(false);
  const wechatRef = useRef<HTMLDivElement | null>(null);
  const [wechatVisible, setWeChatVisible] = useState(false);

  // 使用 AuthContext 替代本地状态
  const { user: googleUser, handleGoogleLogin, logout } = useAuth();

  useEffect(() => {
    function handleClickOutside(ev: MouseEvent) {
      if (!(ev.target instanceof Node)) return;
      if (menuRef.current && !menuRef.current.contains(ev.target)) {
        setMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(ev.target)) {
        setUserMenuOpen(false);
      }
      if (loginMenuRef.current && !loginMenuRef.current.contains(ev.target)) {
        setLoginMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Google Identity Services (GIS) 集成，委托给 AuthContext 处理
    const CLIENT_ID = "833855760970-n88dvfaq7ha229dh1c9pifrsjso14mt5.apps.googleusercontent.com";

    function init() {
      const g: any = (window as any).google;
      if (!g?.accounts?.id) return;
      
      // 初始化时将回调绑定到 AuthContext 的 handleGoogleLogin
      g.accounts.id.initialize({ 
        client_id: CLIENT_ID, 
        callback: async (response: any) => {
          await handleGoogleLogin(response);
          setLoginMenuOpen(false);
        }, 
        auto_select: true 
      });
      
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
      
      // 提示恢复会话
      g.accounts.id.prompt();
    }

    const g: any = (window as any).google;
    if (g?.accounts?.id) {
      init();
      return;
    }
    
    const scriptId = "google-gis-client";
    if (document.getElementById(scriptId)) return;
    
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.id = scriptId;
    script.onload = init;
    document.head.appendChild(script);
  }, [handleGoogleLogin]);

  // 登出后重新渲染 Google 按钮
  useEffect(() => {
    const g: any = (window as any).google;
    if (!googleUser && loginMenuOpen && googleButtonRef.current && g?.accounts?.id) {
      try {
        googleButtonRef.current.innerHTML = "";
        g.accounts.id.renderButton(googleButtonRef.current, {
          type: "standard",
          shape: "rectangular",
          theme: "outline",
          text: "signin_with",
          size: "large",
          logo_alignment: "left",
        });
      } catch {}
    }
  }, [googleUser, loginMenuOpen]);
  const display = typeof count === "number" ? `${title} (${count})` : title;
  const WECHAT_APPID = (import.meta as any).env?.VITE_WECHAT_APPID as string | undefined;
  const WECHAT_REDIRECT_URI = (import.meta as any).env?.VITE_WECHAT_REDIRECT_URI as string | undefined;
  return (
    <div className="app-header" data-testid="app-header">
      <div className="header-left" data-testid="header_left_section_wrapper">
        <div className="header-tabs">
          <button type="button" className={`tab-btn${mode === "tm" ? " active" : ""}`} onClick={() => onSelectMode("tm")}>Threat Modeling</button>
          <button type="button" className={`tab-btn${mode === "ap" ? " active" : ""}`} onClick={() => onSelectMode("ap")}>Attack Path</button>
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
        { !googleUser ? (
          <div ref={loginMenuRef} className={`dropdown${loginMenuOpen ? " open" : ""}`} data-testid="login-menu">
            <button className="dropdown-trigger" onClick={() => setLoginMenuOpen(v => !v)}>
              Login
              <ChevronDown size={18} />
            </button>
            <div className="dropdown-content">
              <div className="dropdown-item" onMouseEnter={() => setLoginGoogleHover(true)} onMouseLeave={() => setLoginGoogleHover(false)} style={{ backgroundColor: loginGoogleHover ? "#f3f4f6" : undefined, padding: 8 }}>
                <div ref={googleButtonRef} style={{ display: "inline-block" }} />
              </div>
              <div className="dropdown-sep" />
              <div className="dropdown-item" onClick={async () => {
                if (!wechatRef.current) return;
                if (!WECHAT_APPID || !WECHAT_REDIRECT_URI) {
                  // eslint-disable-next-line no-console
                  console.error("Missing VITE_WECHAT_APPID or VITE_WECHAT_REDIRECT_URI");
                  return;
                }
                setWeChatVisible(v => !v);
                if (!wechatVisible) {
                  await renderWeChatLogin(wechatRef.current, { appId: WECHAT_APPID, redirectUri: WECHAT_REDIRECT_URI });
                }
              }}>使用微信登录</div>
              {wechatVisible ? (
                <div className="dropdown-item" style={{ padding: 8 }}>
                  <div ref={wechatRef} style={{ width: 240, height: 290 }} />
                </div>
              ) : null}
            </div>
          </div>
        ) : null }
        <div ref={menuRef} className={`dropdown${menuOpen ? " open" : ""}`} data-testid="ap-menu">
          <button className="dropdown-trigger" onClick={() => setMenuOpen(v => !v)}>
            Options
            <ChevronDown size={18} />
          </button>
          <div className="dropdown-content">
            {mode === "ap" ? (
              <>
                <div className="dropdown-item" onClick={() => onMenuAction && onMenuAction("analyze")}>Analyze & Highlight</div>
                <div className="dropdown-item" onClick={() => onMenuAction && onMenuAction("topk")}>Show Top-K (Scores)</div>
                <div className="dropdown-item" onClick={() => onMenuAction && onMenuAction("llm")}>LLM Methods</div>
                <div className="dropdown-item" onClick={() => onMenuAction && onMenuAction("llm-settings")}>LLM Settings</div>
                <div className="dropdown-item" onClick={() => onMenuAction && onMenuAction("load-demo")}>Load Demo</div>
                <div className="dropdown-sep" />
                <div className="dropdown-item" onClick={() => onMenuAction && onMenuAction("export-otm")}>Export OTM</div>
                <div className="dropdown-item" onClick={() => onMenuAction && onMenuAction("export-threagile")}>Export Threagile</div>
                <div className="dropdown-item" onClick={() => onMenuAction && onMenuAction("export-report")}>Export Report</div>
              </>
            ) : (
              <>
                <div className="dropdown-item" onClick={() => onMenuAction && onMenuAction("llm")}>LLM Risks</div>
                <div className="dropdown-item" onClick={() => onMenuAction && onMenuAction("llm-settings")}>LLM Settings</div>
                <div className="dropdown-sep" />
                <div className="dropdown-item" onClick={() => onMenuAction && onMenuAction("clear-nodes")}>Clear Nodes</div>
                <div className="dropdown-item" onClick={() => onMenuAction && onMenuAction("clear-edges")}>Clear Edges</div>
                <div className="dropdown-sep" />
                <div className="dropdown-item" onClick={() => onMenuAction && onMenuAction("import-threagile")}>Import Threagile (YAML)</div>
                <div className="dropdown-sep" />
                <div className="dropdown-item" onClick={() => onMenuAction && onMenuAction("export-otm")}>Export OTM</div>
                <div className="dropdown-item" onClick={() => onMenuAction && onMenuAction("export-threagile")}>Export Threagile</div>
                <div className="dropdown-item" onClick={() => onMenuAction && onMenuAction("export-report")}>Export Report</div>
              </>
            )}
          </div>
        </div>
        <button className="hit-area-hover" aria-label="Notifications" data-testid="notification_button">
          <span className="notif-dot" />
          <Bell size={16} />
        </button>
        <div className="v-sep" role="none" />
        { googleUser ? (
          <div ref={userMenuRef} className={`dropdown${userMenuOpen ? " open" : ""}`} data-testid="user-menu-dropdown">
            <button className="user-menu dropdown-trigger" data-testid="user_menu_button" aria-haspopup="menu" onClick={() => setUserMenuOpen(v => !v)}>
              <div className="avatar" style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", background: "#e5e7eb" }}>
                {googleUser?.picture ? (
                  <img src={googleUser.picture} alt="avatar" referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                ) : null}
              </div>
              {googleUser?.name ? <span className="user-name" style={{ marginLeft: 8 }} title={googleUser.email || undefined}>{googleUser.name}</span> : null}
              <ChevronsUpDown size={14} />
            </button>
            <div className="dropdown-content">
              <div className="dropdown-item" onClick={() => logout()}>退出登录</div>
            </div>
          </div>
        ) : null }
      </div>
    </div>
  );
}

