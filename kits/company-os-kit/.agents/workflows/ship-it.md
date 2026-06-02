---
description: Build → iOS Sync → Edge Function Deploy → Git Commit & Push — kompletter Ship-Zyklus
---
// turbo-all

# 🚀 Ship — Build, Sync, Deploy & Push

Kompletter Ship-Zyklus nach Code-Änderungen. Kombiniert Build, iOS Sync, Edge Function Deploy und Git Push in einem Flow.

> Auslöser: `/ship-it` oder `/ship-it [commit message]` oder `/ship-it [edge-function-name]`

---

## 1. Production Build

```bash
npm run build
```

- ✅ `built in X.XXs` → Weiter
- ❌ Build-Fehler → Fix den Fehler, wiederhole Schritt 1

---

## 2. Capacitor iOS Sync

```bash
npx cap sync ios
```

- ✅ `✔ Copying web assets` + `✔ Updating iOS plugins` → Weiter
- ❌ Fehler → Prüfe `node_modules` (`npm install`), dann retry

---

## 3. Edge Function Deploy (falls zutreffend)

Prüfe ob Edge Functions geändert wurden:

```bash
git diff --name-only HEAD | grep "supabase/functions/"
git diff --stat HEAD -- supabase/functions/
```

**Falls Änderungen an Edge Functions vorliegen:**

Identifiziere die betroffene(n) Function(s) und deploye:

```bash
npx supabase functions deploy [function-name]
```

Nach dem Deploy — **Smoke-Test:**

```bash
npx supabase functions logs [function-name] --limit 5
```

Prüfe:
- ✅ Keine Errors in den Logs → Weiter
- ❌ Errors → Analysiere, fix, re-deploy

**Falls keine Edge Function Änderungen:** Überspringe diesen Schritt.

---

## 4. Memory V4 Micro-Update (Zwangsupdate)

> **KRITISCH:** Bevor der Code fest in den Main-Branch geht, MUSS die System-Landkarte (Memory V4) aktualisiert werden.

Prüfe die un-committeten Änderungen (`git diff --staged` oder `git status`).
**Stelle dir folgende Fragen:**
1. Habe ich eine **neue Edge Function** hinzugefügt oder den Ein-/Ausgang einer bestehenden geändert?
   → *Update: `memory-bank/edge-function-registry.md`*
2. Habe ich an der **Datenbank** (Schema/Typen) etwas geändert?
   → *Update: `memory-bank/data-model-map.md`*
3. Habe ich **neue Services/APIs** (in `.env`) eingeführt oder npm-Pakete installiert?
   → *Update: `memory-bank/infrastructure-map.md`*
4. Habe ich Architektur-Mechanismen oder Pipelines verändert?
   → *Update: `memory-bank/module-interaction-map.md` und relevante Wikis.*
5. Haben sich **Active Directives** oder der **Systemzustand** geändert?
   → *Update: `.antigravity/logs/architect-memory.md` — Layer 2 (Active Directives) + Layer 3 (Session Log)*
6. Hat sich der **Boot-Index** verändert (neue EFs, neue Tabellen, neue Pipelines)?
   → *Update: `memory-bank/system-index.md` — Einzeiler hinzufügen/aktualisieren*

**Regel:** Mache **Micro-Updates** (nur die Metadaten/Einträge hinzufügen/anpassen, keinen 3-Stunden Komplett-Scan).
- Wenn etwas aktualisiert wurde, füge der entsprechenden Datei oben im Header hinzu: `Letztes Update: [Heute]`
- Wenn NICHTS Architektonisches passiert ist (z.B. nur ein CSS Fix), überspringe diesen Schritt.
- **architect-memory.md Layer 3 (Session Log) wird IMMER geschrieben** — auch bei kleinen Fixes. Kein Fix ist zu klein für einen Einzeiler.

Im Zweifelsfall: **Lieber ein kurzes Update in der V4 Map riskieren, als Drift aufbauen.**

### 4a. Semantic Context Update (PFLICHT!)

Erweitere `memory-bank/semantic-context.md`:
```markdown
### [Datum] — Ship: [commit message Kurzfassung]
**Geänderte Module:** [Liste der angefassten Dateien/Module]
**Erkenntnisse:** [Was haben wir über das System gelernt?]
**Abhängigkeiten entdeckt:** [Welche Module hängen wie zusammen?]
**Entscheidungen:** [Was wurde entschieden und warum?]
```

---

## 4c. Linear Ship Gate (konditional)

Linear ist Execution Ledger, nicht Memory. Vor Commit/Push pruefen:

1. Gibt es ein bestehendes Linear-Issue fuer diesen Ship?
   → Kommentar mit Outcome, Source-Link, Verification, Deploy/Commit und offenen Punkten.
2. Entsteht ein konkreter Follow-up, Blocker, Review-Punkt oder Gate-Rest?
   → bestehendes Issue aktualisieren oder neues Issue mit Ziel,
   Akzeptanzkriterien, Guardrails, Zielworkspace und naechstem Schritt anlegen.
3. Ist alles erledigt?
   → `Done` nur setzen, wenn Akzeptanzkriterien, Tests/Gates und ggf. Deploy-Smoke gruen sind.

Keine reinen Memory-Updates, Session-Recaps oder parked-repo-Aufraeumideen in Linear schreiben.

---

## 4b. Deep E2E Quality Gate (Optional)

> Empfohlen nach größeren Feature-Builds oder vor Major Releases.

Frage den User:
> "Soll ich vor dem Push einen `/deep-e2e` Systemtest durchführen?"

- **Ja** → Starte `/deep-e2e` Workflow. Nach erfolgreichem Abschluss zurück zu Schritt 5.
- **Nein / Überspringen** → Weiter zu Schritt 5.

---

## 5. Git Commit & Push

Sammle die Änderungen (inklusive der gerade geänderten Memory-Dateien):

```bash
git add -A
git status
```

Erstelle einen Commit mit konventioneller Commit-Message:

```bash
git commit -m "[type](scope): [Beschreibung]"
```

**Commit-Type Regeln:**
| Type | Wann |
|---|---|
| `feat` | Neues Feature |
| `fix` | Bugfix |
| `refactor` | Code-Umbau ohne Feature-Änderung |
| `docs` | Nur Dokumentation |
| `chore` | Tooling, Config, Dependencies |
| `style` | Formatting, kein Code-Change |

Falls der User eine Commit-Message mitgegeben hat (`/ship-it [message]`), verwende diese.
Falls nicht, generiere eine prägnante Message basierend auf den Änderungen.

Push:

```bash
git push
```

---

## 6. Ergebnis melden

Fasse das Ergebnis zusammen:

> **Ship Complete:**
> - Build: ✅ (Xs)
> - iOS Sync: ✅ (Xs)
> - Edge Function: ✅ `[name]` deployed / ⏭️ keine Änderungen
> - Memory V4: ✅ [welche Dateien aktualisiert] / ⏭️ kein architektonisches Update
> - Architect Memory: ✅ Layer 3 Session Log geschrieben
> - Linear: ✅ [Issue aktualisiert / neues Issue] / ⏭️ nicht noetig
> - Git: ✅ `[commit hash]` → pushed to main
