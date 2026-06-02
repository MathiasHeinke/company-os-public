---
description: 🔬 Deep Audit — Exhaustive Code Quality, Performance, Security & Dead Code Annihilation Pipeline
---

// turbo-all

# 🔬 Deep Audit — The Surgical Strike

> **KEIN QUICK-SCAN. Ein vollständiges Röntgenbild der Codebase.**
>
> 8-Stage Pipeline: Context → Scope → Static → Smart → Multi-Lens Review → Verdict → Hotfix → Verify.
> Jede Stage hat feste EVAL-Kriterien. Am Ende steht ein Refactoring-Plan + sofortige Hotfixes + Cleanup.

> Auslöser: `/deep-audit` (Full System) oder `/deep-audit [scope]` (Targeted)
> Beispiele:
>   - `/deep-audit` → Alles seit letztem Audit
>   - `/deep-audit src/pages/public/TdeeFeaturePage.tsx` → Einzelne Datei
>   - `/deep-audit features/bloodwork` → Feature-Bereich
>   - `/deep-audit last-week` → Alles was letzte Woche gebaut wurde
>   - `/deep-audit edge-functions` → Alle Edge Functions
>   - `/deep-audit --author=mathias` → Nur Commits eines bestimmten Authors
>   - `/deep-audit since-last-audit` → Alles seit dem letzten Deep Audit (aus Memory Bank)

---

## 🔴 UNVERHANDELBARE REGELN

> [!CAUTION]
> **Diese Regeln gelten für JEDEN Audit-Durchlauf. Keine Ausnahme.**

1. **KEIN Fix ohne Finding.** Keine preemptive Refactors. Nur was der Audit findet wird angefasst.
2. **KEIN Finding ohne Beweis.** Jedes Finding braucht: Datei + Zeile + Reproduktionspfad + Impact.
3. **KEIN Skip.** Wenn eine Stage 0 Findings hat → dokumentiere "0 Findings" + Beweis-Command.
4. **Impact IMMER vor Fix.** `gitnexus_impact` auf JEDES Symbol das gefixt wird — BEVOR der Fix geschrieben wird.
5. **Dead Code wird SOFORT gelöscht.** Kein "TODO: cleanup later". Jetzt.
6. **Severity ist binär messbar.** 🔴 Critical = Production-Impact. 🟡 Warning = Code Smell. 🟢 Info = Style.

---

## Übersicht: 7-Stage Pipeline

```
Stage 0: 🧠 DEEP CONTEXT (Codebase-Röntgenbild erstellen)
    ↓
Stage 1: 🎯 SCOPE LOCK (Was wird geprüft? Files, Commits, Symbols)
    ↓
Stage 2: 🔍 STATIC SCAN (Grep, TSC, Pattern-Matching → deterministische Findings)
    ↓
Stage 3: 🧬 SMART SCAN (GitNexus, Impact, Bundle, Tests, Edge Functions)
    ↓
Stage 4: 👁️ MULTI-LENS REVIEW (4 Persona-Perspektiven auf die Findings)
    ↓
Stage 5: ⚖️ VERDICT (Konsolidieren, Diff-Awareness, Refactoring-Plan)
    ↓
Stage 6: 🔥 HOTFIX (Alle 🔴 Critical fixen, Dead Code vernichten)
    ↓
Stage 7: ✅ VERIFY (TSC, Build, detect_changes, Browser Smoke, Bundle Delta)
    ↓
📋 AUDIT REPORT → Metric Trends → Memory Bank Update
```

---

## Stage 0: 🧠 DEEP CONTEXT — Codebase-Röntgenbild

> **Ziel:** Dem LLM MAXIMALE Klarheit über Codebase, Produkt, und aktuellen Stand geben.
> **Dauer:** ~5 min. **Skip:** NIE.

### 0.1 System-Kontext laden (PFLICHT)

```text
PFLICHT-LEKTÜRE (in dieser Reihenfolge):
1. memory-bank/system-index.md       → Komprimierte Systemlandkarte
   ODER memory-bank/techContext.md + memory-bank/systemPatterns.md
2. memory-bank/activeContext.md       → Aktueller Arbeitsstand + letzte Sessions
3. memory-bank/progress.md            → Was fertig, was offen
4. AGENTS.md                          → Agent Brief + Coding Standards
5. DESIGN.md                          → Design System (IMMER lesen bei UI/Frontend-Scope!)
6. .antigravity/logs/architect-memory.md → Active Directives + Post-Mortems
7. memory-bank/semantic-context.md    → Gewachsenes Systemverständnis (falls vorhanden)
```

ZUSÄTZLICH bei spezifischen Domänen:
- **UI Scope** → `DESIGN.md` ist PFLICHT, nicht optional
- **DB/Backend Scope** → Supabase Schema laden: `mcp_supabase-mcp-server_list_tables({project_id: "...", schemas: ["public"], verbose: true})`
- **Edge Functions** → `memory-bank/edge-function-registry.md` (falls vorhanden)

### 0.2 Technischen Stand erfassen

```bash
# Git: Letzten 20 Commits scannen
git log --oneline -20

# Package-Version & Dependencies
cat package.json | head -30

# TypeScript Config
cat tsconfig.json | head -20

# Aktuelle Build-Gesundheit
npx tsc --noEmit 2>&1 | tail -5
```

### 0.3 Code Intelligence laden (GitNexus)

```text
# Codebase-Überblick
READ gitnexus://repo/[SOURCE_WORKSPACE]/context

# Alle funktionalen Bereiche
READ gitnexus://repo/[SOURCE_WORKSPACE]/clusters

# Alle Execution Flows (Prozesse)
READ gitnexus://repo/[SOURCE_WORKSPACE]/processes
```

> [!IMPORTANT]
> **Falls GitNexus meldet "index stale":** Zuerst `npx gitnexus analyze` ausführen, DANN fortfahren.

### 0.4 Memory Systems abfragen (optional, bei targeted audit)

```text
# Honcho: Was weiß das System über den Bereich?
Falls relevant: mcp_honcho_chat({peer_id: "nous", query: "[scope] known issues"})

# Architect Memory: Gab es Post-Mortems in dem Bereich?
grep -i "[scope-keyword]" .antigravity/logs/architect-memory.md

# Wiki: Domänen-Wissen laden
Falls relevant: docs/wiki/[domain].md
```

### 0.5 Context-Zusammenfassung schreiben

Erstelle ein internes Context-Briefing (NICHT als Datei — nur im Kontext halten):

```text
CONTEXT BRIEF:
- Projekt: [Name] | Stack: [Tech] | Deploy: [Target]
- Letzte Änderungen: [Zusammenfassung der letzten 5-10 Commits]
- Bekannte Issue-Bereiche: [aus Memory Bank / Architect Memory]
- GitNexus Index: [X Symbols, Y Relationships, Z Processes]
- Build-Status: [Clean / X Errors]
- Scope: [Full / Targeted → was genau]
```

---

## Stage 1: 🎯 SCOPE LOCK — Was wird geprüft?

> **Ziel:** Exakte Datei-Liste, Symbol-Liste und Commit-Range für den Audit bestimmen.

### 1.1 Scope-Resolution

| User-Input | Resolution-Strategie |
|---|---|
| (kein Scope) | Alle Änderungen seit letztem Audit / letzte 20 Commits |
| `[datei.tsx]` | Exakt diese Datei + alle Imports/Exports |
| `[feature-name]` | GitNexus query → alle beteiligten Files |
| `last-week` | `git log --oneline --since="7 days ago"` → alle geänderten Files |
| `edge-functions` | Alle `.ts` Files in Edge Function Pfaden |
| `[component-name]` | GitNexus context → File + alle Caller/Callees |
| `since-last-audit` | Letzten Audit-Commit aus `memory-bank/progress.md` finden → `git log [hash]..HEAD` |
| `--author=[name]` | `git log --author="[name]" --since="14 days ago" --name-only` → nur deren Files |

### 1.2 Scope-Discovery Commands

```bash
# A) Full Scope: Alle geänderten Files seit letztem Audit
git log --oneline --since="7 days ago" --name-only | sort -u | grep -E "\.(ts|tsx|css|sql)$"

# B) Targeted Scope: Feature-Bereich
gitnexus_query({query: "[scope]", include_content: false, limit: 10})

# C) Single File: Import-Graph aufbauen
grep -rn "import.*from.*[filename]" src/ --include="*.ts" --include="*.tsx" | head -20
```

### 1.3 Scope-Lock Ausgabe

```text
SCOPE LOCK:
- Files in Scope: [N]
- Symbols in Scope: [N] (aus GitNexus)
- Commit Range: [hash..HEAD]
- Estimated LOC: [N]
- Primary Authors: [aus git log]
```

### 1.4 Scope-Gate

```text
Scope hat ≥1 Datei?
  → JA: Weiter zu Stage 2
  → NEIN: "Kein auditbarer Code im Scope gefunden." → STOP
```

---

## Stage 2: 🔍 STATIC SCAN — Deterministische Pattern-Checks

> **Ziel:** Alles was OHNE Semantik-Verständnis gefunden werden kann. Grep, TSC, Pattern-Matching.
> **Keine Interpretation nötig — pure Pattern-Erkennung.**

### 2.1 TypeScript Strict Check

```bash
npx tsc --noEmit 2>&1 | grep -E "error TS" | head -30
```

EVAL: `0 errors` in Scope-Files = ✅

### 2.2 Anti-Pattern Sweep (ALLE Scope-Files)

Führe JEDEN der folgenden Checks aus. Dokumentiere JEDES Ergebnis.

```bash
# 1. `any` Usage (TypeScript strict violation)
grep -rn "\bany\b" [scope-files] --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v "// eslint-disable"

# 2. Console.log in Production (nur console.error/warn erlaubt)
grep -rn "console\.log" [scope-files] --include="*.ts" --include="*.tsx"

# 3. TODO/FIXME/HACK (unfinished business)
grep -rn "TODO\|FIXME\|HACK\|XXX\|TEMP" [scope-files] --include="*.ts" --include="*.tsx"

# 4. Hardcoded Secrets/URLs
grep -rn "password\|secret\|api[_-]key\|token\|Bearer " [scope-files] --include="*.ts" --include="*.tsx" | grep -v "type\|interface\|import"

# 5. Empty catch blocks (silent error swallowing)
grep -rn "catch.*{}" [scope-files] --include="*.ts" --include="*.tsx"
grep -rn "catch.*{\s*$" [scope-files] --include="*.ts" --include="*.tsx" -A1 | grep "^[^:]*-\s*}"

# 6. Unused imports (dangling references)
# → TSC mit --noUnusedLocals flag

# 7. Inline styles that should be classes
grep -rn "style={{" [scope-files] --include="*.tsx" | wc -l

# 8. Hardcoded strings (i18n candidates)
grep -rn "className=\".*\"" [scope-files] --include="*.tsx" | grep -oP '>[^<]+<' | grep -v "{" | head -20

# 9. Missing key props in .map()
grep -rn "\.map(" [scope-files] --include="*.tsx" -A3 | grep -v "key="

# 10. Non-null assertions (!) ohne Kommentar
grep -rn "\w\!" [scope-files] --include="*.ts" --include="*.tsx" | grep -v "!=\|!=" | grep -v "//" | head -20
```

### 2.3 React Hook Rules & Component Health (bei .tsx im Scope)

```bash
# 1. useEffect ohne/mit fehlenden Dependencies
grep -rn "useEffect(" [scope-files] --include="*.tsx" -A2 | grep -E "\[\]|, \[\)" | head -20

# 2. useEffect Count per Component (>5 = Side-Effect Hell)
for f in [scope-files]; do
  count=$(grep -c "useEffect(" "$f" 2>/dev/null)
  if [ "$count" -gt 4 ]; then echo "🔴 EFFECT HELL: $f ($count useEffects)"; fi
done

# 3. useState ohne Initializer (potential undefined)
grep -rn "useState()" [scope-files] --include="*.tsx"

# 4. Missing Error Boundaries around async components
grep -rn "Suspense" [scope-files] --include="*.tsx" | head -10
grep -rn "ErrorBoundary" [scope-files] --include="*.tsx" | head -10

# 5. Stale closure risk: setState in setTimeout/setInterval without cleanup
grep -rn "setTimeout\|setInterval" [scope-files] --include="*.tsx" | head -10
```

### 2.4 Accessibility (a11y) Checks (bei .tsx im Scope)

```bash
# 1. Images without alt text
grep -rn "<img" [scope-files] --include="*.tsx" | grep -v "alt=" | head -10

# 2. Clickable divs without role/tabIndex (should be button)
grep -rn "onClick" [scope-files] --include="*.tsx" | grep -v "button\|Button\|<a \|Link\|role=" | head -10

# 3. Missing aria-labels on icon-only buttons
grep -rn "<button" [scope-files] --include="*.tsx" -A2 | grep -v "aria-label" | head -10

# 4. Form inputs without labels
grep -rn "<input" [scope-files] --include="*.tsx" | grep -v "aria-label\|id=" | head -10
```

### 2.5 CSS & Styling Health

```bash
# 1. Duplicate Tailwind class patterns (copy-paste artifacts)
grep -rn "className=" [scope-files] --include="*.tsx" | awk -F'className="' '{print $2}' | awk -F'"' '{print $1}' | sort | uniq -cd | sort -rn | head -10

# 2. Overly long className strings (>200 chars = Kandidat für Extraktion)
grep -rn "className=" [scope-files] --include="*.tsx" | awk '{print length, $0}' | sort -rn | head -5

# 3. !important usage (CSS override smell)
grep -rn "!important" [scope-files] --include="*.css" --include="*.tsx"
```

### 2.6 Copy-Paste / Code Duplication Detection

```bash
# 1. Identische Code-Blöcke (>5 Zeilen) über Files hinweg
# Approximation: Finde identische 5-Zeilen-Blöcke
for f in [scope-files]; do
  awk 'NR>1{print prev"\n"$0} {prev=$0}' "$f" | md5sum | awk '{print $1}' 
done | sort | uniq -cd | sort -rn | head -5

# 2. Verdächtig ähnliche Funktionsnamen (Suffixe/Prefixe)
grep -rn "export.*function\|export.*const.*=" [scope-files] --include="*.ts" --include="*.tsx" | awk -F'[ (=]' '{print $NF}' | sort | head -30
```

### 2.7 Dead Code Detection

```bash
# 1. Unreachable exports: Files die nichts importieren
for f in [scope-files]; do
  basename=$(basename "$f" .tsx)
  count=$(grep -rn "import.*$basename\|from.*$basename" src/ --include="*.ts" --include="*.tsx" | grep -v "$f" | wc -l)
  if [ "$count" -eq 0 ]; then echo "DEAD? $f (0 importers)"; fi
done

# 2. Unused functions via GitNexus
gitnexus_cypher({query: "MATCH (f:Function) WHERE f.filePath CONTAINS '[scope-path]' AND NOT ()-[:CodeRelation {type: 'CALLS'}]->(f) AND NOT ()-[:CodeRelation {type: 'IMPORTS'}]->(f) RETURN f.name, f.filePath LIMIT 20"})

# 3. Commented-out code blocks (>3 lines)
grep -rn "^[[:space:]]*//" [scope-files] --include="*.ts" --include="*.tsx" | head -30
```

### 2.4 Performance Patterns

```bash
# 1. N+1 Query patterns (loop with DB call)
grep -rn "\.map\|\.forEach\|for.*of" [scope-files] --include="*.ts" -A5 | grep -i "supabase\|fetch\|await"

# 2. Missing React.memo / useMemo / useCallback candidates
grep -rn "export.*function\|export.*const.*=" [scope-files] --include="*.tsx" | wc -l

# 3. Large bundle imports (full library imports)
grep -rn "import.*from.*'lodash'\|import.*from.*'moment'" [scope-files] --include="*.ts" --include="*.tsx"

# 4. Unnecessary re-renders (inline objects/functions in JSX)
grep -rn "onClick={() =>\|style={{" [scope-files] --include="*.tsx" | wc -l
```

### 2.9 Security Patterns

```bash
# 1. Dangerously set HTML
grep -rn "dangerouslySetInnerHTML\|innerHTML" [scope-files] --include="*.tsx"

# 2. Unvalidated user input
grep -rn "searchParams\|params\.\|query\." [scope-files] --include="*.ts" --include="*.tsx" | grep -v "zod\|validate\|parse" | head -10

# 3. CORS wildcard
grep -rn "Access-Control-Allow-Origin.*\*" [scope-files] --include="*.ts"

# 4. Missing auth checks in API routes
grep -rn "Deno.serve\|export.*handler\|app.get\|app.post" [scope-files] --include="*.ts" | head -10

# 5. .env / .env.example drift
diff <(grep -oP '^[A-Z_]+=' .env | sort) <(grep -oP '^[A-Z_]+=' .env.example | sort) 2>/dev/null

# 6. Secrets in git history (last 50 commits)
git log --all -p -50 -- '*.ts' '*.tsx' '*.env' | grep -iE "sk-|sk_live|password=|Bearer " | head -10
```

### 2.10 Supabase/DB Security (bei Backend-Scope)

```text
# RLS Policy Audit: Tabellen ohne RLS
mcp_supabase-mcp-server_get_advisors({project_id: "[id]", type: "security"})

# Performance Advisors
mcp_supabase-mcp-server_get_advisors({project_id: "[id]", type: "performance"})

# Tabellen-Schema prüfen (missing indexes, constraints)
mcp_supabase-mcp-server_list_tables({project_id: "[id]", schemas: ["public"], verbose: true})
```

### 2.11 Static Scan Summary

Erstelle eine Tabelle mit ALLEN Checks und Ergebnissen:

```text
| # | Check | Command | Hits | Severity | Files |
|---|-------|---------|------|----------|-------|
| S1 | `any` usage | grep... | N | 🟡 | file1, file2 |
| S2 | console.log | grep... | N | 🟡 | ... |
| S3 | React Hook Rules | grep... | N | 🔴/🟡 | ... |
| S4 | a11y | grep... | N | 🟡 | ... |
| S5 | CSS Health | grep... | N | 🟢 | ... |
| S6 | Code Duplication | hash... | N | 🟡 | ... |
| S7 | Supabase RLS | advisor | N | 🔴 | ... |
| S8 | .env drift | diff | N | 🟡 | ... |
| ... | ... | ... | ... | ... | ... |
```

---

## Stage 3: 🧬 SMART SCAN — Semantische Analyse via GitNexus

> **Ziel:** Was Grep NICHT finden kann. Execution Flows, Impact, Cross-File Dependencies.

### 3.1 Execution Flow Tracing

```text
# Für jeden Feature-Bereich im Scope:
gitnexus_query({
  query: "[feature/concept]",
  goal: "find all execution flows touching this feature",
  limit: 5,
  include_content: false
})

# Pro gefundenem Process:
READ gitnexus://repo/[SOURCE_WORKSPACE]/process/[processName]
→ Prüfe: Ist jeder Step im Process korrekt implementiert?
→ Prüfe: Gibt es Lücken/fehlende Error Handling im Flow?
```

### 3.2 Symbol-Level Impact Check

```text
# Für jede public/exported function im Scope:
gitnexus_context({name: "[functionName]", include_content: false})

Prüfe:
→ Hat die Funktion ≥1 Caller? (sonst: Dead Code Kandidat)
→ Sind alle Caller im gleichen Feature? (sonst: Shared Code → höheres Risiko)
→ Hat die Funktion Outgoing Calls die fehlerhafte Error Handling haben?
```

### 3.3 Route/API Analysis (falls Routen im Scope)

```text
# Route Map: Wer consumed welche API?
gitnexus_route_map({route: "[route]"})

# Shape Check: Stimmt Response mit Consumer überein?
gitnexus_shape_check({route: "[route]"})

# API Impact: Pre-change Report
gitnexus_api_impact({route: "[route]"})
```

### 3.4 Dependency Graph Anomalien

```text
# Circular Dependencies finden
gitnexus_cypher({query: "MATCH (a)-[:CodeRelation {type: 'IMPORTS'}]->(b)-[:CodeRelation {type: 'IMPORTS'}]->(a) WHERE a.filePath CONTAINS '[scope]' RETURN a.name, b.name, a.filePath, b.filePath"})

# Orphaned Symbols (definiert aber nie referenziert)
gitnexus_cypher({query: "MATCH (f) WHERE f.filePath CONTAINS '[scope]' AND NOT ()-[:CodeRelation]->(f) AND NOT (f)-[:CodeRelation]->() RETURN f.name, f.filePath, labels(f) LIMIT 20"})

# God-Functions (hohe Fan-Out)
gitnexus_cypher({query: "MATCH (f)-[r:CodeRelation {type: 'CALLS'}]->() WHERE f.filePath CONTAINS '[scope]' WITH f, count(r) as callCount WHERE callCount > 10 RETURN f.name, f.filePath, callCount ORDER BY callCount DESC LIMIT 10"})
```

### 3.5 Spaghetti Code Indicators

```text
Prüfe für jede Scope-Datei:
1. Zeilen-Count > 300? → 🟡 Warning (Kandidat für Splitting)
2. Function Count > 15 in einer Datei? → 🟡 Warning
3. Nesting Depth > 4? → 🟡 Warning
4. Prop Drilling > 3 Levels? → 🟡 Warning
5. Component mit >5 useEffect Hooks? → 🔴 Critical (Side-Effect Hell)
```

```bash
# Dateigröße Check
wc -l [scope-files] | sort -rn | head -20

# Nesting Depth Check (approximativ)
for f in [scope-files]; do
  depth=$(grep -oP "^\s+" "$f" | awk '{print length}' | sort -rn | head -1)
  if [ "$depth" -gt 16 ]; then echo "DEEP NESTING: $f ($depth spaces)"; fi
done
```

### 3.6 Edge Function-Specific Checks (falls EFs im Scope)

```bash
# 1. Missing CORS headers
grep -rn "Deno.serve" [ef-files] --include="*.ts" -A20 | grep -v "Access-Control" | head -10

# 2. Missing error response handling
grep -rn "Deno.serve" [ef-files] --include="*.ts" -A30 | grep -c "catch"

# 3. Cold start heavy imports (top-level awaits, large deps)
grep -rn "^import\|^await" [ef-files] --include="*.ts" | head -20

# 4. Timeout handling (long-running operations without AbortController)
grep -rn "fetch(\|supabase" [ef-files] --include="*.ts" | grep -v "signal\|timeout\|AbortController" | head -10

# 5. Response Content-Type consistency
grep -rn "new Response" [ef-files] --include="*.ts" | grep -v "Content-Type" | head -10
```

### 3.7 Bundle Size & Build Analysis

```bash
# 1. Build und Bundle-Größe messen
npm run build 2>&1 | tail -20

# 2. Große Chunks identifizieren (>100KB)
ls -la dist/assets/*.js 2>/dev/null | awk '{print $5, $9}' | sort -rn | head -10

# 3. Tree-shaking Probleme: Named vs Default exports
grep -rn "export default" [scope-files] --include="*.ts" --include="*.tsx" | wc -l
grep -rn "export {\|export const\|export function" [scope-files] --include="*.ts" --include="*.tsx" | wc -l
```

### 3.8 Test Coverage Check

```bash
# 1. Test-Dateien für Scope-Files finden
for f in [scope-files]; do
  base=$(basename "$f" .tsx)
  base=$(basename "$base" .ts)
  test_count=$(find src -name "${base}.test.*" -o -name "${base}.spec.*" 2>/dev/null | wc -l)
  if [ "$test_count" -eq 0 ]; then echo "NO TEST: $f"; fi
done

# 2. Test-zu-Source Ratio
find src -name "*.test.*" -o -name "*.spec.*" 2>/dev/null | wc -l
find src -name "*.ts" -o -name "*.tsx" 2>/dev/null | grep -v test | grep -v spec | grep -v node_modules | wc -l
```

### 3.9 Smart Scan Summary

```text
| # | Check | Tool | Findings | Severity | Description |
|---|-------|------|----------|----------|-------------|
| G1 | Dead Process Steps | GitNexus | N | 🟡 | ... |
| G2 | Circular Deps | Cypher | N | 🔴 | ... |
| G3 | God Functions | Cypher | N | 🟡 | ... |
| G4 | Route Mismatches | shape_check | N | 🔴 | ... |
| G5 | Edge Function Issues | grep | N | 🟡 | ... |
| G6 | Bundle Size | build | N KB | 🟡 | ... |
| G7 | Missing Tests | find | N | 🟢 | ... |
| ... | ... | ... | ... | ... | ... |
```

---

## Stage 4: 👁️ MULTI-LENS REVIEW — 4 Persona-Perspektiven

> **Ziel:** Jede Finding-Kategorie durch die BESTE Expertise-Linse prüfen.
> **Die klügsten Köpfe sehen Dinge die Pattern-Matching nicht findet.**

### 4.1 Personas laden

```text
Lies: .antigravity/personas/sherlock-holmes.md   → Code Quality + Bug Hunting
Lies: .antigravity/personas/john-carmack.md      → Performance + Architecture
Lies: .antigravity/personas/mr-robot.md           → Security + Attack Vectors
Lies: .antigravity/personas/elon-musk.md          → Simplification + Dead Code
```

### 4.2 Sherlock-Linse: Code Quality & Bugs

```text
Sherlock reviewt ALLE Findings aus Stage 2+3 und prüft:
→ Sind die Findings tatsächlich Bugs oder False Positives?
→ Gibt es VERSTECKTE Bugs die der Static Scan nicht gefunden hat?
→ Race Conditions? Stale Closures? Timing Issues?
→ Error Propagation: Wird ein Fehler irgendwo verschluckt?
→ State Inconsistencies: Kann ein UI-State entstehen der nie aufgeräumt wird?

Output: Zusätzliche Findings mit Tag [SHERLOCK]
```

### 4.3 Carmack-Linse: Performance & Architecture

```text
Carmack reviewt Scope-Files und prüft:
→ Unnötige Re-Renders? Components die bei jedem Parent-Render neu erzeugt werden?
→ Memory Leaks? Event Listeners die nie abgemeldet werden?
→ N+1 Queries die der Static Scan nicht erkannt hat?
→ Architektur-Violations? Direkte DB-Calls aus Komponenten statt über Hooks?
→ Bundle Impact: Wird durch neue Imports der Bundle unnötig aufgebläht?

Output: Zusätzliche Findings mit Tag [CARMACK]
```

### 4.4 Mr. Robot-Linse: Security & Attack Vectors

```text
Mr. Robot reviewt und prüft:
→ Kann ein User durch URL-Manipulation unautorisierten Zugriff erlangen?
→ Gibt es XSS-Vektoren durch User-generierte Inhalte?
→ Server-Side: Sind alle Edge Functions gegen Abuse geschützt (Rate Limiting)?
→ PII Exposure: Können Personenbezogene Daten in Logs/Responses auftauchen?
→ DSGVO: Werden neue Daten erhoben die eine Consent-Erweiterung brauchen?

Output: Zusätzliche Findings mit Tag [ROBOT]
```

### 4.5 Elon-Linse: Simplification & Dead Weight

```text
Elon prüft:
→ Gibt es Code der NICHTS zum Feature beiträgt? (Feature Creep)
→ Kann eine 100-Zeilen-Lösung in 20 Zeilen geschrieben werden?
→ Gibt es Abstraktions-Layer die keinen Wert liefern? (Over-Engineering)
→ Duplicate Logic die in einen Shared Utility extrahiert werden sollte?
→ Dateien die >400 Zeilen lang sind → Split-Kandidaten?

Output: Zusätzliche Findings mit Tag [ELON]
```

### 4.6 Multi-Lens Summary

```text
| Linse | Neue Findings | 🔴 | 🟡 | 🟢 | Highlight |
|-------|--------------|-----|-----|-----|----------|
| 🔍 Sherlock | N | X | Y | Z | [Top Finding] |
| 🖥️ Carmack | N | X | Y | Z | [Top Finding] |
| 🕵️ Mr. Robot | N | X | Y | Z | [Top Finding] |
| 🚀 Elon | N | X | Y | Z | [Top Finding] |
```

---

## Stage 5: ⚖️ VERDICT — Konsolidierung & Refactoring-Plan

> **Ziel:** ALLE Findings aus Stage 2+3+4 in EINEN priorisierten Bericht mit Aktionsplan zusammenführen.

### 4.1 Findings konsolidieren

Merge alle Findings in **eine** sortierte Tabelle:

```markdown
## 🔬 Consolidated Findings

### 🔴 CRITICAL (muss in Stage 5 gefixt werden)
| ID | Category | File:Line | Description | Impact | Fix-Strategie |
|----|----------|-----------|-------------|--------|---------------|
| C1 | Security | path:42 | ... | ... | ... |

### 🟡 WARNING (sollte gefixt werden)
| ID | Category | File:Line | Description | Impact | Fix-Strategie |
|----|----------|-----------|-------------|--------|---------------|
| W1 | DeadCode | path:99 | ... | ... | Delete |

### 🟢 INFO (dokumentieren, kein Fix nötig)
| ID | Category | File:Line | Description |
|----|----------|-----------|-------------|
| I1 | Style | path:15 | ... |
```

### 4.2 Dead Code Hit List

Separate, priorisierte Liste aller Dead Code Findings:

```markdown
## 💀 Dead Code — Kill List

| # | Type | Location | Evidence | Action |
|---|------|----------|----------|--------|
| D1 | Unused Export | file:fn | 0 importers (GitNexus) | DELETE |
| D2 | Commented Code | file:42-55 | Block of 13 lines | DELETE |
| D3 | Unused Import | file:3 | TSC --noUnusedLocals | DELETE |
| D4 | Unused Component | file.tsx | 0 Route references | DELETE (nach User-Confirm) |
```

### 4.3 Refactoring-Plan (für non-Critical Findings)

```markdown
## 🧹 Refactoring Plan (post-Hotfix)

### Prio 1: Code Health
- [ ] [W-ID]: [Beschreibung] → [Konkreter Fix]
- [ ] [W-ID]: [Beschreibung] → [Konkreter Fix]

### Prio 2: Performance
- [ ] [W-ID]: [Beschreibung] → [Konkreter Fix]

### Prio 3: Code Quality
- [ ] [I-ID]: [Beschreibung] → [Konkreter Fix]
```

### 5.4 Diff-Awareness: Neue vs. Pre-Existierende Issues

> [!IMPORTANT]
> **Nicht alles was gefunden wird ist NEU.** Trenne klar zwischen:

```text
Für jedes Finding:
1. Ist die betroffene Zeile in einem Commit INNERHALB des Scope-Zeitraums?
   → JA: Tag als [NEW] — höhere Priorität
   → NEIN: Tag als [PRE-EXISTING] — dokumentieren, aber niedrigere Fix-Priorität

Command:
  git log --since="[scope-start]" -p -- [file] | grep -n "[finding-pattern]"
```

Prioritäts-Regel:
- **[NEW] + 🔴** = Fix in Stage 6 (PFLICHT)
- **[NEW] + 🟡** = Fix in Stage 6 (Quick Wins)
- **[PRE-EXISTING] + 🔴** = Fix in Stage 6 (PFLICHT, war schon broken)
- **[PRE-EXISTING] + 🟡** = Refactoring-Plan (nicht in dieser Session)

### 5.5 Verdict-Gate

```text
Zeige dem User:
1. Summary Card: X 🔴 Critical | Y 🟡 Warning | Z 🟢 Info | W 💀 Dead Code
2. NEW vs PRE-EXISTING Aufschlüsselung
3. Dead Code Kill List (User-Bestätigung für Component-Deletions)
4. Multi-Lens Highlights (Top Finding pro Persona)
5. Refactoring-Plan (zur Kenntnisnahme)

Frage: "Stage 6 Hotfix + Dead Code Cleanup starten?"
  → User bestätigt → Stage 6
  → User modifiziert → Anpassen, dann Stage 6
```

---

## Stage 6: 🔥 HOTFIX + CLEANUP — Chirurgische Fixes

> **Ziel:** Alle 🔴 Critical Findings fixen. Alle Dead Code Kills ausführen.
> **Regel:** MINIMALE Fixes. Kein Refactoring über das Finding hinaus.

### 6.0 Pre-Fix Impact Analysis (PFLICHT pro Fix)

```text
Für JEDES Symbol das modifiziert wird:
gitnexus_impact({target: "[symbol]", direction: "upstream"})

Ergebnis:
→ LOW Risk → Fix direkt
→ MEDIUM Risk → Fix mit Extra-Checks
→ HIGH/CRITICAL Risk → User fragen BEVOR gefixt wird
```

### 6.1 Critical Fixes (pro Finding)

```text
Für jeden 🔴 Finding:
1. Impact Analysis (5.0)
2. Fix implementieren (minimal, chirurgisch)
3. Inline-Verify: `npx tsc --noEmit` nach jedem Fix
4. Finding als ✅ FIXED markieren
```

### 6.2 Dead Code Cleanup (Kill List)

```text
Für jeden 💀 Dead Code Entry:
1. Impact Check: gitnexus_impact({target: "[symbol]", direction: "upstream"})
   → Nur wenn 0 upstream deps: Sicher zu löschen
2. Delete the code
3. TSC Check: `npx tsc --noEmit`
4. Entry als ✅ KILLED markieren
```

### 6.3 Warning Fixes (Quick Wins)

```text
Für jeden 🟡 Finding der in ≤5 Zeilen fixbar ist:
1. Impact Analysis
2. Fix implementieren
3. TSC Check
4. Finding als ✅ FIXED markieren

Für komplexe 🟡 Findings:
→ Im Refactoring-Plan belassen
→ NICHT in dieser Stage anfassen
```

### 6.4 Fix-Summary

```text
| Finding-ID | Status | Fix-Beschreibung | Files Changed |
|------------|--------|------------------|---------------|
| C1 | ✅ FIXED | ... | path.tsx |
| D1 | ✅ KILLED | Removed unused export | path.ts |
| W3 | ✅ FIXED | Added missing key prop | path.tsx |
| W7 | ⏳ DEFERRED | Complex refactor needed | — |
```

---

## Stage 7: ✅ VERIFY — Keine Regressionen

> **Ziel:** Beweisen dass Stage 6 Fixes nichts kaputt gemacht haben.

### 7.1 Build-Integrität

```bash
npx tsc --noEmit 2>&1
# MUST: 0 errors

npm run build 2>&1 | tail -10
# MUST: Build successful
```

### 7.2 GitNexus Change Detection

```text
gitnexus_detect_changes({scope: "all"})

Prüfe:
→ Nur erwartete Symbols geändert?
→ Keine unerwarteten Process-Brüche?
→ Alle d=1 Dependencies noch intakt?
```

### 7.3 Anti-Pattern Re-Check

```bash
# Re-run critical checks from Stage 2 on fixed files only
git diff --name-only HEAD~1 HEAD | xargs grep -n "any\|console\.log\|TODO\|FIXME" 2>/dev/null
# MUST: 0 hits on new lines
```

### 7.4 Bundle Size Delta (falls Build im Scope)

```bash
# Vorher/Nachher Bundle-Größe vergleichen
# (Pre-Audit Baseline aus Stage 3.7 vs. Post-Fix)
ls -la dist/assets/*.js 2>/dev/null | awk '{sum+=$5} END {print "Total JS:", sum/1024, "KB"}'
# Vergleiche mit Baseline → Delta dokumentieren
```

### 7.5 Browser Smoke Test (optional, bei UI-Scope)

```text
Falls UI-Dateien im Scope geändert wurden:
1. browser_subagent → Öffne die betroffene Page
2. Screenshot: Sieht alles visuell korrekt aus?
3. Console: Keine JS-Errors?
4. Quick Click-Through: CTAs, Navigation, Forms funktional?

Dokumentiere: "Smoke Test: ✅ Page X renders correctly" oder "❌ Visual regression at [description]"
```

### 7.6 Verify-Gate

```text
TSC Clean? + Build Clean? + detect_changes clean? + Anti-Pattern clean? + Bundle Delta acceptable?
  → ALL ✅: Proceed to Report
  → ANY ❌: Fix → Re-Verify (max 3 loops, dann User fragen)
```

---

## Stage 8: 📋 AUDIT REPORT — Persistieren

### 8.1 Audit Report erstellen

Speichere als Artifact: `deep-audit-report-[YYYY-MM-DD].md`

```markdown
# 🔬 Deep Audit Report — [Datum]

## Scope
- Target: [Full / Targeted: was genau]
- Files Audited: [N]
- Commit Range: [hash..hash]
- Duration: ~[X]min
- Previous Audit: [Datum des letzten Audits aus Memory Bank, oder "First Audit"]

## Summary Card
| Category | 🔴 Critical | 🟡 Warning | 🟢 Info | 💀 Dead Code | [NEW] | [PRE-EXISTING] |
|----------|------------|-----------|---------|-------------|-------|----------------|
| Bugs | X | Y | Z | — | N | M |
| Performance | X | Y | Z | — | N | M |
| Security | X | Y | Z | — | N | M |
| Code Quality | X | Y | Z | — | N | M |
| Dead Code | — | — | — | W | N | M |
| a11y | X | Y | Z | — | N | M |
| React Hooks | X | Y | Z | — | N | M |

## Multi-Lens Review Summary
| Linse | Neue Findings | Top Insight |
|-------|--------------|-------------|
| 🔍 Sherlock | N | [Key finding] |
| 🖥️ Carmack | N | [Key finding] |
| 🕵️ Mr. Robot | N | [Key finding] |
| 🚀 Elon | N | [Key finding] |

## Findings (Fixed)
[Tabelle aller gefixten Findings mit [NEW]/[PRE-EXISTING] Tag]

## Findings (Deferred)
[Tabelle aller aufgeschobenen Findings + Refactoring-Plan]

## Dead Code Killed
[Tabelle aller gelöschten Code-Einheiten]

## Verification
- TSC: ✅ 0 errors
- Build: ✅ Clean
- Bundle Size: [X KB] (Delta: [+/-Y KB] vs. pre-audit)
- GitNexus detect_changes: ✅ Expected scope only
- Anti-Pattern Re-Check: ✅ Clean
- Browser Smoke: ✅ / N/A

## 📈 Metric Trends (Comparison to Last Audit)
| Metric | Last Audit | This Audit | Trend |
|--------|-----------|------------|-------|
| Total Findings | X | Y | ↑/↓/→ |
| 🔴 Criticals | X | Y | ↑/↓/→ |
| Dead Code Lines | X | Y | ↑/↓/→ |
| Bundle Size (JS) | X KB | Y KB | ↑/↓/→ |
| Test Coverage Ratio | X:Y | X:Y | ↑/↓/→ |
| Files >300 LOC | X | Y | ↑/↓/→ |

## Recommendations
[Top 3 strategische Empfehlungen für nächsten Sprint]
```

### 8.2 Memory Bank Update

```text
Aktualisiere: memory-bank/activeContext.md
  → Deep Audit Ergebnis + Datum + Scope
  → Offene Refactoring-Items als Tech Debt dokumentieren
  → Audit-Commit-Hash speichern (für `since-last-audit` beim nächsten Mal)

Aktualisiere: memory-bank/progress.md
  → Audit-Eintrag hinzufügen mit:
    - Datum, Scope, Commit-Hash
    - Summary: X fixed, Y killed, Z deferred
    - Metric Snapshot (für Trend-Tracking)
```

### 8.3 Git Commit

```bash
git add -A
git commit -m "audit: Deep Audit [scope] — [N] fixes, [M] dead code killed

- [N] 🔴 Critical fixed
- [M] 💀 Dead code removed
- [O] 🟡 Warnings fixed
- [P] 🟡 Warnings deferred (tech debt)"
```

### 8.4 User Report

Melde dem User:

> "🔬 **Deep Audit abgeschlossen.**
>
> | Metric | Wert |
> |--------|------|
> | Scope | [X files, Y symbols] |
> | 🔴 Critical Fixed | X |
> | 💀 Dead Code Killed | Y lines |
> | 🟡 Warnings Fixed | Z |
> | 🟡 Deferred (Tech Debt) | W |
> | 🟢 Info Documented | V |
> | TSC/Build | ✅ Clean |
>
> Report: `[artifact path]`
> Next: [Top 1-2 Empfehlungen]"

---

## Anti-Halluzination Protokoll

### Context Checkpoints (nach JEDER Stage)

1. **SPEICHERE** bisherige Findings in Audit Report Draft (Artifact)
2. **SCHREIBE** Stage-Summary:
   ```
   ### Stage [X] Complete — [HH:MM]
   Findings: X 🔴 | Y 🟡 | Z 🟢 | W 💀
   Next: Stage [X+1] — [Titel]
   ```
3. **MELDE** dem User bei Stage 2/3 Ende:
   > "Static + Smart Scan fertig. [N] Findings. Antworte mit 'Weiter' für Verdict + Hotfix."

### Harte Regeln

1. **KEIN REFACTORING IN STAGE 5.** Nur Fixes + Dead Code Kill. Refactoring → Plan → separater Sprint.
2. **FINDINGS SIND BEWEISBAR.** Jedes Finding hat: File + Line + grep-Output oder GitNexus-Output.
3. **IMPACT VOR FIX.** Kein Fix ohne Impact-Analyse über GitNexus.
4. **SURGICAL PRECISION.** Fix nur was nötig ist. Nicht "gleich noch X und Y mit aufräumen".
5. **USER-ESCALATION.** HIGH/CRITICAL Impact → User fragen. Nie autonom riskante Fixes machen.
6. **MEMORY PERSISTENT.** Report + Memory Bank Update nach JEDEM Audit. Kein Audit ohne Spur.
