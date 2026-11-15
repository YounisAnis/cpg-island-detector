import {download} from "./download.js";
import {regionTable} from "./table.js";
import {renderTrack} from "./track.js";

const PAGE_SIZE = 240;
const PREVIEW_SIZE = 72;
const number = n => n.toLocaleString();
const template = `
  <div class="result-heading"><h2 id="result-heading" tabindex="-1">Detection results</h2>
    <label id="chooser" hidden>Record <select id="record"></select></label></div>
  <article class="panel verdict-card">
    <div class="result-context"><span class="verdict-badge"><span id="verdict-icon" aria-hidden="true"></span><span id="verdict-class"></span></span>
      <span id="result-id" class="record-id"></span></div>
    <h3 id="verdict"></h3>
    <p id="meaning"></p>
    <div id="summary" class="record-stats"></div>
    <p id="model-context" class="result-context-note"></p>
  </article>
  <section class="panel evidence-card" aria-labelledby="window-evidence">
    <h3 id="window-evidence">Window scores</h3>
    <div class="evidence-grid">
      <div class="score-readout"><h4>Highest-scoring window</h4><strong id="peak-value"></strong>
        <p id="peak-position"></p>
        <div id="gauge" hidden><svg viewBox="0 0 1000 20" preserveAspectRatio="none" aria-hidden="true">
          <rect class="gauge-rail" width="1000" y="6" height="8"/>
          <rect id="gauge-fill" y="6" height="8"/>
          <line id="gauge-marker" y1="0" y2="20" vector-effect="non-scaling-stroke"/></svg>
          <div class="gauge-scale" aria-hidden="true"><span>0</span><span>1</span></div>
        </div>
        <p id="gauge-caption" class="gauge-caption"></p>
      </div>
      <div class="position-track"><h4>Score by window start</h4><div id="track"></div>
        <p class="track-key"><span>Window score</span><span>Hit threshold</span><span>Predicted region</span></p>
      </div>
    </div>
  </section>
  <section class="panel result-sequence" aria-labelledby="sequence-heading">
    <div class="result-heading"><h3 id="sequence-heading">Submitted sequence</h3>
      <button id="sequence-toggle" type="button" aria-expanded="false" aria-controls="sequence-controls sequence-bases">Expand sequence</button></div>
    <p class="sequence-location" id="sequence-location"></p>
    <div id="sequence-bases" class="sequence-bases" tabindex="0" aria-label="Submitted bases in the displayed interval"></div>
    <div class="sequence-key" aria-label="Sequence legend">
      <span class="base-a">A</span><span class="base-c">C</span><span class="base-g">G</span><span class="base-t">T</span>
      <span class="key-ambiguous">Other letters · ambiguous</span><span class="sequence-hit-key">Predicted span</span>
    </div>
    <div id="sequence-controls" class="sequence-controls" hidden>
      <div class="buttons"><button id="previous-bases" type="button">Previous bases</button><button id="next-bases" type="button">Next bases</button></div>
      <form id="jump-form"><label for="jump-position">Go to position</label><input id="jump-position" inputmode="numeric" type="number" min="0" step="1" required><button type="submit">Go</button></form>
    </div>
  </section>
  <section class="panel result-regions" aria-labelledby="region-heading">
    <h3 id="region-heading">Predicted regions</h3>
    <p id="region-instructions">Select a region to inspect its bases. Positions start at zero and exclude the end coordinate.</p>
    <div id="regions"></div>
    <p id="region-selection" role="status"></p>
  </section>
  <div class="result-actions"><div><h3>Export results</h3><p>JSON includes every record and window score. CSV and BED contain the predicted regions.</p></div>
    <div class="buttons"><button id="copy-result" type="button">Copy JSON</button><button data-export="json" type="button">Download JSON</button><button data-export="csv" type="button">CSV</button><button data-export="bed" type="button">BED</button></div>
    <p id="copy-status" role="status"></p></div>
  <aside class="reading-guide"><h3>How to read this result</h3><p id="reading-tip"></p></aside>
  <p class="result-disclaimer">For research use only. Predictions depend on the training data and are unsuitable for clinical decisions.</p>`;

// Mirror the accepted FASTA line breaks for the display copy. The submitted text goes to the API verbatim.
function sequenceCopies(input) {
  const compact = text => text.replace(/[\s\u001c-\u001f\u0085]/gu, "");
  const text = input.replace(/^[\s\u001c-\u001f\u0085]+|[\s\u001c-\u001f\u0085]+$/gu, "");
  if (!text.startsWith(">")) return [compact(text)];
  const copies = [];
  let chunks = [];
  for (const line of text.split(/\r\n|[\n\r\v\f\u001c-\u001e\u0085\u2028\u2029]/u)) {
    if (/^[\s\u001c-\u001f\u0085]*>/u.test(line)) {
      if (chunks.length) copies.push(chunks.join(""));
      chunks = [];
    } else {
      chunks.push(compact(line));
    }
  }
  copies.push(chunks.join(""));
  return copies;
}

function verdict(record, p) {
  const minimum = p.min_region_length;
  if (!record.windows.scored) return ["unscored", "?", "No score", "No windows could be scored",
    `Every window exceeded the limit of ${p.max_ambiguous_fraction * 100}% ambiguous bases. There is no island prediction for this record.`];
  if (record.regions.length) return ["positive", "✓", "Region detected", record.regions.length === 1 ? "CpG island predicted" : "CpG islands predicted",
    `The model found stretches of DNA where nearby scoring windows met the hit threshold and formed a region of at least ${minimum} bp.`];
  if (record.windows.hit) return ["negative", "−", "No region", "No CpG island predicted",
    `At least one window reached the hit threshold, but the hits did not form a region spanning ${minimum} bp between the outermost window centres.`];
  return ["negative", "−", "No region", "No CpG island predicted",
    "None of the scored windows reached the hit threshold. The detector returned no region for this record."];
}

export function createResultPanel(host, onRecord) {
  host.innerHTML = template;
  const el = id => host.querySelector("#" + id);
  const stats = el("summary");
  const track = el("track");
  const chooser = el("record");
  const toggle = el("sequence-toggle");
  let response, sequences, example, record, bases, expanded, offset, selected, trackWidth, copyVersion = 0;

  function renderBases() {
    const end = Math.min(bases.length, offset + (expanded ? PAGE_SIZE : PREVIEW_SIZE));
    const fragment = document.createDocumentFragment();
    let regionIndex = record.regions.findIndex(region => region.end > offset);
    for (let i = offset; i < end; i++) {
      const base = bases[i], upper = base.toUpperCase();
      const letter = document.createElement("span");
      if (regionIndex >= 0 && regionIndex < record.regions.length && i >= record.regions[regionIndex].end) regionIndex++;
      const region = record.regions[regionIndex];
      letter.className = "base-" + ("ACGT".includes(upper) ? upper.toLowerCase() : "other");
      if (region && i >= region.start && i < region.end) letter.classList.add("inside-region");
      letter.textContent = base;
      fragment.append(letter);
    }
    el("sequence-bases").replaceChildren(fragment);
    el("sequence-location").textContent = `${record.id} · [${number(offset)}, ${number(end)}) of ${number(record.length)} bp`;
    toggle.textContent = expanded ? "Collapse sequence" : "Expand sequence";
    toggle.setAttribute("aria-expanded", String(expanded));
    el("sequence-controls").hidden = !expanded;
    el("previous-bases").disabled = offset === 0;
    el("next-bases").disabled = end === bases.length;
    el("jump-position").max = record.length - 1;
    el("jump-position").value = offset;
  }

  function showSelection() {
    for (const item of host.querySelectorAll("[data-region]")) {
      const match = Number(item.dataset.region) === selected;
      item.classList.toggle("selected", match);
      item.querySelector("button")?.setAttribute("aria-pressed", String(match));
    }
  }
  function chooseRegion(i) {
    selected = i;
    const region = record.regions[i];
    expanded = true;
    offset = region.start;
    renderBases();
    showSelection();
    el("region-selection").textContent = `Selected [${number(region.start)}, ${number(region.end)}). The sequence view opens at its first base.`;
  }

  function drawTrack() {
    if (!record?.scores || host.hidden) return;
    trackWidth = track.clientWidth;
    renderTrack(track, record, response.parameters.threshold, chooseRegion);
    showSelection();
  }

  function renderScore() {
    const values = record.scores?.values || [];
    let peak = -1;
    values.forEach((value, i) => {
      if (value !== null && (peak === -1 || value > values[peak])) peak = i;
    });
    const threshold = response.parameters.threshold;
    el("peak-value").textContent = peak === -1 ? "Unavailable" : String(values[peak]);
    el("gauge").hidden = peak === -1;
    el("gauge-caption").textContent = peak === -1
      ? `Window hit threshold ≥ ${threshold}. No eligible score is available for comparison.`
      : `The vertical marker shows the window hit threshold (≥ ${threshold}). The score is a model output on a 0–1 scale.`;
    if (peak === -1) {
      el("peak-position").textContent = "There is no window score to display.";
    } else {
      const start = peak * record.scores.stride;
      el("peak-position").textContent = `Window [${number(start)}, ${number(start + record.scores.width)}) bp`;
      el("gauge-fill").setAttribute("width", values[peak] * 1000);
      el("gauge-marker").setAttribute("x1", threshold * 1000);
      el("gauge-marker").setAttribute("x2", threshold * 1000);
    }
    if (record.scores) drawTrack();
    else track.textContent = "Window scores were not returned.";
  }

  function showRecord() {
    const i = chooser.selectedIndex;
    record = response.records[i];
    bases = sequences[i];
    expanded = false;
    selected = null;
    offset = 0;
    el("region-selection").textContent = "";
    const p = response.parameters;
    const [state, icon, badge, title, meaning] = verdict(record, p);
    host.dataset.verdict = state;
    el("verdict-icon").textContent = icon;
    el("verdict-class").textContent = badge;
    el("verdict").textContent = title;
    el("meaning").textContent = meaning;
    el("result-id").textContent = record.id;
    el("model-context").textContent = `Compact LightGBM · Human hg38 benchmark · ${p.window} bp windows · ${p.stride} bp stride · Forward strand`;
    stats.replaceChildren();
    for (const [label, value] of [["Length (bp)", record.length], ["Scored windows", record.windows.scored],
      ["Skipped windows", record.windows.skipped], ["Hit windows", record.windows.hit], ["Regions", record.regions.length]]) {
      const item = document.createElement("div"), count = document.createElement("strong");
      count.textContent = number(value);
      item.append(count, label);
      stats.append(item);
    }
    regionTable(el("regions"), record.regions, chooseRegion);
    el("region-instructions").hidden = !record.regions.length;
    renderScore();
    renderBases();
    const tip = record.windows.total === 1
      ? `A single ${p.window} bp window yields at most one score. A region needs multiple hit-window centres spanning at least ${p.min_region_length} bp.`
      : "The line shows scores at window start positions. Gaps indicate skipped windows. Highlighted spans show the regions returned by the detector.";
    const denseTrackNote = record.scores?.values.length > 1000
      ? " On dense tracks the plot keeps the highest score per screen column within each continuous run. Download JSON for every window score."
      : "";
    el("reading-tip").textContent = (example ? `${example}. ${tip}` : tip) + denseTrackNote;
    onRecord(record);
  }

  chooser.addEventListener("change", showRecord);
  toggle.addEventListener("click", () => { expanded = !expanded; if (!expanded) offset = 0; renderBases(); });
  el("previous-bases").addEventListener("click", () => { offset = Math.max(0, offset - PAGE_SIZE); renderBases(); });
  el("next-bases").addEventListener("click", () => { offset += PAGE_SIZE; renderBases(); });
  el("jump-form").addEventListener("submit", event => {
    event.preventDefault();
    offset = el("jump-position").valueAsNumber;
    renderBases();
  });
  host.querySelectorAll("[data-export]").forEach(button => {
    button.addEventListener("click", () => { if (response) download(button.dataset.export, response); });
  });
  el("copy-result").addEventListener("click", async () => {
    if (!response) return;
    const token = ++copyVersion;
    try {
      await navigator.clipboard.writeText(JSON.stringify(response, null, 2));
      if (token === copyVersion) el("copy-status").textContent = "All records copied as JSON.";
    } catch {
      if (token === copyVersion) el("copy-status").textContent = "Clipboard access is unavailable. Choose Download JSON to save the same result.";
    }
  });
  new ResizeObserver(() => { if (record && track.clientWidth !== trackWidth) drawTrack(); }).observe(track);

  return {
    show(result, submitted, exampleName) {
      response = result;
      sequences = sequenceCopies(submitted);
      example = exampleName;
      chooser.replaceChildren(...result.records.map((r, i) => new Option(r.id, i)));
      el("chooser").hidden = result.records.length === 1;
      host.hidden = false;
      showRecord();
      el("result-heading").focus();
    },
    clear() {
      host.hidden = true;
      response = record = sequences = bases = null;
      copyVersion++;
      el("copy-status").textContent = "";
    }
  };
}
