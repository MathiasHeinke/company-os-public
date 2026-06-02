#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  closeEveWorkstreamSession,
  defaultEveSessionRegistryPath,
  evaluateEveSessionHygiene,
  loadEveSessionRegistry,
  writeEveSessionRegistry,
} from "./eve-session-registry-core.mjs";
import { resolveEveSidecarPaths } from "./eve-sidecar-core.mjs";

function parseArgs(argv) {
  const [command = "inspect", ...rest] = argv;
  const args = {
    command: command === "--help" || command === "-h" ? "help" : command,
    companyOsRoot: process.cwd(),
    privateRoot: "",
    registryPath: "",
    reason: "owner-closed",
    json: false,
  };
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index];
    if (arg === "--help" || arg === "-h") { args.command = "help"; continue; }
    if (arg === "--json") { args.json = true; continue; }
    const nextValue = () => {
      index += 1;
      if (index >= rest.length) throw new Error(`Missing value for ${arg}`);
      return rest[index];
    };
    if (arg === "--company-os-root") { args.companyOsRoot = nextValue(); continue; }
    if (arg === "--private-root") { args.privateRoot = nextValue(); continue; }
    if (arg === "--registry-path") { args.registryPath = nextValue(); continue; }
    if (arg === "--reason") { args.reason = nextValue(); continue; }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return `Usage:
  eve-session-registry.mjs inspect [--json]
  eve-session-registry.mjs close [--reason <reason>] [--json]

Reads the local/private Command EVE workstream session registry. The registry
stores route receipts and hygiene state, not raw secrets or live CLI session ids.
`;
}

function registryPathFromArgs(args) {
  const paths = resolveEveSidecarPaths({
    companyOsRoot: args.companyOsRoot,
    privateRoot: args.privateRoot || undefined,
  });
  return args.registryPath || defaultEveSessionRegistryPath(paths);
}

function print(result, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  process.stdout.write(`eve-session-registry: ${result.status}\n`);
  if (result.registry_path) process.stdout.write(`registry: ${result.registry_path}\n`);
  if (result.hygiene?.status) process.stdout.write(`hygiene: ${result.hygiene.status}\n`);
  if (result.reason) process.stdout.write(`reason: ${result.reason}\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === "help" || !["inspect", "close"].includes(args.command)) {
    process.stdout.write(usage());
    if (args.command !== "help") process.exitCode = 2;
    return;
  }
  const registryPath = registryPathFromArgs(args);
  const loaded = loadEveSessionRegistry(registryPath);
  if (args.command === "inspect") {
    const session = loaded.registry?.sessions?.[loaded.registry?.default_workstream_id || "eve-founder-companion"] || null;
    const hygiene = session ? evaluateEveSessionHygiene(session) : null;
    const result = {
      ok: loaded.ok,
      status: loaded.status,
      registry_path: registryPath,
      errors: loaded.errors || [],
      session,
      hygiene,
    };
    print(result, args.json);
    if (!result.ok) process.exitCode = 2;
    return;
  }
  const close = closeEveWorkstreamSession({
    registry: loaded.registry,
    reason: args.reason,
  });
  if (close.ok) writeEveSessionRegistry(registryPath, close.registry);
  print({ ...close, registry_path: registryPath, written: close.ok }, args.json);
  if (!close.ok) process.exitCode = 2;
}

const invokedPath = process.argv[1] ? fs.realpathSync(path.resolve(process.argv[1])) : "";
const currentPath = fs.realpathSync(fileURLToPath(import.meta.url));
if (invokedPath === currentPath) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error.message || String(error)}\n`);
    process.exitCode = 1;
  });
}
