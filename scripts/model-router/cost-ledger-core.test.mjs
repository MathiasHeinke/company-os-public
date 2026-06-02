import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  appendCostLedgerRows,
  buildCostLedgerRow,
  evaluateBudgetBrake,
  extractCodexTokens,
  extractRuntimeTokens,
  estimateWorkerReserveUsd,
  renderCostSummaryMarkdown,
  summarizeCostLedger,
} from "./cost-ledger-core.mjs";

function tempLedger() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), "ai-cost-ledger-")), "ledger.jsonl");
}

test("extractCodexTokens parses Codex CLI token footer with thousands separators", () => {
  assert.equal(extractCodexTokens("tokens used\n41.522\n").total, 41522);
  assert.equal(extractCodexTokens("tokens used\r\n1,234\r\n").total, 1234);
  assert.equal(extractCodexTokens("no footer").total, null);
});

test("extractRuntimeTokens parses Gemini-style total token footer", () => {
  const parsed = extractRuntimeTokens("Done\nTotal tokens: 12,345\n");

  assert.equal(parsed.total, 12345);
  assert.equal(parsed.source, "total_tokens");
});

test("buildCostLedgerRow tracks tokens without storing prompt text", () => {
  const row = buildCostLedgerRow({
    timestamp: "2026-05-08T08:30:00.000Z",
    runId: "run-1",
    issueId: "[WORK_ITEM_ID]",
    mode: "issue-triage",
    modelAlias: "grok",
    model: "x-ai/grok-4.3",
    provider: "openrouter",
    stderrText: "tokens used\n2.000\n",
  });

  assert.equal(row.month, "2026-05");
  assert.equal(row.tokens_total, 2000);
  assert.equal(row.prompt_stored, false);
  assert.equal(row.cost_estimate_usd, 0.005);
  assert.equal(row.estimated_gpt55_tokens_avoided, 2000);
});

test("buildCostLedgerRow counts Gemini CLI calls even when pricing is unavailable", () => {
  const row = buildCostLedgerRow({
    timestamp: "2026-05-08T08:30:00.000Z",
    runId: "run-gemini",
    issueId: "[WORK_ITEM_ID]",
    mode: "spec-drift",
    modelAlias: "gemini",
    model: "gemini-3.1-pro-preview",
    provider: "google_gemini_cli",
    stdoutText: "Total tokens: 1,500",
  });

  assert.equal(row.tokens_total, 1500);
  assert.equal(row.tokens_source, "total_tokens");
  assert.equal(row.cost_estimate_usd, null);
  assert.equal(row.cost_estimate_basis, "unavailable");
  assert.equal(row.estimated_gpt55_tokens_avoided, 1500);
});

test("failed workers do not count as GPT-5.5 savings", () => {
  const row = buildCostLedgerRow({
    timestamp: "2026-05-08T08:30:00.000Z",
    runId: "run-fail",
    issueId: "[WORK_ITEM_ID]",
    mode: "issue-triage",
    modelAlias: "gemini",
    model: "gemini-3.1-pro-preview",
    provider: "google_gemini_cli",
    exitCode: 1,
    stderrText: "Total tokens: 1,500",
  });

  assert.equal(row.estimated_gpt55_tokens_avoided, 0);
  assert.equal(row.estimated_gpt55_savings_basis, "no_savings_failed_or_timed_out_worker");
});

test("monthly summary includes fixed commitments and variable usage", () => {
  const ledger = tempLedger();
  appendCostLedgerRows({
    ledgerPath: ledger,
    rows: [
      buildCostLedgerRow({
        timestamp: "2026-05-08T08:30:00.000Z",
        modelAlias: "grok",
        model: "x-ai/grok-4.3",
        provider: "openrouter",
        stderrText: "tokens used\n1.000\n",
      }),
      buildCostLedgerRow({
        timestamp: "2026-05-08T08:31:00.000Z",
        modelAlias: "deepseek",
        model: "deepseek/deepseek-v4-pro",
        provider: "openrouter",
        stderrText: "tokens used\n2.000\n",
      }),
    ],
  });

  const summary = summarizeCostLedger({ ledgerPath: ledger, month: "2026-05", gpt55EquivalentEurPerMTokens: 10 });
  assert.equal(summary.fixed_monthly_eur_incl_vat, 476);
  assert.equal(summary.calls, 2);
  assert.equal(summary.variable_by_model.length, 2);
  assert.equal(summary.estimated_gpt55_tokens_avoided, 3000);
  assert.equal(summary.gpt55_equivalent_savings_eur, 0.03);
  assert.match(renderCostSummaryMarkdown(summary), /GPT-5\.5 Avoidance Proxy/);
});

test("monthly summary infers GPT-5.5 avoidance for legacy rows", () => {
  const ledger = tempLedger();
  appendCostLedgerRows({
    ledgerPath: ledger,
    rows: [
      {
        version: "ai-cost-ledger/v0",
        timestamp: "2026-05-08T08:30:00.000Z",
        month: "2026-05",
        model_alias: "grok",
        model: "x-ai/grok-4.3",
        provider: "openrouter",
        tokens_total: 17078,
        cost_estimate_usd: 0.042695,
        exit_code: 0,
        timed_out: false,
      },
    ],
  });

  const summary = summarizeCostLedger({ ledgerPath: ledger, month: "2026-05" });
  assert.equal(summary.estimated_gpt55_tokens_avoided, 17078);
});

test("estimateWorkerReserveUsd creates a conservative reserve for priced workers", () => {
  const reserve = estimateWorkerReserveUsd({
    model: "x-ai/grok-4.3",
    promptText: "small prompt",
    policy: { max_worker_tokens: 100_000 },
  });

  assert.equal(reserve.pricing_available, true);
  assert.equal(reserve.reserve_tokens, 100000);
  assert.equal(reserve.reserve_usd, 0.25);
});

test("evaluateBudgetBrake blocks runs that exceed max-run budget", () => {
  const ledger = tempLedger();
  const result = evaluateBudgetBrake({
    ledgerPath: ledger,
    modelAliases: ["grok"],
    modelProfiles: { grok: { model: "x-ai/grok-4.3" } },
    policy: { max_run_usd: 0.01, daily_budget_usd: 5, monthly_budget_usd: 50 },
    now: new Date("2026-05-08T08:30:00.000Z"),
  });

  assert.equal(result.ok, false);
  assert.ok(result.blockers.some((item) => item.id === "budget.run_limit"));
});

test("evaluateBudgetBrake blocks daily budget exhaustion using existing ledger rows", () => {
  const ledger = tempLedger();
  appendCostLedgerRows({
    ledgerPath: ledger,
    rows: [
      {
        version: "ai-cost-ledger/v0",
        timestamp: "2026-05-08T08:00:00.000Z",
        month: "2026-05",
        model_alias: "grok",
        model: "x-ai/grok-4.3",
        provider: "openrouter",
        cost_estimate_usd: 4.9,
      },
    ],
  });

  const result = evaluateBudgetBrake({
    ledgerPath: ledger,
    modelAliases: ["grok"],
    modelProfiles: { grok: { model: "x-ai/grok-4.3" } },
    policy: { max_run_usd: 1, daily_budget_usd: 5, monthly_budget_usd: 50 },
    now: new Date("2026-05-08T08:30:00.000Z"),
  });

  assert.equal(result.ok, false);
  assert.ok(result.blockers.some((item) => item.id === "budget.daily_limit"));
});

test("evaluateBudgetBrake blocks unknown pricing unless policy allows it", () => {
  const ledger = tempLedger();
  const blocked = evaluateBudgetBrake({
    ledgerPath: ledger,
    modelAliases: ["unknown"],
    modelProfiles: { unknown: { model: "vendor/new-model" } },
    policy: { max_run_usd: 1, daily_budget_usd: 5, monthly_budget_usd: 50, block_unknown_pricing: true },
    now: new Date("2026-05-08T08:30:00.000Z"),
  });
  assert.equal(blocked.ok, false);
  assert.ok(blocked.blockers.some((item) => item.id === "budget.known_pricing"));

  const allowed = evaluateBudgetBrake({
    ledgerPath: ledger,
    modelAliases: ["unknown"],
    modelProfiles: { unknown: { model: "vendor/new-model" } },
    policy: { max_run_usd: 1, daily_budget_usd: 5, monthly_budget_usd: 50, block_unknown_pricing: false },
    now: new Date("2026-05-08T08:30:00.000Z"),
  });
  assert.equal(allowed.ok, true);
});
