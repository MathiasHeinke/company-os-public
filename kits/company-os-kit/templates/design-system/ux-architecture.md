# UX Architecture — [PRODUKT]

> **Single Source of Truth** für alle User-Flow-, Onboarding- und UX-Entscheidungen.
> Für Design Tokens → Siehe `[APP_DIR]/DESIGN.md`
> **Version:** 1.0.0 (Template)

---

## 1. User-System-Contract

### 1.1 Das Paradigma

```yaml
paradigm: "[Board Member / Patient / Content Creator / ...]"
user_is: "[Beschreibung]"
user_is_not: "[Was der User NICHT tut — schützt vor Dev-UI-Drift]"

system_contract:
  promise: "[Was das System dem User verspricht — z.B. 'Du steuerst, das System arbeitet']"
  boundary: "[Wo die Grenze ist — z.B. 'Du konfigurierst nicht, du entscheidest']"
```

### 1.2 Nutzer-Personas & Interface-Modi

| Persona | Interface Mode | Sieht | Sieht NICHT |
|---|---|---|---|
| Einsteiger | `beginner` | KPIs, Guided Actions, Pre-populated Data | Advanced Filters, Raw Data, Config |
| Standard | `standard` | Alles Level 0+1, erweiterte Views | Debug Logs, System Config |
| Power User | `expert` | ALLES | — |

```typescript
// Standard-Pattern für Progressive Disclosure
const { interfaceMode } = useUserPreferences();
// → 'beginner' | 'standard' | 'expert'

{interfaceMode === 'expert' && (
  <AdvancedComponent />
)}
```

---

## 2. Informations-Architektur: Sidebar

### 2.1 Navigations-Kategorien

> [!IMPORTANT]
> Kategorien IMMER in Großbuchstaben als Sektions-Header. Icons sind Pflicht.

```yaml
sidebar:
  MAIN:
    - { icon: "🏠", label: "[Landing]", route: "/", always: true }
    - { icon: "💬", label: "[Chat/Primary Action]", route: "/[primary]", badge: "unread" }
    
  OPERATE:
    label: "OPERATE"
    description: "Tägliche Kernarbeit"
    items:
      - { icon: "📋", label: "[Entity 1]", route: "/[entity-1]", badge: "count" }
      - { icon: "🤖", label: "[Entity 2]", route: "/[entity-2]" }
      
  MONITOR:
    label: "MONITOR"
    description: "Überwachung & Insights"
    items:
      - { icon: "📈", label: "Activity", route: "/activity" }
      - { icon: "💰", label: "Costs", route: "/costs", badge: "budget_warning" }
      - { icon: "📥", label: "Inbox", route: "/inbox", badge: "unread_count" }
      
  CONFIGURE:
    label: "CONFIGURE"
    description: "Einstellungen & System"
    collapsed_default: true
    expert_unlock: true
    items:
      - { icon: "⚙️", label: "Settings", route: "/settings" }
```

### 2.2 Adaptive Behaviour

```yaml
adaptive_sidebar:
  beginner_mode:
    visible: ["MAIN items only", "+ 2-3 OPERATE items"]
    hidden: ["MONITOR", "CONFIGURE"]
    show_more_button: true
    
  standard_mode:
    visible: ["MAIN", "OPERATE", "MONITOR"]
    hidden: ["CONFIGURE (collapsed)"]
    
  expert_mode:
    visible: ["ALL"]
    
  progressive_unlock:
    trigger: "Nach [N] Aktionen (z.B. 20)"
    prompt: "Du nutzt [PRODUKT] wie ein Profi! Mehr Features freischalten?"
    action: "interface_mode → 'standard'"
```

---

## 3. Onboarding Wizard

### 3.1 Wizard-Architektur

```yaml
wizard:
  total_screens: 3-5
  skip_always_possible: true
  progress_bar: true
  persistence: "user.onboarding_completed in DB"
  
  pre_wizard_gate:
    condition: "!user.onboarding_completed && first_login"
    action: "Redirect to /onboarding"
```

### 3.2 Screen-Definitionen

> [!NOTE]
> Befülle diese Screens projekt-spezifisch. Jeder Screen hat EINE klare Aufgabe.

```yaml
screen_1:
  title: "Willkommen bei [PRODUKT]"
  purpose: "Identität & Grundkontext erfassen"
  fields:
    - name: { type: "text", required: true, placeholder: "[Beispiel]" }
    - description: { type: "textarea", max_chars: 140 }
  visual: "Hero-Image oder animiertes Logo, Glassmorphism Panel"
  cta: "Weiter →"

screen_2:
  title: "[Kontext-Frage]"
  purpose: "Erfahrungslevel für Interface Mode"
  fields:
    - experience:
        type: "card_selection"  # Nicht Radio — visuell ansprechende Cards
        options:
          - { icon: "🌱", label: "Einsteiger", desc: "[Kontext]", value: "beginner" }
          - { icon: "⚡", label: "Erfahren", desc: "[Kontext]", value: "standard" }
          - { icon: "🔧", label: "Experte", desc: "[Kontext]", value: "expert" }
  effect: "Sets user.interface_mode"

screen_3:
  title: "[Kern-Entity Setup]"
  purpose: "Ersten wichtigen Datensatz erstellen"
  fields:
    # Projekt-spezifisch
  visual: "Preview der Dashboard-Ansicht mit den eingegebenen Daten"

screen_4:  # Optional
  title: "[Integration/Connection]"
  purpose: "Externe Verbindung herstellen"
  fields:
    - api_key: { type: "password", required: false }
  skip_label: "Später einrichten"

screen_5:  # Optional
  title: "Geschafft!"
  purpose: "Zusammenfassung & erster Schritt"
  visual: "Konfetti oder Celebration Animation (subtle, 200ms)"
  cta: "Zum Dashboard →"
```

### 3.3 Cold-Start-Resolution

```yaml
cold_start:
  problem: "Leeres Dashboard nach Onboarding → Absprung"
  solutions:
    1_templates: "Pre-populated Templates basierend auf Use-Case (aus Screen 1)"
    2_demo_data: "3-5 Demo-Einträge im System (nie leer starten)"
    3_welcome_message: "Erste Nachricht: Zusammenfassung + nächste Schritte"
    4_guided_tour: "5 Tooltip-Overlays auf wichtigste UI-Elemente"
    5_task_list: "Vorgefertigte Aufgabenliste: 'Erstelle dein erstes [Entity]'"
```

---

## 4. Page-Level UX Patterns

### 4.1 Dashboard / Landing Page

```yaml
dashboard:
  layout: "2-column with responsive collapse"
  elements:
    kpi_grid:
      position: "top, horizontal"
      max_items: 4-6
      style: "Glass cards, accent gradient on primary metric"
      
    primary_interaction:
      position: "left column, main"
      type: "[Chat / Feed / Timeline]"
      
    secondary_panels:
      position: "right column"
      items: ["Activity Feed", "System Health", "Quick Actions"]
      
    empty_state:
      forbidden: true
      fallback: "Show demo data + setup prompt"
```

### 4.2 List Pages

```yaml
list_page:
  header: "Page Title + Action Button (right-aligned)"
  filters: "Horizontal filter bar, Glass bg, max 5 quick filters"
  view_toggle: "[List / Kanban / Grid] — persisted in user_preferences"
  
  list_item:
    padding: "var(--space-4)"
    hover: "bg-shift to --bg-card-hover"
    click: "Navigate to Detail or expand inline"
    
  batch_actions:
    visibility: "Standard + Expert mode"
    trigger: "Select → Action Bar slides in from bottom"
```

### 4.3 Detail Pages (Three-Pane)

```yaml
detail_page:
  layout: "ThreePaneLayout component"
  breadcrumb: "PFLICHT — BreadcrumbBar oben"
  
  left_pane:
    width: "240px"
    content: "Back Button + Context Navigation"
    
  center_pane:
    content: "Main form / content area"
    sections: "Tabs or scrollable sections"
    
  right_pane:
    width: "320px"
    content: "PropertiesPanel — Metadata, Status, linked entities"
    collapsible: true
    collapse_breakpoint: "< 1200px"
```

---

## 5. Micro-Interaction Playbook

| Trigger | Animation | Duration | Easing |
|---|---|---|---|
| Page transition | Fade + slide-up (8px) | 200ms | ease-out |
| Card Hover | bg-shift + subtle border glow | 150ms | ease |
| Modal open | Fade-in + scale(0.95→1) | 300ms | spring |
| Toast notification | Slide-in from top-right | 200ms | ease-out |
| Success action | Emerald pulse/glow | 600ms | ease |
| Error action | Red shake (2px, 3 cycles) | 300ms | ease |
| Loading state | Skeleton shimmer | continuous | linear |
| Status change | Color transition | 300ms | ease |

---

## 6. Responsive Behaviour

```yaml
responsive:
  strategy: "Desktop-First"  # B2B SaaS default
  
  breakpoints:
    desktop: ">= 1280px"    # Full experience
    laptop: ">= 1024px"     # Right pane collapses
    tablet: ">= 768px"      # Sidebar becomes overlay
    mobile: "< 768px"        # Single column, bottom nav
    
  sidebar:
    desktop: "Fixed, always visible (240px)"
    laptop: "Collapsible (icon-only mode)"
    tablet: "Hamburger → Overlay"
    mobile: "Bottom tab bar"
    
  three_pane:
    desktop: "All 3 panes visible"
    laptop: "Right pane → drawer/tab"
    tablet: "Center only, swipe for panes"
```

---

## 7. Compliance & Governance UI

### 7.1 Pflicht-Indikatoren

| Indikator | Position | Sichtbarkeit |
|---|---|---|
| "[Processing in EU]" Badge | Footer oder Header | Immer |
| PII-Scrubbing Status | Settings + Detail Views | Expert Mode |
| Data Provenance Link | Generierte Daten | Klick → Expandable |
| Consent Banner | Erster Login | Einmalig |

### 7.2 Audit Trail

```yaml
audit_trail:
  accessible_via: "Klick auf generierte Daten → 'Woher?' Link"
  shows:
    - Quelle (System, API, User)
    - Timestamp
    - Model/Provider (bei AI-generierten Daten)
    - Kosten (Expert Mode)
  format: "Expandable Detail-Panel (nicht neues Fenster)"
```

---

## 8. Ist-vs-Soll Assessment

> [!TIP]
> Befülle diese Tabelle bei jedem Sprint-Review. Sie dient als Roadmap-Steuerung.

| Page | Ist-Zustand | Soll-Zustand | Gap |
|---|---|---|---|
| Dashboard | | | 🔴/🟡/🟢/✅ |
| [Entity List] | | | |
| [Entity Detail] | | | |
| Settings | | | |
| Onboarding | ❌ Nicht existent | [N]-Screen Wizard | 🔴 Critical |

---

## 9. Implementation Checkliste

```yaml
when_building_new_pages:
  1_check_wiki: "docs/wiki/ux-architecture.md — Ist-vs-Soll Tabelle"
  2_respect_disclosure: "Level 0/1/2 — welcher Detail-Level für welche Persona?"
  3_button_hierarchy: "PRIMARY solid → SECONDARY glass → GHOST text-only"
  4_micro_interactions: "200-800ms, cubic-bezier(0.4,0,0.2,1), prefers-reduced-motion"
  5_mobile_first: false  # Desktop-First — B2B SaaS
  6_dark_mode_primary: true
  7_glassmorphism: "Glass bg + blur + glass-border für Cards"
  8_three_pane: "Wiederverwendbar: ThreePaneLayout, BreadcrumbBar, PropertiesPanel"

when_modifying_existing_pages:
  1_no_regression: "Bestehende Funktionalität NICHT brechen"
  2_progressive: "Neues Feature = neue Detailebene, nicht Front-and-Center"
  3_power_user_safe: "NIEMALS Power-User-Features entfernen — nur verstecken für Einsteiger"
```

---

> **Änderungshistorie:**
> - v1.0.0 ([DATUM]): Template-Version aus Autarch UX Architecture extrahiert
