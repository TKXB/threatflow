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
import ProcessNode from "./nodes/ProcessNode";
import StoreNode from "./nodes/StoreNode";
import TrustBoundaryNode from "./nodes/TrustBoundaryNode";
import { analyzeSimplePaths } from "./utils/pathAnalysis";

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
    nodes: "tf_attack_nodes",
    edges: "tf_attack_edges",
    idseq: "tf_attack_idseq",
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
      const savedNodes = safeParse<Node<BasicNodeData>[]>(localStorage.getItem(STORAGE_KEYS.nodes), []);
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

  const SidebarAP = useMemo(
    () => (
      <div className="sidebar">
        <h3>Attack Path Palette</h3>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>Entry Point</div>
        <div
          className="palette-item"
          draggable
          onDragStart={(e) => { e.dataTransfer.setData("application/tm-node", "actor"); e.dataTransfer.setData("application/tm-node-tech", "wifi"); }}
        >
          📶 Wi-Fi
        </div>
        <div
          className="palette-item"
          draggable
          onDragStart={(e) => { e.dataTransfer.setData("application/tm-node", "actor"); e.dataTransfer.setData("application/tm-node-tech", "ble"); }}
        >
          📱 BLE
        </div>
        <div
          className="palette-item"
          draggable
          onDragStart={(e) => { e.dataTransfer.setData("application/tm-node", "actor"); e.dataTransfer.setData("application/tm-node-tech", "uart"); }}
        >
          🔌 UART
        </div>
        <div
          className="palette-item"
          draggable
          onDragStart={(e) => { e.dataTransfer.setData("application/tm-node", "actor"); e.dataTransfer.setData("application/tm-node-tech", "jtag"); }}
        >
          🔧 JTAG
        </div>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 12 }}>Logic</div>
        <div
          className="palette-item"
          draggable
          onDragStart={(e) => { e.dataTransfer.setData("application/tm-node", "process"); e.dataTransfer.setData("application/tm-node-tech", "and-gate"); }}
        >
          ⚬ AND
        </div>
        <div
          className="palette-item"
          draggable
          onDragStart={(e) => { e.dataTransfer.setData("application/tm-node", "process"); e.dataTransfer.setData("application/tm-node-tech", "or-gate"); }}
        >
          ⚬ OR
        </div>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 12 }}>Attack Steps</div>
        <div
          className="palette-item"
          draggable
          onDragStart={(e) => { e.dataTransfer.setData("application/tm-node", "process"); e.dataTransfer.setData("application/tm-node-tech", "recon"); }}
        >
          🔍 Reconnaissance
        </div>
        <div
          className="palette-item"
          draggable
          onDragStart={(e) => { e.dataTransfer.setData("application/tm-node", "process"); e.dataTransfer.setData("application/tm-node-tech", "exploit"); }}
        >
          💥 Exploit
        </div>
        <div
          className="palette-item"
          draggable
          onDragStart={(e) => { e.dataTransfer.setData("application/tm-node", "process"); e.dataTransfer.setData("application/tm-node-tech", "privilege-escalation"); }}
        >
          ⬆️ Privilege Escalation
        </div>
        <div
          className="palette-item"
          draggable
          onDragStart={(e) => { e.dataTransfer.setData("application/tm-node", "process"); e.dataTransfer.setData("application/tm-node-tech", "lateral-movement"); }}
        >
          ↔️ Lateral Movement
        </div>
        <div
          className="palette-item"
          draggable
          onDragStart={(e) => { e.dataTransfer.setData("application/tm-node", "store"); e.dataTransfer.setData("application/tm-node-tech", "target"); }}
        >
          🎯 Target/Goal
        </div>
      </div>
    ),
    []
  );

  const Toolbar = useMemo(
    () => (
      <div className="toolbar">
        <button onClick={() => { setNodes([]); setEdges([]); }}>Clear All</button>
        <button
          onClick={() => {
            const paths = analyzeSimplePaths(nodes as any, edges as any, { k: 10, maxDepth: 20 });
            if (paths.length === 0) {
              alert("No paths found from entry to target.");
              return;
            }
            const text = paths
              .map((p, i) => `${i + 1}. ${p.labels.join(" -> ")}`)
              .join("\n");
            alert(`Top paths (up to 10):\n${text}`);
          }}
        >
          Analyze Paths
        </button>
        <button onClick={() => alert("Template import from backend coming soon!")}>Import Templates</button>
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
      {SidebarAP}
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

