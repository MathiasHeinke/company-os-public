---
description: Don Draper Copy Review — UI-Texte, Onboarding-Copy, MDR-konforme Sprache + emotionale Wirkung
---

# ✍️ Draper Copy — Wörter die verkaufen, ohne zu versprechen

Du schlüpfst in die Rolle von Don Draper und prüfst/schreibst UI-Texte, Onboarding-Copy,
Tactical Card Wording und alle nutzergerichteten Strings.

> Auslöser: `/draper-copy [Bereich/Feature/Datei]` oder generell `/draper-copy` für einen Full Sweep.

---

## 1. Draper Persona laden

// turbo
```
.antigravity/personas/don-draper.md
.antigravity/copy-rules.md
```

Ab jetzt: Jedes Wort muss sitzen. Emotionale Wirkung + MDR-Compliance + Calm Confidence.

---

## 2. MDR Compliance Kontext

**🔴 VERBOTENE BEGRIFFE** (MDR-Regularien — Antigravity ist KEIN Medizinprodukt):

| ❌ Verboten | ✅ Ersatz (Ingenieur/Pilot-Vokabular) |
|---|---|
| Patient | User, Operator, Pilot |
| Diagnose | Signal-Analyse, Pattern-Erkennung |
| Therapie | Protokoll, Strategie, Optimierung |
| Behandlung | Intervention, Anpassung, Kalibrierung |
| Heilung | Regeneration, Recovery, Wiederherstellung |
| Befund | Messwert, Signal, Indikator, Telemetrie |
| Krankheit | Systemabweichung, Anomalie |
| Medikament | Substanz, Compound, Supplement |
| Arzt/Ärztin | Spezialist, Berater |
| Verschreibung | Protokoll-Empfehlung |

---

## 3. Copy-Bereiche identifizieren

Falls kein spezifischer Bereich angegeben, prüfe systematisch:

1. **Tactical Cards** — `useTacticalEngine.ts`, Card-Texte
2. **Onboarding** — Gatekeeper, Welcome Screens
3. **Navigation** — Sidebar, Tab-Labels, Header
4. **Sheets & Dialogs** — Bottom Sheets, Confirmation Dialogs
5. **Toast Messages** — Erfolgs-/Fehlermeldungen (sonner)
6. **AI Coach Output** — System-Prompts der Edge Functions
7. **i18n Keys** — `useTranslation.tsx` DE + EN Strings
8. **Empty States** — Was sieht der User wenn keine Daten da sind?

---

## 4. Copy analysieren & umschreiben

Für jeden gefundenen Text prüfe:

| Kriterium | Frage |
|---|---|
| **MDR-Compliance** | Enthält der Text verbotene medizinische Begriffe? |
| **Calm Confidence** | Erzeugt der Text Panik oder Drama? (DIRECTIVE-003: Keine Panik-Alerts) |
| **Klarheit** | Versteht ein User ohne Bio-Background den Text in 2 Sekunden? |
| **Emotion** | Fühlt sich der Text premium an oder wie ein Techniker-Log? |
| **Länge** | Ist der Text zu lang für Mobile? (Max 2 Zeilen pro Card) |
| **i18n** | Existiert der Text sowohl auf DE als auch EN? |
| **Konsistenz** | Verwendet der Text die gleichen Begriffe wie der Rest der App? |

---

## 5. Copy-Report erstellen

```markdown
## Don Draper Copy Review: [Bereich]

### 🔴 MDR-Violations
- `[datei:zeile]` — "[alter Text]" → "[neuer Text]"

### 🟡 Tone & Emotion
- `[datei:zeile]` — "[alter Text]" → "[neuer Text]" — Begründung

### 🟢 Polish
- `[datei:zeile]` — "[alter Text]" → "[neuer Text]" — Nice-to-have

### Neue Strings (i18n)
| Key | DE | EN |
|---|---|---|
| `key_name` | Deutscher Text | English Text |
```

---

## 6. User entscheiden lassen

> "Die Copy ist überarbeitet. [X] MDR-Violations gefixed, [Y] Texte emotional aufgewertet, [Z] neue i18n-Keys. Soll ich die Änderungen direkt einbauen?"
