import type { Edge, Node } from "@xyflow/react";

export type OtmDocument = {
  otmVersion: string;
  name: string;
  components: { id: string; name: string; type: string }[];
  dataflows: { id: string; source: string; destination: string; protocol?: string }[];
  trustZones: { id: string; name: string; type?: string }[];
  extensions?: any;
};

export function buildOtmFromGraph(nodes: Node[], edges: Edge[], name = "Model"): OtmDocument {
  const components = nodes
    .filter((n) => n.type === "actor" || n.type === "process" || n.type === "store")
    .map((n) => ({ id: n.id, name: (n.data as any)?.label || n.id, type: n.type || "component" }));

  const dataflows = edges.map((e) => ({
    id: e.id,
    source: e.source!,
    destination: e.target!,
    protocol: (e.data as any)?.protocol,
  }));

  const trustZones = nodes
    .filter((n) => n.type === "trustBoundary")
    .map((n) => ({ id: n.id, name: (n.data as any)?.label || "Trust Boundary", type: (n.data as any)?.boundaryType }));

  const layoutNodes = nodes.map((n) => ({
    id: n.id,
    x: n.position?.x ?? 0,
    y: n.position?.y ?? 0,
    width: (n as any).width,
    height: (n as any).height,
    type: n.type,
    props: n.data || {},
  }));

  const layoutEdges = edges.map((e) => ({ id: e.id, source: e.source, target: e.target, props: e.data || {} }));

  return {
    otmVersion: "0.1",
    name,
    components,
    dataflows,
    trustZones,
    extensions: {
      "x-threatflow": {
        layout: {
          nodes: layoutNodes,
          edges: layoutEdges,
        },
      },
    },
  };
}

export function applyOtmToGraph(otm: OtmDocument): { nodes: Node[]; edges: Edge[] } {
  const layout = otm.extensions?.["x-threatflow"]?.layout;
  const byId: Record<string, any> = {};
  if (layout?.nodes) {
    layout.nodes.forEach((n: any) => (byId[n.id] = n));
  }

  const nodes: Node[] = [];
  // components
  for (const c of otm.components || []) {
    const l = byId[c.id] || {};
    nodes.push({ id: c.id, type: c.type as any, position: { x: l.x || 0, y: l.y || 0 }, data: l.props || { label: c.name }, width: l.width, height: l.height });
  }
  // trust boundaries
  for (const tz of otm.trustZones || []) {
    const l = byId[tz.id] || {};
    nodes.push({ id: tz.id, type: "trustBoundary", position: { x: l.x || 0, y: l.y || 0 }, data: { ...(l.props || {}), label: tz.name }, width: l.width || 260, height: l.height || 160 });
  }

  const edges: Edge[] = (otm.dataflows || []).map((f) => ({ id: f.id, source: f.source, target: f.destination, data: { protocol: f.protocol } } as Edge));

  return { nodes, edges };
}

