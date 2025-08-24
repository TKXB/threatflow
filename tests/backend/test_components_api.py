from __future__ import annotations

from pathlib import Path
import sys

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
SERVER_SRC = ROOT / "apps" / "langflow-server" / "src"
sys.path.insert(0, str(SERVER_SRC))

from threatflow_server.app import app  # noqa: E402


def test_list_and_execute_components() -> None:
    client = TestClient(app)
    resp = client.get("/components")
    assert resp.status_code == 200
    data = resp.json()
    ids = {c["id"] for c in data["components"]}
    assert {"DataflowEditor", "TrustZoneManager"}.issubset(ids)

    otm = {
        "otmVersion": "0.1",
        "name": "S",
        "projects": [],
        "trustZones": [],
        "components": [
            {"id": "a", "name": "A", "type": "process"},
            {"id": "b", "name": "B", "type": "store"},
        ],
        "dataflows": [],
        "threats": [],
        "mitigations": [],
        "risks": [],
    }

    resp = client.post(
        "/components/DataflowEditor/execute",
        json={"otm": otm, "op": {"action": "add", "dataflow": {"id": "f1", "source": "a", "destination": "b"}}},
    )
    assert resp.status_code == 200
    otm2 = resp.json()
    assert any(d["id"] == "f1" for d in otm2["dataflows"])

