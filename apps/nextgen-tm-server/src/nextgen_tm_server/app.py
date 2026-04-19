from __future__ import annotations

from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

from typing import Any, Dict, List
import os
import json
import re
import time
import uuid
import logging
from contextlib import asynccontextmanager

import httpx

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client
from .auth import get_current_user_id
from .llm.templates import (
    build_attack_methods_schema,
    default_methods_user_prompt,
    build_chat_completion_payload,
    build_tara_schema,
    default_tara_user_prompt,
    build_tm_risks_schema,
    default_tm_risks_user_prompt,
)
@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Nextgen TM Server", lifespan=lifespan)
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

# Paths that don't require authentication
_PUBLIC_PATHS = {"/", "/docs", "/openapi.json", "/redoc", "/health"}


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    """Require a valid Clerk JWT on all routes except public paths."""
    path = request.url.path
    if path in _PUBLIC_PATHS or request.method == "OPTIONS":
        return await call_next(request)
    try:
        await get_current_user_id(request)
    except HTTPException as exc:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    return await call_next(request)

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


class LlmConfig(BaseModel):
    baseUrl: str | None = None
    apiKey: str | None = None
    model: str | None = None


class LlmMethodsRequest(BaseModel):
    nodes: List[Node]
    edges: List[Edge]
    k: int = 10
    maxDepth: int = 20
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
    base = analysis_paths(AnalyzeRequest(nodes=req.nodes, edges=req.edges, k=req.k, maxDepth=req.maxDepth))
    paths = base["paths"]

    llm_base = (req.llm and req.llm.baseUrl) or _get_env("LLM_BASE_URL", "http://127.0.0.1:4000/v1")
    llm_key = (req.llm and req.llm.apiKey) or _get_env("LLM_API_KEY", "")
    model = (req.llm and req.llm.model) or _get_env("LLM_MODEL", "gpt-4o-mini")

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
        try:
            outbound_body = json.dumps(payload, ensure_ascii=False)
            max_len = int(os.getenv("LLM_REQ_LOG_MAX_BYTES", "20000") or "20000")
            if len(outbound_body) > max_len:
                outbound_body = outbound_body[:max_len] + f"... (truncated {len(outbound_body)-max_len} bytes)"
            logger.info("LLM upstream POST %s/chat/completions body=%s", llm_base, outbound_body)
        except Exception:
            logger.exception("Failed to log LLM upstream request body")
        r = httpx.post(f"{llm_base}/chat/completions", headers=headers, json=payload, timeout=60)
        r.raise_for_status()
        elapsed = time.perf_counter() - t0
        data = r.json()
        content = (data.get("choices") or [{}])[0].get("message", {}).get("content", "{}")
        parsed = _extract_json(content)
        methods = parsed.get("methods") or []
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


@app.post("/analysis/llm/tara")
def analysis_tara_llm(req: LlmMethodsRequest) -> dict[str, Any]:
    t0 = time.perf_counter()
    base = analysis_paths(AnalyzeRequest(nodes=req.nodes, edges=req.edges, k=req.k, maxDepth=req.maxDepth))
    paths = base["paths"]

    llm_base = (req.llm and req.llm.baseUrl) or _get_env("LLM_BASE_URL", "http://127.0.0.1:4000/v1")
    llm_key = (req.llm and req.llm.apiKey) or _get_env("LLM_API_KEY", "")
    model = (req.llm and req.llm.model) or _get_env("LLM_MODEL", "gpt-4o-mini")

    schema: dict[str, Any] = build_tara_schema()
    user_prompt = req.prompt or default_tara_user_prompt()

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
            "LLM TARA: start request | model=%s base=%s nodes=%d edges=%d paths=%d",
            model,
            llm_base,
            len(req.nodes),
            len(req.edges),
            len(paths),
        )
        try:
            outbound_body = json.dumps(payload, ensure_ascii=False)
            max_len = int(os.getenv("LLM_REQ_LOG_MAX_BYTES", "20000") or "20000")
            if len(outbound_body) > max_len:
                outbound_body = outbound_body[:max_len] + f"... (truncated {len(outbound_body)-max_len} bytes)"
            logger.info("LLM upstream POST %s/chat/completions body=%s", llm_base, outbound_body)
        except Exception:
            logger.exception("Failed to log LLM upstream request body")
        r = httpx.post(f"{llm_base}/chat/completions", headers=headers, json=payload, timeout=60)
        r.raise_for_status()
        try:
            inbound_body = r.text or ""
            max_len_resp = int(os.getenv("LLM_RESP_LOG_MAX_BYTES", "20000") or "20000")
            if len(inbound_body) > max_len_resp:
                inbound_body = inbound_body[:max_len_resp] + f"... (truncated {len(inbound_body)-max_len_resp} bytes)"
            logger.info(
                "LLM upstream RESP %s/chat/completions status=%d body=%s",
                llm_base,
                r.status_code,
                inbound_body,
            )
        except Exception:
            logger.exception("Failed to log LLM upstream response body")
        elapsed = time.perf_counter() - t0
        data = r.json()
        content = (data.get("choices") or [{}])[0].get("message", {}).get("content", "{}")
        parsed = _extract_json(content)
        rows = parsed.get("rows") or []
        result = {"ok": True, "rows": rows[: int(req.k)]}
        logger.info(
            "LLM TARA: success | model=%s elapsed_ms=%d rows=%d resp_bytes=%d",
            model,
            int(elapsed * 1000),
            len(result["rows"]),
            len(r.content or b""),
        )
        return result
    except httpx.HTTPError as ex:
        elapsed = time.perf_counter() - t0
        logger.exception("LLM TARA: http error | elapsed_ms=%d", int(elapsed * 1000))
        return {"ok": False, "error": str(ex), "rows": []}
    except Exception as ex:
        elapsed = time.perf_counter() - t0
        logger.exception("LLM TARA: failed | elapsed_ms=%d", int(elapsed * 1000))
        return {"ok": False, "error": str(ex), "rows": []}


@app.post("/analysis/tm/llm/risks")
def analysis_tm_risks_llm(req: LlmMethodsRequest) -> dict[str, Any]:
    t0 = time.perf_counter()
    base = analysis_paths(AnalyzeRequest(nodes=req.nodes, edges=req.edges, k=req.k, maxDepth=req.maxDepth))
    paths = base["paths"]

    llm_base = (req.llm and req.llm.baseUrl) or _get_env("LLM_BASE_URL", "http://127.0.0.1:4000/v1")
    llm_key = (req.llm and req.llm.apiKey) or _get_env("LLM_API_KEY", "")
    model = (req.llm and req.llm.model) or _get_env("LLM_MODEL", "gpt-4o-mini")

    schema: dict[str, Any] = build_tm_risks_schema()
    user_prompt = req.prompt or default_tm_risks_user_prompt()

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
            "LLM TM Risks: start request | model=%s base=%s nodes=%d edges=%d paths=%d",
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
        risks = parsed.get("risks") or []

        id_to_node = {n.id: n for n in req.nodes}
        for rk in risks:
            try:
                node_ids = list(rk.get("nodeIds") or [])
                total = 0.0
                for i in range(len(node_ids) - 1):
                    a = node_ids[i]
                    b = node_ids[i + 1]
                    edge = next((e for e in req.edges if e.source == a and e.target == b), None)
                    if not edge:
                        continue
                    I = _impact_for_node(id_to_node.get(b) or Node(id=b))
                    L = _likelihood_for_edge(edge)
                    total += I * L
                rk["score"] = total
            except Exception:
                rk["score"] = 0.0

            sev = str(rk.get("severity") or "").lower()
            sev_num = 1 if sev == "low" else 2 if sev == "medium" else 3 if sev == "high" else 4 if sev == "critical" else 0
            rk["severityNumeric"] = sev_num

        result = {"ok": True, "risks": risks[: int(req.k)]}
        logger.info(
            "LLM TM Risks: success | model=%s elapsed_ms=%d risks=%d",
            model,
            int(elapsed * 1000),
            len(result["risks"]),
        )
        return result
    except httpx.HTTPError as ex:
        elapsed = time.perf_counter() - t0
        logger.exception("LLM TM Risks: http error | elapsed_ms=%d", int(elapsed * 1000))
        return {"ok": False, "error": str(ex), "risks": []}
    except Exception as ex:
        elapsed = time.perf_counter() - t0
        logger.exception("LLM TM Risks: failed | elapsed_ms=%d", int(elapsed * 1000))
        return {"ok": False, "error": str(ex), "risks": []}

def _env(name: str, default: str | None = None) -> str | None:
    val = os.getenv(name)
    return val if (val is not None and str(val).strip() != "") else default


def _read_json_file(path: str) -> dict[str, Any] | None:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as ex:
        logger.warning("Failed to read plugin file: %s error=%s", path, ex)
        return None


def _collect_plugins_from_dir(root: str) -> dict[str, list[dict[str, Any]]]:
    result: dict[str, list[dict[str, Any]]] = {"entry": [], "assets": []}
    try:
        entry_dir = os.path.join(root, "entry-points")
        assets_dir = os.path.join(root, "assets")
        if os.path.isdir(entry_dir):
            for fn in sorted(os.listdir(entry_dir)):
                if not fn.lower().endswith(".json"):
                    continue
                data = _read_json_file(os.path.join(entry_dir, fn))
                if isinstance(data, dict):
                    result["entry"].append(data)
        if os.path.isdir(assets_dir):
            for fn in sorted(os.listdir(assets_dir)):
                if not fn.lower().endswith(".json"):
                    continue
                data = _read_json_file(os.path.join(assets_dir, fn))
                if isinstance(data, dict):
                    result["assets"].append(data)
    except Exception as ex:
        logger.warning("Collect plugins failed: root=%s error=%s", root, ex)
    return result


def _default_plugins_root() -> str:
    here = os.path.dirname(__file__)
    repo_root = os.path.abspath(os.path.join(here, "../../../.."))
    return os.path.join(repo_root, "samples", "plugins", "attackpath")


def _validate_item(raw: dict[str, Any]) -> dict[str, Any] | None:
    label = str(raw.get("label") or "").strip()
    typ = str(raw.get("type") or "").strip()
    if not label or not typ:
        return None
    out: dict[str, Any] = {
        "label": label,
        "type": typ,
    }
    if raw.get("icon") is not None:
        out["icon"] = raw.get("icon")
    if raw.get("technology") is not None:
        out["technology"] = raw.get("technology")
    if raw.get("flags") is not None:
        out["flags"] = raw.get("flags")
    if raw.get("priority") is not None:
        out["priority"] = raw.get("priority")
    if raw.get("domain") is not None:
        out["domain"] = raw.get("domain")
    if raw.get("beta") is not None:
        out["beta"] = raw.get("beta")
    if raw.get("legacy") is not None:
        out["legacy"] = raw.get("legacy")
    if raw.get("id") is not None:
        out["id"] = raw.get("id")
    return out


@app.get("/palette/plugins")
def get_palette_plugins() -> dict[str, Any]:
    roots: list[str] = []
    env_root = _env("TF_PLUGIN_DIR")
    if env_root:
        roots.append(env_root)
    default_root = _default_plugins_root()
    if os.path.isdir(default_root):
        roots.append(default_root)

    all_entry: list[dict[str, Any]] = []
    all_assets: list[dict[str, Any]] = []

    for r in roots:
        coll = _collect_plugins_from_dir(r)
        all_entry.extend([x for x in coll.get("entry", []) if isinstance(x, dict)])
        all_assets.extend([x for x in coll.get("assets", []) if isinstance(x, dict)])

    def prepare_section(title: str, items_raw: list[dict[str, Any]]):
        items: list[dict[str, Any]] = []
        for raw in items_raw:
            v = _validate_item(raw)
            if v:
                items.append(v)
        items.sort(key=lambda x: (int(x.get("priority", 1e9)), str(x.get("label", "").lower())))
        return {"title": title, "items": items}

    sections: list[dict[str, Any]] = []
    if all_entry:
        sections.append(prepare_section("Entry Point", all_entry))
    if all_assets:
        sections.append(prepare_section("Assets", all_assets))

    return {"ok": True, "sections": sections}


# ---------- Supabase-backed LLM Settings ----------

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")


def _get_supabase():
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


class LlmSettingsBody(BaseModel):
    baseUrl: str | None = None
    apiKey: str | None = None
    model: str | None = None


@app.get("/llm-settings")
async def get_llm_settings(request: Request):
    user_id = await get_current_user_id(request)
    sb = _get_supabase()
    try:
        result = sb.table("llm_settings").select("*").eq("user_id", user_id).execute()
    except Exception:
        result = None
    if not result or not result.data or len(result.data) == 0:
        return {
            "baseUrl": "http://127.0.0.1:4000/v1",
            "apiKey": "",
            "model": "gpt-4o-mini",
            "updatedAt": 0,
        }
    row = result.data[0]
    return {
        "baseUrl": row["base_url"],
        "apiKey": row["api_key"],
        "model": row["model"],
        "updatedAt": row["updated_at"],
    }


@app.put("/llm-settings")
async def put_llm_settings(request: Request, body: LlmSettingsBody):
    user_id = await get_current_user_id(request)
    now = int(time.time())
    sb = _get_supabase()
    sb.table("llm_settings").upsert({
        "user_id": user_id,
        "base_url": body.baseUrl or "http://127.0.0.1:4000/v1",
        "api_key": body.apiKey or "",
        "model": body.model or "gpt-4o-mini",
        "updated_at": now,
    }).execute()
    return {"ok": True, "updatedAt": now}


# ---------- Supabase-backed Diagram Persistence ----------

class DiagramBody(BaseModel):
    name: str = "Untitled"
    diagramType: str  # "attack_path" or "threat_model"
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    metadata: Dict[str, Any] = {}


@app.post("/diagrams")
async def create_diagram(request: Request, body: DiagramBody):
    user_id = await get_current_user_id(request)
    now = int(time.time())
    diagram_id = str(uuid.uuid4())
    sb = _get_supabase()
    sb.table("diagrams").insert({
        "id": diagram_id,
        "user_id": user_id,
        "name": body.name,
        "diagram_type": body.diagramType,
        "nodes": body.nodes,
        "edges": body.edges,
        "metadata": body.metadata,
        "created_at": now,
        "updated_at": now,
    }).execute()
    return {"ok": True, "id": diagram_id, "createdAt": now}


@app.get("/diagrams")
async def list_diagrams(request: Request, type: str | None = None):
    user_id = await get_current_user_id(request)
    sb = _get_supabase()
    q = sb.table("diagrams").select(
        "id, name, diagram_type, created_at, updated_at"
    ).eq("user_id", user_id)
    if type:
        q = q.eq("diagram_type", type)
    q = q.order("updated_at", desc=True).limit(100)
    result = q.execute()
    return {"ok": True, "diagrams": result.data or []}


@app.get("/diagrams/{diagram_id}")
async def get_diagram(request: Request, diagram_id: str):
    user_id = await get_current_user_id(request)
    sb = _get_supabase()
    result = sb.table("diagrams").select("*").eq("id", diagram_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Diagram not found")
    row = result.data[0]
    return {
        "ok": True,
        "id": row["id"],
        "name": row["name"],
        "diagramType": row["diagram_type"],
        "nodes": row["nodes"],
        "edges": row["edges"],
        "metadata": row["metadata"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


@app.put("/diagrams/{diagram_id}")
async def update_diagram(request: Request, diagram_id: str, body: DiagramBody):
    user_id = await get_current_user_id(request)
    now = int(time.time())
    sb = _get_supabase()
    existing = sb.table("diagrams").select("id").eq("id", diagram_id).eq("user_id", user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Diagram not found")
    sb.table("diagrams").update({
        "name": body.name,
        "nodes": body.nodes,
        "edges": body.edges,
        "metadata": body.metadata,
        "updated_at": now,
    }).eq("id", diagram_id).eq("user_id", user_id).execute()
    return {"ok": True, "updatedAt": now}


@app.delete("/diagrams/{diagram_id}")
async def delete_diagram(request: Request, diagram_id: str):
    user_id = await get_current_user_id(request)
    sb = _get_supabase()
    existing = sb.table("diagrams").select("id").eq("id", diagram_id).eq("user_id", user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Diagram not found")
    sb.table("diagrams").delete().eq("id", diagram_id).eq("user_id", user_id).execute()
    return {"ok": True}

