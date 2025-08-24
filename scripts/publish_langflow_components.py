#!/usr/bin/env python3
from __future__ import annotations

import json
import os
from typing import Any

import requests


LF_BASE = os.environ.get("LANGFLOW_URL", "http://127.0.0.1:7860")


def post_component(name: str, code: str, component_type: str = "custom_components") -> dict[str, Any]:
    url = f"{LF_BASE}/api/custom-components"
    resp = requests.post(url, json={"name": name, "component_type": component_type, "code": code}, timeout=30)
    resp.raise_for_status()
    return resp.json()


def code_dataflow_editor() -> str:
    return r'''
from __future__ import annotations
import httpx
from typing import Any
from langflow.custom.custom_component.custom_component import CustomComponent


class DataflowEditorComponent(CustomComponent):
    display_name = "Threatflow: Dataflow Editor"
    description = "Add or remove a dataflow via Threatflow backend"
    field_config = {
        "baseUrl": {"display_name": "Base URL", "type": "str", "value": "http://127.0.0.1:8889"},
        "otm": {"display_name": "OTM JSON", "type": "dict", "value": {}},
        "op": {"display_name": "Operation", "type": "dict", "value": {"action": "add"}},
    }

    def build(self, baseUrl: str, otm: dict, op: dict) -> dict:
        with httpx.Client(timeout=30) as client:
            r = client.post(f"{baseUrl}/components/DataflowEditor/execute", json={"otm": otm, "op": op})
            r.raise_for_status()
            return r.json()
'''


def code_trustzone_manager() -> str:
    return r'''
from __future__ import annotations
import httpx
from typing import Any
from langflow.custom.custom_component.custom_component import CustomComponent


class TrustZoneManagerComponent(CustomComponent):
    display_name = "Threatflow: Trust Zone Manager"
    description = "Add trust zone or assign component to a trust zone via Threatflow backend"
    field_config = {
        "baseUrl": {"display_name": "Base URL", "type": "str", "value": "http://127.0.0.1:8889"},
        "otm": {"display_name": "OTM JSON", "type": "dict", "value": {}},
        "op": {"display_name": "Operation", "type": "dict", "value": {"action": "add"}},
    }

    def build(self, baseUrl: str, otm: dict, op: dict) -> dict:
        with httpx.Client(timeout=30) as client:
            r = client.post(f"{baseUrl}/components/TrustZoneManager/execute", json={"otm": otm, "op": op})
            r.raise_for_status()
            return r.json()
'''


def code_layout_writer() -> str:
    return r'''
from __future__ import annotations
import httpx
from typing import Any
from langflow.custom.custom_component.custom_component import CustomComponent


class LayoutWriterComponent(CustomComponent):
    display_name = "Threatflow: Layout Writer"
    description = "Write layout into OTM.extensions.x-threatflow.layout via Threatflow backend"
    field_config = {
        "baseUrl": {"display_name": "Base URL", "type": "str", "value": "http://127.0.0.1:8889"},
        "otm": {"display_name": "OTM JSON", "type": "dict", "value": {}},
        "op": {"display_name": "Operation", "type": "dict", "value": {"action": "set", "layout": {}}},
    }

    def build(self, baseUrl: str, otm: dict, op: dict) -> dict:
        with httpx.Client(timeout=30) as client:
            r = client.post(f"{baseUrl}/components/LayoutWriter/execute", json={"otm": otm, "op": op})
            r.raise_for_status()
            return r.json()
'''


def main() -> None:
    created = []
    created.append(post_component("dataflow_editor_component", code_dataflow_editor()))
    created.append(post_component("trustzone_manager_component", code_trustzone_manager()))
    created.append(post_component("layout_writer_component", code_layout_writer()))
    print(json.dumps(created, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()

