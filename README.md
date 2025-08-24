# Threatflow

基于 Langflow 的拖拽式威胁建模与分析平台。

- 统一格式：OTM（Open Threat Model）作为唯一真源
- 互操作：Threat Dragon JSON、Threagile YAML 通过适配器双向转换
- 分析：支持 Threagile（容器/CLI），可扩展 AI/规则引擎

目录概览与开发指南详见 `docs/`。


## 在 Langflow 中使用 Threatflow 自定义组件

本仓库已提供自动注入的自定义 Python 组件（无需手动粘贴代码）：

- Threatflow: Dataflow Editor
- Threatflow: Trust Zone Manager
- Threatflow: Layout Writer

### 一次性准备

1) 安装并启动 Threatflow 后端（可选，仅当通过 HTTP 调用 Threatflow API 时）

```bash
PYTHONPATH=$(pwd)/apps/langflow-server/src \
uvicorn threatflow_server.app:app --reload --port 8889
```

2) 安装 Langflow 依赖并启动（使用本仓库改过的源码）

```bash
cd langflow
uv sync --dev --active   # 或 pip install -e . （较慢）

# 启动并挂载前端静态资源（推荐）
PYTHONPATH=$(pwd)/src/backend/base \
uvicorn 'langflow.main:setup_app' --factory --reload --port 7860
```

> 若仅需 API 可用：`uvicorn langflow.main:create_app`，但前端根路径将返回 404。

3) （可选）持久化自定义组件扫描目录

```bash
export LANGFLOW_COMPONENTS_PATH=$(pwd)/src/backend/base/custom/user_components
```

### 自动注入 Threatflow 组件

在项目根目录执行：

```bash
LANGFLOW_URL=http://127.0.0.1:7860 \
python scripts/publish_langflow_components.py
```

看到类似输出即成功（包含 `custom/user_components` 路径）：

```json
{
  "ok": true,
  "path": "/.../custom/user_components/custom_components/dataflow_editor_component.py",
  "components_path": [
    "/.../langflow/components",
    "/.../custom/user_components"
  ]
}
```

### 在 Langflow UI 中使用

1) 打开 `http://127.0.0.1:7860/`，在组件面板搜索 `Threatflow`
2) 拖入以下节点：
   - Threatflow: Dataflow Editor（新增/删除数据流）
   - Threatflow: Trust Zone Manager（新增/分配信任域）
   - Threatflow: Layout Writer（写入 `extensions.x-threatflow.layout`）
3) 在节点表单中设置 `baseUrl`：`http://127.0.0.1:8889`（若通过 Threatflow 后端 HTTP 调用）

> 如不希望依赖 8889，可改为“直调本地函数”的组件实现（请联系维护者）。

### 常见问题

- 组件注入后页面未显示：
  - 确认 `curl -s http://127.0.0.1:7860/api/custom-components` 返回的 `components_path` 含 `custom/user_components`
  - 刷新浏览器；必要时重启 7860
  - 重新执行注入脚本

- 启动时报缺包（如 `orjson`、`opentelemetry-*`）：
  - 推荐：`uv sync --dev` 一次性装齐
  - 或：`pip install -i https://pypi.org/simple orjson opentelemetry-instrumentation-fastapi opentelemetry-sdk`

