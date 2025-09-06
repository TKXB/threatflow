import { useCallback, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  Connection,
  Edge,
  Node,
  OnNodesChange,
  OnEdgesChange,
  useNodesState,
  useEdgesState,
  MarkerType,
  useReactFlow,
} from "@xyflow/react";
import PropertiesPanel from "./PropertiesPanel";
import { buildOtmFromGraph } from "./utils/otmMapper";
import { buildThreagileYaml } from "./utils/threagileMapper";
import ActorNode from "./nodes/ActorNode";
import ProcessNode from "./nodes/ProcessNode";
import StoreNode from "./nodes/StoreNode";
import TrustBoundaryNode from "./nodes/TrustBoundaryNode";

type BasicNodeData = { label: string };

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

export default function App() {
  const reactFlowWrapper = useRef<HTMLDivElement | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [idSeq, setIdSeq] = useState(1);
  const [selectedKind, setSelectedKind] = useState<"node" | "edge" | null>(null);
  const [selectedNodeType, setSelectedNodeType] = useState<string | undefined>(undefined);
  const [selectedData, setSelectedData] = useState<Record<string, any> | undefined>(undefined);
  const nodeTypes = useMemo(
    () => ({
      actor: ActorNode,
      process: ProcessNode,
      store: StoreNode,
      trustBoundary: TrustBoundaryNode,
    }),
    []
  );

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
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      const type = event.dataTransfer.getData("application/tm-node");
      if (!bounds || !type) return;

      const position = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      const id = `n_${idSeq}`;
      setIdSeq((v) => v + 1);

      const label = type === "actor" ? "Actor" : type === "process" ? "Process" : type === "store" ? "Store" : "Trust Boundary";
      const defaultSize =
        type === "trustBoundary"
          ? { width: 260, height: 160 }
          : { width: undefined, height: undefined };
      setNodes((nds) =>
        nds.concat({ id, position, data: { label }, type: (type as any), ...defaultSize })
      );
    },
    [idSeq]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const Sidebar = useMemo(
    () => (
      <div className="sidebar">
        <h3>Palette</h3>
        <div
          className="palette-item"
          draggable
          onDragStart={(e) => e.dataTransfer.setData("application/tm-node", "actor")}
        >
          Actor
        </div>
        <div
          className="palette-item"
          draggable
          onDragStart={(e) => e.dataTransfer.setData("application/tm-node", "process")}
        >
          Process
        </div>
        <div
          className="palette-item"
          draggable
          onDragStart={(e) => e.dataTransfer.setData("application/tm-node", "store")}
        >
          Store
        </div>
        <div
          className="palette-item"
          draggable
          onDragStart={(e) => e.dataTransfer.setData("application/tm-node", "trustBoundary")}
        >
          Trust Boundary
        </div>
      </div>
    ),
    []
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
              // placeholder: send to backend, then applyOtmToGraph(response)
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

  return (
    <div className="app">
      {Sidebar}
      <div className="canvas" ref={reactFlowWrapper}>
        {Toolbar}
        <div className="content">
          <div className="flow">
            <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange as OnNodesChange}
          onEdgesChange={onEdgesChange as OnEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={{ markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 1.6 } }}
          fitView
          deleteKeyCode={["Delete"]}
            onSelectionChange={onSelectionChange}
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
        </div>
      </div>
    </div>
  );
}

