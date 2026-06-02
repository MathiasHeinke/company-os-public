import path from "node:path";

export const SANDBOX_LIFECYCLE_VERSION = "sandbox-lifecycle-register/v1";

export const SANDBOX_LIFECYCLE_STATES = {
  created: {
    label: "created",
    description: "Worker dispatch active; branch/worktree exists; worker may be running",
    allowedActions: [
      "worker-edits",
      "heartbeat",
      "worker-reported",
      "controller-read",
    ],
    forbiddenActions: [
      "merge",
      "deploy",
      "git-reset",
      "git-clean",
      "branch-delete",
      "worktree-remove",
      "plane-done",
    ],
    staleThresholdHours: 48,
    staleRecommendation: "Check heartbeat or abort; worker may be stuck",
  },
  reported: {
    label: "reported",
    description: "Worker filed worker.reported; awaiting controller audit",
    allowedActions: [
      "controller-audit",
      "cao-review",
      "worker-clarification",
    ],
    forbiddenActions: [
      "merge",
      "deploy",
      "git-reset",
      "git-clean",
      "branch-delete",
      "worktree-remove",
      "plane-done-by-worker",
    ],
    staleThresholdHours: 24,
    staleRecommendation: "Trigger controller audit; worker has reported",
  },
  audited: {
    label: "audited",
    description: "Controller verdict issued; awaiting CEO integration decision",
    allowedActions: [
      "ceo-review",
      "rework-dispatch",
      "integration-packet-prep",
      "plane-comment",
    ],
    forbiddenActions: [
      "merge-without-hg25",
      "deploy-without-hg3",
      "git-reset",
      "git-clean",
      "branch-delete-without-hg",
      "plane-done-by-worker",
    ],
    staleThresholdHours: 72,
    staleRecommendation: "CEO decision required; controller verdict is waiting",
  },
  integrated: {
    label: "integrated",
    description: "Branch merged to integration target; worktree eligible for archive",
    allowedActions: [
      "read-only-inspection",
      "archive-recommendation",
    ],
    forbiddenActions: [
      "new-commits",
      "git-reset",
      "git-clean",
      "worktree-remove-without-hg2",
    ],
    staleThresholdHours: null,
    staleRecommendation: "Recommend archive to CEO; integration complete",
  },
  parked: {
    label: "parked",
    description: "Work paused; dependency blocked or decision deferred",
    allowedActions: [
      "read-only-inspection",
      "resumption-dispatch",
      "morning-brief-surface",
    ],
    forbiddenActions: [
      "merge",
      "deploy",
      "git-reset",
      "git-clean",
      "branch-delete-without-hg",
      "worktree-remove-without-hg",
      "plane-done",
    ],
    staleThresholdHours: 168,
    staleRecommendation: "Park review required; consider resumption or archive",
  },
  archived: {
    label: "archived",
    description: "Branch and worktree preserved read-only; no active work",
    allowedActions: [
      "read-only-inspection",
      "removal-recommendation",
    ],
    forbiddenActions: [
      "new-commits",
      "git-reset",
      "git-clean",
      "branch-delete-without-hg",
      "worktree-remove-without-hg",
      "plane-done",
    ],
    staleThresholdHours: null,
    staleRecommendation: "Removal awaiting CEO/Founder review and explicit HG release",
  },
  removable: {
    label: "removable",
    description: "Cleared for deletion by CEO/Founder; human must execute removal",
    allowedActions: [
      "human-branch-delete",
      "human-worktree-remove",
      "ceo-plane-done",
    ],
    forbiddenActions: [
      "automatic-delete",
      "worker-delete",
      "plane-done-by-worker",
    ],
    staleThresholdHours: null,
    staleRecommendation: "Authorized for deletion; human must execute",
  },
};

export function parseSandboxCreationDate(worktreePath) {
  const dirName = path.basename(String(worktreePath || ""));
  const match = dirName.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) return null;
  const parsed = new Date(`${match[1]}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function deriveSandboxLifecycleState(worktree, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const createdAt = parseSandboxCreationDate(worktree.root);
  const ageHours = createdAt ? (now - createdAt) / (1000 * 60 * 60) : null;

  let state;
  if (worktree.dirty) {
    state = "created";
  } else if (!worktree.branch || worktree.branch === "(detached)") {
    state = "archived";
  } else if (ageHours !== null && ageHours <= 48) {
    // reported stale threshold is 24h; keep in reported until 48h so staleness is observable
    state = "reported";
  } else if (ageHours !== null && ageHours <= 120) {
    // audited stale threshold is 72h; keep in audited until 120h so staleness is observable
    state = "audited";
  } else {
    state = "parked";
  }

  const stateConfig = SANDBOX_LIFECYCLE_STATES[state];
  const staleThreshold = stateConfig.staleThresholdHours;
  const isStale = staleThreshold !== null && ageHours !== null && ageHours > staleThreshold;

  return {
    ...worktree,
    lifecycleState: state,
    createdAt: createdAt ? createdAt.toISOString() : null,
    ageHours: ageHours !== null ? Math.round(ageHours) : null,
    isStale,
    recommendation: isStale ? stateConfig.staleRecommendation : null,
  };
}

export function attachLifecycleStates(sandboxScanResults, options = {}) {
  return sandboxScanResults.map((sandboxRoot) => ({
    ...sandboxRoot,
    worktrees: sandboxRoot.worktrees.map((worktree) =>
      deriveSandboxLifecycleState(worktree, options)
    ),
  }));
}

export function listStaleSandboxes(annotatedSandboxes) {
  return annotatedSandboxes.flatMap((sandboxRoot) =>
    sandboxRoot.worktrees.filter((worktree) => worktree.isStale)
  );
}

function escapeTable(value) {
  return String(value ?? "-").replace(/\|/g, "\\|").replace(/\r?\n/g, " ").trim() || "-";
}

export function renderLifecycleReport(annotatedSandboxes, options = {}) {
  const generatedAt = options.generatedAt || new Date().toISOString();
  const allWorktrees = annotatedSandboxes.flatMap((s) => s.worktrees);
  const stale = allWorktrees.filter((w) => w.isStale);
  const lines = [
    "# Sandbox Lifecycle Report",
    "",
    `Generated: ${generatedAt}`,
    `Total sandbox worktrees: ${allWorktrees.length}`,
    `Stale sandboxes: ${stale.length}`,
    "",
  ];

  if (!allWorktrees.length) {
    lines.push("> No sandbox worktrees found.", "");
    return lines.join("\n");
  }

  lines.push(
    "## Sandbox Worktrees",
    "",
    "| Path | State | Age (h) | Branch | Dirty | Stale | Recommendation |",
    "|---|---|---:|---|---|---|---|",
  );

  for (const w of allWorktrees) {
    lines.push(
      `| \`${escapeTable(w.root)}\` | ${escapeTable(w.lifecycleState)} | ${w.ageHours ?? "—"} | ${escapeTable(w.branch)} | ${w.dirty ? "yes" : "no"} | ${w.isStale ? "**yes**" : "no"} | ${escapeTable(w.recommendation)} |`
    );
  }

  if (stale.length) {
    lines.push("", "## Stale Sandboxes — Action Required", "");
    for (const w of stale) {
      lines.push(
        `### ${w.lifecycleState.toUpperCase()} — \`${w.root}\``,
        "",
        `- State: ${w.lifecycleState}`,
        `- Age: ${w.ageHours}h`,
        `- Branch: ${w.branch || "(detached)"}`,
        `- Recommendation: ${w.recommendation}`,
        "",
      );
    }
  }

  lines.push(
    "## Governance",
    "",
    "- No automatic deletion. Every removal requires an explicit HG-2/HG-3 release and human execution.",
    "- Controllers surface findings; they do not execute cleanup.",
    "- Audit trail: attach this report path to the Plane work item or morning brief.",
    "",
  );

  return lines.join("\n");
}
