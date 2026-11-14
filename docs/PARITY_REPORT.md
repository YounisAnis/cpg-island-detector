# Parity report

## M1 — core modules

Passed on Windows using Python 3.13.13, NumPy 2.1.3, SciPy 1.16.3 and LightGBM 4.6.0. The standalone T1 gate passed before T2–T4. The complete core suite then passed all 18 tests.

| Test | Evidence |
| --- | --- |
| T1 | 51,502 model predictions matched the supplied float32 vector exactly with np.array_equal. Zero mismatches. |
| T2 | At 0.5, TP 25,327, TN 25,090, FP 777, FN 308. F1 0.9790, MCC 0.9580 and AP 0.9978 at the plan's precision. |
| T3 | Row 29189 was the only N-containing window. It had 17 N bases, mapped to code 4. The predicted float32 score equalled 0.00041279863216914237. |
| T4 | Inclusive threshold, 100 bp merge gap and split above it, centre endpoints, clipping, hit-only summaries, singletons, 150 bp minimum, partial tails and 20/21 ambiguous bases passed. |

## M2 — FastAPI

T7 passed all 12 API cases. The local Uvicorn socket check returned HTTP 200 for health, config and detect. After scoring, TensorFlow, pandas and scikit-learn were absent from the process. Starlette emitted a deprecation warning for the HTTPX test client.

## M3 — chr21 end-to-end

T5 passed. The full 5,000,000-base hg38 patch was scanned through the core pipeline. All 47 interior intervals matched the named Compact CSV in genomic start, end and hit-window count. Mean and maximum model score differences for each interval were within 1e-5.

## M4 — Detect page

Chrome exercised all four real examples against local Uvicorn. The positive and negative 200 bp windows had zero regions, the 100 kb example had one, and the 500 kb example had two. Counts matched examples.json. Verified file upload, multi-record selection, sorting, row-to-track highlighting, CSV/BED/JSON downloads, input error display and the waking banner with Run disabled. A 390 px mobile viewport had no page overflow.

## M5 — Results and Method pages

T6 passed on regenerated JSON. The named CSV and BED fixtures reproduce the primary region metrics and the applicable per-chromosome, boundary and length results in Tables 5–8 and S3/S6/S7/S8. Neural loose boundaries yielded 4,049 pairs, medians +10/-6 bp and 2,593 pairs within 100 bp at both ends. Compact derived values were 3,955 pairs, +18/-14 bp and 2,553 within 100 bp. Independent held-out window metrics matched the Compact row of Table 2. PDF-only entries retain their table provenance, including the unreported Compact Brier value.

## M6 — local deployment handoff

The owner will create the GitHub repository, push the commit and apply the Render Blueprint. The live T8 smoke test, cold-start timing and free-instance benchmarks await the owner deployment. Instructions and the smoke runner are in the repository.

Pre-commit verification passed all 32 tests. The HTTPX test-client deprecation was the sole warning. The local smoke runner returned health and config successfully and matched all four examples. On this local Windows machine, the 100 kb and 500 kb examples reported server times of 300 ms and 1,231 ms, respectively. Live Render T8 remains pending.
