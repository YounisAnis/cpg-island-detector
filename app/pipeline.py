from time import monotonic

import numpy as np

from . import settings as cfg
from .fasta import InputError, parse_records
from .model import predict_batches
from .regions import merge_windows
from .windows import encode_bases, window_starts


def check_deadline(deadline):
    if deadline is not None and monotonic() >= deadline:
        raise InputError(503, "time_budget_exceeded", "Time budget exceeded. Try a shorter sequence.")


def scan_record(booster, record, include_scores=False, deadline=None):
    seq = record.sequence
    code = encode_bases(seq)
    starts = window_starts(code)
    total = max(0, (len(seq) - cfg.WIDTH) // cfg.STRIDE + 1)
    scored = np.empty(len(starts), np.float32)
    cursor = 0
    check_deadline(deadline)
    sequences = (seq[int(s):int(s) + cfg.WIDTH] for s in starts)
    for batch in predict_batches(booster, sequences):
        scored[cursor:cursor + len(batch)] = batch
        cursor += len(batch)
        check_deadline(deadline)
    regions = merge_windows(starts, scored, len(seq), record.id)
    ambiguous = int(np.count_nonzero(code >= 4))
    warnings = []
    if ambiguous / len(seq) > cfg.MAX_AMBIGUOUS:
        warnings.append(f"{ambiguous / len(seq):.1%} of bases are ambiguous.")
    result = dict(id=record.id, length=len(seq), ambiguous_bases=ambiguous,
                  windows=dict(total=total, scored=len(starts), skipped=total - len(starts),
                               hit=int(np.count_nonzero(scored >= cfg.THRESHOLD))),
                  regions=regions, warnings=warnings)
    if include_scores:
        values = [None] * total
        for start, score in zip(starts, scored, strict=True):
            values[int(start) // cfg.STRIDE] = float(score)
        result["scores"] = dict(stride=cfg.STRIDE, width=cfg.WIDTH, values=values)
    check_deadline(deadline)
    return result


def detect(booster, payload):
    begin = monotonic()
    deadline = begin + cfg.MAX_SECONDS
    records = parse_records(payload.input, max_bases=cfg.MAX_BASES, max_records=cfg.MAX_RECORDS)
    output = []
    for record in records:
        item = scan_record(booster, record, payload.include_scores, deadline)
        for region in item["regions"]:
            region.pop("id")
            for key in ("score_mean", "score_max"):
                region[key] = round(region[key], 6)
        output.append(item)
    return dict(model=cfg.MODEL_INFO, parameters=cfg.PARAMETERS, records=output,
                timing_ms={"total": round((monotonic() - begin) * 1000)})
