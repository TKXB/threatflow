from __future__ import annotations

from typing import Any, Dict, List

from ..model import Finding


def parse_threagile_report(report: Dict[str, Any]) -> List[Finding]:
    """Parse a minimal Threagile-like report JSON into Finding list.

    This is a placeholder to integrate real analyzer output later.
    Expected shape (simplified):
    { "risks": [ {"title": str, "severity": str, "entityId": str, ...}, ... ] }
    """
    out: List[Finding] = []
    for r in report.get("risks", []):
        out.append(
            Finding(
                ruleId=r.get("ruleId") or r.get("id") or "threagile",
                title=r.get("title") or "risk",
                severity=(r.get("severity") or "medium").lower(),
                entityType=r.get("entityType") or "component",
                entityId=str(r.get("entityId") or r.get("technical_asset") or "unknown"),
                message=r.get("message") or r.get("description") or "",
                remediation=r.get("remediation"),
                tags=list(r.get("tags") or []),
                evidence=r,
            )
        )
    return out

