from __future__ import annotations

from rule_engine import Rule, evaluate, load_rules_from_dicts
from otm_model.types import OTM, Component, Dataflow, TrustZone


def sample_otm() -> OTM:
    return OTM(
        otmVersion="0.1",
        name="S",
        projects=[],
        trustZones=[TrustZone(id="public", name="Public"), TrustZone(id="private", name="Private")],
        components=[
            Component(id="a", name="A", type="process", trustZone="public"),
            Component(id="b", name="B", type="store", trustZone="private"),
        ],
        dataflows=[
            Dataflow(id="f1", source="a", destination="b", protocol="http"),
        ],
        threats=[],
        mitigations=[],
        risks=[],
        extensions=None,
    )


def test_engine_finds_insecure_flow() -> None:
    rules = load_rules_from_dicts(
        [
            {
                "id": "DF-TLS-001",
                "title": "跨域未加密",
                "severity": "high",
                "select": "dataflows",
                "where": "protocol == 'http'",
                "message": "数据流 {id} 未加密",
                "enabled": True,
            }
        ]
    )
    res = evaluate(sample_otm(), rules)
    assert any(f.ruleId == "DF-TLS-001" for f in res.findings)

