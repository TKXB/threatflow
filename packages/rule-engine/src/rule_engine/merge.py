from __future__ import annotations

from typing import Dict, Iterable, List

from .model import Finding, EvaluationResult


def merge_findings(local: EvaluationResult, external: Iterable[Finding | dict]) -> EvaluationResult:
    merged: List[Finding] = []
    seen: set[tuple[str, str, str]] = set()

    def _coerce(f: Finding | dict) -> Finding:
        if isinstance(f, Finding):
            return f
        return Finding(**f)

    for f in list(local.findings) + [ _coerce(e) for e in external ]:
        key = (f.entityId, f.title, f.severity)
        if key in seen:
            continue
        seen.add(key)
        merged.append(f)

    summary: Dict[str, int] = {}
    for f in merged:
        summary[f.severity] = summary.get(f.severity, 0) + 1
    return EvaluationResult(findings=merged, summary=summary)

