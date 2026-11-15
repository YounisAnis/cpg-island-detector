# CpG Island Detector: frontend report

## What changed, file by file

| Files | Change |
| --- | --- |
| `static/index.html` | Sequence editor, FASTA upload, four hg38 examples, scan settings that come from the server, and a place for results. |
| `static/about.html`, `static/js/about.js` | Method in four steps, FAQ, coordinate rules, limits of the benchmark, team, and manuscript title. |
| `static/results.html`, `static/js/results.js` | Labels for benchmark tables on mobile, charts, and loading/error states. Table data and rounding are the same as before. |
| `static/js/main.js`, `static/js/api.js` | Example selection, file reading, loading, input checks, and timeout messages. The original detect request is kept. When new input comes, the old result is cleared. |
| `static/js/result-panel.js` | For each record: verdict, exact peak window score, threshold marker, input preview, paged sequence view, and copy/download buttons. |
| `static/js/table.js`, `static/js/track.js` | Track and sortable region table for small screens. Selecting a region highlights its bases and its interval on the track. |
| `static/css/style.css`, `static/css/results-panel.css` | Colors, fonts, layout, contrast, keyboard focus, loading, and reduced-motion rules. |
| `static/js/site.js`, `static/js/site-config.js` | Theme choice, mobile menu, footer, credits, and project links. |
| `static/favicon.svg`, `static/helix.svg`, `static/icons.svg`, `static/fonts/` | Local DNA picture, favicon, icons, and Source Sans 3 and Source Code Pro fonts (with the OFL license). |

## Design and science

- Navy and cyan are for the detector controls. Mint shows predicted regions. Amber shows "no region" or a warning. The verdict also has its own heading and symbol, so color is not the only clue.
- The system theme is applied first. The theme toggle is saved in browser storage when storage is available. Bases, scores and coordinates use a monospace font.
- The gauge shows the real value of the highest-scoring **window** of the selected record. The marker sits at the server's hit threshold. The paper does not report probability calibration for the dense Compact scan.
- The island decision comes from the server's region list. For example, one 200 bp window can be a hit, but it still may not form a 150 bp region with the same centre.
- If all windows are skipped, the panel says scoring was not possible. In a multi-FASTA file, each record has its own score, sequence and verdict.
- Coordinates start from the beginning of each input record. In `[start, end)`, start is included and end is not. The sequence viewer shows long sequences in small pages. The JSON download is the full API response.
- Keyboard use is supported for navigation, example selection, sorting and selecting regions. Motion preferences are respected. No CDN and no new Python package is needed for this redesign.

## Request path

`main.js` takes the input from `index.html`. `api.js` sends the original text and `include_scores: true` to `POST /api/v1/detect`. FastAPI reads the records, builds the feature matrix for the eligible windows, and gets scores from the Compact LightGBM booster. The backend merges hit windows and returns regions relative to each record. `result-panel.js` builds the display from that same response.

Before, the track only showed a small colored bar (`rect.region` from `track.js`). Now it also has the verdict, score gauge, interval table and base view.

## Checks done

File fingerprints for the backend, model, science fixtures, static benchmark/example data, dependencies and Render settings match the earlier snapshot. The JavaScript modules passed a syntax check. These are source-level checks only. Still pending for your first localhost run: browser check, runtime parity, Lighthouse, and Render startup.

| Built-in example | Regions in repo reference | Intervals (relative to record) |
| --- | ---: | --- |
| Positive test window, 200 bp | 0 | none |
| Negative test window, 200 bp | 0 | none |
| Chr21, 100 kb | 1 | `[50000, 50250)` |
| Chr21, 500 kb | 2 | `[250000, 250250)`, `[413450, 413600)` |

Three more 200 bp records and their exact scores come from the archived test fixtures. Their zero-based rows are 1, 7 and 29189. Row 7 has one hit window and zero regions. Row 29189 has 17 ambiguous bases, but its window still got a score.

The original frontend ZIP, reference requests and expected records are in a temporary backup folder. Do not treat these references as the result of a new inference run.

## First check on localhost

From the repo root, start the server in PowerShell:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app
```

Open the local address shown in the terminal. First run the Chr21 100 kb example and compare the table and highlighted bases with the interval. In a second terminal, you can verify all four examples with the existing smoke runner:

```powershell
.\.venv\Scripts\python.exe scripts/smoke.py http://127.0.0.1:8000
```

For layout, check the detector page, multi-record results and benchmark tables at 360×740, 390×844, 768×1024, 1024×768, 1366×768, 1920×1080 and 2560×1440.

## Credits and scope

`static/js/site-config.js` has the email addresses given for Younis Anis and Dr. Muhammad Shujaat. When you have the co-supervisor's name/email and the manuscript's authors, venue and public URL, add them to the same file. Empty entries stay hidden on the page.

The API does not return GC content, CpG observed/expected ratio, or methylation measurements for each record. The UI makes no guesses for these. The paper title in the citation is the one that was already in the repo.

## Git and Render

After local checks, run these commands. `git add .` will also stage your original prompt file if it is still untracked in the repo.

```powershell
git status
git add .
git commit -m "Frontend redesign: bioinformatics UI, responsive layout, clear result panel, credits"
git push origin main
```

After the push, check the Render deploy logs for `model loaded, sha256 ok` and a successful response from `/api/v1/health`.
