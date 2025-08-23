from __future__ import annotations

from adapters import td_to_otm, otm_to_td
from otm_model.types import OTM, Component, Dataflow


def sample_td() -> dict:
    return {
        "version": "2.0",
        "summary": {"title": "Sample TD"},
        "detail": {
            "diagrams": [
                {
                    "title": "D1",
                    "diagramJson": {
                        "cells": [
                            {"id": "a", "type": "tm.Process", "attrs": {"text": {"text": "A"}}},
                            {"id": "b", "type": "tm.Store", "attrs": {"text": {"text": "B"}}},
                            {"id": "f1", "type": "link", "source": {"id": "a"}, "target": {"id": "b"}},
                        ]
                    },
                }
            ]
        },
    }


def test_td_to_otm_and_back_minimal_roundtrip() -> None:
    td = sample_td()
    otm = td_to_otm(td)
    assert isinstance(otm, OTM)
    assert len(otm.components) == 2
    assert len(otm.dataflows) == 1

    td2 = otm_to_td(otm)
    assert td2["version"] == "2.0"
    assert td2["summary"]["title"] == otm.name
    cells = td2["detail"]["diagrams"][0]["diagramJson"]["cells"]
    assert any(c.get("type") == "link" for c in cells)

