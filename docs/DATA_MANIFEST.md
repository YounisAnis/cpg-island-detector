# Data manifest

All source paths are absolute. File digests use SHA-256.

| Repo path | Source | Source SHA-256 | Repo SHA-256 |
| --- | --- | --- | --- |
| model/compact82_booster.txt | D:/04_Dataset/compact82_booster.txt | ee1852d5e2bed2ad25e9d1b928e8472ad3427f159b0271590c3f01c744873a8d | ee1852d5e2bed2ad25e9d1b928e8472ad3427f159b0271590c3f01c744873a8d |
| tests/fixtures/compact82_test_scores.npy | D:/04_Dataset/compact82_test_scores.npy | f29e13279561c91d20107230fc6196dbbe4697c4c450a797574b199bbda221e1 | f29e13279561c91d20107230fc6196dbbe4697c4c450a797574b199bbda221e1 |
| tests/fixtures/test_windows.csv.gz | D:/04_Dataset/02/final_dataset/data/unified/test_windows.csv | 9e5a36dca05b7fde80d710603d62911eb650a0d78a658591f90d9aed8410fa85 | 6f2db0de90f32b1bf5d5517411a8e7a5b3bd1fb025dd05f15030878a2d67543c |

## Read-only reference

Pipeline source: D:/04_Dataset/02/final_dataset/src/results/audit_revision_v2/sessions/20261102T064355998742Z_core/pipeline_source_finish.py

SHA-256: 90b9f00f2369e10c0a0a93fa1fc8ae73b9f08ea5a9d4a39b66ab21ef7344613c

Original model (identity only): D:/04_Dataset/02/final_dataset/models/audit_revision_v2/models/compact82_4f086816606c770cc9a1.joblib

SHA-256: c9c5bbd13f4ea6b303391254f45fdea3e541a825dea2f732b949022304fec043

## M3 region fixtures

- tests/fixtures/CompactLightGBM_shared_regions.csv from D:/04_Dataset/02/final_dataset/results/audit_revision_v2/tables/CompactLightGBM_shared_regions.csv. Source and copy SHA-256 42895d34bf0e261908f0537f362d842098a64009035fd51d6917a1e425626e54.
- tests/fixtures/chr21_30000001_35000000.fa from D:/04_Dataset/02/final_dataset/data/hg38-001.fa, indexed by D:/04_Dataset/02/final_dataset/data/hg38.fa.fai, chr21 [30000000, 35000000). Original case preserved. FASTA SHA-256 5be01555d98347fdb3714dc84c6f77c9d8bc774adcf32c6f7a8fa06f5baf5e51. Index SHA-256 3b425de206296a5c8053023fa5ca61da43cfe78c1737c12e58c83367c7e83c21. Serialized patch SHA-256 edb3984201af354cd6dbbdd356a312d140bcb71aa9e776f40216f47ff9a2f325.

## M5 evaluation fixtures

- tests/fixtures/Neural8_regions.csv from D:/04_Dataset/02/final_dataset/results/audit_revision_v2/tables/Neural8_regions.csv. Source and copy SHA-256 8b26603e229b63460ccd4d5dbe840345183f7178f1f067d0992bfcbd6d725c2c.
- tests/fixtures/cpgIslandExt_hg38.bed from D:/04_Dataset/02/final_dataset/data/cpgIslandExt_hg38.bed. Source and copy SHA-256 0720d8675016544afc13926ce1989a0d06c7d7109509cb17f16606f4475d4e84.
- tests/fixtures/paper_numbers.json SHA-256 74feac7ae16c2ffdb3ed674fb028e9c1b4c5b67f1c8c588500e921e0008349be. Extracted from PDF table text. Each numeric cell carries its table identifier. Table 8 coverage additionally cites the adjacent paragraph in §3.4.
  - D:/04_Dataset/paper.pdf SHA-256 5af6fc5c5b4d79abe2668262ca53172cca60e478eaeb2b3447fc7f47252b9c1c.
  - D:/04_Dataset/supplementary.pdf SHA-256 c814982349c69b6ee0b69fb0c43eb30a75a459fa774594d8e04dcb09116e1ace.

## Supplied export utility

scripts/export_booster.py from D:/04_Dataset/export_booster.py (plan sections 7, 11 and 16). Source and copy SHA-256 5466eb4ff5e73c9b61cc31ad625690da6eb33614416be1abf38a4516610ee941.
