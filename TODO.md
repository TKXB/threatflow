## ThreatFlow 攻击路径推导待办清单

### Phase 1（MVP）
- [ ] 定义图数据模型与序列化 schema（p1-schema）
- [ ] 构建前端导出器（ReactFlow→后端 JSON）（p1-exporter）
- [ ] 实现后端图构建与预处理（p1-graph-build）
- [ ] 实现入口与目标识别逻辑（p1-entry-target）
- [ ] 实现简单路径搜索与剪枝 Top‑K（p1-simple-paths）
- [ ] 设计基础风险评分 R=I×L 与参数（p1-scoring）
- [ ] 集成轻量 ATT&CK 与 CVSS 映射（p1-knowledge）
- [ ] 提供分析 API（参数与响应）（p1-api）
- [ ] 前端接入 API 并高亮路径（p1-frontend）
- [ ] 导出最小报告（对齐 OTM/Threagile）（p1-report）

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

