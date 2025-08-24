from __future__ import annotations

from typing import Any, Dict

from otm_model.types import OTM, Component, Dataflow, TrustZone


def exec_dataflow_editor(otm_dict: Dict[str, Any], op: Dict[str, Any]) -> Dict[str, Any]:
    otm = OTM.model_validate(otm_dict)
    action = op.get("action")
    if action == "add":
        df = Dataflow(**op["dataflow"])  # id, source, destination, protocol?
        otm.dataflows.append(df)
    elif action == "remove":
        otm.dataflows = [d for d in otm.dataflows if d.id != op.get("id")]
    return otm.model_dump()


def exec_trustzone_manager(otm_dict: Dict[str, Any], op: Dict[str, Any]) -> Dict[str, Any]:
    otm = OTM.model_validate(otm_dict)
    action = op.get("action")
    if action == "add":
        tz = TrustZone(**op["trustZone"])  # id, name
        otm.trustZones.append(tz)
    elif action == "assign":
        target = op.get("componentId")
        tz_id = op.get("trustZoneId")
        for c in otm.components:
            if c.id == target:
                c.trustZone = tz_id
                break
    return otm.model_dump()


def _ensure_extensions(otm: OTM) -> Dict[str, Any]:
    ex = otm.extensions or {}
    if not isinstance(ex, dict):
        ex = {}
    xns = ex.get("x-threatflow")
    if not isinstance(xns, dict):
        xns = {}
        ex["x-threatflow"] = xns
    otm.extensions = ex
    return xns


def exec_layout_writer(otm_dict: Dict[str, Any], op: Dict[str, Any]) -> Dict[str, Any]:
    otm = OTM.model_validate(otm_dict)
    xns = _ensure_extensions(otm)
    action = op.get("action", "set")
    layout = op.get("layout") or {}
    if action == "set":
        xns["layout"] = layout
    elif action == "merge":
        cur = xns.get("layout") or {}
        if not isinstance(cur, dict):
            cur = {}
        if isinstance(layout, dict):
            cur.update(layout)
        xns["layout"] = cur
    else:
        # no-op for unknown actions
        pass
    return otm.model_dump()

