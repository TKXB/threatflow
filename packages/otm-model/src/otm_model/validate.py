from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator


def load_schema(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def validate_otm_document(otm: dict[str, Any], schema_path: Path) -> None:
    schema = load_schema(schema_path)
    Draft202012Validator(schema).validate(otm)

