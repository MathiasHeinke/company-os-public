# DESIGN.md — Kanonisches Design System [Template]

> **Source of Truth for all UI code.** AI agents MUST read this file before writing any UI component, page, or style.
> Generated via Google Stitch Prototyping → Validated → Kodifiziert.
> Stitch Project: `projects/[STITCH_PROJECT_ID]`

> [!CAUTION]
> **AGENT INITIALIZATION PROTOCOL (Greenfield vs. Brownfield)**
> Bevor du (als Agent) dieses Design System auf ein existierendes Projekt anwendest, evaluiere den Ist-Zustand des Codes:
> 
> 1. **Greenfield (Neues Projekt):** Verwende die Tokens in diesem Dokument 1:1 und nutze Vanilla CSS.
> 2. **Brownfield / Legacy (Bestehendes Projekt, z.B. mit Tailwind):**
>    - **Fasse das Projekt mit Samthandschuhen an!** Verändere *niemals* blind Hunderte Dateien oder bestehende Tailwind-Klassen (`bg-primary`, `text-card-foreground`).
>    - Nutze die **Sektion 2.1.1 (Token Mapping Layer)**, um unsere semantischen Tokens (z.B. `--bg-primary`) in die bestehende CSS-Infrastruktur / Tailwind-Config zu übersetzen (z.B. als Alias für `--background`).
>    - Ändere *nicht* die visuelle Kern-Identität des bestehenden Projekts, sondern erfasse sie hier als Referenz.
>    - Erfasse technische Limits (wie SVG, Canvas, Charts), die zwingend Hex-Werte brauchen, im **Sektion 9 (Compliance Audit)** als *Intentional Exceptions*.

---

## 1. Overview & Principles

### Identity
- **Product:** [PRODUKT] — [Kurzbeschreibung]
- **Paradigm:** [z.B. Board Member Dashboard / Consumer Health App / Content Platform]
- **User is:** [Beschreibung der primären Nutzerrolle]
- **User is NOT:** [Was der User NICHT ist — wichtig für Design-Entscheidungen]

### Creative North Star: "[NORTH STAR NAME]"
> [1-2 Sätze die beschreiben, wie sich das Interface ANFÜHLEN soll. Nicht was es tut, sondern wie es sich anfühlt.]
> Beispiele: "The Sentinel Overlay" (Autarch), "The Bio Cockpit" ([SOURCE_COMPANY]), "The Knowledge Cathedral"

### Core Principles
1. **Tokens before hardcoded values** — NEVER use raw hex in components (except for documented exceptions in Section 9).
2. **Progressive Disclosure** — Level 0 (Board) / Level 1 (Manager) / Level 2 (Expert)
3. **Tonal depth over structural lines** — Use background color shifts, not borders
4. **Calm Confidence** — No aggressive colors, no visual noise
5. **Results, not configuration** — Show outcomes, not implementation details

---

## 2. Design Tokens

### 2.1.1 Token Mapping Layer (BROWNFIELD / TAILWIND ADAPTER)

> [!TIP]
> **Für bestehende Projekte (wie Tailwind UI / Shadcn):** Wenn die Applikation bereits Tokens wie `--background`, `--primary` nutzt, mappen wir unsere Template-Tokens hierauf. Dadurch funktioniert unsere Designsprache, ohne das Kern-CSS zu zerstören. Bei reinen Greenfield-Projekten diese Sektion ignorieren/löschen.

| AOS Token | Bestehendes Projekt Token (Alias) | Projekt-Spezifischer Hex (Referenz) |
|---|---|---|
| `--bg-primary` | `var(--background)` | `#000000` |
| `--accent-primary` | `var(--primary)` | `#10b981` |
| `--border-glass` | `var(--border-color) / Tailwind border-*` | `rgba(255,255,255,0.1)` |

### 2.1 Color Palette

#### Backgrounds & Surfaces

| Role | Token | Dark Mode | Light Mode |
|---|---|---|---|
| Base / Infinite Foundation | `--bg-primary` | `#0a0a0f` | `#f8f9fa` |
| Elevated Surface | `--bg-secondary` | `#12121a` | `#f0f1f3` |
| Card / Component | `--bg-card` | `rgba(255, 255, 255, 0.04)` | `#ffffff` |
| Card Hover | `--bg-card-hover` | `rgba(255, 255, 255, 0.07)` | `rgba(0, 0, 0, 0.02)` |
| Glass / Frosted | `--bg-glass` | `rgba(255, 255, 255, 0.06)` | `rgba(0, 0, 0, 0.03)` |

#### Stitch Material Design Surface Tiers (Reference)

> [!NOTE]
> Befülle diese Tabelle aus deinem Stitch Design System. Die Werte kommen aus `namedColors` → `surface_container_*`.

| Tier | Token | Hex | Usage |
|---|---|---|---|
| Container Lowest | `surface-container-lowest` | `#[HEX]` | Inset wells, log streams |
| Container Low | `surface-container-low` | `#[HEX]` | Background groupings |
| Container | `surface-container` | `#[HEX]` | Standard interactive containers |
| Container High | `surface-container-high` | `#[HEX]` | Active states, hover |
| Container Highest | `surface-container-highest` | `#[HEX]` | Input bgs, elevated modals |

#### Borders

| Role | Token | Dark Mode | Light Mode |
|---|---|---|---|
| Glass Border | `--border-glass` | `rgba(255, 255, 255, 0.08)` | `rgba(0, 0, 0, 0.08)` |
| Active Border | `--border-active` | `rgba([R], [G], [B], 0.4)` | `rgba([R], [G], [B], 0.5)` |
| Ghost Border (fallback) | — | `outline-variant` at 15% opacity | same |

> [!IMPORTANT]
> **The "No-Line" Rule:** Do NOT use 1px solid borders for sectioning or layout containment. Structural boundaries MUST be defined solely through background color shifts. Borders are ONLY for interactive component edges (cards, inputs, buttons).

#### Accent Colors

| Role | Token | Hex | Usage |
|---|---|---|---|
| **Primary CTA** | `--accent-primary` | `#[HEX]` | Buttons, Active states, Links, Brand |
| **Secondary** | `--accent-secondary` | `#[HEX]` | Gradient endpoint, secondary interactive |
| **Gradient** | `--accent-gradient` | `linear-gradient(135deg, ...)` | Brand text, page titles, KPI values |
| Success / Active | `--accent-green` | `#10b981` | Completed, Online, Positive |
| Danger / Error | `--accent-red` | `#ef4444` | Errors, Destructive actions |
| Warning / Working | `--accent-amber` | `#f59e0b` | In Progress, Alerts, Budget warnings |
| Info / Links | `--accent-blue` | `#3b82f6` | Information, external links |

> [!CAUTION]
> **[VERBOTENE FARBE].** Definiere hier die Farbe, die NICHT verwendet werden darf. Beispiel: "NO PURPLE — Under no circumstances should any purple/violet hue be used."

#### Status Colors

| Status | Token | Hex | Usage |
|---|---|---|---|
| Running / Active | `--status-active` | `var(--accent-primary)` | Active processes |
| Completed | `--status-success` | `var(--accent-green)` | Success states |
| Warning / In Progress | `--status-warning` | `var(--accent-amber)` | Pending attention |
| Error / Blocked | `--status-error` | `var(--accent-red)` | Failures |
| Idle / Backlog | `--status-idle` | `var(--text-muted)` | Inactive |

### 2.2 Typography

| Role | Family | Size | Weight | Letter Spacing |
|---|---|---|---|---|
| Display | [FONT] | 2rem+ | Bold | -0.02em |
| Headline | [FONT] | 1.25-1.75rem | Semi-Bold | -0.01em |
| Title | [FONT] | 1-1.25rem | Medium | normal |
| Body | [FONT] | 0.875-1rem | Regular | normal |
| Label | [FONT] | 0.75rem | Medium | 0.05em (ALL CAPS) |
| Code | Monospace | 0.8125rem | Regular | normal |

### 2.3 Spacing Scale

| Token | Value | Usage |
|---|---|---|
| `--space-1` | 4px | Tight internal padding |
| `--space-2` | 8px | Card internal padding |
| `--space-3` | 12px | Between related items |
| `--space-4` | 16px | Default component padding |
| `--space-6` | 24px | Section spacing |
| `--space-8` | 32px | Major section breaks |
| `--space-12` | 48px | Page-level gutters |

### 2.4 Corner Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 4px | Chips, Tags |
| `--radius-md` | 8px | Buttons, Inputs |
| `--radius-lg` | 12px | Cards, Panels |
| `--radius-xl` | 16px | Modals, Popovers |
| `--radius-full` | 9999px | Avatars, Pills |

---

## 3. Glassmorphism Patterns

### Standard Glass Panel
```css
.glass-panel {
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-lg);
}
```

### Glass Hover
```css
.glass-panel:hover {
  background: rgba(255, 255, 255, 0.07);
  border-color: rgba([R], [G], [B], 0.2);
  box-shadow: 0 0 15px rgba([R], [G], [B], 0.15);
}
```

---

## 4. Component Patterns

### Button Hierarchy (Non-negotiable)

| Level | Style | Count per Screen | Usage |
|---|---|---|---|
| PRIMARY | Solid/Gradient fill, glow shadow, bold text | **MAX 1** | Most important action |
| SECONDARY | Glass bg, subtle border | 1-2 | Alternative actions |
| GHOST | Text-only, hover: bg-shift | Unlimited | Navigation, tertiary |
| DANGER | Red bg or red outline | As needed | Destructive actions (ALWAYS with confirm) |

### Card Pattern
```
┌──────────────────────────────────────┐ ← Glass bg, radius-lg
│  📋 Card Header              [...]  │ ← Title + Actions
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │ ← NO LINE — spacing only
│                                      │
│  Card content here                   │ ← Body text
│                                      │
│  [Ghost Action]      [Primary CTA]   │ ← Button hierarchy
└──────────────────────────────────────┘
```

### Three-Pane Layout
```
┌─────────────────────────────────────────────────────┐
│ BreadcrumbBar: [← Back] / [Parent] / [Current]     │
├────────┬──────────────────────┬─────────────────────┤
│ LEFT   │ CENTER               │ RIGHT               │
│ Nav    │ Main Content         │ Properties Panel    │
│ (240px)│ (flex-1)             │ (320px, collapsible)│
│        │                      │                     │
│        │                      │ Status:  ● Active   │
│        │                      │ Created: 2026-03-29 │
│        │                      │ Owner:   Agent #3   │
│        │                      │                     │
│        │                      │ [Actions ↓]         │
└────────┴──────────────────────┴─────────────────────┘
```

---

## 5. Animation Rules

| Aspect | Value | Notes |
|---|---|---|
| Duration | 200-800ms | Never longer |
| Easing | `cubic-bezier(0.4, 0, 0.2, 1)` | Standard Material easing |
| Reduced Motion | `@media (prefers-reduced-motion)` | **PFLICHT** — disable all |
| Sound | None | No audio feedback |
| Repeat | No spam | Don't animate on repeated same action |

---

## 6. Anti-Patterns (Forbidden)

- ❌ **No hardcoded hex** — always use `var(--token)` in components (außer: Intentional Exceptions)
- ❌ **No structural borders** — use background shifts for layout
- ❌ **No empty states** — always pre-populate or show guidance
- ❌ **No loading blanks** — skeleton screens are mandatory
- ❌ **No jargon** — human-readable labels always
- ❌ **No choice overload** — max 5-7 options per dropdown/selection
- ❌ **No flat button hierarchy** — always PRIMARY > SECONDARY > GHOST
- ❌ **[VERBOTENE FARBE]** — defined above

---

## 7. Progressive Disclosure Levels

| Feature Category | Beginner | Standard | Expert |
|---|---|---|---|
| Dashboard KPIs | ✅ | ✅ | ✅ |
| Primary Actions | ✅ | ✅ | ✅ |
| List Views | ✅ | ✅ | ✅ |
| Detail Views | Basic | Full | Full + Raw Data |
| Advanced Filters | ❌ | ✅ | ✅ |
| System Config | ❌ | ❌ | ✅ |
| Raw Logs/Debug | ❌ | ❌ | ✅ |

---

## 8. Stitch Reference

> [!NOTE]
> Befülle diese Sektion nach dem Stitch Prototyping Workflow (siehe `/stitch-design-system` Workflow).

| Item | Value |
|---|---|
| Stitch Project ID | `[ID]` |
| Project Title | [Titel] |
| Creative North Star | "[NAME]" |
| Device Type | [Desktop/Mobile/Tablet] (Default: Desktop 1280px) |
| Color Mode | [Dark / Light / Dark + Light] |
| Primary Color | `#[HEX]` |
| Font | [FONT] |
| Roundness | [ROUND_FOUR / ROUND_EIGHT / ROUND_TWELVE] |

> **Evolution:** If the design system needs updating, generate new screens in Stitch first, validate visually, then update this file. DESIGN.md is always the final source of truth, Stitch is the prototyping layer.

---

## 9. Compliance Audit Log

> [!TIP]
> Führe nach jeder UI-Session einen Token-Compliance-Check durch. Suche nach hardcoded Hex-Werten in `.tsx`-Dateien. Bei gewachsenen Projekten (Brownfield) ignoriere die dokumentierten Ausnahmen!

### Token Compliance Check (v[VERSION] — [DATUM])

**Status:** [✅ PASS / ❌ FAIL / 🟡 PHASE 0 MAPPING]

| Component | Status | Notes |
|---|---|---|
| `[Component].tsx` | ✅/❌/🟡 | [Details] |

### Intentional Exceptions (BROWNFIELD / TECHNICAL LIMITATIONS)
> In reifenden oder technisch limitierten Applikationen (z.B. Charts) ist der Einsatz von CSS-Variablen oft nicht möglich oder nicht sinnvoll. Dokumentiere diese hier, damit Audits keine Fehler werfen!

- **Recharts / SVG-Graphen**: `stroke`, `fill` und `<stop>` in Gradienten akzeptieren teilweise keine CSS Variablen. -> *Hex-Werte in Rechart/SVG sind hier erlaubt!*
- **[Datei:Zeile]** — [Begründung, z.B. "Color picker default (user input, not UI token)"]
