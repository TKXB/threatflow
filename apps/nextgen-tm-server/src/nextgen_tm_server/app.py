from __future__ import annotations

from typing import Any, Dict, List
import os
import json
import re
import time
import logging

import httpx

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .llm.templates import (
    build_attack_methods_schema,
    default_methods_user_prompt,
    build_chat_completion_payload,
)


app = FastAPI(title="Nextgen TM Server")
logger = logging.getLogger("nextgen_tm_server")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Node(BaseModel):
    id: str
    type: str | None = None
    data: Dict[str, Any] | None = None


class Edge(BaseModel):
    id: str
    source: str
    target: str
    data: Dict[str, Any] | None = None


class AnalyzeRequest(BaseModel):
    nodes: List[Node]
    edges: List[Edge]
    k: int = 10
    maxDepth: int = 20
    sources: List[str] | None = None
    targets: List[str] | None = None


def _get_label(node: Node) -> str:
    label = (node.data or {}).get("label")
    if isinstance(label, str) and label.strip():
        return label
    return node.type or node.id


def _infer_sources(nodes: List[Node]) -> List[str]:
    flagged = [n.id for n in nodes if (n.data or {}).get("isEntry") in (True, "yes")]
    if flagged:
        return flagged
    return [n.id for n in nodes if n.type == "actor"]


def _infer_targets(nodes: List[Node]) -> List[str]:
    flagged = [n.id for n in nodes if (n.data or {}).get("isTarget") in (True, "yes")]
    if flagged:
        return flagged
    ids: List[str] = []
    for n in nodes:
        tech = str((n.data or {}).get("technology") or "").lower()
        label = str((n.data or {}).get("label") or "").lower()
        if n.type == "store" and (tech == "target" or "target" in label or "goal" in label):
            ids.append(n.id)
    if ids:
        return ids
    return [n.id for n in nodes if n.type == "store"]


def _build_adjacency(edges: List[Edge]) -> dict[str, list[str]]:
    adj: dict[str, list[str]] = {}
    for e in edges:
        if not e.source or not e.target:
            continue
        adj.setdefault(e.source, []).append(e.target)
    return adj


def _analyze_simple_paths(nodes: List[Node], edges: List[Edge], k: int, max_depth: int, sources: List[str] | None, targets: List[str] | None) -> list[dict[str, Any]]:
    id_to_node = {n.id: n for n in nodes}
    srcs = sources if sources else _infer_sources(nodes)
    tgts = set(targets if targets else _infer_targets(nodes))
    adj = _build_adjacency(edges)

    results: list[dict[str, Any]] = []

    def dfs(cur: str, path: list[str], visited: set[str]):
        if len(path) > max_depth:
            return
        if cur in tgts:
            labels = [_get_label(id_to_node[i]) for i in path]
            results.append({"nodeIds": path.copy(), "labels": labels})
            return
        for nb in adj.get(cur, []):
            if nb in visited:
                continue
            visited.add(nb)
            path.append(nb)
            dfs(nb, path, visited)
            path.pop()
            visited.remove(nb)
            if len(results) >= k:
                return

    for s in srcs:
        visited = {s}
        dfs(s, [s], visited)
        if len(results) >= k:
            break

    return results[:k]


def _impact_for_node(node: Node) -> int:
    raw = (node.data or {}).get("impact")
    try:
        val = int(str(raw))
        if 1 <= val <= 5:
            return val
    except Exception:
        pass
    if node.type == "store":
        return 3
    if node.type == "process":
        return 3
    if node.type == "actor":
        return 2
    return 2


def _likelihood_for_edge(edge: Edge) -> int:
    raw = (edge.data or {}).get("likelihood")
    try:
        val = int(str(raw))
        if 1 <= val <= 5:
            return val
    except Exception:
        pass
    proto = str((edge.data or {}).get("protocol") or "").lower()
    if (edge.data or {}).get("publicNetwork") == "yes":
        return 4
    if "http" in proto and "https" not in proto:
        return 4
    if "mqtt" in proto or "ws" in proto:
        return 3
    return 2


@app.post("/analysis/paths")
def analysis_paths(req: AnalyzeRequest) -> dict[str, Any]:
    k = max(1, int(req.k))
    max_depth = max(1, int(req.maxDepth))
    paths = _analyze_simple_paths(req.nodes, req.edges, k=k, max_depth=max_depth, sources=req.sources, targets=req.targets)
    # compute simple scores
    id_to_node = {n.id: n for n in req.nodes}
    def score(path: dict[str, Any]) -> float:
        total = 0.0
        for i in range(len(path["nodeIds"]) - 1):
            a = path["nodeIds"][i]
            b = path["nodeIds"][i + 1]
            edge = next((e for e in req.edges if e.source == a and e.target == b), None)
            if not edge:
                continue
            I = _impact_for_node(id_to_node.get(b) or Node(id=b))
            L = _likelihood_for_edge(edge)
            total += I * L
        return total
    scored = [dict(nodeIds=p["nodeIds"], labels=p["labels"], score=score(p)) for p in paths]
    scored.sort(key=lambda x: x["score"], reverse=True)
    return {"ok": True, "paths": scored[:k]}


class MethodsRequest(BaseModel):
    nodes: List[Node]
    edges: List[Edge]
    k: int = 10
    maxDepth: int = 20


@app.post("/analysis/methods")
def analysis_methods(req: MethodsRequest) -> dict[str, Any]:
    # 复用 paths 结果，然后用启发式规则生成建议
    base = analysis_paths(AnalyzeRequest(nodes=req.nodes, edges=req.edges, k=req.k, maxDepth=req.maxDepth))
    paths = base["paths"]

    def text_includes(val: object, kw: str) -> bool:
        return kw.lower() in str(val or "").lower()

    id_to_node = {n.id: n for n in req.nodes}
    methods: list[dict[str, Any]] = []
    for p in paths:
        first = id_to_node.get(p["nodeIds"][0])
        last = id_to_node.get(p["nodeIds"][-1])
        first_tech = str(((first and first.data) or {}).get("technology") or _get_label(first or Node(id=""))).lower()
        last_tech = str(((last and last.data) or {}).get("technology") or _get_label(last or Node(id=""))).lower()
        last_label = str(((last and last.data) or {}).get("label") or _get_label(last or Node(id=""))).lower()

        is_uart = "uart" in first_tech or text_includes((first and first.data or {}).get("label"), "uart")
        is_linux = "linux" in last_tech or "linux" in last_label
        is_spi = "spi" in last_tech or "spi" in last_label

        if is_uart and is_linux:
            methods.append({
                "id": "uart-linux-bruteforce",
                "title": "Crack UART console password",
                "description": "Attempt password brute-force or default credentials on the UART login to obtain shell access.",
                "severity": "high",
                "confidence": 0.7,
                "matchedPath": {"nodeIds": p["nodeIds"], "labels": p["labels"]},
            })
            methods.append({
                "id": "uart-bootloader-interrupt",
                "title": "Interrupt bootloader via UART and spawn root shell",
                "description": "Interrupt U-Boot/bootloader over UART, modify bootargs/init to obtain a privileged shell.",
                "severity": "high",
                "confidence": 0.6,
                "matchedPath": {"nodeIds": p["nodeIds"], "labels": p["labels"]},
            })

        if is_uart and is_spi:
            methods.append({
                "id": "uart-linux-spi-dump",
                "title": "Pivot from UART shell to dump SPI device",
                "description": "Use UART-obtained shell on Linux to access SPI device nodes and dump contents.",
                "severity": "high",
                "confidence": 0.65,
                "matchedPath": {"nodeIds": p["nodeIds"], "labels": p["labels"]},
            })

        if "http" in " ".join(p["labels"]).lower():
            methods.append({
                "id": "web-credential-stuffing",
                "title": "Credential stuffing via exposed HTTP endpoint",
                "description": "Leverage reused credentials against exposed HTTP services en route to the target.",
                "severity": "medium",
                "confidence": 0.4,
                "matchedPath": {"nodeIds": p["nodeIds"], "labels": p["labels"]},
            })

    # 简单去重：按 id+终点
    seen: set[str] = set()
    dedup: list[dict[str, Any]] = []
    for m in methods:
        key = f"{m['id']}::{m['matchedPath']['nodeIds'][-1] if m.get('matchedPath') else ''}"
        if key in seen:
            continue
        seen.add(key)
        dedup.append(m)

    return {"ok": True, "methods": dedup[: int(req.k)]}


# ===== LLM (LiteLLM/OpenAI 兼容代理) 集成 =====

class LlmConfig(BaseModel):
    baseUrl: str | None = None  # 例如 http://127.0.0.1:4000/v1
    apiKey: str | None = None
    model: str | None = None    # 例如 gpt-4o-mini


class LlmMethodsRequest(MethodsRequest):
    llm: LlmConfig | None = None
    prompt: str | None = None


def _get_env(name: str, default: str | None = None) -> str | None:
    val = os.getenv(name)
    return val if val is not None and str(val).strip() != "" else default


def _extract_json(text: str) -> dict[str, Any]:
    try:
        return json.loads(text)
    except Exception:
        pass
    # 尝试提取 JSON 片段
    m = re.search(r"\{[\s\S]*\}", text)
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            pass
    return {"methods": []}


@app.post("/analysis/llm/methods")
def analysis_methods_llm(req: LlmMethodsRequest) -> dict[str, Any]:
    t0 = time.perf_counter()
    # 先获取基准路径（可作为 LLM 的上下文）
    base = analysis_paths(AnalyzeRequest(nodes=req.nodes, edges=req.edges, k=req.k, maxDepth=req.maxDepth))
    paths = base["paths"]

    # 解析 LLM 配置（前端传入优先，其次环境变量）
    llm_base = (req.llm and req.llm.baseUrl) or _get_env("LLM_BASE_URL", "http://127.0.0.1:4000/v1")
    llm_key = (req.llm and req.llm.apiKey) or _get_env("LLM_API_KEY", "")
    model = (req.llm and req.llm.model) or _get_env("LLM_MODEL", "gpt-4o-mini")

    # 组织提示词与 JSON Schema（尽量获得结构化输出）
    schema: dict[str, Any] = build_attack_methods_schema()

    user_prompt = req.prompt or default_methods_user_prompt()

    payload: dict[str, Any] = build_chat_completion_payload(
        model=model,
        nodes=req.nodes,
        edges=req.edges,
        paths=paths,
        user_prompt=user_prompt,
        schema=schema,
        temperature=0.2,
    )

    headers = {"content-type": "application/json"}
    if llm_key:
        headers["authorization"] = f"Bearer {llm_key}"

    try:
        logger.info(
            "LLM methods: start request | model=%s base=%s nodes=%d edges=%d paths=%d",
            model,
            llm_base,
            len(req.nodes),
            len(req.edges),
            len(paths),
        )
        r = httpx.post(f"{llm_base}/chat/completions", headers=headers, json=payload, timeout=60)
        r.raise_for_status()
        elapsed = time.perf_counter() - t0
        data = r.json()
        content = (data.get("choices") or [{}])[0].get("message", {}).get("content", "{}")
        parsed = _extract_json(content)
        methods = parsed.get("methods") or []
        # 最多返回 k 条
        result = {"ok": True, "methods": methods[: int(req.k)]}
        logger.info(
            "LLM methods: success | model=%s elapsed_ms=%d methods=%d resp_bytes=%d",
            model,
            int(elapsed * 1000),
            len(result["methods"]),
            len(r.content or b""),
        )
        return result
    except httpx.HTTPError as ex:
        elapsed = time.perf_counter() - t0
        logger.exception("LLM methods: http error | elapsed_ms=%d", int(elapsed * 1000))
        return {"ok": False, "error": str(ex), "methods": []}
    except Exception as ex:
        elapsed = time.perf_counter() - t0
        logger.exception("LLM methods: failed | elapsed_ms=%d", int(elapsed * 1000))
        return {"ok": False, "error": str(ex), "methods": []}

