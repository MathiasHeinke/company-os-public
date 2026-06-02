import fs from "node:fs";
import path from "node:path";

export const COST_LEDGER_VERSION = "ai-cost-ledger/v0";
export const DEFAULT_COST_LEDGER = "metrics/ai-cost-ledger.jsonl";
export const DEFAULT_GPT55_SAVINGS_MULTIPLIER = 1;
export const DEFAULT_BUDGET_POLICY = {
  max_run_usd: 1,
  daily_budget_usd: 5,
  monthly_budget_usd: 50,
  max_worker_tokens: 250_000,
  unknown_model_reserve_usd: 0.25,
  block_unknown_pricing: true,
};

export const FIXED_MONTHLY_COMMITMENTS = [
  {
    id: "codex_gpt55_max_20x",
    provider: "openai_codex",
    label: "Codex GPT-5.5 Max / 20x",
    monthly_eur_incl_vat: 238,
    source: "user_provided",
  },
  {
    id: "claude_max_20x",
    provider: "anthropic_claude_cli",
    label: "Claude Max / 20x",
    monthly_eur_incl_vat: 238,
    source: "user_provided",
  },
];

export const VARIABLE_MODEL_PRICING_USD_PER_M_TOKEN = {
  "x-ai/grok-4.3": {
    provider: "openrouter",
    input: 1.25,
    output: 2.5,
    estimate_mode: "total_tokens_at_output_rate",
  },
  "deepseek/deepseek-v4-pro": {
    provider: "openrouter",
    input: 0.435,
    output: 0.87,
    estimate_mode: "total_tokens_at_output_rate",
  },
};

function numericPolicyValue(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function booleanPolicyValue(value, fallback) {
  if (value === true || value === false) return value;
  if (typeof value === "string") {
    if (/^(true|1|yes)$/i.test(value)) return true;
    if (/^(false|0|no)$/i.test(value)) return false;
  }
  return fallback;
}

export function normalizeBudgetPolicy({ policy = {}, env = process.env } = {}) {
  return {
    max_run_usd: numericPolicyValue(env.MODEL_ROUTER_MAX_RUN_USD ?? policy.max_run_usd, DEFAULT_BUDGET_POLICY.max_run_usd),
    daily_budget_usd: numericPolicyValue(
      env.MODEL_ROUTER_DAILY_BUDGET_USD ?? policy.daily_budget_usd,
      DEFAULT_BUDGET_POLICY.daily_budget_usd,
    ),
    monthly_budget_usd: numericPolicyValue(
      env.MODEL_ROUTER_MONTHLY_BUDGET_USD ?? policy.monthly_budget_usd,
      DEFAULT_BUDGET_POLICY.monthly_budget_usd,
    ),
    max_worker_tokens: numericPolicyValue(
      env.MODEL_ROUTER_MAX_WORKER_TOKENS ?? policy.max_worker_tokens,
      DEFAULT_BUDGET_POLICY.max_worker_tokens,
    ),
    unknown_model_reserve_usd: numericPolicyValue(
      env.MODEL_ROUTER_UNKNOWN_MODEL_RESERVE_USD ?? policy.unknown_model_reserve_usd,
      DEFAULT_BUDGET_POLICY.unknown_model_reserve_usd,
    ),
    block_unknown_pricing: booleanPolicyValue(
      env.MODEL_ROUTER_BLOCK_UNKNOWN_PRICING ?? policy.block_unknown_pricing,
      DEFAULT_BUDGET_POLICY.block_unknown_pricing,
    ),
  };
}

function parseTokenNumber(raw) {
  const text = String(raw || "").trim();
  if (!text) return null;
  const digits = text.replace(/[^\d]/g, "");
  if (!digits) return null;
  return Number.parseInt(digits, 10);
}

export function extractCodexTokens(text) {
  const source = String(text || "");
  const matches = [...source.matchAll(/tokens used\s*[\r\n]+([0-9][0-9.,]*)/gi)];
  if (matches.length === 0) return { total: null, raw: "" };
  const raw = matches.at(-1)[1];
  return { total: parseTokenNumber(raw), raw, source: "codex_tokens_used" };
}

export function extractRuntimeTokens(text) {
  const source = String(text || "");
  const codex = extractCodexTokens(source);
  if (codex.total !== null) return codex;

  const patterns = [
    { source: "total_tokens", pattern: /\btotal tokens?\s*[:=]\s*([0-9][0-9.,]*)/gi },
    { source: "tokens_used_inline", pattern: /\btokens used\s*[:=]\s*([0-9][0-9.,]*)/gi },
    { source: "total_token_count", pattern: /\btotal[_ -]?token[_ -]?count\b\s*[:=]\s*([0-9][0-9.,]*)/gi },
  ];

  for (const item of patterns) {
    const matches = [...source.matchAll(item.pattern)];
    if (matches.length === 0) continue;
    const raw = matches.at(-1)[1];
    return { total: parseTokenNumber(raw), raw, source: item.source };
  }

  return { total: null, raw: "", source: "" };
}

export function estimateVariableCostUsd({ model, totalTokens }) {
  const pricing = VARIABLE_MODEL_PRICING_USD_PER_M_TOKEN[model];
  if (!pricing || !Number.isFinite(totalTokens)) {
    return {
      estimate_available: false,
      estimate_usd: null,
      estimate_basis: "unavailable",
      pricing: pricing || null,
    };
  }
  const estimateUsd = (totalTokens / 1_000_000) * pricing.output;
  return {
    estimate_available: true,
    estimate_usd: Number(estimateUsd.toFixed(6)),
    estimate_basis: pricing.estimate_mode,
    pricing,
  };
}

export function estimatePromptTokens(text) {
  const source = String(text || "");
  if (!source.trim()) return 0;
  return Math.ceil(source.length / 4);
}

export function estimateWorkerReserveUsd({
  model,
  promptText = "",
  policy = DEFAULT_BUDGET_POLICY,
} = {}) {
  const normalizedPolicy = normalizeBudgetPolicy({ policy, env: {} });
  const pricing = VARIABLE_MODEL_PRICING_USD_PER_M_TOKEN[model];
  if (!pricing) {
    return {
      model,
      pricing_available: false,
      reserve_usd: normalizedPolicy.unknown_model_reserve_usd,
      reserve_tokens: null,
      basis: "unknown_model_reserve_usd",
    };
  }
  const promptTokens = estimatePromptTokens(promptText);
  const reserveTokens = Math.max(promptTokens, normalizedPolicy.max_worker_tokens);
  const reserveUsd = (reserveTokens / 1_000_000) * pricing.output;
  return {
    model,
    pricing_available: true,
    reserve_usd: Number(reserveUsd.toFixed(6)),
    reserve_tokens: reserveTokens,
    basis: `max(prompt_tokens, max_worker_tokens)_at_${pricing.estimate_mode}`,
  };
}

function sumCost(rows) {
  return rows.reduce((sum, row) => sum + (Number.isFinite(row.cost_estimate_usd) ? row.cost_estimate_usd : 0), 0);
}

export function evaluateBudgetBrake({
  ledgerPath,
  modelAliases = [],
  modelProfiles = {},
  promptText = "",
  policy = {},
  now = new Date(),
} = {}) {
  const normalizedPolicy = normalizeBudgetPolicy({ policy });
  const month = now.toISOString().slice(0, 7);
  const day = now.toISOString().slice(0, 10);
  const rows = ledgerPath ? readJsonl(ledgerPath) : [];
  const monthRows = rows.filter((row) => row.month === month || String(row.timestamp || "").startsWith(month));
  const dayRows = rows.filter((row) => String(row.timestamp || "").startsWith(day));
  const reserves = modelAliases.map((alias) => estimateWorkerReserveUsd({
    model: modelProfiles[alias]?.model || alias,
    promptText,
    policy: normalizedPolicy,
  }));
  const reserveUsd = Number(reserves.reduce((sum, item) => sum + item.reserve_usd, 0).toFixed(6));
  const unknownPricing = reserves.filter((item) => !item.pricing_available);
  const dailySpentUsd = Number(sumCost(dayRows).toFixed(6));
  const monthlySpentUsd = Number(sumCost(monthRows).toFixed(6));
  const checks = [
    {
      id: "budget.run_limit",
      status: reserveUsd <= normalizedPolicy.max_run_usd ? "pass" : "block",
      message: reserveUsd <= normalizedPolicy.max_run_usd ? "Run reserve is within max-run budget" : "Run reserve exceeds max-run budget",
      details: { reserve_usd: reserveUsd, max_run_usd: normalizedPolicy.max_run_usd },
    },
    {
      id: "budget.daily_limit",
      status: dailySpentUsd + reserveUsd <= normalizedPolicy.daily_budget_usd ? "pass" : "block",
      message: dailySpentUsd + reserveUsd <= normalizedPolicy.daily_budget_usd ? "Daily budget has room for this run" : "Daily budget would be exceeded",
      details: { daily_spent_usd: dailySpentUsd, reserve_usd: reserveUsd, daily_budget_usd: normalizedPolicy.daily_budget_usd },
    },
    {
      id: "budget.monthly_limit",
      status: monthlySpentUsd + reserveUsd <= normalizedPolicy.monthly_budget_usd ? "pass" : "block",
      message: monthlySpentUsd + reserveUsd <= normalizedPolicy.monthly_budget_usd ? "Monthly budget has room for this run" : "Monthly budget would be exceeded",
      details: { monthly_spent_usd: monthlySpentUsd, reserve_usd: reserveUsd, monthly_budget_usd: normalizedPolicy.monthly_budget_usd },
    },
    {
      id: "budget.known_pricing",
      status: unknownPricing.length && normalizedPolicy.block_unknown_pricing ? "block" : "pass",
      message: unknownPricing.length && normalizedPolicy.block_unknown_pricing
        ? "One or more models have unknown pricing"
        : "All unknown-pricing models are either absent or explicitly allowed by policy",
      details: { unknown_models: unknownPricing.map((item) => item.model), block_unknown_pricing: normalizedPolicy.block_unknown_pricing },
    },
  ];
  const blockers = checks.filter((check) => check.status === "block");
  return {
    version: `${COST_LEDGER_VERSION}/budget-brake`,
    generated_at: now.toISOString(),
    ok: blockers.length === 0,
    status: blockers.length ? "blocked" : "pass",
    ledger_path: ledgerPath || "",
    policy: normalizedPolicy,
    reserve_usd: reserveUsd,
    daily_spent_usd: dailySpentUsd,
    monthly_spent_usd: monthlySpentUsd,
    reserves,
    blocker_count: blockers.length,
    blockers,
    checks,
  };
}

export function estimateGpt55TokensAvoided({ tokensTotal, exitCode, timedOut, multiplier = DEFAULT_GPT55_SAVINGS_MULTIPLIER }) {
  if ((Number.isFinite(exitCode) && exitCode !== 0) || timedOut) {
    return { tokens: 0, basis: "no_savings_failed_or_timed_out_worker" };
  }
  if (!Number.isFinite(tokensTotal)) return { tokens: null, basis: "unavailable_no_worker_token_footer" };
  const normalizedMultiplier = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : DEFAULT_GPT55_SAVINGS_MULTIPLIER;
  return {
    tokens: Math.round(tokensTotal * normalizedMultiplier),
    basis: `worker_tokens_x_${normalizedMultiplier}_as_gpt55_avoidance_proxy`,
  };
}

export function estimateGpt55EquivalentSavingsEur({ tokensAvoided, eurPerMTokens }) {
  if (!Number.isFinite(tokensAvoided) || !Number.isFinite(eurPerMTokens) || eurPerMTokens <= 0) return null;
  return Number(((tokensAvoided / 1_000_000) * eurPerMTokens).toFixed(6));
}

export function buildCostLedgerRow({
  timestamp = new Date().toISOString(),
  runId = "",
  issueId = "",
  mode = "",
  modelAlias = "",
  model = "",
  provider = "",
  workspace = "",
  report = "",
  stderr = "",
  exitCode = null,
  timedOut = false,
  stdoutText = "",
  stderrText = "",
  savingsMultiplier = DEFAULT_GPT55_SAVINGS_MULTIPLIER,
}) {
  const stdoutTokens = extractRuntimeTokens(stdoutText);
  const stderrTokens = extractRuntimeTokens(stderrText);
  const tokenUsage = stderrTokens.total !== null ? stderrTokens : stdoutTokens;
  const cost = estimateVariableCostUsd({ model, totalTokens: tokenUsage.total });
  const avoided = estimateGpt55TokensAvoided({
    tokensTotal: tokenUsage.total,
    exitCode,
    timedOut,
    multiplier: savingsMultiplier,
  });
  return {
    version: COST_LEDGER_VERSION,
    timestamp,
    month: timestamp.slice(0, 7),
    run_id: runId,
    issue_id: issueId,
    mode,
    model_alias: modelAlias,
    model,
    provider,
    workspace,
    report_path: report,
    stderr_path: stderr,
    exit_code: exitCode,
    timed_out: timedOut,
    tokens_total: tokenUsage.total,
    tokens_raw: tokenUsage.raw,
    tokens_source: tokenUsage.source,
    cost_estimate_usd: cost.estimate_usd,
    cost_estimate_basis: cost.estimate_basis,
    pricing_provider: cost.pricing?.provider || "",
    estimated_gpt55_tokens_avoided: avoided.tokens,
    estimated_gpt55_savings_basis: avoided.basis,
    prompt_stored: false,
  };
}

export function appendCostLedgerRows({ ledgerPath, rows }) {
  if (!rows.length) return false;
  fs.mkdirSync(path.dirname(ledgerPath), { recursive: true });
  const payload = rows.map((row) => JSON.stringify(row)).join("\n");
  fs.appendFileSync(ledgerPath, `${payload}\n`);
  return true;
}

export function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

export function summarizeCostLedger({
  ledgerPath,
  month,
  fixedCommitments = FIXED_MONTHLY_COMMITMENTS,
  gpt55EquivalentEurPerMTokens = null,
}) {
  const rows = readJsonl(ledgerPath).filter((row) => !month || row.month === month);
  const byModel = new Map();
  for (const row of rows) {
    const key = row.model_alias || row.model || "unknown";
    const current = byModel.get(key) || {
      model_alias: row.model_alias || "",
      model: row.model || "",
      provider: row.provider || "",
      calls: 0,
      tokens_total: 0,
      token_unknown_calls: 0,
      cost_estimate_usd: 0,
      estimated_gpt55_tokens_avoided: 0,
      savings_unknown_calls: 0,
    };
    current.calls += 1;
    if (Number.isFinite(row.tokens_total)) current.tokens_total += row.tokens_total;
    else current.token_unknown_calls += 1;
    if (Number.isFinite(row.cost_estimate_usd)) current.cost_estimate_usd += row.cost_estimate_usd;
    if (Number.isFinite(row.estimated_gpt55_tokens_avoided)) {
      current.estimated_gpt55_tokens_avoided += row.estimated_gpt55_tokens_avoided;
    } else {
      const inferredAvoided = estimateGpt55TokensAvoided({
        tokensTotal: row.tokens_total,
        exitCode: row.exit_code,
        timedOut: row.timed_out,
      });
      if (Number.isFinite(inferredAvoided.tokens)) current.estimated_gpt55_tokens_avoided += inferredAvoided.tokens;
      else current.savings_unknown_calls += 1;
    }
    byModel.set(key, current);
  }
  const variableByModel = [...byModel.values()].map((item) => ({
    ...item,
    cost_estimate_usd: Number(item.cost_estimate_usd.toFixed(6)),
  }));
  const fixedMonthlyEur = fixedCommitments.reduce((sum, item) => sum + item.monthly_eur_incl_vat, 0);
  const variableUsd = variableByModel.reduce((sum, item) => sum + item.cost_estimate_usd, 0);
  const estimatedGpt55TokensAvoided = variableByModel.reduce(
    (sum, item) => sum + item.estimated_gpt55_tokens_avoided,
    0,
  );
  const equivalentSavingsEur = estimateGpt55EquivalentSavingsEur({
    tokensAvoided: estimatedGpt55TokensAvoided,
    eurPerMTokens: gpt55EquivalentEurPerMTokens,
  });
  return {
    version: COST_LEDGER_VERSION,
    month: month || "all",
    ledger_path: ledgerPath,
    calls: rows.length,
    fixed_monthly_commitments: fixedCommitments,
    fixed_monthly_eur_incl_vat: fixedMonthlyEur,
    variable_by_model: variableByModel,
    variable_cost_estimate_usd: Number(variableUsd.toFixed(6)),
    estimated_gpt55_tokens_avoided: estimatedGpt55TokensAvoided,
    gpt55_equivalent_eur_per_m_tokens: Number.isFinite(gpt55EquivalentEurPerMTokens)
      ? gpt55EquivalentEurPerMTokens
      : null,
    gpt55_equivalent_savings_eur: equivalentSavingsEur,
    savings_estimate_basis:
      "Operational proxy: successful worker tokens are counted as GPT-5.5 controller tokens avoided. This measures budget pressure avoided, not invoice-grade savings.",
    limitations: [
      "OpenRouter estimates use total tokens at output-token rate when Codex does not expose input/output split.",
      "Codex Desktop GPT-5.5 app usage is not fully captured unless run through an instrumented helper.",
      "Claude CLI text output may not expose token usage; fixed monthly commitment is tracked separately.",
      "Gemini CLI usage is tracked when the CLI exposes a token footer; otherwise the call is counted with unknown tokens.",
      "GPT-5.5 savings are a planning proxy; pass an explicit EUR-per-1M-token assumption to price avoided controller tokens.",
      "This is operational telemetry, not invoice-grade accounting.",
    ],
  };
}

export function renderCostSummaryMarkdown(summary) {
  const lines = [
    `# AI Cost Summary - ${summary.month}`,
    "",
    `Ledger: \`${summary.ledger_path}\``,
    "",
    "## Fixed Monthly Commitments",
    "",
    "| Runtime | Provider | EUR incl. VAT | Source |",
    "|---|---:|---:|---|",
    ...summary.fixed_monthly_commitments.map(
      (item) => `| ${item.label} | ${item.provider} | ${item.monthly_eur_incl_vat.toFixed(2)} | ${item.source} |`,
    ),
    `| **Total** |  | **${summary.fixed_monthly_eur_incl_vat.toFixed(2)}** |  |`,
    "",
    "## Variable Worker Usage",
    "",
    "| Model | Calls | Tokens tracked | Unknown-token calls | GPT-5.5 tokens avoided est. | Est. USD |",
    "|---|---:|---:|---:|---:|---:|",
  ];
  if (summary.variable_by_model.length === 0) {
    lines.push("| _none_ | 0 | 0 | 0 | 0 | 0.000000 |");
  } else {
    for (const item of summary.variable_by_model) {
      lines.push(
        `| ${item.model_alias || item.model} | ${item.calls} | ${item.tokens_total} | ${item.token_unknown_calls} | ${item.estimated_gpt55_tokens_avoided} | ${item.cost_estimate_usd.toFixed(6)} |`,
      );
    }
  }
  lines.push("", `Variable estimate total: \`${summary.variable_cost_estimate_usd.toFixed(6)} USD\``);
  lines.push("", "## GPT-5.5 Avoidance Proxy", "");
  lines.push(`Estimated GPT-5.5 tokens avoided: \`${summary.estimated_gpt55_tokens_avoided}\``);
  if (summary.gpt55_equivalent_savings_eur !== null) {
    lines.push(
      `Equivalent planning value: \`${summary.gpt55_equivalent_savings_eur.toFixed(6)} EUR\` at \`${summary.gpt55_equivalent_eur_per_m_tokens} EUR / 1M tokens\``,
    );
  } else {
    lines.push("Equivalent planning value: `not priced`");
  }
  lines.push(`Basis: ${summary.savings_estimate_basis}`);
  lines.push("", "## Limitations", "");
  for (const limitation of summary.limitations) lines.push(`- ${limitation}`);
  lines.push("");
  return lines.join("\n");
}
