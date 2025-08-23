#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "schemas" / "vendor" / "schema-index.json"


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> None:
    data = json.loads(INDEX.read_text(encoding="utf-8"))
    for key, rec in data.items():
        path = ROOT / rec["path"]
        if not path.exists():
            raise SystemExit(f"Missing schema file: {path}")
        rec["sha256"] = sha256_of(path)
    INDEX.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("Updated schema-index.json with sha256 digests")


if __name__ == "__main__":
    main()

