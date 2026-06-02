import fs from "node:fs";
import path from "node:path";

import { buildIntakeMaterializationInput } from "../goal/intake-to-plane-core.mjs";

export const FIRST_COMPANY_PACKET_VERSION = "first-company-packet/v0";
export const EVE_BOOT_PACKET_VERSION = "eve-boot-packet/v0";

export const DEFAULT_FOUNDER_OFFLINE_TEST = Object.freeze({
  id: "founder-offline-test",
  name: "Founder Offline Test",
  mission: "Move the company toward a state where the Founder can turn off phone and laptop for 14 days while the company continues to earn, operate, ship, support customers, monitor risks, prepare decisions and protect the Founder's body and life.",
  decision_filter: "Does this move the company closer to the Founder Offline Test without bypassing Founder authority, HumanGates or the company safety model?",
  target_state: [
    "recurring operating work continues without constant Founder attention",
    "revenue, sales, support, content, bugfixing, follow-ups, monitoring, reporting and preparation keep moving through Company.OS",
    "Founder sees crisp review packets instead of raw operational noise",
    "health/life protection prevents the Founder from becoming the company's hidden battery",
  ],
  hard_boundaries: [
    "HG-4 remains Founder-owned",
    "no strategic, non-restorable, legal, capital, public-voice, medical or major reputation decision executes autonomously",
    "EVE reduces Founder dependency without replacing Founder authority",
  ],
});

const PACK_ALIASES = new Map([
  ["marketing", "marketing-outreach"],
  ["growth", "marketing-outreach"],
  ["outreach", "marketing-outreach"],
  ["marketing-outreach", "marketing-outreach"],
  ["content", "content-engine"],
  ["content-engine", "content-engine"],
  ["sales", "sales-crm"],
  ["crm", "sales-crm"],
  ["sales-crm", "sales-crm"],
  ["support", "customer-support"],
  ["customer-support", "customer-support"],
  ["finance", "finance-ops"],
  ["finance-ops", "finance-ops"],
  ["hiring", "hiring"],
  ["recruiting", "hiring"],
  ["product", "product-discovery"],
  ["product-discovery", "product-discovery"],
  ["print", "print-magazine"],
  ["print-magazine", "print-magazine"],
]);

function compact(value) {
  return String(value ?? "").trim();
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value.map(compact).filter(Boolean) : [compact(value)].filter(Boolean);
}

function slug(value) {
  return compact(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "company";
}

function resolveDate(value) {
  const text = compact(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  return new Date().toISOString().slice(0, 10);
}

function dateToIso(date) {
  return `${date}T00:00:00.000Z`;
}

export function resolvePackId(value) {
  const normalized = compact(value).toLowerCase();
  return PACK_ALIASES.get(normalized) || normalized || "marketing-outreach";
}

export function buildIntakeRecord(input = {}, { date } = {}) {
  const company = input.company || {};
  const eve = input.eve_onboarding || {};
  const existing = input.existing_systems || eve.existing_systems || {};
  const firstPack = resolvePackId(input.first_department || input.first_pack || input.first_wedge);
  const confirmedAt = compact(input.confirmed_at) || dateToIso(resolveDate(date));
  const approvalOwner = compact(input.approval_owner || company.human_gate_owner || company.founder_ceo);
  return {
    confirmed_at: confirmedAt,
    record_path: ".company-os/onboarding/intake-record.json",
    workspace: compact(input.workspace) || "registry:company-os",
    approval_owner: approvalOwner,
    company: {
      name: compact(company.name),
      website: compact(company.website || company.domain),
      domain: compact(company.domain || company.website),
      industry: compact(company.industry),
      stage: compact(company.stage),
      primary_offer: compact(company.primary_offer || input.primary_offer),
      revenue_model: compact(company.revenue_model || input.revenue_model),
      founder_ceo: compact(company.founder_ceo || input.founder_ceo),
      confidence: "confirmed",
      last_verified: compact(input.last_verified) || confirmedAt,
    },
    operating_state: {
      approval_owner: approvalOwner,
      execution_ledger: compact(input.execution_ledger) || "Plane",
      knowledge_base: compact(input.knowledge_base),
      crm: compact(input.crm),
      analytics: compact(input.analytics),
      ai_tools: asArray(input.ai_tools),
      bottlenecks: asArray(input.bottlenecks),
      founder_memory_dependencies: asArray(input.founder_memory_dependencies),
    },
    existing_systems: {
      discovery_status: compact(existing.discovery_status) || "pending",
      active_ledger: compact(existing.active_ledger || input.execution_ledger),
      execution_ledgers: asArray(existing.execution_ledgers || input.existing_execution_ledgers || input.execution_ledger),
      task_sources_to_review: asArray(existing.task_sources_to_review || input.existing_task_sources),
      roles_and_people_sources: asArray(existing.roles_and_people_sources || input.roles_and_people_sources),
      connected_tools: asArray(existing.connected_tools || input.connected_tools),
      already_available: asArray(existing.already_available || input.already_available_tools),
      missing_or_blocked: asArray(existing.missing_or_blocked || input.missing_tools),
      adoption_policy: compact(existing.adoption_policy) || "adapt_existing_first",
      import_policy: compact(existing.import_policy) || "read-only inventory before migration or duplication",
      conflict_policy: compact(existing.conflict_policy) || "map existing tasks and roles before creating new Company.OS work",
    },
    market: {
      buyer: compact(input.buyer),
      why_now: compact(input.why_now),
      sales_motion: compact(input.sales_motion),
      current_behavior: compact(input.current_behavior),
      competitors: asArray(input.competitors),
      wedge: compact(input.wedge || input.first_department || input.first_pack),
    },
    data: {
      sensitivity: compact(input.data_sensitivity || input.sensitive_data_class || "internal"),
      no_go_zones: asArray(input.known_no_go_zones || input.no_go_zones),
      blocked_actions: asArray(input.blocked_actions),
    },
    eve_onboarding: {
      role: "chief-of-staff-onboarding",
      boot_packet_path: ".company-os/onboarding/eve-boot-packet.json",
      setup_mode: compact(eve.setup_mode) || "guided",
      initialization: {
        greeting_identity: compact(eve.greeting_identity) || "Command EVE",
        inventory_existing_systems: eve.inventory_existing_systems !== false,
        adapt_existing_systems_first: eve.adapt_existing_systems_first !== false,
        create_new_ledger_only_if_missing: eve.create_new_ledger_only_if_missing !== false,
      },
      soul_sources: asArray(eve.soul_sources).length
        ? asArray(eve.soul_sources)
        : [
          ".company-os/eve/SOUL.md",
          "docs/operations/eve-soul-boot-contract.md",
          "docs/operations/eve-founder-intent-operating-layer.md",
          "docs/operations/command-eve-founder-offline-readiness.md",
          "docs/integrations/aionui-hermes-eve-portable-bootstrap.md",
        ],
      north_star: DEFAULT_FOUNDER_OFFLINE_TEST,
      founder_model: {
        decision_style: compact(eve.decision_style || input.founder_decision_style),
        communication_notes: compact(eve.communication_notes || input.founder_communication_notes),
        preferences: asArray(eve.preferences || input.founder_preferences),
        refusal_patterns: asArray(eve.refusal_patterns || input.founder_refusal_patterns),
        taste_notes: asArray(eve.taste_notes || input.founder_taste_notes),
      },
      setup_assistance: {
        accounts_to_connect: asArray(eve.accounts_to_connect || input.required_accounts),
        websites_to_open: asArray(eve.websites_to_open || input.setup_websites),
        permissions_needed: asArray(eve.permissions_needed || input.permissions_needed),
        tools_to_install: asArray(eve.tools_to_install || input.tools_to_install),
        skills_or_workflows_requested: asArray(eve.skills_or_workflows_requested || input.skills_or_workflows_requested),
      },
      first_goals: asArray(eve.first_goals || input.first_goals),
      memory_policy: {
        allowed_sources: asArray(eve.allowed_memory_sources || input.allowed_memory_sources),
        forbidden_sources: asArray(eve.forbidden_memory_sources || input.forbidden_memory_sources),
        save_requires_confirmation: eve.save_requires_confirmation !== false,
      },
    },
    active_domains: [
      {
        pack_id: firstPack,
        confidence: "confirmed",
        last_verified: compact(input.last_verified) || confirmedAt,
      },
    ],
  };
}

export function buildEveBootPacket({ input = {}, intake, date } = {}) {
  const company = intake.company;
  const eve = intake.eve_onboarding;
  const existing = intake.existing_systems;
  const operating = intake.operating_state;
  const data = intake.data;
  return {
    version: EVE_BOOT_PACKET_VERSION,
    generated_at: intake.confirmed_at,
    source_of_truth: [
      ".company-os/onboarding/intake-record.json",
      ".company-os/company-discovery-brief.md",
      `reports/company-discovery/${date}/first-company-packet.md`,
      ".company-os/eve/SOUL.md",
      "docs/operations/eve-first-run-founder-onboarding.md",
      "docs/operations/eve-soul-boot-contract.md",
      "docs/operations/eve-founder-intent-operating-layer.md",
      "docs/operations/command-eve-founder-offline-readiness.md",
    ],
    north_star: eve.north_star || DEFAULT_FOUNDER_OFFLINE_TEST,
    account_seed: {
      user_name: compact(input.user_name || input.founder_name || company.founder_ceo),
      company_name: company.name,
      website: company.website,
      domain: company.domain,
      primary_offer: company.primary_offer,
      buyer: intake.market.buyer,
      why_now: intake.market.why_now,
      first_department: intake.active_domains[0]?.pack_id || "",
      initial_report_context: compact(input.initial_report_context || input.report_context),
      confidence: "operator_confirmed_input_required",
    },
    runtime_probe: {
      aionui_status: "unknown_until_preflight",
      hermes_profile_status: "unknown_until_preflight",
      model_provider_status: "unknown_until_preflight",
      memory_status: eve.memory_policy.allowed_sources.length ? "local_sources_declared" : "memory_sources_pending",
      filesystem_scope: "client_workspace_only",
      connected_tools: existing.connected_tools,
      already_available: existing.already_available,
      missing_or_blocked: existing.missing_or_blocked,
    },
    capability_matrix: [
      {
        tier: "T0",
        name: "Talk, confirm seed and remember allowed local context",
        status: "available_after_model_auth",
        requires: ["account_seed", "EVE soul", "model provider", "local workspace"],
        not_required: ["Honcho", "GitHub", "Supabase", "Plane worker dispatch"],
      },
      {
        tier: "T1",
        name: "Company understanding and setup continuity",
        status: "available_after_intake_confirmation",
        requires: [".company-os/onboarding/intake-record.json", ".company-os/company-discovery-brief.md"],
        not_required: ["public actions", "scheduled autonomy"],
      },
      {
        tier: "T2",
        name: "Existing-system inventory",
        status: existing.discovery_status === "complete" ? "ready" : "needs_read_only_review",
        requires: ["execution ledger or declared task sources", "roles and people sources", "operator approval"],
        not_required: ["migration", "duplication"],
      },
      {
        tier: "T3",
        name: "Company.OS-native work planning",
        status: "manual_draft_only",
        requires: ["Plane parent draft", "role labels", "worker contracts with dispatch: manual"],
        not_required: ["dispatch: ready", "Plane Done"],
      },
      {
        tier: "T4",
        name: "Worker and C-Level delegation",
        status: "blocked_until_ceo_codex_review",
        requires: ["CEO Delegation Packet", "CapabilityProfile", "Stage 0.5", "Stage 0.65"],
        not_required: ["AionUI write authority"],
      },
      {
        tier: "T5",
        name: "Department automation and connectors",
        status: "enable_per_wedge",
        requires: ["selected department pack", "connector scopes", "HumanGate owner"],
        not_required: ["all connectors on day one"],
      },
      {
        tier: "T6",
        name: "Autonomous routines",
        status: "future_gated",
        requires: ["CAO/controller evidence", "budget brake", "kill switch", "HumanGate release"],
        not_required: ["first install"],
      },
    ],
    first_greeting_protocol: {
      posture: "chief_of_staff_not_setup_bot",
      must_start_with_known_context: true,
      say_what_is_known_first: [
        "founder/operator name if present",
        "company name",
        "website",
        "offer",
        "buyer",
        "first report or intake context if present",
      ],
      ask_for_confirmation_before_saving: eve.memory_policy.save_requires_confirmation,
      max_initial_questions: 3,
      first_choice_set: [
        "confirm company model",
        "inspect existing tools and task sources",
        "define first operating goal",
      ],
      greeting_template: [
        "Hey, ich bin EVE. Ich habe schon diese Startdaten aus deinem Account und Intake.",
        "Bitte korrigiere mich, wenn etwas falsch ist.",
        "Ich richte mich in Stufen ein: Company-Verstaendnis, Memory-Grenzen, Tools, erster Workflow.",
        "Was soll ich zuerst tun: Company-Modell bestaetigen, bestehende Tools pruefen oder den ersten operativen Goal vorbereiten?",
      ],
    },
    progressive_setup_queue: {
      now: [
        "confirm account seed",
        "confirm memory boundaries",
        "inventory existing ledgers, task sources, roles and owners",
        "choose first department wedge",
      ],
      soon: [
        "connect only the tools needed for the first wedge",
        "draft Founder Intent Packet",
        "draft CEO Delegation Packet",
        "draft first Plane parent and child contracts with dispatch: manual",
      ],
      later: [
        "Honcho durable memory split",
        "GitHub/GitNexus codegraph work",
        "department-specific connectors",
        "scheduled routines after CAO/controller evidence",
      ],
    },
    operating_boundaries: {
      required_core_for_company_os_native: ["Git remote", "Company.OS Kit", "Plane", "local memory bank", "install record", "software stack", "human gates"],
      required_for_autonomy: ["Honcho", "Codex", "Claude Code", "GitNexus", "Capability Registry", "Runtime Dispatcher"],
      optional_connectors: ["AionUI", "Hermes Agent", "Supabase", "Upload-Post", "Google Analytics/Search Console", "Stripe", "Google Calendar", "Google Drive"],
      adapt_existing_systems_first: eve.initialization.adapt_existing_systems_first,
      create_new_ledger_only_if_missing: eve.initialization.create_new_ledger_only_if_missing,
      blocked_actions: data.blocked_actions,
      no_go_zones: data.no_go_zones,
    },
    memory_policy: eve.memory_policy,
    existing_systems: existing,
    setup_assistance: eve.setup_assistance,
    first_goals: eve.first_goals,
  };
}

export function validateFirstCompanyInput(input = {}) {
  const errors = [];
  const company = input.company || {};
  if (!compact(company.name)) errors.push("company.name is required");
  if (!compact(company.website || company.domain)) errors.push("company.website or company.domain is required");
  if (!compact(company.primary_offer || input.primary_offer)) errors.push("company.primary_offer is required");
  if (!compact(input.buyer)) errors.push("buyer is required");
  if (!compact(input.approval_owner || company.human_gate_owner || company.founder_ceo)) {
    errors.push("approval_owner is required");
  }
  if (!compact(input.first_department || input.first_pack || input.first_wedge)) {
    errors.push("first_department is required");
  }
  return { ok: errors.length === 0, errors };
}

function renderList(rows) {
  const values = asArray(rows);
  return values.length ? values.map((row) => `- ${row}`).join("\n") : "-";
}

export function renderCompanyDiscoveryBrief({ input, intake, materialization }) {
  const company = intake.company;
  const operating = intake.operating_state;
  const existing = intake.existing_systems;
  const market = intake.market;
  const data = intake.data;
  const eve = intake.eve_onboarding;
  const child = materialization.children[0] || {};
  return [
    "# Company Discovery Brief",
    "",
    "Status: generated first-run draft",
    `Generated: ${intake.confirmed_at}`,
    "Use for: first Company.OS onboarding after technical install",
    "",
    "## Company Identity",
    "",
    `Company: ${company.name}`,
    `Domain: ${company.domain}`,
    `Industry: ${company.industry}`,
    `Stage: ${company.stage}`,
    `Primary market: ${compact(input.primary_market)}`,
    `Primary offer: ${company.primary_offer}`,
    `Revenue model: ${company.revenue_model}`,
    `Founder/CEO: ${company.founder_ceo}`,
    `HumanGate owner: ${intake.approval_owner}`,
    "",
    "## Current Business Model",
    "",
    `What the company sells: ${company.primary_offer}`,
    "",
    `Who buys: ${market.buyer}`,
    "",
    `Why buyers buy now: ${market.why_now}`,
    "",
    `Current sales motion: ${market.sales_motion}`,
    "",
    `Current delivery model: ${compact(input.delivery_model)}`,
    "",
    `Current pricing model: ${company.revenue_model}`,
    "",
    "## Current Operating System",
    "",
    `Execution ledger: ${operating.execution_ledger}`,
    "",
    `Knowledge base: ${operating.knowledge_base}`,
    "",
    `CRM / lead source: ${operating.crm}`,
    "",
    `Analytics: ${operating.analytics}`,
    "",
    `Content channels: ${renderList(input.content_channels)}`,
    "",
    `AI tools already used: ${renderList(operating.ai_tools)}`,
    "",
    `Main recurring workflows: ${renderList(input.recurring_workflows)}`,
    "",
    `Founder-memory dependencies: ${renderList(operating.founder_memory_dependencies)}`,
    "",
    "## Existing System Discovery",
    "",
    `Discovery status: ${existing.discovery_status}`,
    "",
    `Active ledger: ${existing.active_ledger}`,
    "",
    "Execution ledgers:",
    renderList(existing.execution_ledgers),
    "",
    "Task sources to review:",
    renderList(existing.task_sources_to_review),
    "",
    "Roles and people sources:",
    renderList(existing.roles_and_people_sources),
    "",
    "Connected tools:",
    renderList(existing.connected_tools),
    "",
    "Already available:",
    renderList(existing.already_available),
    "",
    "Missing or blocked:",
    renderList(existing.missing_or_blocked),
    "",
    `Adoption policy: ${existing.adoption_policy}`,
    "",
    `Import policy: ${existing.import_policy}`,
    "",
    `Conflict policy: ${existing.conflict_policy}`,
    "",
    "## EVE Chief-of-Staff Onboarding",
    "",
    `Setup mode: ${eve.setup_mode}`,
    "",
    `Greeting identity: ${eve.initialization.greeting_identity}`,
    "",
    `Inventory existing systems: ${eve.initialization.inventory_existing_systems ? "yes" : "no"}`,
    "",
    `Adapt existing systems first: ${eve.initialization.adapt_existing_systems_first ? "yes" : "no"}`,
    "",
    `Create new ledger only if missing: ${eve.initialization.create_new_ledger_only_if_missing ? "yes" : "no"}`,
    "",
    `Founder decision style: ${eve.founder_model.decision_style}`,
    "",
    `Founder communication notes: ${eve.founder_model.communication_notes}`,
    "",
    "Founder preferences:",
    renderList(eve.founder_model.preferences),
    "",
    "Founder refusal patterns:",
    renderList(eve.founder_model.refusal_patterns),
    "",
    "Taste notes:",
    renderList(eve.founder_model.taste_notes),
    "",
    "Accounts to connect:",
    renderList(eve.setup_assistance.accounts_to_connect),
    "",
    "Websites to open:",
    renderList(eve.setup_assistance.websites_to_open),
    "",
    "Permissions needed:",
    renderList(eve.setup_assistance.permissions_needed),
    "",
    "Tools to install:",
    renderList(eve.setup_assistance.tools_to_install),
    "",
    "Requested skills/workflows:",
    renderList(eve.setup_assistance.skills_or_workflows_requested),
    "",
    "First goals:",
    renderList(eve.first_goals),
    "",
    "Allowed memory sources:",
    renderList(eve.memory_policy.allowed_sources),
    "",
    "Forbidden memory sources:",
    renderList(eve.memory_policy.forbidden_sources),
    "",
    `Memory save requires confirmation: ${eve.memory_policy.save_requires_confirmation ? "yes" : "no"}`,
    "",
    "## Data And Compliance",
    "",
    `Sensitive data types: ${data.sensitivity}`,
    "",
    `Customer data: ${compact(input.customer_data)}`,
    "",
    `Employee data: ${compact(input.employee_data)}`,
    "",
    `Health/financial/legal data: ${compact(input.regulated_data)}`,
    "",
    `Current GDPR/AI governance: ${compact(input.governance_state)}`,
    "",
    `Known no-go zones: ${renderList(data.no_go_zones)}`,
    "",
    "## Market Reality",
    "",
    `Target customer: ${market.buyer}`,
    "",
    `Current customer behavior: ${market.current_behavior}`,
    "",
    `Direct competitors: ${renderList(market.competitors)}`,
    "",
    `Indirect competitors: ${compact(input.indirect_competitors)}`,
    "",
    `Switching cost: ${compact(input.switching_cost)}`,
    "",
    `Urgency: ${market.why_now}`,
    "",
    `Wedge: ${market.wedge}`,
    "",
    "## Company.OS Fit",
    "",
    "Fit verdict: pilot-only until first read-only worker smoke and CAO/controller evidence.",
    "",
    `First department candidate: ${child.pack_id || intake.active_domains[0]?.pack_id}`,
    "",
    `Expected value: ${compact(input.expected_value)}`,
    "",
    `Main risk: ${compact(input.main_risk)}`,
    "",
    `Required HumanGate: ${child.human_gate || "HG-2"}`,
    "",
    `Recommended first work order: ${child.title || "First department pack draft"}`,
    "",
    "## Rollout Decision",
    "",
    "Proceed with pilot: pending HumanGate owner review",
    "",
    "Pilot type: read-only / draft-only / manual dispatch",
    "",
    `First department: ${child.pack_id || intake.active_domains[0]?.pack_id}`,
    "",
    `First work order: ${child.title || ""}`,
    "",
    `Blocked actions: ${renderList(child.blocked_actions || data.blocked_actions)}`,
    "",
    "Promotion criteria: worker.reported + CAO PASS + controller decision + HumanGate release.",
    "",
    `Decision owner: ${intake.approval_owner}`,
    "",
  ].join("\n");
}

function renderContractDraft(materialization) {
  const parent = materialization.goal;
  const childLines = materialization.children.map((child, index) => [
    `## Child ${index + 1}: ${child.title}`,
    "",
    "```worker-issue-contract",
    `role: ${child.role}`,
    "parent_seat: role:coo",
    `agent: ${child.agent}`,
    `mode: ${child.mode}`,
    `workspace: ${parent.workspace}`,
    `dispatch: ${child.dispatch}`,
    "depends_on: none",
    "source_of_truth:",
    ...child.source_of_truth.map((row) => `  - ${row}`),
    "scope:",
    `  include: ${child.outcome}`,
    "  exclude: production writes, public sends, spend, deploy, Plane Done",
    "acceptance_criteria:",
    ...child.acceptance_criteria.map((row) => `  - ${row}`),
    "gates:",
    ...child.gates.map((row) => `  - ${row}`),
    `human_gate: ${child.human_gate}`,
    "blocked_actions:",
    ...child.blocked_actions.map((row) => `  - ${row}`),
    "reporting: one worker.reported Plane comment with artifact paths, gates, risks, reflection and learning_proposals",
    "```",
    "",
  ].join("\n"));

  return [
    `# ${parent.title}`,
    "",
    "Status: first Plane parent draft",
    "",
    "## Parent",
    "",
    `Outcome: ${parent.outcome}`,
    "",
    `Owner: ${parent.owner}`,
    "",
    `Role: ${parent.role}`,
    "",
    `HumanGate: ${parent.humanGate}`,
    "",
    "Acceptance:",
    ...parent.acceptance.map((row) => `- ${row}`),
    "",
    "Gates:",
    ...parent.gate.map((row) => `- ${row}`),
    "",
    ...childLines,
  ].join("\n");
}

export function renderFirstCompanyPacket({ input, intake, materialization, date }) {
  const firstChild = materialization.children[0] || {};
  const eve = intake.eve_onboarding;
  const existing = intake.existing_systems;
  return [
    `# First Company Packet - ${intake.company.name}`,
    "",
    `Date: ${date}`,
    `Version: ${FIRST_COMPANY_PACKET_VERSION}`,
    "Status: generated onboarding packet",
    "",
    "## Decision",
    "",
    "Start with one read-only / draft-only department wedge. Do not enable scheduled autonomy, production writes, public actions, spend, merge/deploy, durable worker memory writes or Plane Done automation.",
    "",
    "## Inputs",
    "",
    `Company: ${intake.company.name}`,
    `Website: ${intake.company.website}`,
    `Offer: ${intake.company.primary_offer}`,
    `Buyer: ${intake.market.buyer}`,
    `Approval owner: ${intake.approval_owner}`,
    `First pack: ${firstChild.pack_id || intake.active_domains[0]?.pack_id}`,
    "",
    "## Generated Artifacts",
    "",
    "- `.company-os/company-discovery-brief.md`",
    "- `.company-os/onboarding/intake-record.json`",
    "- `.company-os/onboarding/eve-boot-packet.json`",
    "- `.company-os/onboarding/first-plane-parent-draft.md`",
    `- \`reports/company-discovery/${date}/first-company-packet.md\``,
    `- \`reports/company-discovery/${date}/first-plane-parent-draft.md\``,
    "",
    "## First Run Order",
    "",
    "1. EVE greets the operator as Command EVE and starts initialization.",
    "2. EVE loads `.company-os/onboarding/eve-boot-packet.json`, says what it already knows and asks for corrections before acting.",
    "3. Review existing ledgers, tools, roles, people and task sources before creating new structure.",
    "4. Review and correct `.company-os/company-discovery-brief.md`.",
    "5. Confirm `.company-os/operations/human-gates.md` owners.",
    "6. Confirm `.company-os/operations/software-stack.md` enabled connectors.",
    "7. Let EVE turn the founder setup queue into account, permission, website, tool and skill prompts.",
    "8. Create the first Plane parent from `.company-os/onboarding/first-plane-parent-draft.md` only after existing task sources are mapped.",
    "9. Create 3-7 manual child worker contracts under that parent.",
    "10. Run only read-only or dry-run worker smoke.",
    "11. Require CAO/controller evidence before any HumanGate release.",
    "",
    "## Existing System Adoption",
    "",
    `Active ledger: ${existing.active_ledger}`,
    "",
    "Execution ledgers:",
    renderList(existing.execution_ledgers),
    "",
    "Task sources to review:",
    renderList(existing.task_sources_to_review),
    "",
    "Roles and people sources:",
    renderList(existing.roles_and_people_sources),
    "",
    "Connected tools:",
    renderList(existing.connected_tools),
    "",
    "Already available:",
    renderList(existing.already_available),
    "",
    "Missing or blocked:",
    renderList(existing.missing_or_blocked),
    "",
    `Adoption policy: ${existing.adoption_policy}`,
    "",
    `Import policy: ${existing.import_policy}`,
    "",
    `Conflict policy: ${existing.conflict_policy}`,
    "",
    "## EVE Setup Queue",
    "",
    "Soul sources:",
    renderList(eve.soul_sources),
    "",
    "Accounts to connect:",
    renderList(eve.setup_assistance.accounts_to_connect),
    "",
    "Websites to open:",
    renderList(eve.setup_assistance.websites_to_open),
    "",
    "Permissions needed:",
    renderList(eve.setup_assistance.permissions_needed),
    "",
    "Tools to install:",
    renderList(eve.setup_assistance.tools_to_install),
    "",
    "Requested skills/workflows:",
    renderList(eve.setup_assistance.skills_or_workflows_requested),
    "",
    "First goals:",
    renderList(eve.first_goals),
    "",
    "EVE may guide the operator through these setup actions, but may not create accounts, approve spend, persist private memory or dispatch workers without explicit HumanGate/CEO approval.",
    "",
    "## Blocked Actions",
    "",
    renderList(firstChild.blocked_actions || intake.data.blocked_actions),
    "",
  ].join("\n");
}

export function buildFirstCompanyPacket(input = {}, { registry, date, now, workspaceSlug, projectId, projectIdentifier } = {}) {
  const validation = validateFirstCompanyInput(input);
  const resolvedDate = resolveDate(date);
  if (!validation.ok) {
    return {
      ok: false,
      version: FIRST_COMPANY_PACKET_VERSION,
      date: resolvedDate,
      errors: validation.errors,
      files: [],
    };
  }
  const intake = buildIntakeRecord(input, { date: resolvedDate });
  const materialization = buildIntakeMaterializationInput({
    intake,
    registry,
    date: resolvedDate,
    now: now || intake.confirmed_at,
    workspaceSlug,
    projectId,
    projectIdentifier,
    parentNameOverride: `First Pilot - ${intake.company.name}`,
  });
  if (!materialization.ok) {
    return {
      ok: false,
      version: FIRST_COMPANY_PACKET_VERSION,
      date: resolvedDate,
      errors: materialization.errors,
      reasons: materialization.reasons,
      files: [],
    };
  }

  const discoveryBrief = renderCompanyDiscoveryBrief({ input, intake, materialization });
  const parentDraft = renderContractDraft(materialization);
  const packet = renderFirstCompanyPacket({ input, intake, materialization, date: resolvedDate });
  const eveBootPacket = buildEveBootPacket({ input, intake, date: resolvedDate });
  const intakeJson = `${JSON.stringify(intake, null, 2)}\n`;
  const eveBootPacketJson = `${JSON.stringify(eveBootPacket, null, 2)}\n`;

  return {
    ok: true,
    version: FIRST_COMPANY_PACKET_VERSION,
    date: resolvedDate,
    company_slug: slug(intake.company.name),
    intake,
    materialization,
    files: [
      { path: ".company-os/company-discovery-brief.md", content: discoveryBrief },
      { path: ".company-os/onboarding/intake-record.json", content: intakeJson },
      { path: ".company-os/onboarding/eve-boot-packet.json", content: eveBootPacketJson },
      { path: ".company-os/onboarding/first-plane-parent-draft.md", content: parentDraft },
      { path: `reports/company-discovery/${resolvedDate}/first-company-packet.md`, content: packet },
      { path: `reports/company-discovery/${resolvedDate}/first-plane-parent-draft.md`, content: parentDraft },
    ],
  };
}

export function writeFirstCompanyPacket({ target, packet, force = false, dryRun = false } = {}) {
  const resolvedTarget = path.resolve(target || "");
  const files = packet?.files || [];
  const collisions = files
    .map((file) => file.path)
    .filter((filePath) => fs.existsSync(path.join(resolvedTarget, filePath)));
  if (!force && collisions.length) {
    return {
      ok: false,
      status: "blocked",
      target: resolvedTarget,
      collisions,
      files: files.map((file) => file.path),
      message: `${collisions.length} target file(s) already exist. Re-run with --force after reviewing local state.`,
    };
  }
  if (dryRun) {
    return {
      ok: true,
      status: "dry-run",
      target: resolvedTarget,
      collisions,
      files: files.map((file) => file.path),
    };
  }
  for (const file of files) {
    const dst = path.join(resolvedTarget, file.path);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.writeFileSync(dst, file.content);
  }
  return {
    ok: true,
    status: "pass",
    target: resolvedTarget,
    collisions,
    files: files.map((file) => file.path),
  };
}
