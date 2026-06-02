const NAV_ITEMS = [
  ["Pricing", "info.html#pricing", "Preview access and first implementation options."],
  ["Versioning", "info.html#versioning", "0.6.8 preview now, 0.7 Command Center next."],
  ["Roadmap", "info.html#roadmap", "Goal commands, worker contracts and operating loops."],
  ["FAQ", "info.html#faq", "What runs autonomously and what stays gated."],
  ["Release", "info.html#release", "Current public release notes."],
  ["Support", "info.html#support", "Ask about setup and implementation."],
  ["Impressum", "impressum.html", "Legal notice."],
  ["Datenschutz", "datenschutz.html", "Privacy policy."],
  ["AGB", "agb.html", "Terms."],
];

function escapeAttribute(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
}

function patchQuickBar() {
  const panel = document.querySelector("#command-quickbar");
  if (!panel || panel.dataset.commandEveSiteNav === "patched") return;
  panel.dataset.commandEveSiteNav = "patched";
  panel.innerHTML = NAV_ITEMS
    .map(
      ([label, href, title]) =>
        `<a class="quickbar-link" href="${escapeAttribute(href)}" title="${escapeAttribute(title)}"><span>${label}</span></a>`
    )
    .join("");
}

function syncNavOpenState() {
  const topbar = document.querySelector(".command-topbar");
  const isOpen = Boolean(topbar?.classList.contains("command-topbar-open"));
  document.documentElement.classList.toggle("command-eve-nav-open", isOpen);
  document.body?.classList.toggle("command-eve-nav-open", isOpen);
}

function enhanceMobileNav() {
  const topbar = document.querySelector(".command-topbar");
  if (!topbar || topbar.dataset.commandEveMobileNav === "ready") return;
  topbar.dataset.commandEveMobileNav = "ready";

  const observer = new MutationObserver(syncNavOpenState);
  observer.observe(topbar, { attributes: true, attributeFilter: ["class"] });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!topbar.classList.contains("command-topbar-open")) return;
    topbar.querySelector(".command-nav-chevron")?.click();
  });

  topbar.querySelector("#command-quickbar")?.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest("a")) return;
    if (topbar.classList.contains("command-topbar-open")) {
      topbar.querySelector(".command-nav-chevron")?.click();
    }
  });

  syncNavOpenState();
}

patchQuickBar();
enhanceMobileNav();
const navPatchInterval = window.setInterval(() => {
  patchQuickBar();
  enhanceMobileNav();
  if (
    document.querySelector("#command-quickbar")?.dataset.commandEveSiteNav === "patched" &&
    document.querySelector(".command-topbar")?.dataset.commandEveMobileNav === "ready"
  ) {
    window.clearInterval(navPatchInterval);
  }
}, 250);
