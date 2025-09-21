from __future__ import annotations

from typing import Any, Iterable
import json


def build_attack_methods_schema() -> dict[str, Any]:
    """返回用于 LLM 结构化输出的 JSON Schema。"""
    return {
        "name": "AttackMethods",
        "schema": {
            "type": "object",
            "properties": {
                "methods": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "id": {"type": "string"},
                            "title": {"type": "string"},
                            "description": {"type": "string"},
                            "severity": {
                                "type": "string",
                                "enum": ["low", "medium", "high", "critical"],
                            },
                            "confidence": {"type": "number"},
                            "matchedPath": {
                                "type": "object",
                                "properties": {
                                    "nodeIds": {"type": "array", "items": {"type": "string"}},
                                    "labels": {"type": "array", "items": {"type": "string"}},
                                },
                                "required": ["nodeIds"],
                                "additionalProperties": True,
                            },
                        },
                        "required": ["title", "description", "severity"],
                        "additionalProperties": True,
                    },
                }
            },
            "required": ["methods"],
            "additionalProperties": False,
        },
    }


def default_methods_user_prompt() -> str:
    """返回默认的用户提示词，用于生成攻击手法。"""
    return (
        "基于给定的威胁建模图（nodes/edges）以及候选的 Entry→Target 路径，"
        "并严格考虑每个资产节点的已选择配置：节点数据中提供 propertiesSelected 键（key→value），"
        "它代表用户选择或默认生效的配置值（不会包含可选项列表）。据此推导若干可行的攻击手法 methods（JSON）。"
        "对于每一条手法：1) 给出 title、description、severity；2) 若手法依赖某资产配置（如数据库版本、Web TLS/HSTS、鉴权方式等），"
        "在描述中明确引用 propertiesSelected 中的具体值；3) 指明其适配的路径 matchedPath（尽量使用已给出的 paths 中的一条）。"
        "只输出 JSON，不要解释文本。"
    )


def _dump_models_or_dicts(items: Iterable[Any]) -> list[dict[str, Any]]:
    """将 Pydantic BaseModel 列表或字典列表统一转为字典列表。"""
    result: list[dict[str, Any]] = []
    for it in items:
        if hasattr(it, "model_dump") and callable(getattr(it, "model_dump")):
            result.append(it.model_dump())
        elif isinstance(it, dict):
            result.append(it)
        else:
            # 兜底：尝试用 json 序列化/反序列化
            try:
                result.append(json.loads(json.dumps(it)))
            except Exception:
                result.append({})
    return result


def build_chat_completion_payload(
    *,
    model: str,
    nodes: Iterable[Any],
    edges: Iterable[Any],
    paths: list[dict[str, Any]],
    user_prompt: str,
    schema: dict[str, Any],
    temperature: float = 0.2,
) -> dict[str, Any]:
    """构造 OpenAI 兼容 /chat/completions 的请求 payload。"""
    # 仅发送用户选择/默认生效的配置值，避免发送所有选项
    normalized_nodes: list[dict[str, Any]] = []
    for n in _dump_models_or_dicts(nodes):
        base: dict[str, Any] = {}
        base["id"] = n.get("id")
        base["type"] = n.get("type")
        raw_data = dict(n.get("data") or {})

        # 过滤 data，仅保留非 list/dict 的简单键值对（如 label/technology/isTarget/impact 等）
        filtered_data: dict[str, Any] = {}
        for k, v in raw_data.items():
            if k == "properties":
                continue
            if isinstance(v, (list, dict)):
                continue
            filtered_data[k] = v

        # 将 properties 映射为已选择值（若 data 中存在对应 key 则用之，否则回退 default）
        selected: dict[str, Any] = {}
        props = raw_data.get("properties") or []
        if isinstance(props, list):
            for p in props:
                if not isinstance(p, dict):
                    continue
                k = p.get("key")
                if not k:
                    continue
                selected[k] = raw_data.get(k, p.get("default"))
        if selected:
            filtered_data["propertiesSelected"] = selected

        base["data"] = filtered_data
        normalized_nodes.append(base)

    nodes_json = json.dumps(normalized_nodes, ensure_ascii=False)
    edges_json = json.dumps(_dump_models_or_dicts(edges), ensure_ascii=False)
    paths_json = json.dumps(paths, ensure_ascii=False)

    messages = [
        {
            "role": "user",
            "content": (
                f"nodes: {nodes_json}\n"
                f"edges: {edges_json}\n"
                f"paths: {paths_json}\n\n"
                f"{user_prompt}"
            ),
        }
    ]

    return {
        "model": model,
        "messages": messages,
        "response_format": {"type": "json_schema", "json_schema": schema},
        "temperature": temperature,
    }

