"""Verify the deployed hostname against the real example regions."""

import argparse
import hashlib
import json
from pathlib import Path
from time import perf_counter
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]


def request(base, path, payload=None):
    body = None if payload is None else json.dumps(payload).encode()
    req = Request(base.rstrip("/") + path, data=body, headers={"Content-Type": "application/json"})
    with urlopen(req) as response:
        assert response.status == 200, (path, response.status)
        return json.load(response)


def smoke(base):
    start = perf_counter()
    health = request(base, "/api/v1/health")
    print(f"First health response: {perf_counter() - start:.3f} s")
    with (ROOT / "model/compact82_booster.txt").open("rb") as f:
        digest = hashlib.file_digest(f, "sha256").hexdigest()
    assert health["status"] == "ok" and health["model_loaded"] and health["model_sha256"] == digest
    config = request(base, "/api/v1/config")
    assert config["model"]["sha256"] == digest
    examples = json.loads((ROOT / "static/data/examples.json").read_text(encoding="utf-8"))
    for example in examples:
        payload = {"input": ">" + example["id"] + "\n" + example["sequence"], "include_scores": False}
        start = perf_counter()
        data = request(base, "/api/v1/detect", payload)
        elapsed = perf_counter() - start
        record, = data["records"]
        assert record["id"] == example["id"] and record["length"] == len(example["sequence"])
        for region, expected in zip(record["regions"], example["expected_regions"], strict=True):
            for field in ("start", "end", "length", "n_windows"):
                assert region[field] == expected[field]
            for field in ("score_mean", "score_max"):
                assert abs(region[field] - expected[field]) <= 1e-5
        print(f"{example['name']}: {len(record['regions'])} regions, "
              f"server {data['timing_ms']['total']} ms, wall {elapsed:.3f} s")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("base_url")
    smoke(parser.parse_args().base_url)
