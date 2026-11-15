# CpG Island Detector — frontend report

## File ke hisaab se tabdeeliyan

| Files | Tabdeeli |
| --- | --- |
| `static/index.html` | Sequence editor, FASTA upload, chaar hg38 examples, server se milne wale scan parameters, aur results ki jagah. |
| `static/about.html`, `static/js/about.js` | Chaar marhalon mein method, FAQ, coordinate convention, benchmark ki hudood, team aur manuscript title. |
| `static/results.html`, `static/js/results.js` | Benchmark tables ke mobile labels, charts aur loading/error states. Tables ke data aur rounding pehle wali hain. |
| `static/js/main.js`, `static/js/api.js` | Original detect request ke saath example selection, file reading, loading, validation aur timeout messages. Naya input aane par purana result hat jata hai. |
| `static/js/result-panel.js` | Har record ka verdict, exact peak window score, threshold marker, input preview, paged sequence view aur copy/download actions. |
| `static/js/table.js`, `static/js/track.js` | Chhoti screen ke liye track aur sortable region table. Region select karne par us ke bases aur track interval highlight hote hain. |
| `static/css/style.css`, `static/css/results-panel.css` | Rang, type, layout, contrast, keyboard focus, loading aur reduced-motion rules. |
| `static/js/site.js`, `static/js/site-config.js` | Theme preference, mobile navigation, footer, credits aur project links. |
| `static/favicon.svg`, `static/helix.svg`, `static/icons.svg`, `static/fonts/` | Local DNA illustration, favicon, interface icons aur OFL license ke saath Source Sans 3 aur Source Code Pro. |

## Design aur science

- Navy aur cyan detector ke controls ke liye hain. Mint predicted regions ko aur amber no-region ya caution state ko dikhata hai. Verdict ki apni heading aur nishan bhi hain.
- System theme pehle apply hoti hai. Toggle ka faisla browser storage mein save hota hai jab storage dastiyab ho. Bases, scores aur coordinates monospace mein hain.
- Gauge chune huay record ke sab se zyada score wale **window** ki asal returned value dikhata hai. Marker server ke hit threshold par hai. Paper Compact ke dense scan ki probability calibration report nahin karta.
- Island ka faisla server ki region list se aata hai. Misal ke taur par aik 200 bp window hit ho sakta hai, magar us ke aik hi centre se 150 bp ka region nahin banta.
- Agar tamam windows skip ho jaayen to panel batata hai ke scoring mumkin nahin hui. Multi-FASTA mein har record ka score, sequence aur verdict alag dekha ja sakta hai.
- Coordinates har input record se shuru hote hain. `[start, end)` mein start shamil aur end bahar hai. Sequence viewer lambi sequences ko chhote hisson mein dikhata hai. JSON mein poora API response milta hai.
- Keyboard se navigation, example selection, region sorting aur selection mumkin banaye gaye hain. Motion preference ka ehtiram hota hai. Is redesign ke liye koi CDN ya nayi Python dependency darkar nahin.

## Request ka raasta

`index.html` se `main.js` input leta hai. `api.js` asal text aur `include_scores: true` ko `POST /api/v1/detect` par bhejta hai. FastAPI records parse karta hai, eligible windows ka feature matrix banata hai aur Compact LightGBM booster se scores leta hai. Backend hit windows ko merge karke record-relative regions wapas bhejta hai. `result-panel.js` isi response se display banata hai. Pehle track par chhoti rangin patti `track.js` ka `rect.region` thi. Ab us ke saath verdict, score gauge, interval table aur bases ka view bhi hai.

## Tasdeeq

Backend, model, scientific fixtures, static benchmark/example data, dependencies aur Render configuration ke file fingerprints pehle wale snapshot se milte hain. JavaScript modules ka syntax check pass hua. Yeh source-level checks hain. Aap ki pehli localhost run ke liye browser, runtime parity, Lighthouse aur Render startup ki tasdeeq baqi hai.

| Built-in example | Repository ke reference mein regions | Record-relative intervals |
| --- | ---: | --- |
| Positive test window, 200 bp | 0 | — |
| Negative test window, 200 bp | 0 | — |
| Chr21, 100 kb | 1 | `[50000, 50250)` |
| Chr21, 500 kb | 2 | `[250000, 250250)`, `[413450, 413600)` |

Teen mazeed 200 bp records aur un ke exact scores archived test fixtures se liye gaye. In ke zero-based fixture rows 1, 7 aur 29189 hain. Row 7 par aik hit aur zero regions hain. Row 29189 ke 17 ambiguous bases ke bawajood us ka window score hua tha. Asal frontend ka ZIP, reference requests aur expected records temporary backup folder mein hain. In references ko nayi inference run ka natija samajhna durust nahin hoga.

## Localhost par pehli jaanch

Repository ki root se PowerShell mein server shuru karein.

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app
```

Terminal mein diya hua local address kholein. Pehle Chr21 ka 100 kb example chala kar table aur highlighted bases ka interval milayein. Doosre terminal mein existing smoke runner se chaaron examples ke regions verify kar sakte hain.

```powershell
.\.venv\Scripts\python.exe scripts/smoke.py http://127.0.0.1:8000
```

Layout ke liye 360×740, 390×844, 768×1024, 1024×768, 1366×768, 1920×1080 aur 2560×1440 par detector, multi-record results aur benchmark tables dekh lein.

## Credits aur scope

`static/js/site-config.js` mein Younis Anis aur Dr. Muhammad Shujaat ke diye huay email addresses maujood hain. Co-supervisor ka naam/email aur manuscript ke authors, venue aur public URL jab mil jaayen to isi file mein dein. Khali entries page par chhupi rehti hain.

API har record ka GC content, CpG observed/expected ratio ya methylation measurement return nahin karti. UI mein in ke liye koi andaza nahin lagaya gaya. Paper ka jo title repository mein tha wahi citation mein diya gaya hai.

## Git aur Render

Local verification ke baad ye commands chalayein. `git add .` aap ki original prompt file bhi stage karega agar woh repository mein abhi untracked hai.

```powershell
git status
git add .
git commit -m "Frontend redesign: bioinformatics UI, responsive layout, clear result panel, credits"
git push origin main
```

Push ke baad Render deploy logs mein `model loaded, sha256 ok` aur `/api/v1/health` ka successful response dekhein.
