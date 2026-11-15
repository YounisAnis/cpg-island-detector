export const columns = ["start", "end", "length", "score_mean", "score_max", "n_windows"];
const labels = ["Start", "End", "Length (bp)", "Mean score", "Max score", "Hit windows"];

export function regionTable(host, regions, select) {
  if (!regions.length) {
    host.textContent = "No predicted regions were returned for this record.";
    return;
  }
  const table = document.createElement("table");
  table.setAttribute("aria-label", "Predicted regions for the selected record");
  const header = table.createTHead().insertRow();
  const body = table.createTBody();
  let sort = "start", direction = 1;

  function draw() {
    const current = body.querySelector("tr.selected")?.dataset.region;
    body.replaceChildren();
    const ordered = regions.map((region, index) => ({region, index}))
      .sort((a, b) => direction * (a.region[sort] - b.region[sort]));
    for (const {region, index} of ordered) {
      const row = body.insertRow();
      row.dataset.region = index;
      const selected = String(index) === current;
      row.classList.toggle("selected", selected);
      row.addEventListener("click", () => select(index));
      columns.forEach((key, i) => {
        const cell = row.insertCell();
        cell.dataset.label = labels[i];
        if (key === "start") {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "select-region";
          button.textContent = region.start;
          button.setAttribute("aria-label", `Inspect region from ${region.start} to ${region.end}`);
          button.setAttribute("aria-pressed", String(selected));
          cell.append(button);
        } else {
          cell.textContent = key.startsWith("score") ? region[key].toFixed(6) : region[key];
        }
      });
    }
    for (const th of header.cells) {
      th.setAttribute("aria-sort", th.dataset.col === sort ? (direction === 1 ? "ascending" : "descending") : "none");
    }
  }
  columns.forEach((key, i) => {
    const th = document.createElement("th"), button = document.createElement("button");
    th.scope = "col";
    th.dataset.col = key;
    button.type = "button";
    button.textContent = labels[i];
    button.setAttribute("aria-label", "Sort regions by " + labels[i].toLowerCase());
    button.addEventListener("click", () => {
      direction = sort === key ? -direction : 1;
      sort = key;
      draw();
    });
    th.append(button);
    header.append(th);
  });
  draw();
  host.replaceChildren(table);
}
