"""Verified native Booster. Only NumPy, SciPy and LightGBM are needed for scoring."""

import hashlib
from itertools import batched

import lightgbm as lgb
import numpy as np

from .features import compact_features
from .settings import BATCH_SIZE, MODEL_FILE, MODEL_SHA256, N_FEATURES


def load_model(path=MODEL_FILE):
    with path.open("rb") as source:
        if hashlib.file_digest(source, "sha256").hexdigest() != MODEL_SHA256:
            raise ValueError("Compact82 model SHA-256 mismatch")
    booster = lgb.Booster(model_file=str(path))
    if booster.num_feature() != N_FEATURES:
        raise ValueError("Compact82 model feature count mismatch")
    return booster


def predict_batches(booster, sequences):
    for batch in batched(sequences, BATCH_SIZE):
        matrix = compact_features(batch)
        yield booster.predict(matrix).astype(np.float32)
