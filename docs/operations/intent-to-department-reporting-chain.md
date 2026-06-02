# Intent To Department Reporting Chain

Status: canonical productizable protocol
Use for: AionUI/Hermes chief-of-staff shell, CEO routing, department execution,
worker reports and founder-facing summaries
Last updated: 2026-05-21

## Purpose

Company.OS must turn a human observation into company work without losing
context, ownership or auditability.

A future AionUI/Hermes operator shell may sit next to the founder and understand
the live conversation better than a later worker. That is valuable. It is not a
reason to bypass the company operating chain.

The shell may capture intent, assemble context and draft a decision card. The
CEO decides ownership and routing. The department owner prepares or runs the
work. Workers execute bounded contracts. CAO, Controller and Raindrop evaluate.
The result returns upward as a readable report.

## Canonical Chain

```text
Founder / operator
-> Chief-of-Staff shell (AionUI / Hermes)
-> CEO / Codex Controller
-> C-Level Department Owner
-> Worker Role / Worker Contract
-> CAO / Controller / Raindrop
-> C-Level Department Completion Report
-> CEO Decision / Handoff
-> Chief-of-Staff Summary
-> Founder / operator
```

This chain is intentionally more explicit than a single assistant fixing a bug
directly. The goal is repeatability: a client company, a real employee or a
different agent must be able to understand what happened later.

## Shell Boundary

The Chief-of-Staff shell may:

- capture the founder's observation in natural language or voice
- ask clarifying questions
- gather visible context and screenshots
- identify likely workspace, product area and impacted department
- read allowed Company.OS/Plane/report state
- draft an `intent.card`
- prepare HG-3.5 review summaries
- explain CEO and department reports back to the founder

The shell may not by default:

- dispatch workers directly
- mutate Plane, GitHub, production systems or public channels
- mark Done
- bypass CEO/Codex routing
- approve HG-2.5/HG-3/HG-4 actions
- rewrite department authority or CapabilityProfiles

If the shell later gets write authority, it must be modeled as a declared
worker/runtime lane with its own CapabilityProfile, gates, HumanGate map and
Raindrop coverage. It does not become invisible magic.

## Intent Card

Every non-trivial observation should become an intent card before execution.

```yaml
type: intent.card
source: founder | employee | customer | system | department
captured_by: chief-of-staff-shell | ceo | c-level | human
observed_at: YYYY-MM-DDTHH:mm:ssZ
summary: <one sentence>
workspace_hint: registry:<key> | /absolute/path | unknown
department_hint: engineering | marketing | product | operations | ...
severity: low | medium | high | critical
user_impact: none | internal | customer | public | regulated
evidence:
  - screenshot:<path>
  - report:<path>
  - plane:<item-or-comment>
  - reproduction:<short step>
constraints:
  - no-production-write
  - no-public-publish
  - no-secret-read
requested_outcome: diagnose | fix | plan | report | escalate
```

The card is not a worker contract. It is the handoff from human context to CEO
routing.

## CEO Routing Packet

The CEO turns the intent card into a routing packet:

```yaml
type: ceo.routing
intent_card: <id-or-path>
owner_department: engineering | marketing | product | operations | ...
c_level_owner: role:cto | role:cmo | role:cpo | role:coo | ...
decision_class: L1 | L2 | L3 | HG-2.5 | HG-3 | HG-4
route: investigate | implement | audit | park | ask-founder
source_packet:
  workspaces:
    - registry:<key>
  source_of_truth:
    - <doc-or-report>
  memory_scope:
    - active-context
    - honcho
    - department-memory
  known_constraints:
    - <constraint>
expected_report:
  - diagnosis
  - changed_files
  - gates
  - escalation_needed
```

The CEO should not hand the department a vague complaint. The CEO hands over a
folder: observed issue, likely surface, known constraints, source-of-truth,
gates and expected reporting.

## Department Intake

The C-level owner decides whether the department can handle the work inside its
mandate.

```yaml
type: department.intake
department: engineering | marketing | product | operations | ...
owner: role:cto | role:cmo | role:cpo | role:coo | ...
ceo_routing: <id-or-path>
verdict: accept | needs-ceo-clarification | needs-founder-decision | split | reject
reason: <one sentence>
worker_plan:
  - role: <worker-role>
    contract: <Plane item or draft path>
    mode: audit | implement | verify | report
subagents_allowed: true | false
```

If the department sees a structural problem, it must escalate instead of
silently widening scope.

## Escalation Loop

When a worker or C-level owner discovers that the original task cannot be
completed inside current authority, the result moves upward:

```text
Worker -> Department Owner -> CEO -> Founder/Chief-of-Staff if needed
```

Escalation report:

```yaml
type: department.escalation
department: engineering | marketing | ...
owner: role:cto | role:cmo | ...
target: role:ceo | founder
human_gate: HG-2.5 | HG-3 | HG-4
problem: <what blocked direct completion>
root_cause: <what appears structurally wrong>
safe_options:
  - option: A
    tradeoff: <impact>
  - option: B
    tradeoff: <impact>
recommendation: <recommended decision>
blocked_actions:
  - <action>
```

The CEO may decide within its authority and send a decision packet back:

```yaml
type: ceo.decision
decision: approve-with-constraints | reject | split | ask-founder
authority: HG-2.5 | HG-3 | delegated
constraints:
  - <constraint>
return_to: role:cto | role:cmo | role:cpo | role:coo
expected_completion_report:
  - changed_files
  - tests
  - residual_risk
  - rollback
```

## Completion Loop

After work is done, the department returns a completion report to the CEO:

```yaml
type: department.completion
department: engineering | marketing | ...
owner: role:cto | role:cmo | ...
state: pass | pass-with-risk | blocked | rejected
work_items:
  - <Plane item>
commits:
  - <sha>
reports:
  - <path>
gates:
  - name: <gate>
    result: pass | fail | skipped
cao_verdict: PASS | REJECT | PARK | none
raindrop_summary: <path-or-none>
residual_risk: <one sentence>
next_action: <one sentence>
```

The CEO then writes the founder-facing handoff:

```yaml
type: ceo.handoff
target: chief-of-staff-shell | founder
intent_card: <id-or-path>
state: resolved | needs-founder | parked | rejected
plain_summary: <what happened in human language>
decision_trace:
  - <routing>
  - <department report>
  - <controller verdict>
founder_action_needed: true | false
```

The Chief-of-Staff shell translates this into a concise founder-facing summary
without hiding evidence.

## Example: Product Bug Observation

Input:

```text
"Sleep looks wrong in the app. HRV values are missing for Wednesday and
Thursday."
```

Expected chain:

1. Shell creates `intent.card` with screenshot, app version, observed dates,
   user impact and no-production-write constraint.
2. CEO routes to Engineering/CTO with source packet: app workspace, relevant
   sleep/HRV docs, known data contracts, recent reports and gates.
3. CTO accepts, creates audit/fix worker contract and may spawn bounded
   subagents if the contract allows it.
4. Worker diagnoses and either fixes inside HG-2/L3 sandbox or escalates if the
   data model, health logic, auth, Supabase/RLS or product policy must change.
5. CEO decides any HG-2.5/HG-3 path and returns constraints.
6. CTO executes or re-runs workers, then reports completion with tests.
7. CEO synthesizes for Chief-of-Staff shell.
8. Shell tells the founder what changed, what was verified and whether any
   decision remains.

## Why This Matters

Company.OS is not trying to make one super-assistant do everything. It is trying
to make company work legible, repeatable and improvable.

The chain may feel slower than a direct local fix in one session. It becomes
faster when:

- multiple departments run in parallel
- real employees use the system
- clients install it with their own roles
- auditability matters
- failures need root-cause learning
- prompts, contracts and workers improve from prior runs

The correct optimization target is not "shortest chat path." It is "shortest
safe path that leaves a company-grade trace."
