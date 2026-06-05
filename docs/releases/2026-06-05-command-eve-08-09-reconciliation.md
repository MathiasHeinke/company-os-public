# Command EVE 0.8 / 0.9 Reconciliation Promoted Into 1.0.0-alpha.3

Status: release reconciliation note
Date: 2026-06-05
Current version: `1.0.0-alpha.3`

## Purpose

This note reconciles older `0.8.x` and `0.9.x` Plane work against the Command
EVE operator-shell alpha line. Alpha.2 absorbed the narrow self-install
mechanics; Alpha.3 promotes the remaining closure work into a public
parent/child tree. This prevents the release plan from silently skipping
unfinished department, Command Center, support, security, scheduler and
connector work just because the local self-install path advanced.

## Verdict

`1.0.0-alpha.2` absorbed the narrow public self-install path that was originally
planned as the `0.9.0-rc.0` remote-install release candidate:

- public-main install/update proof
- one-command guided self-install wrapper
- local AionUI/Hermes/EVE sidecar install
- BYOK/Hermes auth preflight receipt
- EVE first-run confirmation queue
- update lifecycle smoke
- remote pilot runbook boundary

`1.0.0-alpha.3` does **not** claim those broader `0.8.x` or `0.9.x` product
tracks are stable-complete. It captures them as explicit closure lanes:

- department packs and dashboard templates
- Command Center parent/child review cards
- scheduler kill-switch and budget-brake lane
- self-observability/watchdog
- plugin and connector integration harness
- client rollout support/security/privacy/license gate
- stable support lifecycle, hosted provisioning, team/admin cloud or
  multi-tenant SaaS

No Plane item should be marked `Done` from this reconciliation alone. Items
should either be labelled as absorbed by alpha.2, left open as a gap, or split
into the next versioned parent/child tree.

## Plane Reconciliation

| Plane | Current state | Reconciliation | Next action |
|---|---:|---|---|
| `[WORK_ITEM_ID]` | Backlog | Keep as historical long-range parent. It still contains unfinished 0.8/0.9 work. | Comment with this reconciliation and keep open until child closeout is reviewed. |
| `[WORK_ITEM_ID]` | Backlog | Open gap: Engineering department wedge is not completed by alpha.2. | Route under `v0.8.x` / later `v1.2.x` department-pack work. |
| `[WORK_ITEM_ID]` | Backlog | Partially covered by Content Machine / Marketing wedge, but metrics and approval queue are not stable. | Keep open; require CMO closeout against marketing pack evidence. |
| `[WORK_ITEM_ID]` | Backlog | Partially covered by post-worker quality docs/registry, but autonomous recurring controller automation remains gated. | Keep open; require CAO/controller automation proof. |
| `[WORK_ITEM_ID]` | Backlog | Open gap: Command Center parent/child review cards are not implemented as product UI. | Keep open; route to dashboard/gate-card surface. |
| `[WORK_ITEM_ID]` | Backlog | Open gap: alpha.2 is not a full support/security/privacy/license client rollout gate. | Keep open; route to support/privacy release gate. |
| `[WORK_ITEM_ID]` | Backlog | Open gap: scheduler kill-switch and budget-brake lane are not released as default client automation. | Keep open; route to scheduler gating work. |
| `[WORK_ITEM_ID]` | Backlog | Partially covered: Supergoal Execution Ladder doctrine/scripts exist, but release integration closeout is not proven. | Keep open until State-Truth / target-class gate is attached to active release flow. |
| `[WORK_ITEM_ID]` | Backlog | Partially covered: Knowledge & Context Topology exists, but EVE runtime adoption is not complete. | Keep open; route to context/session continuity implementation. |
| `[WORK_ITEM_ID]` | Backlog | Open gap: EVE self-observability/watchdog is not complete. | Keep open; route to observability/watchdog design and smoke. |
| `[WORK_ITEM_ID]` | Backlog | Open gap: plugin/connector integration harness is documented but not productized in onboarding/UI. | Keep open; route to connector capability onboarding. |
| `[WORK_ITEM_ID]` | Backlog | Parent mostly superseded by `1.0.0-alpha.2` for install mechanics, but its children need child-level closeout now tracked under the Alpha.3 closure tree. | Comment with absorbed/open split; do not mark Done yet. |
| `[WORK_ITEM_ID]` | Backlog | Absorbed by alpha.2 release baseline and version truth. | Candidate for CEO closeout after evidence links are attached. |
| `[WORK_ITEM_ID]` | Backlog | Absorbed by alpha.2 install/update CLI path. | Candidate for CEO closeout after update smoke evidence is attached. |
| `[WORK_ITEM_ID]` | Backlog | Partially absorbed by self-install and remote pilot docs; full onboarding UX still open. | Keep open or split: remote docs absorbed, product onboarding remains. |
| `[WORK_ITEM_ID]` | Backlog | Absorbed by alpha.2 clean install/live install proof. | Candidate for CEO closeout after exact proof paths are attached. |
| `[WORK_ITEM_ID]` | Backlog | Partially absorbed by alpha.2 productization gates; full support/security/privacy/license release remains open. | Keep open; link to `[WORK_ITEM_ID]` / `[WORK_ITEM_ID]`. |
| `[WORK_ITEM_ID]` | Backlog | Absorbed by alpha.2 EVE first-run confirmation flow. | Candidate for CEO closeout after proof paths are attached. |
| `[WORK_ITEM_ID]` | Backlog | Partially absorbed by remote pilot runbook; actual external pilot handoff remains open. | Keep open until a non-founder guided install evidence packet exists. |

## Next Dispatch Order

1. Reconcile `[WORK_ITEM_ID]` children with comments and labels:
   `status:absorbed-alpha2`, `status:open-gap`, `track:reconciliation`,
   `version:0.9.x`.
2. Reconcile `[WORK_ITEM_ID]` 0.8/0.9 children with comments and labels:
   `version:0.8.x` or `version:0.9.x`, plus `status:open-gap` or
   `status:partial-alpha2`.
3. Start the next implementation parent from the still-open gaps, not from the
   absorbed 0.9 install mechanics:
   - department dashboards and review cards
   - support/security/privacy/license release gate
   - scheduler kill-switch/budget-brake
   - self-observability/watchdog
   - plugin/connector integration harness
4. Keep `[WORK_ITEM_ID]` and `[WORK_ITEM_ID]` as the new product-line view, but do not
   let them hide unfinished `0.8.x` / `0.9.x` execution work.

## Boundary

This reconciliation does not:

- mark Plane items `Done`
- create hosted accounts
- deploy infrastructure
- claim stable self-serve release
- claim hosted/multi-tenant readiness
- enable autonomous publish/send/spend/deploy actions
