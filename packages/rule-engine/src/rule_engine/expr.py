from __future__ import annotations

from typing import Any, Callable, Dict

import jmespath


def build_context(functions: Dict[str, Callable[..., Any]] | None = None) -> Dict[str, Any]:
    ctx: Dict[str, Any] = {}
    if functions:
        ctx.update(functions)
    return ctx


def evaluate_where(where: str | None, obj: dict[str, Any], ctx: dict[str, Any]) -> bool:
    if not where:
        return True
    # Expose ctx as top-level variables in the expression via jmespath.Options
    # jmespath doesn't support functions directly; keep MVP simple by allowing
    # access to ctx values through `ctx` variable.
    data = {"obj": obj, "ctx": ctx}
    # Allow expressions to reference `obj` fields directly (shallow copy)
    data.update(obj)
    try:
        result = jmespath.search(where, data)
        return bool(result)
    except Exception:
        return False

