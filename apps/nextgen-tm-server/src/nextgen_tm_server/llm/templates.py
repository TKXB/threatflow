from __future__ import annotations

from typing import Any, Iterable
import json
import re


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


def build_id_string_schema(prefix: str, digits: int = 3) -> dict[str, Any]:
    """构造限定为 <PREFIX><零填充数字> 形式的字符串 JSON Schema。

    例如：prefix="DS" 且 digits=3 时，匹配 "DS001"。
    """
    pattern = f"^{re.escape(prefix)}\\d{{{digits}}}$"
    return {"type": "string", "pattern": pattern}


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


def build_tara_schema() -> dict[str, Any]:
    """返回用于 TARA 表格（按截图字段）的 JSON Schema。

    字段对照：
    - damageScenarioNo: Damage Scenario No.
    - damageScenario: Damage Scenario
    - cybersecurityProperty: {C, I, A} 三属性是否受影响（布尔）
    - threatScenarioNo: Threat scenario No.
    - threatScenario: Threat scenario
    - impactCategory: Impact category（如 P: Privacy）
    - impactRating: Impact Rating（文本，如 Severe）
    - impact: Impact（文本）
    - attackPathNo: Attack path No.
    - entryPoint: Entry Point
    - logic: 逻辑（AND/OR）
    - attackPath: Attack path
    - unR155CsmsAnnex5PartA: UN-R155 CSMS Annex 5 PartA（条款与说明）
    - attackVectorBasedApproach: Attack vector-based approach
    - attackFeasibilityRating: Attack feasibility rating (refer to 15.7)
    - riskImpact: Risk Impact (refer to 15.5)
    - riskValue: Risk value（数值）
    - attackVectorParameters: Attack vector parameters (refer to 15.7)
    - riskImpactFinal: Risk Impact (refer to 15.5) 末列（如有重复展示）
    """
    return {
        "name": "TARATable",
        "schema": {
            "type": "object",
            "properties": {
                "rows": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "damageScenarioNo": build_id_string_schema("DS", 3),
                            "damageScenario": {"type": "string"},
                            "cybersecurityProperty": {
                                "type": "object",
                                "properties": {
                                    "C": {"type": "boolean"},
                                    "I": {"type": "boolean"},
                                    "A": {"type": "boolean"},
                                },
                                "required": ["C", "I", "A"],
                                "additionalProperties": False,
                            },
                            "threatScenarioNo": build_id_string_schema("TS", 3),
                            "threatScenario": {
                                "type": "string",
                                "pattern": r"^(?:Spoofing|Tampering|Repudiation|Information Disclosure|Denial of Service|Elevation of Privilege)\s:\s.+$",
                            },
                            "impactCategory": {
                                "type": "string",
                                "enum": [
                                    "Safety",
                                    "Financial",
                                    "Operational",
                                    "Privacy",
                                ],
                            },
                            "impactRating": {
                                "type": "string",
                                "enum": [
                                    "Severe",
                                    "Major",
                                    "Moderate",
                                    "Negligible",
                                ],
                            },
                            "impact": {"type": "string"},
                            "attackPathNo": build_id_string_schema("AP", 3),
                            "entryPoint": {"type": "string"},
                            "logic": {"type": "string", "enum": ["AND", "OR"]},
                            "attackPath": {"type": "string"},
                            "unR155CsmsAnnex5PartA": {"type": "string"},
                            "attackVectorBasedApproach": {"type": "string"},
                            "attackFeasibilityRating": {
                                "type": "string",
                                "enum": ["Low", "Medium", "High"],
                            },
                            "riskImpact": {"type": "string"},
                            "riskValue": {"type": "number"},
                            "attackVectorParameters": {"type": "string"},
                            "riskImpactFinal": {"type": "string"},
                        },
                        "required": [
                            "damageScenarioNo",
                            "damageScenario",
                            "cybersecurityProperty",
                            "threatScenarioNo",
                            "threatScenario",
                            "impactCategory",
                            "impactRating",
                            "impact",
                            "attackPathNo",
                            "entryPoint",
                            "logic",
                            "attackPath",
                            "attackFeasibilityRating",
                            "riskImpact",
                            "riskValue",
                        ],
                        "additionalProperties": True,
                    },
                }
            },
            "required": ["rows"],
            "additionalProperties": False,
        },
    }


def default_tara_user_prompt() -> str:
    """返回用于生成 TARA 表格行的默认用户提示词。"""
    return (
        "基于给定的系统威胁建模上下文，生成 TARA 表格 rows（JSON）。"
        "每一行需严格包含字段：damageScenarioNo、damageScenario、cybersecurityProperty{C,I,A}、"
        "threatScenarioNo、threatScenario、impactCategory、impactRating、impact、attackPathNo、"
        "entryPoint、logic、attackPath、unR155CsmsAnnex5PartA、attackVectorBasedApproach、"
        "attackFeasibilityRating、riskImpact、riskValue、attackVectorParameters、riskImpactFinal。"
        "编号格式约束：damageScenarioNo 必须为 DS 后接 3 位数字；threatScenarioNo 必须为 TS 后接 3 位数字；"
        "attackPathNo 必须为 AP 后接 3 位数字（例如 DS001、TS001、AP001）。"
        "其中 C/I/A 为布尔值；impactCategory 取 Safety/Financial/Operational/Privacy；"
        "impactRating 取 Severe/Major/Moderate/Negligible；"
        "logic 仅能为 AND/OR；feasibility 取 Low/Medium/High。"
        "\n\ndamageScenario 字段要求：围绕 Safety/Financial/Operational/Privacy 中的一个类别进行描述，"
        "其语义需与该行的 impactCategory 一致，但不要求以类别前缀或固定格式开头。"
        "\n\n关于 threatScenario 字段：使用 STRIDE 方法进行分析，且每条 threatScenario 仅允许一个类型（S/T/R/I/D/E 之一）。"
        "格式：'<单一 STRIDE 全称> : <简短威胁描述>'，全称取自："
        "Spoofing/Tampering/Repudiation/Information Disclosure/Denial of Service/Elevation of Privilege。"
        "如果同一 Damage Scenario 涉及多个 STRIDE 类型，须拆分为多条 Threat Scenario（分别给出不同的 threatScenarioNo 与 threatScenario），"
        "其余该 Damage Scenario 的字段保持一致。"
        "示例：'Information Disclosure : 通过未授权 API 读取敏感数据'。"
        "分组规则：将以下字段视为一个分组键（同一组的行这些字段必须完全一致）："
        "[damageScenarioNo, damageScenario, C, I, A, threatScenarioNo, threatScenario, impactCategory, impactRating, impact, attackPathNo, entryPoint]。"
        "在同一分组内可以有多条 attackPath（多行），用于描述同一个攻击路径的多个步骤/环节；"
        "同一分组内所有行应共享相同的 attackPathNo 和 entryPoint，以便表格可进行单元格合并（rowspan）。"
        "同一分组内的多条 attackPath 的逻辑关系用 logic 字段表示（如都必须满足则为 AND，二选一则为 OR）。"
        "例如：某组（Entry Point: 'Cellular interface'）可包含 4 条 attackPath，且 logic=AND，表示四步都需成立。"
        "\n\n严格的行粒度约束：每一行的 attackPath 必须只描述“一跳/一步”（两点之间的关系），"
        "严禁在同一行中串联多个跳步。例如不要输出 ‘OBD -> Gateway -> Database’；"
        "必须拆分为两行：第一行 ‘OBD -> Gateway’，第二行 ‘Gateway -> Database’。"
        "若为文本描述，也需保持单步粒度（只描述一个因果/传递动作），多步请拆成多行并保持同组键一致，"
        "并用 logic=AND/OR 说明这些行之间的关系。"
        "只输出 JSON，不要多余解释。"
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

