import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  RUN_STATES,
  PREFLIGHT_REASONS,
  preflightAuth,
  preflightRuntimeBrowserAuth,
  preflightLock,
  preflightBudget,
  preflightWorkspace,
  preflightSandboxWorkspace,
  preflightSecrets,
  preflightCapabilityProfile,
  preflightGateToolAllowlist,
  preflightDependencies,
  preflightRuntimeExecutability,
  preflightRaindropBuilderCoverage,
  preflightRaindropHookShape,
  extractDependencyRefs,
  normalizeDependencyRef,
  resolveDependencyStatusFromComments,
  preflightTimeout,
  preflightArtifactPaths,
  parseGitStatusChangedFiles,
  subtractBaselineChangedFiles,
  resolveRuntimeOwnedReadPaths,
  resolveRuntimeOwnedWritePaths,
  finalizeRuntimeState,
  runDryRun,
  runProcess,
  runRuntimeBrowserAuthLiveCheck,
  writeRuntimeRaindropSummaryArtifacts,
  evaluatePromptResultEvaluationEligibility,
  promptResultEvaluationBlocksRuntime,
  writeRuntimePromptResultEvaluationArtifacts,
} from "./runtime-dispatcher-v1.mjs";

import { validatePromptResultEvaluation } from "./raindrop-prompt-result-loop.mjs";

import {
  INSTRUMENTED_SURFACES,
  SURFACE_BUILDER_REGISTRY,
  RAINDROP_HOOK_PRODUCER_REGISTRY,
  REQUIRED_HOOK_PRODUCERS,
} from "./raindrop-call-adapter.mjs";

function sha256(s) { return createHash("sha256").update(s || "", "utf8").digest("hex"); }

function lockComment({
  descHash = "deadbeef".repeat(8),
  expiresAt = new Date(Date.now() + 60_000).toISOString(),
  runId = "run-uuid-1",
} = {}) {
  const body = [
    "<p><strong>worker.lock (dispatcher-v0)</strong></p>",
    "<pre><code>worker.lock:",
    "  version: dispatcher-v0",
    `  expires_at: ${expiresAt}`,
    `  dispatcher_run_id: ${runId}`,
    "  hash:",
    `    description: ${descHash}`,
    "    labels: 0",
    "</code></pre>",
  ].join("\n");
  return { id: "lock-1", created_at: new Date().toISOString(), comment_html: body };
}

const VALID_CONTRACT_FIELDS = {
  agent: "claude",
  role: "role:cto",
  rolelabel: "role:cto",
  mode: "implement",
  workspace: "registry:company-os",
  capabilityprofile: "claude-clevel-worker/cto/runtime",
  autonomylevel: "L2",
  subagentroster: "explorer, worker",
  memorystore: "honcho:company",
  memoryupdatepolicy: "controller-approved",
  dispatch: "ready",
  source_of_truth: ["/abs/a.md"],
  allowedreadpaths: ["/abs", "/Users/x/Developer/Company.OS"],
  acceptance_criteria: ["tests green"],
  gates: ["git diff --check"],
  human_gate: "HG-2.5",
  reporting: ["/Users/x/Developer/Company.OS/reports/runs/2026-05-08/run.md"],
  maxspend: "EUR 0",
  maxruntime: "60m",
  heartbeat: "15m scheduler heartbeat",
  killswitch: "issue #stop",
  runtimeauth: "claude sentinel",
};

const VALID_CAPABILITY_REGISTRY = {
  version: "capability-registry/v0",
  profiles: [
    {
      id: "claude-clevel-worker/cto/runtime",
      role: "role:cto",
      agents: ["claude"],
      modes: ["implement", "audit"],
      workspaces: ["company-os", "registry:company-os", "${LOCAL_WORKSPACE}"],
      max_autonomy_level: "L3",
      allowed_plugins: ["gitnexus"],
      allowed_connectors: ["plane-app"],
      allowed_commands: ["claude", "node"],
      allowed_skills: ["linear-agent-orchestration"],
      allowed_subagents: ["explorer", "worker"],
      memory: {
        honcho_read: "company",
        honcho_write: "proposal-only",
      },
      last_verified_at: "2026-05-09",
      stale_after_days: 36500,
    },
  ],
};

// ---------- preflightAuth ----------

test("preflightAuth PASS for human agent (no sentinel required)", () => {
  const r = preflightAuth({ contractFields: { agent: "human" }, runtimeAuthDeclared: false });
  assert.equal(r.state, RUN_STATES.PASS);
});

test("preflightAuth PASS for claude with RuntimeAuth declared", () => {
  const r = preflightAuth({ contractFields: { agent: "claude" }, runtimeAuthDeclared: true });
  assert.equal(r.state, RUN_STATES.PASS);
});

test("preflightAuth BLOCKED_AUTH when live runtime sentinel fails", () => {
  const r = preflightAuth({
    contractFields: { agent: "claude" },
    runtimeAuthDeclared: true,
    runtimeAuthCheck: {
      ok: false,
      agent: "claude",
      sentinel: {
        ok: false,
        exitCode: 1,
        stdout: "Your organization has disabled Claude subscription access for Claude Code",
        stderr: "",
      },
    },
  });
  assert.equal(r.state, RUN_STATES.BLOCKED_AUTH);
  assert.equal(r.reason, PREFLIGHT_REASONS.AUTH_SENTINEL_FAILED);
  assert.equal(r.evidence.check.sentinel.exitCode, 1);
});

test("preflightAuth BLOCKED_AUTH when agent missing", () => {
  const r = preflightAuth({ contractFields: {}, runtimeAuthDeclared: true });
  assert.equal(r.state, RUN_STATES.BLOCKED_AUTH);
  assert.equal(r.reason, PREFLIGHT_REASONS.AUTH_AGENT_MISSING);
});

test("preflightAuth BLOCKED_AUTH on unknown runtime", () => {
  const r = preflightAuth({ contractFields: { agent: "rogue-bot" }, runtimeAuthDeclared: true });
  assert.equal(r.state, RUN_STATES.BLOCKED_AUTH);
  assert.equal(r.reason, PREFLIGHT_REASONS.AUTH_RUNTIME_UNKNOWN);
});

test("preflightAuth BLOCKED_AUTH when claude has no sentinel declared", () => {
  const r = preflightAuth({ contractFields: { agent: "claude" }, runtimeAuthDeclared: false });
  assert.equal(r.state, RUN_STATES.BLOCKED_AUTH);
  assert.equal(r.reason, PREFLIGHT_REASONS.AUTH_SENTINEL_MISSING);
});

// ---------- preflightRuntimeBrowserAuth ----------

test("preflightRuntimeBrowserAuth PASS for non-browser contracts without declaration", () => {
  const r = preflightRuntimeBrowserAuth({ contractFields: { mode: "implement", gates: ["git diff --check"] } });
  assert.equal(r.state, RUN_STATES.PASS);
});

test("preflightRuntimeBrowserAuth ignores negative privacy/scope browser mentions", () => {
  const r = preflightRuntimeBrowserAuth({
    contractFields: {
      mode: "implement",
      scope: [
        "Include: emit privacy-safe runtime artifacts after Controller AUTO-GO.",
        "Exclude: no raw prompt, raw output, tool payload, browser storage or secrets in artifacts.",
        "Exclude: no Plane state transition, Plane Done, deploy or public publish.",
      ],
      gates: ["node --test scripts/orchestration/runtime-dispatcher-v1.test.mjs"],
    },
  });
  assert.equal(r.state, RUN_STATES.PASS);
});

test("preflightRuntimeBrowserAuth BLOCKED_AUTH when browser UI work omits RuntimeBrowserAuth", () => {
  const r = preflightRuntimeBrowserAuth({
    contractFields: {
      runtimepermissionmode: "browser-confirmed",
      outcomespec: "Browser UI installs Plane templates with screenshot evidence.",
      gates: ["Playwright screenshot capture"],
    },
  });
  assert.equal(r.state, RUN_STATES.BLOCKED_AUTH);
  assert.equal(r.reason, PREFLIGHT_REASONS.BROWSER_AUTH_MISSING);
});

test("preflightRuntimeBrowserAuth BLOCKED_AUTH when browser connector is declared but unavailable", () => {
  const r = preflightRuntimeBrowserAuth({
    contractFields: {
      runtimebrowserauth: "browser-connector",
      outcomespec: "Browser UI installs Plane templates with screenshot evidence.",
    },
    runtimeBrowserAuthCheck: { ok: false, reason: "no browser connector" },
  });
  assert.equal(r.state, RUN_STATES.BLOCKED_AUTH);
  assert.equal(r.reason, PREFLIGHT_REASONS.BROWSER_AUTH_UNAVAILABLE);
});

test("preflightRuntimeBrowserAuth PASS when browser connector is declared and available", () => {
  const r = preflightRuntimeBrowserAuth({
    contractFields: {
      runtimebrowserauth: "browser-connector",
      outcomespec: "Browser UI installs Plane templates with screenshot evidence.",
    },
    runtimeBrowserAuthCheck: { ok: true, source: "test" },
  });
  assert.equal(r.state, RUN_STATES.PASS);
});

test("preflightRuntimeBrowserAuth PASS for intentionally forbidden browser auth", () => {
  const r = preflightRuntimeBrowserAuth({
    contractFields: {
      runtimebrowserauth: "forbidden",
      outcomespec: "Browser UI blocker verification only.",
    },
  });
  assert.equal(r.state, RUN_STATES.PASS);
});

test("runRuntimeBrowserAuthLiveCheck accepts redacted proof file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "browser-auth-proof-"));
  const proofFile = path.join(dir, "proof.json");
  fs.writeFileSync(proofFile, JSON.stringify({
    ok: true,
    kind: "browser-connector",
    subject: "Plane UI",
    expires_at: new Date(Date.now() + 60_000).toISOString(),
    evidence: "test-proof",
  }));
  const result = runRuntimeBrowserAuthLiveCheck({
    contractFields: { runtimebrowserauth: "browser-connector" },
    env: { COMPANY_OS_BROWSER_AUTH_PROOF_FILE: proofFile },
  });
  assert.equal(result.ok, true);
  assert.equal(result.source, "proof-file");
  assert.equal(result.browser_auth_kind, "browser-connector");
});

test("runRuntimeBrowserAuthLiveCheck rejects secret-like proof file", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "browser-auth-proof-"));
  const proofFile = path.join(dir, "proof.json");
  fs.writeFileSync(proofFile, JSON.stringify({
    ok: true,
    kind: "browser-connector",
    cookie: "never",
  }));
  const result = runRuntimeBrowserAuthLiveCheck({
    contractFields: { runtimebrowserauth: "browser-connector" },
    env: { COMPANY_OS_BROWSER_AUTH_PROOF_FILE: proofFile },
  });
  assert.equal(result.ok, false);
  assert.equal(result.source, "proof-file");
  assert.equal(result.reason, "browser-auth-proof-contains-secret-like-field");
});

test("runRuntimeBrowserAuthLiveCheck accepts probe command JSON", () => {
  const command = JSON.stringify([
    process.execPath,
    "-e",
    "console.log(JSON.stringify({ok:true,browser_auth_kind:'browser-connector',proof:{kind:'browser-connector',subject:'Plane UI'}}))",
    "--",
  ]);
  const result = runRuntimeBrowserAuthLiveCheck({
    contractFields: { runtimebrowserauth: "browser-connector" },
    env: { COMPANY_OS_BROWSER_AUTH_PROBE_COMMAND: command },
  });
  assert.equal(result.ok, true);
  assert.equal(result.source, "probe-command");
});

test("runRuntimeBrowserAuthLiveCheck keeps legacy env sentinel as fallback", () => {
  const result = runRuntimeBrowserAuthLiveCheck({
    contractFields: { runtimebrowserauth: "browser-connector" },
    env: { COMPANY_OS_BROWSER_AUTH_OK: "1" },
  });
  assert.equal(result.ok, true);
  assert.equal(result.source, "legacy-env-sentinel");
});

// ---------- preflightLock ----------

test("preflightLock PASS when active lock with matching hash present", () => {
  const desc = "<p>hello</p>";
  const r = preflightLock({
    comments: [lockComment({ descHash: sha256(desc) })],
    currentDescriptionHash: sha256(desc),
    now: new Date(),
  });
  assert.equal(r.state, RUN_STATES.PASS);
});

test("preflightLock PASS when active lock uses an accepted legacy hash candidate", () => {
  const canonical = "b".repeat(64);
  const legacy = "a".repeat(64);
  const r = preflightLock({
    comments: [lockComment({ descHash: legacy })],
    currentDescriptionHash: canonical,
    currentDescriptionHashes: [canonical, legacy],
    now: new Date(),
  });
  assert.equal(r.state, RUN_STATES.PASS);
});

test("preflightLock BLOCKED runtime.lock-missing when no lock comment", () => {
  const r = preflightLock({ comments: [], currentDescriptionHash: "abc", now: new Date() });
  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.equal(r.reason, PREFLIGHT_REASONS.LOCK_MISSING);
});

test("preflightLock BLOCKED runtime.lock-expired when lock expired", () => {
  const expired = new Date(Date.now() - 60_000).toISOString();
  const r = preflightLock({
    comments: [lockComment({ expiresAt: expired })],
    currentDescriptionHash: "abc",
    now: new Date(),
  });
  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.equal(r.reason, PREFLIGHT_REASONS.LOCK_EXPIRED);
});

test("preflightLock BLOCKED runtime.lock-drift when hashes diverge", () => {
  const r = preflightLock({
    comments: [lockComment({ descHash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" })],
    currentDescriptionHash: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    now: new Date(),
  });
  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.equal(r.reason, PREFLIGHT_REASONS.LOCK_DRIFT);
});

// ---------- preflightBudget ----------

test("preflightBudget PASS when MaxSpend EUR 0", () => {
  const r = preflightBudget({ contractFields: { maxspend: "EUR 0" } });
  assert.equal(r.state, RUN_STATES.PASS);
});

test("preflightBudget BLOCKED_BUDGET when MaxSpend undeclared", () => {
  const r = preflightBudget({ contractFields: {} });
  assert.equal(r.state, RUN_STATES.BLOCKED_BUDGET);
  assert.equal(r.reason, PREFLIGHT_REASONS.BUDGET_UNDECLARED);
});

test("preflightBudget BLOCKED_BUDGET when MaxSpend > 0 and no cost-router approval", () => {
  const r = preflightBudget({ contractFields: { maxspend: "EUR 25" }, costRouterApproval: false });
  assert.equal(r.state, RUN_STATES.BLOCKED_BUDGET);
  assert.equal(r.reason, PREFLIGHT_REASONS.BUDGET_OVER_MAX_NO_APPROVAL);
});

test("preflightBudget PASS when MaxSpend > 0 and cost-router approved", () => {
  const r = preflightBudget({ contractFields: { maxspend: "EUR 25" }, costRouterApproval: true });
  assert.equal(r.state, RUN_STATES.PASS);
});

// ---------- preflightWorkspace ----------

test("preflightWorkspace PASS for registry:* form", () => {
  const r = preflightWorkspace({ contractFields: { workspace: "registry:company-os" } });
  assert.equal(r.state, RUN_STATES.PASS);
});

test("preflightWorkspace BLOCKED when workspace undeclared", () => {
  const r = preflightWorkspace({ contractFields: {} });
  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.equal(r.reason, PREFLIGHT_REASONS.WORKSPACE_UNDECLARED);
});

test("preflightWorkspace BLOCKED unhealthy via injected checker", () => {
  const r = preflightWorkspace({
    contractFields: { workspace: "registry:company-os" },
    workspaceHealthChecker: () => ({ healthy: false, reason: "dirty worktree" }),
  });
  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.equal(r.reason, PREFLIGHT_REASONS.WORKSPACE_UNHEALTHY);
});

// ---------- preflightSandboxWorkspace ----------

test("preflightSandboxWorkspace BLOCKED for implement+sandbox-required with registry:company-os", () => {
  const r = preflightSandboxWorkspace({
    contractFields: {
      mode: "implement",
      sandbox: "required",
      workspace: "registry:company-os",
    },
  });
  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.equal(r.reason, PREFLIGHT_REASONS.SANDBOX_WORKSPACE_ALIAS_UNSAFE);
  assert.equal(r.evidence.workspace, "registry:company-os");
});

test("preflightSandboxWorkspace BLOCKED for implement+sandbox-required with bare company-os slug", () => {
  const r = preflightSandboxWorkspace({
    contractFields: {
      mode: "implement",
      sandbox: "required",
      workspace: "company-os",
    },
  });
  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.equal(r.reason, PREFLIGHT_REASONS.SANDBOX_WORKSPACE_ALIAS_UNSAFE);
});

test("preflightSandboxWorkspace BLOCKED for implement+sandbox-required with canonical absolute Company.OS path", () => {
  const r = preflightSandboxWorkspace({
    contractFields: {
      mode: "implement",
      sandbox: "required",
      workspace: "${LOCAL_WORKSPACE}",
    },
  });
  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.equal(r.reason, PREFLIGHT_REASONS.SANDBOX_WORKSPACE_ALIAS_UNSAFE);
});

test("preflightSandboxWorkspace PASS for implement+sandbox-required with absolute approved sandbox path", () => {
  const r = preflightSandboxWorkspace({
    contractFields: {
      mode: "implement",
      sandbox: "required",
      workspace: "${LOCAL_WORKSPACE}",
    },
  });
  assert.equal(r.state, RUN_STATES.PASS);
  assert.equal(r.evidence.applied, true);
});

test("preflightSandboxWorkspace BLOCKED when workspace is only the sandbox root", () => {
  const r = preflightSandboxWorkspace({
    contractFields: {
      mode: "implement",
      sandbox: "required",
      workspace: "${LOCAL_WORKSPACE}",
    },
  });
  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.equal(r.reason, PREFLIGHT_REASONS.SANDBOX_WORKSPACE_ALIAS_UNSAFE);
});

test("preflightSandboxWorkspace BLOCKED when workspace stops at sandbox workspace family", () => {
  const r = preflightSandboxWorkspace({
    contractFields: {
      mode: "implement",
      sandbox: "required",
      workspace: "${LOCAL_WORKSPACE}",
    },
  });
  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.equal(r.reason, PREFLIGHT_REASONS.SANDBOX_WORKSPACE_ALIAS_UNSAFE);
});

test("preflightSandboxWorkspace BLOCKED when sandbox path uses traversal segment", () => {
  const r = preflightSandboxWorkspace({
    contractFields: {
      mode: "implement",
      sandbox: "required",
      workspace: "${LOCAL_WORKSPACE}",
    },
  });
  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.equal(r.reason, PREFLIGHT_REASONS.SANDBOX_WORKSPACE_ALIAS_UNSAFE);
});

test("preflightSandboxWorkspace PASS for non-implement audit mode even with canonical alias", () => {
  const r = preflightSandboxWorkspace({
    contractFields: {
      mode: "audit",
      sandbox: "required",
      workspace: "registry:company-os",
    },
  });
  assert.equal(r.state, RUN_STATES.PASS);
  assert.equal(r.evidence.applied, false);
});

test("preflightSandboxWorkspace PASS when sandbox not required even with canonical alias", () => {
  const r = preflightSandboxWorkspace({
    contractFields: {
      mode: "implement",
      workspace: "registry:company-os",
    },
  });
  assert.equal(r.state, RUN_STATES.PASS);
  assert.equal(r.evidence.applied, false);
});

// ---------- preflightSecrets ----------

test("preflightSecrets PASS on benign description", () => {
  const r = preflightSecrets({ description: "Just a plain description with no secrets.", contractFields: {} });
  assert.equal(r.state, RUN_STATES.PASS);
});

test("preflightSecrets BLOCKED on AWS access key pattern", () => {
  const token = ["AKIA", "ABCDEFGHIJKLMNOP"].join("");
  const r = preflightSecrets({
    description: `Use ${token} for the bucket.`,
    contractFields: {},
  });
  assert.equal(r.state, RUN_STATES.BLOCKED_AUTH);
  assert.equal(r.reason, PREFLIGHT_REASONS.SECRET_LEAK_SUSPECTED);
});

test("preflightSecrets BLOCKED on PEM private key pattern", () => {
  const marker = ["-----BEGIN", "PRIVATE KEY-----"].join(" ");
  const r = preflightSecrets({
    description: `${marker}\nMIIBVwIBADANBg...`,
    contractFields: {},
  });
  assert.equal(r.state, RUN_STATES.BLOCKED_AUTH);
  assert.equal(r.reason, PREFLIGHT_REASONS.SECRET_LEAK_SUSPECTED);
});

test("preflightSecrets BLOCKED on connector token patterns", () => {
  const token = ["sk", "or", "v1", "abcdefghijklmnopqrstuvwxyz123456"].join("-");
  const r = preflightSecrets({
    description: `Do not leak ${token}`,
    contractFields: {},
  });
  assert.equal(r.state, RUN_STATES.BLOCKED_AUTH);
  assert.equal(r.reason, PREFLIGHT_REASONS.SECRET_LEAK_SUSPECTED);
});

// ---------- preflightCapabilityProfile ----------

test("preflightCapabilityProfile PASS for matching declared profile", () => {
  const r = preflightCapabilityProfile({
    contractFields: VALID_CONTRACT_FIELDS,
    capabilityRegistry: VALID_CAPABILITY_REGISTRY,
    usedCapabilities: { connectors: ["plane-app"], commands: ["claude"] },
    now: new Date("2026-05-10T00:00:00Z"),
  });
  assert.equal(r.state, RUN_STATES.PASS);
});

test("preflightCapabilityProfile BLOCKED when claude profile missing", () => {
  const fields = { ...VALID_CONTRACT_FIELDS };
  delete fields.capabilityprofile;
  const r = preflightCapabilityProfile({
    contractFields: fields,
    capabilityRegistry: VALID_CAPABILITY_REGISTRY,
    now: new Date("2026-05-10T00:00:00Z"),
  });
  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.equal(r.reason, PREFLIGHT_REASONS.CAPABILITY_PROFILE_MISSING);
});

test("preflightCapabilityProfile BLOCKED on undeclared subagent", () => {
  const r = preflightCapabilityProfile({
    contractFields: { ...VALID_CONTRACT_FIELDS, subagentroster: "explorer, browser-driver" },
    capabilityRegistry: VALID_CAPABILITY_REGISTRY,
    now: new Date("2026-05-10T00:00:00Z"),
  });
  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.equal(r.reason, PREFLIGHT_REASONS.CAPABILITY_UNDECLARED_TOOL);
});

test("preflightCapabilityProfile BLOCKED when profile is stale", () => {
  const r = preflightCapabilityProfile({
    contractFields: VALID_CONTRACT_FIELDS,
    capabilityRegistry: VALID_CAPABILITY_REGISTRY,
    now: new Date("2126-06-01T00:00:00Z"),
  });
  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.equal(r.reason, PREFLIGHT_REASONS.CAPABILITY_STALE);
});

// ---------- preflightDependencies ----------

test("preflightDependencies PASS when DependsOn empty", () => {
  const r = preflightDependencies({ contractFields: {}, dependencyStatusResolver: () => ({ status: "PASS" }) });
  assert.equal(r.state, RUN_STATES.PASS);
});

test("preflightDependencies PASS when all deps PASS or PARK", () => {
  const r = preflightDependencies({
    contractFields: { dependson: ["[WORK_ITEM_ID]", "[WORK_ITEM_ID]"] },
    dependencyStatusResolver: (id) => ({ status: id === "[WORK_ITEM_ID]" ? "PASS" : "PARK" }),
  });
  assert.equal(r.state, RUN_STATES.PASS);
});

test("extractDependencyRefs splits comma, semicolon and newline declarations", () => {
  assert.deepEqual(extractDependencyRefs({ depends_on: "[WORK_ITEM_ID], [WORK_ITEM_ID]\nCOMPA-186; [WORK_ITEM_ID]" }), [
    "[WORK_ITEM_ID]",
    "[WORK_ITEM_ID]",
    "[WORK_ITEM_ID]",
    "[WORK_ITEM_ID]",
  ]);
});

test("normalizeDependencyRef canonicalizes Plane sequence refs", () => {
  assert.equal(normalizeDependencyRef("compa-223"), "[WORK_ITEM_ID]");
  assert.equal(normalizeDependencyRef("grow-53"), "GROW-53");
  assert.equal(normalizeDependencyRef("223"), "[WORK_ITEM_ID]");
});

test("resolveDependencyStatusFromComments returns PASS from human gate release", () => {
  const status = resolveDependencyStatusFromComments([
    {
      id: "release-1",
      created_at: "2030-01-01T00:05:00Z",
      comment_html: "<p><strong>human_gate.released</strong></p>",
    },
  ]);
  assert.equal(status.status, "PASS");
  assert.equal(status.source, "human_gate.released");
});

test("resolveDependencyStatusFromComments returns PASS from controller AUTO-GO", () => {
  const status = resolveDependencyStatusFromComments([
    {
      id: "decision-1",
      created_at: "2030-01-01T00:04:00Z",
      comment_html: "<p><strong>controller.decision</strong></p><pre><code>controller.decision:\n  decision_mode: AUTO-GO\n</code></pre>",
    },
  ]);
  assert.equal(status.status, "PASS");
  assert.equal(status.source, "controller.decision");
});

test("resolveDependencyStatusFromComments does not treat DELEGATE as dependency PASS", () => {
  const status = resolveDependencyStatusFromComments([
    {
      id: "decision-1",
      created_at: "2030-01-01T00:04:00Z",
      comment_html: "<p><strong>controller.decision</strong></p><pre><code>controller.decision:\n  decision_mode: DELEGATE\n</code></pre>",
    },
  ]);
  assert.equal(status.status, "DELEGATE");
  assert.equal(status.source, "controller.decision");
});

test("resolveDependencyStatusFromComments uses latest terminal signal across comment types", () => {
  const status = resolveDependencyStatusFromComments([
    {
      id: "release-1",
      created_at: "2030-01-01T00:05:00Z",
      comment_html: "<p><strong>human_gate.released</strong></p>",
    },
    {
      id: "decision-reject",
      created_at: "2030-01-01T00:06:00Z",
      comment_html: "<p><strong>controller.decision</strong></p><pre><code>controller.decision:\n  decision_mode: REJECT\n</code></pre>",
    },
  ]);
  assert.equal(status.status, "REJECT");
  assert.equal(status.comment_id, "decision-reject");
});

test("resolveDependencyStatusFromComments lets newer CAO REJECT override older controller AUTO-GO", () => {
  const status = resolveDependencyStatusFromComments([
    {
      id: "decision-pass",
      created_at: "2030-01-01T00:05:00Z",
      comment_html: "<p><strong>controller.decision</strong></p><pre><code>controller.decision:\n  decision_mode: AUTO-GO\n</code></pre>",
    },
    {
      id: "cao-reject",
      created_at: "2030-01-01T00:06:00Z",
      comment_html: "<p><strong>controller.verdict</strong></p><pre><code>controller.verdict:\n  verdict: REJECT\n</code></pre>",
    },
  ]);
  assert.equal(status.status, "REJECT");
  assert.equal(status.source, "controller.verdict");
});

test("resolveDependencyStatusFromComments returns PARK from CAO PARK", () => {
  const status = resolveDependencyStatusFromComments([
    {
      id: "cao-1",
      created_at: "2030-01-01T00:03:00Z",
      comment_html: "<p><strong>controller.verdict</strong></p><pre><code>controller.verdict:\n  verdict: PARK\n</code></pre>",
    },
  ]);
  assert.equal(status.status, "PARK");
  assert.equal(status.source, "controller.verdict");
});

test("resolveDependencyStatusFromComments falls back to worker.reported state", () => {
  const status = resolveDependencyStatusFromComments([
    {
      id: "worker-1",
      created_at: "2030-01-01T00:02:00Z",
      comment_html: "<p><strong>worker.reported</strong></p><pre><code>state: PASS\n</code></pre>",
    },
  ]);
  assert.equal(status.status, "PASS");
  assert.equal(status.source, "worker.reported");
});

test("preflightDependencies BLOCKED when a dep not PASS/PARK", () => {
  const r = preflightDependencies({
    contractFields: { dependson: ["[WORK_ITEM_ID]"] },
    dependencyStatusResolver: () => ({ status: "REJECT" }),
  });
  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.equal(r.reason, PREFLIGHT_REASONS.DEPENDENCY_NOT_RESOLVED);
});

// ---------- preflightTimeout ----------

test("preflightTimeout PASS when MaxRuntime, Heartbeat, KillSwitch all declared", () => {
  const r = preflightTimeout({ contractFields: VALID_CONTRACT_FIELDS });
  assert.equal(r.state, RUN_STATES.PASS);
});

test("preflightTimeout BLOCKED when KillSwitch missing", () => {
  const fields = { ...VALID_CONTRACT_FIELDS };
  delete fields.killswitch;
  const r = preflightTimeout({ contractFields: fields });
  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.equal(r.reason, PREFLIGHT_REASONS.TIMEOUT_POLICY_MISSING);
});

test("preflightTimeout BLOCKED when MaxRuntime undeclared", () => {
  const fields = { ...VALID_CONTRACT_FIELDS };
  delete fields.maxruntime;
  const r = preflightTimeout({ contractFields: fields });
  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.equal(r.reason, PREFLIGHT_REASONS.TIMEOUT_POLICY_MISSING);
});

// ---------- preflightRuntimeExecutability ----------

test("preflightRuntimeExecutability blocks runtime-invalid contracts", () => {
  const r = preflightRuntimeExecutability({
    workItem: {
      id: "item-runtime-ready",
      sequence_id: 311,
      description_stripped: "runtime-ready fixture",
    },
    description: "runtime-ready fixture",
    contractFields: {
      ...VALID_CONTRACT_FIELDS,
      capabilityprofile: "missing/profile",
    },
    labelNames: ["role:cto"],
    capabilityRegistry: VALID_CAPABILITY_REGISTRY,
    now: new Date("2026-05-20T08:00:00Z"),
  });
  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.equal(r.reason, PREFLIGHT_REASONS.RUNTIME_EXECUTABILITY_BLOCKED);
  assert.ok(r.evidence.runtime_ready_reasons.includes("runtime-ready.capability-profile-unregistered"));
});

test("runDryRun surfaces runtime-ready state and keeps executable contracts green", () => {
  const descHash = sha256("runtime-ready fixture");
  const r = runDryRun({
    workItem: {
      id: "item-runtime-ready-pass",
      sequence_id: 311,
      description_stripped: "runtime-ready fixture",
      label_names: ["role:cto"],
    },
    comments: [lockComment({ descHash })],
    contractFields: VALID_CONTRACT_FIELDS,
    description: "runtime-ready fixture",
    currentDescriptionHash: descHash,
    currentDescriptionHashes: [descHash],
    runtimeAuthDeclared: true,
    runtimeAuthCheck: { ok: true },
    costRouterApproval: true,
    capabilityRegistry: VALID_CAPABILITY_REGISTRY,
    dependencyStatusResolver: () => ({ status: "PASS" }),
    fsExists: (candidate) => !String(candidate).includes("missing"),
    fsStat: () => ({ isDirectory: () => true }),
    now: new Date("2026-05-20T08:00:00Z"),
  });
  assert.equal(r.state, RUN_STATES.PASS);
  assert.equal(r.runtime_ready_state, "RUNTIME_READY_PASS");
  assert.deepEqual(r.runtime_ready_reasons, []);
});

// ---------- preflightArtifactPaths ----------

test("preflightArtifactPaths BLOCKED when no artifact paths declared", () => {
  const r = preflightArtifactPaths({ contractFields: {} });
  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.equal(r.reason, PREFLIGHT_REASONS.ARTIFACT_PATH_INVALID);
});

test("preflightArtifactPaths BLOCKED when reporting has no absolute artifact path", () => {
  const r = preflightArtifactPaths({ contractFields: { reporting: "Plane comment only" } });
  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.equal(r.reason, PREFLIGHT_REASONS.ARTIFACT_PATH_INVALID);
});

test("preflightArtifactPaths ignores commands/results as a relative prose token", () => {
  const r = preflightArtifactPaths({ contractFields: { reporting: "Plane worker.reported with commands/results." } });
  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.equal(r.reason, PREFLIGHT_REASONS.ARTIFACT_PATH_INVALID);
});

test("preflightArtifactPaths can use OutcomeArtifacts when Reporting has command/result prose", () => {
  const r = preflightArtifactPaths({
    contractFields: {
      reporting: "Plane worker.reported with changed files and commands/results.",
      outcome_artifacts: ["/var/tmp/known/"],
    },
    fsExists: (p) => p === "/var/tmp/known/",
    fsStat: () => ({ isDirectory: () => true }),
  });
  assert.equal(r.state, RUN_STATES.PASS);
});

test("preflightArtifactPaths PASS when parent dir exists (mocked)", () => {
  const r = preflightArtifactPaths({
    contractFields: { reporting: ["/var/tmp/known/run.md"] },
    fsExists: (p) => p === "/var/tmp/known", // path missing, parent exists
    fsStat: () => ({ isDirectory: () => true }),
  });
  assert.equal(r.state, RUN_STATES.PASS);
});

test("preflightArtifactPaths BLOCKED when parent dir missing", () => {
  const r = preflightArtifactPaths({
    contractFields: { reporting: ["/never/exists/anywhere/run.md"] },
    fsExists: () => false,
    fsStat: () => ({ isDirectory: () => false }),
  });
  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.equal(r.reason, PREFLIGHT_REASONS.ARTIFACT_PATH_INVALID);
});

test("preflightGateToolAllowlist BLOCKED when an executable gate cannot run under allowed_claude_tools", () => {
  const r = preflightGateToolAllowlist({
    contractFields: {
      gates: ["node scripts/plane/plane-template-registry.mjs validate"],
    },
    capabilityProfile: {
      allowed_claude_tools: ["Read"],
    },
  });

  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.equal(r.reason, PREFLIGHT_REASONS.GATE_TOOL_NOT_ALLOWED);
  assert.equal(r.evidence.missing[0].suggested_allowed_tool, "Bash(node scripts/plane/plane-template-registry.mjs*)");
});

test("preflightGateToolAllowlist PASS when executable gates are safe-derived or explicitly allowed", () => {
  const r = preflightGateToolAllowlist({
    contractFields: {
      allowedclaudetools: ["Bash(node scripts/plane/plane-template-registry.mjs*)"],
      gates: [
        "node --test scripts/plane/*.test.mjs",
        "node scripts/plane/plane-template-registry.mjs validate",
      ],
    },
    capabilityProfile: {
      allowed_claude_tools: ["Read"],
    },
  });

  assert.equal(r.state, RUN_STATES.PASS);
  assert.equal(r.evidence.checked_count, 2);
});

// ---------- preflightRaindropBuilderCoverage ----------

test("preflightRaindropBuilderCoverage PASS for the current SURFACE_BUILDER_REGISTRY and INSTRUMENTED_SURFACES", () => {
  const r = preflightRaindropBuilderCoverage();
  assert.equal(r.state, RUN_STATES.PASS);
  assert.equal(r.reason, null);
  assert.equal(r.evidence.surface_count, INSTRUMENTED_SURFACES.length);
});

test("preflightRaindropBuilderCoverage BLOCKED when a promoted surface has no registered builder", () => {
  const brokenSurfaces = [
    ...INSTRUMENTED_SURFACES,
    "synthetic-test-surface/missing-builder",
  ];
  const r = preflightRaindropBuilderCoverage({
    instrumentedSurfaces: brokenSurfaces,
    surfaceBuilderRegistry: SURFACE_BUILDER_REGISTRY,
  });
  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.equal(r.reason, PREFLIGHT_REASONS.RAINDROP_BUILDER_COVERAGE_BROKEN);
  assert.equal(r.reason, "runtime.raindrop-builder-coverage-broken");
  assert.ok(
    r.evidence.errors.some((e) => e.includes("synthetic-test-surface/missing-builder")),
    "evidence must name the uncovered surface",
  );
});

test("preflightRaindropBuilderCoverage BLOCKED when a covered surface is dropped from the registry", () => {
  const brokenRegistry = { ...SURFACE_BUILDER_REGISTRY };
  delete brokenRegistry["runtime-dispatcher-v1.2/worker-spawn"];
  const r = preflightRaindropBuilderCoverage({
    instrumentedSurfaces: INSTRUMENTED_SURFACES,
    surfaceBuilderRegistry: brokenRegistry,
  });
  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.equal(r.reason, PREFLIGHT_REASONS.RAINDROP_BUILDER_COVERAGE_BROKEN);
  assert.ok(
    r.evidence.errors.some((e) => e.includes("runtime-dispatcher-v1.2/worker-spawn")),
    "evidence must name the dropped surface",
  );
});

test("preflightRaindropBuilderCoverage does not expand instrumented surfaces beyond the adapter list", () => {
  const r = preflightRaindropBuilderCoverage();
  assert.ok(r.state === RUN_STATES.PASS);
  for (const guarded of [
    "scheduler/worker-run",
    "hermes-assistant/llm-calls",
    "aionui-hermes/command-layer",
    "manual-claude-desktop-sessions",
    "arbitrary-cli-sessions-outside-runtime",
  ]) {
    assert.equal(
      INSTRUMENTED_SURFACES.includes(guarded),
      false,
      `${guarded} must remain out of INSTRUMENTED_SURFACES in this slice`,
    );
  }
});

// ---------- runDryRun (composer) ----------

test("runDryRun PASS when all preflights green", () => {
  const desc = "<p>hello</p>";
  const r = runDryRun({
    workItem: { id: "x", sequence_id: 99, name: "Test" },
    comments: [lockComment({ descHash: sha256(desc) })],
    contractFields: VALID_CONTRACT_FIELDS,
    description: desc,
    currentDescriptionHash: sha256(desc),
    runtimeAuthDeclared: true,
    costRouterApproval: false,
    capabilityRegistry: VALID_CAPABILITY_REGISTRY,
    fsExists: () => true,
    fsStat: () => ({ isDirectory: () => true }),
  });
  assert.equal(r.state, RUN_STATES.PASS, JSON.stringify(r.blocked_reasons));
  assert.equal(r.no_writes_performed, true);
});

test("runDryRun PASS for audit mode with registry:company-os alias even when sandbox required (read-only compatibility)", () => {
  const desc = "<p>hello</p>";
  const fields = {
    ...VALID_CONTRACT_FIELDS,
    mode: "audit",
    sandbox: "required",
    workspace: "registry:company-os",
  };
  const r = runDryRun({
    workItem: { id: "x", sequence_id: 284, name: "Sandbox alias guard read-only" },
    comments: [lockComment({ descHash: sha256(desc) })],
    contractFields: fields,
    description: desc,
    currentDescriptionHash: sha256(desc),
    runtimeAuthDeclared: true,
    capabilityRegistry: VALID_CAPABILITY_REGISTRY,
    fsExists: () => true,
    fsStat: () => ({ isDirectory: () => true }),
  });
  assert.equal(r.state, RUN_STATES.PASS, JSON.stringify(r.blocked_reasons));
  const sandboxPreflight = r.preflights.find((item) => item.name === "sandbox_workspace");
  assert.equal(sandboxPreflight.state, RUN_STATES.PASS);
  assert.equal(sandboxPreflight.evidence.applied, false);
});

test("runDryRun BLOCKED_DEPENDENCY for implement+sandbox-required with registry:company-os workspace alias", () => {
  const desc = "<p>hello</p>";
  const fields = {
    ...VALID_CONTRACT_FIELDS,
    sandbox: "required",
    workspace: "registry:company-os",
  };
  const r = runDryRun({
    workItem: { id: "x", sequence_id: 284, name: "Sandbox alias guard" },
    comments: [lockComment({ descHash: sha256(desc) })],
    contractFields: fields,
    description: desc,
    currentDescriptionHash: sha256(desc),
    runtimeAuthDeclared: true,
    capabilityRegistry: VALID_CAPABILITY_REGISTRY,
    fsExists: () => true,
    fsStat: () => ({ isDirectory: () => true }),
  });
  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.ok(r.blocked_reasons.includes(PREFLIGHT_REASONS.SANDBOX_WORKSPACE_ALIAS_UNSAFE));
  const sandboxPreflight = r.preflights.find((item) => item.name === "sandbox_workspace");
  assert.equal(sandboxPreflight.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.equal(sandboxPreflight.evidence.workspace, "registry:company-os");
});

test("runDryRun PASS for implement+sandbox-required with absolute approved sandbox worktree", () => {
  const desc = "<p>hello</p>";
  const sandboxPath = "${LOCAL_WORKSPACE}";
  const fields = {
    ...VALID_CONTRACT_FIELDS,
    sandbox: "required",
    workspace: sandboxPath,
  };
  const capabilityRegistryWithSandbox = {
    ...VALID_CAPABILITY_REGISTRY,
    profiles: VALID_CAPABILITY_REGISTRY.profiles.map((profile) => ({
      ...profile,
      workspaces: [...profile.workspaces, sandboxPath],
    })),
  };
  const r = runDryRun({
    workItem: { id: "x", sequence_id: 284, name: "Sandbox alias guard PASS" },
    comments: [lockComment({ descHash: sha256(desc) })],
    contractFields: fields,
    description: desc,
    currentDescriptionHash: sha256(desc),
    runtimeAuthDeclared: true,
    capabilityRegistry: capabilityRegistryWithSandbox,
    fsExists: () => true,
    fsStat: () => ({ isDirectory: () => true }),
  });
  assert.equal(r.state, RUN_STATES.PASS, JSON.stringify(r.blocked_reasons));
  const sandboxPreflight = r.preflights.find((item) => item.name === "sandbox_workspace");
  assert.equal(sandboxPreflight.state, RUN_STATES.PASS);
  assert.equal(sandboxPreflight.evidence.applied, true);
});

test("runDryRun BLOCKED_AUTH bubbles up from auth preflight", () => {
  const desc = "<p>hello</p>";
  const fields = { ...VALID_CONTRACT_FIELDS };
  delete fields.agent;
  const r = runDryRun({
    workItem: { id: "x", sequence_id: 99, name: "Test" },
    comments: [lockComment({ descHash: sha256(desc) })],
    contractFields: fields,
    description: desc,
    currentDescriptionHash: sha256(desc),
    runtimeAuthDeclared: true,
    capabilityRegistry: VALID_CAPABILITY_REGISTRY,
    fsExists: () => true,
    fsStat: () => ({ isDirectory: () => true }),
  });
  assert.equal(r.state, RUN_STATES.BLOCKED_AUTH);
  assert.ok(r.blocked_reasons.includes(PREFLIGHT_REASONS.AUTH_AGENT_MISSING));
});

test("runDryRun BLOCKED_AUTH bubbles up from browser auth preflight", () => {
  const desc = "<p>hello</p>";
  const fields = {
    ...VALID_CONTRACT_FIELDS,
    runtimepermissionmode: "browser-confirmed",
    outcomespec: "Browser UI installs Plane templates with screenshot evidence.",
  };
  const r = runDryRun({
    workItem: { id: "x", sequence_id: 244, name: "Browser UI Install" },
    comments: [lockComment({ descHash: sha256(desc) })],
    contractFields: fields,
    description: desc,
    currentDescriptionHash: sha256(desc),
    runtimeAuthDeclared: true,
    capabilityRegistry: VALID_CAPABILITY_REGISTRY,
    fsExists: () => true,
    fsStat: () => ({ isDirectory: () => true }),
  });
  assert.equal(r.state, RUN_STATES.BLOCKED_AUTH);
  assert.ok(r.blocked_reasons.includes(PREFLIGHT_REASONS.BROWSER_AUTH_MISSING));
});

test("runDryRun BLOCKED_DEPENDENCY when declared executable gate is not allowed for Claude", () => {
  const desc = "<p>hello</p>";
  const fields = {
    ...VALID_CONTRACT_FIELDS,
    gates: ["node scripts/plane/plane-template-registry.mjs validate"],
  };
  const r = runDryRun({
    workItem: { id: "x", sequence_id: 232, name: "Template Gate" },
    comments: [lockComment({ descHash: sha256(desc) })],
    contractFields: fields,
    description: desc,
    currentDescriptionHash: sha256(desc),
    runtimeAuthDeclared: true,
    capabilityRegistry: VALID_CAPABILITY_REGISTRY,
    fsExists: () => true,
    fsStat: () => ({ isDirectory: () => true }),
  });

  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.ok(r.blocked_reasons.includes(PREFLIGHT_REASONS.GATE_TOOL_NOT_ALLOWED));
  const gatePreflight = r.preflights.find((item) => item.name === "gate_tool_allowlist");
  assert.equal(gatePreflight.evidence.missing[0].command, "node scripts/plane/plane-template-registry.mjs validate");
});

test("runDryRun BLOCKED_DEPENDENCY when Raindrop adapter coverage is broken (blocks before worker spawn)", () => {
  const desc = "<p>hello</p>";
  const brokenRegistry = { ...SURFACE_BUILDER_REGISTRY };
  delete brokenRegistry["runtime-dispatcher-v1.2/worker-spawn"];
  const r = runDryRun({
    workItem: { id: "x", sequence_id: 280, name: "Raindrop preflight" },
    comments: [lockComment({ descHash: sha256(desc) })],
    contractFields: VALID_CONTRACT_FIELDS,
    description: desc,
    currentDescriptionHash: sha256(desc),
    runtimeAuthDeclared: true,
    capabilityRegistry: VALID_CAPABILITY_REGISTRY,
    fsExists: () => true,
    fsStat: () => ({ isDirectory: () => true }),
    instrumentedSurfaces: INSTRUMENTED_SURFACES,
    surfaceBuilderRegistry: brokenRegistry,
  });

  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.ok(r.blocked_reasons.includes(PREFLIGHT_REASONS.RAINDROP_BUILDER_COVERAGE_BROKEN));
  const raindropPreflight = r.preflights.find((item) => item.name === "raindrop_builder_coverage");
  assert.equal(raindropPreflight.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.ok(
    raindropPreflight.evidence.errors.some((e) => e.includes("runtime-dispatcher-v1.2/worker-spawn")),
  );
  assert.equal(r.no_writes_performed, true);
});

test("runDryRun PASS includes raindrop_builder_coverage preflight evidence with current registry", () => {
  const desc = "<p>hello</p>";
  const r = runDryRun({
    workItem: { id: "x", sequence_id: 280, name: "Raindrop preflight" },
    comments: [lockComment({ descHash: sha256(desc) })],
    contractFields: VALID_CONTRACT_FIELDS,
    description: desc,
    currentDescriptionHash: sha256(desc),
    runtimeAuthDeclared: true,
    capabilityRegistry: VALID_CAPABILITY_REGISTRY,
    fsExists: () => true,
    fsStat: () => ({ isDirectory: () => true }),
  });
  assert.equal(r.state, RUN_STATES.PASS, JSON.stringify(r.blocked_reasons));
  const raindropPreflight = r.preflights.find((item) => item.name === "raindrop_builder_coverage");
  assert.equal(raindropPreflight.state, RUN_STATES.PASS);
  assert.equal(raindropPreflight.evidence.surface_count, INSTRUMENTED_SURFACES.length);
});

// ---------- preflightRaindropHookShape (RS-09) ----------

test("preflightRaindropHookShape PASS for the live RAINDROP_HOOK_PRODUCER_REGISTRY", () => {
  const r = preflightRaindropHookShape();
  assert.equal(r.state, RUN_STATES.PASS);
  assert.equal(r.reason, null);
  assert.equal(r.evidence.producer_count, Object.keys(RAINDROP_HOOK_PRODUCER_REGISTRY).length);
  assert.ok(r.evidence.producers.includes("goal-runtime/worker-run"));
});

test("preflightRaindropHookShape BLOCKED when a required hook producer is missing", () => {
  const r = preflightRaindropHookShape({
    hookProducerRegistry: {},
    requiredHookProducers: ["goal-runtime/worker-run"],
  });
  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.equal(r.reason, PREFLIGHT_REASONS.RAINDROP_HOOK_SHAPE_BROKEN);
  assert.equal(r.reason, "runtime.raindrop-hook-shape-broken");
  assert.ok(
    r.evidence.errors.some((e) => e.includes("goal-runtime/worker-run") && e.includes("missing")),
    `evidence must name the missing producer: ${r.evidence.errors.join("; ")}`,
  );
});

test("preflightRaindropHookShape BLOCKED when a producer emits a structurally invalid hook", () => {
  const r = preflightRaindropHookShape({
    hookProducerRegistry: {
      "goal-runtime/worker-run": () => ({ surface: "goal-runtime/worker-run" }),
    },
    requiredHookProducers: ["goal-runtime/worker-run"],
  });
  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.equal(r.reason, PREFLIGHT_REASONS.RAINDROP_HOOK_SHAPE_BROKEN);
  assert.ok(r.evidence.errors.some((e) => e.includes("adapter_version")));
  assert.ok(r.evidence.errors.some((e) => e.includes("instrumentation")));
});

test("preflightRaindropHookShape BLOCKED when a producer emits a hook with a forbidden private field", () => {
  const r = preflightRaindropHookShape({
    hookProducerRegistry: {
      "goal-runtime/worker-run": () => ({
        surface: "goal-runtime/worker-run",
        adapter_version: "goal-runtime-adapter/v0",
        work_item_ref: "[WORK_ITEM_ID]",
        agent: "claude",
        mode: "implement",
        instrumentation: "wired",
        raw_prompt: "leaked",
      }),
    },
    requiredHookProducers: ["goal-runtime/worker-run"],
  });
  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.equal(r.reason, PREFLIGHT_REASONS.RAINDROP_HOOK_SHAPE_BROKEN);
  assert.ok(r.evidence.errors.some((e) => e.includes("raw_prompt")));
});

test("preflightRaindropHookShape does not promote Scheduler/Hermes/AionUI/manual/external surfaces", () => {
  const r = preflightRaindropHookShape();
  assert.equal(r.state, RUN_STATES.PASS);
  for (const gated of [
    "scheduler/worker-run",
    "hermes-assistant/llm-calls",
    "aionui-hermes/command-layer",
    "codex-controller/llm-spawn",
    "manual-claude-desktop-sessions",
    "arbitrary-cli-sessions-outside-runtime",
    "gemini-cli-workers-outside-company-os-runtime",
  ]) {
    assert.equal(
      r.evidence.producers.includes(gated),
      false,
      `${gated} must not appear in the hook producer registry`,
    );
  }
});

test("preflightRaindropHookShape REQUIRED_HOOK_PRODUCERS export remains the doctrine source", () => {
  assert.ok(Array.isArray(REQUIRED_HOOK_PRODUCERS));
  assert.ok(REQUIRED_HOOK_PRODUCERS.includes("goal-runtime/worker-run"));
});

test("runDryRun BLOCKED_DEPENDENCY when Raindrop hook shape is broken (blocks before worker spawn)", () => {
  const desc = "<p>hello</p>";
  const brokenHookRegistry = {
    "goal-runtime/worker-run": () => ({
      surface: "goal-runtime/worker-run",
      adapter_version: "goal-runtime-adapter/v0",
      work_item_ref: "[WORK_ITEM_ID]",
      agent: "claude",
      mode: "implement",
      instrumentation: "wired",
      api_key: "sk-leak",
    }),
  };
  const r = runDryRun({
    workItem: { id: "x", sequence_id: 283, name: "Raindrop hook shape preflight" },
    comments: [lockComment({ descHash: sha256(desc) })],
    contractFields: VALID_CONTRACT_FIELDS,
    description: desc,
    currentDescriptionHash: sha256(desc),
    runtimeAuthDeclared: true,
    capabilityRegistry: VALID_CAPABILITY_REGISTRY,
    fsExists: () => true,
    fsStat: () => ({ isDirectory: () => true }),
    hookProducerRegistry: brokenHookRegistry,
    requiredHookProducers: ["goal-runtime/worker-run"],
  });

  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.ok(r.blocked_reasons.includes(PREFLIGHT_REASONS.RAINDROP_HOOK_SHAPE_BROKEN));
  const hookPreflight = r.preflights.find((item) => item.name === "raindrop_hook_shape");
  assert.equal(hookPreflight.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.ok(hookPreflight.evidence.errors.some((e) => e.includes("api_key")));
  assert.equal(r.no_writes_performed, true);
});

test("runDryRun PASS includes raindrop_hook_shape preflight evidence with current registry", () => {
  const desc = "<p>hello</p>";
  const r = runDryRun({
    workItem: { id: "x", sequence_id: 283, name: "Raindrop hook shape preflight" },
    comments: [lockComment({ descHash: sha256(desc) })],
    contractFields: VALID_CONTRACT_FIELDS,
    description: desc,
    currentDescriptionHash: sha256(desc),
    runtimeAuthDeclared: true,
    capabilityRegistry: VALID_CAPABILITY_REGISTRY,
    fsExists: () => true,
    fsStat: () => ({ isDirectory: () => true }),
  });
  assert.equal(r.state, RUN_STATES.PASS, JSON.stringify(r.blocked_reasons));
  const hookPreflight = r.preflights.find((item) => item.name === "raindrop_hook_shape");
  assert.equal(hookPreflight.state, RUN_STATES.PASS);
  assert.equal(hookPreflight.evidence.producer_count, Object.keys(RAINDROP_HOOK_PRODUCER_REGISTRY).length);
});

test("runDryRun still surfaces gate allowlist failure when capability profile is missing", () => {
  const desc = "<p>hello</p>";
  const fields = {
    ...VALID_CONTRACT_FIELDS,
    capabilityprofile: "missing-profile",
    gates: ["python -m pytest tests/"],
  };
  const r = runDryRun({
    workItem: { id: "x", sequence_id: 233, name: "Missing Profile" },
    comments: [lockComment({ descHash: sha256(desc) })],
    contractFields: fields,
    description: desc,
    currentDescriptionHash: sha256(desc),
    runtimeAuthDeclared: true,
    capabilityRegistry: VALID_CAPABILITY_REGISTRY,
    fsExists: () => true,
    fsStat: () => ({ isDirectory: () => true }),
  });

  assert.equal(r.state, RUN_STATES.BLOCKED_DEPENDENCY);
  assert.ok(r.blocked_reasons.includes(PREFLIGHT_REASONS.CAPABILITY_PROFILE_NOT_FOUND));
  assert.ok(r.blocked_reasons.includes(PREFLIGHT_REASONS.GATE_TOOL_NOT_ALLOWED));
  const gatePreflight = r.preflights.find((item) => item.name === "gate_tool_allowlist");
  assert.equal(gatePreflight.evidence.missing[0].command, "python -m pytest tests/");
});

// ---------- runtime process helpers ----------

test("parseGitStatusChangedFiles includes modified, untracked, and renamed paths", () => {
  const workspace = "${LOCAL_WORKSPACE}";
  const parsed = parseGitStatusChangedFiles([
    " M docs/a.md",
    "?? scripts/new.mjs",
    "R  old.md -> docs/renamed.md",
    "A  \"docs/space name.md\"",
  ].join("\n"), workspace);
  assert.deepEqual(parsed, [
    `${workspace}/docs/a.md`,
    `${workspace}/scripts/new.mjs`,
    `${workspace}/docs/renamed.md`,
    `${workspace}/docs/space name.md`,
  ]);
});

test("subtractBaselineChangedFiles keeps only worker-run deltas", () => {
  const changed = [
    "/repo/AGENTS.md",
    "/repo/reports/runtime-auth/old-hard-cron.json",
    "/repo/scripts/orchestration/new-worker-change.mjs",
  ];
  const baseline = [
    "/repo/AGENTS.md",
    "/repo/reports/runtime-auth/old-hard-cron.json",
  ];

  assert.deepEqual(subtractBaselineChangedFiles(changed, baseline), [
    "/repo/scripts/orchestration/new-worker-change.mjs",
  ]);
});

test("runProcess writes a durable stream log", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-stream-"));
  const streamPath = path.join(tmp, "run.stream.jsonl");
  try {
    const result = await runProcess(process.execPath, ["-e", "console.log('hello-stream')"], {
      cwd: tmp,
      timeoutMs: 5_000,
      streamPath,
      heartbeatMs: 1_000,
      scopeGuardMode: "off",
    });
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /hello-stream/);
    const rows = fs.readFileSync(streamPath, "utf8").trim().split("\n").map((line) => JSON.parse(line));
    assert.ok(rows.some((row) => row.type === "worker.spawned"));
    assert.ok(rows.some((row) => row.type === "stream" && row.stream === "stdout" && row.text.includes("hello-stream")));
    assert.ok(rows.some((row) => row.type === "worker.exit" && row.exit_code === 0));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("runProcess can spawn with a selected runtime auth env", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-env-"));
  try {
    const result = await runProcess(process.execPath, ["-e", "console.log(process.env.COMPANY_OS_SELECTED_AUTH_LANE || 'missing')"], {
      cwd: tmp,
      env: { ...process.env, COMPANY_OS_SELECTED_AUTH_LANE: "local-claude-config" },
      timeoutMs: 5_000,
      heartbeatMs: 1_000,
      scopeGuardMode: "off",
    });
    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /local-claude-config/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("runProcess terminates on local kill switch and records intervention", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-kill-"));
  const streamPath = path.join(tmp, "run.stream.jsonl");
  const killPath = path.join(tmp, "STOP");
  fs.writeFileSync(killPath, "stop\n", "utf8");
  try {
    const result = await runProcess(process.execPath, ["-e", "setTimeout(() => {}, 10000)"], {
      cwd: tmp,
      timeoutMs: 10_000,
      streamPath,
      heartbeatMs: 1_000,
      scopeGuardMode: "off",
      killSwitchPaths: [killPath],
    });
    assert.equal(result.killedReason, "kill-switch-local");
    assert.ok(result.heartbeatCount >= 1);
    assert.ok(result.interventions.some((row) => row.reason === "kill-switch-local" && row.path === killPath));
    const rows = fs.readFileSync(streamPath, "utf8").trim().split("\n").map((line) => JSON.parse(line));
    assert.ok(rows.some((row) => row.type === "worker.heartbeat"));
    assert.ok(rows.some((row) => row.type === "worker.intervention" && row.reason === "kill-switch-local"));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("runProcess terminates on streamed out-of-scope tool read", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-read-guard-"));
  const streamPath = path.join(tmp, "run.stream.jsonl");
  const toolUse = JSON.stringify({
    type: "stream_event",
    event: {
      type: "content_block_start",
      content_block: {
        type: "tool_use",
        name: "Bash",
        input: { command: "grep -rlI 'BEGIN PRIVATE KEY' ~/Downloads" },
      },
    },
  });
  const childScript = [
    `console.log(${JSON.stringify(toolUse)});`,
    "setTimeout(() => {}, 10000);",
  ].join("\n");
  try {
    const result = await runProcess(process.execPath, ["-e", childScript], {
      cwd: tmp,
      timeoutMs: 10_000,
      streamPath,
      heartbeatMs: 1_000,
      scopeGuardMode: "kill",
      allowedReadPaths: [tmp],
    });

    assert.equal(result.killedReason, "scope-read-drift");
    assert.ok(result.interventions.some((row) =>
      row.reason === "scope-read-drift" &&
      row.violations?.some((violation) => violation.reason === "runtime.bash-read-path-out-of-scope"),
    ));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("runProcess does not kill a worker for unattributed external dirty files", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-external-dirty-"));
  const streamPath = path.join(tmp, "run.stream.jsonl");
  fs.mkdirSync(path.join(tmp, "allowed"), { recursive: true });
  fs.writeFileSync(path.join(tmp, "tracked.md"), "base\n", "utf8");
  execFileSync("git", ["init"], { cwd: tmp, stdio: "ignore" });
  execFileSync("git", ["add", "tracked.md"], { cwd: tmp, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "base"], {
    cwd: tmp,
    stdio: "ignore",
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Company OS Test",
      GIT_AUTHOR_EMAIL: "company-os-test@example.invalid",
      GIT_COMMITTER_NAME: "Company OS Test",
      GIT_COMMITTER_EMAIL: "company-os-test@example.invalid",
    },
  });
  try {
    const running = runProcess(process.execPath, ["-e", "setTimeout(() => {}, 2600)"], {
      cwd: tmp,
      timeoutMs: 8_000,
      streamPath,
      heartbeatMs: 1_000,
      scopeGuardMode: "kill",
      allowedWritePaths: [path.join(tmp, "allowed")],
      allowedReadPaths: [tmp],
    });
    setTimeout(() => {
      fs.writeFileSync(path.join(tmp, "external.md"), "external parallel change\n", "utf8");
    }, 250);
    const result = await running;

    assert.equal(result.killedReason, "");
    assert.equal(result.exitCode, 0);
    const rows = fs.readFileSync(streamPath, "utf8").trim().split("\n").map((line) => JSON.parse(line));
    assert.ok(rows.some((row) =>
      row.type === "worker.heartbeat" &&
      row.external_changed_files?.some((file) => file.endsWith("/external.md")),
    ));
    assert.equal(rows.some((row) => row.type === "worker.intervention" && row.reason === "scope-drift"), false);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("runProcess terminates on streamed out-of-scope worker write", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-write-guard-"));
  const streamPath = path.join(tmp, "run.stream.jsonl");
  fs.mkdirSync(path.join(tmp, "allowed"), { recursive: true });
  const toolUse = JSON.stringify({
    type: "stream_event",
    event: {
      type: "content_block_start",
      content_block: {
        type: "tool_use",
        name: "Write",
        input: { file_path: path.join(tmp, "outside.md") },
      },
    },
  });
  const childScript = [
    `console.log(${JSON.stringify(toolUse)});`,
    "setTimeout(() => {}, 10000);",
  ].join("\n");
  try {
    const result = await runProcess(process.execPath, ["-e", childScript], {
      cwd: tmp,
      timeoutMs: 10_000,
      streamPath,
      heartbeatMs: 1_000,
      scopeGuardMode: "kill",
      allowedReadPaths: [tmp],
      allowedWritePaths: [path.join(tmp, "allowed")],
    });

    assert.equal(result.killedReason, "scope-write-drift");
    assert.ok(result.interventions.some((row) =>
      row.reason === "scope-write-drift" &&
      row.violations?.some((violation) => violation.reason === "runtime.tool-write-path-out-of-scope"),
    ));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("runProcess terminates the spawned process group on intervention", async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-group-kill-"));
  const streamPath = path.join(tmp, "run.stream.jsonl");
  const killPath = path.join(tmp, "STOP");
  const markerPath = path.join(tmp, "orphan-marker.txt");
  fs.writeFileSync(killPath, "stop\n", "utf8");
  const childScript = [
    "const { spawn } = require('node:child_process');",
    `const marker = ${JSON.stringify(markerPath)};`,
    "spawn(process.execPath, ['-e', `setTimeout(() => require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'orphan'), 2500); setTimeout(() => {}, 10000);`], { stdio: 'ignore' });",
    "setTimeout(() => {}, 10000);",
  ].join("\n");
  try {
    const result = await runProcess(process.execPath, ["-e", childScript], {
      cwd: tmp,
      timeoutMs: 10_000,
      streamPath,
      heartbeatMs: 1_000,
      scopeGuardMode: "off",
      killSwitchPaths: [killPath],
    });
    assert.equal(result.killedReason, "kill-switch-local");
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    assert.equal(fs.existsSync(markerPath), false);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("resolveRuntimeOwnedWritePaths normalizes report, stream and metrics paths", () => {
  const paths = resolveRuntimeOwnedWritePaths({
    workspacePath: "/repo",
    reportPath: "/repo/reports/runs/report.md",
    streamPath: "/repo/reports/runs/report.run.stream.jsonl",
    metricsPath: "metrics/agent-events.jsonl",
  });
  assert.deepEqual(paths, [
    "/repo/reports/runs/report.md",
    "/repo/reports/runs/report.run.stream.jsonl",
    "/repo/metrics/agent-events.jsonl",
  ]);
});

test("writeRuntimeRaindropSummaryArtifacts writes per-run summary under workspace observability reports", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-raindrop-"));
  try {
    const written = writeRuntimeRaindropSummaryArtifacts({
      workspacePath: tmp,
      runId: "run-270",
      workItem: { sequence_id: 270, _project_identifier: "GROW" },
      contractFields: { agent: "claude", mode: "implement", runtime_model_alias: "sonnet" },
      startedAt: "2026-05-19T10:00:00.000Z",
      endedAt: "2026-05-19T10:01:00.000Z",
      state: RUN_STATES.PASS,
      streamHealth: { summary: { stream: 12, redacted_secret_markers: 0 }, reason_codes: [] },
      streamPath: path.join(tmp, "reports", "runs", "run-270.stream.jsonl"),
      reportPath: path.join(tmp, "reports", "runs", "run-270.md"),
    });
    assert.equal(written.summary["raindrop.llm_call_summary"].plane_issue, "GROW-270");
    assert.equal(written.summary["raindrop.llm_call_summary"].trace_artifact, "reports/runs/run-270.stream.jsonl");
    assert.equal(JSON.parse(fs.readFileSync(written.jsonPath, "utf8"))["raindrop.llm_call_summary"].run_id, "run-270");
    assert.match(fs.readFileSync(written.mdPath, "utf8"), /Raindrop LLM Call Summary/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("evaluatePromptResultEvaluationEligibility requires runtime, CAO and Codex Controller success", () => {
  assert.deepEqual(
    evaluatePromptResultEvaluationEligibility({
      state: RUN_STATES.PASS,
      caoResult: { exitCode: 0 },
      codexControllerResult: { exitCode: 0 },
    }),
    { eligible: true, skip_reason: null },
  );
  assert.deepEqual(
    evaluatePromptResultEvaluationEligibility({
      state: RUN_STATES.RUNTIME_ERROR,
      caoResult: { skipped: true, reason: "runtime-not-pass" },
      codexControllerResult: { skipped: true, reason: "runtime-not-pass" },
    }),
    { eligible: false, skip_reason: "runtime-not-pass" },
  );
  assert.deepEqual(
    evaluatePromptResultEvaluationEligibility({
      state: RUN_STATES.PASS,
      caoResult: { exitCode: 2 },
      codexControllerResult: { exitCode: 0 },
    }),
    { eligible: false, skip_reason: "cao-exit-2" },
  );
});

test("promptResultEvaluationBlocksRuntime only blocks artifact generation failures", () => {
  assert.equal(
    promptResultEvaluationBlocksRuntime({
      run: { promptResultEvaluation: { skip_reason: "prompt-result-eval-error:privacy violation" } },
    }),
    true,
  );
  assert.equal(
    promptResultEvaluationBlocksRuntime({
      run: { prompt_result_evaluation: { skip_reason: "runtime-not-pass" } },
    }),
    false,
  );
  assert.equal(promptResultEvaluationBlocksRuntime({ run: {} }), false);
});

test("writeRuntimePromptResultEvaluationArtifacts writes privacy-safe validated artifacts", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "runtime-prompt-result-"));
  try {
    const summary = writeRuntimeRaindropSummaryArtifacts({
      workspacePath: tmp,
      runId: "run-285",
      workItem: { sequence_id: 285 },
      contractFields: { agent: "claude", mode: "implement", runtimemodel: "opus" },
      startedAt: "2026-05-20T07:00:00.000Z",
      endedAt: "2026-05-20T07:01:00.000Z",
      state: RUN_STATES.PASS,
      streamHealth: { summary: { stream: 12, redacted_secret_markers: 0 }, reason_codes: [] },
      streamPath: path.join(tmp, "reports", "runs", "run-285.stream.jsonl"),
      reportPath: path.join(tmp, "reports", "runs", "run-285.md"),
    });
    const written = writeRuntimePromptResultEvaluationArtifacts({
      workspacePath: tmp,
      runId: "run-285",
      workItem: { sequence_id: 285 },
      contractFields: VALID_CONTRACT_FIELDS,
      description: [
        "role: role:cto",
        "source_of_truth:",
        "  - docs/operations/raindrop-prompt-result-quality-loop.md",
        "acceptance_criteria:",
        "  - Runtime Dispatcher emits prompt-result artifacts.",
        "gates:",
        "  - node --test scripts/orchestration/runtime-dispatcher-v1.test.mjs",
        "human_gate: HG-2",
        "reporting: Plane worker.reported with artifacts.",
      ].join("\n"),
      endedAt: "2026-05-20T07:01:00.000Z",
      callSummary: summary.summary,
      workerReportText: [
        "state: PASS",
        "Gate Results:",
        "- PASS 174/174",
        "reflection:",
        "  summary: prompt-result integration was bounded.",
        "learning_proposals:",
        "  - target: max-turns",
        "    proposal: raise turns for runtime integrations.",
      ].join("\n"),
      caoEvidenceText: "controller.verdict:\n  verdict: PASS",
      controllerEvidenceText: "controller.decision:\n  decision_mode: AUTO-GO",
      changedFiles: ["scripts/orchestration/runtime-dispatcher-v1.mjs"],
    });
    const loaded = JSON.parse(fs.readFileSync(written.jsonPath, "utf8"));
    assert.equal(validatePromptResultEvaluation(loaded).ok, true);
    const root = loaded["raindrop.prompt_result_evaluation"];
    assert.equal(root.raw_prompt_captured, false);
    assert.equal(root.raw_output_captured, false);
    assert.equal(root.score.verdict, "PASS");
    assert.match(fs.readFileSync(written.mdPath, "utf8"), /Raindrop Prompt-Result Evaluation/);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("resolveRuntimeOwnedReadPaths allows worker report and stream directories", () => {
  const paths = resolveRuntimeOwnedReadPaths({
    reportPath: "/repo/reports/releases/0.6.0-beta/worker.md",
    streamPath: "/repo/reports/releases/0.6.0-beta/worker.run.stream.jsonl",
  });
  assert.deepEqual(paths, ["/repo/reports/releases/0.6.0-beta"]);
});

test("finalizeRuntimeState keeps PASS when stream and write scope are clean", () => {
  const result = finalizeRuntimeState({
    initialState: RUN_STATES.PASS,
    initialReason: "exit-zero",
    streamHealth: { ok: true, reason_codes: [] },
    outOfScopeFiles: [],
  });
  assert.equal(result.state, RUN_STATES.PASS);
  assert.equal(result.reason, "exit-zero");
});

test("finalizeRuntimeState downgrades PASS when final diff has out-of-scope files", () => {
  const result = finalizeRuntimeState({
    initialState: RUN_STATES.PASS,
    initialReason: "exit-zero",
    streamHealth: { ok: true, reason_codes: [] },
    outOfScopeFiles: ["/repo/.claude/logs/hook.log"],
  });
  assert.equal(result.state, RUN_STATES.NEEDS_HUMAN);
  assert.equal(result.reason, "scope-drift:1");
});
