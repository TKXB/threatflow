from __future__ import annotations

from typing import Any, Callable, Dict, List

from .executors import (
    exec_dataflow_editor,
    exec_trustzone_manager,
    exec_layout_writer,
    exec_otm_validate,
    exec_rule_engine_evaluate,
    exec_td_import,
    exec_td_export,
    exec_tg_import,
    exec_tg_export,
    exec_tg_analyze,
)


class ComponentRegistry:
    def __init__(self) -> None:
        self._components: Dict[str, Dict[str, Any]] = {}
        self._executors: Dict[str, Callable[[dict, dict], dict]] = {}

    def register(self, comp_id: str, meta: dict[str, Any], executor: Callable[[dict, dict], dict]) -> None:
        self._components[comp_id] = meta
        self._executors[comp_id] = executor

    def list_components(self) -> List[dict[str, Any]]:
        return [
            {"id": cid, **meta}
            for cid, meta in self._components.items()
        ]

    def execute(self, comp_id: str, otm: dict[str, Any], op: dict[str, Any]) -> dict[str, Any]:
        if comp_id not in self._executors:
            raise KeyError(f"Unknown component: {comp_id}")
        return self._executors[comp_id](otm, op)


registry = ComponentRegistry()

registry.register(
    "DataflowEditor",
    {"name": "Dataflow Editor", "category": "OTM", "inputs": ["otm"], "outputs": ["otm"]},
    exec_dataflow_editor,
)
registry.register(
    "TrustZoneManager",
    {"name": "Trust Zone Manager", "category": "OTM", "inputs": ["otm"], "outputs": ["otm"]},
    exec_trustzone_manager,
)
registry.register(
    "LayoutWriter",
    {"name": "Layout Writer", "category": "OTM", "inputs": ["otm"], "outputs": ["otm"]},
    exec_layout_writer,
)
registry.register(
    "OTMValidate",
    {"name": "OTM Validate", "category": "OTM", "inputs": ["otm"], "outputs": ["json"]},
    exec_otm_validate,
)
registry.register(
    "RuleEngineEvaluate",
    {"name": "Rule Engine Evaluate", "category": "Analysis", "inputs": ["otm"], "outputs": ["json"]},
    exec_rule_engine_evaluate,
)
registry.register(
    "ThreatDragonImport",
    {"name": "Threat Dragon Import", "category": "Interop", "inputs": ["json"], "outputs": ["otm"]},
    lambda _otm, op: exec_td_import(op),
)
registry.register(
    "ThreatDragonExport",
    {"name": "Threat Dragon Export", "category": "Interop", "inputs": ["otm"], "outputs": ["json"]},
    lambda otm, _op: exec_td_export(otm),
)
registry.register(
    "ThreagileImport",
    {"name": "Threagile Import", "category": "Interop", "inputs": ["json"], "outputs": ["otm"]},
    lambda _otm, op: exec_tg_import(op),
)
registry.register(
    "ThreagileExport",
    {"name": "Threagile Export", "category": "Interop", "inputs": ["otm"], "outputs": ["json"]},
    lambda otm, _op: exec_tg_export(otm),
)
registry.register(
    "ThreagileAnalyze",
    {"name": "Threagile Analyze", "category": "Analysis", "inputs": ["json"], "outputs": ["json"]},
    lambda _otm, op: exec_tg_analyze(op),
)

