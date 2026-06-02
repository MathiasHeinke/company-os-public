---
description: 🧠 Deep Research — Exhaustive Knowledge Excavation & Ground of Truth Synthesis (Memory Bank v4)
---

// turbo-all

# 🧠 Deep Research — Exhaustive Knowledge Excavation

Autonomer Workflow zur vollständigen Durchleuchtung eines Projekts. Liest JEDE Datei, versteht JEDES Modul, verfolgt JEDEN Datenfluss, prüft JEDE Doku auf Aktualität — und destilliert das Ergebnis in maschinenlesbare Ground-of-Truth-Dokumente.

> Auslöser: `/deep-research` oder `/deep-research [Projekt-Pfad]`
> Geschätzte Dauer: 30min (klein) bis 3h (groß)
> Output: Memory Bank v4 (v3 angereichert + 5 neue Ground-of-Truth-Dateien)

---

## Vor-Start: Projekt identifizieren

```text
1. Wenn kein Pfad übergeben: Frage den User nach dem Ziel-Projekt
2. Lies: memory-bank/projectbrief.md (falls vorhanden) → Projekt-Kontext
3. Lies: memory-bank/techContext.md (falls vorhanden) → Tech Stack Überblick
4. Stelle fest: Hat das Projekt Supabase? Edge Functions? iOS/Capacitor? Python?
   → Bestimmt welche Phasen anwendbar sind
```

---

## Phase 0: Boot — Inventar & File Manifest

### 0.1 Rekursiver Scan

Scanne ALLE relevanten Verzeichnisse des Ziel-Projekts:

```text
[projekt]/supabase/functions/           → Edge Functions (Verzeichnisse = Funktionen)
[projekt]/supabase/functions/_legacy/    → Legacy/Deprecated Edge Functions
[projekt]/supabase/functions/_shared/    → Shared Utilities (importiert von vielen EFs)
[projekt]/supabase/migrations/           → Schema-Evolution (chronologisch)
[projekt]/docs/                          → Alle Dokumentation
[projekt]/docs/wiki/                     → Wiki/Methodology-Dateien
[projekt]/docs/knowledge-hub/            → Knowledge Data Files
[projekt]/docs/audits/                   → Audit Reports
[projekt]/docs/epics/                    → Epic Specs
[projekt]/docs/directives/               → Directives
[projekt]/docs/ghost-functions-backup/   → Ghost Functions (abgelöst, Backup)
[projekt]/memory-bank/                   → Memory Bank (operativ + Ground Truth)
[projekt]/src/                           → Source Code (Top-Level Struktur + Unter-Ordner)
[projekt]/.antigravity/                  → Personas, Knowledge, Logs
[projekt]/scripts/                       → Utility Scripts
[projekt]/ios/                           → Capacitor/Native Config
[projekt]/.env* (NUR KEY-NAMEN!)         → Service Dependencies (KEINE Werte!)
[projekt]/config/ oder devops/           → Infra Config (falls vorhanden)
```

> **ACHTUNG:** Wenn ein Verzeichnis nicht existiert → überspringen, NICHT als Fehler melden.

### 0.2 File Manifest erstellen

Erstelle `memory-bank/file-manifest.md`:

```md
# 📋 [Projektname] — File Manifest
Generiert: [Datum] | Scan-Scope: [Root-Pfad]
Total: [X] Dateien in [Y] Verzeichnissen

## Edge Functions ([Anzahl])
| Name | Pfad | Status | Gelesen? |
|------|------|--------|----------|
| ares-sleep-compute | supabase/functions/ares-sleep-compute/ | ⏳ | ⏳ |

## Docs & Wiki ([Anzahl])
| Name | Pfad | Größe | Gelesen? | Frische |
|------|------|-------|----------|---------|
| sleep-engine.md | docs/wiki/sleep-engine.md | 11KB | ⏳ | ⏳ |

## Memory Bank ([Anzahl])
| Name | Pfad | Gelesen? |
|------|------|----------|

## Source Code (Top-Level Struktur)
| Verzeichnis | Kinder | Beschreibung |
|-------------|--------|--------------|

## Supabase Migrations ([Anzahl])
| Version | Datum | Dateiname | Gelesen? |
|---------|-------|-----------|----------|

## Sonstige ([Anzahl])
...
```

**REGEL:** JEDE einzelne Datei muss in diesem Manifest auftauchen. Nichts darf unerfasst bleiben.

### 0.3 Context Checkpoint Phase 0

```text
→ Speichere file-manifest.md
→ Melde dem User: "Inventar fertig. [X] Edge Functions, [Y] Docs, [Z] Migrations gefunden.
   Antworte mit 'Weiter' für Phase 1 (Git-Archäologie)."
```

---

## Phase 1: Git-Archäologie — Die chronologische Wahrheit

### 1.1 Timeline-Umfang feststellen

```bash
git log --oneline --all --reverse | head -5   # Erster Commit
git log --oneline -1                           # Letzter Commit
git log --oneline --all | wc -l                # Total Commits
git shortlog -sn --all                         # Commits pro Autor
```

### 1.2 Monats-Extraktion

Pro Monat mit Commits:

```bash
git log --stat --since="YYYY-MM-01" --until="YYYY-MM+1-01" --format="%h|%ad|%s" --date=short
```

Extrahiere:
- Was wurde **hinzugefügt?** (neue Dateien, neue Edge Functions, neue Tabellen)
- Was wurde **geändert?** (Refactorings, Engine-Iterationen, Version-Bumps)
- Was wurde **gelöscht?** (Ghost Functions, deprecated Features, alte Ansätze)
- Welche **Absicht** steckt dahinter? (Commit-Messages lesen, Patterns erkennen)
- Welche **Epochs** lassen sich ableiten? (Paradigmenwechsel, Pivots)

### 1.3 Output

Wenn `evolution.md` existiert → Anreichern mit lückenlosen Git-Daten.
Wenn nicht → `ground-truth/architecture-timeline.md` erstellen:

```md
## YYYY-MM — [Fokus dieses Monats]
| Datum | Commit | Bereich | Was passiert ist | Bedeutung |
|-------|--------|---------|------------------|-----------|
```

> [!CAUTION]
> **Git > Doku > Memory.** Bei Widersprüchen zwischen Git-Commits und bestehender Dokumentation gewinnt IMMER Git. Die Doku wird als "zu aktualisieren" markiert.

### 1.4 Context Checkpoint Phase 1

```text
→ Speichere Timeline
→ Melde dem User: "Git-Archäologie fertig. [X] Monate, [Y] Commits analysiert.
   [Z] Epochs identifiziert. Antworte mit 'Weiter' für Phase 2."
```

---

## Phase 2: Supabase Schema-Evolution (Migrations)

> **Skip-Bedingung:** Kein `supabase/migrations/` vorhanden → Phase überspringen.

### 2.1 Migrations chronologisch listen

```text
Liste alle Dateien in supabase/migrations/ sortiert nach Timestamp-Prefix.
```

### 2.2 Pro Migration

```text
1. Lies den SQL-Inhalt
2. Extrahiere: CREATE TABLE, ALTER TABLE, CREATE INDEX, CREATE POLICY
3. Korreliere mit Git-Timeline aus Phase 1 (wann wurde diese Migration committed?)
```

### 2.3 Live-Schema abgleichen

```text
Nutze mcp_supabase-mcp-server_list_tables (verbose=true):
  - Alle Tabellen, Spalten, Typen, Primary Keys, Foreign Keys
  - RLS Policies

Nutze mcp_supabase-mcp-server_execute_sql:
  - Row Counts pro Tabelle (SELECT count(*) FROM ...)
  - Letzte Inserts (SELECT max(created_at) FROM ...)
```

### 2.4 Output: Basis für `data-model-map.md`

### 2.5 Context Checkpoint Phase 2

```text
→ Speichere Schema-Daten
→ Melde dem User: "[X] Migrations, [Y] Tabellen, [Z] RLS Policies gefunden.
   Antworte mit 'Weiter' für Phase 3 (Edge Function Deep Dive)."
```

---

## Phase 3: Edge Function Deep Dive

> **Skip-Bedingung:** Kein `supabase/functions/` vorhanden → stattdessen "Module Deep Dive" (Python/JS Dateien im Root).

### 3.1 Pro Edge Function

```text
1. Öffne index.ts (oder index.py bei Python-Projekten)
2. Lies den Code KOMPLETT (nicht nur die ersten 50 Zeilen!)
3. Extrahiere:
   a. Zweck (was tut diese Funktion?)
   b. HTTP-Methode (POST/GET/PATCH)
   c. Input-Parameter (Request Body Shape / Query Params)
   d. Output-Format (Response Shape)
   e. Welche Supabase-Tabellen werden gelesen (SELECT)?
   f. Welche Supabase-Tabellen werden geschrieben (INSERT/UPDATE/UPSERT)?
   g. Welche externen APIs werden aufgerufen? (OpenAI, Vertex AI, Stripe, Terra etc.)
   h. Dependencies auf ANDERE Edge Functions? (supabase.functions.invoke())
   i. Imports aus _shared/? (Welche Shared Utilities werden genutzt?)
   j. Fehlerbehandlung? (try/catch, Error Responses, Status Codes)
   k. PII-Relevanz? (Gesundheitsdaten, User-IDs, E-Mails)
   l. Authentifizierung? (JWT Verify, Anon Access, Service Role Key)
```

### 3.2 Frontend Cross-Reference

```bash
# Suche im Frontend nach Aufrufen:
grep -r "functions/invoke" src/
grep -r "supabase.functions" src/
grep -r "[funktions-name]" src/
```

- Referenz gefunden → dokumentiere WELCHE Komponente die EF aufruft
- **Keine Referenz** → potentielle GHOST Function → markiere als `⚠️ GHOST`

### 3.3 Legacy & Ghost Check

```text
Prüfe: supabase/functions/_legacy/ → Was liegt dort? Wurde es abgelöst?
Prüfe: docs/ghost-functions-backup/ → Backup von gelöschten Funktionen?
Cross-Reference: Existiert der Name noch im aktiven functions/ Ordner?
```

### 3.4 Output: `edge-function-registry.md`

```md
# 📦 Edge Function Registry
Generiert: [Datum] | Total: [X] aktiv, [Y] legacy, [Z] ghost

## Compute Engines
| Name | Zweck | Methode | Liest | Schreibt | Ext. APIs | Status |
|------|-------|---------|-------|----------|-----------|--------|

## AI/LLM Functions
...

## Coach Pipeline
...

## Utility Functions
...

## Legacy & Ghost
| Name | Letzter Commit | Abgelöst durch | Grund |
```

### 3.5 Context Checkpoint Phase 3

```text
→ Speichere Registry
→ Melde dem User: "[X] Edge Functions dokumentiert. [Y] Ghosts, [Z] Legacy gefunden.
   Antworte mit 'Weiter' für Phase 4."
```

---

## Phase 4: Bestehende Ground Truth anreichern (v3 → v4 Evolution)

> **Skip-Bedingung:** Keine bestehenden Ground-Truth-Dateien vorhanden → direkt zu Phase 5.

### 4.1 Anreicherungs-Audit

Für jede bestehende v3 Ground-Truth-Datei:

```text
1. Lies die Datei KOMPLETT
2. Prüfe JEDEN Abschnitt gegen Phase 1-3 Ergebnisse:
   - Referenzierte Edge Functions: Existieren sie noch? Stimmt die Beschreibung?
   - Referenzierte DB-Tabellen: Stimmt das Schema? Stimmen die Beziehungen?
   - Zeitliche Aussagen: Stimmen sie mit der Git-Timeline überein?
   - Architektur-Aussagen: Spiegeln sie den aktuellen Code wider?
3. ERGÄNZE fehlende Informationen (Edge Function Links, DB-Tabellen-Referenzen)
4. MARKIERE veraltete Stellen: "⚠️ VERALTET: [was steht da] → IST-Stand: [was der Code sagt]"
5. Frage den User bei ❓ Unklarheiten
```

### 4.2 Regeln

```text
- Bestehende Inhalte NICHT löschen, nur ERGÄNZEN
- Veraltetes NIEMALS still korrigieren → immer markieren und User informieren
- Neue Abschnitte klar als "[v4 Ergänzung]" kennzeichnen
```

---

## Phase 5: Datenmodell-Mapping

> Nutzt Daten aus Phase 2 (Migrations) + Phase 3 (Edge Functions)

### 5.1 Cross-Reference

```text
Für JEDE Tabelle aus Phase 2:
  - Welche Edge Functions LESEN aus dieser Tabelle? (aus Phase 3)
  - Welche Edge Functions SCHREIBEN in diese Tabelle? (aus Phase 3)
  - Welche Frontend-Komponenten LESEN aus dieser Tabelle? (via Supabase Client)
```

### 5.2 Output: `data-model-map.md`

```md
# 🗄️ Data Model Map
Generiert: [Datum] | Total: [X] Tabellen, [Y] mit RLS, [Z] ohne RLS

## Schema Evolution History
| Datum | Migration | Änderung |
|-------|-----------|----------|

## Tabellen-Register
| Tabelle | Spalten | Rows | Letzte Aktivität | Schreiber (EFs) | Leser (EFs/Frontend) | RLS |
|---------|---------|------|-------------------|-----------------|----------------------|-----|

## ER-Diagramm
(Mermaid erDiagram)

## Verwaiste Tabellen (keine Referenzen gefunden)
...

## RLS Audit
| Tabelle | Policy Count | Anon Access? | Service Role Only? |
```

### 5.3 Context Checkpoint Phase 5

---

## Phase 6: Wiki & Methodology — Exhaustives Lesen

### 6.1 Pro Wiki/Methodology-Datei

```text
1. Lies ALLES (nicht nur die ersten 100 Zeilen — KOMPLETT!)
2. Extrahiere:
   a. Kernkonzept (was wird hier beschrieben?)
   b. Referenzierte Edge Functions (existieren die noch?)
   c. Referenzierte DB-Tabellen (stimmt das Schema noch?)
   d. Referenzierte andere Wiki-Dateien (existieren die noch?)
   e. Datum/Version (wenn vorhanden)
   f. Formeln/Algorithmen (stimmen die mit dem Code überein?)
3. Aktualitäts-Check gegen Code aus Phase 3:
   🟢 AKTUELL    — Code und Doku stimmen überein
   🟡 TEILWEISE  — Kernkonzept stimmt, Details outdated
   🔴 VERALTET   — Beschreibt nicht mehr den Ist-Stand
   ❓ UNKLAR     — Nicht eindeutig feststellbar, User muss klären
```

### 6.2 Staleness-Report

```text
WENN eine Datei als 🟡 oder 🔴 bewertet wird:
  1. Notiere EXAKT was veraltet ist (Zeile/Abschnitt)
  2. Notiere was der aktuelle Stand laut Code IST
  3. Schlage dem User konkret vor: "Soll ich [Datei] aktualisieren?"
  
AKZEPTIERE VERALTETES NIEMALS STILL.
```

### 6.3 Output: `knowledge-index.md`

```md
# 📚 Knowledge Index
Generiert: [Datum] | Total: [X] Dateien, 🟢 [Y] | 🟡 [Z] | 🔴 [W] | ❓ [V]

## Wiki/Methodology
| Datei | Kernkonzept | Referenzierte EFs | Referenzierte Tabellen | Frische | Notiz |
|-------|-------------|-------------------|------------------------|---------|-------|

## Docs
...

## Audits
...

## Knowledge Hub
...

## Memory Bank (operativ)
...

## Staleness Report
| Datei | Was ist veraltet | Ist-Stand (Code) | Update-Vorschlag |
```

### 6.4 Context Checkpoint Phase 6

---

## Phase 7: Modul-Interaktions-Mapping

### 7.1 Pipeline-Identifikation

Aus Phase 3 (Edge Function Registry) die großen Pipelines ableiten:

```text
Pro identifizierte Pipeline:
  1. Welche Edge Functions sind beteiligt?
  2. In welcher Reihenfolge werden sie aufgerufen? (Trigger → Compute → Store → Display)
  3. Welche Daten fließen zwischen ihnen?
  4. Wo werden Ergebnisse gespeichert? (welche Tabelle)
  5. Wo werden sie im Frontend angezeigt? (welche Komponente)
  6. Cross-Domain Wiring: Welche Pipeline beeinflusst welche andere?
```

### 7.2 Python-Module (für nous-bridge und ähnliche)

```text
Wenn das Projekt Python-Module hat:
  Pro Modul (.py Datei):
    1. Lies den Code KOMPLETT
    2. Extrahiere: Zweck, Imports, Exports, Klassen, Hauptfunktionen
    3. Identifiziere Abhängigkeiten zwischen Modulen
    4. Mappe: persona_router → chain_engine → mastertable_engine etc.
```

### 7.3 Output: `module-interaction-map.md`

```md
# 🔀 Module Interaction Map
Generiert: [Datum]

## Pipeline: [Name, z.B. "Bio Engine"]
### Trigger-Kette
(Mermaid flowchart)

### Datenfluss
| Schritt | Edge Function | Input | Output | Ziel-Tabelle |
|---------|---------------|-------|--------|---------------|

## Cross-Domain Wiring
| Source Pipeline | Target Pipeline | Mechanismus | Beschreibung |
```

### 7.4 Context Checkpoint Phase 7

---

## Phase 8: Infrastructure Map

### 8.1 Environment & Services

```text
1. .env* Dateien: NUR KEY-NAMEN auflisten (NIEMALS Werte!)
   → Welche externen Services sind angebunden?
   → Kategorisiere: AI (OpenAI, Google, Anthropic), Payment (Stripe),
     Auth (Supabase), Hosting (Vercel), Data (Terra API, HealthKit), etc.
2. package.json / pyproject.toml: Dependencies analysieren
   → Major Libraries, Frameworks, Build Tools
```

### 8.2 Capacitor/Native (falls vorhanden)

```text
1. capacitor.config.ts: Welche Plugins? Welche native Configs?
2. ios/ Verzeichnis: Podfile.lock, Info.plist Permissions
3. Native Bridges: Wie kommuniziert React mit Swift?
```

### 8.3 Deployment & Kit Sync

```text
1. Vercel/Hosting: vercel.json Konfiguration
2. GitHub: Offene Issues/PRs mit Architektur-Relevanz?
   → mcp_github: list_issues (state: OPEN, letzte 20)
   → mcp_github: list_pull_requests (state: open)
3. Kit Propagation: Stimmt .antigravity/ in diesem Projekt mit dem
   Antigravity Root überein? Sind Personas/Knowledge aktuell?
```

### 8.4 Output: `infrastructure-map.md`

```md
# 🏗️ Infrastructure Map
Generiert: [Datum]

## External Services
| Service | Typ | Env Key | Zweck |
|---------|-----|---------|-------|

## Dependencies (Major)
| Package | Version | Zweck |
|---------|---------|-------|

## Native/Capacitor
| Plugin | Version | Permissions | Zweck |
|--------|---------|-------------|-------|

## Deployment
| Platform | Config | Status |
|----------|--------|--------|

## Kit Sync Status
| Datei | Root Version | Projekt Version | Sync? |
```

### 8.5 Context Checkpoint Phase 8

---

## Phase 9: User Clarification Gate & Finalisierung

### 9.1 Clarification Report zusammenstellen

```text
Sammle ALLE offenen Punkte aus Phase 0-8:
  ❓ Edge Functions ohne klaren Zweck
  ❓ Wiki-Dateien mit Widersprüchen zum Code
  ❓ Nicht nachvollziehbare Datenflüsse
  ❓ Tabellen ohne erkennbare Nutzer (verwaist?)
  ⚠️ Ghost Functions (existieren, niemand ruft sie)
  🔴 Veraltete Docs (mit konkretem Update-Vorschlag)
  🟡 Teilweise veraltete Docs (mit Präzisierung was outdated ist)
```

### 9.2 Priorisierte Präsentation

```text
Sortiere nach Kritikalität:
  1. 🔴 Veraltete Docs die aktiv falsche Informationen enthalten
  2. ⚠️ Ghost Functions die Toter Code sind
  3. ❓ Unklare Architektur-Entscheidungen
  4. 🟡 Teilweise veraltete Docs

Präsentiere dem User:
  "Deep Research abgeschlossen.
   [X] Dateien gelesen, [Y] dokumentiert.
   [Z] offene Fragen, [W] veraltete Dokumente gefunden.
   
   Bitte kläre die ❓-Fragen — dann aktualisiere ich die
   Ground-of-Truth-Dateien und optional die veralteten Quellen."
```

### 9.3 Nach User-Klärung

```text
1. Aktualisiere Ground-of-Truth-Dateien mit den Antworten
2. Aktualisiere veraltete Quellen (wenn User zustimmt)
3. Setze alle ❓ auf 🟢 oder 🔴 (keine offenen Fragen mehr)
4. File Manifest: Alle Einträge müssen ✅ sein
```

---

## Anti-Halluzination Protokoll

> **KRITISCH:** Dieser Workflow läuft bei großen Projekten 1-3 Stunden.
> Kontext-Overflow ist GARANTIERT. Folge diesem Protokoll strikt.

### Context Checkpoints (nach JEDER Phase)

```text
1. SPEICHERE alle bisherigen Ergebnisse in die Ground-of-Truth-Dateien
2. SCHREIBE Checkpoint-Block am Ende der jeweiligen Datei:
   ### 🧹 Context Checkpoint — Phase [X]
   - Abgeschlossen: [Datum/Uhrzeit]
   - Dateien gelesen: [X] | Veraltet: [Y] | Unklar: [Z]
   - Nächste Phase: [Phase Y Titel]
3. MELDE dem User via notify_user:
   "Phase [X] fertig. [Statistik]. Antworte mit 'Weiter' für Phase [Y]."
4. BEIM NEUSTART: Ground-of-Truth-Dateien RE-LESEN.
   Überspringe alle ✅-Einträge. Starte bei ⏳ Pending.
```

### Harte Regeln

```text
1. NIEMALS Dateiinhalte erfinden. Datei nicht lesbar? → ❓ UNLESBAR
2. NIEMALS Funktionsbeschreibungen raten. Code unklar? → ❓ UNKLAR
3. NIEMALS .env-WERTE lesen oder ausgeben. Nur KEY-NAMEN.
4. IMMER Code > Doku > Memory bei Widersprüchen
5. IMMER Git > alles andere bei zeitlichen Fragen
6. ERST STOPPEN wenn JEDE Datei im File Manifest ✅ ist
7. BEI UNSICHERHEIT: Markieren und User fragen. Nie raten.
```

---

## Projekt-Agnostik: Adaptive Skalierung

```text
Der Workflow erkennt automatisch die Projekt-Größe:

GROSS (z.B. [SOURCE_WORKSPACE]: 88 EFs, 29 Wikis, Supabase, iOS):
  → Alle 9 Phasen aktiv
  → Context Checkpoints nach JEDER Phase
  → Geschätzte Dauer: 2-3 Stunden

MITTEL (z.B. [SOURCE_WORKSPACE]: 18 EFs, 6 Wikis, Supabase):
  → Alle 9 Phasen aktiv, weniger Iterations pro Phase
  → Context Checkpoints nach Phase 3, 6, 9
  → Geschätzte Dauer: 60-90 Minuten

KLEIN (z.B. nous-bridge: 30 Python-Module, kein Supabase):
  → Phase 2 (Migrations) entfällt
  → Phase 3 wird "Python Module Deep Dive" (statt Edge Functions)
  → Phase 5 (Datenmodell) entfällt wenn kein Supabase
  → Phase 7.2 (Python-Module) wird zur Hauptphase
  → Context Checkpoints nach Phase 3, 7
  → Geschätzte Dauer: 30-60 Minuten
```

---

## v4 Memory Bank Ergebnis

```text
memory-bank/
├── ── OPERATIV (unverändert) ──
│   ├── activeContext.md
│   ├── progress.md
│   ├── sessionLog.md
│   ├── productContext.md
│   ├── projectbrief.md
│   ├── systemPatterns.md
│   ├── techContext.md
│   └── narrative.md
│
├── ── GROUND TRUTH v3 (angereichert durch Phase 4) ──
│   ├── whitepaper.md              ← + EF Links, + DB Refs
│   ├── ares-bot-architecture.md   ← + nous-bridge Mapping
│   ├── data-flow.md               ← + Vollständige Topography
│   └── evolution.md               ← + Lückenlose Git-Timeline
│
├── ── GROUND TRUTH v4 (neu durch /deep-research) ──
│   ├── file-manifest.md            ← Inventar ALLER Dateien
│   ├── edge-function-registry.md   ← JEDE EF dokumentiert
│   ├── data-model-map.md           ← JEDE Tabelle, Schema, R/W Map
│   ├── module-interaction-map.md   ← Pipeline-Diagramme
│   ├── knowledge-index.md          ← Freshness-Index aller Docs
│   └── infrastructure-map.md       ← Services, Deps, Deploys, Kit Sync
```

---

## Phase 9.4: Kontext-Dateien generieren/aktualisieren (PFLICHT)

> Deep Research baut nicht nur Ground-Truth-Files, sondern auch die Boot-Files
> für alle zukünftigen Sessions. **Ohne diese Dateien ist der Research-Output isoliert.**

### 1. `system-index.md` generieren/aktualisieren

```markdown
# System Index — [Projekt]

## Quick Facts
- Stack: [...]
- Hosting: [...]
- Repo: [...]
- Module Count: [N] Files, [N] Edge Functions, [N] DB Tables

## Architecture Overview
[ASCII oder Mermaid Diagramm]

## Key Modules (Top 5 by LOC/Importance)
| Module | Pfad | Zweck | LOC |
|--------|------|-------|:---:|

## Memory Bank File Index
[Links zu allen Ground Truth v4 Files mit "Wann laden?" Guidance]

## Wiki Deep-Dive Index
[Links zu allen Wiki-Files mit Freshness-Status]

## Known Issues / Drift-Warnungen
[Aktuelle technische Schulden]

## Env Vars (NUR KEY-NAMEN!)
[Liste der Environment Variables — KEINE Werte!]
```

### 2. `ARCHITECTURE.md` generieren/aktualisieren (falls system-index zu kurz)

Vollständige Architektur-Dokumentation mit:
- System Overview mit Mermaid Diagramm
- AI/Backend Pipeline
- Frontend Component Architecture
- Core Data Flow
- Database Pillars (Tabellen-Gruppen)

### 3. `AGENTS.md` generieren/aktualisieren

Agent Brief nach Standard-Template:
- Identity, Stack, Build Commands
- Referenzen auf system-index + ARCHITECTURE + DESIGN
- Coding Standards des Projekts
- Directives (003, 004, PII, DSGVO)

### 4. `semantic-context.md` initial befüllen

```markdown
## Index der Kern-Module
[Aus Edge Function Registry + Module Map destilliert]

## Session-Chronik
### [Datum] — Deep Research Initial
**Geänderte Module:** [Alle analysierten Module]
**Erkenntnisse:** [Top-Level Architektur-Erkenntnisse]
**Abhängigkeiten entdeckt:** [Kern-Abhängigkeitsketten]
```

> **Ziel:** Nach einem `/deep-research` kann JEDER Agent sofort produktiv arbeiten,
> weil die Boot-Sequence alle nötigen Dateien vorfindet.
