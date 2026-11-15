import {api} from "./api.js";
import {siteConfig} from "./site-config.js";

function addText(parent, tag, text, className) {
  const element = document.createElement(tag);
  element.textContent = text;
  if (className) element.className = className;
  parent.append(element);
  return element;
}

function showCredits() {
  const host = document.getElementById("team-members");
  const {developer, supervisor, coSupervisor, university} = siteConfig;
  for (const [role, person] of [["Developer", developer], ["Supervisor", supervisor], ["Co-supervisor", coSupervisor]]) {
    if (!person.name) continue;
    const card = document.createElement("article");
    card.className = "person";
    addText(card, "small", role);
    addText(card, "h3", person.name);
    if (person === developer) {
      const affiliation = [person.qualification, university].filter(Boolean).join(", ");
      if (affiliation) addText(card, "p", affiliation);
    }
    if (person.email) {
      const link = addText(card, "a", person.email);
      link.href = "mailto:" + person.email;
    }
    host.append(card);
  }
  document.getElementById("team").hidden = !host.childElementCount;
}

function showCitation() {
  const {paperTitle, paperAuthors, paperVenue, paperUrl} = siteConfig;
  if (!paperTitle) return;
  const entry = document.getElementById("paper-citation");
  if (paperAuthors) entry.append(paperAuthors + ". ");
  const title = addText(entry, "cite", paperTitle);
  if (paperUrl) {
    title.replaceChildren();
    addText(title, "a", paperTitle).href = paperUrl;
  }
  if (paperVenue) entry.append(". " + paperVenue);
  document.getElementById("citation").hidden = false;
}

showCredits();
showCitation();

api("config").then(({parameters: p, limits: l}) => {
  document.getElementById("window-method").textContent =
    `Score full ${p.window} bp windows every ${p.stride} bp. Skip a window when more than ${p.max_ambiguous_fraction * 100}% of its bases are ambiguous.`;
  document.getElementById("hit-method").textContent = `A score at or above ${p.threshold} makes a window a hit.`;
  document.getElementById("region-method").textContent =
    `Join hit windows across gaps up to ${p.merge_gap} bp. Take the centres of the outermost hits as boundaries. Keep spans of at least ${p.min_region_length} bp.`;
  document.getElementById("limits").textContent =
    `Submit up to ${l.max_records} records with at most ${l.max_bases.toLocaleString()} bases in total. Each record needs at least ${l.min_bases} bases. The JSON request body limit is ${l.max_body_bytes.toLocaleString()} bytes.`;
}).catch(() => {
  document.getElementById("limits").textContent = "The server limits could not be loaded. Refresh this page to try again.";
});
