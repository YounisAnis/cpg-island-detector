# CpG Island Detector

A FastAPI and vanilla JavaScript research demo for forward-strand CpG island detection on DNA or FASTA records. Compact LightGBM scores each eligible window. The detector returns record-relative, zero-based, half-open regions and a score track. Scores are model outputs. The Results page compares the paper's two primary models and labels Compact-specific derived statistics.

## Run locally

Use Python 3.13. Create a virtual environment, activate it, then run the following from the repository root.

```sh
python -m pip install -r requirements.txt
python -m uvicorn app.main:app
```

Open the local address printed by Uvicorn. Select the chromosome 21, 100 kb example, run detection, then select a region to highlight it on the track. The 200 bp examples demonstrate individual window scores.

## Verify

```sh
python -m pip install -r requirements-dev.txt
python -m pytest -x tests/test_model_parity.py::test_t1_exact_float32_scores
python -m pytest -x
```

Run the complete suite after T1 passes. T1 requires exact float32 equality for all 51,502 predictions. T5 scans a real 5 Mb chr21 fixture independently of the API input cap. T6 recomputes region matching and checks the static artifacts against table-tagged PDF data. The selected fixture source paths and hashes are in [DATA_MANIFEST.md](docs/DATA_MANIFEST.md). Decisions and test results are in [OPEN_QUESTIONS.md](docs/OPEN_QUESTIONS.md) and [PARITY_REPORT.md](docs/PARITY_REPORT.md).

To rebuild the committed static data from the fixtures:

```sh
python scripts/make_examples.py
python scripts/build_results_json.py
```

## Deploy from your GitHub account

1. Create an empty GitHub repository under the account and visibility you intend to use.
2. From this local repository, add its HTTPS URL as the remote and push the local main branch.

   ```sh
   git remote add origin YOUR_GITHUB_REPOSITORY_URL
   git push -u origin main
   ```

3. In Render, choose **New → Blueprint**, connect that repository, choose the main branch, and review the root render.yaml. It specifies a single free Python web service in Singapore. Confirm the region before creating the service.
4. Apply the Blueprint. In the build and service logs, check dependency installation and the startup message `model loaded, sha256 ok`. The health check is `/api/v1/health`.
5. From the repository root, run the smoke test with the service URL from Render.

   ```sh
   python scripts/smoke.py YOUR_RENDER_SERVICE_URL
   ```

6. The runner checks the local model digest against the deployed API and compares each real example's returned regions with its expected intervals, hit counts and scores. It prints server and round-trip timing for the 100 kb and 500 kb examples. To measure cold start, allow the free service to idle for 15 minutes and run the script before opening the site again. Record Render measurements separately from local timings.

The configured caps are 500,000 bases, 10 records, 1,048,576 HTTP body bytes and 25 seconds. The model card documents the export and scope. [Render Blueprint reference](https://render.com/docs/blueprint-spec) · [Free service behaviour](https://render.com/docs/free)
