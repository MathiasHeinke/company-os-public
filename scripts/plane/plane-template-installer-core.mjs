import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  listTemplates,
  renderTemplate,
  validateTemplateRegistry,
} from "./plane-template-registry-core.mjs";

export const TEMPLATE_INSTALLER_VERSION = "plane-template-installer/v0";

export const TEMPLATE_API_PROBE_CANDIDATES = [
  {
    id: "workspace.templates",
    surface: "workspace",
    path: ({ workspace }) => `/api/v1/workspaces/${encodeURIComponent(workspace)}/templates/`,
  },
  {
    id: "workspace.issue_templates",
    surface: "work_item",
    path: ({ workspace }) => `/api/v1/workspaces/${encodeURIComponent(workspace)}/issue-templates/`,
  },
  {
    id: "project.templates",
    surface: "project",
    requiresProject: true,
    path: ({ workspace, projectId }) => `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/templates/`,
  },
  {
    id: "project.issue_templates",
    surface: "work_item",
    requiresProject: true,
    path: ({ workspace, projectId }) => `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/issue-templates/`,
  },
  {
    id: "project.page_templates",
    surface: "page",
    requiresProject: true,
    path: ({ workspace, projectId }) => `/api/v1/workspaces/${encodeURIComponent(workspace)}/projects/${encodeURIComponent(projectId)}/page-templates/`,
  },
];

export function sha256(text) {
  return crypto.createHash("sha256").update(String(text || ""), "utf8").digest("hex");
}

export function slugifyTemplateId(id) {
  return String(id || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildTemplateApiProbePlan({ workspace, projectId = "" } = {}) {
  if (!workspace) throw new Error("workspace is required");
  return TEMPLATE_API_PROBE_CANDIDATES
    .filter((candidate) => !candidate.requiresProject || projectId)
    .map((candidate) => ({
      id: candidate.id,
      surface: candidate.surface,
      method: "GET",
      path: candidate.path({ workspace, projectId }),
    }));
}

export function classifyTemplateApiProbe(probes = []) {
  const rows = probes.map((probe) => ({
    id: probe.id,
    surface: probe.surface,
    path: probe.path,
    status: Number(probe.status || 0),
    ok: Boolean(probe.ok),
    error_code: probe.error_code || "",
  }));
  const supported = rows.filter((row) => row.ok && row.status >= 200 && row.status < 300);
  const authBlocked = rows.filter((row) => row.status === 401 || row.status === 403);
  const inconclusive = rows.filter((row) => row.status && ![404, 405, 501].includes(row.status) && !row.ok);

  if (supported.length) {
    return {
      ok: true,
      status: "api-supported",
      supported: true,
      manual_required: false,
      reason: "At least one candidate Plane template endpoint returned a 2xx response.",
      supported_candidates: supported,
      probes: rows,
    };
  }

  if (authBlocked.length && authBlocked.length === rows.length) {
    return {
      ok: false,
      status: "blocked-auth",
      supported: false,
      manual_required: true,
      reason: "All candidate Plane template endpoints were blocked by auth/permission responses.",
      supported_candidates: [],
      probes: rows,
    };
  }

  if (inconclusive.some((row) => !authBlocked.includes(row))) {
    return {
      ok: false,
      status: "api-inconclusive",
      supported: false,
      manual_required: true,
      reason: "Candidate Plane template endpoint probing returned non-terminal responses.",
      supported_candidates: [],
      probes: rows,
    };
  }

  return {
    ok: true,
    status: "manual-required",
    supported: false,
    manual_required: true,
    reason: "No supported Plane template endpoint was detected. Use deterministic UI install artifacts.",
    supported_candidates: [],
    probes: rows,
  };
}

export function buildTemplateInstallArtifacts(registry, { variables = {}, generatedAt = "" } = {}) {
  const validation = validateTemplateRegistry(registry);
  if (!validation.ok) {
    throw new Error(`Template registry invalid:\n- ${validation.errors.join("\n- ")}`);
  }

  const templates = [];
  const files = new Map();
  for (const template of registry.templates || []) {
    const rendered = renderTemplate(template, variables);
    const relativePath = path.posix.join(
      "templates",
      rendered.plane_surface,
      `${slugifyTemplateId(rendered.id)}.md`,
    );
    const body = renderTemplateInstallBody(rendered);
    const digest = sha256(body);
    templates.push({
      id: rendered.id,
      plane_surface: rendered.plane_surface,
      name: rendered.name,
      description: rendered.description,
      default_labels: rendered.default_labels,
      default_priority: rendered.default_priority,
      path: relativePath,
      sha256: digest,
    });
    files.set(relativePath, body);
  }

  const manifest = {
    version: TEMPLATE_INSTALLER_VERSION,
    registry_version: registry.version,
    source_of_truth: registry.source_of_truth || "",
    generated_at: generatedAt || new Date(0).toISOString(),
    install_mode: "ui-artifact",
    plane_write_path: "none",
    templates,
  };
  files.set("manifest.json", `${JSON.stringify(manifest, null, 2)}\n`);
  files.set("install-runbook.md", renderInstallRunbook({ registry, manifest }));

  return {
    version: TEMPLATE_INSTALLER_VERSION,
    manifest,
    files: [...files.entries()].map(([relativePath, content]) => ({
      relativePath,
      content,
      sha256: sha256(content),
    })),
  };
}

export function renderTemplateInstallBody(rendered) {
  return [
    `# ${rendered.name}`,
    "",
    `Registry ID: \`${rendered.id}\``,
    `Plane surface: \`${rendered.plane_surface}\``,
    rendered.default_priority ? `Default priority: \`${rendered.default_priority}\`` : "Default priority: none",
    rendered.default_labels?.length
      ? `Default labels: ${rendered.default_labels.map((label) => `\`${label}\``).join(", ")}`
      : "Default labels: none",
    "",
    "## Description",
    "",
    rendered.description,
    "",
    "## Body",
    "",
    "```markdown",
    rendered.body_markdown.trimEnd(),
    "```",
    "",
  ].join("\n");
}

export function renderInstallRunbook({ registry, manifest }) {
  const rows = manifest.templates
    .map((template) => `| \`${template.id}\` | ${template.plane_surface} | ${template.name} | \`${template.path}\` |`)
    .join("\n");
  const labels = [...new Set(
    manifest.templates.flatMap((template) => template.default_labels || []).filter(Boolean),
  )].sort();

  return [
    "# Plane Template Install Runbook",
    "",
    `Version: \`${TEMPLATE_INSTALLER_VERSION}\``,
    `Registry: \`${registry.source_of_truth || "registries/plane-templates/company-os.json"}\``,
    "",
    "## Status",
    "",
    "These artifacts are deterministic UI install inputs. They do not mutate Plane.",
    "Use the `probe` command first. If no supported Plane template API is detected, install through Plane UI from the rendered files below.",
    "",
    "## Templates",
    "",
    "| Registry ID | Surface | Plane name | File |",
    "|---|---|---|---|",
    rows,
    "",
    "## Required Labels",
    "",
    labels.length
      ? labels.map((label) => `- \`${label}\``).join("\n")
      : "- none",
    "",
    "## Install Rules",
    "",
    "1. Check whether a Plane template with the same name already exists.",
    "2. Do not create duplicates. Update the existing template when the body differs.",
    "3. Paste from the rendered artifact file, not from screenshots or stale chat text.",
    "4. Keep `dispatch: manual` unchanged unless a separate scheduler/dispatcher run is approved.",
    "5. Worker and CAO do not set Plane Done.",
    "6. Record the installed template name and registry ID in the relevant Plane project overview or run report.",
    "",
    "## Surface Mapping",
    "",
    "- `work_item`: install as a Plane issue/work-item template when the UI exposes templates. If no template UI is visible, paste the body during item creation.",
    "- `page`: create a Plane page from the rendered body; pages are decision surfaces, not execution ledger comments.",
    "- `project`: use as a project provisioning checklist or pinned page. Plane project-template API support is not assumed.",
    "",
  ].join("\n");
}

export function writeTemplateInstallArtifacts(artifacts, outputDir) {
  if (!outputDir) throw new Error("outputDir is required");
  const written = [];
  for (const file of artifacts.files) {
    const target = path.join(outputDir, file.relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.content, "utf8");
    written.push({
      path: target,
      relativePath: file.relativePath,
      sha256: file.sha256,
    });
  }
  return written;
}

export function verifyTemplateInstallArtifacts(registry, outputDir, { variables = {} } = {}) {
  const manifestPath = path.join(outputDir, "manifest.json");
  let generatedAt = "";
  if (fs.existsSync(manifestPath)) {
    try {
      generatedAt = JSON.parse(fs.readFileSync(manifestPath, "utf8"))?.generated_at || "";
    } catch {
      generatedAt = "";
    }
  }
  const expected = buildTemplateInstallArtifacts(registry, { variables, generatedAt });
  const errors = [];
  const checked = [];

  for (const file of expected.files) {
    const target = path.join(outputDir, file.relativePath);
    if (!fs.existsSync(target)) {
      errors.push(`missing artifact: ${file.relativePath}`);
      continue;
    }
    const content = fs.readFileSync(target, "utf8");
    const actualHash = sha256(content);
    checked.push({
      relativePath: file.relativePath,
      expected_sha256: file.sha256,
      actual_sha256: actualHash,
    });
    if (actualHash !== file.sha256) {
      errors.push(`artifact drift: ${file.relativePath}`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    checked,
    expected_count: expected.files.length,
  };
}

export function summarizeRegistryTemplates(registry) {
  return listTemplates(registry).map((template) => ({
    id: template.id,
    plane_surface: template.plane_surface,
    name: template.name,
    default_labels: template.default_labels,
    default_priority: template.default_priority,
  }));
}
