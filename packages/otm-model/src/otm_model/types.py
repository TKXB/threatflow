from __future__ import annotations

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class Project(BaseModel):
    name: str


class TrustZone(BaseModel):
    id: str
    name: str


class Component(BaseModel):
    id: str
    name: str
    type: str
    trustZone: Optional[str] = None
    tags: List[str] = Field(default_factory=list)


class Dataflow(BaseModel):
    id: str
    source: str
    destination: str
    protocol: Optional[str] = None


class Threat(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    appliesTo: List[str] = Field(default_factory=list)


class Mitigation(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    appliesTo: List[str] = Field(default_factory=list)


class Risk(BaseModel):
    id: str
    threatId: Optional[str] = None
    likelihood: Optional[str] = None
    impact: Optional[str] = None
    severity: Optional[str] = None
    justification: Optional[str] = None


class OTM(BaseModel):
    otmVersion: str
    name: str
    projects: List[Project] = Field(default_factory=list)
    trustZones: List[TrustZone] = Field(default_factory=list)
    components: List[Component] = Field(default_factory=list)
    dataflows: List[Dataflow] = Field(default_factory=list)
    threats: List[Threat] = Field(default_factory=list)
    mitigations: List[Mitigation] = Field(default_factory=list)
    risks: List[Risk] = Field(default_factory=list)
    extensions: Optional[Dict[str, Any]] = None

