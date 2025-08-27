from __future__ import annotations

from typing import Any, Dict

from otm_model.types import OTM, Component, Dataflow, TrustZone
from otm_model import validate as otm_validate
from adapters import td_to_otm, otm_to_td, threagile_to_otm, otm_to_threagile
from rule_engine import evaluate as re_evaluate
from rule_engine.loader import load_rules_from_yaml_dir
import yaml
from pathlib import Path


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


def exec_otm_validate(otm_dict: Dict[str, Any], op: Dict[str, Any] | None = None) -> Dict[str, Any]:
    schema_rel = op.get("schema") if op else None
    if schema_rel:
        schema_path = Path(schema_rel)
    else:
        schema_path = Path(__file__).resolve().parents[4] / "schemas" / "vendor" / "otm" / "1.0.0" / "otm.schema.json"
    otm_validate.validate_otm_document(otm_dict, schema_path)
    return {"ok": True}


def exec_rule_engine_evaluate(otm_dict: Dict[str, Any], op: Dict[str, Any] | None = None) -> Dict[str, Any]:
    rules_dir = Path(op.get("rules_dir")) if op and op.get("rules_dir") else Path(__file__).resolve().parents[4] / "packages" / "rule-engine" / "rules" / "builtin"
    rules = load_rules_from_yaml_dir(rules_dir)
    otm = OTM.model_validate(otm_dict)
    result = re_evaluate(otm, rules)
    return result.model_dump()


def exec_td_import(op: Dict[str, Any]) -> Dict[str, Any]:
    td = op.get("td")
    if isinstance(td, str):
        # try parse JSON
        import json
        td = json.loads(td)
    otm = td_to_otm(td)
    return otm.model_dump()


def exec_td_export(otm_dict: Dict[str, Any]) -> Dict[str, Any]:
    otm = OTM.model_validate(otm_dict)
    return otm_to_td(otm)


def exec_tg_import(op: Dict[str, Any]) -> Dict[str, Any]:
    tg = op.get("yaml") or op.get("tg")
    if isinstance(tg, str):
        tg = yaml.safe_load(tg)
    otm = threagile_to_otm(tg)
    return otm.model_dump()


def exec_tg_export(otm_dict: Dict[str, Any]) -> str:
    otm = OTM.model_validate(otm_dict)
    tg = otm_to_threagile(otm)
    return yaml.safe_dump(tg, sort_keys=False, allow_unicode=True)


def exec_tg_analyze(op: Dict[str, Any]) -> Dict[str, Any]:
    # Minimal placeholder: convert TG -> OTM and run rule engine builtin rules
    tg = op.get("yaml") or op.get("tg")
    if isinstance(tg, str):
        tg = yaml.safe_load(tg)
    otm = threagile_to_otm(tg)
    return exec_rule_engine_evaluate(otm.model_dump(), {"rules_dir": str(Path(__file__).resolve().parents[4] / "packages" / "rule-engine" / "rules" / "builtin")})

