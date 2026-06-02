export const COCKPIT_VERSION = "plane-cockpit-bootstrap/v0";

export const DEFAULT_COCKPIT_MODULES = Object.freeze([
  {
    name: "Company.OS — Runtime & Scheduler",
    status: "in-progress",
    description: "Runtime Dispatcher, token rotation, scheduler, kill switches and unattended worker execution.",
  },
  {
    name: "Company.OS — Controller & CAO",
    status: "in-progress",
    description: "CAO passes, Codex controller decisions, verdict taxonomy and quality gates.",
  },
  {
    name: "Company.OS — Dashboard Command Center",
    status: "in-progress",
    description: "[Client] command center, Plane summary adapters and CEO review surfaces.",
  },
  {
    name: "Company.OS — C-Level Department Packs",
    status: "backlog",
    description: "CTO, CPO, CMO, COO and CFO capability profiles, worker contracts and department runbooks.",
  },
  {
    name: "Company.OS — Release & Cutover",
    status: "backlog",
    description: "Plane-first cutover, drift windows, release ladder, client rollout and rollback gates.",
  },
]);

export const DEFAULT_COCKPIT_CYCLES = Object.freeze([
  {
    name: "Company.OS — Rocket Tests W19",
    start_date: "2026-05-10T00:00:00Z",
    end_date: "2026-05-17T00:00:00Z",
    description: "Current controlled rocket-test window for Runtime, Dashboard, Controller and Scheduler proof.",
  },
  {
    name: "Company.OS — Drift Window 2026-05-10",
    start_date: "2026-05-10T00:00:00Z",
    end_date: "2026-05-17T00:00:00Z",
    description: "Formal seven-day drift observation after Plane/Linear bridge pari_for_companyos true.",
  },
]);

export const RECOMMENDED_VIEWS = Object.freeze([
  {
    name: "CEO Review",
    filter: "state=Backlog/In Progress with controller.verdict or next_state ceo:review comments",
  },
  {
    name: "Dispatch Ready",
    filter: "label dispatch:ready or contract dispatch: ready",
  },
  {
    name: "Blocked / Needs Human",
    filter: "comments or run_state contain BLOCKED_* or NEEDS_HUMAN",
  },
  {
    name: "Runtime Pilots",
    filter: "module Company.OS — Runtime & Scheduler or runtime-dispatcher reports",
  },
  {
    name: "Dashboard / Command Center",
    filter: "module Company.OS — Dashboard Command Center",
  },
]);

export const DEFAULT_COCKPIT_PAGES = Object.freeze([
  {
    name: "Company.OS Control Plane Cockpit",
    description_html: buildCockpitPageHtml(),
  },
]);

export function buildProjectOverviewHtml() {
  return [
    '<h1 class="editor-heading-block">Company.OS Control Plane</h1>',
    '<p class="editor-paragraph-block">Plane is the canonical execution cockpit for Company.OS. Work Items hold contracts, Modules group operating domains, Cycles time-box rocket tests and drift windows, Pages hold runbooks, and comments carry machine-readable worker/controller events.</p>',
    '<h2 class="editor-heading-block">Native cockpit surfaces</h2>',
    '<ul class="list-disc pl-7 space-y-(--list-spacing-y) tight" data-tight="true">',
    '<li><p class="editor-paragraph-block"><strong>Modules</strong>: Runtime & Scheduler, Controller & CAO, Dashboard Command Center, C-Level Department Packs, Release & Cutover.</p></li>',
    '<li><p class="editor-paragraph-block"><strong>Cycles</strong>: current rocket-test window and formal drift-window observation.</p></li>',
    '<li><p class="editor-paragraph-block"><strong>Pages</strong>: Control Plane Cockpit runbook and view map.</p></li>',
    '<li><p class="editor-paragraph-block"><strong>Comments</strong>: worker.lock, worker.context, worker.reported, controller.verdict and controller.followup remain the machine-readable event layer.</p></li>',
    '</ul>',
    '<h2 class="editor-heading-block">Current rule</h2>',
    '<p class="editor-paragraph-block">Do not create unstructured work. New executable work must normalize through the Worker Issue Contract, CapabilityProfile, Dispatcher, Runtime, CAO and Codex Controller path.</p>',
  ].join("");
}

export function buildCockpitPageHtml() {
  const viewRows = RECOMMENDED_VIEWS
    .map((view) => `<tr><td><p class="editor-paragraph-block">${escapeHtml(view.name)}</p></td><td><p class="editor-paragraph-block">${escapeHtml(view.filter)}</p></td></tr>`)
    .join("");
  return [
    '<h1 class="editor-heading-block">Company.OS Control Plane Cockpit</h1>',
    '<p class="editor-paragraph-block">This page is the Plane-native operator map. The canonical doctrine remains in the Company.OS repository; this page tells operators where to look inside Plane.</p>',
    '<h2 class="editor-heading-block">Recommended Views</h2>',
    '<table><tbody>',
    '<tr><th><p class="editor-paragraph-block">View</p></th><th><p class="editor-paragraph-block">Filter intent</p></th></tr>',
    viewRows,
    '</tbody></table>',
    '<h2 class="editor-heading-block">Event comments</h2>',
    '<ul class="list-disc pl-7 space-y-(--list-spacing-y) tight" data-tight="true">',
    '<li><p class="editor-paragraph-block"><code>worker.lock</code> and <code>worker.context</code> start a bounded run.</p></li>',
    '<li><p class="editor-paragraph-block"><code>worker.reported</code> is the single worker handoff.</p></li>',
    '<li><p class="editor-paragraph-block"><code>controller.verdict</code> and <code>controller.followup</code> drive CEO review.</p></li>',
    '<li><p class="editor-paragraph-block"><code>KILL COMPA-*</code> is the live runtime stop signal.</p></li>',
    '</ul>',
  ].join("");
}

export function planCockpitBootstrap({
  project = {},
  modules = [],
  cycles = [],
  pages = [],
  ownerId = "",
  projectId = "",
} = {}) {
  const moduleIndex = indexByName(modules);
  const cycleIndex = indexByName(cycles);
  const pageIndex = indexByName(pages);

  const plannedModules = DEFAULT_COCKPIT_MODULES.map((module) => ({
    kind: "module",
    name: module.name,
    action: moduleIndex.has(module.name) ? "present" : "create",
    payload: {
      name: module.name,
      status: module.status,
      description: module.description,
    },
    existing_id: moduleIndex.get(module.name)?.id || null,
  }));

  const plannedCycles = DEFAULT_COCKPIT_CYCLES.map((cycle) => ({
    kind: "cycle",
    name: cycle.name,
    action: cycleIndex.has(cycle.name) ? "present" : "create",
    payload: {
      name: cycle.name,
      description: cycle.description,
      start_date: cycle.start_date,
      end_date: cycle.end_date,
      project_id: projectId || undefined,
      owned_by: ownerId || undefined,
    },
    existing_id: cycleIndex.get(cycle.name)?.id || null,
  }));

  const plannedPages = DEFAULT_COCKPIT_PAGES.map((page) => ({
    kind: "page",
    name: page.name,
    action: pageIndex.has(page.name) ? "present" : "create",
    payload: {
      name: page.name,
      description_html: page.description_html,
    },
    existing_id: pageIndex.get(page.name)?.id || null,
  }));

  const overviewHtml = buildProjectOverviewHtml();
  const projectOverviewText = "Company.OS Control Plane — Plane-native execution cockpit for Runtime, Controller, CAO, C-Level workers, Dashboard, Cycles, Modules and Pages.";
  const projectNeedsOverview = ![
    project.description,
    project.description_text,
    project.description_html,
  ].some((value) => String(value || "").includes("Company.OS Control Plane"));

  return {
    version: COCKPIT_VERSION,
    project_overview: {
      action: projectNeedsOverview ? "update" : "present",
      payload: {
        description: projectOverviewText,
        description_html: overviewHtml,
      },
    },
    modules: plannedModules,
    cycles: plannedCycles,
    pages: plannedPages,
    recommended_views: RECOMMENDED_VIEWS,
    summary: {
      create_modules: plannedModules.filter((item) => item.action === "create").length,
      create_cycles: plannedCycles.filter((item) => item.action === "create").length,
      create_pages: plannedPages.filter((item) => item.action === "create").length,
      update_project_overview: projectNeedsOverview,
    },
  };
}

export function inferOwnerId({ project = {}, cycles = [] } = {}) {
  return project.project_lead || project.created_by || cycles.find((cycle) => cycle.owned_by)?.owned_by || "";
}

function indexByName(rows) {
  return new Map((rows || [])
    .filter((row) => row?.name)
    .map((row) => [row.name, row]));
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
