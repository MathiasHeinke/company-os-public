---
description: Antigravity Init — Bootstrapped das .antigravity System für ein neues Projekt
---

# 🧬 Antigravity Init — Erstes Setup

> **Trigger:** `.antigravity/` wurde gerade in ein neues Projekt kopiert.
> Dieses Workflow füllt die projekt-spezifischen Dateien automatisch aus.

---

## 1. Projekt analysieren

Analysiere das Projekt-Root:

```
- package.json / requirements.txt / Cargo.toml → Tech Stack erkennen
- src/ oder app/ → Framework erkennen (React, Next, Vue, etc.)
- supabase/ → Supabase Setup erkennen
- ios/ android/ → Mobile Setup erkennen
- tsconfig.json → TypeScript Config
- .env / .env.example → Provider & Keys identifizieren
```

---

## 2. `tech-stack-context.md` befüllen

// turbo
Lies die Projekt-Dateien und befülle `.antigravity/tech-stack-context.md` mit:

- **Frontend:** Framework, Styling, State Management, Routing
- **Backend:** API-Framework, Database, Edge Functions
- **AI/ML:** Welche Provider (Vertex, OpenAI, Anthropic etc.)
- **Mobile:** Capacitor, React Native, Expo, Swift etc.
- **Deployment:** Hosting, CI/CD, Domain
- **Datenfluss:** Wie fließen Daten vom UI zum Backend zur DB?

---

## 3. `system-prompt.md` befüllen

Befülle `.antigravity/system-prompt.md` mit:

- **Projektname & Beschreibung** — Was baut dieses Projekt?
- **Kern-Regeln** — Welche Dateien MUSS der Agent bei jedem Start lesen?
- **Pflichtlektüre** — Liste der wichtigsten Dateien referenzieren
- **Code-Sprache** — Deutsch/Englisch Mischung? Kommentare?
- **Spezielle Constraints** — Regulatorik, DSGVO, Branche?

---

## 4. `copy-rules.md` befüllen

Befülle `.antigravity/copy-rules.md` mit:

- **Tone of Voice** — Wie soll die App klingen?
- **Verbotene Begriffe** — Gibt es regulatorische No-Gos?
- **Wording-Tabelle** — Falsche Begriffe → Richtige Begriffe

Falls kein spezielles Wording nötig: Belasse bei generischem Professional Tone.

---

## 5. Knowledge Files anpassen

Prüfe die 7 Knowledge Files in `.antigravity/knowledge/` und passe sie an:

- `backend-mastery.md` → Auf den Backend-Stack anpassen
- `frontend-mastery.md` → Auf den Frontend-Stack anpassen
- `security-playbook.md` → Auf die Security-Anforderungen anpassen
- `ai-architecture.md` → Auf die AI-Provider anpassen

Die anderen 3 Files (audit, performance, copy-branding) sind generisch und können meist so bleiben.

---

## 6. Architect-Memory initialisieren

Schreibe den ersten Eintrag in `.antigravity/logs/architect-memory.md`:

**Layer 2 (Active Directives):**
- Projekt-Phase (MVP / Beta / Production)
- Aktuelle Prioritäten

**Layer 3 (Session Log):**
- "Init-Session: Antigravity Kit installiert. System bootstrapped."

---

## 7. Verification

Prüfe dass alle Platzhalter ersetzt sind:

```bash
grep -r "\[PROJEKT\]" .antigravity/ | head -20
grep -r "\[projekt-repo\]" .antigravity/ | head -20
grep -r "\[PROJECT_REF\]" .antigravity/ | head -20
```

Falls Treffer: Ersetze die verbleibenden Platzhalter.

---

## Fertig!

Das System ist jetzt bereit. Nächster Schritt:
- `@nous` für Orientierung
- `/nous-lifecycle` für das erste Feature
