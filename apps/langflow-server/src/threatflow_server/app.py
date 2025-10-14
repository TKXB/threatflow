from __future__ import annotations

from typing import Any, Dict, List

from fastapi import FastAPI
from fastapi.responses import PlainTextResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pathlib import Path
import json

from .executors import exec_dataflow_editor, exec_trustzone_manager
from .components import registry


class OtmOpRequest(BaseModel):
    otm: Dict[str, Any]
    op: Dict[str, Any]


app = FastAPI(title="Threatflow Langflow Server")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve UI extensions static files (manifest and bundle)
try:
    dist_dir = Path(__file__).resolve().parents[4] / "apps" / "langflow-ui-extensions" / "dist"
    if dist_dir.exists():
        app.mount("/ui-extensions", StaticFiles(directory=str(dist_dir)), name="ui-extensions")
except Exception:
    # Optional: ignore errors when path is not available in certain environments
    pass


@app.post("/otm/dataflow")
def api_dataflow(req: OtmOpRequest) -> Dict[str, Any]:
    return exec_dataflow_editor(req.otm, req.op)


@app.post("/otm/trustzone")
def api_trustzone(req: OtmOpRequest) -> Dict[str, Any]:
    return exec_trustzone_manager(req.otm, req.op)


@app.get("/components")
def api_list_components() -> Dict[str, Any]:
    return {"components": registry.list_components()}


class ExecRequest(BaseModel):
    otm: Dict[str, Any]
    op: Dict[str, Any]


@app.post("/components/{comp_id}/execute")
def api_execute_component(comp_id: str, req: ExecRequest):
    result = registry.execute(comp_id, req.otm, req.op)
    if isinstance(result, str):
        return PlainTextResponse(result)
    return result


# ----- TM Palette plugins endpoint -----

def _read_tm_plugins_dir() -> Dict[str, Any]:
    """Read JSON palette fragments from plugins/tm/*.json and merge sections (minimal schema)."""
    try:
        repo_root = Path(__file__).resolve().parents[5]
    except Exception:
        repo_root = Path.cwd()

    # Prefer repository root plugins/tm; also support apps/plugins/tm as fallback
    primary_dir = repo_root / "plugins" / "tm"
    fallback_dir = repo_root / "apps" / "plugins" / "tm"
    search_dirs: List[Path] = []
    if primary_dir.exists() and primary_dir.is_dir():
        search_dirs.append(primary_dir)
    if fallback_dir.exists() and fallback_dir.is_dir():
        search_dirs.append(fallback_dir)

    sections: List[Dict[str, Any]] = []

    def section_index_by_title(title: str) -> int:
        for i, s in enumerate(sections):
            if str(s.get("title")) == title:
                return i
        return -1

    for base in search_dirs:
        for p in sorted(base.glob("*.json")):
            try:
                text = p.read_text(encoding="utf-8")
                data = json.loads(text)
                if not isinstance(data, dict):
                    continue
                src_sections = data.get("sections")
                if not isinstance(src_sections, list):
                    continue
                for s in src_sections:
                    title = str((s or {}).get("title") or "")
                    items = (s or {}).get("items") or []
                    if not title or not isinstance(items, list):
                        continue
                    idx = section_index_by_title(title)
                    if idx == -1:
                        sections.append({"title": title, "items": []})
                        idx = len(sections) - 1
                    seen = set(
                        f"{str(x.get('type'))}|{str(x.get('technology') or '')}|{str(x.get('label') or '')}"
                        for x in sections[idx]["items"]
                    )
                    for it in items:
                        if not isinstance(it, dict):
                            continue
                        t = str(it.get("type") or "")
                        l = str(it.get("label") or "")
                        if not t or not l:
                            continue
                        key = f"{t}|{str(it.get('technology') or '')}|{l}"
                        if key in seen:
                            continue
                        sections[idx]["items"].append({
                            "label": l,
                            "type": t,
                            **({"technology": str(it.get("technology"))} if it.get("technology") else {}),
                        })
                        seen.add(key)
            except Exception:
                # ignore bad plugin files
                continue

    return {"sections": sections}


@app.get("/api/tm/palette/plugins")
def api_tm_palette_plugins() -> JSONResponse:
    data = _read_tm_plugins_dir()
    return JSONResponse(content=data)

