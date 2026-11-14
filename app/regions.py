import numpy as np

from .settings import MERGE_GAP, MIN_LENGTH, THRESHOLD, WIDTH


def merge_windows(starts, scores, length, record_id):
    hits = np.flatnonzero(scores >= THRESHOLD)
    if not len(hits):
        return []
    breaks = np.flatnonzero(np.diff(starts[hits]) - WIDTH > MERGE_GAP) + 1
    regions = []
    for group in np.split(hits, breaks):
        start = max(0, int(starts[group[0]]) + WIDTH // 2)
        end = min(length, int(starts[group[-1]]) + WIDTH // 2)
        if end <= start or end - start < MIN_LENGTH:
            continue
        regions.append({
            "id": record_id, "start": start, "end": end, "length": end - start,
            "score_mean": float(scores[group].mean()), "score_max": float(scores[group].max()),
            "n_windows": len(group),
        })
    return regions
