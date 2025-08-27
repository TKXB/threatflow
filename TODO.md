## Setup & Bootstrap
- [x] 初始化 mono-repo 结构与基础工具
- [ ] （已暂缓）编写 Docker Compose 与本地运行脚本
- [ ] Vendor 上游 OTM/TD/Threagile schemas 并锁版本
  - [x] Vendor OTM/TD/Threagile schema 快照
  - [x] schema-index.json 与校验脚本 scripts/update_schemas.py
  - [x] tests/vendor：基本存在性与可解析测试
- [x] 配置 CI：lint/test/contract/e2e 与缓存
- [x] 启用 Renovate/Dependabot 自动开 PR

## Core Domain Packages
- [ ] 开发 otm-model 包：类型校验与 extensions
  - [x] Pydantic 类型定义（最小集合）
  - [x] 基于 JSONSchema 的校验函数
  - [x] 单元测试：最小 OTM 文档通过校验
- [x] 开发 adapters：OTM↔Threat Dragon JSON
- [x] 开发 adapters：OTM↔Threagile YAML
- [x] 开发 rule-engine 与内置规则库
- [ ] 开发 reporting 模板与 PDF 导出

## Backend Apps
- [ ] 开发 langflow-server 基础 API 与组件注册
  - [ ] 注册后端执行器：OTMValidate、RuleEngineEvaluate、MergeFindings、ThreagileAnalyze
  - [x] 最小版执行器：DataflowEditor（流程）、TrustZoneManager（边界）
- [x] 实现 ThreatDragonImport/Export 组件（基础实现）
- [x] 实现 ThreagileImport/Export 组件（基础实现）
- [ ] 实现 ThreagileAnalyze 组件与报告下载（分析已实现，报告下载待做）
- [ ] 开发 orchestrator 作业路由与重试
- [ ] 封装 threagile-service 为 REST

## Frontend (Langflow UI 扩展)
- [ ] 开发 UI 节点库与属性面板
- [ ] 新增威胁建模节点：ThreatDragonImport、ThreagileImport、OTMValidate、RuleEngineEvaluate、MergeFindings、RiskHeatmap
  - [x] 最小版节点：DataflowEditor（流程）、TrustZoneManager（边界）
- [x] 写入布局至 extensions.x-threatflow.layout
  - [ ] 完成 Langflow 节点注册与加载（DataflowEditor/TrustZoneManager）
    - [x] 定义节点元数据与表单（名称/分组/IO/配置）
    - [x] 导出节点清单与加载入口（manifest）
    - [x] 前端对接后端 /components 与 /execute 路由
    - [ ] 构建并加载扩展，使节点出现在画布

## Langflow 集成（Python 自定义组件）
- [ ] 实现 DataflowEditor 组件（调用 exec_dataflow_editor 或 /otm/dataflow）
- [ ] 实现 TrustZoneManager 组件（调用 exec_trustzone_manager 或 /otm/trustzone）
- [ ] 实现 LayoutWriter 组件（调用 exec_layout_writer 或 /components/LayoutWriter/execute）
- [ ] 实现 OTMValidate 组件（基于 otm_model.validate）
- [ ] 实现 RuleEngineEvaluate 组件（基于 rule-engine + 内置规则）
- [ ] 实现 ThreatDragonImport/Export 组件（基于 adapters）
- [ ] 实现 ThreagileImport/Export 组件（基于 adapters）
- [ ] 文档：在 Langflow 中加载自定义 Python 组件（上传/扫描路径/示例）

### 组件连线与端口定义（新增）
- [ ] 为 Threatflow 自定义组件补齐 Langflow 端口定义（inputs/outputs），使其可在画布连线传递 OTM/结果
  - 背景：仅有 field_config 只能渲染表单，无法生成可接线端口；需在类上显式声明 `inputs`/`outputs`
  - 规范：使用 `langflow.io` 的输入/输出类（如 `MultilineInput`/`DictInput`/`DataInput`、`Output`）
  - DataflowEditorComponent：
    - inputs：`baseUrl`（string）、`otm`（dict/Data）、`op`（dict/Data）
    - outputs：`otm_out` → 指向 `build` 返回（OTM dict）
  - TrustZoneManagerComponent：
    - inputs：`baseUrl`、`otm`、`op`
    - outputs：`otm_out`（OTM dict）
  - LayoutWriterComponent：
    - inputs：`baseUrl`、`otm`、`op`
    - outputs：`otm_out`（OTM dict，含 `extensions.x-threatflow.layout`）
  - OTMValidateComponent：
    - inputs：`baseUrl`、`otm`、`schema`（可选）
    - outputs：`result_out`（校验结果，形如 `{ "ok": true }`）
  - 注意：连线值应覆盖表单值；如使用 `MultilineInput` 传 JSON 字符串，需在 `build` 内解析为 dict
  - 同步更新：`scripts/publish_langflow_components.py` 注入的组件代码需包含上述 `inputs`/`outputs` 定义

## Analysis & Visualization
- [ ] 实现 RiskCalculator 与 RiskHeatmap

## Testing
- [ ] 编写契约测试 OTM↔TD 与 OTM↔Threagile
- [ ] 编写 E2E：导入→编辑→导出→分析→报告

## Security & Compliance
- [ ] 实现 OIDC 登录与 RBAC
- [ ] 实现审计日志与工件存储

## Observability & Deployment
- [ ] 接入可观测性：指标、日志、追踪
- [ ] 准备 K8s 清单与蓝绿发布

## Performance & Interop
- [ ] 完成 Threat Dragon 往返互操作回归
- [ ] 优化性能：OTM→YAML 缓存与并发限流

## AI 增强（可选）
- [ ] 引入 AI 分析器服务（可选）
- [ ] 建立评分标定与一致性校验

## Release
- [ ] 发布 MVP 与用户文档

