---
description: Schreibt einen strukturierten Session-Log-Eintrag in die architect-memory.md und aktualisiert Wiki/Techstack
---

# 📝 Session Log — Karpathy Memory Update

Dieser Workflow dokumentiert die aktuelle Arbeitssession in `architect-memory.md` (Layer 3: Session-Log)
und aktualisiert bei Bedarf die System-Referenzdokumente (Wiki, Techstack).

---

## 1. Kontext laden

// turbo
Lies die folgenden Dateien um den aktuellen Systemstand zu kennen:
```
.antigravity/logs/architect-memory.md
.antigravity/techstack.md
WIKI.md
```

Identifiziere:
- Den letzten Session-Log-Eintrag (Datum + Titel)
- Die aktuelle Phase / Active Directives
- Die nächste freie SW2.0 Moment-Nummer
- Ob Techstack oder Wiki veraltet sind bezüglich der heutigen Änderungen

---

## 2. Änderungen sammeln

// turbo
Sammle alle Änderungen der aktuellen Session:

```bash
git log --oneline -15
git diff --stat HEAD~5 HEAD
git diff --stat HEAD
```

Identifiziere:
- Welche Dateien wurden geändert/erstellt/gelöscht?
- Welche Features/Fixes wurden implementiert?
- Gibt es ein markantes "Software 2.0 Moment"?
- Wurden Edge Functions deployed?
- Gab es Builds & Deploys?
- Neue Dependencies, Libraries oder Tools eingeführt?
- Neue Engines, Algorithmen oder Berechnungslogik?
- Neue DB-Tabellen, Spalten oder Migrationen?

---

## 3. Session-Eintrag verfassen

Schreibe den Eintrag im etablierten Format der `architect-memory.md`:

```markdown
### DD.MM.YYYY (Tageszeit) — [Titel] (Persona × Partner)

**Software 2.0 Moment #N: [Einzeiler-Zitat]** (falls zutreffend)

> *"[Karpathy-Zitat zur Architekturentscheidung]"* (falls zutreffend)

- **[Feature/Fix 1]:** Beschreibung mit Dateien
- **[Feature/Fix 2]:** Beschreibung mit Dateien
- ...

**Dateien:** `file1.ts`, `file2.tsx`, ...
**Builds & Deploys:** Build ✅ (Xs), iOS Sync ✅, Edge Function XY deployed
**Reversibility Rating: N** (Begründung)
```

**Pflicht-Felder:**
- Datum + Tageszeit
- Titel (prägnant, beschreibend)
- Beteiligte Personas
- Geänderte Dateien mit Kontext
- Reversibility Rating (1-5)

**Optional:**
- SW2.0 Moment (nur bei echten Architektur-Durchbrüchen)
- Karpathy-Zitat
- Sherlock Audit Findings

---

## 4. In architect-memory.md einfügen

Füge den neuen Eintrag **am Anfang** von Layer 3 (Session-Log) ein, direkt nach der Zeile `*Chronologisches Protokoll...*`.

---

## 5. Active Directives & System-Topografie aktualisieren

Falls diese Session eine Phase abgeschlossen, eine neue Directive eingeführt, oder den Systemzustand signifikant verändert hat:
- Update Layer 2 → Aktuelle Phase, Nächste Priorität
- Neue Directives als `DIRECTIVE-XXX` eintragen
- System-Topografie-Tabelle ergänzen (neue Engine, neuer Hook, neue Edge Function)

---

## 6. Wiki aktualisieren (`WIKI.md`)

Prüfe ob eine der folgenden Änderungen stattfand:
- ✅ Neuer Algorithmus oder Berechnungsformel (z.B. neues Ranking-Modell, Payment-Logik)
- ✅ Engine-Parameter geändert (Thresholds, Decay, Caps)
- ✅ Neue Datenquelle angebunden (z.B. Stripe Webhooks, externe API)
- ✅ Validierungsergebnisse (Regression, A/B-Test, Backfill)

**Falls ja:** Ergänze den relevanten Abschnitt im Wiki. Bumpe die Version (z.B. v1.9 → v2.0).
**Falls nein:** Überspringe diesen Schritt.

---

## 7. Tech-Stack aktualisieren (`.antigravity/techstack.md`)

Prüfe ob eine der folgenden Änderungen stattfand:
- ✅ Neue Library/Dependency hinzugefügt (npm, Deno, Capacitor Plugin)
- ✅ Neues Tool/Framework eingeführt
- ✅ Bestehende Dependency-Version geändert (Major Upgrade)
- ✅ Neues externes API (Vertex AI Model-Switch, neue Supabase-Funktion)
- ✅ Neue Architektur-Patterns (z.B. Workflow-System)

**Falls ja:** Aktualisiere `.antigravity/techstack.md` mit der Änderung.
**Falls nein:** Überspringe diesen Schritt.

---

## 8. User informieren

> "Session-Log geschrieben: **[Titel]**. [N] Änderungen dokumentiert. Reversibility: [Rating]."
> Zusätzlich aktualisiert: [Wiki / Techstack / keine weiteren Docs].
