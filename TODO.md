## ThreatFlow 攻击路径推导待办清单

### Phase 1（MVP）
- [ ] 定义图数据模型与序列化 schema（p1-schema）
- [x] 构建前端导出器（ReactFlow→后端 JSON）（p1-exporter） —（demo-frontend 已实现：导出 OTM/Threagile/报告）
- [ ] 实现后端图构建与预处理（p1-graph-build）
- [x] 实现入口与目标识别逻辑（p1-entry-target） —（前端启发式+显式标记）
- [x] 实现简单路径搜索与剪枝 Top‑K（p1-simple-paths） —（前端 DFS + Top‑K + 深度限制）
- [x] 设计基础风险评分 R=I×L 与参数（p1-scoring） —（前端评分与排序）
- [ ] 集成轻量 ATT&CK 与 CVSS 映射（p1-knowledge）
- [ ] 提供分析 API（参数与响应）（p1-api）
- [ ] 前端接入 API 并高亮路径（p1-frontend） —（demo-frontend：本地分析与高亮已实现；API 待接入）
- [x] 导出最小报告（对齐 OTM/Threagile）（p1-report） —（前端 JSON 报告）

### Phase 2（AND/OR）
- [ ] 扩展 AND/OR 语义与前置条件（p2-andor）
- [ ] 实现 AO*/CSP 搜索组件（p2-ao）
- [ ] 引入攻击者画像与资源约束（p2-actor-profile）
- [ ] 增强剪枝与结果缓存（p2-pruning）

### Phase 3（情报联动与可解释）
- [ ] 接入 pyattck 同步 ATT&CK 元数据（p3-attck）
- [ ] 接入 NVD 获取 CVE 与 CVSS（p3-nvd）
- [ ] 引入控制措施库与效果系数（p3-controls）
- [ ] 生成可解释报告与修复优先级（p3-report）
- [ ] 增强 UI：路径比较与假设分析（p3-ui）

### 质量与运维
- [ ] 编写算法与 API 测试（qa-tests）
- [ ] 增加监控与审计日志（qa-observ）
- [ ] 完成文档与示例模型（qa-docs）

### AttackPath 可插拔 Palette（对齐 Langflow 的数据驱动模式）
- [ ] 目标：将 Entry Point / Assets / Logic 变为运行时可配置，无需改代码（ui-pluggable-goal）
- [ ] 定义 Palette 配置模型与基本校验（sections/items/label/icon/type/technology/flags/priority 等）（ui-pluggable-schema）
- [ ] 新增默认配置文件 `apps/nextgen-tm-frontend/public/palette.json`（ui-pluggable-default-config）
- [ ] 加载优先级与回退：LocalStorage(`tf_palette_json`) > 远端(可选) > 默认文件；解析失败回退默认并提示（ui-pluggable-loading-chain）
- [ ] 侧边栏改为数据驱动渲染：按 section 分组，支持 priority 排序；移除硬编码条目（ui-pluggable-sidebar-dynamic）
- [ ] 拖拽协议兼容：设置 `application/tm-node`、`application/tm-node-tech`、`application/tm-node-label`、`application/tm-node-flags`，与现有 `onDrop` 无缝对接（ui-pluggable-dnd-protocol）
- [ ] 增加 UI 控件：Import JSON（导入并持久化）、Reload（重载当前数据源）、Reset Default（清除本地覆写）（ui-pluggable-controls）
- [ ] Schema 校验与错误提示：无效 JSON/缺字段时提示并回退默认；控制台记录细节（ui-pluggable-validation）
- [ ] 可选：远端注册表（优先级次于本地覆写）— 环境变量 `VITE_NEXTGEN_PALETTE_URL` 或后端 `GET /api/palette`（ui-pluggable-remote）
- [ ] 可选：项徽标支持（beta/legacy/disabled），与排序/过滤集成（ui-pluggable-badges-filters）
- [ ] 可选：侧边栏搜索/过滤（后续与现有搜索体验对齐）（ui-pluggable-search）
- [ ] QA：验证与旧行为兼容（onDrop/尺寸映射/刷新/清理）；空配置/错误配置回退；多浏览器本地存储一致性（ui-pluggable-qa）
- [ ] 文档：示例 `palette.json`、扩展说明（开发者/用户）、覆盖与回滚指引（ui-pluggable-docs）

#### 方案增强：每个 Entry/Asset 独立文件（按文件插件化，无需改代码）
- [ ] 定义单文件插件 schema：`id`、`label`、`icon`、`type(entryPoint|store|process|trustBoundary|actor)`、`technology`、`flags`、`priority`、`version`、`compat`、`meta`（ui-plugin-schema-single-file）
- [ ] 约定后端目录结构（可持久化挂载/容器卷）：
  - `/data/plugins/attackpath/entry-points/*.json`
  - `/data/plugins/attackpath/assets/*.json`
  - 可选：`/data/plugins/attackpath/icons/*`（图标静态文件）（ui-plugin-dir-structure）
- [ ] 后端聚合接口（Python 服务，apps/nextgen-tm-server）：
  - `GET /api/palette/plugins`：读取上述目录聚合为统一列表（含 section=Entry/Assets），校验 schema，按 `priority` 排序，缓存并支持 `?nocache`（ui-plugin-api-index）
  - `POST /api/palette/plugins/upload?kind=entry-point|asset`：上传单文件 JSON（可选），保存到对应目录；返回校验结果与归档路径（ui-plugin-api-upload）
  - 可选：`DELETE /api/palette/plugins/{kind}/{id}` 删除插件文件；`GET /api/palette/plugins/{kind}/{id}` 拉取单项（ui-plugin-api-crud-optional）
- [ ] 前端加载顺序更新：LocalStorage 覆写 > `GET /api/palette/plugins` > 默认 `public/palette.json`（ui-plugin-loading-order）
- [ ] 侧边栏渲染使用插件列表（section=Entry/Assets/Logic），保留 priority 排序与徽标支持（ui-plugin-sidebar-render）
- [ ] 前端新增“导入插件文件”按钮：支持直接上传单个 JSON 到后端（或仅在浏览器侧暂存为 LocalStorage 覆写，二选一/可选双轨）（ui-plugin-import-ui）
- [ ] 安全与校验：JSON Schema 校验、字段白名单、icon 文件路径校验、最大体积限制、拒绝可执行内容（ui-plugin-security-validate）
- [ ] 缓存与热更新：服务端 ETag/Last-Modified；前端 `Reload` 强制刷新；（可选）后端监控目录变更自动清理缓存（ui-plugin-cache-reload）
- [ ] 文档与示例：提供 `entry-points/uart.json`、`assets/linux.json` 最小示例与上传流程（ui-plugin-docs-examples）

说明：按文件插件化允许“新增一个入口/资产 = 新增一个 JSON 文件”，无需改动代码或重构打包；适用于容器化部署（挂载卷）与有后端的运行时环境。无后端场景可退化为放置于 `public/plugins/` 并通过预生成 `index.json` 的方式（需构建或预生成索引）。

验收标准（Acceptance）
- [ ] 无需修改 `AttackPathApp.tsx` 业务逻辑即可通过“新增独立 JSON 文件”新增 Entry/Asset/Logic 项目
- [ ] 切换/重置配置后，侧边栏与拖拽创建节点正常工作
- [ ] 非法 JSON 会提示并回退默认；浏览器刷新后仍保留用户导入配置
- [ ] 支持后端目录下的按文件插件化聚合；（可选）若配置了远端 URL，在未导入本地 JSON 时自动使用远端注册表

