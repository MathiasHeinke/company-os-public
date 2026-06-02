import fs from "node:fs";
import path from "node:path";

export const DEPARTMENT_PACK_SCAFFOLD_VERSION = "company-os-department-pack-scaffold/v0";

const VALID_ROLES = new Set(["role:cto", "role:cpo", "role:cmo", "role:coo", "role:cfo", "role:cao"]);

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

function intentId(packId) {
  return `intent.${packId.replace(/-/g, "_")}_setup`;
}

function titleCaseFromSlug(value) {
  return slugify(value)
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function file(relativePath, root, content) {
  return {
    relative_path: relativePath,
    absolute_path: path.join(root, relativePath),
    content: `${content.trimEnd()}\n`,
  };
}

function contract({ name, packId, role, kind, outcome }) {
  return [
    `# Company.OS ${name} ${titleCaseFromSlug(kind)} Worker Contract`,
    "",
    "Use this template for a generated department capability pack worker lane.",
    "",
    "```yaml",
    `role: ${role}`,
    `parent_seat: ${role}`,
    "agent: claude",
    kind === "parent" ? "mode: plan" : kind === "research" ? "mode: research" : "mode: implement",
    "workspace: registry:company-os",
    "dispatch: manual",
    "source_of_truth:",
    `  - \${COMPANY_OS_ROOT}/docs/orchestration/company-os-${packId}-department-pack-v0.md`,
    "  - ${COMPANY_OS_ROOT}/docs/templates/company-os-department-capability-pack.md",
    "acceptance_criteria:",
    `  - ${outcome}`,
    "  - Report exact blockers instead of claiming completion from partial output.",
    "gates:",
    "  - node scripts/orchestration/worker-ledger-validator.mjs --examples",
    "  - node scripts/orchestration/company-os-department-pack-evaluator.mjs --pack-id ${PACK_ID} --json",
    "human_gate: HG-2",
    "reporting: Plane worker.reported with changed files, evidence paths, gate results, blockers, reflection and learning_proposals.",
    "BlockedActions: do not read secrets; do not write production systems; do not publish, send, schedule or spend; do not mark Plane Done.",
    "CapabilityProfile: claude-clevel-worker/cto/department-capability-pack-creator",
    "OutcomeSpec: Produce one verifiable department capability pack artifact or a blocker report.",
    "OutcomeRubric: PASS only when the declared artifact exists, gates pass and blocked actions remain forbidden.",
    "ReflectionPolicy: required",
    "LearningProposalPolicy: required",
    "```",
  ].join("\n").replaceAll("${PACK_ID}", packId);
}

function departmentPack({ name, packId, ownerRole, clientDomain }) {
  return [
    `# Company.OS ${name} Department Pack v0`,
    "",
    "Status: scaffolded guided-pilot template",
    "Use for: creating a reusable department capability pack with explicit SOP, worker contracts, capability boundaries, gates and learning loop.",
    "",
    "## Purpose",
    "",
    `${name} supports the ${clientDomain} domain as a guided Company.OS department pack. It starts as draft-only and cannot perform public, production, spend or scheduling actions without HumanGate release.`,
    "",
    "## Trigger / Intent",
    "",
    "```yaml",
    `intent_id: ${intentId(packId)}`,
    "trigger_phrases:",
    `  - set up ${name}`,
    `  - build a ${name} department`,
    "first_safe_scope: guided setup packet, parent contract and child contract drafts",
    "```",
    "",
    "## Founder Intake",
    "",
    "- company, offer, buyer and primary user",
    "- current systems and source-of-truth artifacts",
    "- approval owner",
    "- off-limits claims, actions and data",
    "- desired cadence and success signal",
    "",
    "## CEO Delegation Packet",
    "",
    "```yaml",
    `objective: Create the ${name} guided department capability pack.`,
    "recommended_release_band: guided alpha",
    "source_of_truth:",
    "  - ${COMPANY_OS_ROOT}/docs/templates/company-os-department-capability-pack.md",
    `owner_role: ${ownerRole}`,
    "human_gate: HG-2.5",
    "blocked_actions:",
    "  - no production write without release card",
    "  - no public publish/send/schedule without release card",
    "  - no secret read",
    "  - no Plane Done transition by worker or CAO",
    "```",
    "",
    "## C-Level Parent Contract",
    "",
    "Use the generated parent worker contract template. Keep `dispatch: manual` until Stage 0.5 and Stage 0.65 pass.",
    "",
    "## Child Worker Contract List",
    "",
    "- parent setup and scope synthesis",
    "- research/current-state audit",
    "- draft artifact production",
    "- CAO/controller evaluation packet",
    "",
    "## CapabilityProfile Requirements",
    "",
    "Use `claude-clevel-worker/cto/department-capability-pack-creator` unless a narrower role-specific profile is approved.",
    "",
    "## Allowed / Forbidden Surfaces",
    "",
    "Allowed: docs, templates, local reports, dry-run evidence and proposal-only learning notes.",
    "Forbidden: secrets, production writes, public publish/send/schedule/spend, connector expansion and Done transitions.",
    "",
    "## HumanGates",
    "",
    "- HG-2 setup artifacts",
    "- HG-2.5 bounded pack promotion",
    "- HG-3 critical reversible scheduler/runtime authority",
    "- HG-4 strategic or non-restorable authority",
    "",
    "## Quality Gates",
    "",
    "- worker contract parseability",
    "- capability profile registration",
    "- private/source literal scan",
    "- deterministic evaluator scorecard",
    "",
    "## Evidence Artifacts",
    "",
    `- reports/examples/${packId}-pack/README.example.md`,
    `- reports/examples/department-pack-creator/${packId}-evaluation.example.md`,
    "",
    "## Learning Loop",
    "",
    "Workers may propose SOP, skill, harness or rubric improvements. CAO/controller review is required before the pack self-modifies or expands authority.",
    "",
    "## Autonomy Promotion Path",
    "",
    "L0 inspect -> L1 draft -> L2 dry-run -> L2.5 bounded promotion -> L3 critical reversible runtime after proof history -> L4 Founder decision.",
    "",
    "## 10/10 Evaluation Rubric",
    "",
    "Use `${COMPANY_OS_ROOT}/docs/templates/company-os-capability-pack-eval-rubric.md`.",
  ].join("\n");
}

function kitSetup({ name, packId }) {
  return [
    `# ${name} Setup`,
    "",
    "Status: installable guided-pilot runbook",
    "",
    "## Setup Loop",
    "",
    "1. Confirm company, offer, buyer, user and approval owner.",
    "2. Inventory existing systems and source-of-truth artifacts.",
    "3. Capture off-limits actions, data and claims.",
    "4. Draft Department Intent Packet.",
    "5. Draft CEO Delegation Packet.",
    "6. Draft parent and child worker contracts with `dispatch: manual`.",
    "7. Run quality and capability-pack evaluator gates.",
    "8. Keep public, production and scheduler actions blocked until HumanGate release.",
    "",
    "## First Artifacts",
    "",
    `- ${packId}-department-context.md`,
    `- ${packId}-setup-checklist.md`,
    `- ${packId}-parent-worker-contract.md`,
    `- ${packId}-evaluation-scorecard.md`,
    "",
    "## Default Boundary",
    "",
    "Draft-only. No production write, public action, spend, secret read, scheduler activation or Plane Done transition.",
  ].join("\n");
}

function workflow({ name, packId }) {
  return [
    `# ${name} Department Setup Workflow`,
    "",
    "Use this workflow when a founder, CEO or operator asks Company.OS to set up this department capability.",
    "",
    "## Purpose",
    "",
    "Turn messy founder intent into a Department Intent Packet, CEO Delegation Packet, parent contract and manual child worker contracts.",
    "",
    "## Sources",
    "",
    "- docs/templates/company-os-department-capability-pack.md",
    "- docs/templates/company-os-domain-pack-template.md",
    "- docs/templates/company-os-capability-pack-eval-rubric.md",
    `- docs/orchestration/company-os-${packId}-department-pack-v0.md`,
    "",
    "## Output",
    "",
    "1. My read",
    "2. What I need to challenge",
    "3. Department Intent Packet",
    "4. CEO Delegation Packet",
    "5. Draft C-Level parent",
    "6. Draft child worker contracts",
    "7. Capability boundaries",
    "8. 10/10 evaluation rubric",
    "9. First Founder/CEO decision needed",
    "",
    "## Stop Rules",
    "",
    "- Do not dispatch workers.",
    "- Do not request secrets.",
    "- Do not publish, send, schedule or spend.",
    "- Do not write production systems.",
    "- Do not mark Plane Done.",
  ].join("\n");
}

function aionSkill({ name, packId }) {
  return [
    `# AionUI / Hermes ${name} Skill`,
    "",
    "Status: generated EVE skill contract seed",
    "",
    "## Skill Id",
    "",
    "```text",
    intentId(packId),
    "```",
    "",
    "## EVE Behavior",
    "",
    "EVE inspects before asking, challenges weak assumptions and returns CEO-ready packets instead of starting work directly.",
    "",
    "## Required Output",
    "",
    "1. My read",
    "2. What I need to challenge",
    "3. Department Intent Packet",
    "4. CEO Delegation Packet",
    "5. Draft C-Level parent",
    "6. Draft child worker contracts",
    "7. Capability boundaries",
    "8. 10/10 evaluation rubric",
    "9. First Founder/CEO decision needed",
    "",
    "## Blocked Actions",
    "",
    "- direct Plane writes",
    "- worker dispatch",
    "- production writes",
    "- public publish/send/schedule/spend",
    "- secret or browser-storage reads",
    "- HG-4 approval",
  ].join("\n");
}

function report({ name, packId, date }) {
  return [
    `# Department Capability Pack Scaffold - ${name}`,
    "",
    `Date: ${date}`,
    `Pack ID: ${packId}`,
    "Status: scaffolded",
    "",
    "## 10/10 Evaluation Required",
    "",
    "This scaffold is not production-ready until the Department Capability Pack Evaluator scores all ten disciplines at 10/10 or records an evidence-backed justified gap.",
    "",
    "## Generated Surfaces",
    "",
    "- Department SOP / Pack",
    "- Kit domain setup runbook",
    "- Agent workflow",
    "- AionUI/Hermes skill seed",
    "- Parent/research/draft worker contracts",
    "- Example scaffold report",
    "",
    "## Blocked Actions",
    "",
    "- no worker dispatch",
    "- no public or production action",
    "- no secret read",
    "- no Plane Done transition",
  ].join("\n");
}

export function validateDepartmentPackInput(input = {}) {
  const packId = slugify(input.packId);
  if (!packId) throw new Error("packId is required");
  if (!compact(input.name)) throw new Error("name is required");
  if (!VALID_ROLES.has(compact(input.ownerRole))) throw new Error("ownerRole must be role:cto, role:cpo, role:cmo, role:coo, role:cfo or role:cao");
  if (!slugify(input.clientDomain)) throw new Error("clientDomain is required");
  return {
    root: path.resolve(input.root || process.cwd()),
    packId,
    name: compact(input.name),
    ownerRole: compact(input.ownerRole),
    clientDomain: slugify(input.clientDomain),
    date: compact(input.date) || new Date().toISOString().slice(0, 10),
  };
}

export function buildDepartmentPackScaffold(input = {}) {
  const normalized = validateDepartmentPackInput(input);
  const { root, packId, name, ownerRole, clientDomain, date } = normalized;
  const files = [
    file(`docs/orchestration/company-os-${packId}-department-pack-v0.md`, root, departmentPack({ name, packId, ownerRole, clientDomain })),
    file(`kits/company-os-kit/.company-os/domain-packs/${packId}/setup.md`, root, kitSetup({ name, packId })),
    file(`kits/company-os-kit/.agents/workflows/${packId}-setup.md`, root, workflow({ name, packId })),
    file(`docs/integrations/aionui-hermes-${packId}-skill.md`, root, aionSkill({ name, packId })),
    file(`docs/templates/company-os-${packId}-parent-worker-contract.md`, root, contract({ name, packId, role: ownerRole, kind: "parent", outcome: `${name} parent setup packet exists with child lanes and blocked actions.` })),
    file(`docs/templates/company-os-${packId}-research-worker-contract.md`, root, contract({ name, packId, role: ownerRole, kind: "research", outcome: `${name} current-state research report exists with cited evidence and uncertainties.` })),
    file(`docs/templates/company-os-${packId}-draft-worker-contract.md`, root, contract({ name, packId, role: ownerRole, kind: "draft", outcome: `${name} draft artifact exists and is evaluated against the 10/10 rubric.` })),
    file(`reports/examples/${packId}-pack/README.example.md`, root, report({ name, packId, date })),
  ];
  return {
    version: DEPARTMENT_PACK_SCAFFOLD_VERSION,
    generated_at: `${date}T00:00:00.000Z`,
    date,
    root,
    pack_id: packId,
    name,
    owner_role: ownerRole,
    client_domain: clientDomain,
    files,
  };
}

export function writeDepartmentPackScaffold(scaffold) {
  if (!scaffold?.files?.length) throw new Error("scaffold.files is required");
  const written = [];
  for (const entry of scaffold.files) {
    fs.mkdirSync(path.dirname(entry.absolute_path), { recursive: true });
    fs.writeFileSync(entry.absolute_path, entry.content);
    written.push(entry.absolute_path);
  }
  return { written };
}
