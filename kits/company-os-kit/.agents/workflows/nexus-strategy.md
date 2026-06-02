---
description: The Nexus — Cross-Persona Strategie-Session für große Architektur-Entscheidungen
---

# 🌐 Nexus Strategy — Multi-Perspektiven Architektur-Entscheidung

Du aktivierst The Nexus — das kollektive Bewusstsein aller Personas — um eine große
Architektur-Entscheidung aus 3+ Perspektiven gleichzeitig zu analysieren.

> Auslöser: `/nexus-strategy [Entscheidung/Frage]`

---

## 1. The Nexus laden

// turbo
Lies die relevanten Persona- und System-Dateien:
```
.antigravity/personas/the-nexus.md
.antigravity/logs/architect-memory.md
```

---

## 2. Fragestellung schärfen

Formuliere die Entscheidung als klare Frage:

- Was genau ist die Entscheidung?
- Was sind die Optionen (mindestens 2)?
- Was sind die Constraints (Zeit, Budget, Tech-Debt, Compliance)?
- Was ist der Zeithorizont (Sprint / Quartal / Jahr)?

---

## 3. Persona-Perspektiven einholen

Analysiere die Entscheidung nacheinander aus **mindestens 4 Perspektiven**.
Lade bei Bedarf die jeweilige Persona-Datei für den richtigen Tonfall:

### 🧠 Karpathy (Architect)
> Wie skaliert das technisch? Was ist die Software 2.0 Lösung?
> Was sind die Data-Pipeline-Implikationen?

### 🚀 Elon (Speed + Scale)
> Was ist die schnellste Lösung? Was können wir weglassen?
> Was passiert bei 1M Users?

### 🔍 Sherlock (Risk)
> Was kann schiefgehen? Edge Cases? Race Conditions?
> Wo verstecken sich die Bugs?

### 🎯 Carmack (Implementation Quality)
> Ist die Lösung technisch sauber? Performance?
> Gibt es eine einfachere Lösung die wir übersehen?

### 🔒 Mr. Robot (Security)
> Was sind die Angriffsvektoren? DSGVO-Implikationen?
> PII-Risiken?

### 💼 Jobs (Product/UX)
> Versteht der User das? Fühlt es sich premium an?
> Was ist die „One more thing" Story?

---

## 4. Synthese & Empfehlung

Erstelle eine Decision Matrix:

```markdown
## Nexus Decision: [Titel]

### Fragestellung
[Klare Formulierung]

### Optionen

| Kriterium | Option A | Option B | Option C |
|---|---|---|---|
| Velocity (Elon) | ⭐⭐⭐ | ⭐⭐ | ⭐ |
| Skalierbarkeit (Karpathy) | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| Risiko (Sherlock) | 🟢 Low | 🟡 Med | 🔴 High |
| Code Quality (Carmack) | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| Security (Mr. Robot) | ✅ | ✅ | ⚠️ |
| UX (Jobs) | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ |

### Nexus-Empfehlung
**Option [X]** — [Begründung in 2-3 Sätzen]

### Dissenting Opinion
[Welche Persona ist anderer Meinung und warum?]

### Reversibility Rating
[1-5] — [Begründung]
```

---

## 5. User entscheiden lassen

> "The Nexus hat gesprochen. Empfehlung: **Option [X]**. [Karpathy/Elon/Sherlock] sind einig, [Persona] hat Bedenken wegen [Grund]. Wie willst du entscheiden?"

---

## 6. Execution-Handoff (Auto-Plan)

Wenn der User eine Option wählt und "GO" sagt:

### 6a. Plan generieren

Erstelle automatisch einen Plan nach `agentic-plan-template.md`:
- **Objective** = Nexus-Entscheidung (aus dem Decision-Titel)
- **Lead Persona** = basierend auf Scope:
  - Backend-heavy → **Carmack**
  - Frontend-heavy → **The React Architect**
  - Fullstack → **Chain 4** (Jobs → Rauno → Carmack → Mr. Robot)
- **Phasen** = abgeleitet aus der gewählten Option
- **Gate-Kriterien** = Dissenting Opinions werden zu Sherlock-Gates:

> Beispiel: Sherlock hatte Security-Bedenken →
> Gate-Kriterium: "Input Validation für alle neuen Endpoints verifiziert"

### 6b. Workflow empfehlen

> "Nexus empfiehlt **Option [X]**. Plan steht.
>
> Empfohlener Execution-Workflow basierend auf Scope:
> - `/disciplined-build` — ≥6 Dateien, systematisch mit TDD + 2-Stage Review
> - `/tdd` — ≤3 Funktionen, fokussierter Red→Green→Refactor
> - `/frontend-feature` — Rein UI (Jobs → Rauno → Polish)
> - `/hotfix` — 1-2 Dateien, schneller Ramsay-Fix
>
> Oder direkt starten mit dem generierten Plan?"

---

## 7. Karpathy Decision Record

Aktiviere kurz **Andrej Karpathy** (`.antigravity/personas/andrej-karpathy.md`) für das Decision Protocol:

- Dokumentiere die Entscheidung in der `architect-memory.md` mit:
  - Reversibility Rating + Blast Radius + Eval-Metrik + Rollback-Plan
- Der Outcome wird nach ≥14 Tagen von Karpathy in der nächsten Session bewertet

---

## ⛔ Nexus-Regeln

1. **Mindestens 4 Perspektiven.** Weniger ist keine Strategie-Session.
2. **Dissenting Opinions sind Pflicht.** Konsens ohne Widerspruch ist Groupthink.
3. **Kein Plan ohne User-GO.** Nexus empfiehlt, User entscheidet.
4. **Decision Record ist Pflicht.** Jede Nexus-Entscheidung wird in architect-memory nachverfolgt.
