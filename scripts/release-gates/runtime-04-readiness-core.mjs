import fs from "node:fs";
import path from "node:path";

export const RUNTIME_04_READINESS_VERSION = "runtime-04-readiness/v0";

export const REQUIRED_RUNTIME_DOCS = [
  "docs/orchestration/company-os-runtime-dispatcher-v1.md",
  "docs/orchestration/runtime-inference-router.md",
  "docs/orchestration/contract-controller.md",
  "docs/orchestration/contract-remediation-router.md",
  "docs/orchestration/headless-worker-runtime-boot-contract.md",
  "docs/orchestration/claude-clevel-worker-runtime.md",
  "docs/orchestration/codex-controller-runtime.md",
  "docs/agents/cao.md",
  "docs/integrations/plane-app-control-plane.md",
  "docs/operations/hard-cron-wrapper.md",
  "docs/operations/runtime-auth-preflight.md",
  "docs/governance/ceo-release-authority.md",
  "docs/governance/fast-lane-flight-doctrine.md",
  "docs/releases/versioning.md",
];

export const REQUIRED_RUNTIME_SCRIPTS = [
  "scripts/orchestration/plane-dispatcher-v0.mjs",
  "scripts/orchestration/contract-controller.mjs",
  "scripts/orchestration/contract-remediation-router.mjs",
  "scripts/orchestration/scheduler-stage-0506.mjs",
  "scripts/orchestration/scheduler-stage-0506-core.mjs",
  "scripts/orchestration/runtime-dispatcher-v1.mjs",
  "scripts/orchestration/runtime-dispatcher-v12-core.mjs",
  "scripts/orchestration/inference-router.mjs",
  "scripts/orchestration/cao-pass.mjs",
  "scripts/orchestration/codex-controller-dryrun.mjs",
  "scripts/capabilities/capability-registry.mjs",
  "scripts/plane/plane-app-token-rotation.mjs",
  "scripts/runtime/hard-cron-wrapper.mjs",
];

export const REQUIRED_RUNTIME_TESTS = [
  "scripts/orchestration/contract-controller.test.mjs",
  "scripts/orchestration/contract-remediation-router.test.mjs",
  "scripts/orchestration/scheduler-stage-0506.test.mjs",
  "scripts/orchestration/scheduler-stage-0506-core.test.mjs",
  "scripts/orchestration/runtime-dispatcher-v1.test.mjs",
  "scripts/orchestration/runtime-dispatcher-v12-core.test.mjs",
  "scripts/orchestration/inference-router.test.mjs",
  "scripts/orchestration/cao-pass.test.mjs",
  "scripts/orchestration/codex-controller-dryrun.test.mjs",
  "scripts/capabilities/capability-registry-core.test.mjs",
  "scripts/plane/plane-app-token-rotation-core.test.mjs",
];

function exists(root, relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function listFiles(root, predicate, base = root) {
  if (!fs.existsSync(root)) return [];
  const entries = fs.readdirSync(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      files.push(...listFiles(absolute, predicate, base));
    } else if (predicate(absolute, entry)) {
      files.push(path.relative(base, absolute));
    }
  }
  return files.sort();
}

function pushCheck(checks, status, id, message, details = {}) {
  checks.push({ status, id, message, details });
}

function reportHasPassRuntimeEvidence(text) {
  return /\|\s*state\s*\|\s*PASS\s*\|/i.test(text)
    && /stream_health\s*\|\s*PASS/i.test(text)
    && /auth:\s*PASS/i.test(text)
    && /capability_profile:\s*PASS/i.test(text)
    && /artifact_paths:\s*PASS/i.test(text)
    && /(worker\.run-summary|worker\.reported)/i.test(text);
}

function reportHasControllerEvidence(text) {
  return /(controller\.decision|Codex controller).*AUTO-GO/is.test(text)
    || /AUTO-GO.*(controller\.decision|Codex controller)/is.test(text);
}

function reportHasCaoEvidence(text) {
  return /(CAO|controller\.verdict).*PASS/is.test(text)
    || /PASS.*(CAO|controller\.verdict)/is.test(text);
}

function reportHasHardCronSuccess(text, relativePath = "") {
  if (relativePath.endsWith(".json")) {
    try {
      const parsed = JSON.parse(text);
      return parsed?.ok === true || parsed?.status === "success";
    } catch {
      return false;
    }
  }
  return /^Status:\s*`success`/im.test(text) || /^OK:\s*`true`/im.test(text);
}

export function collectRuntime04Evidence({ root = process.cwd() } = {}) {
  const resolvedRoot = path.resolve(root);
  const runtimeReportFiles = [
    ...listFiles(path.join(resolvedRoot, "reports/runtime-pilots"), (absolute) => absolute.endsWith(".md"), resolvedRoot),
    ...listFiles(path.join(resolvedRoot, "reports/runs"), (absolute) => absolute.endsWith(".md"), resolvedRoot),
  ];
  const schedulerReportFiles = listFiles(
    path.join(resolvedRoot, "reports/runtime-auth"),
    (absolute) => /hard-cron\.(md|json)$/.test(absolute),
    resolvedRoot,
  );

  const runtimePassReports = [];
  const runtimeControllerReports = [];
  const runtimeCaoReports = [];
  for (const relativePath of runtimeReportFiles) {
    const text = readText(path.join(resolvedRoot, relativePath));
    if (reportHasPassRuntimeEvidence(text)) runtimePassReports.push(relativePath);
    if (reportHasControllerEvidence(text)) runtimeControllerReports.push(relativePath);
    if (reportHasCaoEvidence(text)) runtimeCaoReports.push(relativePath);
  }

  const schedulerSuccessReports = [];
  for (const relativePath of schedulerReportFiles) {
    const text = readText(path.join(resolvedRoot, relativePath));
    if (reportHasHardCronSuccess(text, relativePath)) schedulerSuccessReports.push(relativePath);
  }

  return {
    runtime_reports_scanned: runtimeReportFiles.length,
    scheduler_reports_scanned: schedulerReportFiles.length,
    runtime_pass_reports: runtimePassReports,
    runtime_cao_reports: runtimeCaoReports,
    runtime_controller_reports: runtimeControllerReports,
    scheduler_success_reports: schedulerSuccessReports,
  };
}

export function evaluateRuntime04Readiness({
  root = process.cwd(),
  minRuntimePassReports = 1,
  minSchedulerSuccessReports = 3,
} = {}) {
  const resolvedRoot = path.resolve(root);
  const checks = [];

  for (const doc of REQUIRED_RUNTIME_DOCS) {
    pushCheck(
      checks,
      exists(resolvedRoot, doc) ? "pass" : "block",
      "runtime04.docs.required",
      exists(resolvedRoot, doc) ? `Required runtime doc exists: ${doc}` : `Required runtime doc missing: ${doc}`,
      { path: doc },
    );
  }

  for (const script of REQUIRED_RUNTIME_SCRIPTS) {
    pushCheck(
      checks,
      exists(resolvedRoot, script) ? "pass" : "block",
      "runtime04.scripts.required",
      exists(resolvedRoot, script) ? `Required runtime script exists: ${script}` : `Required runtime script missing: ${script}`,
      { path: script },
    );
  }

  for (const testFile of REQUIRED_RUNTIME_TESTS) {
    pushCheck(
      checks,
      exists(resolvedRoot, testFile) ? "pass" : "block",
      "runtime04.tests.required",
      exists(resolvedRoot, testFile) ? `Required runtime test exists: ${testFile}` : `Required runtime test missing: ${testFile}`,
      { path: testFile },
    );
  }

  const evidence = collectRuntime04Evidence({ root: resolvedRoot });
  pushCheck(
    checks,
    evidence.runtime_pass_reports.length >= minRuntimePassReports ? "pass" : "block",
    "runtime04.evidence.runtime-pass",
    `Runtime PASS reports: ${evidence.runtime_pass_reports.length}/${minRuntimePassReports}`,
    { reports: evidence.runtime_pass_reports },
  );
  pushCheck(
    checks,
    evidence.runtime_cao_reports.length >= minRuntimePassReports ? "pass" : "block",
    "runtime04.evidence.cao-pass",
    `Runtime reports with CAO PASS evidence: ${evidence.runtime_cao_reports.length}/${minRuntimePassReports}`,
    { reports: evidence.runtime_cao_reports },
  );
  pushCheck(
    checks,
    evidence.runtime_controller_reports.length >= minRuntimePassReports ? "pass" : "block",
    "runtime04.evidence.controller-autogo",
    `Runtime reports with controller AUTO-GO evidence: ${evidence.runtime_controller_reports.length}/${minRuntimePassReports}`,
    { reports: evidence.runtime_controller_reports },
  );
  pushCheck(
    checks,
    evidence.scheduler_success_reports.length >= minSchedulerSuccessReports ? "pass" : "block",
    "runtime04.evidence.scheduler-success",
    `Successful hard-cron/scheduler reports: ${evidence.scheduler_success_reports.length}/${minSchedulerSuccessReports}`,
    { reports: evidence.scheduler_success_reports },
  );

  const versioning = exists(resolvedRoot, "docs/releases/versioning.md")
    ? readText(path.join(resolvedRoot, "docs/releases/versioning.md"))
    : "";
  pushCheck(
    checks,
    /Stage 7 \/ 9 proven, Stage 8-9 gated/.test(versioning) ? "pass" : "warn",
    "runtime04.versioning.stage-label",
    "Versioning doc should state current runtime buildout stage",
  );

  const blockers = checks.filter((check) => check.status === "block");
  const warnings = checks.filter((check) => check.status === "warn");
  const rcReady = blockers.filter((check) => check.id !== "runtime04.evidence.scheduler-success").length === 0;
  const alphaReady = blockers.length === 0;
  return {
    version: RUNTIME_04_READINESS_VERSION,
    root: resolvedRoot,
    status: alphaReady ? "alpha-ready" : rcReady ? "rc-ready" : "blocked",
    ok: alphaReady,
    rc_ready: rcReady,
    alpha_ready: alphaReady,
    min_runtime_pass_reports: minRuntimePassReports,
    min_scheduler_success_reports: minSchedulerSuccessReports,
    blocker_count: blockers.length,
    warning_count: warnings.length,
    blockers,
    warnings,
    evidence,
    checks,
  };
}

export function renderRuntime04ReadinessMarkdown(result) {
  const lines = [
    "# Company.OS 0.4 Runtime Readiness Gate",
    "",
    `Status: **${result.status.toUpperCase()}**`,
    `Root: \`${result.root}\``,
    `RC ready: \`${result.rc_ready}\``,
    `Alpha ready: \`${result.alpha_ready}\``,
    `Blockers: ${result.blocker_count}`,
    `Warnings: ${result.warning_count}`,
    "",
    "## Evidence",
    "",
    `- Runtime PASS reports: ${result.evidence.runtime_pass_reports.length}/${result.min_runtime_pass_reports}`,
    `- Runtime CAO PASS reports: ${result.evidence.runtime_cao_reports.length}/${result.min_runtime_pass_reports}`,
    `- Runtime controller AUTO-GO reports: ${result.evidence.runtime_controller_reports.length}/${result.min_runtime_pass_reports}`,
    `- Scheduler success reports: ${result.evidence.scheduler_success_reports.length}/${result.min_scheduler_success_reports}`,
    "",
    "## Blockers",
    "",
  ];
  if (!result.blockers.length) lines.push("- none");
  for (const blocker of result.blockers) lines.push(`- \`${blocker.id}\`: ${blocker.message}`);

  lines.push("", "## Warnings", "");
  if (!result.warnings.length) lines.push("- none");
  for (const warning of result.warnings) lines.push(`- \`${warning.id}\`: ${warning.message}`);

  lines.push("", "## Checks", "");
  for (const check of result.checks) lines.push(`- ${check.status.toUpperCase()} \`${check.id}\`: ${check.message}`);

  return `${lines.join("\n")}\n`;
}
