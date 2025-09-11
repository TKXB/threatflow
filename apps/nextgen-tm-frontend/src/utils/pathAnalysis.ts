import type { Edge, Node } from "@xyflow/react";

export type SimplePath = {
  nodeIds: string[];
  labels: string[];
};

export type AnalyzeOptions = {
  k?: number;
  maxDepth?: number;
  sources?: string[]; // node ids
  targets?: string[]; // node ids
};

export type ScoredPath = {
  nodeIds: string[];
  labels: string[];
  score: number;
};

function getLabel(n: Node): string {
  const dataLabel = (n as any).data?.label;
  if (typeof dataLabel === "string" && dataLabel.trim().length > 0) return dataLabel;
  return String(n.type || n.id);
}

function inferSources(nodes: Node[]): string[] {
  const flagged = nodes.filter((n) => {
    const v = (n as any).data?.isEntry;
    return v === true || v === "yes";
  });
  if (flagged.length > 0) return flagged.map((n) => n.id);
  return nodes.filter((n) => n.type === "actor").map((n) => n.id);
}

function inferTargets(nodes: Node[]): string[] {
  const flagged = nodes.filter((n) => {
    const v = (n as any).data?.isTarget;
    return v === true || v === "yes";
  });
  if (flagged.length > 0) return flagged.map((n) => n.id);
  const candidates = nodes.filter((n) => {
    const tech = (n as any).data?.technology?.toString().toLowerCase?.();
    const label = ((n as any).data?.label || "").toString().toLowerCase?.();
    if (n.type === "store" && (tech === "target" || label.includes("target") || label.includes("goal"))) return true;
    return false;
  });
  if (candidates.length > 0) return candidates.map((n) => n.id);
  // fallback: any store node as potential target
  return nodes.filter((n) => n.type === "store").map((n) => n.id);
}

function getImpactForNode(node: Node): number {
  const raw = (node as any).data?.impact;
  const val = Number.parseInt(String(raw ?? ""), 10);
  if (Number.isFinite(val) && val >= 1 && val <= 5) return val;
  // simple defaults by type/flags
  if (node.type === "store") {
    const containsPII = (node as any).data?.containsPII;
    return containsPII === "yes" ? 5 : 3;
  }
  if (node.type === "process") return 3;
  if (node.type === "actor") return 2;
  return 2;
}

function getLikelihoodForEdge(edge: Edge): number {
  const raw = (edge as any).data?.likelihood;
  const val = Number.parseInt(String(raw ?? ""), 10);
  if (Number.isFinite(val) && val >= 1 && val <= 5) return val;
  // quick defaults based on protocol/public network
  const p = ((edge as any).data?.protocol || "").toString().toLowerCase();
  if ((edge as any).data?.publicNetwork === "yes") return 4;
  if (p.includes("http") && !p.includes("https")) return 4;
  if (p.includes("mqtt") || p.includes("ws")) return 3;
  return 2;
}

function buildAdjacency(edges: Edge[]): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const e of edges) {
    const src = (e as any).source as string;
    const dst = (e as any).target as string;
    if (!src || !dst) continue;
    if (!adj.has(src)) adj.set(src, []);
    adj.get(src)!.push(dst);
  }
  return adj;
}

export function analyzeSimplePaths(
  nodes: Node[],
  edges: Edge[],
  options: AnalyzeOptions = {}
): SimplePath[] {
  const k = Math.max(1, options.k ?? 10);
  const maxDepth = Math.max(1, options.maxDepth ?? 16);
  const idToNode = new Map<string, Node>(nodes.map((n) => [n.id, n]));
  const sources = (options.sources && options.sources.length > 0) ? options.sources : inferSources(nodes);
  const targets = new Set<string>((options.targets && options.targets.length > 0) ? options.targets : inferTargets(nodes));
  const adj = buildAdjacency(edges);

  const results: SimplePath[] = [];

  function dfs(currentId: string, path: string[], visited: Set<string>) {
    if (path.length > maxDepth) return;
    if (targets.has(currentId)) {
      const labels = path.map((id) => getLabel(idToNode.get(id)!));
      results.push({ nodeIds: [...path], labels });
      return;
    }
    const neighbors = adj.get(currentId) || [];
    for (const nb of neighbors) {
      if (visited.has(nb)) continue; // simple path only
      visited.add(nb);
      path.push(nb);
      dfs(nb, path, visited);
      path.pop();
      visited.delete(nb);
      if (results.length >= k) return;
    }
  }

  for (const s of sources) {
    const visited = new Set<string>([s]);
    dfs(s, [s], visited);
    if (results.length >= k) break;
  }

  return results.slice(0, k);
}

export function analyzeSimplePathsWithScores(
  nodes: Node[],
  edges: Edge[],
  options: AnalyzeOptions = {}
): ScoredPath[] {
  const base = analyzeSimplePaths(nodes, edges, options);
  const idToNode = new Map<string, Node>(nodes.map((n) => [n.id, n]));
  const findEdge = (a: string, b: string): Edge | undefined => edges.find((e: any) => e.source === a && e.target === b);

  function scoreOf(path: SimplePath): number {
    let score = 0;
    for (let i = 0; i < path.nodeIds.length - 1; i++) {
      const fromId = path.nodeIds[i];
      const toId = path.nodeIds[i + 1];
      const toNode = idToNode.get(toId);
      const edge = findEdge(fromId, toId);
      if (!toNode || !edge) continue;
      const I = getImpactForNode(toNode);
      const L = getLikelihoodForEdge(edge);
      score += I * L;
    }
    return score;
  }

  const scored = base.map((p) => ({ nodeIds: p.nodeIds, labels: p.labels, score: scoreOf(p) }));
  scored.sort((a, b) => b.score - a.score);
  const k = Math.max(1, options.k ?? 10);
  return scored.slice(0, k);
}

