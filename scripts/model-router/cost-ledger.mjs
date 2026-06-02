#!/usr/bin/env node
import path from "node:path";

import {
  DEFAULT_COST_LEDGER,
  evaluateBudgetBrake,
  renderCostSummaryMarkdown,
  summarizeCostLedger,
} from "./cost-ledger-core.mjs";
import { MODEL_PROFILES, parseModelList } from "./codex-cost-router-core.mjs";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function parseArgs(argv) {
  const options = {
    command: "summary",
    month: currentMonth(),
    ledgerPath: path.join(process.cwd(), DEFAULT_COST_LEDGER),
    gpt55EquivalentEurPerMTokens: null,
    models: "",
    prompt: "",
    budgetPolicy: {},
    json: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const nextValue = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`Missing value for ${arg}`);
      return argv[index];
    };
    if (arg === "summary") options.command = "summary";
    else if (arg === "budget-check") options.command = "budget-check";
    else if (arg === "--month") options.month = nextValue();
    else if (arg === "--ledger") options.ledgerPath = nextValue();
    else if (arg === "--gpt55-eur-per-m-token") options.gpt55EquivalentEurPerMTokens = Number(nextValue());
    else if (arg === "--models") options.models = nextValue();
    else if (arg === "--prompt") options.prompt = nextValue();
    else if (arg === "--max-run-usd") options.budgetPolicy.max_run_usd = Number(nextValue());
    else if (arg === "--daily-budget-usd") options.budgetPolicy.daily_budget_usd = Number(nextValue());
    else if (arg === "--monthly-budget-usd") options.budgetPolicy.monthly_budget_usd = Number(nextValue());
    else if (arg === "--max-worker-tokens") options.budgetPolicy.max_worker_tokens = Number(nextValue());
    else if (arg === "--allow-unknown-pricing") options.budgetPolicy.block_unknown_pricing = false;
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  options.ledgerPath = path.resolve(options.ledgerPath);
  return options;
}

function printHelp() {
  console.log(
    [
      "Usage:",
      "  node scripts/model-router/cost-ledger.mjs summary [--month YYYY-MM] [--gpt55-eur-per-m-token N] [--json]",
      "  node scripts/model-router/cost-ledger.mjs budget-check --models grok,deepseek [--max-run-usd N] [--json]",
      "",
      "Default ledger:",
      `  ${DEFAULT_COST_LEDGER}`,
    ].join("\n"),
  );
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  if (options.command === "budget-check") {
    const result = evaluateBudgetBrake({
      ledgerPath: options.ledgerPath,
      modelAliases: parseModelList(options.models, "issue-triage"),
      modelProfiles: MODEL_PROFILES,
      promptText: options.prompt,
      policy: options.budgetPolicy,
    });
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else console.log(`${result.status.toUpperCase()} reserve=${result.reserve_usd} daily=${result.daily_spent_usd}/${result.policy.daily_budget_usd} monthly=${result.monthly_spent_usd}/${result.policy.monthly_budget_usd}`);
    if (!result.ok) process.exitCode = 2;
    return;
  }

  if (options.command !== "summary") throw new Error(`Unsupported command: ${options.command}`);
  const summary = summarizeCostLedger({
    ledgerPath: options.ledgerPath,
    month: options.month,
    gpt55EquivalentEurPerMTokens: options.gpt55EquivalentEurPerMTokens,
  });
  if (options.json) console.log(JSON.stringify(summary, null, 2));
  else console.log(renderCostSummaryMarkdown(summary));
}

main();
