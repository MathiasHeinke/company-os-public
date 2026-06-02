# Design System Templates — Antigravity Kit

> **Standardisiertes Design System Framework** für alle Antigravity Workspaces.
> Extrahiert aus dem Autarch/Strategos Production Design System via Google Stitch MCP.

---

## Warum dieses Template-System?

Jedes Antigravity-Projekt soll ein **konsistentes, premium UI/UX-Fundament** haben:
- Wiederverwendbare Design Tokens (Farben, Typography, Spacing)
- Bewährte UX Patterns (Progressive Disclosure, Three-Pane, Glassmorphism)
- Standardisierte Onboarding-Architektur
- Token-Compliance-Audit als Qualitätsgate
- Stitch-Prototyping → DESIGN.md Pipeline

---

## Dateien in diesem Template

| Datei | Zweck | Ziel im Projekt |
|---|---|---|
| `DESIGN.md` | Kanonisches Design System (Tokens, Rules, Patterns) | `[project]/dashboard/DESIGN.md` oder `[project]/DESIGN.md` |
| `ux-architecture.md` | UX Blueprint (Flows, Onboarding, Sidebar, Compliance) | `[project]/docs/wiki/ux-architecture.md` |
| `../knowledge/ux-design-system.md` | Knowledge File für Build-Personas | `[project]/.antigravity/knowledge/ux-design-system.md` |

---

## Workflow: Von 0 zur DESIGN.md

### Kurzversion

```
1. Stitch-Projekt erstellen (StitchMCP)
2. Design System mit designMd erstellen
3. 5-10 Screens generieren
4. Design System auf Screens anwenden
5. Visuell validieren
6. Tokens extrahieren → DESIGN.md befüllen
7. UX Architecture Wiki anlegen
8. Knowledge File für Personas erstellen
```

### Ausführlich

Siehe Workflow: `/stitch-design-system` (`antigravity-kit/.agents/workflows/stitch-design-system.md`)

---

## Installation (Greenfield vs. Brownfield)

### Variante A: Greenfield (Neues Projekt)
```bash
# 1. Templates kopieren
cp antigravity-kit/templates/design-system/DESIGN.md [PROJECT]/DESIGN.md
cp antigravity-kit/templates/design-system/ux-architecture.md [PROJECT]/docs/wiki/ux-architecture.md
cp antigravity-kit/.antigravity/knowledge/ux-design-system.md [PROJECT]/.antigravity/knowledge/ux-design-system.md

# 2. Platzhalter ersetzen
# Suche nach [PRODUKT], [HEX], [FONT], [STITCH_PROJECT_ID] und setze deine neuen Werte.

# 3. /stitch-design-system Workflow starten für visuelles Prototyping
```

### Variante B: Brownfield (Bestehendes Projekt / "Samthandschuh")
```bash
# 1. Templates kopieren (wie bei Greenfield)

# 2. Ist-Zustand scannen
# Der Agent muss index.css und tailwind.config.ts des Projekts auslesen.

# 3. Token-Mapping festzurren (Phase 0)
# Trage die gefundenen Variablen in Sektion "2.1.1 Token Mapping Layer" der DESIGN.md ein (z.B. --bg-primary -> --background).
# Berühre KEINE Source-Code-Dateien (.tsx)!

# 4. Ausnahmen dokumentieren
# Trage SVG/Chart-Farben zwingend in Sektion "9. Intentional Exceptions" ein.
```

---

## Referenz: Autarch Design System (Source)

| Aspekt | Wert |
|---|---|
| Stitch Project | `projects/16993962936118562564` |
| North Star | "The Sentinel Overlay" |
| Primary Color | `#0ea5e9` (Cool Cyan) |
| Font | Inter |
| Design Systems | 5 Varianten (Kinetic✅, Neo, Obsidian, Luminous) |
| Screens | 10 (Dashboard, Agents, Issues, Settings, Onboarding, Sidebar) |
| Verbotene Farbe | Purple/Violet |
| Architecture Principles | No-Line Rule, Glassmorphism, Tonal Layering |

---

## Persona-Integration

Diese Templates werden automatisch von folgenden Personas konsultiert:

| Persona | Liest | Wofür |
|---|---|---|
| 🖤 Steve Jobs | DESIGN.md + UX Arch | Vision, User Journey, Emotional Design |
| ⚛️ Rauno Freiberg | DESIGN.md + Knowledge File | Komponenten-Code, Token-Compliance |
| 🧠 Dan Abramov | Knowledge File | State Management für Interface Modes |
| 🥃 Don Draper | UX Architecture | Copy, Onboarding-Texte, CTA-Wording |
| 🔍 Sherlock Holmes | DESIGN.md Section 9 | Token-Compliance-Audit |

---

## Mastertable Referenz

Für Design-System-Arbeit aktiviere:
- **`/mt-fe`** — Frontend Sprint (Steve Jobs, Rauno, Dan Abramov, Draper, Kahneman, Cypher, Jonah)
- **`/mt-arch`** — Architecture Review (Karpathy, Carmack, Elon, Sherlock, Mr. Robot, Taleb, Cypher)
- **`/stitch-design-system`** — Stitch Prototyping Workflow (NEU)
