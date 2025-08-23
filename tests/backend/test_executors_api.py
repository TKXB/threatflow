from __future__ import annotations

from pathlib import Path
import sys

from fastapi.testclient import TestClient

# Ensure apps/langflow-server/src is on sys.path for local tests
ROOT = Path(__file__).resolve().parents[2]
SERVER_SRC = ROOT / "apps" / "langflow-server" / "src"
sys.path.insert(0, str(SERVER_SRC))

from threatflow_server.app import app


def test_dataflow_and_trustzone_ops() -> None:
    client = TestClient(app)

    otm = {
        "otmVersion": "0.1",
        "name": "S",
        "projects": [],
        "trustZones": [{"id": "tz1", "name": "TZ1"}],
        "components": [{"id": "a", "name": "A", "type": "process"}, {"id": "b", "name": "B", "type": "store"}],
        "dataflows": [],
        "threats": [],
        "mitigations": [],
        "risks": [],
    }

    # add dataflow
    resp = client.post("/otm/dataflow", json={"otm": otm, "op": {"action": "add", "dataflow": {"id": "f1", "source": "a", "destination": "b", "protocol": "http"}}})
    assert resp.status_code == 200
    otm = resp.json()
    assert any(d["id"] == "f1" for d in otm["dataflows"])

    # add trustzone and assign
    resp = client.post("/otm/trustzone", json={"otm": otm, "op": {"action": "add", "trustZone": {"id": "tz2", "name": "TZ2"}}})
    assert resp.status_code == 200
    otm = resp.json()
    assert any(z["id"] == "tz2" for z in otm["trustZones"])

    resp = client.post(
        "/otm/trustzone",
        json={
            "otm": otm,
            "op": {"action": "assign", "componentId": "a", "trustZoneId": "tz2"},
        },
    )
    assert resp.status_code == 200
    otm = resp.json()
    comp_a = next(c for c in otm["components"] if c["id"] == "a")
    assert comp_a["trustZone"] == "tz2"

