from __future__ import annotations

from typing import Any, Dict, Iterable, List

from pydantic import BaseModel

from otm_model.types import OTM
from .model import Rule, Finding, EvaluationResult
from .expr import evaluate_where, build_context


class OtmIndex(BaseModel):
    id_to_component: Dict[str, Any]
    id_to_trustzone: Dict[str, Any]


def index_otm(otm: OTM) -> OtmIndex:
    return OtmIndex(
        id_to_component={c.id: c for c in otm.components},
        id_to_trustzone={z.id: z for z in otm.trustZones},
    )


def load_rules_from_dicts(rule_dicts: Iterable[dict[str, Any]]) -> List[Rule]:
    return [Rule.model_validate(d) for d in rule_dicts]


def evaluate(otm: OTM, rules: List[Rule]) -> EvaluationResult:
    idx = index_otm(otm)
    ctx = build_context(
        {
            "cross_trust_zone": lambda obj: _cross_tz(obj, idx),
            "has_tag": lambda obj, tag: tag in (obj.get("tags") or []),
        }
    )

    findings: List[Finding] = []
    for rule in rules:
        if not rule.enabled:
            continue

        candidates: Iterable[dict[str, Any]]
        entity_type: str
        if rule.select == "components":
            candidates = [c.model_dump() for c in otm.components]
            entity_type = "component"
        elif rule.select == "dataflows":
            candidates = [d.model_dump() for d in otm.dataflows]
            entity_type = "dataflow"
        elif rule.select == "otm":
            candidates = [otm.model_dump()]
            entity_type = "otm"
        else:
            continue

        for obj in candidates:
            if evaluate_where(rule.where, obj, ctx):
                entity_id = str(obj.get("id", "otm"))
                findings.append(
                    Finding(
                        ruleId=rule.id,
                        title=rule.title,
                        severity=rule.severity,
                        entityType=entity_type,
                        entityId=entity_id,
                        message=rule.message.format(**{**obj}),
                        remediation=rule.remediation,
                        tags=rule.tags,
                        evidence=obj,
                    )
                )

    summary: Dict[str, int] = {}
    for f in findings:
        summary[f.severity] = summary.get(f.severity, 0) + 1
    return EvaluationResult(findings=findings, summary=summary)


def _cross_tz(obj: dict[str, Any], idx: OtmIndex) -> bool:
    src_tz = obj.get("trustZone") or None
    if obj.get("entityType") == "dataflow":
        # Basic inference for dataflow if we have components in index
        return False
    if src_tz is None:
        return False
    return src_tz not in idx.id_to_trustzone

