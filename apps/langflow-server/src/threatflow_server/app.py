from __future__ import annotations

from typing import Any, Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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
def api_execute_component(comp_id: str, req: ExecRequest) -> Dict[str, Any]:
    return registry.execute(comp_id, req.otm, req.op)

