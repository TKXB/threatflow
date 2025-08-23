from __future__ import annotations

from pathlib import Path

from rule_engine.loader import load_rules_from_yaml_dir
from rule_engine.runner import evaluate
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
        dataflows=[Dataflow(id="f1", source="a", destination="b", protocol="http")],
        threats=[],
        mitigations=[],
        risks=[],
        extensions=None,
    )


def test_load_and_eval_builtin_rules() -> None:
    rules_dir = Path(__file__).resolve().parents[1] / "rules" / "builtin"
    rules = load_rules_from_yaml_dir(rules_dir)
    res = evaluate(sample_otm(), rules)
    assert any(f.title == "跨域未加密" for f in res.findings)

