from __future__ import annotations

from typing import Any, Dict

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .executors import exec_dataflow_editor, exec_trustzone_manager


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

