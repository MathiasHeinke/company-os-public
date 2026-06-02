#!/usr/bin/env node
import path from "node:path";

import { DEFAULT_BASE_URL, resolvePlaneAuth } from "./plane-auth.mjs";
import { loadTemplateRegistry, parseVarAssignment } from "./plane-template-registry-core.mjs";
import {
  buildTemplateApiProbePlan,
  buildTemplateInstallArtifacts,
  classifyTemplateApiProbe,
  summarizeRegistryTemplates,
  verifyTemplateInstallArtifacts,
  writeTemplateInstallArtifacts,
} from "./plane-template-installer-core.mjs";

function parseArgs(argv) {
  const args = {
    command: argv[0] || "help",
    registry: "registries/plane-templates/company-os.json",
    outputDir: "reports/runs/[WORK_ITEM_ID]/template-install-artifacts",
    workspace: process.env.PLANE_WORKSPACE_SLUG || "companyos",
    projectId: process.env.PLANE_PROJECT_ID || "",
    auth: process.env.PLANE_AUTH_MODE || "app-token",
    baseUrl: process.env.PLANE_BASE_URL || DEFAULT_BASE_URL,
    vars: {},
    json: false,
  };

  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--registry") {
      args.registry = argv[++index] || args.registry;
      continue;
    }
    if (arg === "--output-dir") {
      args.outputDir = argv[++index] || args.outputDir;
      continue;
    }
    if (arg === "--workspace") {
      args.workspace = argv[++index] || args.workspace;
      continue;
    }
    if (arg === "--project-id") {
      args.projectId = argv[++index] || "";
      continue;
    }
    if (arg === "--auth") {
      args.auth = argv[++index] || args.auth;
      continue;
    }
    if (arg === "--base-url") {
      args.baseUrl = argv[++index] || args.baseUrl;
      continue;
    }
    if (arg === "--var") {
      const [key, value] = parseVarAssignment(argv[++index]);
      args.vars[key] = value;
      continue;
    }
    if (arg === "--json") {
      args.json = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      args.command = "help";
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  args.registry = path.resolve(args.registry);
  args.outputDir = path.resolve(args.outputDir);
  args.baseUrl = args.baseUrl.replace(/\/+$/, "");
  return args;
}

function printHelp() {
  console.log([
    "Usage: plane-template-installer.mjs <probe|render|verify|summary> [options]",
    "",
    "Commands:",
    "  probe                  Read-only probe for supported Plane template API endpoints.",
    "  render                 Render deterministic UI install artifacts from the registry.",
    "  verify                 Verify rendered artifacts still match the registry.",
    "  summary                Print the registry template install surface summary.",
    "",
    "Options:",
    "  --registry <path>      Registry JSON path.",
    "  --output-dir <path>    Artifact directory for render/verify.",
    "  --workspace <slug>     Plane workspace slug for probe. Default: companyos.",
    "  --project-id <uuid>    Optional Plane project id for project-scoped endpoint probes.",
    "  --auth <mode>          Plane auth mode for probe. Default: app-token.",
    "  --base-url <url>       Plane API base URL.",
    "  --var KEY=VALUE        Override template variable while rendering; repeatable.",
    "  --json                 Emit JSON.",
    "",
    "Safety:",
    "  This CLI does not create, update or delete Plane templates. `probe` only sends GET requests.",
  ].join("\n"));
}

async function requestProbe({ baseUrl, authHeaders, path: apiPath }) {
  const response = await fetch(`${baseUrl}${apiPath}`, {
    method: "GET",
    headers: {
      ...authHeaders,
      "Accept": "application/json",
    },
  });
  let parsed = null;
  const text = await response.text();
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text.slice(0, 300) };
  }
  return {
    ok: response.ok,
    status: response.status,
    body_shape: Array.isArray(parsed) ? "array" : typeof parsed,
  };
}

async function runProbe(args) {
  const auth = resolvePlaneAuth(args.auth);
  if (!auth.ok) {
    return {
      ok: false,
      status: "blocked-auth",
      error: auth.missingError,
      authMode: auth.authMode,
    };
  }
  const plan = buildTemplateApiProbePlan({
    workspace: args.workspace,
    projectId: args.projectId,
  });
  const probes = [];
  for (const candidate of plan) {
    const response = await requestProbe({
      baseUrl: args.baseUrl,
      authHeaders: auth.headers,
      path: candidate.path,
    });
    probes.push({
      ...candidate,
      ...response,
    });
  }
  return {
    authMode: auth.authMode,
    workspace: args.workspace,
    projectId: args.projectId || null,
    ...classifyTemplateApiProbe(probes),
  };
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  if (result.command === "render") {
    console.log(`Rendered ${result.written.length} files to ${result.outputDir}`);
    for (const file of result.written) console.log(`- ${file.relativePath}`);
    return;
  }
  if (result.command === "verify") {
    console.log(`Template install artifacts: ${result.ok ? "pass" : "fail"}`);
    console.log(`checked: ${result.checked.length}/${result.expected_count}`);
    for (const error of result.errors || []) console.log(`- ${error}`);
    return;
  }
  if (result.command === "probe") {
    console.log(`Plane template API probe: ${result.status}`);
    console.log(result.reason || result.error || "");
    for (const probe of result.probes || []) {
      console.log(`- ${probe.id}: HTTP ${probe.status} ${probe.path}`);
    }
    return;
  }
  if (result.command === "summary") {
    for (const template of result.templates) {
      console.log(`${template.id}\t${template.plane_surface}\t${template.name}`);
    }
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === "help") {
    printHelp();
    return;
  }

  if (args.command === "probe") {
    const result = { command: args.command, ...(await runProbe(args)) };
    printResult(result, args.json);
    process.exitCode = result.ok ? 0 : 1;
    return;
  }

  const registry = loadTemplateRegistry(args.registry);

  if (args.command === "summary") {
    printResult({
      command: args.command,
      ok: true,
      templates: summarizeRegistryTemplates(registry),
    }, args.json);
    return;
  }

  if (args.command === "render") {
    const artifacts = buildTemplateInstallArtifacts(registry, {
      variables: args.vars,
      generatedAt: new Date().toISOString(),
    });
    const written = writeTemplateInstallArtifacts(artifacts, args.outputDir);
    printResult({
      command: args.command,
      ok: true,
      outputDir: args.outputDir,
      manifest: artifacts.manifest,
      written,
    }, args.json);
    return;
  }

  if (args.command === "verify") {
    const result = verifyTemplateInstallArtifacts(registry, args.outputDir, {
      variables: args.vars,
    });
    printResult({ command: args.command, ...result }, args.json);
    process.exitCode = result.ok ? 0 : 1;
    return;
  }

  throw new Error(`Unknown command: ${args.command}`);
}

main().catch((error) => {
  console.error(`Plane template installer failed: ${error.message}`);
  process.exitCode = 1;
});
