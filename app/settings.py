"""Locked scan and model parameters from the implementation plan."""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODEL_FILE = ROOT / "model" / "compact82_booster.txt"
MODEL_SHA256 = "ee1852d5e2bed2ad25e9d1b928e8472ad3427f159b0271590c3f01c744873a8d"
MODEL_NAME = "compact82"
N_FEATURES = 82
WIDTH = 200
STRIDE = 50
THRESHOLD = 0.99
MERGE_GAP = 100
MIN_LENGTH = 150
MAX_AMBIGUOUS = 0.10
BATCH_SIZE = 2000

# Deployment limits. The scientific parameters above are fixed.
import os

MAX_BASES = int(os.getenv("MAX_BASES", "500000"))
MAX_RECORDS = int(os.getenv("MAX_RECORDS", "10"))
MAX_BODY_BYTES = int(os.getenv("MAX_BODY_BYTES", "1048576"))
MAX_SECONDS = float(os.getenv("MAX_SECONDS", "25"))
BUSY_WAIT = 10
VERSION = "1.0.0"
PARAMETERS = {"window": WIDTH, "stride": STRIDE, "threshold": THRESHOLD, "merge_gap": MERGE_GAP,
              "min_region_length": MIN_LENGTH, "max_ambiguous_fraction": MAX_AMBIGUOUS,
              "geometry": "center", "coordinates": "0-based half-open", "strand": "forward only"}
MODEL_INFO = {"name": MODEL_NAME, "features": N_FEATURES, "sha256": MODEL_SHA256}
