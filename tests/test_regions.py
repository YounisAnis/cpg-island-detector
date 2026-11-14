import numpy as np
import pytest

from app.regions import merge_windows


@pytest.mark.parametrize("hits,expected", [
    ([0, 50, 100, 150], [(100, 250, 4)]),
    ([0, 50, 100], []),
    ([0, 50, 100, 150, 450, 500, 550, 600], [(100, 700, 8)]),
    ([0, 50, 100, 150, 500, 550, 600, 650], [(100, 250, 4), (600, 750, 4)]),
    ([0], []), ([], []),
])
def test_t4_groups(hits, expected):
    starts = np.arange(0, 651, 50)
    scores = np.where(np.isin(starts, hits), 0.99, 0.0).astype(np.float32)
    regions = merge_windows(starts, scores, 850, "chr")
    assert [(r["start"], r["end"], r["n_windows"]) for r in regions] == expected
    for r in regions:
        assert r["score_mean"] == pytest.approx(0.99)
        assert r["score_max"] == np.float32(0.99)


def test_clip_and_length_filter():
    starts = np.array([-100, 0, 50, 100, 150])
    scores = np.ones(len(starts), dtype=np.float32)
    assert merge_windows(starts, scores, 200, "chr")[0]["length"] == 200
    assert merge_windows(starts, scores, 149, "chr") == []
