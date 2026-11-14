# CpG Island Detector source audit

Pre-implementation inventory, 14 November 2026. All paths below are relative to `D:/04_Dataset/`. The dataset is `02/`. The checks used read-only access, including indexed reads of the genome. No fixture has been copied. No model was executed or unpickled. T1 and T5 are pending.

## Original questions and evidence

| Item | Expected | Found and difference | Sawal |
| --- | --- | --- | --- |
| T3, plan §13 | The zero-based test row 29189 contains one `N`. §17 only requires the row to contain `N`. | Among 51,502 rows, exactly one row contains any `N`, consistent with paper §2.3 (p. 4). That row contains **17** `N` bases. Its sequence matches the indexed genome at chr22 [13,258,280, 13,258,480). Its stored float32 score is exactly `0.00041279863216914237`. The difference is 16 bases in the description. | Kya T3 mein asli row ke 17 `N` aur wahi exact score check karein? §1 aur §5 ke rules aur T1 ki shart bilkul wahi rahengi. |
| Export bundle location | §16 places the Booster, expected scores and export helper inside the dataset. §7 describes a separate delivery. | All three are in the workspace root. The Booster and score vector match the prescribed SHA-256 values. No byte-identical copy of these exports was found in `02/`. | Kya root wali supplied files ko source maan lein? |
| Duplicate model, input and results paths | §17 requires source selection when there are multiple candidates. | Both joblibs, both windows CSVs, both annotation BEDs and both FASTA/index pairs match within each file group. The named region files and each named config are identical across three trees. Two additional Compact files named `tuned` match the shared file byte-for-byte. Four archived neural files have the expected 5,459 geometries and hit-window counts, but 5,017 mean scores and 26 maximum scores differ from the named Neural8 fixture. Maximum absolute differences are approximately 2.37e-7 and 1.19e-7, respectively. | Kya named fixtures aur configs ke liye `02/final_dataset/` ki copies lein, aur archived alternatives ko sirf is inventory tak rakhein? |
| Reference source and config metadata | The port must follow §5 and use the reference matching procedure. Paper §2.7.4 ranks median loose-match IoU ahead of strict precision when validation strict F1 ties. | The saved JSONs list strict precision ahead of median IoU. The source's executable `tune_regions` sort agrees with the paper. Both saved configs and Table 3 agree on every selected scan setting. The multiple source snapshots agree on feature extraction, scanning, scoring, merging and greedy matching. The difference concerns tie-breaker metadata for the historical tuning run. | Kya read-only port reference ke liye neeche wala final core snapshot lein aur tuning ka zikr ho to paper aur executable sort ki tarteeb use karein? |
| Genome filename | §17 names `hg38.fa` and its index, or `chr21.fa`. | Two complete genomes are named `hg38-001.fa`. Both match the dataset's recorded genome SHA-256. Both local `hg38.fa.fai` indexes address their matching FASTA correctly. There is no separate `chr21.fa` or ready-made patch. The requested 5 Mb is available in both sources. | Kya `02/final_dataset/data/hg38-001.fa` aur us ke saath wali index se §13 ka patch nikaalein? |
| Input upload size wording | §6 mentions a file of up to 1.5 MB. §§8–9 and §12 set the initial total HTTP body cap at 1,048,576 bytes. | The larger file described in §6 would already exceed the configured body cap, before JSON overhead. | Kya API aur UI ke liye §§8–9 ka 1,048,576-byte body cap aur 500,000-base limit hi rakhein? |
| Unlisted results in dataset | §17 permits only the listed fixtures. Paper Table 2 has a dash for the Compact LightGBM Brier score. | `02/final_dataset/results/audit_revision_v2/tables/balanced_window_models_full_precision.csv` also has a numerical Compact Brier value. There are dense-scan, boundary and matching output tables and cached arrays beyond §17. These sources have not been selected as fixtures. | Kya Table 2 mein Compact Brier ka dash jaisa hai waisa hi rakhein aur extra tables ko repo mein shamil na karein? |
| Citation metadata | §16 says the user will provide the authors and venue. | **Not in the sources** for the paper's byline and publication venue. The title is present. §16 already allows a placeholder at M5. | Authors aur venue baad mein dena chahein to M5 tak §16 ka placeholder use karein? |

## Confirmed decisions, 14 November 2026

- T3 uses the only N-containing window, zero-based row 29189. Its 17 N bases map to code 4 and its exact float32 score is 0.00041279863216914237. T1 requires exact float32 equality across 51,502 predictions.
- Use the supplied root exports, named final_dataset fixtures and the final core reference snapshot. Archived CSVs are excluded from fixtures, metrics and presentation.
- The pre-implementation comparison of the named neural fixture with the archived alternatives found maximum absolute differences of 2.368902548566254e-07 for score_mean and 1.1920928955078125e-07 for score_max. For each archived copy, 0 of 5,459 rows exceeded 1e-5 in either column. Intervals and hit counts agree. Neural region score columns are unused by the live tool and Results page.
- For tuning history the paper and executable sort place median IoU before strict precision. The saved JSON metadata reverses the two criteria. All selected settings agree. The original configs are preserved.
- The initial and confirmed API limits are 1,048,576 body bytes and 500,000 bases. The 1.5 MB wording in §6 is superseded.
- Preserve the missing Compact Brier entry in Table 2 as a dash. Use the title from paper.pdf and the placeholder “abhi shamil nahi” for authors and venue.
- The application repo and its documentation reside at D:/cpg-island-detector.

## Section 17 inventory

These are the physical source directories. References to each directory in the table specify all copies in that group.

| Group | Directories |
| --- | --- |
| Data | `02/final_dataset/data/` and `02/datasets/` |
| Results | `02/final_dataset/results/audit_revision_v2/`, `02/results/audit_revision_v2/` and `02/_quarantine_to_delete/results/CpG_Core_Experiments_Outputs/` |
| Models | `02/final_dataset/models/audit_revision_v2/models/` and `02/results/audit_revision_v2/models/` |

| §17 row | Sources found | Content check |
| --- | --- | --- |
| LightGBM Booster | `compact82_booster.txt` at workspace root | SHA-256 `ee1852d5e2bed2ad25e9d1b928e8472ad3427f159b0271590c3f01c744873a8d`. 1,776,680 bytes, 500 tree records, 82 feature names from Column_0 to Column_81, binary objective. |
| Expected scores | `compact82_test_scores.npy` at workspace root | SHA-256 `f29e13279561c91d20107230fc6196dbbe4697c4c450a797574b199bbda221e1`. Shape (51,502,), float32, 22,538 scores at or above 0.99. |
| Original model, identity only | Both Models directories contain `compact82_4f086816606c770cc9a1.joblib` | Both are 1,778,676 bytes with SHA-256 `c9c5bbd13f4ea6b303391254f45fdea3e541a825dea2f732b949022304fec043`. |
| Reference code | Exact filenames and named start/finish snapshots are listed below. Proposed source is `02/final_dataset/src/results/audit_revision_v2/sessions/20261102T064355998742Z_core/pipeline_source_finish.py`. | SHA-256 of proposed source `90b9f00f2369e10c0a0a93fa1fc8ae73b9f08ea5a9d4a39b66ab21ef7344613c`. Source checks agree with §5 on the locked feature order, 200/50 scan, ambiguity cutoff, hit threshold, gap, centre geometry, minimum length and hit-only statistics. |
| Test windows | `unified/test_windows.csv` in both Data directories | SHA-256 `9e5a36dca05b7fde80d710603d62911eb650a0d78a658591f90d9aed8410fa85`. Columns `chrom,start,end,sequence,label`. All 51,502 sequences are 200 bp. 25,635 positive and 25,867 negative. See T3 above. |
| Region CSVs | `tables/Neural8_regions.csv` and `tables/CompactLightGBM_shared_regions.csv` in all three Results directories, plus the archived names below | Neural SHA-256 `8b26603e229b63460ccd4d5dbe840345183f7178f1f067d0992bfcbd6d725c2c`, 5,459 rows. Compact SHA-256 `42895d34bf0e261908f0537f362d842098a64009035fd51d6917a1e425626e54`, 5,121 rows. Both schemas are `chrom,start,end,length,score_mean,score_max,n_windows`. |
| Annotation | `cpgIslandExt_hg38.bed` in both Data directories | SHA-256 `0720d8675016544afc13926ce1989a0d06c7d7109509cb17f16606f4475d4e84`, matching the dataset manifest. Four tab-separated fields (chromosome, start, end, name). 32,038 rows overall, 4,522 on chr19–22, of which 614 are shorter than 250 bp. |
| Locked configs | `configs/Neural8_locked_config.json` and `configs/CompactLightGBM_locked_config.json` in all three Results directories | Neural SHA-256 `2a658bf7ec7b224cc0c1a64128ffa8c2a49e1bee9ed58853b640bfd24ff7f925`. Compact SHA-256 `555d942ab028d86ce7c1562cf183780c095c183edecfee910ce255ac7f690d0b`. Both select width 200, stride 50, threshold 0.99, gap 100, centre geometry, zero offsets, minimum length 150. |
| Genome | `hg38-001.fa` and `hg38.fa.fai` in both Data directories | Full FASTA SHA-256 `5be01555d98347fdb3714dc84c6f77c9d8bc774adcf32c6f7a8fa06f5baf5e51`. Index SHA-256 `3b425de206296a5c8053023fa5ca61da43cfe78c1737c12e58c83367c7e83c21`. Verified chr21 header and chromosome end at indexed offsets, chromosome length 46,709,983 bp. Both return identical bases for 0-based [30,000,000, 35,000,000). SHA-256 of uppercase bases only `33e2d01bca7fdd67d1f0bfb883a2865b042158ad9b87995bc6f44f7597fa5459`. The Compact CSV has 47 interior records under the §13 filter, lengths 150–3,300 bp. This is the expected side of T5. |
| Paper numbers | `paper.pdf` and `supplementary.pdf` at workspace root. PDFs inside `02/` are figure outputs. | Paper SHA-256 `5af6fc5c5b4d79abe2668262ca53172cca60e478eaeb2b3447fc7f47252b9c1c`. PDF pp. 11, 13 and 14 contain Tables 2/3, 5/6 and 7/8. Supplement SHA-256 `c814982349c69b6ee0b69fb0c43eb30a75a459fa774594d8e04dcb09116e1ace`. PDF pp. 3–4 contain Tables S3/S4/S5 and S6/S7/S8. The 2,593 boundary count is in paper §3.4 adjacent to Table 8. |

## Additional candidate paths

### Region tables

The following two files are byte-identical to the named Compact shared-regions CSV.

- `02/_quarantine_to_delete/results/audit_revision_v2/tables/CompactLightGBM_tuned_regions.csv`
- `02/_quarantine_to_delete/results/CpG_Core_Experiments_Outputs/tables/CompactLightGBM_tuned_regions.csv`

The following four archived neural files share SHA-256 `b777160e2bdce3505f2eea6f6f25121fa31eaac461e97aeb1138e706999d01f1`. Their differences from the named fixture are recorded above.

- `02/_quarantine_to_delete/results/final_analysis/region_predictions/cnn_test_regions.csv`
- `02/_quarantine_to_delete/results/final_analysis/region_predictions/regions_Neural_network_this_work.csv`
- `02/_quarantine_to_delete/results/final_evaluation_v3/region_predictions/cnn_test_regions.csv`
- `02/_quarantine_to_delete/results/final_evaluation_v3/region_predictions/regions_Neural_network_this_work.csv`

### Reference source

The eleven files named `pipeline_source*.py` form three byte-identical groups. The paths in each group share the indicated full-file SHA-256.

**`90b9f00f2369e10c0a0a93fa1fc8ae73b9f08ea5a9d4a39b66ab21ef7344613c`**

- `02/final_dataset/src/results/audit_revision_v2/sessions/20261102T064355998742Z_core/pipeline_source_finish.py`
- `02/results/audit_revision_v2/sessions/20261102T064355998742Z_core/pipeline_source_finish.py`
- `02/_quarantine_to_delete/results/audit_revision_v2/sessions/20261102T064355998742Z_core/pipeline_source_start.py`

**`77246311fd12785f7df9337af99cb9843ca67473b11a5fb0479fe7a3d8e84d74`**

- `02/final_dataset/src/results/audit_revision_v2/sessions/20261102T042031810233Z_experiments/pipeline_source_finish.py`
- `02/results/audit_revision_v2/sessions/20261102T042031810233Z_experiments/pipeline_source_finish.py`
- `02/_quarantine_to_delete/results/audit_revision_v2/sessions/20261102T042031810233Z_experiments/pipeline_source_start.py`
- `02/_quarantine_to_delete/results/audit_revision_v2/sessions/20261102T064355998742Z_core/before/pipeline_source.py`
- `02/_quarantine_to_delete/pipeline_source(1).py`

**`b35c625bee39b1d0f58c0bda2408b145576efde6bf4f60621d392208c238d555`**

- `02/_quarantine_to_delete/pipeline_source.py`
- `02/_quarantine_to_delete/results/CpG_Core_Experiments_Outputs/pipeline_source.py`
- `02/_quarantine_to_delete/results/audit_revision_v2/sessions/20261102T042031810233Z_experiments/before/pipeline_source.py`

Eight more archived Python exports contain the same relevant function bodies. The syntax comparison covered `compact_features`, `scan_positions`, `predict_sequences`, `merge_windows`, `regions_from_scan`, `overlap_candidates`, `match_intervals` and `boundary_and_length`.

- `02/_quarantine_to_delete/audit_guide/notebook_sources/26f3125ed175.py`
- `02/_quarantine_to_delete/audit_guide/notebook_sources/77246311fd12.py`
- `02/_quarantine_to_delete/audit_guide/notebook_sources/90b9f00f2369.py`
- `02/_quarantine_to_delete/audit_guide/notebook_sources/b35c625bee39.py`
- `02/_quarantine_to_delete/project_audit/CpG_Island_Detection_Audit_Revised_Colab_T4 (1).py`
- `02/_quarantine_to_delete/project_audit/CpG_Island_Detection_Audit_Revised_Colab_T4.py`
- `02/_quarantine_to_delete/project_audit/CpG_Island_Detection_Audit_Revised_Colab_T4_runned_file.py`
- `02/_quarantine_to_delete/project_audit/CpG_Island_Detection_PostRun_Corrected_Colab_T4.py`
