# CpG Island Detector source audit

Checked before implementation, 14 November 2026. All paths are inside `D:/04_Dataset/`. The dataset is `02/`. Only read-only access was used (including indexed reads of the genome). No fixture was copied. No model was run or unpickled. T1 and T5 are still pending.

## Original questions and what was found

| Item | Expected | What was found | Question |
| --- | --- | --- | --- |
| T3, plan §13 | Test row 29189 (zero-based) has one `N`. §17 only needs the row to contain `N`. | Of 51,502 rows, only one row has any `N`, which fits paper §2.3 (p. 4). That row has **17** `N` bases, so the description is off by 16. Its sequence matches the genome at chr22 [13,258,280, 13,258,480). Its stored float32 score is exactly `0.00041279863216914237`. | Should T3 check the real row with 17 `N` and that exact score? The rules in §1 and §5 and the T1 condition stay the same. |
| Export bundle location | §16 puts the Booster, expected scores and export helper inside the dataset. §7 says they come separately. | All three are in the workspace root. The Booster and score vector match the required SHA-256. No identical copy was found in `02/`. | Should the root files be the source? |
| Duplicate model, input and results paths | §17 says to choose a source when there are many. | Both joblibs, both windows CSVs, both annotation BEDs and both FASTA/index pairs match inside each group. Named region files and configs are identical across three trees. Two extra Compact files named `tuned` match the shared file byte for byte. Four archived neural files have the expected 5,459 geometries and hit-window counts, but 5,017 mean scores and 26 max scores differ from the named Neural8 fixture. Max differences are about 2.37e-7 and 1.19e-7. | Should we use the copies in `02/final_dataset/` for named fixtures and configs, and keep archived alternatives only in this inventory? |
| Reference source and config metadata | Follow §5 and the reference matching steps. Paper §2.7.4 puts median loose-match IoU before strict precision when validation strict F1 ties. | Saved JSONs list strict precision before median IoU. The source's `tune_regions` sort agrees with the paper. Both saved configs and Table 3 agree on every selected scan setting. All source snapshots agree on feature extraction, scanning, scoring, merging and greedy matching. Only the tie-breaker note for the old tuning run differs. | Should we use the final core snapshot below as the read-only reference, and use the paper/executable order when mentioning tuning? |
| Genome filename | §17 names `hg38.fa` and its index, or `chr21.fa`. | Two full genomes are named `hg38-001.fa`. Both match the dataset's recorded genome hash. Both `hg38.fa.fai` indexes point correctly to their FASTA. There is no separate `chr21.fa` or ready patch. The 5 Mb needed is available in both. | Should we cut the §13 patch from `02/final_dataset/data/hg38-001.fa` with its index? |
| Upload size wording | §6 says a file up to 1.5 MB. §§8–9 and §12 set the total HTTP body cap at 1,048,576 bytes. | The 1.5 MB file in §6 would already be over the cap, before JSON overhead. | Should we keep the 1,048,576-byte body cap and 500,000-base limit for API and UI? |
| Unlisted results in dataset | §17 allows only the listed fixtures. Paper Table 2 has a dash for Compact LightGBM Brier score. | `02/final_dataset/results/audit_revision_v2/tables/balanced_window_models_full_precision.csv` has a real Compact Brier number. There are also dense-scan, boundary and matching tables and cached arrays beyond §17. None are chosen as fixtures. | Should Table 2 keep the dash for Compact Brier, and should extra tables stay out of the repo? |
| Citation metadata | §16 says the user will give authors and venue. | Authors and venue are **not in the sources**. Only the title is. §16 already allows a placeholder at M5. | If you give authors and venue later, should we use the §16 placeholder until M5? |

## Confirmed decisions, 14 November 2026

- T3 uses the only window with N, zero-based row 29189. Its 17 N bases map to code 4 and its exact float32 score is 0.00041279863216914237. T1 needs exact float32 equality on all 51,502 predictions.
- Use the supplied root exports, the named final_dataset fixtures and the final core reference snapshot. Archived CSVs are left out of fixtures, metrics and presentation.
- Comparing the named neural fixture with the archived alternatives, the max differences were 2.368902548566254e-07 (score_mean) and 1.1920928955078125e-07 (score_max). For each archived copy, 0 of 5,459 rows went above 1e-5 in either column. Intervals and hit counts agree. Neural region score columns are not used by the live tool or the Results page.
- For tuning history, the paper and executable sort put median IoU before strict precision. The saved JSON notes have the two reversed. All selected settings agree. The original configs are kept as they are.
- API limits are 1,048,576 body bytes and 500,000 bases. The 1.5 MB wording in §6 is replaced.
- Keep the missing Compact Brier in Table 2 as a dash. Use the title from paper.pdf and the placeholder "abhi shamil nahi" for authors and venue.
- The app repo and its docs live at `D:/cpg-island-detector`.

## Section 17 inventory

Physical source folders (a reference to one folder means all copies in that group):

| Group | Folders |
| --- | --- |
| Data | `02/final_dataset/data/` and `02/datasets/` |
| Results | `02/final_dataset/results/audit_revision_v2/`, `02/results/audit_revision_v2/` and `02/_quarantine_to_delete/results/CpG_Core_Experiments_Outputs/` |
| Models | `02/final_dataset/models/audit_revision_v2/models/` and `02/results/audit_revision_v2/models/` |

| §17 row | Sources found | Check |
| --- | --- | --- |
| LightGBM Booster | `compact82_booster.txt` in workspace root | SHA-256 `ee1852d5e2bed2ad25e9d1b928e8472ad3427f159b0271590c3f01c744873a8d`. 1,776,680 bytes, 500 tree records, 82 feature names from Column_0 to Column_81, binary objective. |
| Expected scores | `compact82_test_scores.npy` in workspace root | SHA-256 `f29e13279561c91d20107230fc6196dbbe4697c4c450a797574b199bbda221e1`. Shape (51,502,), float32, 22,538 scores at or above 0.99. |
| Original model (identity only) | `compact82_4f086816606c770cc9a1.joblib` in both Models folders | Both are 1,778,676 bytes with SHA-256 `c9c5bbd13f4ea6b303391254f45fdea3e541a825dea2f732b949022304fec043`. |
| Reference code | Exact filenames and named start/finish snapshots are listed below. Proposed source: `02/final_dataset/src/results/audit_revision_v2/sessions/20261102T064355998742Z_core/pipeline_source_finish.py` | SHA-256 `90b9f00f2369e10c0a0a93fa1fc8ae73b9f08ea5a9d4a39b66ab21ef7344613c`. Matches §5 on locked feature order, 200/50 scan, ambiguity cutoff, hit threshold, gap, centre geometry, minimum length and hit-only statistics. |
| Test windows | `unified/test_windows.csv` in both Data folders | SHA-256 `9e5a36dca05b7fde80d710603d62911eb650a0d78a658591f90d9aed8410fa85`. Columns `chrom,start,end,sequence,label`. All 51,502 sequences are 200 bp. 25,635 positive, 25,867 negative. See T3 above. |
| Region CSVs | `tables/Neural8_regions.csv` and `tables/CompactLightGBM_shared_regions.csv` in all three Results folders, plus the archived names below | Neural SHA-256 `8b26603e229b63460ccd4d5dbe840345183f7178f1f067d0992bfcbd6d725c2c`, 5,459 rows. Compact SHA-256 `42895d34bf0e261908f0537f362d842098a64009035fd51d6917a1e425626e54`, 5,121 rows. Both have columns `chrom,start,end,length,score_mean,score_max,n_windows`. |
| Annotation | `cpgIslandExt_hg38.bed` in both Data folders | SHA-256 `0720d8675016544afc13926ce1989a0d06c7d7109509cb17f16606f4475d4e84`, matching the dataset manifest. Four tab-separated fields (chromosome, start, end, name). 32,038 rows overall, 4,522 on chr19–22, of which 614 are shorter than 250 bp. |
| Locked configs | `configs/Neural8_locked_config.json` and `configs/CompactLightGBM_locked_config.json` in all three Results folders | Neural SHA-256 `2a658bf7ec7b224cc0c1a64128ffa8c2a49e1bee9ed58853b640bfd24ff7f925`. Compact SHA-256 `555d942ab028d86ce7c1562cf183780c095c183edecfee910ce255ac7f690d0b`. Both use width 200, stride 50, threshold 0.99, gap 100, centre geometry, zero offsets, minimum length 150. |
| Genome | `hg38-001.fa` and `hg38.fa.fai` in both Data folders | Full FASTA SHA-256 `5be01555d98347fdb3714dc84c6f77c9d8bc774adcf32c6f7a8fa06f5baf5e51`. Index SHA-256 `3b425de206296a5c8053023fa5ca61da43cfe78c1737c12e58c83367c7e83c21`. chr21 header and chromosome end checked at indexed offsets, chromosome length 46,709,983 bp. Both give identical bases for 0-based [30,000,000, 35,000,000). SHA-256 of uppercase bases only: `33e2d01bca7fdd67d1f0bfb883a2865b042158ad9b87995bc6f44f7597fa5459`. The Compact CSV has 47 interior records under the §13 filter, lengths 150–3,300 bp. This is the expected side of T5. |
| Paper numbers | `paper.pdf` and `supplementary.pdf` in workspace root. PDFs inside `02/` are figure outputs. | Paper SHA-256 `5af6fc5c5b4d79abe2668262ca53172cca60e478eaeb2b3447fc7f47252b9c1c`. PDF pp. 11, 13 and 14 have Tables 2/3, 5/6 and 7/8. Supplement SHA-256 `c814982349c69b6ee0b69fb0c43eb30a75a459fa774594d8e04dcb09116e1ace`. PDF pp. 3–4 have Tables S3/S4/S5 and S6/S7/S8. The 2,593 boundary count is in paper §3.4 next to Table 8. |

## Other candidate paths

### Region tables

These two files are byte-identical to the named Compact shared-regions CSV:

- `02/_quarantine_to_delete/results/audit_revision_v2/tables/CompactLightGBM_tuned_regions.csv`
- `02/_quarantine_to_delete/results/CpG_Core_Experiments_Outputs/tables/CompactLightGBM_tuned_regions.csv`

These four archived neural files share SHA-256 `b777160e2bdce3505f2eea6f6f25121fa31eaac461e97aeb1138e706999d01f1`. Their differences from the named fixture are described above:

- `02/_quarantine_to_delete/results/final_analysis/region_predictions/cnn_test_regions.csv`
- `02/_quarantine_to_delete/results/final_analysis/region_predictions/regions_Neural_network_this_work.csv`
- `02/_quarantine_to_delete/results/final_evaluation_v3/region_predictions/cnn_test_regions.csv`
- `02/_quarantine_to_delete/results/final_evaluation_v3/region_predictions/regions_Neural_network_this_work.csv`

### Reference source

The eleven `pipeline_source*.py` files form three groups of identical files. Files in the same group share the same full-file SHA-256.

**Group 1: `90b9f00f2369e10c0a0a93fa1fc8ae73b9f08ea5a9d4a39b66ab21ef7344613c`**

- `02/final_dataset/src/results/audit_revision_v2/sessions/20261102T064355998742Z_core/pipeline_source_finish.py`
- `02/results/audit_revision_v2/sessions/20261102T064355998742Z_core/pipeline_source_finish.py`
- `02/_quarantine_to_delete/results/audit_revision_v2/sessions/20261102T064355998742Z_core/pipeline_source_start.py`

**Group 2: `77246311fd12785f7df9337af99cb9843ca67473b11a5fb0479fe7a3d8e84d74`**

- `02/final_dataset/src/results/audit_revision_v2/sessions/20261102T042031810233Z_experiments/pipeline_source_finish.py`
- `02/results/audit_revision_v2/sessions/20261102T042031810233Z_experiments/pipeline_source_finish.py`
- `02/_quarantine_to_delete/results/audit_revision_v2/sessions/20261102T042031810233Z_experiments/pipeline_source_start.py`
- `02/_quarantine_to_delete/results/audit_revision_v2/sessions/20261102T064355998742Z_core/before/pipeline_source.py`
- `02/_quarantine_to_delete/pipeline_source(1).py`

**Group 3: `b35c625bee39b1d0f58c0bda2408b145576efde6bf4f60621d392208c238d555`**

- `02/_quarantine_to_delete/pipeline_source.py`
- `02/_quarantine_to_delete/results/CpG_Core_Experiments_Outputs/pipeline_source.py`
- `02/_quarantine_to_delete/results/audit_revision_v2/sessions/20261102T042031810233Z_experiments/before/pipeline_source.py`

Eight more archived Python files have the same function bodies. The syntax comparison covered `compact_features`, `scan_positions`, `predict_sequences`, `merge_windows`, `regions_from_scan`, `overlap_candidates`, `match_intervals` and `boundary_and_length`:

- `02/_quarantine_to_delete/audit_guide/notebook_sources/26f3125ed175.py`
- `02/_quarantine_to_delete/audit_guide/notebook_sources/77246311fd12.py`
- `02/_quarantine_to_delete/audit_guide/notebook_sources/90b9f00f2369.py`
- `02/_quarantine_to_delete/audit_guide/notebook_sources/b35c625bee39.py`
- `02/_quarantine_to_delete/project_audit/CpG_Island_Detection_Audit_Revised_Colab_T4 (1).py`
- `02/_quarantine_to_delete/project_audit/CpG_Island_Detection_Audit_Revised_Colab_T4.py`
- `02/_quarantine_to_delete/project_audit/CpG_Island_Detection_Audit_Revised_Colab_T4_runned_file.py`
- `02/_quarantine_to_delete/project_audit/CpG_Island_Detection_PostRun_Corrected_Colab_T4.py`
