"""Build the static evaluation from approved fixtures. Run from any directory."""

from bisect import bisect_left, bisect_right
from collections import defaultdict
import csv
import gzip
import json
from pathlib import Path
import sys

import numpy as np
from scipy.sparse import csr_matrix
from scipy.sparse.csgraph import maximum_bipartite_matching

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app.settings import PARAMETERS

FIX = ROOT / "tests/fixtures"
MODELS = {"Neural": "Neural8_regions.csv", "Compact": "CompactLightGBM_shared_regions.csv"}
CHROMS = ("chr19", "chr20", "chr21", "chr22")
CUTOFFS = (0.0, 0.10, 0.25, 0.50, 0.75)
BINS = ("<250", "250–349", "350–499", "500–999", "≥1000")


def load_intervals():
    truth = []
    with (FIX / "cpgIslandExt_hg38.bed").open(newline="") as stream:
        for chrom, start, end, _ in csv.reader(stream, delimiter="\t"):
            if chrom in CHROMS:
                truth.append((chrom, int(start), int(end)))
    return truth


def overlaps(predictions, reference):
    # IDs refer to original fixture row positions. Prefix max ends also handle nested intervals.
    refs = defaultdict(list)
    for rid, (chrom, start, end) in enumerate(reference):
        refs[chrom].append((start, end, rid))
    indices = {}
    for chrom, entries in refs.items():
        entries.sort()
        indices[chrom] = (entries, [r[0] for r in entries], np.maximum.accumulate([r[1] for r in entries]))
    pairs = []
    for pid, (chrom, ps, pe) in enumerate(predictions):
        entries, starts, max_ends = indices[chrom]
        for ts, te, rid in entries[bisect_right(max_ends, ps):bisect_left(starts, pe)]:
            intersection = min(pe, te) - max(ps, ts)
            if intersection > 0:
                iou = intersection / (pe - ps + te - ts - intersection)
                pairs.append((-iou, chrom, ps, ts, pid, rid))
    return sorted(pairs)


def greedy(pairs):
    predictions, references, chosen = set(), set(), []
    for _, _, _, _, pid, rid in pairs:
        if pid not in predictions and rid not in references:
            predictions.add(pid)
            references.add(rid)
            chosen.append((pid, rid))
    return chosen


def metrics(tp, predicted, reference):
    return dict(tp=tp, fp=predicted-tp, fn=reference-tp,
                precision=tp/predicted, recall=tp/reference, f1=2*tp/(predicted+reference))


def balanced():
    scores = np.load(FIX / "compact82_test_scores.npy", allow_pickle=False)
    with gzip.open(FIX / "test_windows.csv.gz", "rt", newline="") as stream:
        y = np.asarray([int(r["label"]) for r in csv.DictReader(stream)])
    hit = scores >= 0.5
    tp, tn, fp, fn = (int(mask.sum()) for mask in (hit & (y == 1), ~hit & (y == 0),
                                                    hit & (y == 0), ~hit & (y == 1)))
    order = np.argsort(-scores, kind="stable")
    ends = np.r_[np.flatnonzero(np.diff(scores[order])), len(y)-1]
    positives = y[order].cumsum()[ends]
    return dict(f1=2*tp/(2*tp+fp+fn), mcc=(tp*tn-fp*fn)/((tp+fp)*(tp+fn)*(tn+fp)*(tn+fn))**0.5,
                ap=float(np.sum(np.diff(np.r_[0,positives])*positives/(ends+1))/positives[-1]))


def evaluate(filename, truth):
    with (FIX / filename).open(newline="") as stream:
        predictions = [(r["chrom"], int(r["start"]), int(r["end"])) for r in csv.DictReader(stream)]
    pairs = overlaps(predictions, truth)
    n, m = len(predictions), len(truth)
    out = dict(predictions=n, islands=m, cutoffs={}, chromosomes={})
    for cutoff in CUTOFFS:
        eligible = [p for p in pairs if -p[0] >= cutoff]
        chosen = greedy(eligible)
        graph = csr_matrix((np.ones(len(eligible), dtype=np.int8),
                            ([p[4] for p in eligible], [p[5] for p in eligible])), shape=(n, m))
        summary = metrics(len(chosen), n, m)
        summary["maximum_cardinality"] = int((maximum_bipartite_matching(graph, perm_type="column") >= 0).sum())
        out["cutoffs"][str(cutoff)] = summary
        if cutoff in (0.0, 0.5):
            per_chrom = {}
            for chrom in CHROMS:
                tp = sum(truth[rid][0] == chrom for _, rid in chosen)
                total = sum(r[0] == chrom for r in truth)
                per_chrom[chrom] = dict(islands=total, **metrics(tp, sum(p[0] == chrom for p in predictions), total))
            per_chrom["Macro"] = {k:float(np.mean([v[k] for v in per_chrom.values()])) for k in ("precision","recall","f1")}
            per_chrom["Pooled"] = dict(islands=m, **summary)
            out["chromosomes"]["Strict" if cutoff else "Loose"] = per_chrom
        if cutoff == 0:
            loose = chosen
    errors = np.array([(predictions[i][1]-truth[j][1], predictions[i][2]-truth[j][2]) for i,j in loose])
    within = int((np.abs(errors) <= 100).all(axis=1).sum())
    out["boundary"] = dict(pairs=len(loose), signed=np.median(errors,axis=0).tolist(),
                           absolute=np.median(np.abs(errors),axis=0).tolist(), within=within,
                           pair_percent=100*within/len(loose), all_percent=100*within/m)
    matched = {rid for _,rid in loose}
    bins = defaultdict(list)
    for i, (_,a,b) in enumerate(truth):
        bins[BINS[bisect_right((250,350,500,1000), b-a)]].append(i)
    out["length"] = [dict(label=key,islands=len(bins[key]),recovered=len(matched.intersection(bins[key])),
                          recall=len(matched.intersection(bins[key]))/len(bins[key])) for key in BINS]
    edges = np.arange(-300, 301, 10)
    hist = dict(edges=edges.tolist(), start=np.histogram(errors[:,0],bins=edges)[0].tolist(),
                end=np.histogram(errors[:,1],bins=edges)[0].tolist())
    return out,hist


def plain(value):
    if isinstance(value, dict):
        if "table" in value and "value" in value:
            return value["value"]
        return {k:plain(v) for k,v in value.items()}
    if isinstance(value, list):
        return [plain(v) for v in value]
    return value


def build():
    tables = plain(json.loads((FIX / "paper_numbers.json").read_text(encoding="utf-8")))
    truth = load_intervals()
    models, histograms = {}, {}
    for name, file in MODELS.items():
        models[name],histograms[name] = evaluate(file,truth)
    summary = dict(tables=tables, models=models, balanced_compact=balanced(),
                   parameters=PARAMETERS, derived_label="derived from supplied files")
    return summary,histograms


def main():
    for name,obj in zip(("results_summary","boundary_hist"),build(),strict=True):
        (ROOT / f"static/data/{name}.json").write_text(json.dumps(obj,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")


if __name__ == "__main__":
    main()
