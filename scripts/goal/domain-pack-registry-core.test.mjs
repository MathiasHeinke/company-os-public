import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  REASON_CODES,
  REGISTRY_VALIDATOR_VERSION,
  validateRegistry,
} from "./domain-pack-registry-core.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = path.resolve(__dirname, "../../registries/domain-packs/company-os.json");

function minimalPack(overrides = {}) {
  return {
    id: "test-pack",
    name: "Test Pack",
    owner_role: "role:cmo",
    default_human_gate: "HG-2",
    activation_mode: "draft-only",
    blocked_actions: ["some-blocked-action"],
    ...overrides,
  };
}

function minimalRegistry(packs) {
  return { version: "domain-pack-registry/v0", packs };
}

// ---------------------------------------------------------------------------
// REASON_CODES and version sanity
// ---------------------------------------------------------------------------

test("REGISTRY_VALIDATOR_VERSION is a non-empty string matching the module name", () => {
  assert.equal(typeof REGISTRY_VALIDATOR_VERSION, "string");
  assert.match(REGISTRY_VALIDATOR_VERSION, /domain-pack-registry-core/);
});

test("REASON_CODES exports all expected stable reason codes", () => {
  const expected = [
    "DUPLICATE_PACK_ID",
    "MISSING_OWNER_ROLE",
    "INVALID_OWNER_ROLE",
    "INVALID_HUMAN_GATE",
    "MISSING_BLOCKED_ACTIONS",
    "FINANCE_GATE_TOO_WEAK",
    "FINANCE_BLOCKED_ACTION_MISSING",
    "UNSAFE_ACTIVATION_MODE",
    "INVALID_REGISTRY",
  ];
  for (const code of expected) {
    assert.ok(code in REASON_CODES, `expected REASON_CODES to include ${code}`);
  }
});

// ---------------------------------------------------------------------------
// Valid registry — the real company-os.json must pass
// ---------------------------------------------------------------------------

test("valid registry: actual company-os.json passes with no errors", () => {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
  const result = validateRegistry(registry);
  assert.equal(result.ok, true, `expected PASS but got errors:\n${JSON.stringify(result.errors, null, 2)}`);
  assert.equal(result.errors.length, 0);
});

test("actual registry exposes department capability pack creator as draft-only meta pack", () => {
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));
  const pack = registry.packs.find((candidate) => candidate.id === "department-capability-pack-creator");
  assert.ok(pack, "department-capability-pack-creator pack missing");
  assert.equal(pack.owner_role, "role:cto");
  assert.equal(pack.activation_mode, "draft-only");
  assert.equal(pack.default_human_gate, "HG-2.5");
  assert.ok(pack.blocked_actions.includes("production-write"));
  assert.ok(pack.blocked_actions.includes("secret-read"));
  assert.ok(pack.outputs.includes("aionui-hermes-<pack-id>-skill.md"));
});

// ---------------------------------------------------------------------------
// Structural guard
// ---------------------------------------------------------------------------

test("invalid registry: null input returns INVALID_REGISTRY", () => {
  const result = validateRegistry(null);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === REASON_CODES.INVALID_REGISTRY));
});

test("invalid registry: missing packs array returns INVALID_REGISTRY", () => {
  const result = validateRegistry({ version: "v0" });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === REASON_CODES.INVALID_REGISTRY));
});

// ---------------------------------------------------------------------------
// Duplicate pack id
// ---------------------------------------------------------------------------

test("duplicate pack id: exact match fails with DUPLICATE_PACK_ID", () => {
  const result = validateRegistry(minimalRegistry([
    minimalPack({ id: "marketing-outreach" }),
    minimalPack({ id: "marketing-outreach" }),
  ]));
  assert.equal(result.ok, false);
  const err = result.errors.find((e) => e.code === REASON_CODES.DUPLICATE_PACK_ID);
  assert.ok(err, "expected DUPLICATE_PACK_ID error");
  assert.equal(err.pack_id, "marketing-outreach");
});

test("duplicate pack id: case-insensitive match fails with DUPLICATE_PACK_ID", () => {
  const result = validateRegistry(minimalRegistry([
    minimalPack({ id: "marketing-outreach" }),
    minimalPack({ id: "MARKETING-OUTREACH" }),
  ]));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === REASON_CODES.DUPLICATE_PACK_ID));
});

// ---------------------------------------------------------------------------
// Missing / invalid owner_role
// ---------------------------------------------------------------------------

test("missing owner_role: fails with MISSING_OWNER_ROLE", () => {
  const result = validateRegistry(minimalRegistry([
    minimalPack({ owner_role: undefined }),
  ]));
  assert.equal(result.ok, false);
  const err = result.errors.find((e) => e.code === REASON_CODES.MISSING_OWNER_ROLE);
  assert.ok(err, "expected MISSING_OWNER_ROLE error");
  assert.equal(err.pack_id, "test-pack");
});

test("empty owner_role: fails with MISSING_OWNER_ROLE", () => {
  const result = validateRegistry(minimalRegistry([
    minimalPack({ owner_role: "   " }),
  ]));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === REASON_CODES.MISSING_OWNER_ROLE));
});

test("invalid role label: fails with INVALID_OWNER_ROLE", () => {
  const result = validateRegistry(minimalRegistry([
    minimalPack({ owner_role: "role:invalid" }),
  ]));
  assert.equal(result.ok, false);
  const err = result.errors.find((e) => e.code === REASON_CODES.INVALID_OWNER_ROLE);
  assert.ok(err, "expected INVALID_OWNER_ROLE error");
  assert.equal(err.pack_id, "test-pack");
  assert.match(err.message, /role:invalid/);
});

test("non-role string owner_role: fails with INVALID_OWNER_ROLE", () => {
  const result = validateRegistry(minimalRegistry([
    minimalPack({ owner_role: "marketing" }),
  ]));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === REASON_CODES.INVALID_OWNER_ROLE));
});

test("all valid role labels pass owner_role check", () => {
  for (const role of ["role:cto", "role:cpo", "role:cmo", "role:coo", "role:cfo", "role:cao"]) {
    const id = role.replace(":", "-");
    const financeOverrides = role === "role:cfo"
      ? {
          default_human_gate: "HG-3",
          blocked_actions: ["bank-action", "payment-initiation", "accounting-system-write"],
        }
      : {};
    const result = validateRegistry(minimalRegistry([minimalPack({ id, owner_role: role, ...financeOverrides })]));
    assert.equal(result.ok, true, `expected role '${role}' to pass but got errors: ${JSON.stringify(result.errors)}`);
  }
});

// ---------------------------------------------------------------------------
// Invalid default_human_gate
// ---------------------------------------------------------------------------

test("invalid human gate: HG-99 fails with INVALID_HUMAN_GATE", () => {
  const result = validateRegistry(minimalRegistry([
    minimalPack({ default_human_gate: "HG-99" }),
  ]));
  assert.equal(result.ok, false);
  const err = result.errors.find((e) => e.code === REASON_CODES.INVALID_HUMAN_GATE);
  assert.ok(err, "expected INVALID_HUMAN_GATE error");
  assert.equal(err.pack_id, "test-pack");
});

test("missing default_human_gate: fails with INVALID_HUMAN_GATE", () => {
  const result = validateRegistry(minimalRegistry([
    minimalPack({ default_human_gate: undefined }),
  ]));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === REASON_CODES.INVALID_HUMAN_GATE));
});

test("all valid human gates pass gate check", () => {
  for (const gate of ["HG-1", "HG-2", "HG-2.5", "HG-3", "HG-3.5", "HG-4"]) {
    const result = validateRegistry(minimalRegistry([minimalPack({ default_human_gate: gate })]));
    assert.equal(result.ok, true, `expected gate '${gate}' to pass but got errors: ${JSON.stringify(result.errors)}`);
  }
});

// ---------------------------------------------------------------------------
// Missing blocked_actions
// ---------------------------------------------------------------------------

test("missing blocked_actions: fails with MISSING_BLOCKED_ACTIONS", () => {
  const result = validateRegistry(minimalRegistry([
    minimalPack({ blocked_actions: undefined }),
  ]));
  assert.equal(result.ok, false);
  const err = result.errors.find((e) => e.code === REASON_CODES.MISSING_BLOCKED_ACTIONS);
  assert.ok(err, "expected MISSING_BLOCKED_ACTIONS error");
  assert.equal(err.pack_id, "test-pack");
});

test("empty blocked_actions array: fails with MISSING_BLOCKED_ACTIONS", () => {
  const result = validateRegistry(minimalRegistry([
    minimalPack({ blocked_actions: [] }),
  ]));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === REASON_CODES.MISSING_BLOCKED_ACTIONS));
});

// ---------------------------------------------------------------------------
// Finance gate enforcement
// ---------------------------------------------------------------------------

function financePackBase(overrides = {}) {
  return minimalPack({
    id: "finance-ops",
    owner_role: "role:cfo",
    default_human_gate: "HG-3",
    blocked_actions: [
      "bank-action-of-any-kind",
      "payment-initiation",
      "accounting-system-write-without-approval",
    ],
    ...overrides,
  });
}

test("finance under-gating: HG-2 fails with FINANCE_GATE_TOO_WEAK", () => {
  const result = validateRegistry(minimalRegistry([
    financePackBase({ default_human_gate: "HG-2" }),
  ]));
  assert.equal(result.ok, false);
  const err = result.errors.find((e) => e.code === REASON_CODES.FINANCE_GATE_TOO_WEAK);
  assert.ok(err, "expected FINANCE_GATE_TOO_WEAK error");
  assert.equal(err.pack_id, "finance-ops");
  assert.match(err.message, /HG-3/);
});

test("finance under-gating: HG-2.5 fails with FINANCE_GATE_TOO_WEAK", () => {
  const result = validateRegistry(minimalRegistry([
    financePackBase({ default_human_gate: "HG-2.5" }),
  ]));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === REASON_CODES.FINANCE_GATE_TOO_WEAK));
});

test("finance gate: HG-3 passes gate check", () => {
  const result = validateRegistry(minimalRegistry([financePackBase()]));
  assert.equal(result.ok, true, `unexpected errors: ${JSON.stringify(result.errors)}`);
});

test("finance gate: HG-3.5 passes gate check", () => {
  const result = validateRegistry(minimalRegistry([
    financePackBase({ default_human_gate: "HG-3.5" }),
  ]));
  assert.equal(result.ok, true, `unexpected errors: ${JSON.stringify(result.errors)}`);
});

test("finance detection: pack with owner_role role:cfo triggers finance rules", () => {
  const result = validateRegistry(minimalRegistry([
    minimalPack({
      id: "custom-finance-pack",
      owner_role: "role:cfo",
      default_human_gate: "HG-2",
      blocked_actions: ["bank-action", "payment-block", "accounting-block"],
    }),
  ]));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === REASON_CODES.FINANCE_GATE_TOO_WEAK));
});

test("finance missing blocked action: missing bank category fails with FINANCE_BLOCKED_ACTION_MISSING", () => {
  const result = validateRegistry(minimalRegistry([
    financePackBase({
      blocked_actions: ["payment-initiation", "accounting-system-write-without-approval"],
    }),
  ]));
  assert.equal(result.ok, false);
  const err = result.errors.find((e) => e.code === REASON_CODES.FINANCE_BLOCKED_ACTION_MISSING);
  assert.ok(err, "expected FINANCE_BLOCKED_ACTION_MISSING error");
  assert.match(err.message, /bank/);
});

test("finance missing blocked action: missing payment category fails with FINANCE_BLOCKED_ACTION_MISSING", () => {
  const result = validateRegistry(minimalRegistry([
    financePackBase({
      blocked_actions: ["bank-action-of-any-kind", "accounting-system-write"],
    }),
  ]));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(
    (e) => e.code === REASON_CODES.FINANCE_BLOCKED_ACTION_MISSING && /payment/.test(e.message),
  ));
});

test("finance missing blocked action: missing accounting-system category fails with FINANCE_BLOCKED_ACTION_MISSING", () => {
  const result = validateRegistry(minimalRegistry([
    financePackBase({
      blocked_actions: ["bank-action-of-any-kind", "payment-initiation"],
    }),
  ]));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(
    (e) => e.code === REASON_CODES.FINANCE_BLOCKED_ACTION_MISSING && /accounting/.test(e.message),
  ));
});

// ---------------------------------------------------------------------------
// Send/publish-capable pack activation_mode check
// ---------------------------------------------------------------------------

test("send/publish-capable pack: non-draft-only activation_mode fails with UNSAFE_ACTIVATION_MODE", () => {
  const result = validateRegistry(minimalRegistry([
    minimalPack({
      id: "outreach-test",
      activation_mode: "send",
      blocked_actions: ["email-send", "linkedin-send"],
    }),
  ]));
  assert.equal(result.ok, false);
  const err = result.errors.find((e) => e.code === REASON_CODES.UNSAFE_ACTIVATION_MODE);
  assert.ok(err, "expected UNSAFE_ACTIVATION_MODE error");
  assert.equal(err.pack_id, "outreach-test");
});

test("send/publish-capable pack: empty activation_mode fails with UNSAFE_ACTIVATION_MODE", () => {
  const result = validateRegistry(minimalRegistry([
    minimalPack({
      id: "outreach-test",
      activation_mode: "",
      blocked_actions: ["email-send"],
    }),
  ]));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === REASON_CODES.UNSAFE_ACTIVATION_MODE));
});

test("send/publish-capable pack: draft-only activation_mode passes", () => {
  const result = validateRegistry(minimalRegistry([
    minimalPack({
      id: "outreach-test",
      activation_mode: "draft-only",
      blocked_actions: ["email-send", "linkedin-send"],
    }),
  ]));
  assert.equal(result.ok, true, `unexpected errors: ${JSON.stringify(result.errors)}`);
});

test("send/publish-capable pack: publish keyword in blocked_actions triggers check", () => {
  const result = validateRegistry(minimalRegistry([
    minimalPack({
      id: "content-test",
      activation_mode: "auto",
      blocked_actions: ["publish-without-review"],
    }),
  ]));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === REASON_CODES.UNSAFE_ACTIVATION_MODE));
});

test("non-send-capable pack: non-draft-only activation_mode does not trigger UNSAFE_ACTIVATION_MODE", () => {
  const result = validateRegistry(minimalRegistry([
    minimalPack({
      id: "read-only-pack",
      activation_mode: "read-only",
      blocked_actions: ["some-internal-action"],
    }),
  ]));
  // Should NOT emit UNSAFE_ACTIVATION_MODE because no send/publish keywords in blocked_actions
  assert.ok(!result.errors.some((e) => e.code === REASON_CODES.UNSAFE_ACTIVATION_MODE));
});

// ---------------------------------------------------------------------------
// External-action pack (CRM mass-write / outreach) activation_mode guard
// ---------------------------------------------------------------------------

test("CRM-blocked pack: crm-mass-write in blocked_actions and non-draft-only activation_mode fails with UNSAFE_ACTIVATION_MODE", () => {
  const result = validateRegistry(minimalRegistry([
    minimalPack({
      id: "sales-crm-test",
      activation_mode: "auto",
      blocked_actions: ["crm-mass-write-without-approval", "bulk-send"],
    }),
  ]));
  assert.equal(result.ok, false);
  const err = result.errors.find((e) => e.code === REASON_CODES.UNSAFE_ACTIVATION_MODE);
  assert.ok(err, "expected UNSAFE_ACTIVATION_MODE error for CRM-blocked pack");
  assert.equal(err.pack_id, "sales-crm-test");
});

test("CRM-blocked pack: draft-only activation_mode passes", () => {
  const result = validateRegistry(minimalRegistry([
    minimalPack({
      id: "sales-crm-test",
      activation_mode: "draft-only",
      blocked_actions: ["crm-mass-write-without-approval"],
    }),
  ]));
  assert.equal(result.ok, true, `unexpected errors: ${JSON.stringify(result.errors)}`);
});

test("outreach-blocked pack: bulk-outreach in blocked_actions and non-draft-only activation_mode fails with UNSAFE_ACTIVATION_MODE", () => {
  const result = validateRegistry(minimalRegistry([
    minimalPack({
      id: "outreach-test",
      activation_mode: "send-capable",
      blocked_actions: ["bulk-outreach-without-approval"],
    }),
  ]));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === REASON_CODES.UNSAFE_ACTIVATION_MODE));
});

test("customer-send-blocked pack: non-draft-only activation_mode fails with UNSAFE_ACTIVATION_MODE", () => {
  const result = validateRegistry(minimalRegistry([
    minimalPack({
      id: "support-test",
      activation_mode: "live",
      blocked_actions: ["customer-send-without-approval"],
    }),
  ]));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === REASON_CODES.UNSAFE_ACTIVATION_MODE));
});

// ---------------------------------------------------------------------------
// Named-pack downgrade-prevention tests (Finance, Sales/CRM, Marketing, Support, Hiring)
// ---------------------------------------------------------------------------

test("named-pack downgrade: Finance Ops gate downgrade to HG-2 fails with FINANCE_GATE_TOO_WEAK", () => {
  const result = validateRegistry(minimalRegistry([
    financePackBase({ id: "finance-ops", default_human_gate: "HG-2" }),
  ]));
  assert.equal(result.ok, false);
  const err = result.errors.find((e) => e.code === REASON_CODES.FINANCE_GATE_TOO_WEAK);
  assert.ok(err, "expected FINANCE_GATE_TOO_WEAK for Finance Ops downgrade");
  assert.equal(err.pack_id, "finance-ops");
});

test("named-pack downgrade: Finance Ops missing bank blocked action fails with FINANCE_BLOCKED_ACTION_MISSING", () => {
  const result = validateRegistry(minimalRegistry([
    financePackBase({
      id: "finance-ops",
      blocked_actions: ["payment-initiation", "accounting-system-write-without-approval", "tax-filing-without-human-sign-off"],
    }),
  ]));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === REASON_CODES.FINANCE_BLOCKED_ACTION_MISSING && /bank/.test(e.message)));
});

test("named-pack downgrade: Finance Ops missing payment blocked action fails with FINANCE_BLOCKED_ACTION_MISSING", () => {
  const result = validateRegistry(minimalRegistry([
    financePackBase({
      id: "finance-ops",
      blocked_actions: ["bank-action-of-any-kind", "accounting-system-write-without-approval"],
    }),
  ]));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === REASON_CODES.FINANCE_BLOCKED_ACTION_MISSING && /payment/.test(e.message)));
});

test("named-pack downgrade: Finance Ops missing accounting blocked action fails with FINANCE_BLOCKED_ACTION_MISSING", () => {
  const result = validateRegistry(minimalRegistry([
    financePackBase({
      id: "finance-ops",
      blocked_actions: ["bank-action-of-any-kind", "payment-initiation"],
    }),
  ]));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === REASON_CODES.FINANCE_BLOCKED_ACTION_MISSING && /accounting/.test(e.message)));
});

test("named-pack downgrade: Sales/CRM activation_mode changed from draft-only fails with UNSAFE_ACTIVATION_MODE", () => {
  const result = validateRegistry(minimalRegistry([
    minimalPack({
      id: "sales-crm",
      owner_role: "role:coo",
      default_human_gate: "HG-2.5",
      activation_mode: "auto",
      blocked_actions: ["crm-mass-write-without-hg25", "bulk-outreach-without-approval"],
    }),
  ]));
  assert.equal(result.ok, false);
  const err = result.errors.find((e) => e.code === REASON_CODES.UNSAFE_ACTIVATION_MODE);
  assert.ok(err, "expected UNSAFE_ACTIVATION_MODE when Sales/CRM activation_mode is not draft-only");
  assert.equal(err.pack_id, "sales-crm");
});

test("named-pack downgrade: Marketing/Outreach activation_mode changed from draft-only fails with UNSAFE_ACTIVATION_MODE", () => {
  const result = validateRegistry(minimalRegistry([
    minimalPack({
      id: "marketing-outreach",
      owner_role: "role:cmo",
      default_human_gate: "HG-2",
      activation_mode: "live",
      blocked_actions: ["email-send", "linkedin-send", "crm-mass-write"],
    }),
  ]));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === REASON_CODES.UNSAFE_ACTIVATION_MODE && e.pack_id === "marketing-outreach"));
});

test("named-pack downgrade: Customer Support activation_mode changed from draft-only fails with UNSAFE_ACTIVATION_MODE", () => {
  const result = validateRegistry(minimalRegistry([
    minimalPack({
      id: "customer-support",
      owner_role: "role:coo",
      default_human_gate: "HG-2",
      activation_mode: "send-capable",
      blocked_actions: ["customer-send-without-approval", "automated-reply-without-review"],
    }),
  ]));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === REASON_CODES.UNSAFE_ACTIVATION_MODE && e.pack_id === "customer-support"));
});

test("named-pack downgrade: Hiring activation_mode changed from draft-only fails with UNSAFE_ACTIVATION_MODE", () => {
  const result = validateRegistry(minimalRegistry([
    minimalPack({
      id: "hiring",
      owner_role: "role:coo",
      default_human_gate: "HG-2.5",
      activation_mode: "auto",
      blocked_actions: ["outreach-send-without-approval", "rejection-send-without-human-sign-off"],
    }),
  ]));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.code === REASON_CODES.UNSAFE_ACTIVATION_MODE && e.pack_id === "hiring"));
});

test("named-pack safe: Finance Ops with correct HG-3 gate and full required blocked actions passes", () => {
  const result = validateRegistry(minimalRegistry([
    minimalPack({
      id: "finance-ops",
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
    }),
  ]));
  assert.equal(result.ok, true, `unexpected errors: ${JSON.stringify(result.errors)}`);
});

// ---------------------------------------------------------------------------
// Error accumulation across multiple packs
// ---------------------------------------------------------------------------

test("multiple errors accumulate across packs", () => {
  const result = validateRegistry(minimalRegistry([
    minimalPack({ id: "pack-a", owner_role: "role:invalid", blocked_actions: [] }),
    minimalPack({ id: "pack-a" }), // duplicate
  ]));
  assert.equal(result.ok, false);
  assert.ok(result.errors.length >= 3,
    `expected at least 3 errors (INVALID_OWNER_ROLE + MISSING_BLOCKED_ACTIONS + DUPLICATE_PACK_ID) but got ${result.errors.length}: ${JSON.stringify(result.errors)}`);
  assert.ok(result.errors.some((e) => e.code === REASON_CODES.INVALID_OWNER_ROLE));
  assert.ok(result.errors.some((e) => e.code === REASON_CODES.MISSING_BLOCKED_ACTIONS));
  assert.ok(result.errors.some((e) => e.code === REASON_CODES.DUPLICATE_PACK_ID));
});
