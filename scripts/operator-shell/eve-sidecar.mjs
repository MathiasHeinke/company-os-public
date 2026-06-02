#!/usr/bin/env node

import childProcess from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildAionuiStartCommand,
  EVE_SIDECAR_VERSION,
  prepareEveSidecar,
  preflightEveSidecar,
  runHermesEveSmoke,
  writePilotReport,
} from "./eve-sidecar-core.mjs";

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = {
    command: command === "--help" || command === "-h" ? "" : command,
    companyOsRoot: process.cwd(),
    privateRoot: "",
    aionuiRoot: "",
    hermesRoot: "",
    hermesHome: "",
    hermesWrapper: "",
    port: 25809,
    date: new Date().toISOString().slice(0, 10),
    dryRun: false,
    json: false,
    writeReport: false,
    timeoutMs: 180_000,
    provider: "",
    model: "",
    help: command === "--help" || command === "-h",
  };
  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === "--help" || arg === "-h") { args.help = true; continue; }
    if (arg === "--dry-run") { args.dryRun = true; continue; }
    if (arg === "--json") { args.json = true; continue; }
    if (arg === "--write-report") { args.writeReport = true; continue; }
    const nextValue = () => {
      i += 1;
      if (i >= rest.length) throw new Error(`Missing value for ${arg}`);
      return rest[i];
    };
    if (arg === "--company-os-root") { args.companyOsRoot = nextValue(); continue; }
    if (arg === "--private-root") { args.privateRoot = nextValue(); continue; }
    if (arg === "--aionui-root") { args.aionuiRoot = nextValue(); continue; }
    if (arg === "--hermes-root") { args.hermesRoot = nextValue(); continue; }
    if (arg === "--hermes-home") { args.hermesHome = nextValue(); continue; }
    if (arg === "--hermes-wrapper") { args.hermesWrapper = nextValue(); continue; }
    if (arg === "--port") { args.port = Number(nextValue()); continue; }
    if (arg === "--date") { args.date = nextValue(); continue; }
    if (arg === "--timeout-ms") { args.timeoutMs = Number(nextValue()); continue; }
    if (arg === "--provider") { args.provider = nextValue(); continue; }
    if (arg === "--model") { args.model = nextValue(); continue; }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function usage() {
  return `Usage:
  eve-sidecar.mjs prepare [--dry-run] [--json]
  eve-sidecar.mjs preflight [--json]
  eve-sidecar.mjs smoke [--write-report] [--json] [--provider <provider>] [--model <model>]
  eve-sidecar.mjs start-command [--port 25809]
  eve-sidecar.mjs start [--port 25809] [--write-report]

Commands:
  prepare        Generate HERMES_HOME/SOUL.md, private context overlays and hermes shims.
  preflight      Check AionUI, Hermes, Command EVE soul and read-only packet paths.
  smoke          Run a Hermes one-shot Command EVE smoke prompt.
  start-command  Print the exact AionUI webui start command.
  start          Prepare + preflight + start AionUI webui detached.

Version: ${EVE_SIDECAR_VERSION}
`;
}

function print(result, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  process.stdout.write(`EVE sidecar: ${result.status}\n`);
  if (result.report) process.stdout.write(`report: ${result.report.markdown}\n`);
  if (result.errors?.length) {
    for (const error of result.errors) process.stdout.write(`error: ${error}\n`);
  }
  if (result.failures?.length) {
    for (const failure of result.failures) process.stdout.write(`failure: ${failure}\n`);
  }
}

function commonOptions(args) {
  return {
    companyOsRoot: args.companyOsRoot,
    privateRoot: args.privateRoot || undefined,
    aionuiRoot: args.aionuiRoot || undefined,
    hermesRoot: args.hermesRoot || undefined,
    hermesHome: args.hermesHome || undefined,
    hermesWrapper: args.hermesWrapper || undefined,
    port: args.port,
    date: args.date,
  };
}

function probeLocalUrl(url, timeoutMs = 2_000) {
  return new Promise((resolve) => {
    const request = http.request(url, { method: "HEAD", timeout: timeoutMs }, (response) => {
      response.resume();
      resolve({
        ok: response.statusCode >= 200 && response.statusCode < 500,
        status_code: response.statusCode,
      });
    });
    request.on("timeout", () => {
      request.destroy(new Error("timeout"));
    });
    request.on("error", (error) => {
      resolve({ ok: false, status_code: 0, error: error.message });
    });
    request.end();
  });
}

async function waitForLocalUrl(url, timeoutMs = 30_000) {
  const started = Date.now();
  let last = { ok: false, error: "not-started" };
  while (Date.now() - started < timeoutMs) {
    last = await probeLocalUrl(url, 2_000);
    if (last.ok) return { ...last, waited_ms: Date.now() - started };
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return { ...last, waited_ms: Date.now() - started };
}

function readPidFile(paths) {
  const pidFile = path.join(paths.aionuiLog, "aionui-webui.pid");
  if (!fs.existsSync(pidFile)) return "";
  return fs.readFileSync(pidFile, "utf8").trim();
}

async function startDetached(preflight, port) {
  const paths = preflight.paths;
  const logFile = path.join(paths.aionuiLog, "aionui-webui.log");
  const url = `http://127.0.0.1:${port}`;
  fs.mkdirSync(paths.aionuiLog, { recursive: true });
  const existing = await probeLocalUrl(url);
  if (existing.ok) {
    return {
      ok: true,
      status: "already_running",
      pid: readPidFile(paths),
      url,
      log_file: logFile,
      probe: existing,
    };
  }
  const out = fs.openSync(logFile, "a");
  const child = childProcess.spawn(
    "bun",
    ["run", "webui", "--no-build", "--port", String(port)],
    {
      cwd: paths.aionuiRoot,
      detached: true,
      stdio: ["ignore", out, out],
      env: {
        ...process.env,
        PATH: `${paths.aionuiBin}:${process.env.HOME}/.bun/bin:${process.env.PATH || ""}`,
        AIONUI_DATA_DIR: paths.aionuiData,
        AIONUI_LOG_DIR: paths.aionuiLog,
        HERMES_HOME: paths.hermesHome,
      },
    },
  );
  child.unref();
  fs.writeFileSync(path.join(paths.aionuiLog, "aionui-webui.pid"), `${child.pid}\n`);
  const probe = await waitForLocalUrl(url);
  return {
    ok: probe.ok,
    status: probe.ok ? "started" : "start_timeout",
    pid: child.pid,
    url,
    log_file: logFile,
    probe,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !["prepare", "preflight", "smoke", "start-command", "start"].includes(args.command)) {
    process.stdout.write(usage());
    if (!args.help) process.exitCode = 2;
    return;
  }
  const options = commonOptions(args);
  if (args.command === "prepare") {
    const result = prepareEveSidecar({ ...options, dryRun: args.dryRun });
    print(result, args.json);
    if (!result.ok) process.exitCode = 2;
    return;
  }
  if (args.command === "preflight") {
    const result = preflightEveSidecar(options);
    print(result, args.json);
    if (!result.ok) process.exitCode = 2;
    return;
  }
  if (args.command === "start-command") {
    const preflight = preflightEveSidecar(options);
    process.stdout.write(`${buildAionuiStartCommand({ paths: preflight.paths, port: args.port }).join("\n")}\n`);
    return;
  }
  if (args.command === "smoke") {
    const prepare = prepareEveSidecar(options);
    const preflight = preflightEveSidecar(options);
    const smoke = preflight.ok
      ? runHermesEveSmoke({ ...options, timeoutMs: args.timeoutMs, provider: args.provider, model: args.model })
      : null;
    const result = {
      ok: Boolean(prepare.ok && preflight.ok && smoke?.ok),
      version: EVE_SIDECAR_VERSION,
      status: prepare.ok && preflight.ok && smoke?.ok ? "pass" : "blocked",
      prepare,
      preflight,
      smoke,
    };
    if (args.writeReport) {
      result.report = writePilotReport({ preflight, prepare, smoke, port: args.port, date: args.date, companyOsRoot: args.companyOsRoot });
    }
    print(result, args.json);
    if (!result.ok) process.exitCode = 2;
    return;
  }
  if (args.command === "start") {
    const prepare = prepareEveSidecar(options);
    const preflight = preflightEveSidecar(options);
    const start = preflight.ok ? await startDetached(preflight, args.port) : null;
    const result = {
      ok: Boolean(prepare.ok && preflight.ok && start?.ok),
      version: EVE_SIDECAR_VERSION,
      status: prepare.ok && preflight.ok && start?.ok ? "pass" : "blocked",
      prepare,
      preflight,
      start,
    };
    if (args.writeReport) {
      result.report = writePilotReport({ preflight, prepare, smoke: null, port: args.port, date: args.date, companyOsRoot: args.companyOsRoot });
    }
    print(result, args.json);
    if (!result.ok) process.exitCode = 2;
  }
}

const invokedPath = process.argv[1] ? fs.realpathSync(path.resolve(process.argv[1])) : "";
const currentPath = fs.realpathSync(fileURLToPath(import.meta.url));
if (invokedPath === currentPath) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error.message || String(error)}\n`);
    process.exitCode = 1;
  });
}
