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
import { ChevronRight, User, Globe, Server, Mail, Shield, Database as DbIcon, Box, Timer } from "lucide-react";

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
    } catch {}
  }, [nodes, edges, idSeq]);

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
          </div>
          <PropertiesPanel
            kind={selectedKind}
            nodeType={selectedNodeType}
            data={selectedData}
            onNodeChange={onNodeChangeData}
            onEdgeChange={onEdgeChangeData}
          />
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

