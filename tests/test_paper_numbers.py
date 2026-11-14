import json
from pathlib import Path

import pytest

from scripts.build_results_json import build, plain

ROOT = Path(__file__).resolve().parents[1]


def test_t6_source_and_independent_region_parity():
    summary, hist = build()
    for filename, data in (("results_summary",summary),("boundary_hist",hist)):
        assert json.loads((ROOT/f"static/data/{filename}.json").read_text(encoding="utf-8")) == data
    fixture = json.loads((ROOT/"tests/fixtures/paper_numbers.json").read_text(encoding="utf-8"))
    for table, item in fixture.items():
        for row in item["rows"]:
            assert all(isinstance(v,str) or (v["table"]==table and "value" in v) for v in row)
    tables = plain(fixture)
    assert summary["tables"] == tables
    comp, neural = (summary["models"][n] for n in ("Compact","Neural"))
    assert (comp["predictions"],neural["predictions"],comp["islands"]) == (5121,5459,4522)
    for k,v in tables["Table 3"]["settings"].items():
        assert summary["parameters"][k] == v
    win = next(r for r in tables["Table 2"]["rows"] if r[0].startswith("Compact"))
    assert [round(summary["balanced_compact"][k],3) for k in ("f1","mcc","ap")] == win[1:4]
    assert win[4] is None
    for name, *metrics in tables["Table 5"]["rows"][:2]:
        model = comp if name.startswith("Compact") else neural
        assert [round(model["cutoffs"][c][k],3) for c in ("0.5","0.0") for k in ("precision","recall","f1")] == metrics
    for tab in ("Table 6","Table S6","Table S3"):
        for label,*values in tables[tab]["rows"]:
            cutoff = "0.0" if "overlap" in label else str(float(label.split()[-1]))
            keys = ("tp","maximum_cardinality") if tab=="Table S3" else ("tp","fp","fn","f1")
            assert [round(m["cutoffs"][cutoff][k],3) for m in (neural,comp) for k in keys] == values
    for rule, chrom, islands, *values in tables["Table 7"]["rows"]:
        assert comp["chromosomes"][rule][chrom].get("islands") == islands
        assert [round(m["chromosomes"][rule][chrom][k],3) for m in (neural,comp) for k in ("precision","recall","f1")] == values
    for chrom,*values in tables["Table S7"]["rows"]:
        assert [round(m["chromosomes"]["Strict"][chrom][k],3) for m in (neural,comp) for k in ("precision","recall","f1")] == values
    b = neural["boundary"]
    assert [b["pairs"],*b["signed"],b["absolute"][0]] == [r[1] for r in tables["Table 8"]["rows"]]
    assert b["absolute"][0] == b["absolute"][1]
    cover = tables["Table 8"]["adjacent_text"]
    assert b["within"] == cover["both_within"] == cover["both_within_all"]
    assert round(b["pair_percent"],1)==cover["pair_percent"] and round(b["all_percent"],1)==cover["all_percent"]
    for row, data in zip(tables["Table S8"]["rows"],neural["length"],strict=True):
        assert row[1:] == [data["recovered"],data["islands"],round(data["recall"],3)]
    assert [r["recovered"] for r in comp["length"]] == [317,648,717,1366,907]
    assert [round(r["recall"],3) for r in comp["length"]] == [.516,.750,.947,.991,.999]
    b = comp["boundary"]
    assert (b["pairs"],b["signed"],b["absolute"],b["within"]) == (3955,[18,-14],[47,46],2553)
    assert [round(b[k],1) for k in ("pair_percent","all_percent")] == [64.6,56.5]
    assert [neural["boundary"]["pairs"]-sum(hist["Neural"][k]) for k in ("start","end")] == [286,290]
