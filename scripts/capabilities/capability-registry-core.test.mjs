import test from "node:test";
import assert from "node:assert/strict";
import {
  CAPABILITY_REASONS,
  SANDBOX_PATTERN_REASONS,
  evaluateCapabilityProfile,
  isWorkspaceAllowedForProfile,
  loadCapabilityRegistry,
  matchSandboxWorkspace,
  validateCapabilityRegistry,
  validateSandboxPatternEntry
} from "./capability-registry-core.mjs";

const REGISTRY = {
  version: "capability-registry/v0",
  profiles: [
    {
      id: "claude-clevel-worker/cto/runtime",
      role: "role:cto",
      agents: ["claude"],
      modes: ["implement", "audit"],
      workspaces: ["companyos", "${LOCAL_WORKSPACE}"],
      max_autonomy_level: "L3",
      allowed_plugins: ["gitnexus"],
      allowed_connectors: ["plane-app"],
      allowed_commands: ["claude", "node"],
      allowed_skills: ["linear-agent-orchestration"],
      allowed_subagents: ["explorer", "worker"],
      memory: {
        honcho_read: "company",
        honcho_write: "proposal-only"
      },
      last_verified_at: "2026-05-09",
      stale_after_days: 14
    }
  ]
};

const CONTRACT = {
  Agent: "claude",
  RoleLabel: "role:cto",
  Mode: "implement",
  Workspace: "companyos",
  AutonomyLevel: "L2",
  CapabilityProfile: "claude-clevel-worker/cto/runtime",
  SubAgentRoster: "explorer, worker",
  MemoryStore: "honcho:company",
  MemoryUpdatePolicy: "controller-approved"
};

test("valid registry passes shape validation", () => {
  const result = validateCapabilityRegistry(REGISTRY);
  assert.equal(result.ok, true);
  assert.equal(result.evidence.profile_count, 1);
});

test("missing claude capability profile blocks", () => {
  const result = evaluateCapabilityProfile({
    registry: REGISTRY,
    contractFields: { ...CONTRACT, CapabilityProfile: "" },
    now: new Date("2026-05-10T00:00:00Z")
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.reason_codes, [CAPABILITY_REASONS.PROFILE_MISSING]);
});

test("missing non-human capability profile blocks", () => {
  const result = evaluateCapabilityProfile({
    registry: REGISTRY,
    contractFields: { ...CONTRACT, Agent: "gemini", CapabilityProfile: "" },
    now: new Date("2026-05-10T00:00:00Z")
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.reason_codes, [CAPABILITY_REASONS.PROFILE_MISSING]);
});

test("missing human capability profile is allowed", () => {
  const result = evaluateCapabilityProfile({
    registry: REGISTRY,
    contractFields: { Agent: "human", CapabilityProfile: "" },
    now: new Date("2026-05-10T00:00:00Z")
  });
  assert.equal(result.ok, true);
  assert.equal(result.evidence.reason, "human-agent-profile-optional");
});

test("unknown profile blocks", () => {
  const result = evaluateCapabilityProfile({
    registry: REGISTRY,
    contractFields: { ...CONTRACT, CapabilityProfile: "missing" },
    now: new Date("2026-05-10T00:00:00Z")
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.reason_codes, [CAPABILITY_REASONS.PROFILE_NOT_FOUND]);
});

test("matching profile passes with allowed subagents", () => {
  const result = evaluateCapabilityProfile({
    registry: REGISTRY,
    contractFields: CONTRACT,
    usedCapabilities: { connectors: ["plane-app"], commands: ["claude"] },
    now: new Date("2026-05-10T00:00:00Z")
  });
  assert.equal(result.ok, true);
});

test("undeclared subagent blocks", () => {
  const result = evaluateCapabilityProfile({
    registry: REGISTRY,
    contractFields: { ...CONTRACT, SubAgentRoster: "explorer, browser-driver" },
    now: new Date("2026-05-10T00:00:00Z")
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason_codes.includes(CAPABILITY_REASONS.UNDECLARED_TOOL), true);
});

test("stale profile blocks", () => {
  const result = evaluateCapabilityProfile({
    registry: REGISTRY,
    contractFields: CONTRACT,
    now: new Date("2026-06-01T00:00:00Z")
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason_codes.includes(CAPABILITY_REASONS.STALE), true);
});

test("autonomy above profile maximum blocks", () => {
  const result = evaluateCapabilityProfile({
    registry: REGISTRY,
    contractFields: { ...CONTRACT, AutonomyLevel: "L4" },
    now: new Date("2026-05-10T00:00:00Z")
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason_codes.includes(CAPABILITY_REASONS.AUTONOMY_TOO_HIGH), true);
});

test("personal memory on company profile blocks", () => {
  const result = evaluateCapabilityProfile({
    registry: REGISTRY,
    contractFields: { ...CONTRACT, MemoryStore: "honcho:personal" },
    now: new Date("2026-05-10T00:00:00Z")
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason_codes.includes(CAPABILITY_REASONS.MEMORY_BOUNDARY_VIOLATION), true);
});

const SANDBOX_PROFILE = {
  ...REGISTRY.profiles[0],
  sandbox_workspaces: ["${LOCAL_WORKSPACE}"]
};

const SANDBOX_REGISTRY = {
  version: "capability-registry/v0",
  profiles: [SANDBOX_PROFILE]
};

test("approved sandbox workspace pattern resolves without temp registry entry", () => {
  const result = evaluateCapabilityProfile({
    registry: SANDBOX_REGISTRY,
    contractFields: {
      ...CONTRACT,
      Workspace:
        "${LOCAL_WORKSPACE}"
    },
    now: new Date("2026-05-10T00:00:00Z")
  });
  assert.equal(result.ok, true);
});

test("unapproved sandbox workspace path is blocked", () => {
  const result = evaluateCapabilityProfile({
    registry: SANDBOX_REGISTRY,
    contractFields: {
      ...CONTRACT,
      Workspace: "${LOCAL_WORKSPACE}"
    },
    now: new Date("2026-05-10T00:00:00Z")
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason_codes.includes(CAPABILITY_REASONS.UNDECLARED_TOOL), true);
});

test("workspace path traversal escape is blocked", () => {
  const result = evaluateCapabilityProfile({
    registry: SANDBOX_REGISTRY,
    contractFields: {
      ...CONTRACT,
      Workspace:
        "${LOCAL_WORKSPACE}"
    },
    now: new Date("2026-05-10T00:00:00Z")
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason_codes.includes(CAPABILITY_REASONS.UNDECLARED_TOOL), true);
});

test("wildcard outside final path segment is rejected by registry validator", () => {
  const registry = {
    version: "capability-registry/v0",
    profiles: [{
      ...REGISTRY.profiles[0],
      sandbox_workspaces: ["/Users/*/Developer/[SOURCE_WORKSPACE]/company-os/**"]
    }]
  };
  const validation = validateCapabilityRegistry(registry);
  assert.equal(validation.ok, false);
  assert.equal(validation.reason_codes.includes(CAPABILITY_REASONS.REGISTRY_INVALID), true);

  const reasons = validateSandboxPatternEntry("/Users/*/Developer/[SOURCE_WORKSPACE]/company-os/**");
  assert.equal(reasons.includes(SANDBOX_PATTERN_REASONS.WILDCARD_NOT_FINAL), true);
});

test("matchSandboxWorkspace enforces sandbox root subdirectory", () => {
  const pattern = "${LOCAL_WORKSPACE}";
  assert.equal(matchSandboxWorkspace("${LOCAL_WORKSPACE}", pattern), true);
  // sandbox root itself is not a worktree
  assert.equal(matchSandboxWorkspace("${LOCAL_WORKSPACE}", pattern), false);
  // traversal escape
  assert.equal(matchSandboxWorkspace("${LOCAL_WORKSPACE}", pattern), false);
});

test("sandbox_workspaces patterns layer on top of static workspaces", () => {
  // Static workspace alias still matches even when sandbox patterns are declared.
  assert.equal(isWorkspaceAllowedForProfile(SANDBOX_PROFILE, "companyos"), true);
  // Static absolute path still matches.
  assert.equal(
    isWorkspaceAllowedForProfile(SANDBOX_PROFILE, "${LOCAL_WORKSPACE}"),
    true
  );
});

test("validateSandboxPatternEntry catches empty, relative and traversal inputs", () => {
  assert.deepEqual(validateSandboxPatternEntry(""), [SANDBOX_PATTERN_REASONS.EMPTY]);
  assert.deepEqual(validateSandboxPatternEntry("relative/path/**"), [SANDBOX_PATTERN_REASONS.NOT_ABSOLUTE]);
  assert.equal(
    validateSandboxPatternEntry("${LOCAL_WORKSPACE}")
      .includes(SANDBOX_PATTERN_REASONS.TRAVERSAL),
    true
  );
});

// [WORK_ITEM_ID] acceptance criteria: real registry validation
const REAL_REGISTRY_RESULT = loadCapabilityRegistry();
const PUBLIC_EXAMPLE_REGISTRY_RESULT = loadCapabilityRegistry("registries/capabilities/example.json");

test("[WORK_ITEM_ID]: real registry cto/runtime PASS for company-os sandbox path", () => {
  assert.equal(REAL_REGISTRY_RESULT.ok, true, `real registry load failed: ${JSON.stringify(REAL_REGISTRY_RESULT.reason_codes)}`);
  const result = evaluateCapabilityProfile({
    registry: REAL_REGISTRY_RESULT.registry,
    contractFields: {
      ...CONTRACT,
      Workspace: "${LOCAL_WORKSPACE}"
    },
    now: new Date("2026-05-13T00:00:00Z")
  });
  assert.equal(result.ok, true, `expected PASS but got: ${JSON.stringify(result.reason_codes)}`);
});

test("[WORK_ITEM_ID]: real registry cto/runtime REJECT for sibling sandbox path", () => {
  assert.equal(REAL_REGISTRY_RESULT.ok, true, `real registry load failed: ${JSON.stringify(REAL_REGISTRY_RESULT.reason_codes)}`);
  const result = evaluateCapabilityProfile({
    registry: REAL_REGISTRY_RESULT.registry,
    contractFields: {
      ...CONTRACT,
      Workspace: "${LOCAL_WORKSPACE}"
    },
    now: new Date("2026-05-13T00:00:00Z")
  });
  assert.equal(result.ok, false, "expected REJECT but got PASS for sibling sandbox path");
  assert.equal(result.reason_codes.includes(CAPABILITY_REASONS.UNDECLARED_TOOL), true);
});

test("[WORK_ITEM_ID]: real registry cto/atlas-website-runtime PASS for [SOURCE_WORKSPACE] sandbox path", () => {
  assert.equal(REAL_REGISTRY_RESULT.ok, true, `real registry load failed: ${JSON.stringify(REAL_REGISTRY_RESULT.reason_codes)}`);
  const profile = REAL_REGISTRY_RESULT.registry.profiles.find((candidate) => candidate.id === "claude-clevel-worker/cto/atlas-website-runtime");
  assert.ok(profile, "cto/atlas-website-runtime profile missing");
  assert.equal(profile.runtime_defaults?.runtime_agent, "claude");
  assert.equal(profile.runtime_defaults?.runtime_model_alias, "opus");
  assert.equal(profile.runtime_defaults?.resolved_model_observed, "claude-opus-4-7");
  const raindropPack = profile.context_packs?.find((candidate) => candidate.id === "raindrop-marketing-observability-v0");
  assert.ok(raindropPack, "raindrop context pack missing");
  assert.equal(raindropPack.write_paths.length, 0);
  assert.ok(raindropPack.read_paths.includes("${LOCAL_WORKSPACE}"));
  assert.ok(raindropPack.read_paths.includes("${LOCAL_WORKSPACE}"));
  const result = evaluateCapabilityProfile({
    registry: REAL_REGISTRY_RESULT.registry,
    contractFields: {
      ...CONTRACT,
      CapabilityProfile: "claude-clevel-worker/cto/atlas-website-runtime",
      SubAgentRoster: "none",
      Workspace: "${LOCAL_WORKSPACE}"
    },
    now: new Date("2026-05-23T00:00:00Z")
  });
  assert.equal(result.ok, true, `expected PASS but got: ${JSON.stringify(result.reason_codes)}`);
});

test("Department capability pack creator profile allows scaffold/evaluator gates and blocks unsafe surfaces", () => {
  assert.equal(REAL_REGISTRY_RESULT.ok, true, `real registry load failed: ${JSON.stringify(REAL_REGISTRY_RESULT.reason_codes)}`);
  const profile = REAL_REGISTRY_RESULT.registry.profiles.find(
    (candidate) => candidate.id === "claude-clevel-worker/cto/department-capability-pack-creator"
  );
  assert.ok(profile, "department capability pack creator profile missing");
  assert.equal(profile.max_autonomy_level, "L2");
  assert.ok(profile.allowed_claude_tools.includes("Bash(node scripts/orchestration/company-os-department-pack-scaffold.mjs*)"));
  assert.ok(profile.allowed_claude_tools.includes("Bash(node scripts/orchestration/company-os-department-pack-evaluator.mjs*)"));
  assert.ok(profile.forbidden_surfaces.includes("secret-read"));
  assert.ok(profile.forbidden_surfaces.includes("production-write"));
  assert.ok(profile.forbidden_surfaces.includes("public-publish"));
  assert.ok(profile.forbidden_surfaces.includes("plane-done-by-worker"));

  const result = evaluateCapabilityProfile({
    registry: REAL_REGISTRY_RESULT.registry,
    contractFields: {
      ...CONTRACT,
      CapabilityProfile: "claude-clevel-worker/cto/department-capability-pack-creator",
      Workspace: "registry:company-os",
      AutonomyLevel: "L2",
      SubAgentRoster: "none",
      MemoryStore: "honcho:company",
      MemoryUpdatePolicy: "proposal-only"
    },
    usedCapabilities: { connectors: ["plane-app"], commands: ["node"] },
    now: new Date("2026-05-26T00:00:00Z")
  });
  assert.equal(result.ok, true, `expected PASS but got: ${JSON.stringify(result.reason_codes)}`);
});

test("Post-worker quality loop lower-worker profiles are registered with safe default boundaries", () => {
  assert.equal(REAL_REGISTRY_RESULT.ok, true, `real registry load failed: ${JSON.stringify(REAL_REGISTRY_RESULT.reason_codes)}`);
  for (const profileId of [
    "codex-lower-worker/cto/quality-auditor",
    "claude-lower-worker/cto/security-auditor",
    "claude-lower-worker/cto/bug-regression-auditor",
    "claude-lower-worker/cto/deep-audit",
    "claude-lower-worker/cto/hotfix",
  ]) {
    const profile = REAL_REGISTRY_RESULT.registry.profiles.find((candidate) => candidate.id === profileId);
    assert.ok(profile, `${profileId} missing`);
    assert.equal(profile.role, "role:cto");
    assert.ok(profile.source.includes("docs/orchestration/post-worker-quality-loop.md"));
    assert.ok(profile.source.includes("registries/quality/post-worker-quality-loop.json"));
    assert.ok(profile.forbidden_surfaces.includes("plane-done-by-worker"));
    assert.ok(profile.forbidden_surfaces.includes("production-write"));
  }
});

test("Public capability example includes executable post-worker quality profiles", () => {
  assert.equal(
    PUBLIC_EXAMPLE_REGISTRY_RESULT.ok,
    true,
    `public example registry load failed: ${JSON.stringify(PUBLIC_EXAMPLE_REGISTRY_RESULT.reason_codes)}`,
  );
  const profileIds = PUBLIC_EXAMPLE_REGISTRY_RESULT.registry.profiles.map((profile) => profile.id);
  for (const profileId of [
    "codex-lower-worker/cto/quality-auditor",
    "claude-lower-worker/cto/security-auditor",
    "claude-lower-worker/cto/bug-regression-auditor",
    "claude-lower-worker/cto/deep-audit",
    "claude-lower-worker/cto/hotfix",
  ]) {
    assert.ok(profileIds.includes(profileId), `${profileId} missing from public example registry`);
  }
});

test("Post-worker quality loop allows Codex quality audit and Claude bounded hotfix profiles", () => {
  assert.equal(REAL_REGISTRY_RESULT.ok, true, `real registry load failed: ${JSON.stringify(REAL_REGISTRY_RESULT.reason_codes)}`);
  const qualityAudit = evaluateCapabilityProfile({
    registry: REAL_REGISTRY_RESULT.registry,
    contractFields: {
      Agent: "codex",
      RoleLabel: "role:cto",
      Role: "role:cto",
      Mode: "audit",
      Workspace: "registry:company-os",
      AutonomyLevel: "L2",
      CapabilityProfile: "codex-lower-worker/cto/quality-auditor",
      SubAgentRoster: "none",
      MemoryStore: "none",
      MemoryUpdatePolicy: "none"
    },
    usedCapabilities: { commands: ["node", "git"], connectors: ["gitnexus"] },
    now: new Date("2026-05-27T00:00:00Z")
  });
  assert.equal(qualityAudit.ok, true, `expected quality audit PASS but got: ${JSON.stringify(qualityAudit.reason_codes)}`);

  const hotfix = evaluateCapabilityProfile({
    registry: REAL_REGISTRY_RESULT.registry,
    contractFields: {
      Agent: "claude",
      RoleLabel: "role:cto",
      Role: "role:cto",
      Mode: "implement",
      Workspace: "${LOCAL_WORKSPACE}",
      AutonomyLevel: "L2",
      CapabilityProfile: "claude-lower-worker/cto/hotfix",
      SubAgentRoster: "none",
      MemoryStore: "none",
      MemoryUpdatePolicy: "none"
    },
    usedCapabilities: { commands: ["node", "git"], connectors: ["gitnexus"] },
    now: new Date("2026-05-27T00:00:00Z")
  });
  assert.equal(hotfix.ok, true, `expected hotfix PASS but got: ${JSON.stringify(hotfix.reason_codes)}`);
});

test("CMO runtime profile declares Opus max-context marketing intelligence pack", () => {
  assert.equal(REAL_REGISTRY_RESULT.ok, true, `real registry load failed: ${JSON.stringify(REAL_REGISTRY_RESULT.reason_codes)}`);
  const profile = REAL_REGISTRY_RESULT.registry.profiles.find((candidate) => candidate.id === "claude-clevel-worker/cmo/runtime");
  assert.ok(profile, "cmo/runtime profile missing");
  assert.equal(profile.runtime_defaults?.runtime_model_alias, "opus");
  assert.equal(profile.runtime_defaults?.inference_budget, "max-context");
  const pack = profile.context_packs?.find((candidate) => candidate.id === "atlas-marketing-department-intelligence-v0");
  assert.ok(pack, "marketing intelligence context pack missing");
  assert.ok(pack.read_paths.includes("${LOCAL_WORKSPACE}"));
  assert.ok(pack.read_paths.includes("${LOCAL_WORKSPACE}"));
  assert.deepEqual(pack.write_paths, []);
});

test("[WORK_ITEM_ID]: real registry coo/runtime PASS for company-os sandbox path", () => {
  assert.equal(REAL_REGISTRY_RESULT.ok, true, `real registry load failed: ${JSON.stringify(REAL_REGISTRY_RESULT.reason_codes)}`);
  const result = evaluateCapabilityProfile({
    registry: REAL_REGISTRY_RESULT.registry,
    contractFields: {
      ...CONTRACT,
      RoleLabel: "role:coo",
      CapabilityProfile: "claude-clevel-worker/coo/runtime",
      Workspace: "${LOCAL_WORKSPACE}"
    },
    now: new Date("2026-05-13T00:00:00Z")
  });
  assert.equal(result.ok, true, `expected PASS but got: ${JSON.stringify(result.reason_codes)}`);
});

test("[WORK_ITEM_ID]: real registry coo/runtime allows department-executive validation gates", () => {
  assert.equal(REAL_REGISTRY_RESULT.ok, true, `real registry load failed: ${JSON.stringify(REAL_REGISTRY_RESULT.reason_codes)}`);
  const profile = REAL_REGISTRY_RESULT.registry.profiles.find((candidate) => candidate.id === "claude-clevel-worker/coo/runtime");
  assert.ok(profile, "coo runtime profile missing");
  assert.ok(profile.allowed_claude_tools.includes("Bash(node scripts/orchestration/worker-ledger-validator.mjs*)"));
  assert.ok(profile.allowed_claude_tools.includes("Bash(node scripts/orchestration/contract-controller.mjs*)"));
});

test("[WORK_ITEM_ID]: every executive C-Level runtime profile carries department_executive_v0 lane block", () => {
  assert.equal(REAL_REGISTRY_RESULT.ok, true, `real registry load failed: ${JSON.stringify(REAL_REGISTRY_RESULT.reason_codes)}`);
  for (const role of ["cto", "cpo", "cmo", "coo", "cfo"]) {
    const profileId = `claude-clevel-worker/${role}/runtime`;
    const profile = REAL_REGISTRY_RESULT.registry.profiles.find((candidate) => candidate.id === profileId);
    assert.ok(profile, `${profileId} missing`);
    const lane = profile.lanes?.department_executive_v0;
    assert.ok(lane, `${profileId} missing lanes.department_executive_v0 block`);
    assert.ok(Array.isArray(lane.allowed_write_paths_lane) && lane.allowed_write_paths_lane.length > 0,
      `${profileId} lane missing allowed_write_paths_lane entries`);
    assert.ok(lane.allowed_write_paths_lane.includes("${LOCAL_WORKSPACE}"),
      `${profileId} lane missing sandbox reports path pattern`);
    assert.ok(lane.allowed_write_paths_lane.includes("${LOCAL_WORKSPACE}"),
      `${profileId} lane missing sandbox page-index path pattern`);
    assert.ok(Array.isArray(lane.blocked_surfaces_lane) && lane.blocked_surfaces_lane.includes("plane-done-by-worker"),
      `${profileId} lane missing blocked_surfaces_lane entry plane-done-by-worker`);
    assert.equal(lane.subagent_roster_lane, "none", `${profileId} lane must declare subagent_roster_lane: none`);
    assert.equal(lane.intervention_budget?.ceo_mechanical_hard_limit, 0,
      `${profileId} lane must default ceo_mechanical_hard_limit to 0`);
    assert.equal(lane.intervention_budget?.ceo_decision_hard_limit, 3,
      `${profileId} lane must default ceo_decision_hard_limit to 3`);
  }
});

test("[WORK_ITEM_ID]: cao runtime profile is excluded from executive lane registration", () => {
  assert.equal(REAL_REGISTRY_RESULT.ok, true, `real registry load failed: ${JSON.stringify(REAL_REGISTRY_RESULT.reason_codes)}`);
  const profile = REAL_REGISTRY_RESULT.registry.profiles.find((candidate) => candidate.id === "claude-clevel-worker/cao/runtime");
  assert.ok(profile, "cao runtime profile missing");
  assert.equal(profile.lanes?.department_executive_v0, undefined,
    "cao runtime profile must NOT carry department_executive_v0 lane (CAO is review-only)");
});

test("[WORK_ITEM_ID]: every C-Level runtime profile allows common controller validation gates", () => {
  assert.equal(REAL_REGISTRY_RESULT.ok, true, `real registry load failed: ${JSON.stringify(REAL_REGISTRY_RESULT.reason_codes)}`);
  for (const role of ["cto", "cpo", "cmo", "coo", "cfo"]) {
    const profileId = `claude-clevel-worker/${role}/runtime`;
    const profile = REAL_REGISTRY_RESULT.registry.profiles.find((candidate) => candidate.id === profileId);
    assert.ok(profile, `${profileId} missing`);
    assert.ok(
      profile.allowed_claude_tools.includes("Bash(node scripts/orchestration/worker-ledger-validator.mjs*)"),
      `${profileId} missing worker-ledger-validator gate`,
    );
    assert.ok(
      profile.allowed_claude_tools.includes("Bash(node scripts/orchestration/contract-controller.mjs*)"),
      `${profileId} missing contract-controller gate`,
    );
  }
});

test("[WORK_ITEM_ID]: real registry cpo/runtime PASS for company-os sandbox path", () => {
  assert.equal(REAL_REGISTRY_RESULT.ok, true, `real registry load failed: ${JSON.stringify(REAL_REGISTRY_RESULT.reason_codes)}`);
  const result = evaluateCapabilityProfile({
    registry: REAL_REGISTRY_RESULT.registry,
    contractFields: {
      ...CONTRACT,
      RoleLabel: "role:cpo",
      Role: "role:cpo",
      CapabilityProfile: "claude-clevel-worker/cpo/runtime",
      Workspace: "${LOCAL_WORKSPACE}"
    },
    now: new Date("2026-05-18T00:00:00Z")
  });
  assert.equal(result.ok, true, `expected PASS but got: ${JSON.stringify(result.reason_codes)}`);
});

test("[WORK_ITEM_ID]: real registry cmo/runtime PASS for company-os sandbox path", () => {
  assert.equal(REAL_REGISTRY_RESULT.ok, true, `real registry load failed: ${JSON.stringify(REAL_REGISTRY_RESULT.reason_codes)}`);
  const result = evaluateCapabilityProfile({
    registry: REAL_REGISTRY_RESULT.registry,
    contractFields: {
      Agent: "claude",
      RoleLabel: "role:cmo",
      Role: "role:cmo",
      Mode: "implement",
      Workspace: "${LOCAL_WORKSPACE}",
      AutonomyLevel: "L2",
      CapabilityProfile: "claude-clevel-worker/cmo/runtime",
      SubAgentRoster: "none",
      MemoryStore: "honcho:company",
      MemoryUpdatePolicy: "proposal-only"
    },
    now: new Date("2026-05-17T00:00:00Z")
  });
  assert.equal(result.ok, true, `expected PASS but got: ${JSON.stringify(result.reason_codes)}`);
});

test("[WORK_ITEM_ID]: real registry cmo/runtime allows marketing HG-2.5 vision gate", () => {
  assert.equal(REAL_REGISTRY_RESULT.ok, true, `real registry load failed: ${JSON.stringify(REAL_REGISTRY_RESULT.reason_codes)}`);
  const profile = REAL_REGISTRY_RESULT.registry.profiles.find((candidate) => candidate.id === "claude-clevel-worker/cmo/runtime");
  assert.ok(profile, "cmo runtime profile missing");
  assert.ok(profile.allowed_claude_tools.includes("Bash(node scripts/release-gates/marketing-hg25-vision.mjs*)"));
});

test("GROW visual backfill profiles allow [SOURCE_WORKSPACE] sandbox worktrees", () => {
  assert.equal(REAL_REGISTRY_RESULT.ok, true, `real registry load failed: ${JSON.stringify(REAL_REGISTRY_RESULT.reason_codes)}`);
  for (const [profileId, mode] of [
    ["claude-clevel-worker/cmo/atlas-growth-editorial-image-post", "implement"],
    ["claude-clevel-worker/cmo/marketing-visual-director", "review"],
  ]) {
    const result = evaluateCapabilityProfile({
      registry: REAL_REGISTRY_RESULT.registry,
      contractFields: {
        Agent: "claude",
        RoleLabel: "role:cmo",
        Role: "role:cmo",
        Mode: mode,
        Workspace: "${LOCAL_WORKSPACE}",
        AutonomyLevel: "L2",
        CapabilityProfile: profileId,
        SubAgentRoster: "none",
        MemoryStore: "honcho:company",
        MemoryUpdatePolicy: "proposal-only"
      },
      now: new Date("2026-05-22T00:00:00Z")
    });
    assert.equal(result.ok, true, `expected ${profileId} PASS but got: ${JSON.stringify(result.reason_codes)}`);
  }
});

test("GROW visual backfill image-post profile allows declared local gates", () => {
  assert.equal(REAL_REGISTRY_RESULT.ok, true, `real registry load failed: ${JSON.stringify(REAL_REGISTRY_RESULT.reason_codes)}`);
  const profile = REAL_REGISTRY_RESULT.registry.profiles.find((candidate) => candidate.id === "claude-clevel-worker/cmo/atlas-growth-editorial-image-post");
  assert.ok(profile, "atlas growth editorial image post profile missing");
  assert.ok(profile.allowed_claude_tools.includes("Bash(node ${LOCAL_WORKSPACE})"));
  assert.ok(profile.allowed_claude_tools.includes("Bash(npm run marketing:product-images*)"));
  assert.ok(profile.allowed_claude_tools.includes("Bash(sips*)"));
});

test("[WORK_ITEM_ID]: real registry cfo/runtime PASS for company-os sandbox path", () => {
  assert.equal(REAL_REGISTRY_RESULT.ok, true, `real registry load failed: ${JSON.stringify(REAL_REGISTRY_RESULT.reason_codes)}`);
  const result = evaluateCapabilityProfile({
    registry: REAL_REGISTRY_RESULT.registry,
    contractFields: {
      Agent: "claude",
      RoleLabel: "role:cfo",
      Role: "role:cfo",
      Mode: "implement",
      Workspace: "${LOCAL_WORKSPACE}",
      AutonomyLevel: "L2",
      CapabilityProfile: "claude-clevel-worker/cfo/runtime",
      SubAgentRoster: "none",
      MemoryStore: "honcho:company",
      MemoryUpdatePolicy: "proposal-only"
    },
    now: new Date("2026-05-18T00:00:00Z")
  });
  assert.equal(result.ok, true, `expected PASS but got: ${JSON.stringify(result.reason_codes)}`);
});

test("[WORK_ITEM_ID]: real registry cao/runtime PASS for parent synthesis audit", () => {
  assert.equal(REAL_REGISTRY_RESULT.ok, true, `real registry load failed: ${JSON.stringify(REAL_REGISTRY_RESULT.reason_codes)}`);
  const result = evaluateCapabilityProfile({
    registry: REAL_REGISTRY_RESULT.registry,
    contractFields: {
      Agent: "claude",
      RoleLabel: "role:cao",
      Role: "role:cao",
      Mode: "audit",
      Workspace: "${LOCAL_WORKSPACE}",
      AutonomyLevel: "L2",
      CapabilityProfile: "claude-clevel-worker/cao/runtime",
      SubAgentRoster: "none",
      MemoryStore: "none",
      MemoryUpdatePolicy: "proposal-only"
    },
    now: new Date("2026-05-13T00:00:00Z")
  });
  assert.equal(result.ok, true, `expected PASS but got: ${JSON.stringify(result.reason_codes)}`);
});

test("[WORK_ITEM_ID]: CMO performance analyst may use TinyFish public-fetch connector", () => {
  assert.equal(REAL_REGISTRY_RESULT.ok, true, `real registry load failed: ${JSON.stringify(REAL_REGISTRY_RESULT.reason_codes)}`);
  const profile = REAL_REGISTRY_RESULT.registry.profiles.find(
    (candidate) => candidate.id === "claude-clevel-worker/cmo/marketing-performance-analyst"
  );
  assert.ok(profile, "marketing performance analyst profile missing");
  assert.ok(profile.allowed_connectors.includes("tinyfish-mcp"));
  assert.ok(profile.allowed_claude_tools.includes("WebFetch"));
  assert.ok(profile.allowed_claude_tools.includes("mcp__tinyfish__fetch_content"));

  const result = evaluateCapabilityProfile({
    registry: REAL_REGISTRY_RESULT.registry,
    contractFields: {
      Agent: "claude",
      RoleLabel: "role:cmo",
      Role: "role:cmo",
      Mode: "report",
      Workspace: "${LOCAL_WORKSPACE}",
      AutonomyLevel: "L2",
      CapabilityProfile: "claude-clevel-worker/cmo/marketing-performance-analyst",
      SubAgentRoster: "none",
      MemoryStore: "honcho:company",
      MemoryUpdatePolicy: "proposal-only"
    },
    usedCapabilities: { connectors: ["tinyfish-mcp"], commands: ["claude"] },
    now: new Date("2026-05-23T00:00:00Z")
  });
  assert.equal(result.ok, true, `expected PASS but got: ${JSON.stringify(result.reason_codes)}`);
});

test("[WORK_ITEM_ID]: CMO visual director cannot request TinyFish by accident", () => {
  assert.equal(REAL_REGISTRY_RESULT.ok, true, `real registry load failed: ${JSON.stringify(REAL_REGISTRY_RESULT.reason_codes)}`);
  const result = evaluateCapabilityProfile({
    registry: REAL_REGISTRY_RESULT.registry,
    contractFields: {
      Agent: "claude",
      RoleLabel: "role:cmo",
      Role: "role:cmo",
      Mode: "review",
      Workspace: "${LOCAL_WORKSPACE}",
      AutonomyLevel: "L2",
      CapabilityProfile: "claude-clevel-worker/cmo/marketing-visual-director",
      SubAgentRoster: "none",
      MemoryStore: "honcho:company",
      MemoryUpdatePolicy: "proposal-only"
    },
    usedCapabilities: { connectors: ["tinyfish-mcp"] },
    now: new Date("2026-05-23T00:00:00Z")
  });
  assert.equal(result.ok, false);
  assert.equal(result.reason_codes.includes(CAPABILITY_REASONS.UNDECLARED_TOOL), true);
});

test("Video-first content engine profile allows local dry-run media setup and blocks publisher writes", () => {
  assert.equal(REAL_REGISTRY_RESULT.ok, true, `real registry load failed: ${JSON.stringify(REAL_REGISTRY_RESULT.reason_codes)}`);
  const profile = REAL_REGISTRY_RESULT.registry.profiles.find(
    (candidate) => candidate.id === "claude-clevel-worker/cmo/video-first-content-engine"
  );
  assert.ok(profile, "video-first content engine profile missing");
  assert.ok(profile.forbidden_surfaces.includes("publisher-api-write"));
  assert.ok(profile.forbidden_surfaces.includes("public-publish"));
  assert.ok(profile.allowed_claude_tools.includes("Bash(node scripts/content/video-first-content-engine-start.mjs*)"));

  const result = evaluateCapabilityProfile({
    registry: REAL_REGISTRY_RESULT.registry,
    contractFields: {
      Agent: "claude",
      RoleLabel: "role:cmo",
      Role: "role:cmo",
      Mode: "implement",
      Workspace: "${LOCAL_WORKSPACE}",
      AutonomyLevel: "L2",
      CapabilityProfile: "claude-clevel-worker/cmo/video-first-content-engine",
      SubAgentRoster: "none",
      MemoryStore: "honcho:company",
      MemoryUpdatePolicy: "proposal-only"
    },
    usedCapabilities: { commands: ["node"] },
    now: new Date("2026-05-27T00:00:00Z")
  });
  assert.equal(result.ok, true, `expected PASS but got: ${JSON.stringify(result.reason_codes)}`);
});

for (const [role, profile] of [
  ["role:cto", "gemini-clevel-worker/cto/audit"],
  ["role:cpo", "gemini-clevel-worker/cpo/audit"],
  ["role:coo", "gemini-clevel-worker/coo/audit"]
]) {
  test(`[WORK_ITEM_ID]: real registry ${profile} PASS for report-only Gemini audit`, () => {
    assert.equal(REAL_REGISTRY_RESULT.ok, true, `real registry load failed: ${JSON.stringify(REAL_REGISTRY_RESULT.reason_codes)}`);
    const result = evaluateCapabilityProfile({
      registry: REAL_REGISTRY_RESULT.registry,
      contractFields: {
        Agent: "gemini",
        RoleLabel: role,
        Role: role,
        Mode: "audit",
        Workspace: "${LOCAL_WORKSPACE}",
        AutonomyLevel: "L2",
        CapabilityProfile: profile,
        SubAgentRoster: "none",
        MemoryStore: "none",
        MemoryUpdatePolicy: "proposal-only"
      },
      usedCapabilities: { commands: ["${LOCAL_WORKSPACE}"] },
      now: new Date("2026-05-16T00:00:00Z")
    });
    assert.equal(result.ok, true, `expected PASS but got: ${JSON.stringify(result.reason_codes)}`);
  });
}

test("[WORK_ITEM_ID]: atlas-backend profile allows only the bounded G6 env preflight node script", () => {
  assert.equal(REAL_REGISTRY_RESULT.ok, true, `real registry load failed: ${JSON.stringify(REAL_REGISTRY_RESULT.reason_codes)}`);
  const profile = REAL_REGISTRY_RESULT.registry.profiles.find(
    (candidate) => candidate.id === "claude-clevel-worker/cto/atlas-backend"
  );
  assert.ok(profile, "atlas-backend profile missing");
  assert.ok(
    profile.allowed_claude_tools.includes("Bash(node ${LOCAL_WORKSPACE})"),
    "atlas-backend profile must allow the bounded G6 env preflight script",
  );
  assert.equal(
    profile.allowed_claude_tools.includes("Bash(node *)"),
    false,
    "atlas-backend profile must not allow arbitrary node commands",
  );
});
