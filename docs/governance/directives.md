# Company.OS Governance Directives

This file is the rule-of-law layer for Company.OS workers, controllers, and
orchestrators. It applies before any plan, audit, delegation, dispatch,
automation, release, memory write, Linear update, or autonomy change.

Directives are guardrails, not suggestions. If a directive conflicts with a
task request, stop and ask the controller, CEO or founder for a human decision.

## DIRECTIVE-001: Source Of Truth Before Action

Trigger: any plan, implementation, audit, delegation, review, or report.

Enforcement:

- Name the source paths, Linear issues, docs, commands, or memory surfaces before
  acting.
- Read existing issues/docs before creating new execution records.
- State assumptions when a source is missing or stale.

Failure Mode: the worker acts from stale, invented, or cross-workspace context.

## DIRECTIVE-002: PII And Secret Hygiene

Trigger: any file read/write, report, memory update, release, external tool
call, or public artifact.

Enforcement:

- Do not expose live credentials, API keys, tokens, customer data, private raw
  memory, raw chat dumps, or personal files.
- Keep raw/private audit outputs outside public kit paths.
- Scrub public-release candidates before push or distribution.

Failure Mode: secret leakage, privacy breach, unsafe memory persistence, or
non-public-safe distribution.

## DIRECTIVE-003: Ruthless Efficiency

Trigger: every scope decision.

Enforcement:

- Choose the smallest useful proof loop.
- Prefer evidence-bearing artifacts over additional abstraction.
- Cut ceremonies that do not improve decisions, quality, repeatability, or CEO
  time saved.

Failure Mode: Company.OS becomes process theater instead of an operating system.

## DIRECTIVE-004: Verify Before Claim

Trigger: any claim of done, fixed, shipped, passed, ready, indexed, reviewed, or
safe.

Enforcement:

- Cite the exact command, report, screenshot, controller card, Linear comment,
  or gate evidence.
- If verification is impossible, state the limitation and do not claim success.
- A passing plan is not a passing implementation.

Failure Mode: false confidence and inflated maturity scores.

## DIRECTIVE-005: Human Gate Before External Impact

Trigger: production writes, schema/RLS/auth/service-role changes, public
publishing, outreach, medical/legal/Rx claims, money movement, paid API setup,
autonomy changes, final merge, or Linear `Done`.

Enforcement:

- Require the named HumanGateOwner, CEO or controller approval before the
  action.
- Workers may recommend; they may not execute external-impact actions.
- Use `NEEDS-HUMAN` when the required approval is missing.

Failure Mode: irreversible product, legal, financial, public, or operational
harm.

Important boundary:

- Scheduled automations with an approved source-of-truth issue and a valid
  worker contract do not need per-run human approval for in-scope read-only
  work.
- In-scope read-only work includes reading Linear, reading local files, posting
  lock/heartbeat/outcome comments, writing private reports, appending run-ledger
  rows, and launching bounded read-only audit workers when the issue contract
  permits it.
- Human gates apply when the automation crosses into external impact, not when
  it merely executes its pre-approved scheduler/controller duties.

## DIRECTIVE-006: Linear Is Execution Ledger, Not Memory

Trigger: any Linear create, update, comment, status change, or delegation.

Enforcement:

- Write only concrete tasks, blockers, milestones, review obligations, status,
  gates, outcome comments, and next steps.
- Do not dump session history, raw memory, private context, or general knowledge
  into Linear.
- Prefer updating an existing issue over creating a duplicate.

Failure Mode: Linear becomes noisy, non-actionable, and unusable as a control
plane.

## DIRECTIVE-007: No Self-Promotion

Trigger: self-review, autonomy recommendation, worker completion, `Done`
transition, or score improvement.

Enforcement:

- Agents may self-score but cannot promote themselves.
- A Controller must review calibration gaps.
- The founder, CEO or controller must approve autonomy increases and final
  `Done` transitions.

Failure Mode: agents grant themselves authority before quality is proven.

## DIRECTIVE-008: Cost And Spend Hard Caps

Trigger: paid model usage, paid API/tool usage, subscriptions, agentic payments,
cloud runs, or any action that can create financial cost.

Enforcement:

- First-run autonomous workers default to zero external spend.
- Any spend requires a budget ledger, cap, owner, and explicit approval.
- Log known model/tool cost or mark it as unknown in the run ledger.

Failure Mode: runaway spend or untracked financial exposure.

## DIRECTIVE-009: Public Claim And Outreach Gate

Trigger: public content, medical/Rx/legal statements, DMs, emails, comments,
campaigns, sales copy, or social posts.

Enforcement:

- Use a claim/compliance/human gate before publication or outreach.
- Treat medical, legal, Rx, financial, and customer-impacting claims as
  high-risk by default.
- Drafts may be prepared; publication requires approval.

Failure Mode: legal, reputational, platform, or customer-trust risk.

## DIRECTIVE-010: Metrics Before Autonomy Increase

Trigger: any L1-to-L2 or higher autonomy recommendation, recurring automation,
agent expansion, or unattended run.

Enforcement:

- Require score trend, gate history, run ledger evidence, controller calibration
  evidence, and cost/risk visibility.
- Do not increase autonomy from vibes, one-off success, or self-review only.
- Recurring work needs a review cadence and rollback/stop path.

Failure Mode: autonomy scales faster than quality control.

## DIRECTIVE-011: Workspace Registry Firewall

Trigger: cross-workspace read, write, dispatch, GitNexus call, Linear issue,
memory operation, or scheduler action.

Enforcement:

- Use the active workspace registry and absolute workspace paths.
- Do not hardcode a repo, memory namespace, Linear team, or GitNexus index from
  another workspace.
- If the target workspace is not registered, stop and request a registry update
  or human decision.

Failure Mode: wrong repo, wrong memory namespace, wrong Linear context, or
cross-company contamination.

## DIRECTIVE-012: Reproducible Run Ledger

Trigger: every agent run, audit, worker task, controller review, dispatch, or
scheduled automation.

Enforcement:

- Record issue, workspace, agent, mode, source of truth, report path, commands,
  status, gates, cost if known, and next decision.
- Store raw/private outputs outside publishable kit paths when needed.
- A run that cannot be reconstructed is not operational evidence.

Failure Mode: no forensic trail, no learning loop, no reliable score movement.

## DIRECTIVE-013: IP And License Hygiene Before Public Release

Trigger: public GitHub push, release branch, release tag, client distribution,
template publishing, or MIT/open-source packaging.

Enforcement:

- Maintain a provenance matrix for kit files.
- Scan for private names, paths, Linear IDs, credentials, non-public context,
  and unlicensed material.
- Public-release scans apply to release candidates, not internal runtime
  context.

Failure Mode: unlicensed, non-public-safe, or reputationally unsafe
distribution.

## DIRECTIVE-014: Evidence Before Re-score

Trigger: any Company.OS maturity score update, area score lift, autonomy score
lift, or claim that an operating loop improved.

Enforcement:

- A score may only increase when a corresponding controller-review card and
  agent-run ledger row exist.
- Projected scores must be labeled as projected until evidence exists.
- If evidence is partial, use a band instead of a single claimed score.

Failure Mode: maturity inflation and decision-making from documents instead of
proof loops.

## DIRECTIVE-015: Calendar Is Attention Layer

Trigger: any Google Calendar event, attention block, review gate, human decision
block, daily, weekly, monthly, quarterly, or board meeting created for the CEO.

Enforcement:

- Calendar blocks for the founder/CEO must be at least 30 minutes long.
- Calendar is for attention, decisions, reviews, and deep work; Linear remains
  the execution ledger.
- Do not create a calendar event for every agent task.
- Do not default review, reminder, decision or follow-up events to all-day
  events. All-day calendar items are date markers, not attention blocks.
- If an agent is about to create an all-day event for anything that expects the
  founder/CEO to notice, review, approve, send or decide, it must ask whether a
  visible timed block would be better.
- If the runtime cannot ask but the attention block is already approved, create
  a timed block in the user's configured attention window instead of an all-day
  event. Default fallback: a 30-60 minute morning block in local timezone,
  avoiding known conflicts.
- If a sequence of meetings would overlap after the 30-minute minimum, move the
  later meeting instead of creating overlapping micro-events.
- Event descriptions must explain the decision/review purpose, not dump raw task
  memory.

All-day events are allowed only when one of these is true:

- the user explicitly requested all-day;
- the event is a true date-only marker, such as a birthday, deadline, travel
  day, vacation day or legal/administrative date without a known time;
- the system first asked and the user chose all-day.

Failure Mode: meetings become invisible, noisy, stacked above the day, or
detached from real CEO attention.

## DIRECTIVE-016: Automations Must Be Always-Allow Inside Approved Scope

Trigger: recurring automation, scheduled controller pass, due worker issue,
heartbeat, or morning brief.

Enforcement:

- Once the founder/CEO approves an automation schedule and its allowed scope, the
  automation must be configured to run without extra per-run confirmation inside
  that scope. This is not optional; otherwise it is not automation.
- Every active automation must define an always-allow baseline for routine
  in-scope actions and a separate HumanGate list for unsafe or external-impact
  actions.
- Tool permissions for recurring controller duties should be configured as
  always-allow where the local runtime supports it. This includes connector
  reads, Linear/GitHub issue reads, lock/heartbeat/outcome comments, read-only
  shell inspection, private report writes, ledger appends, and bounded
  read-only worker commands named in the issue contract.
- The automation must stop only when a real stop rule is hit: unclear source of
  truth, missing/invalid worker contract, active lock conflict, unauthenticated
  required tool, production/public/spend/medical/legal/Rx boundary, direct
  `Done`, edit-mode request, or unstable runtime.
- Required worker runtimes must be authenticated before the scheduled window
  starts. A due Claude worker must not be the first place where Claude login is
  tested; use the runtime auth preflight sentinel instead.
- A UI permission prompt is a runtime-configuration blocker, not a product
  decision. For Linear in scheduled Company.OS jobs, do not call the UI
  connector at all; use the headless helper under
  `scripts/linear/headless-linear.mjs`. If headless auth is missing, write a
  runtime-auth blocker and continue local report-only.

Failure Mode: the CEO still has to babysit routine automation, which defeats
the purpose of automating it.

## DIRECTIVE-017: Sandbox Before Edit-Capable Agents

Trigger: any worker or agent with permission to edit code, config, data files,
docs that drive execution, automation scripts, issue templates, release gates,
or production-adjacent artifacts.

Enforcement:

- Edit-capable workers must run in a deterministic sandbox branch and isolated
  worktree before controller review.
- Branch names must identify workspace, date, issue, worker, role owner and task
  slug. Random agent-generated branch names are invalid for autonomous work.
- Worker state, controller state, issue state and merge/release state must be
  reported separately. `needs-audit`, `slice-ready-for-human-review`,
  `In Progress` and `ready-to-merge` are different states.
- Workers may patch files only inside the sandbox worktree. They may not merge,
  push, deploy, publish, write production data, write durable memory or mark
  execution-ledger issues `Done`.
- A controller must audit the sandbox branch before human review or integration.
- If a worker reaches `max-turns`, classify the attempt as
  `scope-too-broad:max-turns` unless logs prove a runtime/tool failure. Do not
  rerun the same broad prompt; create a narrower rework slice.
- Worker and controller report paths in ledgers/comments must be absolute paths.

Failure Mode: agent work blends into dirty source workspaces, bypasses human
gates, becomes impossible to audit, or is incorrectly treated as merged,
production-ready or done.

Canonical doctrine:

- [Agentic Sandbox Control Doctrine](./agentic-sandbox-control-doctrine.md)

## DIRECTIVE-018: HumanGate Requires A Decision Brief

Trigger: any controller asks a founder, CEO, legal/security owner or
delegated human to release a gate after a worker run, audit, sandbox
implementation, integration proposal, autonomy change, public release, spend,
production write, merge, deploy or `Done` transition.

Enforcement:

- Create a HumanGate Decision Card or Brief artifact before asking for
  approval. Use the smallest artifact that makes the decision safe.
- Write the brief in the gate owner's configured decision language.
- Every `HG-1+` gate starts with a short Decision Card including controller
  recommendation, predicted founder decision, confidence score, consequence of
  GO/NO-GO, reversibility, blocked actions and next step.
- Use `HG-1 Decision Card` for small reversible decisions, `HG-2 Decision Brief`
  for integration/user-data/product-risk decisions and `HG-3 Decision Dossier`
  for production/schema/RLS/auth/legal/medical/spend/autonomy/release gates.
- For `HG-2+`, include where the work came from, where it stands now, where it
  should go, what was learned, what remains risky, the controller
  recommendation, the exact approval requested and what remains blocked.
- Include a simple diagram for non-trivial `HG-2+` gates.
- Include the protection layer: Sandbox, EvalGate, E2E/integration evidence,
  audit strategy, rollback path, Linear state and merge/release state.
- Offer explicit decision options: `GO`, `GO MIT AUFLAGEN`, `NO-GO`, `PARKEN`.
- Do not force the gate owner to inspect raw worker logs unless the raw artifact
  is itself the decision object.

Failure Mode: the human gate becomes either a vague anxiety checkpoint or a
long process document for a small decision. Both slow autonomy and hide the real
risk decision.

Canonical template:

- [HumanGate Decision Brief](../templates/human-gate-decision-brief.md)
- [Founder Decision Profile](../templates/founder-decision-profile.md)

Controller calibration rule:

- Repeated founder feedback must update the founder decision profile or explain
  why it should remain local/private implementation context.
- If `founder_prediction_confidence` is below `0.70`, ask a sharper question or
  reduce the next step to a smaller reversible gate.

## Human Override

The founder, CEO or controller can override a directive only by recording:

- the directive being overridden
- the reason
- the scope
- the expiry or review point
- the responsible human

Overrides do not change the directive. They are exceptions that require later
review.
