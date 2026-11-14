import numpy as np

from .features import BASE_LOOKUP
from .settings import MAX_AMBIGUOUS, STRIDE, WIDTH


def encode_bases(sequence):
    return BASE_LOOKUP[np.frombuffer(sequence.encode("ascii"), np.uint8)]


def window_starts(code):
    positions = np.arange(0, len(code) - WIDTH + 1, STRIDE, dtype=np.int64)
    prefix = np.empty(len(code) + 1, np.int32)
    prefix[0] = 0
    np.cumsum(code >= 4, dtype=np.int32, out=prefix[1:])
    return positions[prefix[positions + WIDTH] - prefix[positions] <= MAX_AMBIGUOUS * WIDTH]
