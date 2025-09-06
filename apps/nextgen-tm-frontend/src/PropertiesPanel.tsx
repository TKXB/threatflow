import { memo } from "react";

type SelectProps = {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
};

function RowSelect({ label, value, options, onChange }: SelectProps) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 12, color: "#6b7280" }}>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          border: "1px solid #d1d5db",
          borderRadius: 6,
          padding: "6px 8px",
          background: "#fff",
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export type PanelProps = {
  kind: "node" | "edge" | null;
  nodeType?: string;
  data?: Record<string, any>;
  onNodeChange: (updates: Record<string, any>) => void;
  onEdgeChange: (updates: Record<string, any>) => void;
};

export default memo(function PropertiesPanel({ kind, nodeType, data, onNodeChange, onEdgeChange }: PanelProps) {
  if (!kind) {
    return (
      <div className="right-panel">
        <h3>Properties</h3>
        <div className="empty">Select a node or an edge</div>
      </div>
    );
  }

  if (kind === "node") {
    switch (nodeType) {
      case "actor":
        return (
          <div className="right-panel">
            <h3>Actor</h3>
            <RowSelect
              label="Provides Authentication"
              value={data?.providesAuthentication ?? "no"}
              options={[
                { value: "no", label: "No" },
                { value: "yes", label: "Yes" },
              ]}
              onChange={(v) => onNodeChange({ providesAuthentication: v })}
            />
          </div>
        );
      case "process":
        return (
          <div className="right-panel">
            <h3>Process</h3>
            <RowSelect
              label="Handles Secrets"
              value={data?.handlesSecrets ?? "no"}
              options={[
                { value: "no", label: "No" },
                { value: "yes", label: "Yes" },
              ]}
              onChange={(v) => onNodeChange({ handlesSecrets: v })}
            />
            <RowSelect
              label="Validates Input"
              value={data?.validatesInput ?? "yes"}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
              onChange={(v) => onNodeChange({ validatesInput: v })}
            />
          </div>
        );
      case "store":
        return (
          <div className="right-panel">
            <h3>Data Store</h3>
            <RowSelect
              label="Contains PII"
              value={data?.containsPII ?? "no"}
              options={[
                { value: "no", label: "No" },
                { value: "yes", label: "Yes" },
              ]}
              onChange={(v) => onNodeChange({ containsPII: v })}
            />
            <RowSelect
              label="Encrypted at Rest"
              value={data?.encryptedAtRest ?? "yes"}
              options={[
                { value: "yes", label: "Yes" },
                { value: "no", label: "No" },
              ]}
              onChange={(v) => onNodeChange({ encryptedAtRest: v })}
            />
          </div>
        );
      case "trustBoundary":
        return (
          <div className="right-panel">
            <h3>Trust Boundary</h3>
            <RowSelect
              label="Boundary Type"
              value={data?.boundaryType ?? "network"}
              options={[
                { value: "network", label: "Network" },
                { value: "privilege", label: "Privilege" },
                { value: "tenant", label: "Tenant" },
              ]}
              onChange={(v) => onNodeChange({ boundaryType: v })}
            />
          </div>
        );
      default:
        return (
          <div className="right-panel">
            <h3>Node</h3>
            <div className="empty">No configurable properties</div>
          </div>
        );
    }
  }

  // Edge (Data Flow)
  return (
    <div className="right-panel">
      <h3>Data Flow</h3>
      <RowSelect
        label="Protocol"
        value={data?.protocol ?? "HTTP"}
        options={[
          { value: "HTTP", label: "HTTP" },
          { value: "HTTPS", label: "HTTPS" },
          { value: "gRPC", label: "gRPC" },
          { value: "AMQP", label: "AMQP" },
        ]}
        onChange={(v) => onEdgeChange({ protocol: v })}
      />
      <RowSelect
        label="Encrypted in Transit"
        value={data?.encryptedInTransit ?? "no"}
        options={[
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ]}
        onChange={(v) => onEdgeChange({ encryptedInTransit: v })}
      />
      <RowSelect
        label="Public Network"
        value={data?.publicNetwork ?? "no"}
        options={[
          { value: "no", label: "No" },
          { value: "yes", label: "Yes" },
        ]}
        onChange={(v) => onEdgeChange({ publicNetwork: v })}
      />
    </div>
  );
});

