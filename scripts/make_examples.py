"""Build self-contained examples from the approved fixtures; run from the repo root."""

import csv
import gzip
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.fasta import Record
from app.model import load_model
from app.pipeline import scan_record
from app.settings import STRIDE

FIX = ROOT / "tests/fixtures"


def main():
    booster = load_model()
    items = []

    def add(name, chrom, start, seq):
        display = f"{chrom}:{start + 1}-{start + len(seq)}"
        regions = scan_record(booster, Record(display, seq))["regions"]
        items.append(dict(name=name, id=display, assembly="hg38", chrom=chrom, start=start,
                          end=start + len(seq), sequence=seq, expected_regions=regions))

    with gzip.open(FIX / "test_windows.csv.gz", "rt", newline="") as f:
        samples = {}
        for row in csv.DictReader(f):
            samples.setdefault(row["label"], row)
            if len(samples) == 2:
                break
    for label, name in (("1", "Positive test window"), ("0", "Negative test window")):
        r = samples[label]
        add(name, r["chrom"], int(r["start"]), r["sequence"].upper())
    with (FIX / "chr21_30000001_35000000.fa").open() as f:
        next(f)
        patch = "".join(line.strip() for line in f).upper()
    with (FIX / "CompactLightGBM_shared_regions.csv").open(newline="") as f:
        anchor = next(int(r["start"]) for r in csv.DictReader(f)
                      if r["chrom"] == "chr21" and 30_000_400 <= int(r["start"]) < 34_999_600)
    for size in (100_000, 500_000):
        start = max(0, (anchor - 30_000_000 - size // 2) // STRIDE * STRIDE)
        add(f"Chromosome 21 · {size // 1000} kb", "chr21", 30_000_000 + start, patch[start:start + size])
        assert items[-1]["expected_regions"]
    target = ROOT / "static/data/examples.json"
    target.parent.mkdir(exist_ok=True, parents=True)
    target.write_text(json.dumps(items, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
