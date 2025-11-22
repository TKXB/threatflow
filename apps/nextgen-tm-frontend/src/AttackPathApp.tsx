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
import AssetNode from "./nodes/AssetNode";
import type { ScoredPath } from "./utils/pathAnalysis";
import { buildOtmFromGraph, applyOtmToGraph } from "./utils/otmMapper";
import { buildThreagileYaml } from "./utils/threagileMapper";
import type { AttackMethod } from "./knowledge/attackMethods";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import WelcomeModal from "./components/WelcomeModal";
import { ChevronRight, Wifi, Globe, Cable, Database as DbIcon, User, Shield, Box, Cpu, Server, Maximize2, Minimize2, X, Trash, Keyboard, Undo2, Redo2, Grid as GridIcon, Download as DownloadIcon, Save as SaveIcon, Bot, Upload, RefreshCw, RotateCcw } from "lucide-react";
import TaraTable from "./components/TaraTable";
import type { TaraRow } from "./types/tara";
import { applyTaraDerivations } from "./utils/taraCalc";

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
  domain?: string;
  beta?: boolean;
  legacy?: boolean;
  properties?: Array<{ key: string; label: string; type: string; options?: { value: string; label: string }[]; default?: string }>;
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

// TARA row type moved to ./types/tara

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

const footerButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 40,
  padding: "0 10px",
  borderRadius: 6,
  border: "1px solid #d1d5db",
  background: "#ffffff",
  color: "#111827",
  fontSize: 12,
  fontWeight: 500,
  lineHeight: "20px",
  boxSizing: "border-box",
  cursor: "pointer",
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
  const [taraRows, setTaraRows] = useState<TaraRow[] | null>(null);
  const [taraLoading, setTaraLoading] = useState(false);
  const [settingsHydrated, setSettingsHydrated] = useState(false);
  const API = (import.meta as any).env?.VITE_NEXTGEN_API || "http://127.0.0.1:8890";
  const [llmBaseUrl, setLlmBaseUrl] = useState<string>("http://127.0.0.1:4000/v1");
  const [llmApiKey, setLlmApiKey] = useState<string>("");
  const [llmModel, setLlmModel] = useState<string>("gpt-4o-mini");
  const [showLlmSettings, setShowLlmSettings] = useState(false);
  const [paletteConfig, setPaletteConfig] = useState<PaletteConfig | null>(null);
  const [paletteError, setPaletteError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showTaraFullscreen, setShowTaraFullscreen] = useState(false);
  // Left palette resizable width (mapped to CSS var --sidebar-width)
  const [leftWidth, setLeftWidth] = useState<number>(240);
  const leftDragRef = useRef<{ startX: number; startW: number } | null>(null);
  // Right properties panel resizable width
  const [rightWidth, setRightWidth] = useState<number>(360);
  const rightDragRef = useRef<{ startX: number; startW: number } | null>(null);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem("tf_ap_welcome") || "true"); } catch { return true; }
  });
  const [history, setHistory] = useState<Array<{ nodes: Node[]; edges: Edge[] }>>([]);
  const [future, setFuture] = useState<Array<{ nodes: Node[]; edges: Edge[] }>>([]);
  const otmImportInputRef = useRef<HTMLInputElement | null>(null);
  const nodeTypes = useMemo(
    () => ({
      actor: ActorNode,
      entryPoint: EntryPointNode,
      process: ProcessNode,
      asset: AssetNode,
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

  const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

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
    try { localStorage.setItem("tf_ap_welcome", JSON.stringify(showWelcome)); } catch {}
  }, [showWelcome]);

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
      const res = await fetch(`${API}/palette/plugins`, { headers: { "accept": "application/json" } });
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
    const [loc, backend, deflt] = await Promise.all([
      loadPaletteFromLocal(),
      loadPaletteFromBackend(),
      loadDefaultPalette(),
    ]);
    const sources: (PaletteConfig | null)[] = [deflt, backend, loc];
    const sections: PaletteSection[] = [];
    const pushAll = (src?: PaletteConfig | null) => {
      if (!src || !Array.isArray(src.sections)) return;
      for (const s of src.sections) {
        const idx = sections.findIndex((x) => x.title === s.title);
        if (idx === -1) {
          sections.push({ title: s.title, items: [...(s.items || [])] });
        } else {
          const seen = new Set(
            sections[idx].items.map((it) => `${String((it as any).type)}|${String((it as any).technology || '')}|${String((it as any).label || '')}`)
          );
          for (const it of s.items || []) {
            const key = `${String((it as any).type)}|${String((it as any).technology || '')}|${String((it as any).label || '')}`;
            if (!seen.has(key)) {
              sections[idx].items.push(it as any);
              seen.add(key);
            }
          }
        }
      }
    };
    // Merge in order: default -> backend -> local (local can add/override)
    for (const src of sources) pushAll(src);
    const loaded: PaletteConfig | null = sections.length > 0 ? { sections } : null;
    if (loaded) setPaletteConfig(loaded);
    else {
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

  // 默认展开“Assets”与其 domain 子分组
  useEffect(() => {
    if (!paletteConfig) return;
    try {
      const next = new Set(openSections);
      const sections = Array.isArray(paletteConfig.sections) ? paletteConfig.sections : [];
      for (const s of sections) {
        if (s.title === "Assets") {
          next.add(s.title);
          const items = Array.isArray(s.items) ? s.items : [];
          const domainKeys = new Set<string>();
          for (const it of items) domainKeys.add(String((it as any)?.domain || "Other"));
          for (const gk of domainKeys) next.add(`${s.title}::${gk}`);
        }
      }
      const arr = Array.from(next);
      if (arr.length !== openSections.length) setOpenSections(arr);
    } catch {}
  }, [paletteConfig]);

  // Install global listeners while dragging resizers
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (leftDragRef.current) {
        const dx = e.clientX - leftDragRef.current.startX;
        const w = clamp(leftDragRef.current.startW + dx, 160, 640);
        setLeftWidth(w);
        try { document.documentElement.style.setProperty("--sidebar-width", `${w}px`); } catch {}
      }
      if (rightDragRef.current) {
        const dx = e.clientX - rightDragRef.current.startX;
        const w = clamp(rightDragRef.current.startW - dx, 260, 720);
        setRightWidth(w);
      }
    };
    const onUp = () => {
      leftDragRef.current = null;
      rightDragRef.current = null;
      try { document.body.style.userSelect = ""; document.body.style.cursor = ""; } catch {}
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const startLeftDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    leftDragRef.current = { startX: e.clientX, startW: leftWidth };
    try { document.body.style.userSelect = "none"; document.body.style.cursor = "col-resize"; } catch {}
    e.preventDefault();
  }, [leftWidth]);

  const startRightDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    rightDragRef.current = { startX: e.clientX, startW: rightWidth };
    try { document.body.style.userSelect = "none"; document.body.style.cursor = "col-resize"; } catch {}
    e.preventDefault();
  }, [rightWidth]);

  // Header dropdown menu handlers
  useEffect(() => {
    const handler = (e: any) => {
      const key = e?.detail?.key as string;
      if (!key) return;
      switch (key) {
        case "clear":
          setNodes([]); setEdges([]); break;
        case "load-demo": {
          if (!paletteConfig || !Array.isArray(paletteConfig.sections)) { alert("Palette not loaded. Please import or reload palette."); break; }
          const findItem = (pred: (it: any) => boolean): any | null => {
            for (const section of paletteConfig.sections) {
              for (const it of (section.items || [])) {
                if (pred(it)) return it;
              }
            }
            return null;
          };
          const ethernet = findItem((it) => String((it as any).id || "") === "entry.ethernet")
            || findItem((it) => String((it as any).type) === "entryPoint" && (String((it as any).technology || "").toLowerCase() === "ethernet" || String((it as any).label || "") === "Ethernet"));
          const webServer = findItem((it) => String((it as any).id || "") === "asset.web.http")
            || findItem((it) => String((it as any).type) === "asset" && (String((it as any).technology || "").toLowerCase() === "http" || String((it as any).label || "") === "Web Server"));
          const database = findItem((it) => String((it as any).id || "") === "asset.database.postgres")
            || findItem((it) => String((it as any).type) === "asset" && (String((it as any).technology || "").toLowerCase() === "postgres" || String((it as any).label || "") === "Database"));

          if (!ethernet || !webServer || !database) { alert("Required demo items not found in palette."); break; }

          const start = idSeq;
          const sizeMap: Record<string, { width: number; height: number }> = {
            actor: { width: 64, height: 64 },
            entryPoint: { width: 80, height: 80 },
            process: { width: 120, height: 60 },
            asset: { width: 100, height: 100 },
            store: { width: 120, height: 70 },
            trustBoundary: { width: 260, height: 160 },
          };
          const buildNodeFromItem = (id: string, x: number, y: number, item: any) => {
            const type = String((item as any)?.type || "asset");
            const sz = sizeMap[type] || { width: 100, height: 60 };
            const props = (item as any)?.properties || (item as any)?.flags?.properties || undefined;
            const icon = (item as any)?.icon ? String((item as any).icon) : undefined;
            const tech = (item as any)?.technology;
            const label = (item as any)?.label || tech || type;
            return {
              id,
              position: { x, y },
              data: { label, technology: tech, ...(icon ? { icon } : {}), ...(props ? { properties: props } : {}) },
              type,
              width: sz.width,
              height: sz.height,
              zIndex: type === "trustBoundary" ? 0 : 1,
            } as any;
          };

          const n1 = buildNodeFromItem(`n_${start}`, 160, 160, ethernet);
          const n2 = buildNodeFromItem(`n_${start + 1}`, 360, 160, webServer);
          const n3 = buildNodeFromItem(`n_${start + 2}`, 560, 160, database);

          const e1 = { id: `e_${start}_${start + 1}`, source: n1.id, target: n2.id, markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 1.6 } } as any;
          const e2 = { id: `e_${start + 1}_${start + 2}`, source: n2.id, target: n3.id, markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 1.6 } } as any;

          setNodes([n1, n2, n3]);
          setEdges([e1, e2]);
          setIdSeq(start + 3);
          clearHighlights();
          break;
        }
        case "analyze":
          void runMockAnalysisAndHighlight(); break;
        case "topk": {
          (async () => {
            try {
              const res = await fetch(`${API}/analysis/paths`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nodes, edges, k: 10, maxDepth: 20 }) });
              const json = await res.json();
              const paths: ScoredPath[] = json?.paths || [];
              setLastScores(paths);
              if (!Array.isArray(paths) || paths.length === 0) { alert("No paths found from entry to target."); return; }
              const text = paths.map((p, i) => `${i + 1}. [score=${p.score}] ${(p as any).labels?.join(" -> ") || (p as any).nodeIds?.join(" -> ")}`).join("\n");
              alert(`Top paths (scored):\n${text}`);
            } catch (e) { console.error(e); alert("Failed to fetch analysis paths"); }
          })();
          break;
        }
        case "methods": {
          (async () => {
            try {
              const res = await fetch(`${API}/analysis/methods`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nodes, edges, k: 10, maxDepth: 20 }) });
              const json = await res.json();
              const methods: AttackMethod[] = json?.methods || [];
              if (!Array.isArray(methods) || methods.length === 0) { alert("No attack methods suggested for current Entry→Target paths."); return; }
              const text = methods.map((m, i) => `${i + 1}. [${m.severity}] ${m.title} — ${m.description}`).join("\n\n");
              alert(`Suggested Attack Methods (demo):\n\n${text}`);
            } catch (e) { console.error(e); alert("Failed to fetch attack methods"); }
          })();
          break;
        }
        case "llm": {
          (async () => {
            try {
              const res = await fetch(`${API}/analysis/llm/methods`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nodes, edges, k: 10, maxDepth: 20, llm: { baseUrl: llmBaseUrl, apiKey: llmApiKey, model: llmModel } }) });
              const json = await res.json();
              const methods: LlmAttackMethod[] = (json?.methods || []) as LlmAttackMethod[];
              if (!Array.isArray(methods) || methods.length === 0) { alert("No LLM-suggested methods."); setLlmMethods([]); return; }
              setLlmMethods(methods);
            } catch (e) { console.error(e); alert("Failed to fetch LLM-based methods"); setLlmMethods([]); }
          })();
          break;
        }
        case "llm-tara": {
          setTaraLoading(true);
          (async () => {
            try {
              const res = await fetch(`${API}/analysis/llm/tara`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nodes, edges, k: 50, maxDepth: 20, llm: { baseUrl: llmBaseUrl, apiKey: llmApiKey, model: llmModel } }) });
              const json = await res.json();
              const rawRows: TaraRow[] = (json?.rows || []) as TaraRow[];
              const rows = applyTaraDerivations(rawRows);
              if (!Array.isArray(rows) || rows.length === 0) { alert("No TARA rows generated by LLM."); setTaraRows([]); return; }
              setTaraRows(rows);
            } catch (e) { console.error(e); alert("Failed to fetch LLM-based TARA"); setTaraRows([]); }
            finally { setTaraLoading(false); }
          })();
          break;
        }
        case "llm-settings": {
          setShowLlmSettings(true);
          break;
        }
        case "export-otm": {
          const otm = buildOtmFromGraph(nodes as any, edges as any, "Model");
          download("model.otm.json", JSON.stringify(otm, null, 2), "application/json");
          break;
        }
        case "export-threagile": {
          const yaml = buildThreagileYaml(nodes as any, edges as any, "Model");
          download("model.threagile.yaml", yaml, "text/yaml");
          break;
        }
        case "export-report": {
          (async () => {
            const paths = lastScores ?? (async () => {
              const res = await fetch(`${API}/analysis/paths`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nodes, edges, k: 10, maxDepth: 20 }) });
              const json = await res.json();
              return (json?.paths || []) as ScoredPath[];
            })();
            const resolved = Array.isArray(paths) ? paths : await paths;
            const report = { generatedAt: new Date().toISOString(), summary: { numPaths: resolved.length, topScore: resolved[0]?.score ?? 0 }, paths: resolved };
            download("analysis-report.json", JSON.stringify(report, null, 2), "application/json");
          })();
          break;
        }
      }
    };
    window.addEventListener("ap-menu", handler as any);
    return () => window.removeEventListener("ap-menu", handler as any);
  }, [nodes, edges, API, lastScores, llmBaseUrl, llmApiKey, llmModel]);

  const toggleSection = useCallback((title: string) => {
    setOpenSections((prev) => prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]);
  }, []);

  const handleSectionKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>, title: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleSection(title);
    }
  }, [toggleSection]);

  function getIconForItem(it: PaletteItem) {
    const label = String(it.label || "").toLowerCase();
    const tech = String(it.technology || "").toLowerCase();
    const text = `${label} ${tech}`;
    if (/wifi|wi[- ]?fi/.test(text)) return Wifi;
    if (/http|web\b|browser/.test(text)) return Globe;
    if (/ethernet|lan|cable/.test(text)) return Cable;
    if (/db|database|store|bucket/.test(text)) return DbIcon;
    if (/user|actor|person|human/.test(text)) return User;
    if (/boundary|trust|security|shield/.test(text)) return Shield;
    if (/cpu|spi|uart|i2c|hardware/.test(text)) return Cpu;
    if (/server|service|process|app/.test(text)) return Server;
    return Box;
  }

  function renderPaletteIcon(it: PaletteItem) {
    const raw = (it as any).icon as string | undefined;
    const trimmed = typeof raw === "string" ? raw.trim() : "";
    const isSvgMarkup = trimmed.startsWith("<svg");
    const isUrlLike = /^(?:\.|\/|https?:\/\/|data:)/i.test(trimmed);
    const isSvgUrl = isUrlLike && (/\.svg($|\?)/i.test(trimmed) || /^data:\s*image\/svg\+xml/i.test(trimmed));
    if (trimmed && (isSvgMarkup || isSvgUrl)) {
      if (isSvgMarkup) {
        return <span className="pi-icon" style={{ width: 16, height: 16, display: "inline-flex" }} dangerouslySetInnerHTML={{ __html: trimmed }} />;
      }
      return <span className="pi-icon"><img src={trimmed} alt="icon" width={16} height={16} style={{ display: "block", objectFit: "contain" }} /></span>;
    }
    const Icon = getIconForItem(it);
    return <span className="pi-icon"><Icon size={16} /></span>;
  }

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

  function triggerOtmImport() { try { otmImportInputRef.current?.click(); } catch {} }

  function onOtmImportChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const otm = JSON.parse(text);
        const { nodes: newNodes, edges: newEdges } = applyOtmToGraph(otm);
        setNodes((newNodes as any).map((n: any) => ({ ...n, zIndex: n.type === "trustBoundary" ? 0 : 1 })) as any);
        setEdges(newEdges as any);
        setIdSeq(computeNextIdSeq(newNodes as any));
        clearHighlights();
        setHistory([]);
        setFuture([]);
      } catch (err) {
        try { alert("Invalid OTM JSON file"); } catch {}
      } finally {
        try { (e.target as HTMLInputElement).value = ""; } catch {}
      }
    };
    reader.readAsText(file);
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
  
  // Columns for TARA rows
  const taraColumns = useMemo<ColumnDef<TaraRow>[]>(() => [
    { id: "damageScenarioNo", header: () => "Damage Scenario No.", accessorKey: "damageScenarioNo", size: 120 },
    { id: "damageScenario", header: () => "Damage Scenario", accessorKey: "damageScenario", size: 240 },
    { id: "C", header: () => "C", cell: ({ row }) => String(row.original.cybersecurityProperty?.C ?? false), size: 40 },
    { id: "I", header: () => "I", cell: ({ row }) => String(row.original.cybersecurityProperty?.I ?? false), size: 40 },
    { id: "A", header: () => "A", cell: ({ row }) => String(row.original.cybersecurityProperty?.A ?? false), size: 40 },
    { id: "threatScenarioNo", header: () => "Threat scenario No.", accessorKey: "threatScenarioNo", size: 140 },
    { id: "threatScenario", header: () => "Threat scenario", accessorKey: "threatScenario", size: 260 },
    { id: "impactCategory", header: () => "Impact category", accessorKey: "impactCategory", size: 120 },
    { id: "impactRating", header: () => "Impact Rating", accessorKey: "impactRating", size: 120 },
    { id: "impact", header: () => "Impact", accessorKey: "impact", size: 260 },
    { id: "attackPathNo", header: () => "Attack path No.", accessorKey: "attackPathNo", size: 120 },
    { id: "entryPoint", header: () => "Entry Point", accessorKey: "entryPoint", size: 120 },
    { id: "logic", header: () => "Logic", accessorKey: "logic", size: 80 },
    { id: "attackPath", header: () => "Attack path", accessorKey: "attackPath", size: 240 },
    { id: "unR155CsmsAnnex5PartA", header: () => "UN-R155 CSMS Annex 5 PartA", accessorKey: "unR155CsmsAnnex5PartA", size: 240 },
    { id: "attackVectorBasedApproach", header: () => "Attack vector-based approach", accessorKey: "attackVectorBasedApproach", size: 200 },
    { id: "attackFeasibilityRating", header: () => "Attack feasibility rating", accessorKey: "attackFeasibilityRating", size: 180 },
    { id: "riskImpact", header: () => "Risk Impact", accessorKey: "riskImpact", size: 120 },
    { id: "riskValue", header: () => "Risk value", accessorKey: "riskValue", size: 100 },
    { id: "attackVectorParameters", header: () => "Attack vector parameters", accessorKey: "attackVectorParameters", size: 200 },
    { id: "riskImpactFinal", header: () => "Risk Impact (final)", accessorKey: "riskImpactFinal", size: 140 },
    { id: "cal", header: () => "CAL", accessorKey: "cal", size: 80 },
  ], []);
  const taraTable = useReactTable({ data: taraRows ?? [], columns: taraColumns, getCoreRowModel: getCoreRowModel(), getRowId: (_row, index) => String(index) });

  // RowSpan merge configuration and helpers for TARA table
  // Grouping key: from Damage Scenario No. to Entry Point (inclusive)
  const taraGroupKeyColumnIds = useMemo<string[]>(
    () => [
      "damageScenarioNo",
      "damageScenario",
      "C",
      "I",
      "A",
      "threatScenarioNo",
      "threatScenario",
      "impactCategory",
      "impactRating",
      "impact",
      "entryPoint",
    ],
    []
  );

  function getMergeValueForId(row: TaraRow, id: string): string | number | boolean {
    if (id === "C") return Boolean(row.cybersecurityProperty?.C ?? false);
    if (id === "I") return Boolean(row.cybersecurityProperty?.I ?? false);
    if (id === "A") return Boolean(row.cybersecurityProperty?.A ?? false);
    return (row as any)?.[id] ?? "";
  }

  const taraRowModels = useMemo(() => {
    const rows = Array.isArray(taraRows) ? taraRows : [];
    return rows.map((r, idx) => ({ original: r as TaraRow, id: String(idx) }));
  }, [taraRows]);
  const taraRowIndexById = useMemo(() => {
    const map = new Map<string, number>();
    taraRowModels.forEach((r, idx) => map.set(r.id, idx));
    return map;
  }, [taraRowModels]);

  const taraRowSpanMeta = useMemo(() => {
    if (!taraRowModels.length) return [] as Array<Record<string, { rowSpan: number; hidden: boolean }>>;
    type CellMeta = { rowSpan: number; hidden: boolean };
    const meta: Array<Record<string, CellMeta>> = taraRowModels.map(() => ({}));
    let currentKey: string | null = null;
    let groupTopIndex = 0;
    // Track Attack path No. within each group separately
    let apTopValue: any = null;
    let apTopIndex = 0;
    for (let i = 0; i < taraRowModels.length; i++) {
      const original = taraRowModels[i].original as TaraRow;
      const key = JSON.stringify(taraGroupKeyColumnIds.map((id) => getMergeValueForId(original, id)));
      const apVal = (original as any)?.["attackPathNo"] ?? "";
      if (currentKey === null || key !== currentKey) {
        // New group starts: initialize group columns
        for (const id of taraGroupKeyColumnIds) meta[i][id] = { rowSpan: 1, hidden: false };
        // Also merge Logic across the whole group
        meta[i]["logic"] = { rowSpan: 1, hidden: false };
        currentKey = key;
        groupTopIndex = i;
        // Reset Attack path No. run inside the new group
        apTopValue = apVal;
        meta[i]["attackPathNo"] = { rowSpan: 1, hidden: false };
        apTopIndex = i;
      } else {
        // Same group: extend group columns' rowSpan and hide current cells
        for (const id of taraGroupKeyColumnIds) {
          meta[groupTopIndex][id].rowSpan += 1;
          meta[i][id] = { rowSpan: 0, hidden: true };
        }
        // Logic column merges across the group
        if (meta[groupTopIndex]["logic"]) meta[groupTopIndex]["logic"].rowSpan += 1; else meta[groupTopIndex]["logic"] = { rowSpan: 2, hidden: false };
        meta[i]["logic"] = { rowSpan: 0, hidden: true };
        // Attack path No. within the group: sub-run merge
        if (apVal === apTopValue) {
          meta[apTopIndex]["attackPathNo"].rowSpan += 1;
          meta[i]["attackPathNo"] = { rowSpan: 0, hidden: true };
        } else {
          apTopValue = apVal;
          meta[i]["attackPathNo"] = { rowSpan: 1, hidden: false };
          apTopIndex = i;
        }
      }
    }
    return meta;
  }, [taraRowModels, taraGroupKeyColumnIds]);

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
      const iconFromDrag = event.dataTransfer.getData("application/tm-node-icon");
      const propsRaw = event.dataTransfer.getData("application/tm-node-props");
      let extraFlags: Record<string, any> | undefined;
      let extraProps: any[] | undefined;
      try { extraFlags = flagsRaw ? JSON.parse(flagsRaw) : undefined; } catch { extraFlags = undefined; }
      try { extraProps = propsRaw ? JSON.parse(propsRaw) : undefined; } catch { extraProps = undefined; }
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
        : type === "asset" ? (technology || "Asset")
        : type === "store" ? (technology || "Store")
        : "Trust Boundary");

      const sizeMap: Record<string, { width: number; height: number }> = {
        actor: { width: 64, height: 64 },
        entryPoint: { width: 80, height: 80 },
        process: { width: 120, height: 60 },
        asset: { width: 100, height: 100 },
        store: { width: 120, height: 70 },
        trustBoundary: { width: 260, height: 160 },
      };
      const sz = sizeMap[type] || { width: 100, height: 60 };
      const position = { x: flowPoint.x - sz.width / 2, y: flowPoint.y - sz.height / 2 };

      // Attach dynamic property definitions for assets if provided by palette/plugins
      // prefer explicit properties payload; also support legacy __dynamicProps in flags
      const dynamicProps = Array.isArray(extraProps)
        ? extraProps
        : (extraFlags && Array.isArray((extraFlags as any).properties))
          ? (extraFlags as any).properties
          : (extraFlags && Array.isArray((extraFlags as any).__dynamicProps))
            ? (extraFlags as any).__dynamicProps
            : undefined;

      setNodes((nds) => [
        ...nds,
        { id, position, data: { label, technology: technology || undefined, ...(iconFromDrag ? { icon: iconFromDrag } : {}), ...(extraFlags || {}), ...(dynamicProps ? { properties: dynamicProps } : {}) }, type: (type as any), width: sz.width, height: sz.height, zIndex: type === "trustBoundary" ? 0 : 1 },
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
      <div className="sidebar" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <h3>Attack Path Palette</h3>
        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          {paletteError && (
            <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 8 }}>{paletteError}</div>
          )}
          {!paletteError && !paletteConfig && (
            <div style={{ color: "#6b7280", fontSize: 12, marginTop: 8 }}>Loading palette...</div>
          )}
          {paletteConfig && paletteConfig.sections?.map((section, si) => (
            <div key={`sec-${si}`} className="disclosure-section">
              <div
                className={`disclosure-header ${openSections.includes(section.title) ? "open" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => toggleSection(section.title)}
                onKeyDown={(e) => handleSectionKeyDown(e, section.title)}
              >
                <span className="disclosure-title">{section.title}</span>
                <ChevronRight className="disclosure-chevron" size={16} />
              </div>
              <div className={`disclosure-content ${openSections.includes(section.title) ? "open" : ""}`}>
                {section.title === "Assets"
                  ? (() => {
                      const items = Array.isArray(section.items) ? section.items : [];
                      const grouped: Record<string, PaletteItem[]> = {};
                      for (const it of items) {
                        const key = String(((it as any)?.type === "asset" ? (it as any)?.domain : undefined) || "Other");
                        if (!grouped[key]) grouped[key] = [];
                        grouped[key].push(it);
                      }
                      const order = ["Automotive", "Cloud", "Mobile"] as const;
                      const keys = Object.keys(grouped);
                      const known = keys.filter((k) => order.includes(k as any)).sort((a, b) => order.indexOf(a as any) - order.indexOf(b as any));
                      const others = keys.filter((k) => !order.includes(k as any)).sort();
                      const sortedKeys = [...known, ...others];

                      const renderItem = (it: PaletteItem, keyStr: string) => (
                        <div
                          key={keyStr}
                          className="palette-item"
                          data-type={it.type}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData("application/tm-node", it.type);
                            if (it.technology) e.dataTransfer.setData("application/tm-node-tech", String(it.technology));
                            if (it.label) e.dataTransfer.setData("application/tm-node-label", String(it.label));
                            if ((it as any).icon) e.dataTransfer.setData("application/tm-node-icon", String((it as any).icon));
                            if (it.flags) e.dataTransfer.setData("application/tm-node-flags", JSON.stringify(it.flags));
                            if (it.properties) e.dataTransfer.setData("application/tm-node-props", JSON.stringify(it.properties));
                          }}
                        >
                          {renderPaletteIcon(it)}
                          <div className="pi-text">
                            <div className="pi-label">{it.label}</div>
                          </div>
                        </div>
                      );

                      return sortedKeys.map((gk) => {
                        const groupKey = `${section.title}::${gk}`;
                        const groupItems = grouped[gk]
                          .slice()
                          .sort((a, b) => {
                            const pa = typeof a.priority === "number" ? a.priority as number : 1e9;
                            const pb = typeof b.priority === "number" ? b.priority as number : 1e9;
                            if (pa !== pb) return pa - pb;
                            return String(a.label || "").localeCompare(String(b.label || ""));
                          });
                        return (
                          <div key={`grp-${gk}`} className="disclosure-section" style={{ marginLeft: 10 }}>
                            <div
                              className={`disclosure-header ${openSections.includes(groupKey) ? "open" : ""}`}
                              style={{ paddingLeft: 8 }}
                              role="button"
                              tabIndex={0}
                              onClick={() => toggleSection(groupKey)}
                              onKeyDown={(e) => handleSectionKeyDown(e, groupKey)}
                            >
                              <span className="disclosure-title">{gk}</span>
                              <ChevronRight className="disclosure-chevron" size={16} />
                            </div>
                            <div className={`disclosure-content ${openSections.includes(groupKey) ? "open" : ""}`} style={{ marginLeft: 10 }}>
                              {groupItems.map((it, ii) => renderItem(it, `item-${si}-${gk}-${ii}-${it.label}`))}
                            </div>
                          </div>
                        );
                      });
                    })()
                  : section.items?.map((it, ii) => (
                      <div
                        key={`item-${si}-${ii}-${it.label}`}
                        className="palette-item"
                        data-type={it.type}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("application/tm-node", it.type);
                          if (it.technology) e.dataTransfer.setData("application/tm-node-tech", String(it.technology));
                          if (it.label) e.dataTransfer.setData("application/tm-node-label", String(it.label));
                          if ((it as any).icon) e.dataTransfer.setData("application/tm-node-icon", String((it as any).icon));
                          if (it.flags) e.dataTransfer.setData("application/tm-node-flags", JSON.stringify(it.flags));
                          if (it.properties) e.dataTransfer.setData("application/tm-node-props", JSON.stringify(it.properties));
                        }}
                      >
                        {renderPaletteIcon(it)}
                        <div className="pi-text">
                          <div className="pi-label">{it.label}</div>
                        </div>
                      </div>
                    ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center", paddingTop: 8, borderTop: "1px solid #e5e7eb" }}>
          <button title="Import JSON" style={footerButtonStyle} onClick={triggerImport}><Upload size={16} /></button>
          <button title="Reload" style={footerButtonStyle} onClick={() => { void reloadPalette(); }}><RefreshCw size={16} /></button>
          <button title="Reset Default" style={footerButtonStyle} onClick={() => { void resetPalette(); }}><RotateCcw size={16} /></button>
          <input ref={fileInputRef} onChange={onFileSelected} type="file" accept="application/json" style={{ display: "none" }} />
        </div>
      </div>
    ),
    [paletteConfig, paletteError, openSections, toggleSection, handleSectionKeyDown]
  );

  // Toolbar removed – actions moved to header dropdown
  // Reintroduce a canvas-level toolbar with GraphButtons.vue-like actions

  function pushHistorySnapshot() {
    try {
      const snapshot = { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) } as { nodes: Node[]; edges: Edge[] };
      setHistory((h) => [...h, snapshot]);
      setFuture([]);
    } catch {}
  }

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setFuture((f) => [...f, { nodes: nodes, edges: edges }]);
      setNodes(prev.nodes as any);
      setEdges(prev.edges as any);
      return h.slice(0, -1);
    });
  }, [nodes, edges]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[f.length - 1];
      setHistory((h) => [...h, { nodes: nodes, edges: edges }]);
      setNodes(next.nodes as any);
      setEdges(next.edges as any);
      return f.slice(0, -1);
    });
  }, [nodes, edges]);

  const clearAll = useCallback(() => {
    setNodes([] as any);
    setEdges([] as any);
  }, []);

  const deleteSelected = useCallback(() => {
    const selectedNodeIds = new Set((nodes || []).filter((n: any) => (n as any).selected).map((n) => n.id));
    const selectedEdgeIds = new Set((edges || []).filter((e: any) => (e as any).selected).map((e) => e.id));
    if (selectedNodeIds.size === 0 && selectedEdgeIds.size === 0) return;
    pushHistorySnapshot();
    setNodes((nds) => nds.filter((n) => !selectedNodeIds.has(n.id)));
    setEdges((eds) => eds.filter((e) => !selectedEdgeIds.has(e.id) && !selectedNodeIds.has((e as any).source) && !selectedNodeIds.has((e as any).target)));
  }, [nodes, edges]);

  // zoom controls removed per request

  const exportOtm = useCallback(() => {
    const otm = buildOtmFromGraph(nodes as any, edges as any, "Model");
    download("model.otm.json", JSON.stringify(otm, null, 2), "application/json");
  }, [nodes, edges]);

  const exportThreagile = useCallback(() => {
    const yaml = buildThreagileYaml(nodes as any, edges as any, "Model");
    download("model.threagile.yaml", yaml, "text/yaml");
  }, [nodes, edges]);

  const saveModel = useCallback(() => { try { const otm = buildOtmFromGraph(nodes as any, edges as any, "Model"); download("model.save.json", JSON.stringify(otm, null, 2), "application/json"); } catch {} }, [nodes, edges]);
  const closeDiagram = useCallback(() => { setNodes([] as any); setEdges([] as any); }, []);

  const showShortcuts = useCallback(() => {
    try {
      alert("Shortcuts:\n- Delete: remove selection\n- Right click: context menu\n- Drag between handles: connect nodes");
    } catch {}
  }, []);

  const handleNodesChange = useCallback((changes: any) => {
    try {
      if (Array.isArray(changes) && changes.some((c: any) => String(c?.type || "") !== "select")) {
        pushHistorySnapshot();
      }
    } catch {}
    (onNodesChange as OnNodesChange)(changes);
    setNodes((nds) => nds.map((n) => ({ ...n, zIndex: n.type === "trustBoundary" ? 0 : 1 })));
  }, [onNodesChange, setNodes, nodes, edges]);

  const handleEdgesChange = useCallback((changes: any) => {
    try {
      if (Array.isArray(changes) && changes.some((c: any) => String(c?.type || "") !== "select")) {
        pushHistorySnapshot();
      }
    } catch {}
    (onEdgesChange as OnEdgesChange)(changes);
  }, [onEdgesChange, nodes, edges]);

  const onSelectionChange = useCallback((params: { nodes: Node[]; edges: Edge[] }) => {
    if (params.nodes.length === 1) {
      const n = params.nodes[0] as any;
      // Backfill properties for assets if missing by looking up from current palette
      if ((n.type === "store" || n.type === "asset") && (!Array.isArray(n.data?.properties) || n.data?.properties.length === 0)) {
        const tech = String(n.data?.technology || "").toLowerCase();
        const label = String(n.data?.label || "");
        let defs: any[] | undefined;
        if (paletteConfig && Array.isArray(paletteConfig.sections)) {
          for (const section of paletteConfig.sections) {
            for (const item of section.items || []) {
              if (String(item.type) === "store" || String(item.type) === "asset") {
                const itTech = String(item.technology || "").toLowerCase();
                if ((itTech && itTech === tech) || (!itTech && item.label === label)) {
                  defs = (item as any).properties || (item as any).flags?.properties || undefined;
                  if (Array.isArray(defs)) break;
                }
              }
            }
            if (defs) break;
          }
        }
        if (Array.isArray(defs) && defs.length > 0) {
          setNodes((nds) => nds.map((node) => node.id === n.id ? { ...node, data: { ...(node as any).data, properties: defs } } : node));
          setSelectedData({ ...(n.data || {}), properties: defs });
          setSelectedKind("node");
          setSelectedNodeType(n.type);
          return;
        }
      }
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
  }, [paletteConfig, setNodes]);

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
      asset: { w: 100, h: 100 },
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
    <div className="app" style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <WelcomeModal
        open={showWelcome}
        onClose={() => setShowWelcome(false)}
        title="Get started"
        description="Start with templates showcasing Attack Path modeling and analysis."
        primaryText="Start"
      />
      <div style={{ display: "flex", minHeight: 0, flex: 1 }}>
        <div style={{ width: leftWidth, minWidth: 160, maxWidth: 640, flex: `0 0 ${leftWidth}px` }}>
          {SidebarAP}
        </div>
        <div role="separator" aria-orientation="vertical" onMouseDown={startLeftDrag} style={{ width: 6, cursor: "col-resize", background: "transparent" }} />
        <div className="canvas" ref={reactFlowWrapper} style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div className="content" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "row" }}>
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            {(() => { const hasBottom = (llmMethods && llmMethods.length > 0) || (taraRows && taraRows.length > 0) || taraLoading; return (
            <div className="flow" style={{ height: hasBottom ? "50%" : "100%", position: "relative" }}>
              <div style={{ position: "absolute", right: 12, top: 12, zIndex: 20 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 8, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}>
                  <button title="Clear All" onClick={clearAll} style={footerButtonStyle}><Trash size={16} /></button>
                  <button title="Shortcuts" onClick={showShortcuts} style={footerButtonStyle}><Keyboard size={16} /></button>
                  <button title="Undo" onClick={undo} style={footerButtonStyle}><Undo2 size={16} /></button>
                  <button title="Redo" onClick={redo} style={footerButtonStyle}><Redo2 size={16} /></button>
                  {/** zoom buttons removed **/}
                  <button title="Toggle Grid" onClick={() => setShowGrid((v) => !v)} style={footerButtonStyle}><GridIcon size={16} /></button>
                  <span style={{ width: 8 }} />
                  <button title="Open" onClick={triggerOtmImport} style={footerButtonStyle}><Upload size={16} /><span style={{ marginLeft: 6, fontSize: 12 }}>Open</span></button>
                  <button title="Export OTM" onClick={exportOtm} style={footerButtonStyle}><DownloadIcon size={16} /><span style={{ marginLeft: 6, fontSize: 12 }}>OTM</span></button>
                  <button title="Export Threagile" onClick={exportThreagile} style={footerButtonStyle}><DownloadIcon size={16} /><span style={{ marginLeft: 6, fontSize: 12 }}>Threagile</span></button>
                  <button
                    title="AI"
                    onClick={() => window.dispatchEvent(new CustomEvent("ap-menu", { detail: { key: "llm-tara" } }))}
                    style={{ ...footerButtonStyle, background: "linear-gradient(135deg, #a855f7 0%, #22d3ee 100%)", color: "#ffffff", borderColor: "#2563eb" }}
                  >
                    <Bot size={16} />
                  </button>
                  <span style={{ width: 8 }} />
                  <button title="Save" onClick={saveModel} style={{ ...footerButtonStyle, borderColor: "#2563eb", color: "#2563eb" }}><SaveIcon size={16} /><span style={{ marginLeft: 6, fontSize: 12 }}>Save</span></button>
                </div>
              </div>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={handleNodesChange as OnNodesChange}
                onEdgesChange={handleEdgesChange as OnEdgesChange}
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
                {showGrid && <Background gap={16} color="#f3f4f6" />}
                <MiniMap />
                <Controls />
              </ReactFlow>
              <input ref={otmImportInputRef} onChange={onOtmImportChange} type="file" accept="application/json,.json" style={{ display: "none" }} />
            </div>
            ); })()}
            {(llmMethods && llmMethods.length > 0) && (
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
            {taraLoading && (!taraRows || taraRows.length === 0) && (
              <div style={{ flex: 1, overflow: "auto", borderTop: "1px solid #e5e7eb", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12 }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" role="status" aria-label="Loading">
                    <circle cx="12" cy="12" r="10" stroke="#e5e7eb" strokeWidth="4" fill="none" />
                    <path d="M12 2 a10 10 0 0 1 10 10" stroke="#2563eb" strokeWidth="4" fill="none">
                      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
                    </path>
                  </svg>
                  <div style={{ fontSize: 13, color: "#374151" }}>Generating TARA...</div>
                </div>
              </div>
            )}
            {taraRows && taraRows.length > 0 && (
              <TaraTable
                rows={taraRows}
                loading={taraLoading}
                onOpenFullscreen={() => setShowTaraFullscreen(true)}
                onClose={() => setTaraRows([])}
                onReanalyzeRow={(rowIndex) => {
                  (async () => {
                    try {
                      const res = await fetch(`${API}/analysis/llm/tara`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nodes, edges, k: 1, maxDepth: 20, llm: { baseUrl: llmBaseUrl, apiKey: llmApiKey, model: llmModel } }) });
                      const json = await res.json();
                      const newRows: any[] = (json?.rows || []);
                      if (!Array.isArray(newRows) || newRows.length === 0) return;
                      setTaraRows((prev) => {
                        const arr = Array.isArray(prev) ? [...prev] : [];
                        arr[rowIndex] = newRows[0];
                        return arr as any;
                      });
                    } catch (e) { console.error(e); }
                  })();
                }}
              />
            )}
            {showTaraFullscreen && (
              <div style={{ position: "fixed", inset: 0, background: "#ffffff", zIndex: 2000, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", alignItems: "center", padding: 12, borderBottom: "1px solid #e5e7eb" }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>LLM TARA Table (Full Screen)</div>
                  <span style={{ flex: 1 }} />
                  <button onClick={() => setShowTaraFullscreen(false)} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                    <Minimize2 size={16} />
                    Exit Full Screen
                  </button>
                </div>
                <div style={{ flex: 1, overflow: "auto", padding: 12, position: "relative" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      {taraTable.getHeaderGroups().map((hg) => (
                        <tr key={hg.id}>
                          {hg.headers.map((header) => (
                            <th key={header.id} style={{ textAlign: "left", fontSize: 12, color: "#6b7280", padding: "6px 8px", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, background: "#fff" }}>
                              {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                            </th>
                          ))}
                        </tr>
                      ))}
                    </thead>
                    <tbody>
                      {taraTable.getRowModel().rows.map((row) => (
                        <tr key={row.id}>
                          {row.getVisibleCells().map((cell) => {
                            const idx = taraRowIndexById.get(row.id) ?? 0;
                            const colId = cell.column.id;
                            const meta = (taraRowSpanMeta[idx] || {})[colId];
                            if (meta && meta.hidden) return null;
                            const rs = meta ? meta.rowSpan : undefined;
                            return (
                              <td key={cell.id} rowSpan={rs} style={{ padding: "8px", borderBottom: "1px solid #f3f4f6", verticalAlign: "top", fontSize: 12 }}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <div role="separator" aria-orientation="vertical" onMouseDown={startRightDrag} style={{ width: 6, cursor: "col-resize", background: "transparent" }} />
          <div style={{ width: rightWidth, minWidth: 260, flex: `0 0 ${rightWidth}px`, borderLeft: "1px solid #e5e7eb", background: "#fafafa", overflow: "auto", height: "100%" }}>
            <PropertiesPanel
              kind={selectedKind}
              nodeType={selectedNodeType}
              data={selectedData}
              onNodeChange={onNodeChangeData}
              onEdgeChange={onEdgeChangeData}
              fullWidth
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
  </div>
  );
}

