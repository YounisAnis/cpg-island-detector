import csv
from pathlib import Path

from app.fasta import Record
from app.model import load_model
from app.pipeline import scan_record

FIXTURES = Path(__file__).parent / "fixtures"
OFFSET = 30_000_000


def test_t5_full_chr21_patch():
    with (FIXTURES / "chr21_30000001_35000000.fa").open() as stream:
        assert stream.readline().strip() == ">chr21:30000001-35000000"
        sequence = "".join(line.strip() for line in stream).upper()
    assert len(sequence) == 5_000_000
    scan = scan_record(load_model(), Record("chr21", sequence))
    got = [r for r in scan["regions"] if r["start"] >= 400 and r["end"] <= len(sequence) - 400]
    with (FIXTURES / "CompactLightGBM_shared_regions.csv").open(newline="") as stream:
        expected = [r for r in csv.DictReader(stream) if r["chrom"] == "chr21"
                    and int(r["start"]) >= 30_000_400 and int(r["end"]) <= 34_999_600]
    assert len(got) == len(expected) == 47
    for actual, reference in zip(got, expected, strict=True):
        assert actual["start"] + OFFSET == int(reference["start"])
        assert actual["end"] + OFFSET == int(reference["end"])
        assert actual["n_windows"] == int(reference["n_windows"])
        for col in ("score_mean", "score_max"):
            assert abs(actual[col] - float(reference[col])) <= 1e-5
