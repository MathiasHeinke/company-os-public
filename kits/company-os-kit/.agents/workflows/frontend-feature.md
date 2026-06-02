---
description: Frontend Feature — Design→Build→Polish mit Brainstorm-Gate und Premium-Finish
---

# 🖤 Frontend Feature — Design → Build → Polish

Strukturierter Frontend-Workflow mit erzwungenem Brainstorm-Gate und Premium-Polish.
Steve Jobs definiert die Vision, Rauno baut, Jobs poliert.

> Auslöser: `/frontend-feature [Komponente/Feature]`

---

## Phase 0: Context laden (PFLICHT — IMMER!)

// turbo
```
PFLICHT-LEKTÜRE:
1. memory-bank/system-index.md ODER ARCHITECTURE.md → Codebase-Karte
2. DESIGN.md                                       → Design System Tokens
3. AGENTS.md                                       → Agent Brief + Standards
4. memory-bank/semantic-context.md                 → Systemverständnis (falls vorhanden)
5. .antigravity/logs/architect-memory.md            → Active Directives
6. .antigravity/personas/steve-jobs.md              → Design-Lead Persona
7. .antigravity/personas/react-architect.md          → Build-Lead Persona
```

---

## Phase 1: Quick Brainstorm (🖤 Steve Jobs)

Jobs definiert die UX-Vision in einem kompakten **UX-Brief** (max. 150 Wörter):

### UX-Brief enthält:
- **Was:** Was soll der User erleben? (1-2 Sätze)
- **Warum:** Warum ist das important? (1 Satz)
- **Constraints:** Dark Mode, Mobile-First, Breathing Room
- **Micro-Interactions:** Welche Animationen sollen sich premium anfühlen?
- **Referenz:** Gibt es ein bestehendes Pattern im Codebase das wiederverwendet werden soll?

**Gate:** User approved den UX-Brief bevor Code geschrieben wird.

> „Das ist die Vision. Einfach. Elegant. Keine Kompromisse. Approved?"

---

## Phase 2: Build (⚛️ The React Architect)

Rauno baut den Code nach den Design-System-Regeln:

### Pflicht-Regeln:
- **Tailwind CSS** für Layout und Styling (bestehende Design Tokens nutzen)
- **framer-motion** für alle sichtbaren Animationen (niemals CSS-only)
- **Radix UI** für interaktive Primitives (Dialog, Popover, Select, etc.)
- **Dark Mode** ist Standard — Light Mode ist optional
- **Responsive:** Mobile-First, dann Desktop-Erweiterung
- **Komponenten-Struktur:** Atomic Design — kleine, wiederverwendbare Bausteine

### Bau-Reihenfolge:
1. Daten-Hook (`use[Feature].ts`) — falls Backend-Daten nötig
2. Basis-Komponente — Skelett mit Tailwind
3. Animationen — framer-motion Variants
4. Edge Cases — Loading States, Empty States, Error States

---

## Phase 3: Polish (🖤 Steve Jobs)

Jobs übernimmt den Premium-Check:

| Prüfpunkt | Bestanden? |
|---|---|
| Pixel-perfekt und Dark Mode konform? | ☐ |
| framer-motion statt CSS-Transitions? | ☐ |
| Breathing Room — kein visuelles Clutter? | ☐ |
| Micro-Interactions vorhanden (Hover, Press, Enter)? | ☐ |
| Mobile-responsive? | ☐ |
| Copy-Rules eingehalten (Lexikon, keine verbotenen Begriffe)? | ☐ |
| Hide the Math — Details nur nach CTA sichtbar? | ☐ |

**Bei Fails:** Rauno fixt inline, Jobs prüft erneut.

---

## Phase 4: Ship

> „One more thing... Es ist fertig. Und es ist wunderschön. Weiter mit `/ship-it`?"
