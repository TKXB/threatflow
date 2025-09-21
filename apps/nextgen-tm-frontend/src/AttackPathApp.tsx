import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  Connection,
  Edge,
  Node,
  OnNodeDrag,
  OnNodesChange,
  OnEdgesChange,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "@xyflow/react";
import PropertiesPanel from "./PropertiesPanel";
import ContextMenu from "./components/ContextMenu";
import ActorNode from "./nodes/ActorNode";
import EntryPointNode from "./nodes/EntryPointNode";
import ProcessNode from "./nodes/ProcessNode";
import StoreNode from "./nodes/StoreNode";
import TrustBoundaryNode from "./nodes/TrustBoundaryNode";
import type { ScoredPath } from "./utils/pathAnalysis";
import { buildOtmFromGraph } from "./utils/otmMapper";
import { buildThreagileYaml } from "./utils/threagileMapper";
import type { AttackMethod } from "./knowledge/attackMethods";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";

type BasicNodeData = { label: string; technology?: string } & Record<string, any>;

// Palette configuration (runtime-pluggable)
type PaletteItem = {
  id?: string;
  label: string;
  icon?: string;
  type: string; // actor | entryPoint | process | store | trustBoundary
  technology?: string;
  flags?: Record<string, any>;
  priority?: number;
  beta?: boolean;
  legacy?: boolean;
};
type PaletteSection = { title: string; items: PaletteItem[] };
type PaletteConfig = { sections: PaletteSection[] };

// More permissive type for LLM output (can include "critical")
type LlmAttackMethod = {
  id?: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  confidence?: number; // 0..1
  references?: { title: string; url: string }[];
  matchedPath?: { nodeIds: string[]; labels?: string[] };
};

const initialNodes: Node<BasicNodeData>[] = [];
const initialEdges: Edge[] = [];

const nodeStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: 6,
  border: "1px solid #d1d5db",
  background: "#fff",
  minWidth: 100,
  textAlign: "center",
};

export default function AttackPathApp() {
  const reactFlowWrapper = useRef<HTMLDivElement | null>(null);
  const [rfInstance, setRfInstance] = useState<any>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [idSeq, setIdSeq] = useState(1);
  const [selectedKind, setSelectedKind] = useState<"node" | "edge" | null>(null);
  const [selectedNodeType, setSelectedNodeType] = useState<string | undefined>(undefined);
  const [selectedData, setSelectedData] = useState<Record<string, any> | undefined>(undefined);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; type: "node" | "edge"; id: string } | null>(null);
  const [highlighted, setHighlighted] = useState<{ nodeIds: Set<string>; edgeIds: Set<string> }>({ nodeIds: new Set(), edgeIds: new Set() });
  const [analyzing, setAnalyzing] = useState(false);
  const [lastScores, setLastScores] = useState<ScoredPath[] | null>(null);
  const [llmMethods, setLlmMethods] = useState<LlmAttackMethod[] | null>(null);
  const [settingsHydrated, setSettingsHydrated] = useState(false);
  const API = (import.meta as any).env?.VITE_NEXTGEN_API || "http://127.0.0.1:8890";
  const [llmBaseUrl, setLlmBaseUrl] = useState<string>("http://127.0.0.1:4000/v1");
  const [llmApiKey, setLlmApiKey] = useState<string>("");
  const [llmModel, setLlmModel] = useState<string>("gpt-4o-mini");
  const [showLlmSettings, setShowLlmSettings] = useState(false);
  const [paletteConfig, setPaletteConfig] = useState<PaletteConfig | null>(null);
  const [paletteError, setPaletteError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const nodeTypes = useMemo(
    () => ({
      actor: ActorNode,
      entryPoint: EntryPointNode,
      process: ProcessNode,
      store: StoreNode,
      trustBoundary: TrustBoundaryNode,
    } as any),
    []
  );

  const STORAGE_KEYS = {
    nodes: "tf_attack_nodes",
    edges: "tf_attack_edges",
    idseq: "tf_attack_idseq",
    llmBase: "tf_llm_base_url",
    llmKey: "tf_llm_api_key",
    llmModel: "tf_llm_model",
    paletteJson: "tf_palette_json",
  } as const;

  function safeParse<T>(text: string | null, fallback: T): T {
    if (!text) return fallback;
    try { return JSON.parse(text) as T; } catch { return fallback; }
  }

  function computeNextIdSeq(ns: Node[]): number {
    let maxNum = 0;
    for (const n of ns) {
      const m = /^n_(\d+)$/.exec(n.id);
      if (m) maxNum = Math.max(maxNum, parseInt(m[1], 10));
    }
    return Math.max(1, maxNum + 1);
  }

  // Persist LLM settings explicitly when clicking Save
  function saveLlmSettings() {
    try {
      localStorage.setItem(STORAGE_KEYS.llmBase, JSON.stringify(llmBaseUrl));
      localStorage.setItem(STORAGE_KEYS.llmKey, JSON.stringify(llmApiKey));
      localStorage.setItem(STORAGE_KEYS.llmModel, JSON.stringify(llmModel));
    } catch {}
    setShowLlmSettings(false);
  }

  useEffect(() => {
    try {
      const savedNodes = safeParse<Node<BasicNodeData>[]>(localStorage.getItem(STORAGE_KEYS.nodes), []);
      const savedEdges = safeParse<Edge[]>(localStorage.getItem(STORAGE_KEYS.edges), []);
      if (savedNodes.length > 0 || savedEdges.length > 0) {
        const mapped = savedNodes.map((n: any) => ({ ...n, zIndex: n.type === "trustBoundary" ? 0 : 1 }));
        setNodes(mapped as any);
        setEdges(savedEdges as any);
        const storedId = safeParse<number | null>(localStorage.getItem(STORAGE_KEYS.idseq), null);
        setIdSeq(storedId ?? computeNextIdSeq(mapped as any));
      }
      const savedLlmBase = safeParse<string | null>(localStorage.getItem(STORAGE_KEYS.llmBase), null);
      const savedLlmKey = safeParse<string | null>(localStorage.getItem(STORAGE_KEYS.llmKey), null);
      const savedLlmModel = safeParse<string | null>(localStorage.getItem(STORAGE_KEYS.llmModel), null);
      if (savedLlmBase) setLlmBaseUrl(savedLlmBase);
      if (savedLlmKey) setLlmApiKey(savedLlmKey);
      if (savedLlmModel) setLlmModel(savedLlmModel);
      setSettingsHydrated(true);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.nodes, JSON.stringify(nodes));
      localStorage.setItem(STORAGE_KEYS.edges, JSON.stringify(edges));
      localStorage.setItem(STORAGE_KEYS.idseq, JSON.stringify(idSeq));
    } catch {}
  }, [nodes, edges, idSeq]);

  useEffect(() => {
    if (!settingsHydrated) return;
    try {
      localStorage.setItem(STORAGE_KEYS.llmBase, JSON.stringify(llmBaseUrl));
      // 注意：API Key 存在本地仅用于演示，不建议用于生产
      localStorage.setItem(STORAGE_KEYS.llmKey, JSON.stringify(llmApiKey));
      localStorage.setItem(STORAGE_KEYS.llmModel, JSON.stringify(llmModel));
    } catch {}
  }, [settingsHydrated, llmBaseUrl, llmApiKey, llmModel]);

  // ----- Palette loading chain: LocalStorage > Backend plugins > Default file -----
  async function loadPaletteFromLocal(): Promise<PaletteConfig | null> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.paletteJson);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.sections)) return parsed as PaletteConfig;
    } catch {}
    return null;
  }

  async function loadPaletteFromBackend(): Promise<PaletteConfig | null> {
    try {
      const res = await fetch(`${API}/api/palette/plugins`, { headers: { "accept": "application/json" } });
      const json = await res.json();
      const sections = Array.isArray(json?.sections) ? json.sections : [];
      if (sections.length > 0) return { sections } as PaletteConfig;
    } catch (e) {
      console.warn("Failed to load backend plugins palette", e);
    }
    return null;
  }

  async function loadDefaultPalette(): Promise<PaletteConfig | null> {
    try {
      const res = await fetch(`/palette.json?ts=${Date.now()}`);
      const json = await res.json();
      if (json && Array.isArray(json.sections)) return json as PaletteConfig;
    } catch (e) {
      console.warn("Failed to load default palette.json", e);
    }
    return null;
  }

  async function loadPalette() {
    setPaletteError(null);
    let loaded: PaletteConfig | null = await loadPaletteFromLocal();
    if (!loaded) loaded = await loadPaletteFromBackend();
    if (!loaded) loaded = await loadDefaultPalette();
    if (loaded) {
      setPaletteConfig(loaded);
    } else {
      setPaletteConfig({ sections: [] });
      setPaletteError("No palette available. Please import a JSON.");
    }
  }

  function triggerImport() { try { fileInputRef.current?.click(); } catch {} }
  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const parsed = JSON.parse(text);
        if (!parsed || !Array.isArray(parsed.sections)) throw new Error("Invalid palette JSON");
        localStorage.setItem(STORAGE_KEYS.paletteJson, text);
        setPaletteConfig(parsed as PaletteConfig);
        setPaletteError(null);
      } catch (err) {
        setPaletteError("Invalid palette JSON");
      } finally {
        try { (e.target as HTMLInputElement).value = ""; } catch {}
      }
    };
    reader.readAsText(file);
  }

  async function reloadPalette() { await loadPalette(); }
  async function resetPalette() { try { localStorage.removeItem(STORAGE_KEYS.paletteJson); } catch {}; await loadPalette(); }

  useEffect(() => { void loadPalette(); }, []);

  function download(filename: string, content: string, mime: string) {
    try {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {}
  }

  function clearHighlights() {
    setHighlighted({ nodeIds: new Set(), edgeIds: new Set() });
    // remove highlight styles
    setNodes((nds) => nds.map((n) => ({ ...n, style: { ...(n.style || {}), outline: undefined, boxShadow: undefined, borderColor: undefined } })));
    setEdges((eds) => eds.map((e) => ({ ...e, style: { ...(e.style || {}), stroke: undefined, strokeWidth: 1.6 } })));
  }

  function applyHighlightsFromPaths(paths: { nodeIds: string[] }[]) {
    const nodeIds = new Set<string>();
    const edgeIds = new Set<string>();
    const edgeByPair = new Map<string, string>();
    for (const e of edges) {
      const key = `${(e as any).source}__${(e as any).target}`;
      edgeByPair.set(key, e.id);
    }
    for (const p of paths) {
      for (const nid of p.nodeIds) nodeIds.add(nid);
      for (let i = 0; i < p.nodeIds.length - 1; i++) {
        const key = `${p.nodeIds[i]}__${p.nodeIds[i + 1]}`;
        const eid = edgeByPair.get(key);
        if (eid) edgeIds.add(eid);
      }
    }
    setHighlighted({ nodeIds, edgeIds });
    setNodes((nds) => nds.map((n) => nodeIds.has(n.id) ? { ...n, style: { ...(n.style || {}), outline: "2px solid #ef4444", boxShadow: "0 0 0 2px rgba(239,68,68,0.2)", borderColor: "#ef4444" } } : { ...n, style: { ...(n.style || {}), outline: undefined, boxShadow: undefined, borderColor: undefined } }));
    setEdges((eds) => eds.map((e) => edgeIds.has(e.id) ? { ...e, style: { ...(e.style || {}), stroke: "#ef4444", strokeWidth: 2.4 } } : { ...e, style: { ...(e.style || {}), stroke: undefined, strokeWidth: 1.6 } }));
  }

  const highlightMatchedPath = useCallback((matchedPath?: { nodeIds: string[] }) => {
    if (!matchedPath || !Array.isArray(matchedPath.nodeIds) || matchedPath.nodeIds.length < 2) return;
    applyHighlightsFromPaths([matchedPath]);
  }, [applyHighlightsFromPaths]);

  const exportSingleMethod = useCallback((method: LlmAttackMethod) => {
    try {
      const filename = `llm-method-${(method.id || method.title || "method").replace(/\s+/g, "-").toLowerCase()}.json`;
      const content = JSON.stringify(method, null, 2);
      const blob = new Blob([content], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {}
  }, []);

  const severityBadge = (sev?: string) => {
    const s = String(sev || "").toLowerCase();
    const style: React.CSSProperties = {
      display: "inline-block",
      padding: "2px 6px",
      borderRadius: 6,
      fontSize: 10,
      fontWeight: 700,
      color: s === "low" ? "#065f46" : s === "medium" ? "#7c2d12" : s === "high" ? "#7f1d1d" : "#fff",
      background: s === "low" ? "#d1fae5" : s === "medium" ? "#fde68a" : s === "high" ? "#fecaca" : "#ef4444",
      border: "1px solid rgba(0,0,0,0.05)",
    };
    const label = s ? s.toUpperCase() : "N/A";
    return <span style={style}>{label}</span>;
  };

  const columns = useMemo<ColumnDef<LlmAttackMethod>[]>(() => [
    {
      id: "severity",
      header: () => "Severity",
      accessorKey: "severity",
      cell: ({ row }) => severityBadge(row.original.severity),
      size: 100,
    },
    {
      id: "title",
      header: () => "Attack Method",
      accessorKey: "title",
      size: 240,
      cell: ({ row }) => <div style={{ fontWeight: 600, color: "#111827" }}>{row.original.title}</div>,
    },
    {
      id: "description",
      header: () => "Description",
      accessorKey: "description",
      size: 420,
      cell: ({ row }) => <div style={{ fontSize: 12, color: "#374151" }}>{row.original.description}</div>,
    },
    {
      id: "confidence",
      header: () => "Confidence",
      accessorKey: "confidence",
      size: 110,
      cell: ({ row }) => {
        const pct = Math.round(((row.original.confidence ?? 0) as number) * 100);
        const color = pct >= 80 ? "#065f46" : pct >= 60 ? "#92400e" : "#991b1b";
        return <span style={{ fontWeight: 600, color }}>{`${pct}%`}</span>;
      },
    },
    {
      id: "matchedPath",
      header: () => "Attack Path",
      accessorKey: "matchedPath",
      size: 280,
      cell: ({ row }) => {
        const labels = row.original.matchedPath?.labels || [];
        if (!labels.length) return <span style={{ color: "#9ca3af", fontSize: 12 }}>No path</span>;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
            {labels.map((lb, i) => (
              <span key={`${lb}-${i}`} style={{ background: "#e0f2fe", color: "#075985", padding: "2px 6px", borderRadius: 6, fontSize: 11 }}>
                {lb}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: () => "Actions",
      size: 160,
      cell: ({ row }) => (
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => highlightMatchedPath(row.original.matchedPath)} style={{ fontSize: 12, color: "#2563eb" }}>Highlight</button>
          <button onClick={() => exportSingleMethod(row.original)} style={{ fontSize: 12, color: "#374151" }}>Export</button>
        </div>
      ),
    },
  ], [exportSingleMethod, highlightMatchedPath]);

  const table = useReactTable({ data: llmMethods ?? [], columns, getCoreRowModel: getCoreRowModel() });

  async function runMockAnalysisAndHighlight() {
    setAnalyzing(true);
    try {
      const res = await fetch(`${API}/analysis/paths`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nodes, edges, k: 10, maxDepth: 20 }),
      });
      const json = await res.json();
      const paths: ScoredPath[] = json?.paths || [];
      setLastScores(paths);
      if (!Array.isArray(paths) || paths.length === 0) {
        alert("No paths found from entry to target.");
        clearHighlights();
        return;
      }
      applyHighlightsFromPaths([{ nodeIds: (paths[0] as any).nodeIds }] as any);
    } finally {
      setAnalyzing(false);
    }
  }

  const onConnect = useCallback((conn: Connection) => {
    setEdges((eds) =>
      addEdge(
        {
          ...conn,
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { strokeWidth: 1.6 },
        },
        eds
      )
    );
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("application/tm-node");
      const technology = event.dataTransfer.getData("application/tm-node-tech");
      const customLabel = event.dataTransfer.getData("application/tm-node-label");
      const flagsRaw = event.dataTransfer.getData("application/tm-node-flags");
      let extraFlags: Record<string, any> | undefined;
      try { extraFlags = flagsRaw ? JSON.parse(flagsRaw) : undefined; } catch { extraFlags = undefined; }
      if (!type) return;

      const flowPoint = rfInstance
        ? rfInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
        : (() => {
            const rect = reactFlowWrapper.current?.getBoundingClientRect();
            return { x: (event.clientX - (rect?.left || 0)), y: (event.clientY - (rect?.top || 0)) };
          })();
      const id = `n_${idSeq}`;
      setIdSeq((v) => v + 1);

      const label = customLabel
        || (type === "actor" ? (technology || "Actor")
        : type === "entryPoint" ? (technology || "Entry Point")
        : type === "process" ? (technology || "Process")
        : type === "store" ? (technology || "Store")
        : "Trust Boundary");

      const sizeMap: Record<string, { width: number; height: number }> = {
        actor: { width: 64, height: 64 },
        entryPoint: { width: 80, height: 80 },
        process: { width: 120, height: 60 },
        store: { width: 120, height: 70 },
        trustBoundary: { width: 260, height: 160 },
      };
      const sz = sizeMap[type] || { width: 100, height: 60 };
      const position = { x: flowPoint.x - sz.width / 2, y: flowPoint.y - sz.height / 2 };

      setNodes((nds) => [
        ...nds,
        { id, position, data: { label, technology: technology || undefined, ...(extraFlags || {}) }, type: (type as any), width: sz.width, height: sz.height, zIndex: type === "trustBoundary" ? 0 : 1 },
      ]);
    },
    [idSeq, rfInstance]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const SidebarAP = useMemo(
    () => (
      <div className="sidebar">
        <h3>Attack Path Palette</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
          <button onClick={triggerImport}>Import JSON</button>
          <button onClick={() => { void reloadPalette(); }}>Reload</button>
          <button onClick={() => { void resetPalette(); }}>Reset Default</button>
          <input ref={fileInputRef} onChange={onFileSelected} type="file" accept="application/json" style={{ display: "none" }} />
        </div>
        {paletteError && (
          <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 8 }}>{paletteError}</div>
        )}
        {!paletteError && !paletteConfig && (
          <div style={{ color: "#6b7280", fontSize: 12, marginTop: 8 }}>Loading palette...</div>
        )}
        {paletteConfig && paletteConfig.sections?.map((section, si) => (
          <div key={`sec-${si}`}>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: si === 0 ? 6 : 12 }}>{section.title}</div>
            {section.items?.map((it, ii) => (
              <div
                key={`item-${si}-${ii}-${it.label}`}
                className="palette-item"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/tm-node", it.type);
                  if (it.technology) e.dataTransfer.setData("application/tm-node-tech", String(it.technology));
                  if (it.label) e.dataTransfer.setData("application/tm-node-label", String(it.label));
                  if (it.flags) e.dataTransfer.setData("application/tm-node-flags", JSON.stringify(it.flags));
                }}
              >
                <span style={{ marginRight: 6 }}>{it.icon || ""}</span>{it.label}
              </div>
            ))}
          </div>
        ))}
      </div>
    ),
    [paletteConfig, paletteError]
  );

  const Toolbar = useMemo(
    () => (
      <div className="toolbar">
        <button onClick={() => { setNodes([]); setEdges([]); }}>Clear All</button>
        <button disabled={analyzing} onClick={() => runMockAnalysisAndHighlight()}>{analyzing ? "Analyzing..." : "Analyze & Highlight"}</button>
        <button onClick={async () => {
          try {
            const res = await fetch(`${API}/analysis/paths`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ nodes, edges, k: 10, maxDepth: 20 }),
            });
            const json = await res.json();
            const paths: ScoredPath[] = json?.paths || [];
            setLastScores(paths);
            if (!Array.isArray(paths) || paths.length === 0) { alert("No paths found from entry to target."); return; }
            const text = paths
              .map((p, i) => `${i + 1}. [score=${p.score}] ${(p as any).labels?.join(" -> ") || (p as any).nodeIds?.join(" -> ")}`)
              .join("\n");
            alert(`Top paths (scored):\n${text}`);
          } catch (e) {
            console.error(e);
            alert("Failed to fetch analysis paths");
          }
        }}>Show Top-K (Scores)</button>
        <button onClick={clearHighlights}>Clear Highlights</button>
        <span style={{ flex: 1 }} />
        <button onClick={() => {
          const otm = buildOtmFromGraph(nodes as any, edges as any, "Model");
          download("model.otm.json", JSON.stringify(otm, null, 2), "application/json");
        }}>Export OTM</button>
        <button onClick={() => {
          const yaml = buildThreagileYaml(nodes as any, edges as any, "Model");
          download("model.threagile.yaml", yaml, "text/yaml");
        }}>Export Threagile</button>
        <button onClick={async () => {
          const paths = lastScores ?? (async () => {
            const res = await fetch(`${API}/analysis/paths`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ nodes, edges, k: 10, maxDepth: 20 }),
            });
            const json = await res.json();
            return (json?.paths || []) as ScoredPath[];
          })();
          const resolved = Array.isArray(paths) ? paths : await paths;
          const report = { generatedAt: new Date().toISOString(), summary: { numPaths: resolved.length, topScore: resolved[0]?.score ?? 0 }, paths: resolved };
          download("analysis-report.json", JSON.stringify(report, null, 2), "application/json");
        }}>Export Report</button>
        <button onClick={async () => {
          try {
            const res = await fetch(`${API}/analysis/methods`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ nodes, edges, k: 10, maxDepth: 20 }),
            });
            const json = await res.json();
            const methods: AttackMethod[] = json?.methods || [];
            if (!Array.isArray(methods) || methods.length === 0) { alert("No attack methods suggested for current Entry→Target paths."); return; }
            const text = methods.map((m, i) => `${i + 1}. [${m.severity}] ${m.title} — ${m.description}`).join("\n\n");
            alert(`Suggested Attack Methods (demo):\n\n${text}`);
          } catch (e) {
            console.error(e);
            alert("Failed to fetch attack methods");
          }
        }}>Analyze Methods</button>
        <button onClick={async () => {
          try {
            const res = await fetch(`${API}/analysis/llm/methods`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ nodes, edges, k: 10, maxDepth: 20, llm: { baseUrl: llmBaseUrl, apiKey: llmApiKey, model: llmModel } }),
            });
            const json = await res.json();
            const methods: LlmAttackMethod[] = (json?.methods || []) as LlmAttackMethod[];
            if (!Array.isArray(methods) || methods.length === 0) { alert("No LLM-suggested methods."); setLlmMethods([]); return; }
            setLlmMethods(methods);
          } catch (e) {
            console.error(e);
            alert("Failed to fetch LLM-based methods");
            setLlmMethods([]);
          }
        }}>LLM Methods</button>
        <button onClick={() => setShowLlmSettings(true)}>LLM Settings</button>
        <button onClick={() => {
          // Demo graph: UART (Entry) -> Linux -> SPI Device (Target)
          const nid = (s: string) => s;
          const demoNodes: Node<any>[] = [
            { id: nid("n_1"), type: "entryPoint", position: { x: 80, y: 160 }, data: { label: "UART", technology: "uart", isEntry: "yes" }, width: 80, height: 80, zIndex: 1 },
            { id: nid("n_2"), type: "process", position: { x: 260, y: 150 }, data: { label: "Linux", technology: "linux", impact: "4" }, width: 120, height: 60, zIndex: 1 },
            { id: nid("n_3"), type: "store", position: { x: 480, y: 140 }, data: { label: "SPI Device", technology: "spi", isTarget: "yes", impact: "4" }, width: 120, height: 70, zIndex: 1 },
          ];
          const demoEdges: Edge[] = [
            { id: "e1", source: "n_1", target: "n_2", data: { protocol: "text", likelihood: "4" } } as any,
            { id: "e2", source: "n_2", target: "n_3", data: { protocol: "local-file-access", likelihood: "3" } } as any,
          ];
          setNodes(demoNodes as any);
          setEdges(demoEdges as any);
          setIdSeq(4);
          clearHighlights();
        }}>Load Demo</button>
      </div>
    ),
    [nodes, edges, analyzing, lastScores, llmBaseUrl, llmApiKey, llmModel]
  );

  const onSelectionChange = useCallback((params: { nodes: Node[]; edges: Edge[] }) => {
    if (params.nodes.length === 1) {
      const n = params.nodes[0] as any;
      setSelectedKind("node");
      setSelectedNodeType(n.type);
      setSelectedData(n.data || {});
    } else if (params.edges.length === 1) {
      const e = params.edges[0] as any;
      setSelectedKind("edge");
      setSelectedNodeType(undefined);
      setSelectedData(e.data || {});
    } else {
      setSelectedKind(null);
      setSelectedNodeType(undefined);
      setSelectedData(undefined);
    }
  }, []);

  const onNodeChangeData = useCallback((updates: Record<string, any>) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.selected ? { ...n, data: { ...n.data, ...updates } } : n
      )
    );
    setSelectedData((d) => ({ ...(d || {}), ...updates }));
  }, []);

  const onEdgeChangeData = useCallback((updates: Record<string, any>) => {
    setEdges((eds) =>
      eds.map((e) =>
        (e as any).selected ? { ...e, data: { ...(e.data || {}), ...updates } } : e
      )
    );
    setSelectedData((d) => ({ ...(d || {}), ...updates }));
  }, []);

  const closeCtx = useCallback(() => setCtxMenu(null), []);
  const onNodeContext = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    const rect = reactFlowWrapper.current?.getBoundingClientRect();
    const x = rect ? event.clientX - rect.left : event.clientX;
    const y = rect ? event.clientY - rect.top : event.clientY;
    setCtxMenu({ x, y, type: "node", id: node.id });
  }, []);
  const onEdgeContext = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.preventDefault();
    const rect = reactFlowWrapper.current?.getBoundingClientRect();
    const x = rect ? event.clientX - rect.left : event.clientX;
    const y = rect ? event.clientY - rect.top : event.clientY;
    setCtxMenu({ x, y, type: "edge", id: edge.id });
  }, []);

  const duplicateNode = useCallback((id: string) => {
    const src = nodes.find((n) => n.id === id);
    if (!src) return;
    const newId = `n_${idSeq + 1}`;
    setIdSeq((v) => v + 1);
    setNodes((nds) => nds.concat({
      ...src,
      id: newId,
      position: { x: (src.position?.x || 0) + 40, y: (src.position?.y || 0) + 40 },
      selected: false,
      zIndex: src.type === "trustBoundary" ? 0 : 1,
    }));
  }, [nodes, idSeq]);

  const deleteTarget = useCallback((target: { type: "node" | "edge"; id: string }) => {
    if (target.type === "node") {
      setNodes((nds) => nds.filter((n) => n.id !== target.id));
      setEdges((eds) => eds.filter((e) => e.source !== target.id && e.target !== target.id));
    } else {
      setEdges((eds) => eds.filter((e) => e.id !== target.id));
    }
  }, []);

  function getNodeRect(node: Node): { x: number; y: number; w: number; h: number } {
    const defaultSizes: Record<string, { w: number; h: number }> = {
      actor: { w: 64, h: 64 },
      entryPoint: { w: 80, h: 80 },
      process: { w: 120, h: 60 },
      store: { w: 120, h: 70 },
      trustBoundary: { w: 260, h: 160 },
    };
    const size = defaultSizes[node.type || ""] || { w: 100, h: 60 };
    return {
      x: node.position?.x || 0,
      y: node.position?.y || 0,
      w: (node as any).width || size.w,
      h: (node as any).height || size.h,
    };
  }

  function isNodeInsideBoundary(node: Node, boundary: Node): boolean {
    if (node.type === "trustBoundary") return false;
    const nodeRect = getNodeRect(node);
    const boundaryRect = getNodeRect(boundary);
    const centerX = nodeRect.x + nodeRect.w / 2;
    const centerY = nodeRect.y + nodeRect.h / 2;
    return (
      centerX >= boundaryRect.x &&
      centerX <= boundaryRect.x + boundaryRect.w &&
      centerY >= boundaryRect.y &&
      centerY <= boundaryRect.y + boundaryRect.h
    );
  }

  function updateBoundaryContainment() {
    setNodes((nds) => {
      const boundaries = nds.filter((n) => n.type === "trustBoundary");
      const otherNodes = nds.filter((n) => n.type !== "trustBoundary");
      return nds.map((node) => {
        if (node.type === "trustBoundary") {
          const containedNodes = otherNodes.filter((n) => isNodeInsideBoundary(n, node));
          const containedIds = containedNodes.map((n) => n.id);
          return {
            ...node,
            data: {
              ...node.data,
              containedNodes: containedIds,
            },
          };
        }
        return node;
      });
    });
  }

  const onNodeDragStop: OnNodeDrag = useCallback(() => {
    updateBoundaryContainment();
  }, []);

  return (
    <div className="app" style={{ height: "100%", display: "flex", overflow: "hidden" }}>
      {SidebarAP}
      <div className="canvas" ref={reactFlowWrapper} style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {Toolbar}
        <div className="content" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "row" }}>
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div className="flow" style={{ height: llmMethods && llmMethods.length > 0 ? "50%" : "100%" }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={(changes) => {
                  (onNodesChange as OnNodesChange)(changes);
                  setNodes((nds) => nds.map((n) => ({ ...n, zIndex: n.type === "trustBoundary" ? 0 : 1 })));
                }}
                onEdgesChange={onEdgesChange as OnEdgesChange}
                onConnect={onConnect}
                onDrop={onDrop}
                onDragOver={onDragOver}
                nodeTypes={nodeTypes}
                defaultEdgeOptions={{ markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 1.6 } }}
                fitView
                deleteKeyCode={["Delete"]}
                onSelectionChange={onSelectionChange}
                onInit={setRfInstance}
                onNodeContextMenu={onNodeContext}
                onEdgeContextMenu={onEdgeContext}
                onNodeDragStop={onNodeDragStop}
              >
                <Background gap={16} color="#f3f4f6" />
                <MiniMap />
                <Controls />
              </ReactFlow>
            </div>
            {llmMethods && llmMethods.length > 0 && (
              <div style={{ flex: 1, overflow: "auto", borderTop: "1px solid #e5e7eb", background: "#fff" }}>
                <div style={{ padding: 8, display: "flex", alignItems: "center" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>LLM Suggested Attack Methods</div>
                  <span style={{ flex: 1 }} />
                  <button onClick={() => setLlmMethods([])} style={{ fontSize: 12 }}>Clear</button>
                </div>
                <div style={{ padding: "0 8px 8px 8px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      {table.getHeaderGroups().map((hg) => (
                        <tr key={hg.id}>
                          {hg.headers.map((header) => (
                            <th key={header.id} style={{ textAlign: "left", fontSize: 12, color: "#6b7280", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>
                              {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {table.getRowModel().rows.map((row) => (
                        <tr key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} style={{ padding: "8px", borderBottom: "1px solid #f3f4f6", verticalAlign: "top" }}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <div style={{ width: 360, minWidth: 260, borderLeft: "1px solid #e5e7eb", background: "#fff", overflow: "auto" }}>
            <PropertiesPanel
              kind={selectedKind}
              nodeType={selectedNodeType}
              data={selectedData}
              onNodeChange={onNodeChangeData}
              onEdgeChange={onEdgeChangeData}
            />
          </div>
          {showLlmSettings && (
            <div style={{ position: "absolute", right: 16, top: 56, width: 360, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 10px 25px rgba(0,0,0,0.08)", padding: 12, zIndex: 10 }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                <h4 style={{ margin: 0, fontSize: 14 }}>LLM Settings</h4>
                <span style={{ flex: 1 }} />
                <button onClick={() => setShowLlmSettings(false)} style={{ fontSize: 12 }}>Close</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>Base URL</span>
                  <input value={llmBaseUrl} onChange={(e) => setLlmBaseUrl(e.target.value)} placeholder="http://127.0.0.1:4000/v1" style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 8px" }} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>API Key</span>
                  <input value={llmApiKey} onChange={(e) => setLlmApiKey(e.target.value)} placeholder="sk-... (stored locally)" style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 8px" }} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 12, color: "#6b7280" }}>Model</span>
                  <input value={llmModel} onChange={(e) => setLlmModel(e.target.value)} placeholder="gpt-4o-mini" style={{ border: "1px solid #d1d5db", borderRadius: 6, padding: "6px 8px" }} />
                </label>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <button onClick={saveLlmSettings}>Save</button>
                </div>
              </div>
            </div>
          )}
          {ctxMenu && (
            <ContextMenu
              x={ctxMenu.x}
              y={ctxMenu.y}
              onClose={closeCtx}
              items={
                ctxMenu.type === "node"
                  ? [
                      { key: "copy", label: "Copy", onClick: () => { duplicateNode(ctxMenu.id); closeCtx(); } },
                      { key: "delete", label: "Delete", onClick: () => { deleteTarget(ctxMenu); closeCtx(); } },
                    ]
                  : [
                      { key: "delete", label: "Delete", onClick: () => { deleteTarget(ctxMenu); closeCtx(); } },
                    ]
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

