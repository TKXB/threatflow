import { useState, useEffect } from "react";
import ThreatModelingApp from "./ThreatModelingApp";
import AttackPathApp from "./AttackPathApp";
import AppHeader from "./components/AppHeader";
import { AuthProvider } from "./context/AuthContext";
import { trackPageView } from "./utils/analytics";

export default function App() {
  const [mode, setMode] = useState<"tm" | "ap">("tm");

  // 追踪初始页面浏览
  useEffect(() => {
    trackPageView(mode === "tm" ? "/threat-modeling" : "/attack-path");
  }, []);

  // 追踪模式切换
  useEffect(() => {
    trackPageView(mode === "tm" ? "/threat-modeling" : "/attack-path");
  }, [mode]);
  return (
    <AuthProvider>
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <AppHeader
          project="Starter Project"
          title={mode === "tm" ? "Threat Modeling" : "Attack Path"}
          mode={mode}
          onSelectMode={setMode}
          onMenuAction={(key) => {
            const ev = new CustomEvent("ap-menu", { detail: { key } });
            window.dispatchEvent(ev);
          }}
        />
        <div style={{ flex: 1, minHeight: 0 }}>
          {mode === "tm" ? <ThreatModelingApp /> : <AttackPathApp />}
        </div>
      </div>
    </AuthProvider>
  );
}

