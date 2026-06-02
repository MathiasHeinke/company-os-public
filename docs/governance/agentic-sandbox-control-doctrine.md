# Agentic Sandbox Control Doctrine

Status: normative Company.OS doctrine
Use for: public Company.OS repos, private company installs, client
implementations, local Codex/Claude/Gemini workers

## Purpose

This doctrine defines how an AI-native company lets agents implement work
without losing control of source code, ownership, review, or human authority.

It exists because "let an agent build it" is not an operating system. A working
Company.OS needs explicit roles, isolated execution, state separation, controller
review, and human gates.

## Core Rule

Edit-capable agent work must run in an isolated sandbox branch/worktree and must
be audited by a controller before any integration decision.

```text
Founder intent
-> CEO/orchestrator interpretation
-> execution-ledger issue
-> C-level RoleOwner
-> bounded worker contract
-> sandbox branch/worktree
-> worker patch/report
-> controller audit
-> rework loop or human review
-> merge/ship only after HumanGate
```

Workers may produce patches. They must not merge, push, deploy, publish, write
production data, write durable memory, or mark work `Done`.

## Role Doctrine

Separate human authority, operating authority, management ownership, and runtime.

| Field | Meaning | Example |
|---|---|---|
| `Founder` | Mission, taste, trust, capital, final risk acceptance | founder / owner |
| `CEO` | Operational orchestration and sequencing | Codex, human operator |
| `RoleOwner` | Management accountability for a domain bar | CTO, CPO, COO, Legal |
| `Controller` | Reviews worker output against contract and gates | Codex, QA agent, human |
| `Agent` | Runtime executor | Claude, Gemini, Codex, human |
| `HumanGateOwner` | Human or delegated authority that can release unsafe gates | CEO, Founder, Legal, Security |
| `HumanGateLevel` | Authority tier and decision artifact required before release | HG-1 CEO Decision Card, HG-2 CEO Decision Brief, HG-3 CEO Critical Release, HG-4 Founder Dossier |

Recommended fields:

```markdown
RoleOwner: CEO | CTO | CPO | CMO | COO | CFO | QA-Eval | Controller | Legal-Gate | Founder
Department: Engineering | Product | Growth | Ops | Finance | QA-Eval | Governance
AccountableLayer: CEO | C-Level | Department | Worker | Controller | HumanGate
ReportsTo: CEO | Controller | Founder
DecisionOwner: CEO | CTO | CPO | COO | Legal | Founder | human
HumanGateOwner: CEO | Founder | Legal | Security | delegated-human
HumanGateLevel: HG-0 | HG-1 | HG-2 | HG-2.5 | HG-3 | HG-3.5 | HG-4
FounderPrediction:
FounderPredictionConfidence:
BlockedActions:
Agent: claude | gemini | codex | human
Mode: audit | plan | implement | verify | research | report | review
AutonomyLevel: L0 | L1 | L2 | L3 | L4 | L5
OutcomeSpec:
EventPolicy:
DreamPolicy:
SessionPolicy:
RuntimeAdapter:
```

`Agent` is runtime. `RoleOwner` is accountability. `HumanGateOwner` is final
permission for unsafe boundaries. `HumanGateLevel` decides whether the controller
owes no gate, a short decision card, a decision brief or a full dossier. A
controller recommendation is not a release of `BlockedActions`.

## Sandbox Branch Contract

Use deterministic branch names. Avoid random agent-generated names.

```text
codex/sandbox/<workspace>/<YYYY-MM-DD>-<issue>-<worker>-<role-owner>-<task-slug>-<hhmmss>
```

Example:

```text
codex/sandbox/product-api/2026-05-07-eng-145-claude-cto-fix-recovery-reader-113559
```

Rules:

- `<workspace>` is the workspace registry key.
- `<issue>` is the execution-ledger identifier.
- `<worker>` is the runtime agent.
- `<role-owner>` is the management owner, not the human founder.
- `<task-slug>` is short and stable.
- `<hhmmss>` prevents collisions across repeated controller passes.

## Worktree Contract

Use a dedicated sandbox root outside the source workspace:

```text
<developer-root>/[SOURCE_WORKSPACE]/<workspace>/<YYYY-MM-DD>-<issue>-<worker>-<role-owner>-<task-slug>-<hhmmss>/
```

Default local example:

```text
~/Developer/[SOURCE_WORKSPACE]/product-api/2026-05-07-eng-145-claude-cto-fix-recovery-reader-113559/
```

The source workspace may be dirty. That is acceptable only if the sandbox
worktree is created from a known `HEAD` and the controller records that dirty
source-workspace changes were not copied, reverted, or treated as worker output.

### Capability Registry Sandbox Declarations

Sandbox worktrees must be authorized through the Capability Registry, not
through ad-hoc registry copies. Profiles that may be dispatched into a
sandbox declare a `sandbox_workspaces` pattern list (for example
`/Users/<dev>/Developer/[SOURCE_WORKSPACE]/<workspace>/**`). Runtime Dispatcher
v1.2's capability preflight resolves the worker contract's `Workspace` value
against the static `workspaces` list AND the sandbox patterns, so a fresh
worktree is accepted without writing a temp `/tmp/...` registry.

See `docs/registries/capability-registry.md` for pattern syntax, validation
rules, and the migration note that deprecates the earlier temp-file
workaround used in [WORK_ITEM_ID] runs.

### Sandbox Workspace Alias Guard ([WORK_ITEM_ID]/283/284)

Write-capable worker contracts (`Mode: implement` + `Sandbox: required`) must
declare `Workspace` as an absolute sandbox worktree path, not a canonical
alias such as `registry:company-os`, `company-os`, or an absolute path into
the canonical source tree like `/Users/<dev>/Developer/Company.OS/...`.

Runtime Dispatcher v1 dry-run blocks unsafe canonical aliases before worker
spawn with stable reason `runtime.sandbox-workspace-alias-unsafe` and run
state `BLOCKED_DEPENDENCY`. The guard fires only when both `Mode: implement`
and `Sandbox: required` are declared; read-only/audit contracts and
non-sandbox runs continue to accept registry aliases.

Approved absolute workspace prefix for write-capable sandbox runs:

```text
/Users/<dev>/Developer/[SOURCE_WORKSPACE]/<workspace>/...
```

The guard exists because the [WORK_ITEM_ID]/283 routing failure dispatched an
edit-capable Claude worker into the canonical Company.OS source tree using
`Workspace: registry:company-os`. Subsequent writes mutated the canonical
checkout instead of an isolated worktree. Future write-capable runs must
ship absolute sandbox `Workspace` values; the registry preflight then
resolves the absolute path against `sandbox_workspaces` patterns on the
profile.

## Required Worker Contract

Every edit-capable worker issue must include:

```markdown
RoleOwner:
Department:
AccountableLayer:
ReportsTo:
DecisionOwner:
HumanGateOwner:
HumanGateLevel:
FounderPrediction:
FounderPredictionConfidence:
BlockedActions:
Agent:
Mode: implement
Workspace:
Dispatch:
RunAt:
DependsOn:
Sandbox: required
BranchName:
WorktreeRoot:
Worktree:
IntegrationTarget:

SourceOfTruth:
Scope:
Acceptance Criteria:
Gates:
AlwaysAllow:
RuntimeAuth:
OutcomeSpec:
OutcomeRubric:
OutcomeGrader:
OutcomeArtifacts:
EventPolicy:
EventSink:
EventTypes:
StateReducer:
DreamPolicy:
MemoryUpdatePolicy:
SessionPolicy:
Coordinator:
SubAgentRoster:
SharedFilesystem:
ContextIsolation:
RuntimeAdapter:
HumanGate:
Reporting:
MaxRuntime:
MaxCommits:
MaxSpend:
KillSwitch:
Heartbeat:
```

Invalid worker contracts:

- missing `RoleOwner`
- missing `HumanGateOwner`
- `Mode: implement` without `Sandbox: required`
- no deterministic `BranchName`
- no `Worktree`
- no source-of-truth
- broad "do everything" scope
- scheduled, long-running, multiagent or L3 work without `OutcomeSpec`
- scheduled or live-ledger work without `EventPolicy`
- memory-affecting work without `DreamPolicy` / `MemoryUpdatePolicy`
- coordinator or parallel-agent work without `SessionPolicy` and
  `SubAgentRoster`
- managed-agent execution without explicit `RuntimeAdapter` and compatibility
  gate
- worker can merge, push, deploy, publish, write memory, write production data,
  or mark `Done`

## State Mapping

Report worker state, controller state, and issue state separately.

| Layer | Example State | Meaning |
|---|---|---|
| Worker | `needs-audit` | Worker produced changes and awaits controller audit. |
| Controller | `slice-ready-for-human-review` | Controller accepts one slice, but integration is gated. |
| Issue | `In Progress` | The broader execution issue still has remaining scope. |
| Merge | `not-ready-to-merge` | No merge/push/deploy until human/integration gate passes. |

Do not collapse these states. A passing slice is not a completed issue. A
completed controller audit is not a merge approval. A merged branch is not a
production release unless the release gate passed.

## Controller Audit

After every sandbox worker run, controller must inspect the branch before human
review.

Minimum audit:

- compare the sandbox branch against base
- inspect changed files and scope
- run impact analysis before or during edits on touched symbols
- run required tests/lint/typecheck/build gates
- run change detection after edits
- verify no forbidden actions occurred
- verify report paths and artifacts exist
- classify residual risks
- decide one state:
  - `needs-rework`
  - `slice-ready-for-human-review`
  - `blocked`
  - `reject`

Controller must not silently integrate sandbox work.

## Outcome, Event And Dream Gates

L3 sandbox work needs more than a branch and test list.

- `OutcomeSpec` defines what done means and which artifacts prove it.
- `OutcomeRubric` defines how the controller grades quality.
- `EventPolicy` defines which worker/controller events must be emitted or
  recorded.
- `DreamPolicy` defines whether learnings become memory proposals.
- `SessionPolicy` defines whether the run is single-worker or coordinated.
- `SubAgentRoster` defines any specialist workers that may be used.
- `RuntimeAdapter` declares whether the run uses local CLI, a Linear runner, or
  a managed-agent backend.

Default:

```text
DreamPolicy: proposal-only
MemoryUpdatePolicy: proposal-only
SessionPolicy: single-worker-sandbox
SharedFilesystem: sandbox-worktree
RuntimeAdapter: local-cli
```

Workers may propose SOP, skill, harness, eval or memory updates, but those
proposals do not become durable memory until controller or CEO review accepts
them.

## Max-Turns Rule

If a worker reaches `max-turns`, classify the attempt as:

```text
scope-too-broad:max-turns
```

unless logs prove a runtime or tool failure.

Required controller response:

- do not rerun the same broad prompt
- preserve any clean or dirty sandbox state as evidence
- create a narrower rework slice with one measurable outcome
- update the execution ledger with the classification

## Report Hygiene

All raw worker reports and controller reports must use absolute paths in run
ledgers and issue comments.

Invalid:

```text
reports/private/night-shift/...
```

Valid:

```text
${COMPANY_OS_ROOT}/reports/private/night-shift/...
```

(Resolve `${COMPANY_OS_ROOT}` against `docs/operations/portable-path-placeholders.md`;
on macOS pnpm setups it is typically `~/Developer/Company.OS`.)

Reason: the worker may run from a product repo, sandbox worktree, CI workspace,
or agent-runtime repo while the report ledger lives elsewhere.

## Human Gate Levels

Human gates are tiered. Do not route every reversible operating decision to the
Founder. The CEO controller owns HG-1, HG-2, HG-2.5 and HG-3 when confidence,
evidence and rollback are strong enough; Chief-of-Staff / Founder-Proxy owns
HG-3.5 review packets; the Founder owns HG-4.

| Level | Owner | Controller May Release When | Stop/Escalate When |
|---|---|---|---|
| HG-0 | none | Routine allowed action inside the issue's `AlwaysAllow` scope. | Any stop rule appears. |
| HG-1 | CEO | Small, reversible operational decision; all listed gates pass; `FounderPredictionConfidence >= 0.80`; no high-severity audit finding; no external irreversible impact. | Confidence below threshold, unclear source-of-truth, or any blocked action is touched. |
| HG-2 | CEO | Meaningful but bounded decision such as read-only dispatch, dry-run to pre-approved scheduling queue, sandbox integration packet, or reversible workflow change; all gates pass; `FounderPredictionConfidence >= 0.85`; rollback path is named; residual risks are low/medium and accepted by the controller. | Production write, deploy/release, schema/RLS/auth/service-role, new spend, regulated/public claim, autonomy increase, or direct `Done` is involved. |
| HG-2.5 | CEO | Bounded release authority: merge, push, deploy, small production write, bounded public publish or execution-ledger `Done`; all gates pass; `FounderPredictionConfidence >= 0.92`; CAO/controller verdict PASS; rollback verified or trivial; blast radius low/medium/staged/canary; budget and Artifact Truth pass. | Schema/RLS/auth/service-role, secret scope, risky production data, material spend/pricing, regulated claims, live outreach, L4/L5 autonomy increase, strategic direction change, or unresolved high-severity finding. |
| HG-3 | CEO / Codex | High-critical but reversible/restorable action; all gates pass; `FounderPredictionConfidence >= 0.96`; CAO/controller verdict PASS; rollback, backup, snapshot or restore path verified; upward report required. | Strategic direction, non-restorable data loss, major legal/capital exposure, founder-voice public commitment, company identity/taste decision, or hidden founder liability. |
| HG-3.5 | Chief-of-Staff / Founder-Proxy | Async review/translation of CEO packets, pause artifacts and founder-facing summaries. | If the decision is true founder will, strategic or non-restorable, escalate to HG-4. |
| HG-4 | Founder / human | Real human signs strategic or non-restorable decisions after Chief-of-Staff compression. | Never released by worker, CAO, C-Level or CEO/Codex. |

Local implementations may name a CEO delegate such as `Codex / GPT-5.5 xhigh`.
That delegate can release HG-1, HG-2, HG-2.5 and HG-3 only inside this policy. A high
model confidence score is necessary but not sufficient: the source of truth,
gates, artifact evidence, rollback path, blast radius, CAO verdict and blocked
actions must also be explicit.

For HG-1/HG-2/HG-2.5 releases, record:

```json
{
  "generated_at": "YYYY-MM-DDTHH:mm:ss.sssZ",
  "human_gate_release": {
    "level": "HG-1 | HG-2 | HG-2.5",
    "released_by": "CEO | Codex-GPT-5.5-xhigh | delegated-controller",
    "release_authority": "CEO_AUTONOMOUS",
    "founder_prediction_confidence": 0.0,
    "requested_actions": ["append report", "write Linear outcome comment"],
    "blocked_actions_still_forbidden": [
      "production write",
      "deploy/release",
      "schema/RLS/auth/service-role",
      "public regulated claim",
      "new spend",
      "autonomy increase",
      "direct Done"
    ],
    "rollback_path": "named rollback",
    "rollback_verification": { "status": "pass" },
    "blast_radius": { "level": "low | medium | staged | canary | trivial" },
    "cao_verdict": { "verdict": "PASS" }
  },
  "source_of_truth": ["/absolute/path/to/source.md"],
  "gates": [{ "id": "warm-preflight", "status": "pass", "evidence_path": "/absolute/path/to/report.md" }],
  "artifact_truth": [{ "pipeline": "editorial", "status": "passed", "ok": true, "date": "YYYY-MM-DD", "report_path": "/absolute/path/to/artifact-truth.md" }],
  "budget": { "status": "pass", "estimated_usd": 0.0, "limit_usd": 1.0 }
}
```

Then run `scripts/release-gates/human-gate-release.mjs validate`. A controller
may append `human_gate.released` only through that validator.

## Stop Rules

Stop before:

- production merge, push, deploy, release
- production writes or migrations
- schema, RLS, auth, service-role or permission changes
- public publishing or outreach
- medical, legal, financial, safety or regulated claims
- customer-impacting behavior changes
- new spend or paid API activation
- durable memory writes by workers
- direct execution-ledger `Done`
- scope expansion beyond the approved issue

Workers can recommend. Controllers can audit. Only the named `HumanGateOwner` or
delegated authority can release these gates.

For non-trivial gates, the controller must create a HumanGate Decision Brief.
The brief must be written in the gate owner's decision language and explain:

- where the work came from
- where it stands now
- where the system should go next
- what the controller learned
- which hidden risks remain
- which protection layer, EvalGate, E2E/integration check and rollback path
  guard the next step
- the controller's recommended decision

Canonical template:

```text
docs/templates/human-gate-decision-brief.md
```

A controller audit can be technical. A HumanGate brief must be decision-ready.

## Public Repo Rule

A public Company.OS repo should ship this doctrine as a generic rule, not as a
private company log. Keep examples sanitized:

- use placeholder workspace names
- use placeholder issue IDs
- do not include private paths except as examples
- do not include customer, founder, medical, financial, legal or internal raw
  report data
- keep company-specific local automation IDs in private implementation docs

## First Pilot Checklist

Before running the first L3 sandbox worker in a new company:

- [ ] Founder/CEO/RoleOwner/HumanGate semantics are defined.
- [ ] Workspace registry exists.
- [ ] Execution ledger has one bounded worker issue.
- [ ] Source-of-truth files are named.
- [ ] Sandbox branch and worktree are deterministic.
- [ ] Runtime auth sentinel passes.
- [ ] Code intelligence/index status is up to date.
- [ ] `AlwaysAllow` and `HumanGate` are separated.
- [ ] `OutcomeSpec` and controller rubric are named.
- [ ] `EventPolicy` includes at least lock, heartbeat, worker report and
      controller verdict.
- [ ] `DreamPolicy` is `proposal-only` or stricter.
- [ ] `SessionPolicy` and `SubAgentRoster` are explicit.
- [ ] Raw report paths are absolute.
- [ ] Controller audit card is ready.
- [ ] HumanGate stop path is documented.

## Minimal Directive

If you only copy one rule into an agent prompt, use this:

```text
Edit-capable agents may only work in deterministic sandbox branches and isolated
worktrees under a worker contract with OutcomeSpec, EventPolicy, DreamPolicy,
HumanGate and RuntimeAuth. They must report changed files, commands, tests and
risks. They must not merge, push, deploy, write production data, write durable
memory or mark work Done. A controller must audit the sandbox branch, emit or
record a controller verdict, and preserve separate worker, controller, issue and
merge states before any human integration gate.
```
