# AGENTS.md — [PROJEKT]

> Cross-Tool Universal Agent Brief. Wird von JEDEM Agent bei Session-Start gelesen.

## Identity
- **Projekt:** [Name]
- **Stack:** [Stack-Beschreibung]
- **User:** [Founder/CEO name]

## Architecture
→ Zuerst `memory-bank/system-index.md` lesen, falls vorhanden.
→ Sonst `docs/system-index.md` oder `ARCHITECTURE.md`.
→ `activeContext.md` ist Kurzstatus, nicht Archiv. Soft-Limit: 300 Zeilen.

## Design System
→ Siehe `DESIGN.md` (falls vorhanden)

## Build & Test
| Action | Command |
|--------|---------|
| Dev | `[dev command]` |
| Build | `[build command]` |
| Test | `[test command]` |
| Deploy | `/ship-it` |

## Coding Standards
- [Projekt-spezifische Standards eintragen]
- **TypeScript:** kein `any`, kein `as unknown`
- **Supabase:** RLS PFLICHT auf jeder Tabelle
- **PII-Scrubbing:** PFLICHT vor AI-Provider-Calls

## Critical Directives
1. **DIRECTIVE-003:** Ruthless Efficiency — No Feature Creep
2. **DIRECTIVE-004:** Verify Before Claim — Beweis vor Behauptung
3. **PII-Scrubbing** vor AI-Provider-Calls
4. **DSGVO:** Datensicherheit IMMER mitdenken
5. **Memory:** Drei Tiers — Operativ, Strategisch, Topografisch

## Plane-First Execution Ledger

Plane ist das kanonische Execution Ledger fuer Company.OS-Arbeit,
Agent-Orchestration, Scheduler, Controller/CAO, Worker-Routing und
Migration/Cutover. Linear ist nur Legacy/Bridge, bis eine Migration sauber
geschlossen ist.

Regeln:
- Neue Company.OS-/Orchestration-Work-Items in Plane anlegen, nicht in Linear.
- Linear nur fuer Bridge-Kommentare oder explizit freigegebene Legacy-Schritte
  nutzen.
- Delegierbare Plane Work Items brauchen `role:*` Label und parsebaren
  Worker-Contract.
- Worker und CAO markieren kein Plane `Done`; Done bleibt Founder/CEO-Hoheit.
- Wenn ein Domain-Workspace Company.OS-Orchestration beruehrt, die lokale
  Plane-first-Doktrin laden:
  `docs/orchestration/plane-first-linear-bridge.md`,
  `docs/orchestration/plane-role-routing.md`,
  `docs/orchestration/plane-state-model.md`,
  `docs/orchestration/spec-to-worker-pipeline.md`,
  `docs/templates/worker-issue-contract.md`.

## Spec-to-Worker Pipeline

Neue Projekte, MVPs, groessere Features, public releases und cross-workspace
Builds werden nicht direkt aus Prosa in Worker-Spawns uebersetzt. Erst
Spec/Plan/Tasks/Checklist erstellen oder lesen, dann in Plane einordnen, dann
jedes delegierbare Slice in den flachen fenced YAML Worker-Contract
normalisieren. GitHub Spec Kit / `specify` kann als Denk- und Plan-Schicht
dienen; Plane bleibt Execution Ledger.

HTML-"Control Plane"-Bloecke, gute Beschreibungen oder `tasks.md` allein sind
keine Worker-Contracts. Der Dispatcher darf erst laufen, wenn der parsebare
Contract vorhanden ist.

## Memory-to-Ledger Doctrine (Plane-first, Linear Legacy/Bridge)

Das Execution Ledger ist nicht der Memory Store. Honcho/GitNexus/Memory
Bank/Wiki/ADR behalten Wissens- und Architekturkontext; das Execution Ledger
wird nur aktualisiert, wenn eine Session konkrete Arbeit, Blocker, Milestones,
Review-Pflichten, priorisierte Follow-ups oder Statuswechsel erzeugt.

Plane ist das kanonische Ledger fuer neue Work Items, Worker Contracts,
Status-Transitions und Memory-Checkpoints. Linear ist Legacy/Bridge und wird
nur waehrend des Migration-Cohort-Fensters aus
`docs/orchestration/plane-first-linear-bridge.md` gelesen oder mit
Bridge-Kommentaren versorgt.

Bei `/update-memory`, `/ship-it` und Memory-Auto-Checkpoints: Plane zuerst
lesen, bestehende Work Items bevorzugen, neue Plane Work Items nur mit Ziel,
Akzeptanzkriterien, Guardrails, Zielworkspace, parsebarem Worker-Contract,
`role:*` Label und naechstem Schritt anlegen. Linear nicht neu beschreiben,
ausser eine explizit freigegebene Bridge-Skill mirror-kommentiert ein
bestehendes Linear-Issue auf die Plane-Source-of-Truth. Keine reinen
Session-Zusammenfassungen, Memory-Dumps oder parked-repo-Ideen ins Execution
Ledger schreiben.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

> Run `npx gitnexus analyze` to index this repository, then `npx gitnexus index` to register it.
> After indexing, the stats below will auto-populate.

<!-- gitnexus:end -->
