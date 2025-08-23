from __future__ import annotations

from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class Rule(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    severity: str = Field(pattern=r"^(info|low|medium|high|critical)$")
    select: str
    where: Optional[str] = None
    message: str
    remediation: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    enabled: bool = True
    version: Optional[str] = None


class Finding(BaseModel):
    ruleId: str
    title: str
    severity: str
    entityType: str
    entityId: str
    message: str
    remediation: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    evidence: Dict[str, Any] = Field(default_factory=dict)


class EvaluationResult(BaseModel):
    findings: List[Finding]
    summary: Dict[str, int] = Field(default_factory=dict)

