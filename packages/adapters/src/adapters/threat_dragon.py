from __future__ import annotations

from typing import Any, Dict

from otm_model.types import OTM, Component, Dataflow, TrustZone


def td_to_otm(td: Dict[str, Any]) -> OTM:
    """Very small subset converter TD(v2) -> OTM.

    Assumptions:
    - TD top-level has `version` and `summary.title`.
    - Nodes -> components; edges -> dataflows.
    """
    name = (td.get("summary") or {}).get("title") or "TD"
    components = []
    for node in (td.get("detail") or {}).get("diagrams", [{}])[0].get("diagramJson", {}).get("cells", []):
        if node.get("type") == "tm.Actor" or node.get("type") == "tm.Process" or node.get("type") == "tm.Store":
            comp_id = str(node.get("id"))
            comp_name = (node.get("attrs") or {}).get("text", {}).get("text") or comp_id
            components.append(Component(id=comp_id, name=comp_name, type=node.get("type", "component")))

    dataflows = []
    for edge in (td.get("detail") or {}).get("diagrams", [{}])[0].get("diagramJson", {}).get("cells", []):
        if edge.get("type") == "link":
            src = str((edge.get("source") or {}).get("id"))
            dst = str((edge.get("target") or {}).get("id"))
            if src and dst:
                dataflows.append(Dataflow(id=str(edge.get("id")), source=src, destination=dst))

    return OTM(
        otmVersion="0.1",
        name=name,
        projects=[],
        trustZones=[TrustZone(id="default", name="Default")],
        components=components,
        dataflows=dataflows,
        threats=[],
        mitigations=[],
        risks=[],
        extensions=None,
    )


def otm_to_td(otm: OTM) -> Dict[str, Any]:
    """Very small subset converter OTM -> TD(v2)."""
    cells: list[dict[str, Any]] = []
    id_to_pos: dict[str, tuple[int, int]] = {}
    x, y = 40, 40
    for comp in otm.components:
        cells.append(
            {
                "id": comp.id,
                "type": "tm.Process",
                "attrs": {"text": {"text": comp.name}},
                "position": {"x": x, "y": y},
            }
        )
        id_to_pos[comp.id] = (x, y)
        x += 140
        if x > 600:
            x = 40
            y += 140

    for flow in otm.dataflows:
        cells.append(
            {
                "id": flow.id,
                "type": "link",
                "source": {"id": flow.source},
                "target": {"id": flow.destination},
            }
        )

    return {
        "version": "2.0",
        "summary": {"title": otm.name},
        "detail": {
            "diagrams": [
                {
                    "title": otm.name,
                    "diagramJson": {"cells": cells},
                }
            ]
        },
    }

