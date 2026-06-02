---
description: Agentic Execute — Maximale Härte und Zero-Hallucination Execution eines bestehenden Plans
---

# 🤖 Agentic Execute (/agentic-execute)

> **KERNPRINZIP: Chirurgische Execution ohne Halluzinationen.**
> Dieser Workflow PLANT NICHT. Er geht davon aus, dass ein detaillierter Plan existiert. Er führt exakt aus, was verlangt ist – mit eiserner TDD-Strenge, Fortress-Gates nach jedem Schritt und finalem Exit in den Deep Audit.

```
/agentic-execute [Referenz zum Plan, z.B. Artefakt-Name oder "führe Phase 4 aus obigem Plan aus"]
```

---

## 🔴 5 UNVERHANDELBARE REGELN FÜR DIE AUSFÜHRUNG

1. **NO HALLUCINATION** — Vor JEDER Code-Änderung an einer Datei MUSST du die betroffene Datei per Tool lesen (`view_file` / `grep`). Du darfst NIE vermuten, was aktuell in der Datei steht.
2. **STRICT COMPLIANCE** — Was im Plan steht, ist Gesetz. Fehlt ein Edge-Case im Plan, der für die Umsetzung kritisch ist, stoppst du kurz, triffst eine fundierte Entscheidung (und loggst sie), anstatt den Plan zu verwerfen. 
3. **ISOLATED EXECUTION** — Baue isoliert Phase für Phase. Keine Phase wird gestartet, bevor die vorherige NICHT **mit einem sauberen Build und Type-Check** abgeschlossen wurde.
4. **EVAL = TERMINAL-BEWEIS** — "Funktioniert scheinbar" reicht nicht. Führe echte Befehle aus (Build, TSC, Grep), um die Richtigkeit zu belegen.
5. **AUTOMATISCHER AUDIT EXIT** — Nach Abschluss MUSS `/deep-audit` getriggert werden. Keine Ausnahmen. Keine Abkürzungen zum `/ship-it` ohne exakten Audit.

---

## Phase 1: Pre-Flight & Baseline (~5min)

### 1.1 Plan Verifizierung
Lies den bereitgestellten Plan komplett ein. Extrahiere mental:
- **Zielsetzung & Scope**
- **Alle Phasen & Reihenfolge**
- **Alle erwarteten EVAL Gates & Tests**

### 1.2 Context Shielding & Baseline
- Prüfe, ob die im Plan referenzierten Dateien und Environments (z.B. `.env` Variablen) auch existieren.
- Führe einen initialen Baseline-Check aus (z.B. `npm run build` ODER `npx tsc --noEmit`), um sicherzustellen, dass das unberührte Projekt funktioniert.
- Falls die Baseline schon kaputt ist: **ABORT.** Führe erst einen `/hotfix` oder `/deep-audit` durch. Baue nie auf einem kaputten Fundament auf!

---

## Phase 2: Autonome Execution Loop (Pro Phase)

Für JEDE Phase im Plan durchläufst du diesen rigorosen Loop:

### Schritt A: Reality Check (Anti-Halluzination)
Lies die betroffenen Dateien mit deinen Tools ein. 
Stelle sicher, dass die Signaturen, Hooks und Dateipfade aus dem Plan auch WIRKLICH noch der echten Codebase entsprechen. Ein Plan von gestern kann heute schon veraltet sein. Kein "blindes Überschreiben" ohne zu prüfen!

### Schritt B: Build & Mutate
Führe die im Plan beschriebenen Code-Änderungen exakt aus.
- Nutze die sichersten Datei-Bearbeitungstools.
- Lasse bestehenden Code, der nicht modifiziert werden soll, absolut unberührt.
- Keine Dead-Code Generierung (Lösche alte Passagen, dokumentiere sie nicht nur aus, außer bei temporären Debug-Schritten).

### Schritt C: Phase EVAL & Fortress-Gate
Bevor du zur nächsten Phase gehst, MUSS zwingend erfolgen:
1. **Type-Check & Build:** Führe den passenden Compiler/Linter-Check (z.B. `npx tsc --noEmit`) aus. Der Code MUSS kompiliert werden können.
2. **Quality Check:** Kein `any` importiert, keine leeren `catch`-Blöcke, keine vergessenen `console.log`.
3. **Plan Check:** Wurden alle Punkte dieser Phase berücksichtigt?

> **❌ Bei Failure:** Du hast MAXIMAL 2 Versuche, einen Fehler inline zu beheben (z.B. vergessener Import). Wenn das EVAL danach immer noch wegbricht: **ABORT.** Revertiere im Notfall die Änderung, dokumentiere im Session-Memory warum der Plan gescheitert ist, und pausiere. 

### Schritt D: Checkpoint
Wenn das Phase-EVAL bestanden ist (✅):
- Erwäge einen lokalen Commit als Checkpoint (`git add -A && git commit -m "checkpoint(execute): phase [N] - [Summary]"`).
- Fahre **nahtlos** und autonom mit der nächsten Phase fort. Keine Zwischen-Erlaubnis vom User nötig.

---

## Phase 3: Final EVAL & Cleanup

Wenn alle Phasen abgeschlossen sind:
1. Führe alle "Final Session EVAL" Anforderungen des ursprünglichen Plans aus.
2. Mache einen strikten Bug-Hunting-Pass im Terminal:
   - Suche nach Resten wie `TODO`, `FIXME`.
   - Suche per `grep` nach hinterlassenen `console.log`.
   - Suche nach potentiellen Privacy/PII Leaks (DIRECTIVE-002: Hardcoded Secrets?).
3. Erstelle ein kurzes Summary für den User: **"Execution Complete. [N] Phasen erfolgreich und ohne Halluzinationen implementiert. Bereit für den Audit."**

---

## Phase 4: Exit → `/deep-audit` (AUTOMATISCH)

Triggere als **letzte Handlung automatisch den Workflow `/deep-audit --scope=recent-changes`**. Er übernimmt nun den Code, führt den Multi-Lens-Review (Sherlock, Ramsay etc.) durch und korrigiert die allerletzten Linter-Fehler, bevor der Code als "production ready" markiert werden kann.
