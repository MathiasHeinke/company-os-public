import fs from "node:fs";
import path from "node:path";

export const DEPARTMENT_PACK_EVALUATOR_VERSION = "company-os-department-pack-evaluator/v0";

export const DISCIPLINES = Object.freeze([
  "Founder Intent Fit",
  "Department SOP",
  "Parent/Child Contracts",
  "Capability Boundary",
  "Quality Gates",
  "EVE/AionUI/Hermes UX",
  "Learning Loop",
  "Portability",
  "Autonomy Promotion",
  "Evidence Completeness",
]);

const PRIVATE_LITERAL_PATTERNS = Object.freeze([
  /\/Users\/[^/\s]+/i,
  /\b(?:ATLAS|ARES|bio-os)\b/i,
  /\bsk-[A-Za-z0-9._-]{20,}\b/,
  /\bsk-or-v1-[A-Za-z0-9._-]+\b/,
]);

function compact(value) {
  return String(value ?? "").trim();
}

function slugify(value) {
  return compact(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function exists(filePath) {
  return Boolean(filePath) && fs.existsSync(filePath);
}

function readIfExists(filePath) {
  return exists(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function check(condition, id, message, details = {}) {
  return { status: condition ? "pass" : "block", id, message, details };
}

function disciplineCheck(condition, discipline, id, message, details = {}) {
  return check(condition, id, message, { ...details, disciplines: [discipline] });
}

function packPaths(root, packId, date) {
  return {
    department_pack: path.join(root, `docs/orchestration/company-os-${packId}-department-pack-v0.md`),
    kit_setup: path.join(root, `kits/company-os-kit/.company-os/domain-packs/${packId}/setup.md`),
    workflow: path.join(root, `kits/company-os-kit/.agents/workflows/${packId}-setup.md`),
    eve_skill: path.join(root, `docs/integrations/aionui-hermes-${packId}-skill.md`),
    parent_contract: path.join(root, `docs/templates/company-os-${packId}-parent-worker-contract.md`),
    research_contract: path.join(root, `docs/templates/company-os-${packId}-research-worker-contract.md`),
    draft_contract: path.join(root, `docs/templates/company-os-${packId}-draft-worker-contract.md`),
    scaffold_report: path.join(root, `reports/examples/${packId}-pack/README.example.md`),
    evaluation_example: path.join(root, `reports/examples/department-pack-creator/${packId}-evaluation.example.md`),
    capability_registry: path.join(root, "registries/capabilities/company-os.json"),
    output_dir: path.join(root, "reports/examples/department-pack-creator", date),
    markdown: path.join(root, "reports/examples/department-pack-creator", date, `${packId}-evaluation.example.md`),
    json: path.join(root, "reports/examples/department-pack-creator", date, `${packId}-evaluation.example.json`),
  };
}

function artifactChecks(paths) {
  const entries = [
    ["department_pack", paths.department_pack, "artifact.department_pack_missing", "Department pack SOP is present."],
    ["kit_setup", paths.kit_setup, "artifact.kit_setup_missing", "Kit setup runbook is present."],
    ["workflow", paths.workflow, "artifact.workflow_missing", "Agent workflow is present."],
    ["eve_skill", paths.eve_skill, "artifact.eve_skill_missing", "EVE/Hermes skill is present."],
    ["parent_contract", paths.parent_contract, "artifact.worker_contract_missing", "Parent worker contract is present."],
    ["research_contract", paths.research_contract, "artifact.worker_contract_missing", "Research worker contract is present."],
    ["draft_contract", paths.draft_contract, "artifact.worker_contract_missing", "Draft worker contract is present."],
    ["scaffold_report", paths.scaffold_report, "artifact.scaffold_report_missing", "Scaffold report is present."],
  ];
  return entries.map(([key, filePath, id, message]) => check(exists(filePath), id, message, { key, path: filePath }));
}

function contractChecks(paths) {
  return [paths.parent_contract, paths.research_contract, paths.draft_contract].flatMap((contractPath) => {
    const text = readIfExists(contractPath);
    return [
      check(/```yaml\nrole: role:/m.test(text), "contract.flat_yaml", "Contract contains a flat yaml fence with role.", { path: contractPath }),
      check(/\nsource_of_truth:\n\s+- /.test(text), "contract.source_of_truth", "Contract declares source_of_truth.", { path: contractPath }),
      check(/\nacceptance_criteria:\n\s+- /.test(text), "contract.acceptance", "Contract declares acceptance_criteria.", { path: contractPath }),
      check(/\ngates:\n\s+- /.test(text), "contract.gates", "Contract declares gates.", { path: contractPath }),
      check(/ReflectionPolicy: required/.test(text), "contract.reflection", "Contract requires reflection.", { path: contractPath }),
      check(/LearningProposalPolicy: required/.test(text), "contract.learning", "Contract requires learning proposals.", { path: contractPath }),
    ];
  });
}

function semanticChecks(paths) {
  const department = readIfExists(paths.department_pack);
  const kit = readIfExists(paths.kit_setup);
  const workflowText = readIfExists(paths.workflow);
  const eveSkill = readIfExists(paths.eve_skill);
  const contracts = [
    readIfExists(paths.parent_contract),
    readIfExists(paths.research_contract),
    readIfExists(paths.draft_contract),
  ].join("\n");
  const allText = [department, kit, workflowText, eveSkill, contracts].join("\n");

  return [
    disciplineCheck(
      /## Founder Intake/.test(department)
        && /## CEO Delegation Packet/.test(department)
        && /## Trigger \/ Intent/.test(department)
        && /Department Intent Packet/.test(workflowText),
      "Founder Intent Fit",
      "semantic.founder_intent",
      "Pack captures founder intent, trigger and CEO delegation shape.",
      { paths: [paths.department_pack, paths.workflow] },
    ),
    disciplineCheck(
      /## Purpose/.test(department)
        && /## Setup Loop/.test(kit)
        && /## Allowed \/ Forbidden Surfaces/.test(department)
        && /## HumanGates/.test(department),
      "Department SOP",
      "semantic.department_sop",
      "Pack includes department purpose, setup loop, boundaries and HumanGates.",
      { paths: [paths.department_pack, paths.kit_setup] },
    ),
    disciplineCheck(
      /parent_seat:/.test(contracts)
        && /dispatch: manual/.test(contracts)
        && /source_of_truth:/.test(contracts)
        && /acceptance_criteria:/.test(contracts)
        && /gates:/.test(contracts),
      "Parent/Child Contracts",
      "semantic.parent_child_contracts",
      "Parent and child contracts carry seat, dispatch, source, acceptance and gate fields.",
      { paths: [paths.parent_contract, paths.research_contract, paths.draft_contract] },
    ),
    disciplineCheck(
      /## CapabilityProfile Requirements/.test(department)
        && /CapabilityProfile: claude-clevel-worker\/[a-z]+\/[a-z0-9-]+/.test(contracts)
        && /BlockedActions:/.test(contracts)
        && /Forbidden:/.test(department),
      "Capability Boundary",
      "semantic.capability_boundary",
      "CapabilityProfile and blocked surfaces are explicit in SOP and worker contracts.",
      { paths: [paths.department_pack, paths.parent_contract, paths.research_contract, paths.draft_contract] },
    ),
    disciplineCheck(
      /worker-ledger-validator\.mjs/.test(contracts)
        && /company-os-department-pack-evaluator\.mjs/.test(contracts)
        && /10\/10 Evaluation Rubric/.test(department)
        && /quality and capability-pack evaluator gates/i.test(kit),
      "Quality Gates",
      "semantic.quality_gates",
      "Pack declares worker-contract validation, pack evaluator and 10/10 rubric gates.",
      { paths: [paths.department_pack, paths.kit_setup, paths.parent_contract, paths.research_contract, paths.draft_contract] },
    ),
    disciplineCheck(
      /## EVE Behavior/.test(eveSkill)
        && /## Required Output/.test(eveSkill)
        && /My read/.test(eveSkill)
        && /What I need to challenge/.test(eveSkill)
        && /CEO Delegation Packet/.test(eveSkill),
      "EVE/AionUI/Hermes UX",
      "semantic.eve_ux",
      "EVE/Hermes skill defines behavior, output shape and challenge posture.",
      { paths: [paths.eve_skill] },
    ),
    disciplineCheck(
      /## Learning Loop/.test(department)
        && /learning_proposals/.test(contracts)
        && /ReflectionPolicy: required/.test(contracts)
        && /LearningProposalPolicy: required/.test(contracts),
      "Learning Loop",
      "semantic.learning_loop",
      "Pack requires reflection and learning proposals before doctrine or authority changes.",
      { paths: [paths.department_pack, paths.parent_contract, paths.research_contract, paths.draft_contract] },
    ),
    disciplineCheck(
      /\$\{COMPANY_OS_ROOT\}/.test(allText)
        && !/\/Users\/[^/\s]+/i.test(allText)
        && !/\b(?:ATLAS|ARES|bio-os)\b/i.test(allText),
      "Portability",
      "semantic.portability",
      "Pack uses portable root placeholders and no source-company literals.",
      { paths: [paths.department_pack, paths.kit_setup, paths.workflow, paths.eve_skill] },
    ),
    disciplineCheck(
      /## Autonomy Promotion Path/.test(department)
        && /L0 inspect/.test(department)
        && /L3 critical reversible runtime/.test(department)
        && /HG-4/.test(department)
        && /dispatch: manual/.test(contracts),
      "Autonomy Promotion",
      "semantic.autonomy_promotion",
      "Autonomy path is staged and keeps generated contracts manual by default.",
      { paths: [paths.department_pack, paths.parent_contract, paths.research_contract, paths.draft_contract] },
    ),
    disciplineCheck(
      /## Evidence Artifacts/.test(department)
        && /reports\/examples\/.+-pack\/README\.example\.md/.test(department)
        && /reports\/examples\/department-pack-creator\//.test(department)
        && exists(paths.scaffold_report),
      "Evidence Completeness",
      "semantic.evidence_completeness",
      "Pack declares evidence artifacts and has a scaffold evidence report.",
      { paths: [paths.department_pack, paths.scaffold_report] },
    ),
  ];
}

function capabilityChecks(paths) {
  if (!exists(paths.capability_registry)) {
    return [check(false, "capability_profile.registry_missing", "Capability registry is present.", { path: paths.capability_registry })];
  }
  let registry;
  try {
    registry = JSON.parse(fs.readFileSync(paths.capability_registry, "utf8"));
  } catch (error) {
    return [check(false, "capability_profile.registry_malformed", "Capability registry parses as JSON.", { error: error.message })];
  }
  const profiles = Array.isArray(registry.profiles) ? registry.profiles : [];
  const contracts = [
    readIfExists(paths.parent_contract),
    readIfExists(paths.research_contract),
    readIfExists(paths.draft_contract),
  ].join("\n");
  const declaredProfileIds = [...new Set(
    [...contracts.matchAll(/CapabilityProfile:\s*([^\s\n]+)/g)].map((match) => match[1].trim()),
  )];
  const selectedProfiles = declaredProfileIds.map((id) => ({
    id,
    profile: profiles.find((entry) => entry.id === id),
  }));
  const missing = selectedProfiles.filter((entry) => !entry.profile).map((entry) => entry.id);
  const forbiddenSets = selectedProfiles
    .filter((entry) => entry.profile)
    .map((entry) => ({ id: entry.id, forbidden: new Set(entry.profile.forbidden_surfaces || []) }));

  function everyProfileBlocks(surface) {
    return forbiddenSets.length > 0 && forbiddenSets.every((entry) => entry.forbidden.has(surface));
  }

  return [
    check(declaredProfileIds.length > 0, "capability_profile.declared", "Worker contracts declare at least one CapabilityProfile.", { declared_profile_ids: declaredProfileIds }),
    check(missing.length === 0 && declaredProfileIds.length > 0, "capability_profile.present", "Declared CapabilityProfiles are registered.", { declared_profile_ids: declaredProfileIds, missing }),
    check(everyProfileBlocks("production-write"), "capability_profile.blocks_production", "CapabilityProfiles block production writes.", { declared_profile_ids: declaredProfileIds }),
    check(everyProfileBlocks("public-publish"), "capability_profile.blocks_public_publish", "CapabilityProfiles block public publish.", { declared_profile_ids: declaredProfileIds }),
    check(everyProfileBlocks("secret-read"), "capability_profile.blocks_secret_read", "CapabilityProfiles block secret reads.", { declared_profile_ids: declaredProfileIds }),
    check(everyProfileBlocks("plane-done-by-worker"), "capability_profile.blocks_done", "CapabilityProfiles block Plane Done by worker.", { declared_profile_ids: declaredProfileIds }),
  ].map((item) => item.id === "capability_profile.present" && item.status === "block" ? { ...item, id: "capability_profile.missing" } : item);
}

function privacyChecks(paths) {
  const scanPaths = [
    paths.department_pack,
    paths.kit_setup,
    paths.workflow,
    paths.eve_skill,
    paths.parent_contract,
    paths.research_contract,
    paths.draft_contract,
  ];
  const hits = [];
  for (const filePath of scanPaths) {
    const text = readIfExists(filePath);
    for (const pattern of PRIVATE_LITERAL_PATTERNS) {
      if (pattern.test(text)) hits.push({ path: filePath, pattern: String(pattern) });
    }
  }
  return [
    check(hits.length === 0, "privacy.private_literal", "Pack contains no private path, source-product or token-shaped literals.", { hits }),
  ];
}

function autonomyChecks(paths) {
  const text = [
    readIfExists(paths.department_pack),
    readIfExists(paths.workflow),
    readIfExists(paths.eve_skill),
  ].join("\n");
  const unsafeDaily = /daily\s+cron[\s\S]{0,80}(?:one green draft|automatically after one)/i.test(text);
  return [
    check(!unsafeDaily, "autonomy.unsafe_daily_claim", "Daily/autonomous action is not enabled from a single draft.", {}),
  ];
}

function statusBoolean(item) {
  return item.status === "pass";
}

function evidencePathExists(paths) {
  return paths.some((filePath) => path.isAbsolute(String(filePath || "")) && fs.existsSync(filePath));
}

function portablePath(value, root) {
  const text = String(value || "");
  if (!path.isAbsolute(text)) return text;
  const relative = path.relative(root, text);
  if (!relative || relative === "") return "${COMPANY_OS_ROOT}";
  if (relative.startsWith("..") || path.isAbsolute(relative)) return text;
  return `\${COMPANY_OS_ROOT}/${relative.split(path.sep).join("/")}`;
}

function portableValue(value, root) {
  if (Array.isArray(value)) return value.map((entry) => portableValue(entry, root));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, portableValue(entry, root)]),
    );
  }
  if (typeof value === "string") return portablePath(value, root);
  return value;
}

export function scoreDepartmentPackDiscipline(name, evidence = {}) {
  const score = Number(evidence.score ?? 10);
  const evidencePaths = Array.isArray(evidence.evidence_paths) ? evidence.evidence_paths : [];
  if (!Number.isFinite(score) || score < 0 || score > 10) {
    return {
      name,
      score: Number.isFinite(score) ? score : null,
      status: "block",
      ok: false,
      blocker: { id: "score.invalid", message: "Score must be between 0 and 10." },
    };
  }
  if (score === 10) return { name, score, status: "pass", ok: true, evidence_paths: evidencePaths };
  if (score < 9) {
    return {
      name,
      score,
      status: "block",
      ok: false,
      evidence_paths: evidencePaths,
      blocker: { id: "score.below_minimum", message: "Score below 9 cannot be justified for release." },
    };
  }
  const completeJustification = Boolean(
    compact(evidence.missing_point)
    && compact(evidence.why_10_is_not_currently_possible)
    && compact(evidence.follow_up_contract)
    && evidencePathExists(evidencePaths),
  );
  return {
    name,
    score,
    status: completeJustification ? "justified_gap" : "block",
    ok: completeJustification,
    evidence_paths: evidencePaths,
    missing_point: compact(evidence.missing_point),
    why_10_is_not_currently_possible: compact(evidence.why_10_is_not_currently_possible),
    follow_up_contract: compact(evidence.follow_up_contract),
    blocker: completeJustification ? null : { id: "score.justification_missing", message: "Non-10 scores require missing point, external constraint, evidence path and follow-up contract." },
  };
}

function disciplineEvidence(paths, checks, disciplineName) {
  const relevant = checks.filter((item) => {
    const disciplines = item.details?.disciplines;
    return !Array.isArray(disciplines) || disciplines.includes(disciplineName);
  });
  const pass = relevant.every(statusBoolean);
  return {
    score: pass ? 10 : 8,
    evidence_paths: Object.values(paths).filter((value) => typeof value === "string" && exists(value)),
  };
}

export function evaluateDepartmentCapabilityPack({
  root = process.cwd(),
  packId,
  date = new Date().toISOString().slice(0, 10),
  rubric = {},
} = {}) {
  const absoluteRoot = path.resolve(root);
  const normalizedPackId = slugify(packId);
  if (!normalizedPackId) throw new Error("packId is required");
  const paths = packPaths(absoluteRoot, normalizedPackId, date);
  const checks = [
    ...artifactChecks(paths),
    ...contractChecks(paths),
    ...semanticChecks(paths),
    ...capabilityChecks(paths),
    ...privacyChecks(paths),
    ...autonomyChecks(paths),
  ];
  const blockers = checks.filter((item) => item.status === "block");
  const disciplines = DISCIPLINES.map((name) => {
    const baseEvidence = disciplineEvidence(paths, checks, name);
    return scoreDepartmentPackDiscipline(name, rubric[name] || baseEvidence);
  });
  const scoreBlockers = disciplines.filter((discipline) => !discipline.ok).map((discipline) => ({
    id: discipline.blocker?.id || "score.blocked",
    message: `${discipline.name}: ${discipline.blocker?.message || "Score blocked."}`,
    details: { discipline: discipline.name, score: discipline.score },
  }));
  const allBlockers = [
    ...blockers.map((item) => ({ id: item.id, message: item.message, details: item.details })),
    ...scoreBlockers,
  ];
  const justifiedGaps = disciplines.filter((discipline) => discipline.status === "justified_gap");
  const status = allBlockers.length ? "BLOCKED" : justifiedGaps.length ? "PASS_WITH_JUSTIFIED_GAP" : "READY";
  const average = disciplines.reduce((sum, discipline) => sum + Number(discipline.score || 0), 0) / disciplines.length;

  return {
    version: DEPARTMENT_PACK_EVALUATOR_VERSION,
    generated_at: `${date}T00:00:00.000Z`,
    date,
    root: absoluteRoot,
    pack_id: normalizedPackId,
    status,
    paths,
    checks,
    blockers: allBlockers,
    disciplines,
    score_summary: {
      average: Number(average.toFixed(2)),
      minimum: Math.min(...disciplines.map((discipline) => discipline.score)),
      justified_gaps: justifiedGaps.length,
    },
  };
}

export function toPortableDepartmentPackEvaluationReport(report) {
  const root = path.resolve(report.root || process.cwd());
  return portableValue(report, root);
}

export function renderDepartmentPackEvaluationMarkdown(report) {
  return [
    `# Department Capability Pack Evaluation - ${report.pack_id}`,
    "",
    `Version: ${report.version}`,
    `Date: ${report.date}`,
    `Status: ${report.status}`,
    `Average Score: ${report.score_summary.average}`,
    "",
    "## Disciplines",
    "",
    "| Discipline | Score | Status |",
    "|---|---:|---|",
    ...report.disciplines.map((discipline) => `| ${discipline.name} | ${discipline.score} | ${discipline.status} |`),
    "",
    "## Blockers",
    "",
    ...(report.blockers.length ? report.blockers.map((blocker) => `- ${blocker.id}: ${blocker.message}`) : ["- none"]),
    "",
    "## Checks",
    "",
    ...report.checks.map((item) => `- ${item.status.toUpperCase()} ${item.id}: ${item.message}`),
    "",
  ].join("\n");
}

export function writeDepartmentPackEvaluation(report) {
  fs.mkdirSync(report.paths.output_dir, { recursive: true });
  fs.writeFileSync(report.paths.markdown, `${renderDepartmentPackEvaluationMarkdown(report)}\n`);
  fs.writeFileSync(report.paths.json, `${JSON.stringify(toPortableDepartmentPackEvaluationReport(report), null, 2)}\n`);
  return { markdown: report.paths.markdown, json: report.paths.json };
}
