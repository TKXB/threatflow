from __future__ import annotations

from adapters import threagile_to_otm, otm_to_threagile
from otm_model.types import OTM


def sample_threagile() -> dict:
    return {
        "title": "Sample TG",
        "technical_assets": {
            "a": {"title": "A", "type": "process", "tags": ["t1"]},
            "b": {"title": "B", "type": "store"},
        },
        "communication_links": [
            {"id": "f1", "source": "a", "target": "b", "protocol": "http"}
        ],
    }


def test_threagile_to_otm_and_back_minimal_roundtrip() -> None:
    tg = sample_threagile()
    otm = threagile_to_otm(tg)
    assert isinstance(otm, OTM)
    assert len(otm.components) == 2
    assert len(otm.dataflows) == 1

    tg2 = otm_to_threagile(otm)
    assert tg2["title"] == otm.name
    assert isinstance(tg2["technical_assets"], dict)
    assert len(tg2["communication_links"]) >= 1

