# Compact LightGBM

The live detector loads a native binary-objective LightGBM Booster from `compact82_booster.txt`. SHA-256 is checked at startup. It has 500 trees and 82 features. T1 verifies feature order and exact float32 prediction parity.

| Artifact | SHA-256 |
| --- | --- |
| Supplied Booster | ee1852d5e2bed2ad25e9d1b928e8472ad3427f159b0271590c3f01c744873a8d |
| Original compact82_4f086816606c770cc9a1.joblib | c9c5bbd13f4ea6b303391254f45fdea3e541a825dea2f732b949022304fec043 |

The original classifier used LightGBM 4.6.0 and scikit-learn 1.6.1. The supplied one-time export helper calls the fitted classifier's booster_.save_model method. Live inference uses LightGBM 4.6.0, NumPy 2.1.3 and SciPy 1.16.3 with Python 3.13. The original classifier stays in the external read-only dataset. [Source paths and hashes](../docs/DATA_MANIFEST.md)

The features are dinucleotide frequencies, trinucleotide frequencies, GC content and observed-to-expected CpG, in that order. Scan settings and the forward-strand scope follow the plan. Compact was selected by strict region F1. Neural results are static. Scores represent model output. Pasted sequences have no reference annotation for computing accuracy. The benchmark used human hg38 and UCSC cpgIslandExt, and test-set independence during development was not established.
