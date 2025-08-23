from __future__ import annotations

from rule_engine.model import Finding, EvaluationResult
from rule_engine.merge import merge_findings


def test_merge_deduplicates_and_summarizes() -> None:
    local = EvaluationResult(
        findings=[
            Finding(
                ruleId="DF-TLS-001",
                title="跨域未加密",
                severity="high",
                entityType="dataflow",
                entityId="f1",
                message="f1 未加密",
            )
        ]
    )
    external = [
        {
            "ruleId": "threagile-xyz",
            "title": "跨域未加密",
            "severity": "high",
            "entityType": "dataflow",
            "entityId": "f1",
            "message": "from threagile",
        },
        {
            "ruleId": "threagile-abc",
            "title": "存储未加密",
            "severity": "medium",
            "entityType": "component",
            "entityId": "b",
            "message": "from threagile",
        },
    ]

    merged = merge_findings(local, external)
    # first two are duplicates by (entityId, title, severity)
    assert len(merged.findings) == 2
    assert merged.summary.get("high") == 1
    assert merged.summary.get("medium") == 1

