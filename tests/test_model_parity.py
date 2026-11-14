import csv
import gzip
from pathlib import Path

import numpy as np
import pytest

from app.model import load_model, predict_batches

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture(scope="module")
def window_rows():
    with gzip.open(FIXTURES / "test_windows.csv.gz", "rt", newline="") as stream:
        return list(csv.DictReader(stream))


@pytest.fixture(scope="module")
def actual(window_rows):
    return np.concatenate(list(predict_batches(load_model(), (r["sequence"] for r in window_rows))))


def test_t1_exact_float32_scores(actual):
    expected = np.load(FIXTURES / "compact82_test_scores.npy", allow_pickle=False)
    assert actual.shape == expected.shape == (51502,)
    assert actual.dtype == expected.dtype == np.float32
    assert np.array_equal(actual, expected), (
        f"{np.count_nonzero(actual != expected)} mismatches, "
        f"maximum absolute difference {np.max(np.abs(actual - expected))}"
    )

def test_t2_window_metrics(actual, window_rows):
    import math

    labels = np.asarray([int(r["label"]) for r in window_rows])
    hit = actual >= 0.5
    tp, tn, fp, fn = [int(np.count_nonzero(mask)) for mask in
                      (hit & (labels == 1), ~hit & (labels == 0), hit & (labels == 0), ~hit & (labels == 1))]
    assert (tp, tn, fp, fn) == (25327, 25090, 777, 308)
    assert round(2 * tp / (2 * tp + fp + fn), 4) == 0.9790
    mcc = (tp * tn - fp * fn) / math.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn))
    assert round(mcc, 4) == 0.9580
    # Group tied scores before integrating the precision-recall staircase.
    order = np.argsort(-actual, kind="stable")
    ends = np.r_[np.flatnonzero(np.diff(actual[order])), len(labels) - 1]
    cumulative = np.cumsum(labels[order])[ends]
    ap = np.sum(np.diff(np.r_[0, cumulative]) * (cumulative / (ends + 1))) / cumulative[-1]
    assert round(float(ap), 4) == 0.9978


def test_t3_only_n_window(actual, window_rows):
    from app.features import BASE_LOOKUP

    assert [i for i, r in enumerate(window_rows) if "N" in r["sequence"].upper()] == [29189]
    assert window_rows[29189]["sequence"].upper().count("N") == 17
    assert BASE_LOOKUP[ord("N")] == 4
    assert actual[29189] == np.float32(0.00041279863216914237)
