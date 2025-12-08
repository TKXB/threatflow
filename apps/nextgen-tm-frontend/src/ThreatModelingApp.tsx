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
import LlmRisksPanel from "./components/LlmRisksPanel";
import { buildOtmFromGraph, applyOtmToGraph } from "./utils/otmMapper";
import { buildThreagileYaml } from "./utils/threagileMapper";
import { trackEvent } from "./utils/analytics";
import ContextMenu from "./components/ContextMenu";
import WelcomeModal from "./components/WelcomeModal";
import ActorNode from "./nodes/ActorNode";
import ProcessNode from "./nodes/ProcessNode";
import StoreNode from "./nodes/StoreNode";
import TrustBoundaryNode from "./nodes/TrustBoundaryNode";
import { ChevronRight, User, Globe, Server, Mail, Shield, Database as DbIcon, Box, Timer, Bot, Download as DownloadIcon, X, Trash, Keyboard, Undo2, Redo2, Grid as GridIcon, Save as SaveIcon, Upload, RefreshCw, RotateCcw } from "lucide-react";

type BasicNodeData = { label: string; technology?: string } & Record<string, any>;

// Edge communication link data schema used by PropertiesPanel and Threagile mapper
type CommunicationLinkData = {
  label?: string;
  protocol?: string;
  authentication?: string;
  authorization?: string;
  usage?: string;
  vpn?: string | boolean; // yes/no or boolean
  ip_filtered?: string | boolean; // yes/no or boolean
  readonly?: string | boolean; // yes/no or boolean
  data_assets?: string[] | string; // comma-separated string or array
};

// TM palette minimal schema
type TmPaletteItem = { label: string; type: string; technology?: string; icon?: string };
type TmPaletteSection = { title: string; items: TmPaletteItem[] };
type TmPaletteConfig = { sections: TmPaletteSection[] };

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

export default function ThreatModelingApp() {
  const reactFlowWrapper = useRef<HTMLDivElement | null>(null);
  const [rfInstance, setRfInstance] = useState<any>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [idSeq, setIdSeq] = useState(1);
  const [selectedKind, setSelectedKind] = useState<"node" | "edge" | null>(null);
  const [selectedNodeType, setSelectedNodeType] = useState<string | undefined>(undefined);
  const [selectedData, setSelectedData] = useState<Record<string, any> | undefined>(undefined);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; type: "node" | "edge"; id: string } | null>(null);
  const [openSections, setOpenSections] = useState<string[]>([]);
  const [llmBaseUrl, setLlmBaseUrl] = useState<string>("http://127.0.0.1:4000/v1");
  const [llmApiKey, setLlmApiKey] = useState<string>("");
  const [llmModel, setLlmModel] = useState<string>("gpt-4o-mini");
  const [showLlmSettings, setShowLlmSettings] = useState<boolean>(false);
  const [settingsHydrated, setSettingsHydrated] = useState<boolean>(false);
  const [llmRisks, setLlmRisks] = useState<Array<any> | null>(null);
  const [risksLoading, setRisksLoading] = useState<boolean>(false);
  const [acceptedFindings, setAcceptedFindings] = useState<Array<any>>(() => {
    try { return JSON.parse(localStorage.getItem("tf_tm_findings") || "[]"); } catch { return []; }
  });
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [history, setHistory] = useState<Array<{ nodes: Node[]; edges: Edge[] }>>([]);
  const [future, setFuture] = useState<Array<{ nodes: Node[]; edges: Edge[] }>>([]);
  const [focusedNodeIds, setFocusedNodeIds] = useState<string[]>([]);
  const threagileInputRef = useRef<HTMLInputElement | null>(null);
  const paletteFileInputRef = useRef<HTMLInputElement | null>(null);
  const otmImportInputRef = useRef<HTMLInputElement | null>(null);
  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem("tf_tm_welcome") || "true"); } catch { return true; }
  });
  const [paletteConfig, setPaletteConfig] = useState<TmPaletteConfig | null>(null);
  const [paletteError, setPaletteError] = useState<string | null>(null);
  const nodeTypes = useMemo(
    () => ({
      actor: ActorNode,
      process: ProcessNode,
      store: StoreNode,
      trustBoundary: TrustBoundaryNode,
    } as any),
    []
  );

  const STORAGE_KEYS = {
    nodes: "tf_tm_nodes",
    edges: "tf_tm_edges",
    idseq: "tf_tm_idseq",
    llmBase: "tf_llm_base_url",
    llmKey: "tf_llm_api_key",
    llmModel: "tf_llm_model",
    findings: "tf_tm_findings",
    paletteJson: "tf_tm_palette_json",
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

  // 显式保存 LLM 设置（与 AttackPathApp 对齐）
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
      const savedNodes = safeParse<Node<any>[]>(localStorage.getItem(STORAGE_KEYS.nodes), []);
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
    } catch {}
    setSettingsHydrated(true);
  }, []);

  useEffect(() => {
    try { localStorage.setItem("tf_tm_welcome", JSON.stringify(showWelcome)); } catch {}
  }, [showWelcome]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.nodes, JSON.stringify(nodes));
      localStorage.setItem(STORAGE_KEYS.edges, JSON.stringify(edges));
      localStorage.setItem(STORAGE_KEYS.idseq, JSON.stringify(idSeq));
      if (settingsHydrated) {
        localStorage.setItem(STORAGE_KEYS.llmBase, JSON.stringify(llmBaseUrl));
        localStorage.setItem(STORAGE_KEYS.llmKey, JSON.stringify(llmApiKey));
        localStorage.setItem(STORAGE_KEYS.llmModel, JSON.stringify(llmModel));
      }
      localStorage.setItem(STORAGE_KEYS.findings, JSON.stringify(acceptedFindings));
    } catch {}
  }, [nodes, edges, idSeq, llmBaseUrl, llmApiKey, llmModel, acceptedFindings, settingsHydrated]);

  // API base for server
  const API = (import.meta as any).env?.VITE_NEXTGEN_API || "";

  // ----- Palette loading chain: LocalStorage > Backend plugins > Default file -----
  async function loadPaletteFromLocal(): Promise<TmPaletteConfig | null> {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.paletteJson);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.sections)) return parsed as TmPaletteConfig;
    } catch {}
    return null;
  }

  async function loadPaletteFromBackend(): Promise<TmPaletteConfig | null> {
    try {
      const res = await fetch(`${API}/api/tm/palette/plugins`, { headers: { "accept": "application/json" } });
      const json = await res.json();
      const sections = Array.isArray(json?.sections) ? json.sections : [];
      if (sections.length > 0) return { sections } as TmPaletteConfig;
    } catch (e) {
      console.warn("Failed to load TM backend palette", e);
    }
    return null;
  }

  async function loadDefaultPalette(): Promise<TmPaletteConfig | null> {
    try {
      const res = await fetch(`/palette.tm.json?ts=${Date.now()}`);
      const json = await res.json();
      if (json && Array.isArray(json.sections)) return json as TmPaletteConfig;
    } catch (e) {
      console.warn("Failed to load default palette.tm.json", e);
    }
    return null;
  }

  function mergePalettes(sources: (TmPaletteConfig | null)[]): TmPaletteConfig | null {
    const sections: TmPaletteSection[] = [];
    const pushAll = (src?: TmPaletteConfig | null) => {
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
    for (const src of sources) pushAll(src || undefined);
    return sections.length > 0 ? { sections } : null;
  }

  async function loadPalette() {
    setPaletteError(null);
    const [loc, backend, deflt] = await Promise.all([
      loadPaletteFromLocal(),
      loadPaletteFromBackend(),
      loadDefaultPalette(),
    ]);
    const loaded = mergePalettes([deflt, backend, loc]);
    if (loaded) setPaletteConfig(loaded);
    else {
      setPaletteConfig({ sections: [] });
      setPaletteError("未找到可用的 TM 组件，请导入 JSON。");
    }
  }

  useEffect(() => { void loadPalette(); }, []);

  function triggerPaletteImport() { try { paletteFileInputRef.current?.click(); } catch {} }

  function onPaletteFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const parsed = JSON.parse(text);
        if (!parsed || !Array.isArray(parsed.sections)) throw new Error("Invalid palette JSON");
        localStorage.setItem(STORAGE_KEYS.paletteJson, text);
        setPaletteConfig(parsed as TmPaletteConfig);
        setPaletteError(null);
      } catch (err) {
        setPaletteError("无效的 TM palette JSON");
      } finally {
        try { (e.target as HTMLInputElement).value = ""; } catch {}
      }
    };
    reader.readAsText(file);
  }

  async function reloadPalette() { await loadPalette(); }
  async function resetPalette() { try { localStorage.removeItem(STORAGE_KEYS.paletteJson); } catch {}; await loadPalette(); }

  useEffect(() => {
    function handler(ev: CustomEvent<{ key: string }>) {
      const key = ev?.detail?.key;
      switch (key) {
        case "llm": {
          trackEvent("ThreatModeling", "AI Analysis", "Risks");
          setRisksLoading(true);
          (async () => {
            try {
              const res = await fetch(`${API}/analysis/tm/llm/risks`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ nodes, edges, k: 20, maxDepth: 20, llm: { baseUrl: llmBaseUrl, apiKey: llmApiKey, model: llmModel } }),
              });
              const json = await res.json();
              const risks = (json?.risks || []) as any[];
              setLlmRisks(risks);
            } catch (e) {
              console.error(e);
            } finally {
              setRisksLoading(false);
            }
          })();
          break;
        }
        case "clear-nodes": {
          setNodes([]);
          break;
        }
        case "clear-edges": {
          setEdges([]);
          break;
        }
        case "export-otm": {
          trackEvent("ThreatModeling", "Export", "OTM");
          exportOtm();
          break;
        }
        case "export-threagile": {
          trackEvent("ThreatModeling", "Export", "Threagile");
          exportThreagile();
          break;
        }
        case "import-threagile": {
          try { threagileInputRef.current?.click(); } catch {}
          break;
        }
        case "llm-settings": {
          setShowLlmSettings(true);
          break;
        }
        case "export-report": {
          trackEvent("ThreatModeling", "Export", "Report");
          const payload = {
            modelTitle: "Model",
            generatedAt: new Date().toISOString(),
            findings: acceptedFindings,
          };
          const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "tm-findings.json";
          a.click();
          URL.revokeObjectURL(url);
          break;
        }
      }
    }
    window.addEventListener("ap-menu", handler as any);
    return () => window.removeEventListener("ap-menu", handler as any);
  }, [nodes, edges, API, llmBaseUrl, llmApiKey, llmModel, acceptedFindings]);

  function acceptRisk(r: any) {
    trackEvent("ThreatModeling", "Risk Accept", r.title || "Unknown");
    setAcceptedFindings((prev) => {
      const id = r.id || `${(r.title || "risk").toString().slice(0, 24).replace(/\s+/g, "-").toLowerCase()}-${Date.now()}`;
      const next = prev.concat({ ...r, id });
      return next;
    });
  }

  function dismissRisk(idx: number) {
    const risk = llmRisks?.[idx];
    trackEvent("ThreatModeling", "Risk Dismiss", risk?.title || "Unknown");
    setLlmRisks((prev) => {
      if (!prev) return prev;
      const copy = prev.slice();
      copy.splice(idx, 1);
      return copy;
    });
  }

  function exportOtm() {
    trackEvent("ThreatModeling", "Export", "OTM");
    const otm = buildOtmFromGraph(nodes, edges, "Model");
    const blob = new Blob([JSON.stringify(otm, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "model-otm.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportThreagile() {
    trackEvent("ThreatModeling", "Export", "Threagile");
    const yaml = buildThreagileYaml(nodes, edges, "Model");
    const blob = new Blob([yaml], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "threagile.yaml";
    a.click();
    URL.revokeObjectURL(url);
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
        setHistory([]);
        setFuture([]);
      } catch (err) {
        try { alert("无效的 OTM JSON 文件"); } catch {}
      } finally {
        try { (e.target as HTMLInputElement).value = ""; } catch {}
      }
    };
    reader.readAsText(file);
  }

  function onThreagileImportChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    alert("Import Threagile YAML: upload file to /models/import/threagile and hydrate graph");
    e.currentTarget.value = "";
  }

  // --- Canvas helpers similar to AttackPathApp ---
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
    trackEvent("ThreatModeling", "Clear", "Canvas");
    setNodes([] as any);
    setEdges([] as any);
  }, []);

  const closeDiagram = useCallback(() => { setNodes([] as any); setEdges([] as any); }, []);

  const saveModel = useCallback(() => {
    try {
      trackEvent("ThreatModeling", "Save", "Model");
      const otm = buildOtmFromGraph(nodes as any, edges as any, "Model");
      const blob = new Blob([JSON.stringify(otm, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "model.save.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  }, [nodes, edges]);

  const showShortcuts = useCallback(() => {
    try { alert("Shortcuts:\n- Delete: remove selection\n- Right click: context menu\n- Drag between handles: connect nodes"); } catch {}
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

  const onConnect = useCallback((conn: Connection) => {
    const defaultData: CommunicationLinkData = {
      protocol: "https",
      authentication: "token",
      authorization: "none",
      usage: "business",
      vpn: "no",
      ip_filtered: "no",
      readonly: "no",
      data_assets: "",
    };
    setEdges((eds) =>
      addEdge(
        {
          ...conn,
          animated: false,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { strokeWidth: 1.6 },
          data: defaultData,
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
      const iconFromDrag = event.dataTransfer.getData("application/tm-node-icon");
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
        : type === "process" ? (technology || "Process")
        : type === "store" ? "Store"
        : "Trust Boundary");

      const sizeMap: Record<string, { width: number; height: number }> = {
        actor: { width: 64, height: 64 },
        process: { width: 120, height: 60 },
        store: { width: 120, height: 70 },
        trustBoundary: { width: 260, height: 160 },
      };
      const sz = sizeMap[type] || { width: 100, height: 60 };
      const position = { x: flowPoint.x - sz.width / 2, y: flowPoint.y - sz.height / 2 };

      setNodes((nds) => [
        ...nds,
        { id, position, data: { label, technology: technology || undefined, ...(iconFromDrag ? { icon: iconFromDrag } : {}) }, type: (type as any), width: sz.width, height: sz.height, zIndex: type === "trustBoundary" ? 0 : 1 },
      ]);
    },
    [idSeq, rfInstance]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const toggleSection = useCallback((title: string) => {
    setOpenSections((prev) => prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]);
  }, []);

  const handleSectionKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>, title: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleSection(title);
    }
  }, [toggleSection]);

  function getIconForLabel(label: string) {
    const text = label.toLowerCase();
    if (/actor/.test(text)) return User;
    if (/web/.test(text)) return Globe;
    if (/server/.test(text)) return Server;
    if (/load\s*balancer|balance|load/.test(text)) return Box;
    if (/queue|message/.test(text)) return Mail;
    if (/gateway|api/.test(text)) return Shield;
    if (/task|worker/.test(text)) return Timer;
    if (/scheduler|schedule/.test(text)) return Timer;
    if (/store|db|database/.test(text)) return DbIcon;
    if (/boundary/.test(text)) return Shield;
    return Box;
  }

  function renderPaletteIcon(it: TmPaletteItem) {
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
    const Icon = getIconForLabel(it.label);
    return <span className="pi-icon"><Icon size={16} /></span>;
  }

  const SidebarTM = useMemo(
    () => (
      <div className="sidebar" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <h3>Palette</h3>
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
                {section.items?.map((it, ii) => (
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
          <button title="Import JSON" style={{ ...footerButtonStyle, height: 32 }} onClick={triggerPaletteImport}><Upload size={16} /></button>
          <button title="Reload" style={{ ...footerButtonStyle, height: 32 }} onClick={() => { void reloadPalette(); }}><RefreshCw size={16} /></button>
          <button title="Reset Default" style={{ ...footerButtonStyle, height: 32 }} onClick={() => { void resetPalette(); }}><RotateCcw size={16} /></button>
          <input ref={paletteFileInputRef} onChange={onPaletteFileSelected} type="file" accept="application/json" style={{ display: "none" }} />
        </div>
      </div>
    ),
    [paletteConfig, paletteError, openSections, toggleSection, handleSectionKeyDown]
  );

  // Toolbar removed: options moved to header dropdown

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

  const handleFocusRisk = useCallback((nodeIds: string[] | null) => {
    if (!nodeIds || nodeIds.length === 0) {
      setFocusedNodeIds([]);
      return;
    }
    
    setFocusedNodeIds(nodeIds);
    
    // 计算所有相关节点的中心位置
    const relevantNodes = nodes.filter((n) => nodeIds.includes(n.id));
    if (relevantNodes.length === 0) return;
    
    // 计算边界框
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    relevantNodes.forEach((node) => {
      const x = node.position.x;
      const y = node.position.y;
      const w = (node as any).width || 100;
      const h = (node as any).height || 60;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // 平移画布到中心位置（不改变缩放）
    if (rfInstance) {
      rfInstance.setCenter(centerX, centerY, { duration: 400 });
    }
  }, [nodes, rfInstance]);

  // 根据 focusedNodeIds 计算高亮的节点和边
  const highlightedNodes = useMemo(() => {
    if (focusedNodeIds.length === 0) return nodes;
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        __hl: focusedNodeIds.includes(node.id),
      },
    }));
  }, [nodes, focusedNodeIds]);

  const highlightedEdges = useMemo(() => {
    if (focusedNodeIds.length === 0) return edges;
    // 高亮连接 focusedNodeIds 中节点的边
    return edges.map((edge) => {
      const isRelated = focusedNodeIds.includes(edge.source) || focusedNodeIds.includes(edge.target);
      if (isRelated) {
        return {
          ...edge,
          style: {
            ...(edge.style || {}),
            stroke: "#2563eb",
            strokeWidth: 3,
          },
        };
      }
      return edge;
    });
  }, [edges, focusedNodeIds]);

  return (
    <div className="app" style={{ height: "100%", display: "flex", overflow: "hidden" }}>
      <WelcomeModal
        open={showWelcome}
        onClose={() => setShowWelcome(false)}
        title="Get started"
        description="Start with templates showcasing Threat Modeling palette and connections."
        primaryText="Start"
      />
      {SidebarTM}
      <div className="canvas" ref={reactFlowWrapper} style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {/* Toolbar removed: actions available in Options dropdown */}
        <div className="content" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "row" }}>
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div className="flow" style={{ height: "100%", position: "relative" }}>
              <style>
                {`
                /* Raise edges above nodes so edges inside trust boundary are clickable */
                .react-flow__edges { z-index: 3 !important; pointer-events: auto; }
                .react-flow__nodes { z-index: 2 !important; }
                /* Ensure selected node outlines render atop own background */
                .react-flow__node.selected { z-index: 4 !important; }
                `}
              </style>
              <ReactFlow
                nodes={highlightedNodes}
                edges={highlightedEdges}
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
              {/* Floating button container (top-right) */}
              <div style={{ position: "absolute", right: 12, top: 12, zIndex: 20 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 8, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}>
                  <button title="Clear All" onClick={clearAll} style={footerButtonStyle}><Trash size={16} /></button>
                  <button title="Shortcuts" onClick={showShortcuts} style={footerButtonStyle}><Keyboard size={16} /></button>
                  <button title="Undo" onClick={undo} style={footerButtonStyle}><Undo2 size={16} /></button>
                  <button title="Redo" onClick={redo} style={footerButtonStyle}><Redo2 size={16} /></button>
                  <button title="Toggle Grid" onClick={() => setShowGrid((v) => !v)} style={footerButtonStyle}><GridIcon size={16} /></button>
                  <span style={{ width: 8 }} />
                  <button title="Open" onClick={triggerOtmImport} style={footerButtonStyle}><Upload size={16} /><span style={{ marginLeft: 6, fontSize: 12 }}>Open</span></button>
                  <button title="Export OTM" onClick={exportOtm} style={footerButtonStyle}><DownloadIcon size={16} /><span style={{ marginLeft: 6, fontSize: 12 }}>OTM</span></button>
                  <button title="Export Threagile" onClick={exportThreagile} style={footerButtonStyle}><DownloadIcon size={16} /><span style={{ marginLeft: 6, fontSize: 12 }}>Threagile</span></button>
                  <button title="AI" onClick={() => window.dispatchEvent(new CustomEvent("ap-menu", { detail: { key: "llm" } }))} style={footerButtonStyle}><Bot size={16} /></button>
                  <span style={{ width: 8 }} />
                  <button title="Save" onClick={saveModel} style={{ ...footerButtonStyle, borderColor: "#2563eb", color: "#2563eb" }}><SaveIcon size={16} /><span style={{ marginLeft: 6, fontSize: 12 }}>Save</span></button>
                </div>
              </div>
              <input ref={threagileInputRef} type="file" accept=".yaml,.yml" style={{ display: "none" }} onChange={onThreagileImportChange} />
              <input ref={otmImportInputRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={onOtmImportChange} />
            </div>
            <LlmRisksPanel
              risks={llmRisks}
              loading={risksLoading}
              onAccept={acceptRisk}
              onDismiss={(i) => dismissRisk(i)}
              onExportSingle={(r) => {
                const content = JSON.stringify(r, null, 2);
                const blob = new Blob([content], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `tm-risk-${(r.id || r.title || "risk").toString().replace(/\s+/g, "-").toLowerCase()}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              onClose={() => { 
                setLlmRisks(null); 
                setFocusedNodeIds([]);
              }}
              onFocusRisk={handleFocusRisk}
            />

            {showLlmSettings ? (
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
            ) : null}
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
          <div style={{ width: 360, minWidth: 260, flex: "0 0 360px", borderLeft: "1px solid #e5e7eb", background: "#fafafa", overflow: "auto", height: "100%" }}>
            <PropertiesPanel
              kind={selectedKind}
              nodeType={selectedNodeType}
              data={selectedData}
              onNodeChange={onNodeChangeData}
              onEdgeChange={onEdgeChangeData}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

