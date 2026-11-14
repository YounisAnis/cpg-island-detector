"""Compact82 features in training order, evaluated over equal-length windows."""

import numpy as np

from .settings import N_FEATURES, WIDTH

BASE_LOOKUP = np.full(256, 4, np.int64)
for index, base in enumerate(b"ACGT"):
    BASE_LOOKUP[base] = index


def compact_features(sequences):
    result = np.zeros((len(sequences), N_FEATURES), np.float32)
    for row, sequence in enumerate(sequences):
        code = BASE_LOOKUP[np.frombuffer(sequence.upper().encode("ascii"), np.uint8)]
        if len(code) != WIDTH:
            raise ValueError(f"Compact82 expects {WIDTH} bases per window")
        for k, offset in ((2, 0), (3, 16)):
            n = len(code) - k + 1
            value = np.zeros(n, np.int64)
            valid = np.ones(n, bool)
            for j in range(k):
                part = code[j:j + n]
                valid &= part < 4
                value = value * 4 + part
            result[row, offset:offset + 4**k] = np.bincount(value[valid], minlength=4**k) / n
        nc = np.count_nonzero(code == 1)
        ng = np.count_nonzero(code == 2)
        ncg = np.count_nonzero((code[:-1] == 1) & (code[1:] == 2))
        result[row, 80] = (nc + ng) / len(code)
        result[row, 81] = ncg * len(code) / (nc * ng) if nc * ng else 0
    return result
