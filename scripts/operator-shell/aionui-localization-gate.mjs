#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

import {
  AIONUI_COMMAND_EVE_LOCALE_PACK_LANGUAGE,
  AIONUI_COMMAND_EVE_LOCALE_PACK_NAMESPACES,
  resolveAionuiCommandEveOverlayPaths,
} from "./aionui-command-eve-overlay-core.mjs";

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function exists(filePath) {
  return Boolean(filePath) && fs.existsSync(filePath);
}

function leafEntries(value, prefix = "") {
  if (Array.isArray(value)) return [[prefix, value]];
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, next]) => leafEntries(next, prefix ? `${prefix}.${key}` : key));
  }
  return [[prefix, value]];
}

function placeholders(value) {
  if (typeof value !== "string") return [];
  return [...value.matchAll(/\{\{\s*[^}]+\s*\}\}/g)].map((match) => match[0]).sort();
}

function compareJsonShape(source, target, namespace) {
  const errors = [];
  const sourceLeaves = new Map(leafEntries(source));
  const targetLeaves = new Map(leafEntries(target));

  for (const key of sourceLeaves.keys()) {
    if (!targetLeaves.has(key)) errors.push(`${namespace}: missing key ${key}`);
  }
  for (const key of targetLeaves.keys()) {
    if (!sourceLeaves.has(key)) errors.push(`${namespace}: extra key ${key}`);
  }
  for (const [key, sourceValue] of sourceLeaves.entries()) {
    if (!targetLeaves.has(key)) continue;
    const targetValue = targetLeaves.get(key);
    if (typeof sourceValue !== typeof targetValue) {
      errors.push(`${namespace}: type mismatch ${key}`);
      continue;
    }
    const sourcePlaceholders = placeholders(sourceValue);
    const targetPlaceholders = placeholders(targetValue);
    if (JSON.stringify(sourcePlaceholders) !== JSON.stringify(targetPlaceholders)) {
      errors.push(
        `${namespace}: placeholder mismatch ${key}: ${JSON.stringify(sourcePlaceholders)} != ${JSON.stringify(targetPlaceholders)}`,
      );
    }
  }

  return {
    errors,
    leaf_count: sourceLeaves.size,
  };
}

export function validateAionuiCommandEveLocalization(options = {}) {
  const paths = resolveAionuiCommandEveOverlayPaths(options);
  const sourceLocaleRoot = path.join(
    paths.aionuiRoot,
    "packages/desktop/src/renderer/services/i18n/locales/en-US",
  );
  const targetLocaleRoot = path.join(
    paths.companyOsRoot,
    "assets/brand/eve-command/aionui-overlay/locales",
    AIONUI_COMMAND_EVE_LOCALE_PACK_LANGUAGE,
  );

  const errors = [];
  if (!exists(sourceLocaleRoot)) errors.push(`AionUI en-US locale root not found: ${sourceLocaleRoot}`);
  if (!exists(targetLocaleRoot)) errors.push(`Command EVE locale pack not found: ${targetLocaleRoot}`);

  if (errors.length) {
    return {
      ok: false,
      status: "blocked",
      language: AIONUI_COMMAND_EVE_LOCALE_PACK_LANGUAGE,
      errors,
      paths: { sourceLocaleRoot, targetLocaleRoot },
    };
  }

  const sourceNamespaces = fs.readdirSync(sourceLocaleRoot)
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.replace(/\.json$/, ""))
    .sort();
  const expectedNamespaces = [...AIONUI_COMMAND_EVE_LOCALE_PACK_NAMESPACES].sort();

  for (const namespace of expectedNamespaces) {
    if (!sourceNamespaces.includes(namespace)) errors.push(`AionUI en-US namespace missing: ${namespace}`);
  }
  for (const namespace of sourceNamespaces) {
    if (!expectedNamespaces.includes(namespace)) errors.push(`AionUI en-US namespace not covered by Command EVE pack: ${namespace}`);
  }

  let leafCount = 0;
  const namespaces = [];
  for (const namespace of expectedNamespaces) {
    const sourceFile = path.join(sourceLocaleRoot, `${namespace}.json`);
    const targetFile = path.join(targetLocaleRoot, `${namespace}.json`);
    if (!exists(sourceFile)) continue;
    if (!exists(targetFile)) {
      errors.push(`${namespace}: target locale file missing`);
      continue;
    }
    try {
      const comparison = compareJsonShape(readJson(sourceFile), readJson(targetFile), namespace);
      errors.push(...comparison.errors);
      leafCount += comparison.leaf_count;
      namespaces.push({ namespace, leaf_count: comparison.leaf_count });
    } catch (error) {
      errors.push(`${namespace}: ${error.message}`);
    }
  }

  const indexFile = path.join(targetLocaleRoot, "index.ts");
  const indexText = exists(indexFile) ? fs.readFileSync(indexFile, "utf8") : "";
  if (!indexText) errors.push("de-DE index.ts missing");
  if (indexText.includes("../en-US")) errors.push("de-DE index.ts must not import en-US fallback modules");
  for (const namespace of AIONUI_COMMAND_EVE_LOCALE_PACK_NAMESPACES) {
    if (!indexText.includes(`./${namespace}.json`)) errors.push(`de-DE index.ts missing ${namespace} import`);
  }

  return {
    ok: errors.length === 0,
    status: errors.length ? "blocked" : "pass",
    language: AIONUI_COMMAND_EVE_LOCALE_PACK_LANGUAGE,
    source_language: "en-US",
    namespace_count: namespaces.length,
    leaf_count: leafCount,
    namespaces,
    errors,
    paths: { sourceLocaleRoot, targetLocaleRoot, indexFile },
  };
}

function parseArgs(argv) {
  const args = {
    companyOsRoot: "",
    aionuiRoot: "",
    privateRoot: "",
    json: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") { args.help = true; continue; }
    if (arg === "--json") { args.json = true; continue; }
    const nextValue = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`Missing value for ${arg}`);
      return argv[index];
    };
    if (arg === "--company-os-root") { args.companyOsRoot = nextValue(); continue; }
    if (arg === "--aionui-root") { args.aionuiRoot = nextValue(); continue; }
    if (arg === "--private-root") { args.privateRoot = nextValue(); continue; }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return `Usage:
  aionui-localization-gate.mjs [--company-os-root PATH] [--aionui-root PATH] [--json]

Validates the Command EVE de-DE AionUI language pack against the installed
AionUI en-US locale source. The gate fails on missing namespaces, missing or
extra keys, type drift, placeholder drift, or an en-US fallback import in the
de-DE index.
`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(usage());
    return;
  }
  const result = validateAionuiCommandEveLocalization({
    companyOsRoot: args.companyOsRoot || undefined,
    aionuiRoot: args.aionuiRoot || undefined,
    privateRoot: args.privateRoot || undefined,
  });
  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    process.stdout.write(`AionUI Command EVE localization gate: ${result.status}\n`);
    process.stdout.write(`Namespaces: ${result.namespace_count || 0}; leaf keys: ${result.leaf_count || 0}\n`);
    for (const error of result.errors || []) process.stdout.write(`- ${error}\n`);
  }
  if (!result.ok) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 2;
  });
}
