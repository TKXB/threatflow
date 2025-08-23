from __future__ import annotations

from pathlib import Path

from otm_model.validate import validate_otm_document


def test_validate_minimal_otm() -> None:
    root = Path(__file__).resolve().parents[2]
    schema = root / "schemas" / "vendor" / "otm" / "1.0.0" / "otm.schema.json"
    doc = {
        "otmVersion": "1.0.0",
        "name": "Sample App",
        "projects": [{"name": "sample"}],
        "trustZones": [{"id": "tz1", "name": "DMZ"}],
        "components": [{"id": "c1", "name": "Web", "type": "process", "trustZone": "tz1"}],
        "dataflows": [{"id": "f1", "source": "c1", "destination": "c1"}]
    }
    validate_otm_document(doc, schema)

