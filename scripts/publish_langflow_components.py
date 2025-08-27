#!/usr/bin/env python3
from __future__ import annotations

import json
import os
from typing import Any

import requests


LF_BASE = os.environ.get("LANGFLOW_URL", "http://127.0.0.1:7860")


def post_component(name: str, code: str, component_type: str = "custom_components") -> dict[str, Any]:
    url = f"{LF_BASE}/api/custom-components"
    resp = requests.post(url, json={"name": name, "component_type": component_type, "code": code}, timeout=120)
    resp.raise_for_status()
    return resp.json()


def code_dataflow_editor() -> str:
    return r'''
from __future__ import annotations
import httpx
from typing import Any
import json
from langflow.custom.custom_component.custom_component import CustomComponent
from langflow.io import DataInput, MessageTextInput, Output
from langflow.schema.data import Data


class DataflowEditorComponent(CustomComponent):
    display_name = "Threatflow: Dataflow Editor"
    description = "Add or remove a dataflow via Threatflow backend"
    field_config = {
        "baseUrl": {"display_name": "Base URL", "type": "str", "value": "http://127.0.0.1:8889"},
        "otm": {"display_name": "OTM JSON", "type": "dict", "value": {}},
        "op": {"display_name": "Operation", "type": "dict", "value": {"action": "add"}},
    }

    # 端口定义：连线值应覆盖表单值
    inputs = [
        MessageTextInput(name="baseUrl", display_name="Base URL"),
        DataInput(name="otm", display_name="OTM"),
        DataInput(name="op", display_name="Operation"),
    ]
    outputs = [
        Output(name="otm_out", display_name="OTM", method="execute_dataflow"),
    ]

    def execute_dataflow(self) -> Data:
        baseUrl = self.baseUrl
        otm = self.otm
        op = self.op
        
        # 兼容 Data/字符串 JSON
        if hasattr(otm, "data"):
            otm = otm.data
        if hasattr(op, "data"):
            op = op.data
        # 兼容 MultilineInput 传入 JSON 字符串
        if isinstance(otm, str):
            try:
                otm = json.loads(otm)
            except Exception:
                pass
        if isinstance(op, str):
            try:
                op = json.loads(op)
            except Exception:
                pass
        with httpx.Client(timeout=30) as client:
            r = client.post(f"{baseUrl}/components/DataflowEditor/execute", json={"otm": otm, "op": op})
            r.raise_for_status()
            return Data(data=r.json())

    async def build_results(self):
        """异步构建方法，返回结果和工件。"""
        try:
            result = self.execute_dataflow()
            # 构建结果字典，键名对应 outputs 中定义的名称
            build_results = {"otm_out": result}
            artifacts = {}  # 暂时无工件需要返回
            return build_results, artifacts
        except Exception as e:
            # 出错时返回空结果
            return {}, {}

    # 兼容需要 build 入口的环境
    def build(self) -> Data:
        return self.execute_dataflow()
'''


def code_trustzone_manager() -> str:
    return r'''
from __future__ import annotations
import httpx
from typing import Any
import json
from langflow.custom.custom_component.custom_component import CustomComponent
from langflow.io import DataInput, MessageTextInput, Output
from langflow.schema.data import Data


class TrustZoneManagerComponent(CustomComponent):
    display_name = "Threatflow: Trust Zone Manager"
    description = "Add trust zone or assign component to a trust zone via Threatflow backend"
    field_config = {
        "baseUrl": {"display_name": "Base URL", "type": "str", "value": "http://127.0.0.1:8889"},
        "otm": {"display_name": "OTM JSON", "type": "dict", "value": {}},
        "op": {"display_name": "Operation", "type": "dict", "value": {"action": "add"}},
    }

    inputs = [
        MessageTextInput(name="baseUrl", display_name="Base URL"),
        DataInput(name="otm", display_name="OTM"),
        DataInput(name="op", display_name="Operation"),
    ]
    outputs = [
        Output(name="otm_out", display_name="OTM", method="execute_trustzone"),
    ]

    def execute_trustzone(self) -> Data:
        baseUrl = self.baseUrl
        otm = self.otm
        op = self.op
        
        if hasattr(otm, "data"):
            otm = otm.data
        if hasattr(op, "data"):
            op = op.data
        if isinstance(otm, str):
            try:
                otm = json.loads(otm)
            except Exception:
                pass
        if isinstance(op, str):
            try:
                op = json.loads(op)
            except Exception:
                pass
        with httpx.Client(timeout=30) as client:
            r = client.post(f"{baseUrl}/components/TrustZoneManager/execute", json={"otm": otm, "op": op})
            r.raise_for_status()
            return Data(data=r.json())

    def build(self) -> Data:
        result = self.execute_trustzone()
        try:
            self.build_results = {"otm_out": result}
        except Exception:
            pass
        return result
'''


def code_layout_writer() -> str:
    return r'''
from __future__ import annotations
import httpx
from typing import Any
import json
from langflow.custom.custom_component.custom_component import CustomComponent
from langflow.io import DataInput, MessageTextInput, Output
from langflow.schema.data import Data


class LayoutWriterComponent(CustomComponent):
    display_name = "Threatflow: Layout Writer"
    description = "Write layout into OTM.extensions.x-threatflow.layout via Threatflow backend"
    field_config = {
        "baseUrl": {"display_name": "Base URL", "type": "str", "value": "http://127.0.0.1:8889"},
        "otm": {"display_name": "OTM JSON", "type": "dict", "value": {}},
        "op": {"display_name": "Operation", "type": "dict", "value": {"action": "set", "layout": {}}},
    }

    inputs = [
        MessageTextInput(name="baseUrl", display_name="Base URL"),
        DataInput(name="otm", display_name="OTM"),
        DataInput(name="op", display_name="Operation"),
    ]
    outputs = [
        Output(name="otm_out", display_name="OTM", method="execute_layout"),
    ]

    def execute_layout(self) -> Data:
        baseUrl = self.baseUrl
        otm = self.otm
        op = self.op
        
        if hasattr(otm, "data"):
            otm = otm.data
        if hasattr(op, "data"):
            op = op.data
        if isinstance(otm, str):
            try:
                otm = json.loads(otm)
            except Exception:
                pass
        if isinstance(op, str):
            try:
                op = json.loads(op)
            except Exception:
                pass
        with httpx.Client(timeout=30) as client:
            r = client.post(f"{baseUrl}/components/LayoutWriter/execute", json={"otm": otm, "op": op})
            r.raise_for_status()
            return Data(data=r.json())

    def build(self) -> Data:
        result = self.execute_layout()
        try:
            self.build_results = {"otm_out": result}
        except Exception:
            pass
        return result
'''


def code_otm_validate() -> str:
    return r'''
from __future__ import annotations
import httpx
from typing import Any
import json
from langflow.custom.custom_component.custom_component import CustomComponent
from langflow.io import DataInput, MessageTextInput, Output
from langflow.schema.data import Data


class OTMValidateComponent(CustomComponent):
    display_name = "Threatflow: OTM Validate"
    description = "Validate OTM document via Threatflow backend"
    field_config = {
        "baseUrl": {"display_name": "Base URL", "type": "str", "value": "http://127.0.0.1:8889"},
        "otm": {"display_name": "OTM JSON", "type": "dict", "value": {}},
        "schema": {"display_name": "Schema Path (optional)", "type": "str", "value": ""},
    }

    inputs = [
        MessageTextInput(name="baseUrl", display_name="Base URL"),
        DataInput(name="otm", display_name="OTM"),
        MessageTextInput(name="schema", display_name="Schema Path (optional)"),
    ]
    outputs = [
        Output(name="result_out", display_name="Result", method="execute_validate"),
    ]

    def execute_validate(self) -> Data:
        baseUrl = self.baseUrl
        otm = self.otm
        schema = self.schema
        
        if hasattr(otm, "data"):
            otm = otm.data
        if isinstance(otm, str):
            try:
                otm = json.loads(otm)
            except Exception:
                pass
        op = {"schema": schema} if schema else {}
        with httpx.Client(timeout=30) as client:
            r = client.post(f"{baseUrl}/components/OTMValidate/execute", json={"otm": otm, "op": op})
            r.raise_for_status()
            return Data(data=r.json())

    def build(self) -> Data:
        result = self.execute_validate()
        try:
            self.build_results = {"result_out": result}
        except Exception:
            pass
        return result
'''


def code_rule_engine_evaluate() -> str:
    return r'''
from __future__ import annotations
import httpx
from typing import Any
from langflow.custom.custom_component.custom_component import CustomComponent


class RuleEngineEvaluateComponent(CustomComponent):
    display_name = "Threatflow: Rule Engine Evaluate"
    description = "Evaluate rules against OTM via Threatflow backend"
    field_config = {
        "baseUrl": {"display_name": "Base URL", "type": "str", "value": "http://127.0.0.1:8889"},
        "otm": {"display_name": "OTM JSON", "type": "dict", "value": {}},
        "rules_dir": {"display_name": "Rules Dir (optional)", "type": "str", "value": ""},
    }

    def build(self, baseUrl: str, otm: dict, rules_dir: str | None = None) -> dict:
        op = {"rules_dir": rules_dir} if rules_dir else {}
        with httpx.Client(timeout=30) as client:
            r = client.post(f"{baseUrl}/components/RuleEngineEvaluate/execute", json={"otm": otm, "op": op})
            r.raise_for_status()
            return r.json()
'''


def code_td_import() -> str:
    return r'''
from __future__ import annotations
import httpx
from typing import Any
from langflow.custom.custom_component.custom_component import CustomComponent


class ThreatDragonImportComponent(CustomComponent):
    display_name = "Threatflow: Threat Dragon Import"
    description = "Import Threat Dragon JSON into OTM via Threatflow backend"
    field_config = {
        "baseUrl": {"display_name": "Base URL", "type": "str", "value": "http://127.0.0.1:8889"},
        "td": {"display_name": "Threat Dragon JSON", "type": "dict", "value": {}},
    }

    def build(self, baseUrl: str, td: dict) -> dict:
        with httpx.Client(timeout=30) as client:
            r = client.post(f"{baseUrl}/components/ThreatDragonImport/execute", json={"otm": {}, "op": {"td": td}})
            r.raise_for_status()
            return r.json()
'''


def code_td_export() -> str:
    return r'''
from __future__ import annotations
import httpx
from typing import Any
from langflow.custom.custom_component.custom_component import CustomComponent


class ThreatDragonExportComponent(CustomComponent):
    display_name = "Threatflow: Threat Dragon Export"
    description = "Export OTM to Threat Dragon JSON via Threatflow backend"
    field_config = {
        "baseUrl": {"display_name": "Base URL", "type": "str", "value": "http://127.0.0.1:8889"},
        "otm": {"display_name": "OTM JSON", "type": "dict", "value": {}},
    }

    def build(self, baseUrl: str, otm: dict) -> dict:
        with httpx.Client(timeout=30) as client:
            r = client.post(f"{baseUrl}/components/ThreatDragonExport/execute", json={"otm": otm, "op": {}})
            r.raise_for_status()
            return r.json()
'''


def code_tg_import() -> str:
    return r'''
from __future__ import annotations
import httpx
from typing import Any
from langflow.custom.custom_component.custom_component import CustomComponent


class ThreagileImportComponent(CustomComponent):
    display_name = "Threatflow: Threagile Import"
    description = "Import Threagile YAML into OTM via Threatflow backend"
    field_config = {
        "baseUrl": {"display_name": "Base URL", "type": "str", "value": "http://127.0.0.1:8889"},
        "yaml": {"display_name": "Threagile YAML", "type": "str", "value": ""},
    }

    def build(self, baseUrl: str, yaml: str) -> dict:
        with httpx.Client(timeout=30) as client:
            r = client.post(f"{baseUrl}/components/ThreagileImport/execute", json={"otm": {}, "op": {"yaml": yaml}})
            r.raise_for_status()
            return r.json()
'''


def code_tg_export() -> str:
    return r'''
from __future__ import annotations
import httpx
from typing import Any
from langflow.custom.custom_component.custom_component import CustomComponent


class ThreagileExportComponent(CustomComponent):
    display_name = "Threatflow: Threagile Export"
    description = "Export OTM to Threagile YAML via Threatflow backend"
    field_config = {
        "baseUrl": {"display_name": "Base URL", "type": "str", "value": "http://127.0.0.1:8889"},
        "otm": {"display_name": "OTM JSON", "type": "dict", "value": {}},
    }

    def build(self, baseUrl: str, otm: dict) -> str:
        with httpx.Client(timeout=30) as client:
            r = client.post(f"{baseUrl}/components/ThreagileExport/execute", json={"otm": otm, "op": {}})
            r.raise_for_status()
            return r.text
'''


def code_tg_analyze() -> str:
    return r'''
from __future__ import annotations
import httpx
from typing import Any
from langflow.custom.custom_component.custom_component import CustomComponent


class ThreagileAnalyzeComponent(CustomComponent):
    display_name = "Threatflow: Threagile Analyze"
    description = "Analyze Threagile YAML and return findings via Threatflow backend"
    field_config = {
        "baseUrl": {"display_name": "Base URL", "type": "str", "value": "http://127.0.0.1:8889"},
        "yaml": {"display_name": "Threagile YAML", "type": "str", "value": ""},
    }

    def build(self, baseUrl: str, yaml: str) -> dict:
        with httpx.Client(timeout=30) as client:
            r = client.post(f"{baseUrl}/components/ThreagileAnalyze/execute", json={"otm": {}, "op": {"yaml": yaml}})
            r.raise_for_status()
            return r.json()
'''


def main() -> None:
    created = []
    created.append(post_component("dataflow_editor_component", code_dataflow_editor()))
    created.append(post_component("trustzone_manager_component", code_trustzone_manager()))
    created.append(post_component("layout_writer_component", code_layout_writer()))
    created.append(post_component("otm_validate_component", code_otm_validate()))
    created.append(post_component("rule_engine_evaluate_component", code_rule_engine_evaluate()))
    created.append(post_component("td_import_component", code_td_import()))
    created.append(post_component("td_export_component", code_td_export()))
    created.append(post_component("tg_import_component", code_tg_import()))
    created.append(post_component("tg_export_component", code_tg_export()))
    created.append(post_component("tg_analyze_component", code_tg_analyze()))
    print(json.dumps(created, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()

