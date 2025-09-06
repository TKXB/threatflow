import type { Edge, Node } from "@xyflow/react";
import { dump as yamlDump } from "js-yaml";

// Very small subset: build a minimal Threagile YAML that validates for basic analysis
// Focus: technical_assets + communication_links

type TechAsset = {
  id: string;
  description?: string;
  type: "external-entity" | "process" | "datastore";
  usage: "business" | "devops";
  size?: "application" | "service" | "system" | "component";
  technology?: string; // use singular to satisfy older/strict validators
  internet?: boolean;
  out_of_scope?: boolean;
  encryption?: "none" | "transparent" | "data-with-symmetric-shared-key" | "data-with-asymmetric-shared-key" | "data-with-end-user-individual-key";
  machine?: "physical" | "virtual" | "container" | "serverless";
  confidentiality: "public" | "internal" | "restricted" | "confidential" | "strictly-confidential";
  integrity: "archive" | "operational" | "important" | "critical" | "mission-critical";
  availability: "archive" | "operational" | "important" | "critical" | "mission-critical";
  communication_links?: Record<string, CommLink> | null;
};

type CommLink = {
  target: string;
  protocol: string; // map from UI protocol
  authentication?: "none" | "credentials" | "session-id" | "token" | "client-certificate" | "two-factor" | "externalized";
  authorization?: "none" | "technical-user" | "enduser-identity-propagation";
  vpn?: boolean;
  ip_filtered?: boolean;
  readonly?: boolean;
  usage?: "business" | "devops";
};

export function buildThreagileYaml(nodes: Node[], edges: Edge[], title = "Model"): string {
  const assets: Record<string, TechAsset> = {};
  const boundaries: Record<string, any> = {};
  const idMap: Record<string, string> = {};

  // sanitize and uniquify ids according to Threagile rules (letters, numbers, hyphen)
  const used = new Set<string>();
  for (const n of nodes) {
    if (!n.type) continue;
    let sid = sanitizeId(n.id);
    let base = sid;
    let i = 1;
    while (used.has(sid)) {
      sid = `${base}-${i++}`;
    }
    used.add(sid);
    idMap[n.id] = sid;
  }

  // Create assets and boundaries from nodes
  for (const n of nodes) {
    if (!n.type) continue;
    const data: any = n.data || {};
    const sid = idMap[n.id];
    
    if (n.type === "trustBoundary") {
      // Handle trust boundary
      boundaries[sid] = {
        id: sid,
        description: data.label || "Trust Boundary",
        type: mapBoundaryType(data.boundaryType || "network"),
        tags: [],
        technical_assets_inside: (data.containedNodes || []).map((nodeId: string) => idMap[nodeId]).filter(Boolean),
        trust_boundaries_nested: [],
      };
      continue;
    }
    
    let type: TechAsset["type"] = "process";
    if (n.type === "actor") type = "external-entity";
    if (n.type === "store") type = "datastore";

    const technology = n.type === "store" ? "database" : n.type === "actor" ? "client-system" : (data.technology || "web-application");

    assets[sid] = {
      id: sid,
      description: data.label || n.id,
      type,
      usage: "business",
      size: "application",
      technology,
      internet: data.publicNetwork === "yes" || false,
      out_of_scope: data.out_of_scope === "yes" || false,
      encryption: "none",
      machine: "virtual",
      confidentiality: "internal",
      integrity: "important",
      availability: "important",
      communication_links: {},
    };
  }

  // Create communication links on source asset
  for (const e of edges) {
    if (!e.source || !e.target) continue;
    const ssrc = idMap[e.source];
    const sdst = idMap[e.target];
    const src = assets[ssrc];
    const dst = assets[sdst];
    if (!src || !dst) continue;
    const data: any = e.data || {};
    const key = `link-${ssrc}-${sdst}`;
    (src.communication_links as Record<string, CommLink>)[key] = {
      target: sdst,
      protocol: mapProtocol(data.protocol || "https"),
      authentication: mapAuth(data.authentication || "token"),
      authorization: "none",
      usage: "business",
    };
  }

  // Threagile root doc (minimal)
  const doc: any = {
    threagile_version: "1.0.0",
    title,
    date: new Date().toISOString().slice(0, 10),
    business_criticality: "important",
    // Provide at least empty sections some validators expect
    data_assets: {},
    trust_boundaries: boundaries,
    technical_assets: Object.fromEntries(Object.entries(assets).map(([k, v]) => [k, sanitizeAsset(v)])),
  };

  return yamlDump(doc, { noRefs: true });
}

function sanitizeAsset(a: TechAsset): TechAsset {
  // if no links, use null to keep serializer compact
  if (a.communication_links && Object.keys(a.communication_links).length === 0) {
    a.communication_links = null;
  }
  return a;
}

function sanitizeId(id: string): string {
  // allow letters, numbers, hyphen; replace others with hyphen, collapse repeats, trim
  const s = id
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
  return s.length ? s : "asset";
}

function mapProtocol(p: string): string {
  // Accept either UI legacy names (HTTP/HTTPS) or native Threagile protocol enums.
  const legacy: Record<string, string> = { HTTP: "http", HTTPS: "https" };
  if (legacy[p]) return legacy[p];
  // If user selected a Threagile protocol value already, pass through.
  return p || "unknown-protocol";
}

function mapAuth(a: string): CommLink["authentication"] {
  const m: Record<string, CommLink["authentication"]> = {
    none: "none",
    basic: "credentials",
    token: "token",
    mtls: "client-certificate",
  };
  return m[a] || "none";
}

function mapBoundaryType(t: string): string {
  const m: Record<string, string> = {
    network: "network-cloud-security-group",
    privilege: "execution-environment",
    tenant: "network-policy-namespace-isolation",
  };
  return m[t] || "network-cloud-security-group";
}

