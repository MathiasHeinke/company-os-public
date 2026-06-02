#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import {
  MODEL_PROFILES,
  TASK_MODES,
  buildRunPlan,
  persistModelResult,
  persistModelRouterRaindropSummary,
  runModelWorker,
  writeRunFiles,
} from "./codex-cost-router-core.mjs";
import { DEFAULT_COST_LEDGER, appendCostLedgerRows, buildCostLedgerRow, evaluateBudgetBrake } from "./cost-ledger-core.mjs";

function parseArgs(argv) {
  const options = {
    mode: "issue-triage",
    models: "",
    prompt: "",
    promptFile: "",
    workspace: process.cwd(),
    outDir: "",
    issueId: "",
    source: "",
    allowPrivate: false,
    dryRun: false,
    json: false,
    costLedgerPath: path.join(process.cwd(), DEFAULT_COST_LEDGER),
    appendCostLedger: true,
    budgetBrake: true,
    budgetPolicy: {},
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const nextValue = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`Missing value for ${arg}`);
      return argv[index];
    };

    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--allow-private") options.allowPrivate = true;
    else if (arg === "--no-cost-ledger") options.appendCostLedger = false;
    else if (arg === "--no-budget-brake") options.budgetBrake = false;
    else if (arg === "--allow-unknown-pricing") options.budgetPolicy.block_unknown_pricing = false;
    else if (arg === "--mode") options.mode = nextValue();
    else if (arg === "--models") options.models = nextValue();
    else if (arg === "--prompt") options.prompt = nextValue();
    else if (arg === "--prompt-file") options.promptFile = nextValue();
    else if (arg === "--workspace") options.workspace = nextValue();
    else if (arg === "--out-dir") options.outDir = nextValue();
    else if (arg === "--cost-ledger") options.costLedgerPath = nextValue();
    else if (arg === "--max-run-usd") options.budgetPolicy.max_run_usd = Number(nextValue());
    else if (arg === "--daily-budget-usd") options.budgetPolicy.daily_budget_usd = Number(nextValue());
    else if (arg === "--monthly-budget-usd") options.budgetPolicy.monthly_budget_usd = Number(nextValue());
    else if (arg === "--max-worker-tokens") options.budgetPolicy.max_worker_tokens = Number(nextValue());
    else if (arg === "--unknown-model-reserve-usd") options.budgetPolicy.unknown_model_reserve_usd = Number(nextValue());
    else if (arg === "--issue") options.issueId = nextValue();
    else if (arg === "--source") options.source = nextValue();
    else throw new Error(`Unknown argument: ${arg}`);
  }
  options.costLedgerPath = path.resolve(options.costLedgerPath);

  return options;
}

function printHelp() {
  console.log(
    [
      "Usage:",
      "  node scripts/model-router/codex-cost-router.mjs --mode issue-triage --prompt-file prompt.md [options]",
      "",
      "Options:",
      "  --mode MODE             Task mode. Defaults to issue-triage.",
      "  --models LIST           Comma-separated model aliases. Defaults by mode.",
      "  --prompt TEXT           Inline sanitized prompt.",
      "  --prompt-file PATH      File containing sanitized prompt.",
      "  --workspace PATH        Worker cwd. Defaults to current directory.",
      "  --out-dir PATH          Report directory.",
      "  --cost-ledger PATH      Cost ledger JSONL path. Defaults to metrics/ai-cost-ledger.jsonl.",
      "  --no-cost-ledger        Do not append cost ledger rows.",
      "  --no-budget-brake       Disable pre-dispatch budget brake.",
      "  --max-run-usd N         Default: 1.",
      "  --daily-budget-usd N    Default: 5.",
      "  --monthly-budget-usd N  Default: 50.",
      "  --max-worker-tokens N   Conservative reserve per known-price worker. Default: 250000.",
      "  --allow-unknown-pricing Allow unknown-price models using a reserve instead of blocking.",
      "  --issue ID              Optional Linear issue id for report metadata.",
      "  --source TEXT           Optional source label.",
      "  --dry-run               Build files and manifest without launching workers.",
      "  --allow-private         Explicitly allow private-context prompts; secrets still block.",
      "  --json                  Print machine-readable result.",
      "",
      "Modes:",
      ...Object.entries(TASK_MODES).map(([id, mode]) => `  ${id.padEnd(28)} ${mode.label}`),
      "",
      "Models:",
      ...Object.entries(MODEL_PROFILES).map(([id, model]) => `  ${id.padEnd(10)} ${model.label}`),
    ].join("\n"),
  );
}

function readPrompt(options) {
  if (options.promptFile) return fs.readFileSync(path.resolve(options.promptFile), "utf8");
  if (options.prompt) return options.prompt;
  if (!process.stdin.isTTY) return fs.readFileSync(0, "utf8");
  throw new Error("Provide --prompt, --prompt-file, or stdin.");
}

function printResult(result, json = false) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(`Status: ${result.status}`);
  console.log(`Run directory: ${result.outDir}`);
  if (result.blockReason) console.log(`Blocker: ${result.blockReason}`);
  for (const item of result.results || []) {
    console.log(`- ${item.model}: exit=${item.exitCode} report=${item.report}`);
  }
}

function providerForProfile(profile) {
  if (profile.kind === "codex-openrouter") return "openrouter";
  if (profile.kind === "claude-cli") return "anthropic_claude_cli";
  if (profile.kind === "gemini-cli") return "google_gemini_cli";
  return profile.kind || "unknown";
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const prompt = readPrompt(options);
  const plan = buildRunPlan({
    mode: options.mode,
    models: options.models,
    prompt,
    workspace: options.workspace,
    issueId: options.issueId,
    source: options.source,
    outDir: options.outDir,
    allowPrivate: options.allowPrivate,
  });

  if (options.budgetBrake) {
    plan.budget = evaluateBudgetBrake({
      ledgerPath: options.costLedgerPath,
      modelAliases: plan.models,
      modelProfiles: MODEL_PROFILES,
      promptText: plan.workerPrompt,
      policy: options.budgetPolicy,
    });
  }

  writeRunFiles({ plan, prompt });

  if (plan.blocked) {
    const result = {
      status: "blocked",
      outDir: plan.outDir,
      blockReason: plan.blockReason,
      risk: plan.risk,
      results: [],
    };
    printResult(result, options.json);
    process.exitCode = 2;
    return;
  }

  if (plan.budget && !plan.budget.ok) {
    const result = {
      status: "blocked",
      outDir: plan.outDir,
      blockReason: "budget_brake_blocked",
      risk: plan.risk,
      budget: plan.budget,
      results: [],
    };
    printResult(result, options.json);
    process.exitCode = 2;
    return;
  }

  if (options.dryRun) {
    const result = {
      status: "dry_run",
      outDir: plan.outDir,
      models: plan.models,
      risk: plan.risk,
      results: [],
    };
    printResult(result, options.json);
    return;
  }

  const results = [];
  const costRows = [];
  for (const modelAlias of plan.models) {
    const startedAt = new Date().toISOString();
    const run = runModelWorker({ modelAlias, plan });
    const endedAt = new Date().toISOString();
    const persisted = persistModelResult({ plan, modelAlias, result: run });
    const raindrop = persistModelRouterRaindropSummary({
      plan,
      modelAlias,
      result: run,
      persisted,
      startedAt,
      endedAt,
    });
    persisted.raindrop = raindrop;
    results.push(persisted);
    const profile = MODEL_PROFILES[modelAlias];
    costRows.push(
      buildCostLedgerRow({
        runId: path.basename(plan.outDir),
        issueId: plan.issueId,
        mode: plan.mode,
        modelAlias,
        model: profile.model,
        provider: providerForProfile(profile),
        workspace: plan.workspace,
        report: persisted.report,
        stderr: persisted.stderr,
        exitCode: persisted.exitCode,
        timedOut: persisted.timedOut,
        stdoutText: run.stdout || "",
        stderrText: run.stderr || "",
      }),
    );
  }
  writeRunFiles({ plan, prompt, results });
  if (options.appendCostLedger) appendCostLedgerRows({ ledgerPath: options.costLedgerPath, rows: costRows });

  const failed = results.some((item) => item.exitCode !== 0 || item.timedOut);
  const result = {
    status: failed ? "failed" : "pass",
    outDir: plan.outDir,
    risk: plan.risk,
    results,
  };
  printResult(result, options.json);
  process.exitCode = failed ? 1 : 0;
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
