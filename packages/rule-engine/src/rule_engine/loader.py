from __future__ import annotations

from pathlib import Path
from typing import List

import yaml

from .model import Rule


def load_rules_from_yaml_dir(dir_path: str | Path) -> List[Rule]:
    path = Path(dir_path)
    rules: list[Rule] = []
    for p in sorted(path.glob("*.yaml")):
        data = yaml.safe_load(p.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            rules.append(Rule.model_validate(data))
        elif isinstance(data, list):
            rules.extend(Rule.model_validate(d) for d in data)
    return rules

