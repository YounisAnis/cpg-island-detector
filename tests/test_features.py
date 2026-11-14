import numpy as np

from app.features import BASE_LOOKUP, compact_features


def test_feature_slots_with_ambiguity():
    x, = compact_features(["ACG" + "N" * 197])
    assert x.dtype == np.float32 and x.shape == (82,)
    assert x[1] == x[6] == np.float32(1 / 199)
    assert x[16 + 6] == np.float32(1 / 198)
    assert x[80] == np.float32(2 / 200) and x[81] == 200
    assert np.count_nonzero(x) == 5
    assert BASE_LOOKUP[ord("U")] == BASE_LOOKUP[ord("N")] == 4
