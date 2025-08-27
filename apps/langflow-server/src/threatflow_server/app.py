from __future__ import annotations

from typing import Any, Dict

from fastapi import FastAPI
from fastapi.responses import PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from pathlib import Path

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

