## Setup & Bootstrap
- [ ] 初始化 mono-repo 结构与基础工具
- [ ] 编写 Docker Compose 与本地运行脚本
- [ ] Vendor 上游 OTM/TD/Threagile schemas 并锁版本
- [ ] 配置 CI：lint/test/contract/e2e 与缓存
- [ ] 启用 Renovate/Dependabot 自动开 PR

## Core Domain Packages
- [ ] 开发 otm-model 包：类型校验与 extensions
- [ ] 开发 adapters：OTM↔Threat Dragon JSON
- [ ] 开发 adapters：OTM↔Threagile YAML
- [ ] 开发 rule-engine 与内置规则库
- [ ] 开发 reporting 模板与 PDF 导出

## Backend Apps
- [ ] 开发 langflow-server 基础 API 与组件注册
- [ ] 实现 ThreatDragonImport/Export 组件
- [ ] 实现 ThreagileImport/Export 组件
- [ ] 实现 ThreagileAnalyze 组件与报告下载
- [ ] 开发 orchestrator 作业路由与重试
- [ ] 封装 threagile-service 为 REST

## Frontend (Langflow UI 扩展)
- [ ] 开发 UI 节点库与属性面板
- [ ] 写入布局至 extensions.x-threatflow.layout

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

