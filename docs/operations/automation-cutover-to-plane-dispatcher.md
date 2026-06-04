# Automation Cutover To Plane Dispatcher

Status: transition doctrine
Last updated: 2026-05-09
Use for: deciding what to do with the existing Codex cron automations while
Plane becomes the canonical execution ledger and Runtime Dispatcher v1.2 is
prepared

## Current Situation

The local Codex app has 13 active automations. They were useful during the
Linear/cron hardening phase, but they predate the full Plane-first migration.
If they keep growing, Company.OS will split into two operating brains:

1. legacy cron prompts that do work directly
2. Plane work items that describe the work but do not control execution

The cutover target is the opposite:

```text
Plane work item
  -> dispatcher lock/context
  -> headless worker boot pack
  -> worker run
  -> worker.reported
  -> CAO
  -> Codex controller
  -> CEO/Founder gate
```

Cron should become a thin scheduler/runner, not the source of truth.

## Decision

Do not shut off all automations immediately. That would remove useful
marketing/runtime coverage before the Plane dispatcher is proven.

Do freeze their scope:

- No new recurring Company.OS logic in old cron prompts.
- No new worker orchestration in old cron prompts.
- No new Linear-first assumptions in old cron prompts.
- New recurring Company.OS work must start as Plane work items.
- Existing automations are migrated lane-by-lane into the Runtime Dispatcher.

## Active Automation Classification

| Automation | Keep now | Migration class | Reason |
|---|---:|---|---|
| `company-os-runtime-auth-preflight` | yes | keep as preflight until v1.2 | proves auth and headless readiness before workers |
| `company-os-morning-ceo-brief` | yes | migrate after controller `--mode post` | useful CEO surface; should eventually read Plane first |
| `company-os-night-shift-controller` | limited | migrate first | highest risk of becoming competing controller |
| `company-os-git-worktree-hygiene` | yes | migrate after runtime | safe hygiene lane with low blast radius |
| `ares-daily-editorial-desk` | yes if marketing lane needed | domain lane | existing production workflow; keep gated |
| `ares-editorial-quality-gate` | yes if marketing lane needed | domain lane | artifact/truth gate, not Company.OS controller |
| `ares-editorial-eval-gate` | yes if Claude auth passes | domain lane | Claude eval lane; keep sentinel mandatory |
| `ares-distribution-planner` | yes if marketing lane needed | domain lane | dry-run planning only; keep no live publish |
| `ares-upload-post-scheduler` | cautious | domain lane | publishing-adjacent; require artifact truth and freeze flags |
| `ares-daily-performance-analytics` | yes | domain lane | read/report lane |
| `ares-product-knowledge-daily-desk` | yes if needed | domain lane | product/content creation; keep no publish |
| `ares-product-knowledge-upload-post-scheduler` | cautious | domain lane | publishing-adjacent; require artifact truth and freeze flags |
| `update-agents-md` | pause candidate | replace with Plane item | stale workspace target, not a daily control-plane lane |

## Recommended Immediate State

Keep active for now:

- `company-os-runtime-auth-preflight`
- `company-os-morning-ceo-brief`
- [SOURCE_COMPANY] marketing/content jobs that are still wanted operationally and already
  fail closed on auth/artifact gates

Do not rely on as the future controller:

- `company-os-night-shift-controller`

It may run during the transition, but every new orchestration improvement should
go into Plane/dispatcher docs/scripts, not into the old cron prompt.

Pause candidate:

- `update-agents-md`

It writes AGENTS in `[SOURCE_WORKSPACE]` on a weekly schedule and is no longer the
right shape now that global Plane-aware doctrine exists. Replace it with a
Plane-controlled cross-workspace boot-sync item.

## Cutover Milestones

### Phase 0 - Current bridge

- Plane migration is pari for the CEO-triaged Company.OS cohort.
- Mirrors have execution-plan enrichment.
- Existing cron jobs still run their old lanes.
- No scheduler dispatch from Plane yet.

### Phase 1 - Context-safe headless pilot

Run one bounded headless worker through the boot contract:

- work item: small parser/HTML verifier hardening task
- runtime: Claude Code CLI Opus 4.7 1M
- mode: plan or small implement
- output: worker.reported + report + CAO PASS/REJECT
- no scheduler activation

Success criteria:

- boot_context_proof present
- worker loads Company.OS docs without chat copy-paste
- report is controller-readable
- no forbidden writes

### Phase 2 - Codex Controller `--mode post`

Enable the deputy CEO to post bounded controller decisions to Plane:

- reads CAO PASS queue
- posts `controller.decision`
- does not spawn workers
- does not mark Done except through explicit HG-2.5 card

### Phase 3 - Runtime Dispatcher v1.2 single-spawn

Allow one Plane item to launch one worker:

- one project
- one role
- one runtime
- one work item
- one HG-2.5 release card
- one CAO pass

No cron loops yet.

### Phase 4 - Scheduler integration

Move selected recurring jobs from old Codex automations into Plane:

1. Runtime preflight lane
2. Morning CEO brief lane
3. Night sweep / improvement dream lane
4. Worktree hygiene lane
5. [SOURCE_COMPANY] marketing lanes, only after domain owners accept Plane-first routing

## Stop Rules

- Do not bulk-pause all automations without a same-day replacement path.
- Do not keep adding new orchestration logic to old cron prompts.
- Do not let Claude/Gemini self-poll Plane.
- Do not let old cron and new Plane dispatcher run the same lane at the same
  time.
- Do not count a drift window as clean if both systems can mutate the same
  surface without a lane lock.

## What To Tell Future Controllers

The existing 13 automations are transitional. They may keep the business moving,
but they are not the final Company.OS runtime. Any new autonomy must be routed
through Plane work items, headless boot contract, dispatcher, CAO, and Codex
controller.
