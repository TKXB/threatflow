from __future__ import annotations

from typing import Any, Callable, Dict, List

from .executors import exec_dataflow_editor, exec_trustzone_manager, exec_layout_writer


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

