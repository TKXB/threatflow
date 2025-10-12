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
import { buildOtmFromGraph } from "./utils/otmMapper";
import { buildThreagileYaml } from "./utils/threagileMapper";
import ContextMenu from "./components/ContextMenu";
import WelcomeModal from "./components/WelcomeModal";
import ActorNode from "./nodes/ActorNode";
import ProcessNode from "./nodes/ProcessNode";
import StoreNode from "./nodes/StoreNode";
import TrustBoundaryNode from "./nodes/TrustBoundaryNode";
import { ChevronRight, User, Globe, Server, Mail, Shield, Database as DbIcon, Box, Timer, Bot, Download as DownloadIcon, X } from "lucide-react";

type BasicNodeData = { label: string; technology?: string } & Record<string, any>;

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
  const [llmRisks, setLlmRisks] = useState<Array<any> | null>(null);
  const [risksLoading, setRisksLoading] = useState<boolean>(false);
  const [acceptedFindings, setAcceptedFindings] = useState<Array<any>>(() => {
    try { return JSON.parse(localStorage.getItem("tf_tm_findings") || "[]"); } catch { return []; }
  });
  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem("tf_tm_welcome") || "true"); } catch { return true; }
  });
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
  }, []);

  useEffect(() => {
    try { localStorage.setItem("tf_tm_welcome", JSON.stringify(showWelcome)); } catch {}
  }, [showWelcome]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.nodes, JSON.stringify(nodes));
      localStorage.setItem(STORAGE_KEYS.edges, JSON.stringify(edges));
      localStorage.setItem(STORAGE_KEYS.idseq, JSON.stringify(idSeq));
      localStorage.setItem(STORAGE_KEYS.llmBase, JSON.stringify(llmBaseUrl));
      localStorage.setItem(STORAGE_KEYS.llmKey, JSON.stringify(llmApiKey));
      localStorage.setItem(STORAGE_KEYS.llmModel, JSON.stringify(llmModel));
      localStorage.setItem(STORAGE_KEYS.findings, JSON.stringify(acceptedFindings));
    } catch {}
  }, [nodes, edges, idSeq, llmBaseUrl, llmApiKey, llmModel, acceptedFindings]);

  // API base for server
  const API = (import.meta as any).env?.VITE_NEXTGEN_API || "http://127.0.0.1:8890";

  useEffect(() => {
    function handler(ev: CustomEvent<{ key: string }>) {
      const key = ev?.detail?.key;
      switch (key) {
        case "llm": {
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
        case "llm-settings": {
          setShowLlmSettings(true);
          break;
        }
        case "export-report": {
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
    setAcceptedFindings((prev) => {
      const id = r.id || `${(r.title || "risk").toString().slice(0, 24).replace(/\s+/g, "-").toLowerCase()}-${Date.now()}`;
      const next = prev.concat({ ...r, id });
      return next;
    });
  }

  function dismissRisk(idx: number) {
    setLlmRisks((prev) => {
      if (!prev) return prev;
      const copy = prev.slice();
      copy.splice(idx, 1);
      return copy;
    });
  }

  function exportOtm() {
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
    const yaml = buildThreagileYaml(nodes, edges, "Model");
    const blob = new Blob([yaml], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "threagile.yaml";
    a.click();
    URL.revokeObjectURL(url);
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
      if (!type) return;

      const flowPoint = rfInstance
        ? rfInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY })
        : (() => {
            const rect = reactFlowWrapper.current?.getBoundingClientRect();
            return { x: (event.clientX - (rect?.left || 0)), y: (event.clientY - (rect?.top || 0)) };
          })();
      const id = `n_${idSeq}`;
      setIdSeq((v) => v + 1);

      const label = type === "actor" ? (technology || "Actor") : type === "process" ? (technology || "Process") : type === "store" ? "Store" : "Trust Boundary";

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
        { id, position, data: { label, technology: technology || undefined }, type: (type as any), width: sz.width, height: sz.height, zIndex: type === "trustBoundary" ? 0 : 1 },
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

  const SidebarTM = useMemo(
    () => (
      <div className="sidebar">
        <h3>Palette</h3>
        <div className="disclosure-section">
          <div
            className={`disclosure-header ${openSections.includes("General") ? "open" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => toggleSection("General")}
            onKeyDown={(e) => handleSectionKeyDown(e, "General")}
          >
            <span className="disclosure-title">General</span>
            <ChevronRight className="disclosure-chevron" size={16} />
          </div>
          <div className={`disclosure-content ${openSections.includes("General") ? "open" : ""}`}>
            {[
              { label: "Actor", type: "actor" },
              { label: "Store", type: "store" },
              { label: "Trust Boundary", type: "trustBoundary" },
            ].map((it, i) => (
              <div
                key={`gen-${i}-${it.label}`}
                className="palette-item"
                data-type={it.type}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/tm-node", it.type);
                }}
              >
                {(() => { const Icon = getIconForLabel(it.label); return <span className="pi-icon"><Icon size={16} /></span>; })()}
                <div className="pi-text">
                  <div className="pi-label">{it.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="disclosure-section">
          <div
            className={`disclosure-header ${openSections.includes("Processes") ? "open" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => toggleSection("Processes")}
            onKeyDown={(e) => handleSectionKeyDown(e, "Processes")}
          >
            <span className="disclosure-title">Processes</span>
            <ChevronRight className="disclosure-chevron" size={16} />
          </div>
          <div className={`disclosure-content ${openSections.includes("Processes") ? "open" : ""}`}>
            {[
              { label: "Web App", tech: "web-application" },
              { label: "App Server", tech: "application-server" },
              { label: "Load Balancer", tech: "load-balancer" },
              { label: "Message Queue", tech: "message-queue" },
              { label: "API Gateway", tech: "gateway" },
              { label: "Task/Worker", tech: "task" },
              { label: "Scheduler", tech: "scheduler" },
            ].map((it, i) => (
              <div
                key={`proc-${i}-${it.label}`}
                className="palette-item"
                data-type="process"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/tm-node", "process");
                  e.dataTransfer.setData("application/tm-node-tech", it.tech);
                }}
              >
                {(() => { const Icon = getIconForLabel(it.label); return <span className="pi-icon"><Icon size={16} /></span>; })()}
                <div className="pi-text">
                  <div className="pi-label">{it.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    [openSections, toggleSection, handleSectionKeyDown]
  );

  const Toolbar = useMemo(
    () => (
      <div className="toolbar">
        <button onClick={() => setNodes([])}>Clear Nodes</button>
        <button onClick={() => setEdges([])}>Clear Edges</button>
        <button
          onClick={() => {
            const otm = buildOtmFromGraph(nodes, edges, "Model");
            const blob = new Blob([JSON.stringify(otm, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "model-otm.json";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export OTM (JSON)
        </button>
        <button
          onClick={() => {
            const yaml = buildThreagileYaml(nodes, edges, "Model");
            const blob = new Blob([yaml], { type: "text/yaml" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "threagile.yaml";
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export Threagile (YAML)
        </button>
        <label style={{ marginLeft: 8 }}>
          <input
            type="file"
            accept=".yaml,.yml"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              alert("Import Threagile YAML: upload file to /models/import/threagile and hydrate graph");
              e.currentTarget.value = "";
            }}
          />
          <span className="toolbar button">Import Threagile (YAML)</span>
        </label>
      </div>
    ),
    [nodes, edges]
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
      <WelcomeModal
        open={showWelcome}
        onClose={() => setShowWelcome(false)}
        title="Get started"
        description="Start with templates showcasing Threat Modeling palette and connections."
        primaryText="Start"
      />
      {SidebarTM}
      <div className="canvas" ref={reactFlowWrapper} style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        {Toolbar}
        <div className="content" style={{ flex: 1, minHeight: 0 }}>
          <div className="flow" style={{ height: "100%" }}>
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
            {/* Floating button container (top-right) */}
            <div style={{ position: "absolute", right: 12, top: 12, zIndex: 20 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 8, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}>
                <button title="Export OTM" onClick={exportOtm} style={footerButtonStyle}><DownloadIcon size={16} /><span style={{ marginLeft: 6, fontSize: 12 }}>OTM</span></button>
                <button title="Export Threagile" onClick={exportThreagile} style={footerButtonStyle}><DownloadIcon size={16} /><span style={{ marginLeft: 6, fontSize: 12 }}>Threagile</span></button>
                <button title="AI" onClick={() => window.dispatchEvent(new CustomEvent("ap-menu", { detail: { key: "llm" } }))} style={footerButtonStyle}><Bot size={16} /></button>
              </div>
            </div>
          </div>
          <PropertiesPanel
            kind={selectedKind}
            nodeType={selectedNodeType}
            data={selectedData}
            onNodeChange={onNodeChangeData}
            onEdgeChange={onEdgeChangeData}
          />
          {/* LLM Risks panel */}
          {risksLoading ? (
            <div style={{ padding: 8, fontSize: 12, color: "#6b7280" }}>LLM Risks loading...</div>
          ) : null}
          {(llmRisks && llmRisks.length > 0) ? (
            <div style={{ borderTop: "1px solid #e5e7eb", background: "#fff" }}>
              <div style={{ padding: 8, display: "flex", alignItems: "center" }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#111827", fontWeight: 600 }}>
                  <Bot size={16} />
                  <span>LLM Risks ({llmRisks.length})</span>
                </div>
                <span style={{ flex: 1 }} />
                <button title="Close" onClick={() => setLlmRisks(null)} style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 28, padding: "0 8px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 12 }}>
                  <X size={14} /> Close
                </button>
              </div>
              <div style={{ maxHeight: 260, overflow: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>Title</th>
                      <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>Severity</th>
                      <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>Confidence</th>
                      <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>Score</th>
                      <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>Nodes</th>
                      <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {llmRisks
                      .slice()
                      .sort((a, b) => (b.severityNumeric || 0) - (a.severityNumeric || 0) || (b.score || 0) - (a.score || 0))
                      .map((r, idx) => (
                      <tr key={`rk-${idx}`}>
                        <td style={{ padding: "6px 8px", borderBottom: "1px solid #f3f4f6" }}>
                          <div style={{ fontWeight: 600, color: "#111827" }}>{r.title}</div>
                          <div style={{ color: "#6b7280", marginTop: 2 }}>{r.description}</div>
                        </td>
                        <td style={{ padding: "6px 8px", borderBottom: "1px solid #f3f4f6" }}>{String(r.severity || "").toUpperCase()}</td>
                        <td style={{ padding: "6px 8px", borderBottom: "1px solid #f3f4f6" }}>{typeof r.confidence === "number" ? r.confidence.toFixed(2) : "-"}</td>
                        <td style={{ padding: "6px 8px", borderBottom: "1px solid #f3f4f6" }}>{typeof r.score === "number" ? r.score.toFixed(2) : "-"}</td>
                        <td style={{ padding: "6px 8px", borderBottom: "1px solid #f3f4f6", maxWidth: 280, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {(r.nodeIds || []).join(" → ")}
                        </td>
                        <td style={{ padding: "6px 8px", borderBottom: "1px solid #f3f4f6" }}>
                          <button onClick={() => acceptRisk(r)} style={{ height: 28, padding: "0 8px", borderRadius: 6, border: "1px solid #10b981", background: "#10b981", color: "#fff", cursor: "pointer", fontSize: 12 }}>Accept</button>
                          <span style={{ width: 6, display: "inline-block" }} />
                          <button onClick={() => dismissRisk(idx)} style={{ height: 28, padding: "0 8px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 12 }}>Dismiss</button>
                          <span style={{ width: 6, display: "inline-block" }} />
                          <button title="Export single" onClick={() => {
                            const content = JSON.stringify(r, null, 2);
                            const blob = new Blob([content], { type: "application/json" });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `tm-risk-${(r.id || r.title || "risk").toString().replace(/\s+/g, "-").toLowerCase()}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }} style={{ height: 28, padding: "0 8px", borderRadius: 6, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <DownloadIcon size={14} /> Export
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

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
      </div>
    </div>
  );
}

