from __future__ import annotations

import json
from pathlib import Path

import pytest


ROOT = Path(__file__).resolve().parents[2]
INDEX = ROOT / "schemas" / "vendor" / "schema-index.json"


@pytest.mark.parametrize(
    "key",
    ["otm", "threat-dragon", "threagile"],
)
def test_vendor_schema_files_exist_and_parse(key: str) -> None:
    index = json.loads(INDEX.read_text(encoding="utf-8"))
    rel = index[key]["path"]
    path = ROOT / rel
    assert path.exists(), f"missing: {path}"
    # Ensure JSON parses
    json.loads(path.read_text(encoding="utf-8"))

