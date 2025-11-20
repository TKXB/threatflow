import { useState } from "react";
import ThreatModelingApp from "./ThreatModelingApp";
import AttackPathApp from "./AttackPathApp";
import AppHeader from "./components/AppHeader";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
  const [mode, setMode] = useState<"tm" | "ap">("tm");
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

