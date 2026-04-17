import { useState, useEffect } from "react";
import { Show, SignIn, useUser } from "@clerk/react";
import ThreatModelingApp from "./ThreatModelingApp";
import AttackPathApp from "./AttackPathApp";
import AppHeader from "./components/AppHeader";
import { trackPageView } from "./utils/analytics";

export default function App() {
  const [mode, setMode] = useState<"tm" | "ap">("tm");
  const { isLoaded } = useUser();

  useEffect(() => {
    trackPageView(mode === "tm" ? "/threat-modeling" : "/attack-path");
  }, []);

  useEffect(() => {
    trackPageView(mode === "tm" ? "/threat-modeling" : "/attack-path");
  }, [mode]);

  if (!isLoaded) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
        <svg width="28" height="28" viewBox="0 0 24 24" role="status" aria-label="Loading">
          <circle cx="12" cy="12" r="10" stroke="#e5e7eb" strokeWidth="3.5" fill="none" />
          <path d="M12 2 a10 10 0 0 1 10 10" stroke="#6b7280" strokeWidth="3.5" fill="none">
            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur=".8s" repeatCount="indefinite" />
          </path>
        </svg>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <AppHeader
        project="Starter Project"
        title={mode === "tm" ? "Threat Modeling" : "Attack Path Analysis"}
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

      {/* Frosted glass overlay + Clerk sign-in when not authenticated */}
      <Show when="signed-out">
        <div className="auth-overlay">
          <div className="auth-card">
            <SignIn routing="hash" />
          </div>
        </div>
      </Show>
    </div>
  );
}

