import {api, detect} from "./api.js";
import {lengths} from "./fasta.js";
import {createResultPanel} from "./result-panel.js";

const byId = id => document.getElementById(id);
const input = byId("input");
const run = byId("run");
const examples = byId("examples");
const empty = byId("empty-result");
const connection = byId("connection");
let config, active, readingFile = false, exampleName = "", version = 0;
const panel = createResultPanel(byId("output"), record => {
  status("done", ["Scan complete", ...record.warnings].join(" · "));
});

function status(state, message) {
  byId("status").dataset.state = state;
  byId("status").textContent = message;
}

function update() {
  const sizes = lengths(input.value);
  const total = sizes.reduce((sum, size) => sum + size, 0);
  const limit = config?.limits.max_bases;
  byId("counter").textContent = limit === undefined
    ? `${total.toLocaleString()} bases`
    : `${total.toLocaleString()} / ${limit.toLocaleString()} bases`;
  run.disabled = !config || Boolean(active) || readingFile || !total || total > limit;
  if (active || !config) return;
  if (total > limit) {
    status("error", `Shorten the input to ${limit.toLocaleString()} total bases or split it into separate runs.`);
  } else if (limit && total && sizes.some(size => size < config.limits.min_bases)) {
    status("idle", `Each record needs at least ${config.limits.min_bases} bases to form a complete window.`);
  }
}

function markExample(selected) {
  for (const chip of examples.querySelectorAll("button")) {
    chip.setAttribute("aria-pressed", String(chip === selected));
  }
}
function changed() {
  version++;
  readingFile = false;
  active?.abort();
  active = null;
  panel.clear();
  if (empty) empty.hidden = false;
  if (config) status("idle", "Ready to scan");
  update();
}

input.addEventListener("input", () => {
  exampleName = "";
  markExample(null);
  changed();
});
byId("clear").addEventListener("click", () => {
  byId("file").value = "";
  input.value = "";
  exampleName = "";
  markExample(null);
  changed();
  input.focus();
});
byId("file").addEventListener("change", event => {
  const file = event.target.files[0];
  if (!file) return;
  changed();
  const token = version;
  if (config && file.size > config.limits.max_body_bytes) {
    status("error", `This file exceeds the ${config.limits.max_body_bytes.toLocaleString()}-byte request limit. Choose a smaller file.`);
    return;
  }
  const reader = new FileReader();
  readingFile = true;
  update();
  status("idle", "Reading the selected file…");
  reader.onload = () => {
    if (token !== version) return;
    input.value = reader.result;
    exampleName = "";
    markExample(null);
    changed();
  };
  reader.onerror = () => {
    if (token !== version) return;
    readingFile = false;
    update();
    status("error", "The file could not be read. Try selecting it again or paste the sequence.");
  };
  reader.readAsText(file);
});

function describeError(error) {
  const messages = {
    invalid_character: "Remove numbers and punctuation from the sequence lines, then run again.",
    invalid_fasta: "Check that each FASTA header is followed by a sequence.",
    too_many_bases: "Split the input into smaller submissions.",
    too_many_records: `Submit up to ${config.limits.max_records} records at a time.`,
    payload_too_large: "Use a smaller file or submit fewer records.",
    internal_error: "Try the scan again. Your input is still in the editor."
  };
  if (error.code) {
    const record = error.details?.record;
    return [record ? `Record ${record}.` : "", error.message, messages[error.code]].filter(Boolean).join(" ");
  }
  return "Could not reach the detector. Check your connection and run the scan again.";
}

run.addEventListener("click", async () => {
  if (!config || active || readingFile) return;
  const submitted = input.value;
  const token = ++version;
  const size = new Blob([JSON.stringify({input: submitted, include_scores: true})]).size;
  if (size > config.limits.max_body_bytes) {
    status("error", `The request exceeds ${config.limits.max_body_bytes.toLocaleString()} bytes. Shorten the input or split it into separate runs.`);
    return;
  }
  const p = config.parameters;
  const candidates = lengths(submitted).reduce((sum, n) => sum + Math.max(0, Math.floor((n - p.window) / p.stride) + 1), 0);
  active = new AbortController();
  panel.clear();
  if (empty) empty.hidden = true;
  update();
  status("running", `Scoring ${candidates.toLocaleString()} candidate windows…`);
  try {
    const response = await detect(submitted, active.signal);
    if (token !== version) return;
    panel.show(response, submitted, exampleName);
  } catch (error) {
    if (token !== version) return;
    if (empty) empty.hidden = false;
    status("error", describeError(error));
  } finally {
    if (token === version) {
      active = null;
      // Keep the server's validation message visible until the input changes.
      run.disabled = false;
    }
  }
});

async function loadExamples() {
  try {
    const response = await fetch("/data/examples.json");
    if (!response.ok) throw Error();
    const items = await response.json();
    for (const item of items) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "example-chip";
      chip.textContent = item.name.replace(" test window", " window").replace("Chromosome ", "Chr");
      chip.setAttribute("aria-label", item.name);
      chip.setAttribute("aria-pressed", "false");
      chip.addEventListener("click", () => {
        byId("file").value = "";
        input.value = ">" + item.id + "\n" + item.sequence;
        exampleName = item.name;
        markExample(chip);
        changed();
      });
      examples.append(chip);
    }
  } catch {
    examples.textContent = "Examples are unavailable. Paste a sequence or upload a FASTA file.";
  }
}

async function wake() {
  const timer = setTimeout(() => {
    status("waking", "Waiting for the server. A sleeping instance can take about one minute to start.");
    connection.textContent = "Waiting for server";
  }, 5000);
  let first = true;
  while (!config) {
    try {
      await api("health", {signal: AbortSignal.timeout(first ? 5000 : 3000)});
      config = await api("config", {signal: AbortSignal.timeout(5000)});
    } catch {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    first = false;
  }
  clearTimeout(timer);
  connection.textContent = "Server ready";
  connection.dataset.state = "ready";
  for (const value of document.querySelectorAll("[data-parameter]")) {
    value.textContent = config.parameters[value.dataset.parameter];
  }
  status("idle", "Ready to scan");
  update();
}
loadExamples();
wake();
