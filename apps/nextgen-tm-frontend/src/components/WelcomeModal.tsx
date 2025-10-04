import React from "react";

type WelcomeModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  primaryText?: string;
};

export default function WelcomeModal({ open, onClose, title = "Get started", description = "", primaryText = "Start" }: WelcomeModalProps) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} />
      <div role="dialog" aria-modal style={{ position: "relative", zIndex: 61, width: "min(960px, 92vw)", maxHeight: "86vh", background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 12, boxShadow: "0 24px 64px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 16, borderBottom: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#111827", marginBottom: 6 }}>{title}</div>
          {description ? (
            <div style={{ fontSize: 13, color: "#6b7280", lineHeight: 1.5 }}>{description}</div>
          ) : null}
        </div>
        <div style={{ padding: 16, overflow: "auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(1, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div
              style={{
                position: "relative",
                minHeight: 140,
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                background: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
                textAlign: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#111827" }}>Welcome</div>
                <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>Start by adding nodes from the left palette and connect them on the canvas.</div>
                <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: "#f0f9ff", border: "1px solid #bae6fd", color: "#0c4a6e", fontSize: 12, textAlign: "left" }}>
                  提示：请在 Options → LLM Settings 中配置 LLM Base URL 与 API Key，以启用基于大模型的分析与生成功能。
                </div>
                <div style={{ marginTop: 12 }}>
                  <button onClick={onClose} style={{ height: 36, padding: "0 12px", borderRadius: 8, border: "1px solid #d1d5db", background: "#111827", color: "#ffffff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{primaryText}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


