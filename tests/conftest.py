from __future__ import annotations

import sys
from pathlib import Path


def _add_packages_src_to_sys_path() -> None:
    root = Path(__file__).resolve().parents[1]
    packages_dir = root / "packages"
    if not packages_dir.exists():
        return
    for pkg in packages_dir.iterdir():
        src = pkg / "src"
        if src.exists() and src.is_dir():
            p = str(src)
            if p not in sys.path:
                sys.path.insert(0, p)


_add_packages_src_to_sys_path()

