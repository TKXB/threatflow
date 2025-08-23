from __future__ import annotations

from typing import Any, Dict

from otm_model.types import OTM, Component, Dataflow, TrustZone


def threagile_to_otm(model: Dict[str, Any]) -> OTM:
    """Minimal subset converter Threagile -> OTM.

    Only maps a few common fields:
    - title -> OTM.name
    - technical_assets -> components
    - communication_links -> dataflows
    """
    name = model.get("title") or "Threagile"

    components: list[Component] = []
    tech_assets = model.get("technical_assets") or {}
    if isinstance(tech_assets, dict):
        for asset_id, asset in tech_assets.items():
            comp_name = asset.get("title") or asset.get("name") or str(asset_id)
            comp_type = asset.get("type") or "asset"
            trust_boundary = asset.get("trust_boundary")
            tags = list(asset.get("tags") or [])
            components.append(
                Component(
                    id=str(asset_id),
                    name=comp_name,
                    type=comp_type,
                    trustZone=trust_boundary,
                    tags=tags,
                )
            )

    dataflows: list[Dataflow] = []
    for link in model.get("communication_links") or []:
        src = str(link.get("source") or "")
        dst = str(link.get("target") or "")
        if src and dst:
            dataflows.append(
                Dataflow(
                    id=str(link.get("id") or f"{src}->{dst}"),
                    source=src,
                    destination=dst,
                    protocol=link.get("protocol"),
                )
            )

    trust_zones = [TrustZone(id="default", name="Default")]

    return OTM(
        otmVersion="0.1",
        name=name,
        projects=[],
        trustZones=trust_zones,
        components=components,
        dataflows=dataflows,
        threats=[],
        mitigations=[],
        risks=[],
        extensions=None,
    )


def otm_to_threagile(otm: OTM) -> Dict[str, Any]:
    """Minimal subset converter OTM -> Threagile.

    Produces a dict compatible with common Threagile fields.
    """
    technical_assets: dict[str, dict[str, Any]] = {}
    for comp in otm.components:
        technical_assets[comp.id] = {
            "title": comp.name,
            "type": comp.type,
            "tags": list(comp.tags or []),
            **({"trust_boundary": comp.trustZone} if comp.trustZone else {}),
        }

    communication_links: list[dict[str, Any]] = []
    for flow in otm.dataflows:
        communication_links.append(
            {
                "id": flow.id,
                "source": flow.source,
                "target": flow.destination,
                **({"protocol": flow.protocol} if flow.protocol else {}),
            }
        )

    return {
        "title": otm.name,
        "technical_assets": technical_assets,
        "communication_links": communication_links,
    }

