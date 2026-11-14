from concurrent.futures import ThreadPoolExecutor
from threading import Event

import pytest
from fastapi.testclient import TestClient

from app import main
from app import settings as cfg

DNA = "CG" * 500


@pytest.fixture
def client():
    with TestClient(main.app, raise_server_exceptions=False) as session:
        yield session


def test_health_config_and_detect(client):
    health = client.get("/api/v1/health")
    assert health.json()["model_sha256"] == cfg.MODEL_SHA256 and health.json()["model_loaded"]
    assert health.headers["referrer-policy"] == "no-referrer"
    assert health.headers["x-content-type-options"] == "nosniff"
    assert "script-src 'self'" in health.headers["content-security-policy"]
    assert client.get("/api/v1/config").json()["limits"]["max_body_bytes"] == 1048576
    res = client.post("/api/v1/detect", json={"input": DNA})
    assert res.status_code == 200
    record, = res.json()["records"]
    assert record["windows"]["total"] == len(record["scores"]["values"]) == 17
    assert record["windows"]["skipped"] == 0
    assert res.json()["timing_ms"]["total"] >= 0
    for region in record["regions"]:
        assert set(region) == {"start", "end", "length", "score_mean", "score_max", "n_windows"}
    multi = client.post("/api/v1/detect", json={"input": f">a label\n{DNA}\n>a\n{DNA}", "include_scores": False})
    assert [r["id"] for r in multi.json()["records"]] == ["a", "a_2"]
    assert all("scores" not in r for r in multi.json()["records"])
    nulls = client.post("/api/v1/detect", json={"input": "N"*21 + "A"*229}).json()["records"][0]
    assert nulls["scores"]["values"][0] is None and nulls["scores"]["values"][1] is not None


@pytest.mark.parametrize("payload,status,code", [
    ({"input": ""}, 400, "empty_input"), ({"input": ">seq"}, 400, "invalid_fasta"),
    ({"input": "A1"}, 422, "invalid_character"), ({"input": "A"*199}, 422, "too_short"),
    ({"input": "A"*500001}, 422, "too_many_bases"),
    ({"input": (">s\n" + "A"*200 + "\n") * 11}, 422, "too_many_records"),
    ({"input": 5}, 400, "invalid_fasta"), ({"input": DNA, "include_scores": "yes"}, 400, "invalid_fasta"),
])
def test_validation(client, payload, status, code):
    r = client.post("/api/v1/detect", json=payload)
    assert r.status_code == status and r.json()["error"]["code"] == code
    if code == "invalid_character":
        assert r.json()["error"]["details"] == {"record": "sequence_1", "position": 2}


def test_errors_and_caps(client, monkeypatch):
    assert client.post("/api/v1/detect", content=b"{").json()["error"]["code"] == "invalid_fasta"
    for content in (b"x" * (cfg.MAX_BODY_BYTES + 1), iter([b"x"*cfg.MAX_BODY_BYTES, b"x"])):
        r = client.post("/api/v1/detect", content=content)
        assert r.status_code == 413 and r.json()["error"]["code"] == "payload_too_large"
    monkeypatch.setattr(cfg, "MAX_SECONDS", 0)
    r = client.post("/api/v1/detect", json={"input": DNA})
    assert r.status_code == 503 and r.json()["error"]["code"] == "time_budget_exceeded"


def test_busy_health_and_recovery(client, monkeypatch):
    started, resume = Event(), Event()
    original = main.detect

    def blocked(booster, payload):
        started.set()
        resume.wait()
        return original(booster, payload)

    monkeypatch.setattr(cfg, "BUSY_WAIT", 0.05)
    monkeypatch.setattr(main, "detect", blocked)
    with ThreadPoolExecutor(1) as pool:
        job = pool.submit(client.post, "/api/v1/detect", json={"input": DNA})
        try:
            assert started.wait(timeout=10)
            assert client.get("/api/v1/health").status_code == 200
            r = client.post("/api/v1/detect", json={"input": DNA})
            assert r.status_code == 503 and "retry-after" in r.headers and r.json()["error"]["code"] == "busy"
        finally:
            resume.set()
        assert job.result().status_code == 200
    assert client.post("/api/v1/detect", json={"input": DNA}).status_code == 200


def test_internal_error_shape(client, monkeypatch):
    def broken(*args):
        raise RuntimeError("private stack details")

    monkeypatch.setattr(main, "detect", broken)
    r = client.post("/api/v1/detect", json={"input": DNA})
    assert r.status_code == 500 and r.json()["error"]["code"] == "internal_error"
    assert "private stack details" not in r.text
