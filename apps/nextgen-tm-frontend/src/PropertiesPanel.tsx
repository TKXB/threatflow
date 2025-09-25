import { memo } from "react";

type SelectProps = {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
};

function RowSelect({ label, value, options, onChange }: SelectProps) {
  const toLower = (s: string) => String(s || "").toLowerCase();
  const isYesNo = Array.isArray(options) && options.length === 2 &&
    (() => {
      const set = new Set(options.map((o) => toLower(o.value)));
      return set.has("yes") && set.has("no");
    })();

  if (isYesNo) {
    const isOn = toLower(value) === "yes";
    return (
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 12, color: "#6b7280" }}>{label}</span>
        <button
          type="button"
          className={`toggle-switch${isOn ? " on" : ""}`}
          aria-pressed={isOn}
          onClick={() => onChange(isOn ? "no" : "yes")}
        />
      </label>
    );
  }

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

type InputProps = {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
};

function RowInput({ label, value, placeholder, onChange }: InputProps) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 12, color: "#6b7280" }}>{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          border: "1px solid #d1d5db",
          borderRadius: 6,
          padding: "6px 8px",
          background: "#fff",
        }}
      />
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

type DynamicFieldDef = { key: string; label: string; type: string; options?: { value: string; label: string }[]; default?: string };

function DynamicFields({ defs, data, onChange }: { defs: DynamicFieldDef[]; data?: Record<string, any>; onChange: (updates: Record<string, any>) => void }) {
  if (!defs || defs.length === 0) return null;
  return (
    <>
      {defs.map((f) => {
        if (f.type === "select") {
          return (
            <RowSelect
              key={f.key}
              label={f.label}
              value={(data?.[f.key] ?? f.default ?? "").toString()}
              options={f.options ?? []}
              onChange={(v) => onChange({ [f.key]: v })}
            />
          );
        }
        return (
          <RowInput
            key={f.key}
            label={f.label}
            value={(data?.[f.key] ?? f.default ?? "").toString()}
            onChange={(v) => onChange({ [f.key]: v })}
          />
        );
      })}
    </>
  );
}

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
            <RowInput
              label="Label"
              value={data?.label ?? ""}
              placeholder="Actor label"
              onChange={(v) => onNodeChange({ label: v })}
            />
            <RowSelect
              label="Entry Point"
              value={data?.isEntry ?? "no"}
              options={[
                { value: "no", label: "No" },
                { value: "yes", label: "Yes" },
              ]}
              onChange={(v) => onNodeChange({ isEntry: v })}
            />
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
            <RowInput
              label="Label"
              value={data?.label ?? ""}
              placeholder="Process label"
              onChange={(v) => onNodeChange({ label: v })}
            />
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
            <RowSelect
              label="Impact (1-5)"
              value={(data?.impact ?? "3").toString()}
              options={[
                { value: "1", label: "1" },
                { value: "2", label: "2" },
                { value: "3", label: "3" },
                { value: "4", label: "4" },
                { value: "5", label: "5" },
              ]}
              onChange={(v) => onNodeChange({ impact: v })}
            />
          </div>
        );
      case "store":
        return (
          <div className="right-panel">
            <h3>Asset</h3>
            <RowInput
              label="Label"
              value={data?.label ?? ""}
              placeholder="Asset label"
              onChange={(v) => onNodeChange({ label: v })}
            />
            <RowSelect
              label="Target"
              value={data?.isTarget ?? "no"}
              options={[
                { value: "no", label: "No" },
                { value: "yes", label: "Yes" },
              ]}
              onChange={(v) => onNodeChange({ isTarget: v })}
            />
            <RowSelect
              label="Impact (1-5)"
              value={(data?.impact ?? "4").toString()}
              options={[
                { value: "1", label: "1" },
                { value: "2", label: "2" },
                { value: "3", label: "3" },
                { value: "4", label: "4" },
                { value: "5", label: "5" },
              ]}
              onChange={(v) => onNodeChange({ impact: v })}
            />
            {Array.isArray((data as any)?.properties) && (
              <DynamicFields defs={(data as any).properties as any} data={data} onChange={onNodeChange} />
            )}
          </div>
        );
      case "trustBoundary":
        return (
          <div className="right-panel">
            <h3>Trust Boundary</h3>
            <RowInput
              label="Label"
              value={data?.label ?? ""}
              placeholder="Boundary label"
              onChange={(v) => onNodeChange({ label: v })}
            />
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
            {data?.containedNodes && data.containedNodes.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <span style={{ fontSize: 12, color: "#6b7280" }}>Contained Components:</span>
                <div style={{ fontSize: 11, color: "#374151", marginTop: 4 }}>
                  {data.containedNodes.join(", ")}
                </div>
              </div>
            )}
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
      <RowInput
        label="Label"
        value={data?.label ?? ""}
        placeholder="Edge label"
        onChange={(v) => onEdgeChange({ label: v })}
      />
      <RowSelect
        label="Protocol"
        value={data?.protocol ?? "https"}
        options={[
          { value: "unknown-protocol", label: "unknown-protocol" },
          { value: "http", label: "http" },
          { value: "https", label: "https" },
          { value: "ws", label: "ws" },
          { value: "wss", label: "wss" },
          { value: "reverse-proxy-web-protocol", label: "reverse-proxy-web-protocol" },
          { value: "reverse-proxy-web-protocol-encrypted", label: "reverse-proxy-web-protocol-encrypted" },
          { value: "mqtt", label: "mqtt" },
          { value: "jdbc", label: "jdbc" },
          { value: "jdbc-encrypted", label: "jdbc-encrypted" },
          { value: "odbc", label: "odbc" },
          { value: "odbc-encrypted", label: "odbc-encrypted" },
          { value: "sql-access-protocol", label: "sql-access-protocol" },
          { value: "sql-access-protocol-encrypted", label: "sql-access-protocol-encrypted" },
          { value: "nosql-access-protocol", label: "nosql-access-protocol" },
          { value: "nosql-access-protocol-encrypted", label: "nosql-access-protocol-encrypted" },
          { value: "binary", label: "binary" },
          { value: "binary-encrypted", label: "binary-encrypted" },
          { value: "text", label: "text" },
          { value: "text-encrypted", label: "text-encrypted" },
          { value: "ssh", label: "ssh" },
          { value: "ssh-tunnel", label: "ssh-tunnel" },
          { value: "smtp", label: "smtp" },
          { value: "smtp-encrypted", label: "smtp-encrypted" },
          { value: "pop3", label: "pop3" },
          { value: "pop3-encrypted", label: "pop3-encrypted" },
          { value: "imap", label: "imap" },
          { value: "imap-encrypted", label: "imap-encrypted" },
          { value: "ftp", label: "ftp" },
          { value: "ftps", label: "ftps" },
          { value: "sftp", label: "sftp" },
          { value: "scp", label: "scp" },
          { value: "ldap", label: "ldap" },
          { value: "ldaps", label: "ldaps" },
          { value: "jms", label: "jms" },
          { value: "nfs", label: "nfs" },
          { value: "smb", label: "smb" },
          { value: "smb-encrypted", label: "smb-encrypted" },
          { value: "local-file-access", label: "local-file-access" },
          { value: "nrpe", label: "nrpe" },
          { value: "xmpp", label: "xmpp" },
          { value: "iiop", label: "iiop" },
          { value: "iiop-encrypted", label: "iiop-encrypted" },
          { value: "jrmp", label: "jrmp" },
          { value: "jrmp-encrypted", label: "jrmp-encrypted" },
          { value: "in-process-library-call", label: "in-process-library-call" },
          { value: "container-spawning", label: "container-spawning" },
        ]}
        onChange={(v) => onEdgeChange({ protocol: v })}
      />
      <RowSelect
        label="Likelihood (1-5)"
        value={(data?.likelihood ?? "3").toString()}
        options={[
          { value: "1", label: "1" },
          { value: "2", label: "2" },
          { value: "3", label: "3" },
          { value: "4", label: "4" },
          { value: "5", label: "5" },
        ]}
        onChange={(v) => onEdgeChange({ likelihood: v })}
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

