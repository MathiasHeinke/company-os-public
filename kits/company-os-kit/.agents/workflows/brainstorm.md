---
description: Spec Before Code — Erzwungener Brainstorm-Dialog vor jeder Implementierung
---

# 🧠 Brainstorm — Spec Before Code

Du aktivierst einen strukturierten Brainstorm-Dialog. **Keine Lösungen vorschlagen — nur Fragen stellen.**
Erst wenn die Spec steht und vom User approved ist, darf Code geschrieben werden.

> Auslöser: `/brainstorm [Feature/Problem]`

---

## 1. Karpathy als Lead laden

// turbo
```
Lies: .antigravity/personas/andrej-karpathy.md
Lies: .antigravity/logs/architect-memory.md
```

---

## 2. System-Kontext laden (PFLICHT!)

> Kein Brainstorm ohne Systemverständnis.

// turbo
```
Lies: memory-bank/system-index.md ODER ARCHITECTURE.md
Lies: DESIGN.md (bei UI-Features)
Lies: AGENTS.md
Lies: memory-bank/activeContext.md
Lies: memory-bank/semantic-context.md (falls vorhanden)
```

Erst DANACH beginnt der Brainstorm-Dialog.

---

## 3. Klärende Fragen stellen (KEINE Lösungen!)

Stelle **3–5 gezielte Fragen**, um die Anforderung vollständig zu verstehen.

### Regeln:
- ❌ **NIEMALS** eine Lösung vorschlagen in dieser Phase
- ❌ **NIEMALS** Code-Snippets zeigen
- ✅ Nur Fragen stellen, die Scope, Edge Cases und Constraints klären
- ✅ Frage nach Akzeptanzkriterien: „Woran erkennst du, dass es fertig ist?"

### Beispiel-Fragen:
- Was genau soll passieren, wenn [Edge Case]?
- Welche bestehenden Komponenten/Engines sind betroffen?
- Was ist explizit NICHT Teil dieses Features?
- Wie soll sich das für den User anfühlen?
- Gibt es Abhängigkeiten zu laufenden Features/Migrations?

---

## 4. Spec in Chunks formulieren

Formuliere die Spec in **kompakten Chunks** (max. 200 Wörter pro Chunk).

### Pro Chunk:
1. Formuliere den Chunk klar und präzise
2. Präsentiere ihn dem User
3. **Gate:** Warte auf User-Approval bevor du zum nächsten Chunk weitergehst
4. Bei Feedback: Chunk anpassen und erneut vorlegen

### Chunk-Struktur:
```markdown
### Chunk [N]: [Titel]
[Beschreibung in ≤200 Wörtern]

**Akzeptanzkriterium:** [Wie wird Erfolg gemessen?]

> ✅ Approved? / ❌ Anpassen?
```

---

## 5. Spec-Zusammenfassung

Wenn alle Chunks approved sind, erstelle eine kompakte Gesamtzusammenfassung:

```markdown
## Spec: [Feature-Name]

### Scope
[Was wird gebaut — 3-5 Bullet Points]

### Akzeptanzkriterien
- [ ] [Kriterium 1]
- [ ] [Kriterium 2]
- [ ] [...]

### Out of Scope
- [Was explizit NICHT Teil dieses Features ist]

### Betroffene Dateien/Systeme
- [Datei/Engine/Tabelle die berührt wird]
```

---

## 6. Handoff

> „Spec steht und ist approved. Nächster Schritt: `/disciplined-build`, `/tdd`, oder direkt implementieren?"
