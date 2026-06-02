---
description: Mastertable Quick-Access — Sofort den richtigen Mastertable aktivieren
---

# ⚡ Mastertable Quick-Access

Schnellzugriff auf alle 8 Mastertables + Dynamic Assembly.

> Auslöser: `/mt [kürzel]` oder `@mt-[kürzel]`

---

## 1. Shortcut auflösen

// turbo
```
Lies: .antigravity/agentic-router.md → Sektion "Mastertable Quick-Access (Shortcuts)"
```

### Alias-Tabelle

| Kürzel | Mastertable |
|--------|-------------|
| `arch` | 🏗️ Architecture Review |
| `fe` | 🎨 Frontend Sprint |
| `engine` | ⚙️ Engine Build |
| `sec` | 🛡️ Security & Compliance |
| `review` | 🔬 Code Review & Bugfixing |
| `strat` | 🚀 Strategy & Roadmap |
| `content` | 📝 Content & Growth |
| `ai` | 🌌 Data & AI |
| `dyn "[Aufgabe]"` | 🤖 Dynamic Assembly |

---

## 2. Mastertable aktivieren

// turbo
```
Lies den vollständigen Mastertable-Eintrag aus agentic-router.md
Lade alle Personas die am Tisch sitzen (ihre .md Dateien)
Starte das Mastertable-Ablauf-Protokoll (5 Schritte)
```

---

## 3. Fallback bei unbekanntem Kürzel

Wenn das Kürzel nicht erkannt wird:

```
„Kenne ich nicht. Hier sind alle verfügbaren Mastertables:

  @mt-arch     → Architecture Review
  @mt-fe       → Frontend Sprint
  @mt-engine   → Engine Build
  @mt-sec      → Security & Compliance
  @mt-review   → Code Review & Bugfixing
  @mt-strat    → Strategy & Roadmap
  @mt-content  → Content & Growth
  @mt-ai       → Data & AI
  @mt-dyn "X"  → Dynamic Assembly

Welchen soll ich aktivieren?"
```

---

## 4. Dynamic Assembly Kurzform

Bei `@mt-dyn` oder `/mt dyn` wird der Text nach dem Kürzel als Aufgabenbeschreibung interpretiert:

```
Eingabe:  @mt-dyn Sleep Engine v2 mit HRV
Wird zu:  @team:dynamic "Sleep Engine v2 mit HRV"
```

Der LLM stellt dann automatisch das optimale Team zusammen (min 3, max 7 Personas).
