import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTRACT_REVIEW_GATE_REASONS,
  CONTRACT_REVIEW_REASONS,
  CONTRACT_REVIEW_TITLE,
  CONTRACT_REVIEW_VERDICTS,
  RUNTIME_READY_REASONS,
  RUNTIME_READY_VERDICTS,
  buildContractReviewYaml,
  buildRuntimeReadyYaml,
  evaluateContractForDispatch,
  evaluateRuntimeExecutability,
  findContractReviewGate,
} from "./contract-controller.mjs";

const BASE_CONTRACT = `\`\`\`yaml
role: role:cto
parent_seat: role:cto
agent: claude
mode: implement
workspace: companyos
dispatch: ready
source_of_truth:
  - docs/orchestration/spec-to-worker-pipeline.md
scope:
  - include scripts/orchestration/contract-controller.mjs
  - exclude production systems
sandbox: required
allowedwritepaths:
  - scripts/orchestration/contract-controller.mjs
capabilityprofile: claude-clevel-worker/cto/runtime
outcomespec: Contract controller can pass, patch, split, spec-block, or founder-block work items.
outcomerubric: Controller can grade pass/fail from reason codes and gates.
acceptance_criteria:
  - contract-controller emits CONTRACT_PASS for complete contracts and blocks incomplete contracts.
gates:
  - node --test scripts/orchestration/contract-controller.test.mjs
human_gate: HG-2.5
reporting: Plane worker.reported with changed files, commands, gate results, and subagents: [] when no subagents ran.
blockedactions: never print secrets; do not deploy, publish, write Linear, mark Done, or touch production.
runtimeauth: claude max local auth present
maxruntime: 900s
maxspend: EUR 0
killswitch: runtime/killswitch/COMPA-test.stop
heartbeat: 60s
\`\`\``;

const RUNTIME_READY_CONTRACT = `\`\`\`yaml
role: role:cto
parent_seat: role:cto
agent: claude
mode: implement
workspace: registry:company-os
dispatch: ready
depends_on:
source_of_truth:
  - [LOCAL_WORKSPACE]
scope:
  - include scripts/orchestration/contract-controller.mjs
  - exclude production systems
sandbox: required
allowedreadpaths:
  - [LOCAL_WORKSPACE]
allowedwritepaths:
  - [LOCAL_WORKSPACE]
capabilityprofile: claude-clevel-worker/cto/runtime
outcomespec: Runtime executable contract can be preflighted before lock.
outcomerubric: Unknown capabilities, pseudo dependencies, missing artifacts, read-scope drift, and Claude tool-result sources reject.
acceptance_criteria:
  - Runtime-ready gate emits PASS for executable contracts and REJECT for runtime-invalid contracts.
gates:
  - node --test [LOCAL_WORKSPACE]
human_gate: HG-2.5
reporting:
  - [LOCAL_WORKSPACE]
blockedactions: never print secrets; do not deploy, publish, write Linear, mark Done, or touch production.
runtimeauth: claude max local auth present
runtimepermissionmode: acceptEdits
maxruntime: 900s
maxspend: EUR 0
killswitch: runtime/killswitch/COMPA-test.stop
heartbeat: 60s
\`\`\``;

const RUNTIME_CAPABILITY_REGISTRY = {
  profiles: [
    {
      id: "claude-clevel-worker/cto/runtime",
      role: "role:cto",
      agents: ["claude"],
      modes: ["implement", "audit"],
      workspaces: ["company-os", "registry:company-os", "[LOCAL_WORKSPACE]"],
    },
  ],
};

function item(description = BASE_CONTRACT, name = "Stage 0.5 Contract Controller") {
  return {
    id: "item-1",
    sequence_id: 152,
    name,
    description_html: `<pre><code>${description}</code></pre>`,
  };
}

test("complete implementation contract passes", () => {
  const review = evaluateContractForDispatch({
    item: item(),
    labelNames: ["role:cto"],
  });
  assert.equal(review.verdict, CONTRACT_REVIEW_VERDICTS.PASS);
  assert.deepEqual(review.reason_codes, []);
  assert.equal(review.ok, true);
});

test("formal validator failure becomes patch required", () => {
  const review = evaluateContractForDispatch({
    item: item("role: role:cto\nagent: claude"),
    labelNames: ["role:cto"],
  });
  assert.equal(review.verdict, CONTRACT_REVIEW_VERDICTS.PATCH_REQUIRED);
  assert.ok(review.reason_codes.includes(CONTRACT_REVIEW_REASONS.VALIDATOR_FAIL));
});

test("ready runtime workers require runtime fields", () => {
  const weak = BASE_CONTRACT
    .replace("runtimeauth: claude max local auth present\n", "")
    .replace("maxruntime: 900s\n", "")
    .replace("maxspend: EUR 0\n", "")
    .replace("killswitch: runtime/killswitch/COMPA-test.stop\n", "")
    .replace("heartbeat: 60s\n", "");
  const review = evaluateContractForDispatch({ item: item(weak), labelNames: ["role:cto"] });
  assert.equal(review.verdict, CONTRACT_REVIEW_VERDICTS.PATCH_REQUIRED);
  assert.ok(review.reason_codes.includes(CONTRACT_REVIEW_REASONS.RUNTIME_FIELDS_MISSING));
});

test("runtime capability profile role must match contract role", () => {
  const mismatch = BASE_CONTRACT.replace(
    "capabilityprofile: claude-clevel-worker/cto/runtime",
    "capabilityprofile: claude-clevel-worker/coo/runtime",
  );
  const review = evaluateContractForDispatch({ item: item(mismatch), labelNames: ["role:cto"] });
  assert.equal(review.verdict, CONTRACT_REVIEW_VERDICTS.PATCH_REQUIRED);
  assert.ok(review.reason_codes.includes(CONTRACT_REVIEW_REASONS.CAPABILITY_PROFILE_ROLE_MISMATCH));
});

test("implement runtime contract cannot force RuntimePermissionMode plan", () => {
  const planMode = BASE_CONTRACT.replace(
    "runtimeauth: claude max local auth present",
    "runtimepermissionmode: plan\nruntimeauth: claude max local auth present",
  );
  const review = evaluateContractForDispatch({ item: item(planMode), labelNames: ["role:cto"] });
  assert.equal(review.verdict, CONTRACT_REVIEW_VERDICTS.PATCH_REQUIRED);
  assert.ok(review.reason_codes.includes(CONTRACT_REVIEW_REASONS.RUNTIME_PERMISSION_MODE_MISMATCH));
});

test("browser UI runtime contract must declare RuntimeBrowserAuth", () => {
  const browserUi = BASE_CONTRACT
    .replace(
      "outcomespec: Contract controller can pass, patch, split, spec-block, or founder-block work items.",
      "outcomespec: Browser UI installs Plane templates with screenshot evidence.",
    )
    .replace(
      "runtimeauth: claude max local auth present",
      "runtimepermissionmode: browser-confirmed\nruntimeauth: claude max local auth present",
    );
  const review = evaluateContractForDispatch({ item: item(browserUi), labelNames: ["role:cto"] });
  assert.equal(review.verdict, CONTRACT_REVIEW_VERDICTS.PATCH_REQUIRED);
  assert.ok(review.reason_codes.includes(CONTRACT_REVIEW_REASONS.RUNTIME_BROWSER_AUTH_MISSING));
});

test("browser UI runtime contract passes when RuntimeBrowserAuth is declared", () => {
  const browserUi = BASE_CONTRACT
    .replace(
      "outcomespec: Contract controller can pass, patch, split, spec-block, or founder-block work items.",
      "outcomespec: Browser UI installs Plane templates with screenshot evidence.",
    )
    .replace(
      "runtimeauth: claude max local auth present",
      "runtimepermissionmode: browser-confirmed\nruntimebrowserauth: browser-connector\nruntimeauth: claude max local auth present",
    );
  const review = evaluateContractForDispatch({ item: item(browserUi), labelNames: ["role:cto"] });
  assert.equal(review.verdict, CONTRACT_REVIEW_VERDICTS.PASS);
});

test("major product work without spec or rubric is spec-required", () => {
  const major = BASE_CONTRACT
    .replace(/source_of_truth:[\s\S]*?scope:/, "source_of_truth:\n  - docs/system-index.md\nscope:")
    .replace("outcomespec: Contract controller can pass, patch, split, spec-block, or founder-block work items.\n", "")
    .replace("outcomerubric: Controller can grade pass/fail from reason codes and gates.\n", "");
  const review = evaluateContractForDispatch({
    item: item(major, "Build new dashboard MVP"),
    labelNames: ["role:cto"],
  });
  assert.equal(review.verdict, CONTRACT_REVIEW_VERDICTS.SPEC_REQUIRED);
  assert.ok(review.reason_codes.includes(CONTRACT_REVIEW_REASONS.SPEC_REQUIRED));
});

test("broad whole-repo work is split-required", () => {
  const broad = BASE_CONTRACT.replace(
    "include scripts/orchestration/contract-controller.mjs",
    "rewrite the entire codebase",
  );
  const review = evaluateContractForDispatch({ item: item(broad), labelNames: ["role:cto"] });
  assert.equal(review.verdict, CONTRACT_REVIEW_VERDICTS.SPLIT_REQUIRED);
  assert.ok(review.reason_codes.includes(CONTRACT_REVIEW_REASONS.SCOPE_TOO_BROAD));
});

test("HG-3 schema work is CEO-gated before dispatch", () => {
  const risky = BASE_CONTRACT
    .replace("human_gate: HG-2.5", "human_gate: HG-3")
    .replace("exclude production systems", "include Supabase schema/RLS/auth migration");
  const review = evaluateContractForDispatch({ item: item(risky), labelNames: ["role:cto"] });
  assert.equal(review.verdict, CONTRACT_REVIEW_VERDICTS.CEO_GATE_REQUIRED);
  assert.ok(review.reason_codes.includes(CONTRACT_REVIEW_REASONS.HIGH_RISK_CEO_GATE));
});

test("explicit human_gate.released satisfies HG-3 CEO gate", () => {
  const risky = BASE_CONTRACT
    .replace("human_gate: HG-2.5", "human_gate: HG-3")
    .replace("exclude production systems", "include Supabase schema/RLS/auth migration");
  const review = evaluateContractForDispatch({
    item: item(risky),
    labelNames: ["role:cto"],
    humanGateRelease: {
      ok: true,
      source: "human_gate.released",
      comment_id: "founder-release-1",
      created_at: "2026-05-17T19:20:00.000Z",
    },
  });
  assert.equal(review.verdict, CONTRACT_REVIEW_VERDICTS.PASS);
  assert.equal(review.evidence.human_gate_release.comment_id, "founder-release-1");
  const yaml = buildContractReviewYaml({ review, item: item(risky) });
  assert.match(yaml, /human_gate_release: founder-release-1/);
});

test("non-empty subagent roster requires reporting and session policy", () => {
  const withSubagents = BASE_CONTRACT.replace(
    "heartbeat: 60s",
    "subagentroster: explorer, reviewer\nheartbeat: 60s",
  );
  const review = evaluateContractForDispatch({ item: item(withSubagents), labelNames: ["role:cto"] });
  assert.equal(review.verdict, CONTRACT_REVIEW_VERDICTS.PATCH_REQUIRED);
  assert.ok(review.reason_codes.includes(CONTRACT_REVIEW_REASONS.SUBAGENT_POLICY_MISSING));
});

test("runtime executability PASS for registered, path-covered runtime contract", () => {
  const executability = evaluateRuntimeExecutability({
    item: item(RUNTIME_READY_CONTRACT),
    labelNames: ["role:cto"],
    capabilityRegistry: RUNTIME_CAPABILITY_REGISTRY,
    now: new Date("2026-05-20T12:00:00.000Z"),
  });
  assert.equal(executability.verdict, RUNTIME_READY_VERDICTS.PASS);
  assert.deepEqual(executability.reason_codes, []);

  const yaml = buildRuntimeReadyYaml({ executability, item: item(RUNTIME_READY_CONTRACT), reviewer: "test" });
  assert.match(yaml, /controller\.runtime-ready:/);
  assert.match(yaml, /verdict: RUNTIME_READY_PASS/);
});

test("runtime executability treats relative gate paths as repo-local, not absolute drift", () => {
  const relativeGate = RUNTIME_READY_CONTRACT.replace(
    "  - node --test [LOCAL_WORKSPACE]",
    "  - node --test scripts/orchestration/contract-controller.test.mjs",
  );
  const executability = evaluateRuntimeExecutability({
    item: item(relativeGate),
    labelNames: ["role:cto"],
    capabilityRegistry: RUNTIME_CAPABILITY_REGISTRY,
  });
  assert.equal(executability.verdict, RUNTIME_READY_VERDICTS.PASS);
});

test("runtime executability rejects unregistered capability profiles", () => {
  const unknownProfile = RUNTIME_READY_CONTRACT.replace(
    "capabilityprofile: claude-clevel-worker/cto/runtime",
    "capabilityprofile: claude-clevel-worker/cto/bespoke-unregistered",
  );
  const executability = evaluateRuntimeExecutability({
    item: item(unknownProfile),
    labelNames: ["role:cto"],
    capabilityRegistry: RUNTIME_CAPABILITY_REGISTRY,
  });
  assert.equal(executability.verdict, RUNTIME_READY_VERDICTS.REJECT);
  assert.ok(executability.reason_codes.includes(RUNTIME_READY_REASONS.CAPABILITY_PROFILE_UNREGISTERED));
});

test("runtime executability rejects free-text pseudo dependencies", () => {
  const pseudoDependency = RUNTIME_READY_CONTRACT.replace("depends_on:", "depends_on:\n  - parent-workspace-stewardship");
  const executability = evaluateRuntimeExecutability({
    item: item(pseudoDependency),
    labelNames: ["role:cto"],
    capabilityRegistry: RUNTIME_CAPABILITY_REGISTRY,
  });
  assert.equal(executability.verdict, RUNTIME_READY_VERDICTS.REJECT);
  assert.ok(executability.reason_codes.includes(RUNTIME_READY_REASONS.DEPENDS_ON_UNPARSEABLE));
});

test("runtime executability rejects missing absolute report artifacts", () => {
  const noReportArtifact = RUNTIME_READY_CONTRACT.replace(
    /reporting:\n  - \/Users\/mathiasheinke\/Developer\/Company\.OS\/reports\/runs\/runtime-ready-test\.md\n/,
    "reporting: Plane worker.reported only\n",
  );
  const executability = evaluateRuntimeExecutability({
    item: item(noReportArtifact),
    labelNames: ["role:cto"],
    capabilityRegistry: RUNTIME_CAPABILITY_REGISTRY,
  });
  assert.equal(executability.verdict, RUNTIME_READY_VERDICTS.REJECT);
  assert.ok(executability.reason_codes.includes(RUNTIME_READY_REASONS.OUTCOME_ARTIFACT_NOT_ABSOLUTE));
});

test("runtime executability rejects Claude plan mode when a report artifact must be materialized", () => {
  const planMode = RUNTIME_READY_CONTRACT.replace("runtimepermissionmode: acceptEdits", "runtimepermissionmode: plan");
  const executability = evaluateRuntimeExecutability({
    item: item(planMode),
    labelNames: ["role:cto"],
    capabilityRegistry: RUNTIME_CAPABILITY_REGISTRY,
  });
  assert.equal(executability.verdict, RUNTIME_READY_VERDICTS.REJECT);
  assert.ok(executability.reason_codes.includes(RUNTIME_READY_REASONS.CLAUDE_PLAN_MODE_REPORT_ARTIFACT));
});

test("runtime executability rejects absolute source paths outside AllowedReadPaths", () => {
  const uncoveredSource = RUNTIME_READY_CONTRACT.replace(
    "  - [LOCAL_WORKSPACE]",
    "  - [LOCAL_WORKSPACE]",
  ).replace(
    "  - node --test [LOCAL_WORKSPACE]",
    "  - node --test [LOCAL_WORKSPACE]",
  );
  const executability = evaluateRuntimeExecutability({
    item: item(uncoveredSource),
    labelNames: ["role:cto"],
    capabilityRegistry: RUNTIME_CAPABILITY_REGISTRY,
  });
  assert.equal(executability.verdict, RUNTIME_READY_VERDICTS.REJECT);
  assert.ok(executability.reason_codes.includes(RUNTIME_READY_REASONS.ALLOWED_READ_PATHS_MISSING_SOURCE));
  assert.ok(executability.reason_codes.includes(RUNTIME_READY_REASONS.ALLOWED_READ_PATHS_MISSING_GATE));
});

test("runtime executability rejects Claude internal tool-result source references", () => {
  const claudeInternalSource = RUNTIME_READY_CONTRACT.replace(
    "  - [LOCAL_WORKSPACE]",
    "  - ~/.claude/projects/private/tool-results/raw.txt",
  );
  const executability = evaluateRuntimeExecutability({
    item: item(claudeInternalSource),
    labelNames: ["role:cto"],
    capabilityRegistry: RUNTIME_CAPABILITY_REGISTRY,
  });
  assert.equal(executability.verdict, RUNTIME_READY_VERDICTS.REJECT);
  assert.ok(executability.reason_codes.includes(RUNTIME_READY_REASONS.CLAUDE_TOOL_RESULT_READ));
});

test("findContractReviewGate passes only fresh CONTRACT_PASS comments", () => {
  const review = evaluateContractForDispatch({ item: item(), labelNames: ["role:cto"] });
  const yaml = buildContractReviewYaml({ review, item: item() });
  const comments = [{
    id: "comment-1",
    created_at: "2026-05-10T18:00:00.000Z",
    comment_html: `<p><strong>${CONTRACT_REVIEW_TITLE}</strong></p><pre><code>${yaml}</code></pre>`,
  }];
  const gate = findContractReviewGate({
    comments,
    currentDescriptionHash: review.evidence.description_hash,
  });
  assert.equal(gate.ok, true);
});

test("findContractReviewGate prefers matching current pass over stale comment order", () => {
  const review = evaluateContractForDispatch({ item: item(), labelNames: ["role:cto"] });
  const yaml = buildContractReviewYaml({ review, item: item() });
  const stale = yaml.replace(
    `description_hash: ${review.evidence.description_hash}`,
    "description_hash: stale-hash",
  );
  const comments = [
    {
      id: "stale-first",
      comment_html: `<pre><code>${stale}</code></pre>`,
    },
    {
      id: "current-second",
      comment_html: `<pre><code>${yaml}</code></pre>`,
    },
  ];

  const gate = findContractReviewGate({
    comments,
    currentDescriptionHash: review.evidence.description_hash,
  });

  assert.equal(gate.ok, true);
  assert.equal(gate.review.comment_id, "current-second");
});

test("findContractReviewGate rejects missing, stale and non-pass reviews", () => {
  const review = evaluateContractForDispatch({ item: item(), labelNames: ["role:cto"] });
  assert.deepEqual(
    findContractReviewGate({ comments: [], currentDescriptionHash: review.evidence.description_hash }).reason_codes,
    [CONTRACT_REVIEW_GATE_REASONS.MISSING],
  );

  const yaml = buildContractReviewYaml({ review, item: item() });
  const comments = [{
    id: "comment-1",
    created_at: "2026-05-10T18:00:00.000Z",
    comment_html: `<p><strong>${CONTRACT_REVIEW_TITLE}</strong></p><pre><code>${yaml}</code></pre>`,
  }];
  assert.deepEqual(
    findContractReviewGate({ comments, currentDescriptionHash: "not-the-current-hash" }).reason_codes,
    [CONTRACT_REVIEW_GATE_REASONS.STALE],
  );

  const nonPass = yaml.replace("verdict: CONTRACT_PASS", "verdict: CONTRACT_PATCH_REQUIRED");
  assert.deepEqual(
    findContractReviewGate({
      comments: [{ ...comments[0], comment_html: `<pre><code>${nonPass}</code></pre>` }],
      currentDescriptionHash: review.evidence.description_hash,
    }).reason_codes,
    [CONTRACT_REVIEW_GATE_REASONS.NOT_PASS],
  );
});
