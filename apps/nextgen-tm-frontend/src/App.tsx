import { useState } from "react";
import ThreatModelingApp from "./ThreatModelingApp";
import AttackPathApp from "./AttackPathApp";

export default function App() {
  const [mode, setMode] = useState<"tm" | "ap">("tm");
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div className="toolbar" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <button
          style={{
            padding: "6px 12px",
            border: "1px solid #d1d5db",
            borderRadius: 4,
            background: mode === "tm" ? "#3b82f6" : "#f9fafb",
            color: mode === "tm" ? "#fff" : "#374151",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500
          }}
          onClick={() => setMode("tm")}
        >
          威胁建模
        </button>
        <button
          style={{
            padding: "6px 12px",
            border: "1px solid #d1d5db",
            borderRadius: 4,
            background: mode === "ap" ? "#3b82f6" : "#f9fafb",
            color: mode === "ap" ? "#fff" : "#374151",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500
          }}
          onClick={() => setMode("ap")}
        >
          攻击路径
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        {mode === "tm" ? <ThreatModelingApp /> : <AttackPathApp />}
      </div>
    </div>
  );
}

