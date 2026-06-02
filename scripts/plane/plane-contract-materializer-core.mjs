import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { htmlEscape } from "../orchestration/plane-html.mjs";
import { extractContractBlock, validateContract } from "../orchestration/worker-ledger-validator.mjs";

export const MATERIALIZER_VERSION = "plane-contract-materializer/v0";
export const DEFAULT_EXTERNAL_SOURCE = "company-os-contract-materializer";
export const DEFAULT_COMMAND_EVE_SET = [
  {
    slug: "parent",
    file: "docs/templates/command-eve-installable-operator-shell-parent-worker-contract.md",
  },
  {
    slug: "installer-architecture",
    parentSlug: "parent",
    file: "docs/templates/command-eve-installer-architecture-worker-contract.md",
  },
  {
    slug: "aionui-extension",
    parentSlug: "parent",
    file: "docs/templates/command-eve-aionui-extension-worker-contract.md",
  },
  {
    slug: "installer-cli",
    parentSlug: "parent",
    file: "docs/templates/command-eve-installer-cli-worker-contract.md",
  },
  {
    slug: "connector-catalog",
    parentSlug: "parent",
    file: "docs/templates/command-eve-connector-catalog-worker-contract.md",
  },
  {
    slug: "hermes-runtime-packaging",
    parentSlug: "parent",
    file: "docs/templates/command-eve-hermes-runtime-packaging-worker-contract.md",
  },
  {
    slug: "update-lifecycle",
    parentSlug: "parent",
    file: "docs/templates/command-eve-update-lifecycle-worker-contract.md",
  },
  {
    slug: "goal-materialization",
    parentSlug: "parent",
    file: "docs/templates/command-eve-goal-materialization-worker-contract.md",
  },
  {
    slug: "fresh-install-e2e",
    parentSlug: "parent",
    file: "docs/templates/command-eve-fresh-install-e2e-worker-contract.md",
  },
  {
    slug: "security-productization-audit",
    parentSlug: "parent",
    file: "docs/templates/command-eve-security-productization-audit-worker-contract.md",
  },
];

export function defaultLabelMapPath({ root, workspace, projectId }) {
  return join(root, "runtime/plane-label-map", `${workspace}-${projectId}.json`);
}

export function loadLabelMap(labelMapPath) {
  const raw = JSON.parse(readFileSync(labelMapPath, "utf8"));
  const labels = Array.isArray(raw.labels) ? raw.labels : [];
  const byName = new Map();
  for (const label of labels) {
    if (label?.name && label?.id) byName.set(label.name, label.id);
  }
  return {
    version: raw.version || null,
    workspace: raw.workspace || null,
    project_id: raw.project_id || null,
    byName,
  };
}

export function markdownTitle(markdown, fallback) {
  const match = String(markdown || "").match(/^#\s+(.+?)\s*$/m);
  return match ? match[1].trim() : fallback;
}

export function contractFields(markdown) {
  const extracted = extractContractBlock(markdown);
  if (!extracted.ok) {
    throw new Error(`Contract block missing: ${extracted.reason}`);
  }
  return extracted.fields || {};
}

export function validateTemplateContract({ markdown, role }) {
  const verdict = validateContract({ description: markdown, labels: role ? [role] : [] });
  const unexpected = verdict.reason_codes.filter((code) => code !== "contract.dispatch-not-ready");
  return {
    ok: unexpected.length === 0,
    reason_codes: verdict.reason_codes,
    unexpected,
  };
}

export function resolvePortablePlaceholders(markdown, { root } = {}) {
  const companyOsRoot = String(root || "").replace(/\/+$/g, "");
  if (!companyOsRoot) return String(markdown || "");
  return String(markdown || "").replaceAll("${COMPANY_OS_ROOT}", companyOsRoot);
}

export function buildDescriptionHtml(markdown, { root } = {}) {
  return `<pre><code>${htmlEscape(resolvePortablePlaceholders(markdown, { root }))}</code></pre>`;
}

export function planContractMaterialization({
  root,
  workspace,
  projectId,
  labelMapPath,
  contractSet = DEFAULT_COMMAND_EVE_SET,
  externalSource = DEFAULT_EXTERNAL_SOURCE,
  externalPrefix = "command-eve-installable-operator-shell",
  targetDate = "",
}) {
  const map = loadLabelMap(labelMapPath);
  const errors = [];
  const items = [];

  if (map.workspace && map.workspace !== workspace) {
    errors.push(`label-map workspace mismatch: ${map.workspace} !== ${workspace}`);
  }
  if (map.project_id && map.project_id !== projectId) {
    errors.push(`label-map project mismatch: ${map.project_id} !== ${projectId}`);
  }

  for (const spec of contractSet) {
    const absolutePath = resolve(root, spec.file);
    const markdown = readFileSync(absolutePath, "utf8");
    const fields = contractFields(markdown);
    const role = String(fields.role || "").trim();
    const title = markdownTitle(markdown, spec.slug);
    const labelId = map.byName.get(role);
    const validation = validateTemplateContract({ markdown, role });

    if (!role) errors.push(`${spec.file}: missing role`);
    if (!labelId) errors.push(`${spec.file}: label id missing for ${role || "(empty role)"}`);
    if (!validation.ok) {
      errors.push(`${spec.file}: unexpected validation reasons ${validation.unexpected.join(", ")}`);
    }

    items.push({
      slug: spec.slug,
      parentSlug: spec.parentSlug || "",
      file: spec.file,
      absolutePath,
      title,
      role,
      labelId,
      externalSource,
      externalId: `${externalPrefix}:${spec.slug}`,
      validation,
      payload: {
        name: title,
        description_html: buildDescriptionHtml(markdown, { root }),
        priority: "none",
        labels: labelId ? [labelId] : [],
        external_source: externalSource,
        external_id: `${externalPrefix}:${spec.slug}`,
        target_date: targetDate || undefined,
      },
    });
  }

  return {
    version: MATERIALIZER_VERSION,
    workspace,
    projectId,
    labelMapPath,
    externalSource,
    externalPrefix,
    ok: errors.length === 0,
    errors,
    items,
  };
}
