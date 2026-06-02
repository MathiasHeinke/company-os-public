import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_INTAKE_FRESHNESS_WINDOW_DAYS,
  INTAKE_REASON_CODES,
  INTAKE_TO_PLANE_VERSION,
  buildIntakeMaterializationInput,
  renderIntakeRollbackMarkdown,
  validateConfirmedIntake,
} from "./intake-to-plane-core.mjs";
import { REASON_CODES as REGISTRY_REASON_CODES } from "./domain-pack-registry-core.mjs";
import { buildGoalMaterialization } from "./goal-core.mjs";

const FIXED_NOW = "2026-05-18T12:00:00Z";

function sampleRegistry() {
  return {
    version: "domain-pack-registry/v0",
    packs: [
      {
        id: "marketing-outreach",
        name: "Marketing / Outreach",
        owner_role: "role:cmo",
        default_human_gate: "HG-2",
        activation_mode: "draft-only",
        blocked_actions: ["email-send", "linkedin-send", "crm-mass-write"],
      },
      {
        id: "customer-support",
        name: "Customer Support",
        owner_role: "role:coo",
        default_human_gate: "HG-2",
        activation_mode: "draft-only",
        blocked_actions: ["customer-send-without-approval"],
      },
    ],
  };
}

function sampleIntake() {
  return {
    confirmed_at: "2026-05-18T10:00:00Z",
    record_path: "company-workspace/intake/first-run.json",
    workspace: "registry:company-os",
    company: {
      name: "Acme Co.",
      website: "https://acme.example",
      confidence: "confirmed",
      last_verified: "2026-05-18T09:00:00Z",
    },
    operating_state: { approval_owner: "Jane Founder" },
    active_domains: [
      { pack_id: "marketing-outreach", confidence: "confirmed", last_verified: "2026-05-18T09:30:00Z" },
      { pack_id: "customer-support", confidence: "confirmed", last_verified: "2026-05-18T09:45:00Z" },
    ],
  };
}

test("validateConfirmedIntake rejects intake without confirmation timestamp or confirmed company", () => {
  const result = validateConfirmedIntake({
    company: { name: "Acme", confidence: "inferred" },
    active_domains: [{ pack_id: "marketing-outreach", confidence: "confirmed" }],
    approval_owner: "Jane",
  }, { now: FIXED_NOW });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((message) => message.includes("confirmed_at")));
  assert.ok(result.errors.some((message) => message.includes("company.confidence")));
});

test("validateConfirmedIntake requires at least one confirmed active domain and an approval owner", () => {
  const result = validateConfirmedIntake({
    confirmed_at: "2026-05-18",
    company: { name: "Acme", confidence: "confirmed", last_verified: "2026-05-18" },
    active_domains: [{ pack_id: "marketing-outreach", confidence: "inferred" }],
  }, { now: FIXED_NOW });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((message) => message.includes("active_domains requires at least one")));
  assert.ok(result.errors.some((message) => message.includes("approval_owner")));
});

test("buildIntakeMaterializationInput refuses when intake is not confirmed", () => {
  const result = buildIntakeMaterializationInput({
    intake: { company: { name: "X" } },
    registry: sampleRegistry(),
    now: FIXED_NOW,
  });
  assert.equal(result.ok, false);
  assert.equal(result.version, INTAKE_TO_PLANE_VERSION);
  assert.equal(result.children.length, 0);
  assert.ok(result.errors.length > 0);
});

test("buildIntakeMaterializationInput requires a registry with a packs array", () => {
  const result = buildIntakeMaterializationInput({ intake: sampleIntake(), registry: null, now: FIXED_NOW });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((message) => message.includes("registry is required")));
});

test("buildIntakeMaterializationInput emits parent goal and dispatch-manual children per confirmed pack", () => {
  const result = buildIntakeMaterializationInput({
    intake: sampleIntake(),
    registry: sampleRegistry(),
    date: "2026-05-18",
    now: FIXED_NOW,
  });

  assert.equal(result.ok, true);
  assert.equal(result.children.length, 2);
  for (const child of result.children) {
    assert.equal(child.dispatch, "manual", "child dispatch must default to manual");
    assert.ok(child.acceptance_criteria.some((row) => row.includes("Stage 0.5")));
    assert.ok(child.gates.includes("stage-0.5-contract-pass"));
    assert.ok(child.gates.includes("cao-pass"));
    assert.ok(child.gates.includes("controller-decision-card"));
    assert.ok(child.blocked_actions.some((row) => row.includes("do not auto-dispatch")));
    assert.ok(child.freshness && child.freshness.ok, "child carries fresh freshness evidence");
    assert.ok(child.acceptance_criteria.some((row) => row.includes("Freshness evidence")));
  }
  assert.equal(result.goal.role, "role:coo");
  assert.ok(result.goal.source.includes("docs/operations/adaptive-company-onboarding-domain-packs.md"));
  assert.ok(result.goal.gate.includes("stage-0.5-contract-pass-per-child"));
  assert.ok(result.goal.gate.includes("intake-freshness-window-passed"));
  assert.ok(result.goal.acceptance.some((row) => row.includes("Stale-fact guard")));
});

test("buildIntakeMaterializationInput rejects unknown pack ids", () => {
  const intake = sampleIntake();
  intake.active_domains.push({ pack_id: "unknown-pack", confidence: "confirmed", last_verified: "2026-05-18T09:00:00Z" });
  const result = buildIntakeMaterializationInput({ intake, registry: sampleRegistry(), now: FIXED_NOW });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((message) => message.includes("unknown-pack")));
});

test("buildIntakeMaterializationInput dedupes pack ids case-insensitively", () => {
  const intake = sampleIntake();
  intake.active_domains.push({ pack_id: "MARKETING-OUTREACH", confidence: "confirmed", last_verified: "2026-05-18T09:30:00Z" });
  const result = buildIntakeMaterializationInput({ intake, registry: sampleRegistry(), now: FIXED_NOW });
  assert.equal(result.ok, true);
  assert.equal(result.children.filter((child) => child.pack_id === "marketing-outreach").length, 1);
  assert.ok(result.warnings.some((message) => message.includes("duplicate pack MARKETING-OUTREACH")));
});

test("buildIntakeMaterializationInput output drives goal-core materialization without auto-dispatch", () => {
  const intake = sampleIntake();
  const input = buildIntakeMaterializationInput({
    intake,
    registry: sampleRegistry(),
    date: "2026-05-18",
    projectId: "project-1",
    now: FIXED_NOW,
  });
  assert.equal(input.ok, true);

  const materialization = buildGoalMaterialization({
    date: input.goal.date,
    title: input.goal.title,
    outcome: input.goal.outcome,
    role: input.goal.role,
    owner: input.goal.owner,
    workspace: input.goal.workspace,
    horizon: input.goal.horizon,
    humanGate: input.goal.humanGate,
    source: input.goal.source,
    metric: input.goal.metric,
    acceptance: input.goal.acceptance,
    gate: input.goal.gate,
    risk: input.goal.risk,
    projectId: "project-1",
    labelMap: { labels: [
      { name: "role:coo", id: "label-coo" },
      { name: "role:cmo", id: "label-cmo" },
    ] },
    children: input.children,
  });

  assert.equal(materialization.children.length, 2);
  for (const child of materialization.children) {
    assert.match(child.contract, /^dispatch: manual$/m);
    assert.doesNotMatch(child.contract, /^dispatch: ready$/m);
  }
});

test("renderIntakeRollbackMarkdown lists child refs and Plane cancellation order", () => {
  const result = buildIntakeMaterializationInput({
    intake: sampleIntake(),
    registry: sampleRegistry(),
    date: "2026-05-18",
    now: FIXED_NOW,
  });
  const markdown = renderIntakeRollbackMarkdown(result);
  assert.match(markdown, /Intake Materializer Rollback/);
  assert.match(markdown, /Local artifact rollback/);
  assert.match(markdown, /Plane draft rollback/);
  assert.match(markdown, /Cancel children before parent/);
  assert.match(markdown, /child-1 \(marketing-outreach\)/);
  assert.match(markdown, /child-2 \(customer-support\)/);
});

test("INTAKE_REASON_CODES exports stable identifiers for the stale-fact guard", () => {
  assert.equal(INTAKE_REASON_CODES.INTAKE_FACT_FRESHNESS_MISSING, "INTAKE_FACT_FRESHNESS_MISSING");
  assert.equal(INTAKE_REASON_CODES.INTAKE_FACT_STALE, "INTAKE_FACT_STALE");
  assert.equal(DEFAULT_INTAKE_FRESHNESS_WINDOW_DAYS, 30);
});

test("validateConfirmedIntake flags INTAKE_FACT_FRESHNESS_MISSING when neither last_verified nor confirmed_at parses", () => {
  const intake = sampleIntake();
  intake.confirmed_at = "not-a-date";
  delete intake.company.last_verified;
  delete intake.active_domains[0].last_verified;
  delete intake.active_domains[1].last_verified;
  const result = validateConfirmedIntake(intake, { now: FIXED_NOW });
  assert.equal(result.ok, false);
  const codes = result.reasons.map((reason) => reason.code);
  assert.ok(codes.includes(INTAKE_REASON_CODES.INTAKE_FACT_FRESHNESS_MISSING));
  assert.ok(result.errors.some((message) => message.includes(INTAKE_REASON_CODES.INTAKE_FACT_FRESHNESS_MISSING)));
});

test("buildIntakeMaterializationInput rejects stale confirmed active domain with INTAKE_FACT_STALE", () => {
  const intake = sampleIntake();
  intake.active_domains[0].last_verified = "2025-12-01T00:00:00Z";
  const result = buildIntakeMaterializationInput({
    intake,
    registry: sampleRegistry(),
    now: FIXED_NOW,
    freshnessWindowDays: 30,
  });
  assert.equal(result.ok, false);
  assert.equal(result.children.length, 0);
  const codes = result.reasons.map((reason) => reason.code);
  assert.ok(codes.includes(INTAKE_REASON_CODES.INTAKE_FACT_STALE));
  assert.ok(result.errors.some((message) => message.includes("INTAKE_FACT_STALE")));
  assert.ok(result.errors.some((message) => message.includes("intake.active_domains.marketing-outreach")));
});

test("buildIntakeMaterializationInput accepts a fresh confirmed domain backed by intake confirmed_at fallback", () => {
  const intake = sampleIntake();
  delete intake.active_domains[0].last_verified;
  delete intake.active_domains[1].last_verified;
  delete intake.company.last_verified;
  const result = buildIntakeMaterializationInput({
    intake,
    registry: sampleRegistry(),
    now: FIXED_NOW,
    freshnessWindowDays: 30,
  });
  assert.equal(result.ok, true);
  for (const child of result.children) {
    assert.equal(child.freshness.ok, true);
    assert.equal(child.freshness.effective_source, "confirmed_at");
    assert.ok(child.acceptance_criteria.some((row) => row.includes("intake confirmed_at fallback")));
  }
});

test("buildIntakeMaterializationInput does not block on stale non-selected (background) active_domain rows", () => {
  const intake = sampleIntake();
  intake.active_domains.push({
    pack_id: "customer-support-archive",
    confidence: "inferred",
    last_verified: "2024-01-01T00:00:00Z",
  });
  intake.active_domains.push({
    pack_id: "hiring",
    confidence: "hypothesis",
    last_verified: "2023-05-01T00:00:00Z",
  });
  const result = buildIntakeMaterializationInput({
    intake,
    registry: sampleRegistry(),
    now: FIXED_NOW,
    freshnessWindowDays: 30,
  });
  assert.equal(result.ok, true);
  assert.equal(result.children.length, 2);
  const packIds = result.children.map((child) => child.pack_id).sort();
  assert.deepEqual(packIds, ["customer-support", "marketing-outreach"]);
  const codes = result.reasons.map((reason) => reason.code);
  assert.ok(!codes.includes(INTAKE_REASON_CODES.INTAKE_FACT_STALE), "stale background facts must not surface as blocking reasons");
});

test("buildIntakeMaterializationInput respects an explicit freshnessWindowDays override", () => {
  const intake = sampleIntake();
  intake.active_domains[0].last_verified = "2026-05-10T00:00:00Z";
  const tooStrict = buildIntakeMaterializationInput({
    intake,
    registry: sampleRegistry(),
    now: FIXED_NOW,
    freshnessWindowDays: 3,
  });
  assert.equal(tooStrict.ok, false);
  assert.ok(tooStrict.reasons.some((reason) => reason.code === INTAKE_REASON_CODES.INTAKE_FACT_STALE));
  const generous = buildIntakeMaterializationInput({
    intake,
    registry: sampleRegistry(),
    now: FIXED_NOW,
    freshnessWindowDays: 30,
  });
  assert.equal(generous.ok, true);
});

// ---------------------------------------------------------------------------
// Finance domain: gate and blocked-action preservation
// ---------------------------------------------------------------------------

function financeRegistry() {
  return {
    version: "domain-pack-registry/v0",
    packs: [
      {
        id: "finance-ops",
        name: "Finance Ops",
        owner_role: "role:cfo",
        default_human_gate: "HG-3",
        activation_mode: "draft-only",
        blocked_actions: [
          "bank-action-of-any-kind",
          "payment-initiation",
          "financial-data-export-without-gate",
          "accounting-system-write-without-approval",
          "tax-filing-without-human-sign-off",
        ],
      },
    ],
  };
}

function financeIntake() {
  return {
    confirmed_at: "2026-05-18T10:00:00Z",
    record_path: "company-workspace/intake/first-run.json",
    workspace: "registry:company-os",
    company: {
      name: "Acme Co.",
      confidence: "confirmed",
      last_verified: "2026-05-18T09:00:00Z",
    },
    approval_owner: "Jane CFO",
    active_domains: [
      { pack_id: "finance-ops", confidence: "confirmed", last_verified: "2026-05-18T09:30:00Z" },
    ],
  };
}

test("finance pack materialization: child human_gate is exactly HG-3 from registry", () => {
  const result = buildIntakeMaterializationInput({
    intake: financeIntake(),
    registry: financeRegistry(),
    date: "2026-05-18",
    now: FIXED_NOW,
  });
  assert.equal(result.ok, true, `unexpected errors: ${JSON.stringify(result.errors)}`);
  assert.equal(result.children.length, 1);
  const child = result.children[0];
  assert.equal(child.human_gate, "HG-3", "finance child must preserve HG-3 gate exactly from registry");
  assert.equal(child.pack_id, "finance-ops");
});

test("finance pack materialization: child blocked_actions carry bank, payment, accounting, and tax actions from registry", () => {
  const result = buildIntakeMaterializationInput({
    intake: financeIntake(),
    registry: financeRegistry(),
    date: "2026-05-18",
    now: FIXED_NOW,
  });
  assert.equal(result.ok, true, `unexpected errors: ${JSON.stringify(result.errors)}`);
  const child = result.children[0];
  const actions = child.blocked_actions;
  assert.ok(actions.some((a) => a.includes("bank")), "child blocked_actions must include bank action");
  assert.ok(actions.some((a) => a.includes("payment")), "child blocked_actions must include payment action");
  assert.ok(actions.some((a) => a.includes("accounting")), "child blocked_actions must include accounting-system action");
  assert.ok(actions.some((a) => a.includes("tax")), "child blocked_actions must include tax action");
});

test("finance pack materialization: fails without approval_owner", () => {
  const intake = financeIntake();
  delete intake.approval_owner;
  const result = buildIntakeMaterializationInput({
    intake,
    registry: financeRegistry(),
    now: FIXED_NOW,
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((message) => message.includes("approval_owner")),
    "finance pack materialization must fail without named approval_owner");
});

test("finance pack materialization: child dispatch is manual and gates include cao-pass and controller-decision-card", () => {
  const result = buildIntakeMaterializationInput({
    intake: financeIntake(),
    registry: financeRegistry(),
    date: "2026-05-18",
    now: FIXED_NOW,
  });
  assert.equal(result.ok, true);
  const child = result.children[0];
  assert.equal(child.dispatch, "manual");
  assert.ok(child.gates.includes("cao-pass"), "finance child must require cao-pass gate");
  assert.ok(child.gates.includes("controller-decision-card"), "finance child must require controller-decision-card gate");
  assert.ok(child.gates.includes("stage-0.5-contract-pass"), "finance child must require stage-0.5-contract-pass gate");
});

test("finance pack materialization: child acceptance_criteria re-asserts approval owner and blocked actions", () => {
  const result = buildIntakeMaterializationInput({
    intake: financeIntake(),
    registry: financeRegistry(),
    date: "2026-05-18",
    now: FIXED_NOW,
  });
  assert.equal(result.ok, true);
  const child = result.children[0];
  assert.ok(child.acceptance_criteria.some((row) => row.includes("Jane CFO")),
    "child acceptance_criteria must name the approval owner");
  assert.ok(child.acceptance_criteria.some((row) => row.includes("bank")),
    "child acceptance_criteria must reference blocked bank/payment/accounting actions");
});

// ---------------------------------------------------------------------------
// External-action packs (CRM mass-write, customer-send): approval_owner required
// ---------------------------------------------------------------------------

function crmRegistry() {
  return {
    version: "domain-pack-registry/v0",
    packs: [
      {
        id: "sales-crm",
        name: "Sales / CRM",
        owner_role: "role:coo",
        default_human_gate: "HG-2.5",
        activation_mode: "draft-only",
        blocked_actions: ["crm-mass-write-without-hg25", "bulk-outreach-without-approval", "personal-data-export-without-gate"],
      },
    ],
  };
}

function crmIntake() {
  return {
    confirmed_at: "2026-05-18T10:00:00Z",
    workspace: "registry:company-os",
    company: {
      name: "Acme Co.",
      confidence: "confirmed",
      last_verified: "2026-05-18T09:00:00Z",
    },
    approval_owner: "Jane COO",
    active_domains: [
      { pack_id: "sales-crm", confidence: "confirmed", last_verified: "2026-05-18T09:30:00Z" },
    ],
  };
}

test("CRM pack materialization: child dispatch is manual and blocked_actions carry crm-mass-write from registry", () => {
  const result = buildIntakeMaterializationInput({
    intake: crmIntake(),
    registry: crmRegistry(),
    date: "2026-05-18",
    now: FIXED_NOW,
  });
  assert.equal(result.ok, true, `unexpected errors: ${JSON.stringify(result.errors)}`);
  const child = result.children[0];
  assert.equal(child.dispatch, "manual");
  assert.equal(child.human_gate, "HG-2.5");
  assert.ok(child.blocked_actions.some((a) => a.includes("crm-mass-write")),
    "CRM child must carry crm-mass-write blocked action from registry");
  assert.ok(child.blocked_actions.some((a) => a.includes("bulk-outreach")),
    "CRM child must carry bulk-outreach blocked action from registry");
});

test("CRM pack materialization: fails without approval_owner", () => {
  const intake = crmIntake();
  delete intake.approval_owner;
  const result = buildIntakeMaterializationInput({
    intake,
    registry: crmRegistry(),
    now: FIXED_NOW,
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((message) => message.includes("approval_owner")),
    "CRM pack materialization must fail without named approval_owner");
});

test("materialization fails closed when Finance Ops registry gate is downgraded", () => {
  const registry = financeRegistry();
  registry.packs[0].default_human_gate = "HG-2";
  const result = buildIntakeMaterializationInput({
    intake: financeIntake(),
    registry,
    now: FIXED_NOW,
  });
  assert.equal(result.ok, false);
  assert.equal(result.children.length, 0);
  assert.ok(result.reasons.some((reason) => reason.code === REGISTRY_REASON_CODES.FINANCE_GATE_TOO_WEAK));
  assert.ok(result.errors.some((message) => message.includes(REGISTRY_REASON_CODES.FINANCE_GATE_TOO_WEAK)));
});

test("materialization fails closed when Sales/CRM registry activation mode is not draft-only", () => {
  const registry = crmRegistry();
  registry.packs[0].activation_mode = "auto";
  const result = buildIntakeMaterializationInput({
    intake: crmIntake(),
    registry,
    now: FIXED_NOW,
  });
  assert.equal(result.ok, false);
  assert.equal(result.children.length, 0);
  assert.ok(result.reasons.some((reason) => reason.code === REGISTRY_REASON_CODES.UNSAFE_ACTIVATION_MODE));
  assert.ok(result.errors.some((message) => message.includes(REGISTRY_REASON_CODES.UNSAFE_ACTIVATION_MODE)));
});
