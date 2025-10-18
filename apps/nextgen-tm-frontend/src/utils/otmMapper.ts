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

  // 1) Prefer full-fidelity restore from layout if available
  if (layout && Array.isArray(layout.nodes)) {
    const nodes: Node[] = (layout.nodes as any[]).map((l: any) => ({
      id: l.id,
      type: l.type as any,
      position: { x: l.x || 0, y: l.y || 0 },
      data: l.props || {},
      width: l.width,
      height: l.height,
      zIndex: (l.type === "trustBoundary" ? 0 : 1) as any,
    }));

    let edges: Edge[] = [];
    if (Array.isArray(layout.edges)) {
      edges = (layout.edges as any[]).map((e: any) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        data: e.props || {},
      } as Edge));
    } else {
      // fallback to dataflows if layout edges missing
      edges = (otm.dataflows || []).map((f) => ({ id: f.id, source: f.source, target: f.destination, data: { protocol: f.protocol } } as Edge));
    }

    return { nodes, edges };
  }

  // 2) Fallback: reconstruct from components/trustZones/dataflows (no layout)
  const nodes: Node[] = [];
  for (const c of otm.components || []) {
    nodes.push({ id: c.id, type: c.type as any, position: { x: 0, y: 0 }, data: { label: c.name }, zIndex: 1 as any });
  }
  for (const tz of otm.trustZones || []) {
    nodes.push({ id: tz.id, type: "trustBoundary", position: { x: 0, y: 0 }, data: { label: tz.name }, width: 260, height: 160, zIndex: 0 as any });
  }
  const edges: Edge[] = (otm.dataflows || []).map((f) => ({ id: f.id, source: f.source, target: f.destination, data: { protocol: f.protocol } } as Edge));
  return { nodes, edges };
}

