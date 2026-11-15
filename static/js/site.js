import {siteConfig} from "./site-config.js";

for (const label of document.querySelectorAll("[data-project]")) {
  label.textContent = siteConfig.project;
}
const attribution = [siteConfig.university, siteConfig.year].filter(Boolean);
document.querySelector("[data-attribution]").textContent =
  attribution.length ? " · " + attribution.join(" · ") : "";
const repository = document.querySelector("[data-repository]");
if (siteConfig.repository) {
  repository.href = siteConfig.repository;
  repository.hidden = false;
}
document.querySelector("[data-citation-link]").hidden = !siteConfig.paperTitle;

const themeKey = "cpg-detector-theme";
const root = document.documentElement;
const themeButton = document.querySelector(".theme-toggle");
const lightPreference = window.matchMedia("(prefers-color-scheme: light)");
try {
  const stored = localStorage.getItem(themeKey);
  if (stored === "dark" || stored === "light") root.dataset.theme = stored;
} catch {
  // Storage can be unavailable in private or restricted browsing.
}

function currentTheme() {
  return root.dataset.theme || (lightPreference.matches ? "light" : "dark");
}

function describeThemeAction() {
  const dark = currentTheme() === "dark";
  const label = dark ? "Switch to light theme" : "Switch to dark theme";
  themeButton.setAttribute("aria-label", label);
  themeButton.title = label;
  themeButton.querySelector("use").setAttribute("href", "/icons.svg#" + (dark ? "sun" : "moon"));
}

themeButton.addEventListener("click", () => {
  root.dataset.theme = currentTheme() === "dark" ? "light" : "dark";
  describeThemeAction();
  try {
    localStorage.setItem(themeKey, root.dataset.theme);
  } catch {
    // The theme still applies for the current page.
  }
});
lightPreference.addEventListener("change", describeThemeAction);
describeThemeAction();

const menuButton = document.querySelector(".nav-toggle");
const nav = document.getElementById("site-nav");
function setMenu(open) {
  nav.dataset.open = String(open);
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
}
setMenu(false);
menuButton.addEventListener("click", () => {
  const open = nav.dataset.open !== "true";
  setMenu(open);
  if (open) nav.querySelector("[aria-current]").focus();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && nav.dataset.open === "true") {
    setMenu(false);
    menuButton.focus();
  }
});
document.addEventListener("click", event => {
  if (!nav.contains(event.target) && !menuButton.contains(event.target)) setMenu(false);
});
window.matchMedia("(max-width: 710px)").addEventListener("change", () => setMenu(false));
