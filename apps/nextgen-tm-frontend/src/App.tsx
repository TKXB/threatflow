import { useState } from "react";
import ThreatModelingApp from "./ThreatModelingApp";
import AttackPathApp from "./AttackPathApp";
import AppHeader from "./components/AppHeader";

export default function App() {
  const [mode, setMode] = useState<"tm" | "ap">("tm");
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <AppHeader project="Starter Project" title={mode === "tm" ? "Threat Modeling" : "Attack Path"} mode={mode} onSelectMode={setMode} />
      <div style={{ flex: 1, minHeight: 0 }}>
        {mode === "tm" ? <ThreatModelingApp /> : <AttackPathApp />}
      </div>
    </div>
  );
}

