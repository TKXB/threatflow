# Next-Gen Threat Modeler (Base Design)

## Goals
- **Threat Dragon-like modeling**: DFD-style canvas, nodes/links, trust boundaries, threats pane.
- **Langflow-like extensibility**: pluggable nodes (AI, Python), composable flows, runtime execution.
- **Single source of truth**: OTM as core model; adapters for Threat Dragon JSON, Threagile YAML.

## Tech Stack
- **Frontend**: React + TypeScript, `@xyflow/react` (XYFlow) for canvas, Zustand for state, Tailwind for UI.
- **Backend API**: FastAPI (Python), uvicorn; Pydantic models for OTM; adapters for TD/Threagile。
- **Execution**: Python task runner (Celery/Arq/BackgroundTasks) with per-task sandbox (Docker/Firejail), logs streaming via Server-Sent Events (SSE) or WebSocket.
- **Storage**: Postgres (models, runs, artifacts) + S3-compatible object storage (exports, reports).

## Data Model (OTM-centric)
- `OTM` (truth): components, dataflows, trustZones, threats, mitigations, risks, extensions.
- `extensions.x-threatflow.layout`: XYFlow nodes/edges positions and UI-specific hints.
- Import/Export:
  - Threat Dragon JSON ↔ OTM via `adapters.threat_dragon`。
  - Threagile YAML ↔ OTM via `adapters.threagile`。

## Canvas (XYFlow) MVP
- Nodes: Process/Actor/Store、AI Node、Python Node、Boundary (group/zone)。
- Edges: default + optional orthogonal via custom edge; snapping/grid; alignment helper lines。
- Interactions: drag, select, multi-select drag, connect, delete, edit properties。
- Property Panel: right-side form by node type（React JSONSchema Form 或自定义表单）。
- Threats Panel: element threats list + add/edit；后续接入规则引擎自动建议。

## Execution Model (Python)
- Node Types:
  - **AI Node**: calls model providers (OpenAI/Ollama/Bedrock) via backend; supports streaming tokens。
  - **Python Node**: executes a Python snippet/package entrypoint with input/output contract。
- Runtime Flow:
  1) Frontend 触发“Run Selection/Run Flow”。
  2) Backend 创建执行作业（队列），串行/并行按拓扑排序执行节点。
  3) 每节点：准备隔离环境（容器镜像/虚拟环境）、拉起执行器、捕获 stdout/stderr、状态与产物上报。
  4) 前端订阅 SSE/WebSocket，实时显示运行状态/日志/可视化高亮。
- 安全：资源限额（CPU/Mem/Timeout）、网络策略、只读依赖白名单、沙箱目录。

## APIs (Sketch)
- `POST /models/import/threat-dragon` → body: TD JSON → returns OTM。
- `POST /models/import/threagile` → body: YAML → returns OTM。
- `POST /models/export/threat-dragon` → body: OTM → returns TD JSON。
- `POST /models/export/threagile` → body: OTM → returns YAML。
- `POST /flows/execute` → body: { otm, selection?, params } → returns { runId }。
- `GET /flows/runs/{runId}/events` → SSE for logs/progress。
- `GET /flows/runs/{runId}` → status + outputs。

## Minimal Node Contracts
```ts
// Frontend
type Port = { id: string; name: string; schema?: any };
interface NodeSpec {
  id: string;
  type: string; // 'process' | 'actor' | 'store' | 'ai' | 'python'
  label: string;
  inputs: Port[];
  outputs: Port[];
  config: Record<string, any>;
}

// Backend execution
interface ExecutionRequest {
  nodeId: string;
  type: string;
  inputs: Record<string, any>;
  config: Record<string, any>;
}
interface ExecutionResult {
  nodeId: string;
  ok: boolean;
  outputs?: Record<string, any>;
  error?: { message: string; trace?: string };
  logs?: string[];
}
```

## Threats & Rule Engine (Phase 2)
- 规则输入：OTM + 节点/流上下文；输出：建议威胁与缓解。
- 运行时：在画布中选中元素 → 触发规则 → 合并到 threats 列表（用户可接受/忽略）。

## Security & Governance
- RBAC：项目/模型级权限；审计日志（导入/导出/执行）。
- 供应链：固定 Python 依赖镜像；对外调用（AI provider）使用密钥保管服务。

## MVP Milestones
1) 画布与 OTM：XYFlow 画布 + OTM 载入/保存 + 布局扩展字段。
2) 适配器：TD/Threagile 导入/导出最小闭环。
3) 节点库：AI、Python 基础节点 + 运行日志显示。
4) 执行器：FastAPI + 队列 + 容器化沙箱执行（stdout/事件流）。
5) Threats 面板：手工添加/编辑，存入 OTM。

## Non-Goals (MVP)
- 高级路由与自动布局（先用 dagre/elkjs 基础版）。
- 复杂报告与风险矩阵（后续版本）。

## Notes
- 若后续需要更强“建模器内置能力”，评估引入 JointJS/Rappid 于独立模式或混合架构（OTM 仍为真源）。