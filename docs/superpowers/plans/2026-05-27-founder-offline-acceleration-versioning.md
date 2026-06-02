# Founder Offline Acceleration Versioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Founder Offline Test the explicit 3-6 month release track for Command EVE / Company.OS, so every version, roadmap item and release decision states what level we are at, what evidence exists, what is missing and whether the change moves the system closer to the target.

**Architecture:** Keep `VERSION` as the product version, but add a second canonical release dimension: `Founder Offline Readiness: L<N>/L10`. Roadmap and changelog entries must include a `Founder Offline Delta`, and each release gate must produce a scorecard artifact under `reports/founder-offline/`. This avoids lying with version numbers while still accelerating the proof path.

**Tech Stack:** Markdown doctrine, Company.OS release docs, optional Node release-gate script, Plane worker contracts after founder approval.

---

## Current Read

- Current product version: `0.7.1-rc.0`.
- Current product claim: self-serve install/onboarding/update candidate, not unattended public release.
- Current Founder Offline readiness: roughly `L2/L10`, with `L3` in reach and partial `L4` substrate already proven by Plane -> Worker -> CAO -> Controller evidence.
- Current target drift: `docs/operations/command-eve-founder-offline-readiness.md` places L8 at `1.2` and L9-L10 at `2.x/3.x`, which is too slow for the revised 3-6 month objective.
- Required correction: introduce an accelerated narrow-lane proof track without pretending broad, multi-company, multi-department autonomy is already solved.

## Version Strategy

Do not inflate `1.0` or pretend broad autonomy is done. Instead:

| Product version | Founder Offline claim | Time target | Meaning |
|---|---|---|---|
| `0.7.2` | L0-L2 practical | 1-2 weeks | EVE loads boot packet, answers from evidence, maps existing systems. |
| `0.7.3` | L2 verified | 2-3 weeks | `wo stehen wir?` returns current level, evidence, blockers and next action. |
| `0.8.0` | L3 pass | 3-5 weeks | First department wedge produces parent/child contracts and manual dispatch path. |
| `0.8.1` | L4 pass | 5-7 weeks | One bounded lane completes Worker -> CAO -> Controller repeatedly. |
| `0.8.2` | L5 pass | 7-9 weeks | Required connectors for the first wedge are scoped, preflighted and gated. |
| `0.8.3` | L6 pass | 9-11 weeks | Daily ops autopilot runs 7 consecutive days with budget brake, kill switch and escalation queue. |
| `0.9.0` | L7 pass | 11-13 weeks | Founder receives compressed decision packets instead of raw noise. |
| `0.9.1` | L8 pass | 13-16 weeks | 72-hour shadow offline run completes with only parked HG-4 decisions. |
| `0.9.2` | L9 narrow-lane pass | 16-24 weeks | Staged 14-day assisted offline run works for one real operating lane with emergency channel. |
| `1.0.0` | Repeatable guided beta | after L9 proof | The narrow-lane offline proof is repeatable and packaged for guided installs. |

Important distinction:

- `L9 narrow-lane pass` means one explicitly scoped business lane keeps operating while the founder is offline or shadow-offline.
- `L10 broad Founder Offline Test pass` still requires repeated proof across earning, product, support, risk, decisions and founder health. That can remain later, but the marketable product proof moves into `0.9.x`.

## Files To Modify

- Modify: `${LOCAL_WORKSPACE}`
  - Add `Founder Offline Readiness` as a separate version layer.
  - Add a required `Founder Offline Delta` section for changelog/release entries.
  - Add promotion rules for L-level claims.

- Modify: `${LOCAL_WORKSPACE}`
  - Add a top-level `Founder Offline Acceleration Track - 2026-05 to 2026-11`.
  - Map `0.7.2` through `0.9.2` to evidence-backed readiness levels.
  - State that unchecked backlog items do not count unless they move the Founder Offline score.

- Modify: `${LOCAL_WORKSPACE}`
  - Split the current release placement into two tracks:
    - broad maturity track
    - accelerated narrow-lane proof track
  - Update "What EVE Should Say" to include `3-6 month target status`.

- Modify: `${LOCAL_WORKSPACE}`
  - Add an Unreleased `Founder Offline Delta` section template.
  - Record the initial acceleration decision after the docs are updated.

- Create: `${LOCAL_WORKSPACE}`
  - Scorecard template used by release gates and EVE.

- Optional create: `${LOCAL_WORKSPACE}`
  - Deterministic gate that checks the scorecard exists and required evidence paths are present.

- Optional create: `${LOCAL_WORKSPACE}`
  - Pure functions for parsing scorecards and validating required evidence.

- Optional create: `${LOCAL_WORKSPACE}`
  - Node tests for the readiness gate.

## Task 1: Add Founder Offline Readiness To Versioning

**Files:**
- Modify: `${LOCAL_WORKSPACE}`

- [ ] **Step 1: Add a row to `Version Layers`**

Insert this row after `Product version`:

```markdown
| Founder Offline readiness | `L2/L10` | How close Command EVE / Company.OS is to the Founder Offline Test. This is the north-star evidence ladder, separate from product version. | `docs/operations/command-eve-founder-offline-readiness.md`, `reports/founder-offline/` |
```

- [ ] **Step 2: Add a new section after `Current Canonical Version`**

```markdown
## Current Founder Offline Readiness

```text
L2/L10 approximate, L3 in reach
```

This is not a product version. It means:

- EVE can be seeded through an intake and boot packet.
- The install/onboarding/update evidence drill passes.
- Existing-system inventory exists as doctrine and generated packet structure.
- The first real department wedge and repeated managed loop are not yet proven.

Every release from `0.7.2` onward must include a `Founder Offline Delta`:

```text
Founder Offline before:
Founder Offline after:
Evidence added:
Still blocked:
Next level:
```

A feature that does not improve evidence, reduce founder noise, improve safe autonomy, improve connector trust, improve review compression or protect founder health should not be release-critical during the acceleration track.
```

- [ ] **Step 3: Add L-level promotion rules**

Insert after `Autonomy Profile Rules`:

```markdown
## Founder Offline Promotion Rules

Founder Offline readiness can only move up when evidence exists:

- `L0-L2`: boot packet, EVE soul, first greeting and existing-system inventory evidence.
- `L3`: first department wedge parent/child contracts exist with `dispatch: manual`.
- `L4`: at least one Worker -> CAO -> Controller loop completes for that wedge.
- `L5`: required connectors are scoped, preflighted and gated; no broad secrets or unbounded write scopes.
- `L6`: recurring daily work runs for at least seven consecutive days with budget brake, kill switch, artifact truth and escalation queue.
- `L7`: founder review queue compresses operational noise into approve/reject/defer packets.
- `L8`: 72-hour shadow offline run completes with only parked HG-4 decisions.
- `L9`: staged 14-day assisted offline run completes for one declared operating lane with emergency channel.
- `L10`: broad 14-day Founder Offline Test passes across earning, operating, shipping, support, risk monitoring, decision preparation and founder health protection.

No L-level claim is valid without a scorecard under:

```text
reports/founder-offline/YYYY-MM-DD/readiness-scorecard.md
reports/founder-offline/YYYY-MM-DD/readiness-scorecard.json
```
```

- [ ] **Step 4: Verify the doc references stay consistent**

Run:

```bash
rg -n "Founder Offline|readiness|0\\.9\\.2|L9" docs/releases/versioning.md
```

Expected: the new layer, current readiness section and promotion rules are visible.

## Task 2: Add Acceleration Track To Roadmap

**Files:**
- Modify: `${LOCAL_WORKSPACE}`

- [ ] **Step 1: Add a release track after `Release Accounting Snapshot`**

Insert:

```markdown
## Founder Offline Acceleration Track - 2026-05 to 2026-11

The Founder Offline Test is the current product north star:

```text
Can the Founder turn off phone and laptop for 14 days while the company keeps
earning, operating, shipping, supporting customers, monitoring risks, preparing
decisions and protecting the Founder's body and life?
```

The accelerated track moves a narrow-lane proof into the `0.9.x` line while
keeping broad multi-department L10 maturity as a later repeatability target.

| Version | Readiness target | Required proof |
|---|---|---|
| `0.7.2` | L0-L2 practical | EVE loads boot packet and answers from evidence in AionUI/Hermes. |
| `0.7.3` | L2 verified | `wo stehen wir?` returns level, evidence paths, blockers and next action. |
| `0.8.0` | L3 pass | One department wedge has Founder Intent Packet, CEO Delegation Packet, Plane parent and child contracts. |
| `0.8.1` | L4 pass | One bounded lane completes Worker -> CAO -> Controller repeatedly. |
| `0.8.2` | L5 pass | Required connectors for the first wedge are scoped, preflighted and HumanGate mapped. |
| `0.8.3` | L6 pass | Seven-day daily ops autopilot proof with budget brake, kill switch, artifact truth and escalation queue. |
| `0.9.0` | L7 pass | Founder Daily Queue compresses operational noise into approve/reject/defer packets. |
| `0.9.1` | L8 pass | 72-hour shadow offline run completes with only parked HG-4 decisions. |
| `0.9.2` | L9 narrow-lane pass | Staged 14-day assisted offline run works for one declared operating lane with emergency channel. |
| `1.0.0` | Repeatable guided beta | The narrow-lane offline proof is repeatable and installable as a guided pilot. |

During this track, backlog items are only release-critical if they produce a
Founder Offline Delta:

- raise the readiness level,
- add required evidence,
- remove a current blocker,
- reduce founder operational noise,
- improve bounded safe autonomy,
- improve connector trust,
- improve decision compression,
- or protect founder health/life boundaries.
```

- [ ] **Step 2: Add one sentence under each `v0.7`, `v0.8`, `v0.9`, `v1.0` heading**

For `v0.7` add:

```markdown
Founder Offline acceleration role: make L0-L2 real in the runtime, not just docs.
```

For `v0.8` add:

```markdown
Founder Offline acceleration role: prove L3-L5 through one department wedge before expanding breadth.
```

For `v0.9` add:

```markdown
Founder Offline acceleration role: prove L6-L9 for one narrow operating lane before claiming broad self-serve autonomy.
```

For `v1.0` add:

```markdown
Founder Offline acceleration role: make the narrow-lane proof repeatable enough for guided beta installs.
```

- [ ] **Step 3: Verify the top-level roadmap carries the target**

Run:

```bash
rg -n "Founder Offline Acceleration|0\\.9\\.2|narrow-lane|L9" ROADMAP.md
```

Expected: roadmap now makes the 3-6 month target discoverable without chat context.

## Task 3: Split Broad Maturity From Accelerated Narrow-Lane Proof

**Files:**
- Modify: `${LOCAL_WORKSPACE}`

- [ ] **Step 1: Replace `Current 0.7.x Target` release placement paragraph**

Replace the paragraph beginning with `` `0.7.2` should make L0-L2 practical`` with:

```markdown
There are now two release tracks:

1. **Broad maturity track:** the general Company.OS line continues toward
   multi-department, multi-client L10 maturity. This remains evidence-heavy and
   may extend beyond `1.0`.
2. **Accelerated narrow-lane proof track:** the `0.7.2` to `0.9.2` line targets
   a staged 14-day assisted offline run for one explicitly declared operating
   lane within 3-6 months.

Accelerated placement:

- `0.7.2`: L0-L2 practical in AionUI/Hermes.
- `0.7.3`: L2 verified through `wo stehen wir?` runtime answer.
- `0.8.0`: L3 pass for one department wedge.
- `0.8.1`: L4 pass for the first bounded lane.
- `0.8.2`: L5 pass for required connectors.
- `0.8.3`: L6 pass through a seven-day daily ops autopilot run.
- `0.9.0`: L7 pass through Founder Daily Queue / HG decision compression.
- `0.9.1`: L8 pass through a 72-hour shadow offline run.
- `0.9.2`: L9 narrow-lane pass through a staged 14-day assisted offline run.
- `1.0.0`: repeatable guided beta after L9 narrow-lane proof.

This does not mean broad L10 is solved. It means the category-defining proof is
pulled forward by narrowing the first lane, increasing evidence cadence and
forcing every feature to declare a Founder Offline Delta.
```

- [ ] **Step 2: Add target status to the EVE response shape**

In the "What EVE Should Say" response shape, add:

```text
- Acceleration track: <0.7.2 / 0.8.x / 0.9.x target and whether we are ahead/on-track/blocked>.
```

- [ ] **Step 3: Add a false-autonomy warning**

Under `Non-Negotiable Boundaries`, add:

```markdown
- If a new feature increases demo surface but does not add readiness evidence,
  it does not move the Founder Offline level.
- If a 14-day run only works because the Founder secretly checks messages,
  fixes prompts, approves routine items or manually repairs connectors, it is
  not an L9 pass.
```

## Task 4: Add Founder Offline Scorecard Template

**Files:**
- Create: `${LOCAL_WORKSPACE}`

- [ ] **Step 1: Create the template**

Use this exact content:

```markdown
# Founder Offline Readiness Scorecard

Date: YYYY-MM-DD
Product version:
Founder Offline level before:
Founder Offline level after:
Track: broad maturity | accelerated narrow-lane proof
Operating lane:
HumanGate owner:

## Verdict

Status: PASS | PARTIAL | BLOCKED
One-line read:

## Evidence Added

| Evidence | Path | Required for level | Status |
|---|---|---|---|
| Boot packet | `.company-os/onboarding/eve-boot-packet.json` | L1-L2 | missing |
| Existing-system inventory |  | L2 | missing |
| Department wedge parent |  | L3 | missing |
| Worker report |  | L4 | missing |
| CAO verdict |  | L4 | missing |
| Controller decision |  | L4 | missing |
| Connector preflight |  | L5 | missing |
| Recurring run log |  | L6 | missing |
| Founder Daily Queue |  | L7 | missing |
| 72-hour shadow report |  | L8 | missing |
| 14-day assisted run report |  | L9 | missing |
| Founder health/life guardrail |  | L9-L10 | missing |

## Founder Offline Delta

Founder Offline before:
Founder Offline after:
What moved:
What did not move:
What got easier for the Founder:
What got riskier:

## Blockers

| Blocker | Level blocked | Owner | Next proof |
|---|---|---|---|

## Decision

Approve level change: yes | no
Reason:
Next version target:
```

- [ ] **Step 2: Verify the template exists**

Run:

```bash
test -f docs/templates/founder-offline-readiness-scorecard.md && sed -n '1,80p' docs/templates/founder-offline-readiness-scorecard.md
```

Expected: the scorecard header and evidence table print.

## Task 5: Add Changelog Discipline

**Files:**
- Modify: `${LOCAL_WORKSPACE}`

- [ ] **Step 1: Add an Unreleased section**

Under `## Unreleased`, after the existing `Changed:` block, add:

```markdown
Founder Offline Delta:

- Current readiness remains `L2/L10` until the first runtime-backed
  `wo stehen wir?` and first department wedge proofs are complete.
- The acceleration plan moves a narrow-lane L9 proof into the `0.9.x` line:
  one staged 14-day assisted offline run for one declared operating lane.
- Broad L10 remains gated by repeatability across earning, product, support,
  risk monitoring, decision preparation and founder health protection.
```

- [ ] **Step 2: Add future changelog rule to versioning**

If not already covered in Task 1, ensure `docs/releases/versioning.md` states:

```markdown
Every changelog entry that changes runtime, autonomy, connector scope,
department packs, scheduler behavior, EVE behavior or HumanGate handling must
include a `Founder Offline Delta`.
```

## Task 6: Optional Deterministic Release Gate

**Files:**
- Create: `${LOCAL_WORKSPACE}`
- Create: `${LOCAL_WORKSPACE}`
- Create: `${LOCAL_WORKSPACE}`

- [ ] **Step 1: Define the core validator**

Create `scripts/release-gates/founder-offline-readiness-core.mjs` with:

```js
import fs from "node:fs";

export function validateFounderOfflineScorecard({ scorecardPath, requiredLevel }) {
  const blockers = [];
  const warnings = [];

  if (!scorecardPath) {
    blockers.push({ id: "scorecard.path-missing", message: "scorecardPath is required" });
    return { ok: false, blockers, warnings };
  }

  if (!fs.existsSync(scorecardPath)) {
    blockers.push({ id: "scorecard.file-missing", message: `Missing scorecard: ${scorecardPath}` });
    return { ok: false, blockers, warnings };
  }

  const content = fs.readFileSync(scorecardPath, "utf8");
  const required = [
    "Product version:",
    "Founder Offline level before:",
    "Founder Offline level after:",
    "## Founder Offline Delta",
    "## Evidence Added",
    "## Blockers",
    "Approve level change:"
  ];

  for (const marker of required) {
    if (!content.includes(marker)) {
      blockers.push({ id: "scorecard.marker-missing", message: `Missing marker: ${marker}` });
    }
  }

  if (requiredLevel && !content.includes(requiredLevel)) {
    warnings.push({ id: "scorecard.required-level-not-mentioned", message: `Required level ${requiredLevel} is not mentioned` });
  }

  return { ok: blockers.length === 0, blockers, warnings };
}
```

- [ ] **Step 2: Add tests**

Create `scripts/release-gates/founder-offline-readiness-core.test.mjs` with tests for:

```js
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { validateFounderOfflineScorecard } from "./founder-offline-readiness-core.mjs";

test("blocks when scorecard path is missing", () => {
  const result = validateFounderOfflineScorecard({});
  assert.equal(result.ok, false);
  assert.equal(result.blockers[0].id, "scorecard.path-missing");
});

test("blocks when scorecard file is missing", () => {
  const result = validateFounderOfflineScorecard({ scorecardPath: "/tmp/does-not-exist-founder-offline.md" });
  assert.equal(result.ok, false);
  assert.equal(result.blockers[0].id, "scorecard.file-missing");
});

test("passes when required markers exist", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "founder-offline-scorecard-"));
  const file = path.join(dir, "readiness-scorecard.md");
  fs.writeFileSync(file, [
    "Product version:",
    "Founder Offline level before:",
    "Founder Offline level after:",
    "## Founder Offline Delta",
    "## Evidence Added",
    "## Blockers",
    "Approve level change:"
  ].join("\\n"));

  const result = validateFounderOfflineScorecard({ scorecardPath: file, requiredLevel: "L3" });
  assert.equal(result.ok, true);
  assert.equal(result.blockers.length, 0);
  assert.equal(result.warnings[0].id, "scorecard.required-level-not-mentioned");
});
```

- [ ] **Step 3: Add CLI wrapper**

Create `scripts/release-gates/founder-offline-readiness.mjs` with:

```js
#!/usr/bin/env node
import { validateFounderOfflineScorecard } from "./founder-offline-readiness-core.mjs";

const args = process.argv.slice(2);
const scorecardPath = args[args.indexOf("--scorecard") + 1];
const requiredLevelIndex = args.indexOf("--required-level");
const requiredLevel = requiredLevelIndex >= 0 ? args[requiredLevelIndex + 1] : undefined;

const result = validateFounderOfflineScorecard({ scorecardPath, requiredLevel });

if (args.includes("--json")) {
  console.log(JSON.stringify(result, null, 2));
} else if (result.ok) {
  console.log(`PASS: Founder Offline scorecard valid with ${result.warnings.length} warnings`);
} else {
  console.log(`BLOCKED: Founder Offline scorecard has ${result.blockers.length} blockers`);
  for (const blocker of result.blockers) {
    console.log(`- ${blocker.id}: ${blocker.message}`);
  }
}

process.exit(result.ok ? 0 : 1);
```

- [ ] **Step 4: Run tests**

Run:

```bash
node --test scripts/release-gates/founder-offline-readiness-core.test.mjs
```

Expected: all tests pass.

## Task 7: Create Plane Parent And Child Contracts After Founder Approval

**Files:**
- Read: `${LOCAL_WORKSPACE}`
- Write via Plane only after approval.

- [ ] **Step 1: Create parent**

Title:

```text
Command EVE Founder Offline Acceleration Track
```

Parent scope:

```text
Integrate the Founder Offline Test into Company.OS versioning, roadmap, release gates and evidence reports so 0.7.2-0.9.2 move toward a 3-6 month narrow-lane offline proof.
```

- [ ] **Step 2: Create child work items**

Create these child contracts with `Dispatch: manual`:

1. `role:cpo` plan/update versioning and roadmap docs.
2. `role:cto` implement optional readiness scorecard gate.
3. `role:coo` define first wedge operating lane and 7-day/72-hour/14-day runbook.
4. `role:cmo` choose Marketing/Content/Growth as first revenue-visible wedge unless Founder overrides.
5. `role:cto` wire EVE `wo stehen wir?` answer to boot packet plus readiness ladder.
6. `role:cao` audit whether each release claim has evidence and no false-autonomy inflation.

## Self-Review

- Spec coverage: covers versioning, roadmap, readiness ladder, changelog, scorecard evidence, optional deterministic gate and Plane follow-up.
- Placeholder scan: no `TBD`, no unspecified "add tests later"; optional scripts have full minimal code and tests.
- Type consistency: `Founder Offline readiness`, `Founder Offline Delta`, `readiness-scorecard.md` and L-level vocabulary are used consistently.

## Execution Options

1. **Docs-only integration first:** update versioning, roadmap, readiness ladder, changelog and template. This is the safest next move.
2. **Docs + gate script:** do docs plus deterministic scorecard validator and tests.
3. **Full control-plane integration:** do docs, gate script and Plane parent/child contracts after Founder approval.
