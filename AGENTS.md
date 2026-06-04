# AGENTS.md - Company.OS

This repository is the productizable Company.OS source tree.

## Mission

Build reusable operating-system patterns for AI-native companies:

- installable Company.OS Kit
- C-level agent charters
- worker-agent issue contracts
- output quality gates
- work performance reviews
- controller reviews
- CEO intent calibration
- autonomy ladders
- reporting rhythms
- SOP and skill improvement loops

## Boot / System Index

- Zuerst dieses `AGENTS.md` lesen.
- Danach `docs/system-index.md` als Layer-0.5-Karte lesen.
- Nur die Deep-Files laden, die der Index fuer die Anfrage nennt.
- Bei Obsidian-/Brain-/Knowledge-Base-/Public-Release-Cockpit-Anfragen
  zusaetzlich `docs/operations/obsidian-brain-interface.md` lesen. Das ist
  Interface-Doktrin, nicht Source of Truth und kein zweites Memory/Execution
  Ledger.
- Lange Operating-System-Docs bleiben Source of Truth; Plane-Work-Items
  (canonical) und Linear-Issues (bridge) verlinken auf sie, statt ihre
  Inhalte zu duplizieren.
- Wenn ein Thema dauerhaft waechst, bekommt es einen eigenen Index oder
  Load-Regel-Eintrag.

## Operating Doctrine (Plane-first, C-Level plural, CAO separat)

Vor jeder Orchestration-, Worker- oder Controller-Arbeit zusaetzlich lesen:

1. `docs/orchestration/plane-first-linear-bridge.md` — Plane ist canonical
   Execution Ledger fuer neue Company.OS-Arbeit. Linear ist Legacy/Bridge
   bis Migration abgeschlossen.
2. `docs/orchestration/plane-role-routing.md` — jedes Plane Work Item
   traegt genau ein `role:*` Label aus { cto, cpo, cmo, coo, cfo, cao }.
3. `docs/operations/global-plane-auth-bridge.md` — Plane App / Connector ist
   bevorzugt; wenn eine Session den Connector nicht exponiert, ist die
   globale Company.OS Plane Auth Bridge der verbindliche Fallback. Kein
   Token-Paste, kein stiller Linear-Rueckfall.
4. `docs/orchestration/contract-controller.md` — Stage 0.5 prueft vor dem
   Lock, ob der Contract gut genug ist: Spec/Plan/Tasks, Harness/Eval,
   Scope, Runtime-Felder, Gates, Rollback, Split-, HG-3-CEO-Gate- und
   HG-4-Founder-Gate-Bedarf.
   Ohne frischen `controller.contract-review: CONTRACT_PASS` darf der
   Dispatcher nicht locken.
5. `docs/orchestration/contract-remediation-router.md` — Stage 0.6 routet
   Non-PASS Contract Reviews an den owning C-Level-Seat. CEO bekommt
   fehlende Owner/Decision/Source-Truth-Probleme und HG-3 Critical-Release-
   Pakete; Founder nur HG-4 ueber CEO + Chief-of-Staff Decision-Card. Kein
   Worker-Spawn aus schwachen Contracts.
6. `docs/orchestration/plane-worker-dispatcher-v0.md` — Dispatcher v0
   (Pull) liest Work Items, validiert Contract, schreibt Lock-Comments.
   Kein Spawn, kein Done.
7. `docs/orchestration/company-os-runtime-dispatcher-v1.md` — Dispatcher v1
   (Push): Company.OS-Scheduler startet Worker kontrolliert. Erfordert
   HG-2.5 Release-Karte. Stable Run-States: PASS, REJECT, BLOCKED_AUTH,
   BLOCKED_BUDGET, BLOCKED_DEPENDENCY, TIMEOUT, RUNTIME_ERROR, NEEDS_HUMAN.
   Kein Done durch Worker oder CAO.
8. `docs/orchestration/headless-worker-runtime-boot-contract.md` — Claude,
   Codex und Gemini CLI sind nur dann desktop-equivalent, wenn der Scheduler
   einen reproduzierbaren Boot-Pack aus Workspace-Regeln, System-Index,
   Plane-Contract, v0 Context und Source-of-Truth-Dateien injiziert. Kein
   `--bare`, kein Self-Polling, kein Worker ohne `boot_context_proof`.
9. `docs/orchestration/spec-to-worker-pipeline.md` — GitHub Spec Kit /
   `specify` ist die Denk- und Plan-Schicht, nicht die Execution-Source of
   Truth. Neue Projekte und grosse Features laufen ueber Spec -> Plan ->
   Tasks -> parsebaren Plane Worker Contract -> Capability Gate -> Runtime ->
   CAO/Controller. Kein Worker-Spawn aus reiner Prosa oder HTML-"Control
   Plane"-Bloecken.
10. `docs/orchestration/claude-clevel-worker-runtime.md` — Claude Code darf als
   C-Level-Worker und Subagent-Koordinator arbeiten, aber nur mit deklariertem
   `CapabilityProfile`, Honcho-/Memory-Grenzen, Reflection-Block und
   proposal-only Learning Loop. Keine ungeregelte Tool-/Plugin-Macht.
11. `docs/orchestration/multi-inference-c-level-runtime.md` — trennt C-Level
   Seat, Runtime-Agent, Modell-/Inference-Budget, CapabilityProfile,
   SplitPolicy und HumanGate. Claude bleibt live-primary; Codex/Gemini werden
   erst nach Adapter-, Stream-, CAO-, Cost- und Capability-Audit first-class
   Worker-Lanes.
12. `docs/orchestration/runtime-inference-router.md` — Stage 3.5 entscheidet
   vor dem Spawn, welche Inferenzschicht wirklich noetig ist: Sonnet fuer
   kleine reversible Arbeit, Opus 1M fuer shared-runtime/cross-repo, HG-3 nur
   mit CEO/Codex Critical-Release-Evidence, HG-4 nie autonom. Runtime Dispatcher v1.2 konsumiert
   `registries/inference/company-os.json`.
13. `docs/orchestration/codex-controller-runtime.md` — Codex CLI (GPT-5.5
   xhigh) als Deputy-CEO-Controller. Liest CAO-PASS-Items, schreibt
   `controller.decision` Plane-Comments + Release-Cards im HG-2.5- und
   HG-3-Rahmen, routet HG-3.5 an Chief-of-Staff/Founder-Proxy und eskaliert
   HG-4 an Founder. Spawnt nichts, baut nichts, ueberschreibt keinen CAO
   REJECT.
14. `docs/orchestration/codex-ceo-cli-boot-pack.md` — Headless Codex-CEO
   Boot-Pack fuer `codex exec`. Macht CLI/API-Codex nur dann controller-stark,
   wenn AGENTS, System/Page Index, Plane-/Runtime-Doktrin, Release-State,
   Auth-Lane und Context-Proof injiziert sind. Kein roher `codex exec` als
   CEO-Ersatz.
15. `docs/agents/cao.md` — Chief Audit Officer ist ein eigener Seat in
   eigener Session. CAO baut nichts; CAO entscheidet PASS/REJECT/PARK.
16. `docs/templates/worker-issue-contract.md` — Pflichtfelder fuer jedes
   delegierbare Work Item, inkl. `RoleLabel` und `ParentSeat`. Wenn
   `SubAgentRoster` non-empty, gilt zusaetzlich
   `docs/orchestration/subagent-reporting-contract.md`: ein einziges
   `worker.reported` mit strukturiertem `subagents:` Block, sonst CAO
   REJECT.
17. `docs/governance/ceo-release-authority.md` — HG-2.5: CEO/Codex darf
   bounded Release Actions autonom freigeben, wenn Confidence, CAO PASS,
   Rollback, Blast Radius, Budget und Artifact Truth nachweislich gruen sind.
   HG-3: CEO/Codex Critical Authority fuer harte, aber reversible/restorable
   Entscheidungen. HG-4: echter Founder fuer strategische oder
   nicht-wiederherstellbare Entscheidungen.
18. `docs/governance/fast-lane-flight-doctrine.md` — R1/R2 Fast-Lane:
   reversible Docs/Contracts/Reports/Validatoren und low-risk Code duerfen
   aggressiv ueber Plane -> Runtime -> CAO -> Controller laufen, wenn
   Stream, Heartbeat, Scope Guard, KillSwitch und Rollback aktiv sind. Nicht
   jede kleine Rakete erneut am Boden diskutieren.
19. `docs/operations/workspace-stewardship-protocol.md` — Dirty Worktrees sind
   Arbeit, keine Randnotiz. Jede Session muss Dirty State klassifizieren und
   entweder committen/pushen, owner-gebunden parken, blockiert reporten oder an
   den zustaendigen C-Level/CEO eskalieren. "Nicht von mir" ist nur eine
   Zwischenklassifikation, kein Endzustand.
20. `docs/operations/intent-to-department-reporting-chain.md` — AionUI/Hermes
   Chief-of-Staff und andere Operator-Shells erfassen Intent, aber routen
   state-changing work ueber CEO -> C-Level -> Worker -> CAO/Controller ->
   CEO-Handoff zurueck zum Founder.

Done-Transitions in Plane werden nicht durch Worker oder CAO gesetzt; sie
bleiben CEO/Founder-Hoheit. CEO/Codex darf Done ueber HG-2.5 oder HG-3 setzen,
wenn Release-Validator, CAO/Controller und Reversibilitaet passen; HG-4 bleibt
echte Founder-Entscheidung.

## Rules

- Keep this repository publishable.
- Do not add private customer data, secrets, credentials, raw chat dumps, or
  personal files.
- Prefer generic terms such as CEO, founder, company, agent, controller, and
  department.
- When an [SOURCE_COMPANY]-specific pattern is useful, extract the reusable operating
  principle and keep private context in the private company workspace.
- Do not leave a registered Company.OS workspace dirty as a final state. If
  dirty files exist, apply the Workspace Stewardship Protocol before moving on:
  resolve, park with owner/next check, or escalate with a report.
- Every harness must define:
  - who uses it
  - when it runs
  - scoring dimensions
  - fail/pass thresholds
  - output contract
  - improvement loop
  - human gates

## Productization Standard

Any new document should be usable in three modes:

1. Internal [SOURCE_COMPANY]/[SOURCE_COMPANY] operating system.
2. Client-facing paid implementation playbook.
3. MIT/open-source reference implementation.

## Kit Standard

The reusable installable kit lives in `kits/company-os-kit/`.

The kit may keep legacy internal folder names such as `.antigravity/` for
workflow compatibility, but the product name is Company.OS Kit.

Before adding kit files, check:

- no `.env`
- no `node_modules/`
- no `.DS_Store`
- no private raw memory or chat logs
- no live credentials
- no customer data

## Performance Doctrine

Company.OS evaluates two things separately:

- **Output quality:** Was the artifact good?
- **Work quality:** Did the agent work in the right way?

An agent can self-review, but cannot self-promote. A controller must review
calibration gaps and propose improvements to SOPs, skills, harnesses, evals, and
audit gates.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **Company.OS** (16684 symbols, 25299 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/Company.OS/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool | When to use | Command |
|------|-------------|---------|
| `query` | Find code by concept | `gitnexus_query({query: "auth validation"})` |
| `context` | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})` |
| `impact` | Blast radius before editing | `gitnexus_impact({target: "X", direction: "upstream"})` |
| `detect_changes` | Pre-commit scope check | `gitnexus_detect_changes({scope: "staged"})` |
| `rename` | Safe multi-file rename | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher` | Custom graph queries | `gitnexus_cypher({query: "MATCH ..."})` |

## Impact Risk Levels

| Depth | Meaning | Action |
|-------|---------|--------|
| d=1 | WILL BREAK — direct callers/importers | MUST update these |
| d=2 | LIKELY AFFECTED — indirect deps | Should test |
| d=3 | MAY NEED TESTING — transitive | Test if critical path |

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/Company.OS/context` | Codebase overview, check index freshness |
| `gitnexus://repo/Company.OS/clusters` | All functional areas |
| `gitnexus://repo/Company.OS/processes` | All execution flows |
| `gitnexus://repo/Company.OS/process/{name}` | Step-by-step execution trace |

## Self-Check Before Finishing

Before completing any code modification task, verify:
1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## Keeping the Index Fresh

After committing code changes, the GitNexus index becomes stale. Re-run analyze to update it:

```bash
npx gitnexus analyze
```

If the index previously included embeddings, preserve them by adding `--embeddings`:

```bash
npx gitnexus analyze --embeddings
```

To check whether embeddings exist, inspect `.gitnexus/meta.json` — the `stats.embeddings` field shows the count (0 means no embeddings). **Running analyze without `--embeddings` will delete any previously generated embeddings.**

> Claude Code users: A PostToolUse hook handles this automatically after `git commit` and `git merge`.

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->

## GitNexus Session Rules

The `gitnexus:start/end` block is generated. Keep persistent local operating
rules outside that block.

When debugging:

1. Use `gitnexus_query({query: "<error or symptom>"})` to find related
   execution flows.
2. Use `gitnexus_context({name: "<suspect function>"})` to inspect callers,
   callees and process participation.
3. Read `gitnexus://repo/company-os/process/{processName}` when a full flow
   trace is needed.
4. For regressions, run `gitnexus_detect_changes({scope: "compare", base_ref:
   "main"})`.

When refactoring:

- Renames must start with `gitnexus_rename({symbol_name: "old", new_name:
  "new", dry_run: true})`; do not use find-and-replace for symbols.
- Extractions and splits must start with `gitnexus_context({name: "target"})`,
  then `gitnexus_impact({target: "target", direction: "upstream"})`.
- Before finishing code modifications, confirm impact was reviewed, no
  HIGH/CRITICAL warning was ignored, and `gitnexus_detect_changes()` matches the
  intended scope.

Impact depth meanings: d=1 direct callers/importers, d=2 likely affected
indirect dependencies, d=3 transitive areas that may need testing.
