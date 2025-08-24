from __future__ import annotations

from pathlib import Path
import sys

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
SERVER_SRC = ROOT / "apps" / "langflow-server" / "src"
sys.path.insert(0, str(SERVER_SRC))

from threatflow_server.app import app  # noqa: E402


def test_layout_writer_set_and_merge() -> None:
    client = TestClient(app)
    otm = {
        "otmVersion": "0.1",
        "name": "S",
        "projects": [],
        "trustZones": [],
        "components": [],
        "dataflows": [],
        "threats": [],
        "mitigations": [],
        "risks": [],
    }

    # set layout
    res = client.post(
        "/components/LayoutWriter/execute",
        json={"otm": otm, "op": {"action": "set", "layout": {"nodes": [{"id": "a", "x": 10, "y": 20}]}}},
    )
    assert res.status_code == 200
    otm = res.json()
    assert otm["extensions"]["x-threatflow"]["layout"]["nodes"][0]["id"] == "a"

    # merge layout
    res = client.post(
        "/components/LayoutWriter/execute",
        json={"otm": otm, "op": {"action": "merge", "layout": {"zoom": 0.8}}},
    )
    assert res.status_code == 200
    otm = res.json()
    assert otm["extensions"]["x-threatflow"]["layout"]["zoom"] == 0.8

