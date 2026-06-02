---
description: Security Sweep — RLS, PII-Scrubbing, API Keys, DSGVO-Check (DIRECTIVE-002)
---

# 🔒 Security Sweep — Mr. Robot × Cypher

Systematischer Sicherheits-Audit gemäß DIRECTIVE-002.
Du schlüpfst in die Rolle von Mr. Robot (Angriffsperspektive) und Cypher (Infrastruktur-Verteidigung).

> Auslöser: `/security-sweep` oder `/security-sweep [Feature/Bereich]`

---

## 1. Personas laden

// turbo
```
.antigravity/personas/mr-robot.md
.antigravity/personas/cypher-sre.md
```

Ab jetzt: Paranoia-Modus. Jede offene Tür ist ein Angriffvektor.

---

## 2. Systemkontext laden

// turbo
```
.antigravity/logs/architect-memory.md
.antigravity/tech-stack-context.md
```

---

## 3. RLS Policy Audit

// turbo
Prüfe alle Supabase-Tabellen auf Row Level Security:

```bash
grep -r "ENABLE ROW LEVEL SECURITY" supabase/migrations/ | wc -l
grep -r "CREATE POLICY" supabase/migrations/ | head -30
```

Prüfe für jede Tabelle die User-Daten enthält:
- ✅ RLS enabled?
- ✅ SELECT Policy: `auth.uid() = user_id`?
- ✅ INSERT Policy: `auth.uid() = user_id`?
- ✅ UPDATE Policy: `auth.uid() = user_id`?
- ✅ DELETE Policy: Existiert und ist restriktiv?
- ❌ Keine `anon` Rolle mit Schreibzugriff?

---

## 4. PII-Scrubbing Audit (DIRECTIVE-002)

Prüfe ALLE Edge Functions und AI-Provider-Calls:

```bash
grep -rn "chatCompletion\|generateContent\|openai\|anthropic\|vertex" supabase/functions/ --include="*.ts"
```

Für jeden AI-Provider-Call verifiziere:
- ✅ Werden User-IDs, Namen, E-Mails vor dem Call entfernt/anonymisiert?
- ✅ Werden Rückgabewerte ohne PII an den Client gesendet?
- ❌ Wird `user_id` direkt im Prompt an den LLM geschickt?

---

## 5. API Keys & Secrets Audit

// turbo
```bash
grep -rn "SUPABASE_SERVICE_ROLE\|VERTEX_ACCESS_TOKEN\|OPENAI_API_KEY\|sk-\|sb-\|eyJ" src/ --include="*.ts" --include="*.tsx"
grep -rn "apikey\|api_key\|secret\|password\|token" src/ --include="*.ts" --include="*.tsx" -i
```

Prüfe:
- ❌ Hardcoded API Keys im Frontend-Code?
- ❌ Service Role Keys im Client-Bundle?
- ✅ Secrets nur in Edge Functions / Vault / Environment Variables?

---

## 6. DSGVO-Compliance Check

Prüfe für kürzlich geänderte Features:

| Prüfpunkt | Status |
|---|---|
| Werden neue personenbezogene Daten gespeichert? | |
| Gibt es einen Löschmechanismus (Right to Erasure)? | |
| Werden Daten an Dritte übermittelt? (AI Provider) | |
| Ist die Datenminimierung eingehalten? | |
| Gibt es Audit-Logs für sensitive Operationen? | |
| Werden Daten verschlüsselt gespeichert? (at rest) | |
| Werden Daten verschlüsselt übertragen? (in transit) | |

---

## 7. Supabase Advisor Check

Nutze den Supabase Security Advisor:

Hole Security-Advisories für das Projekt und prüfe auf offene Warnungen.

---

## 8. Security Report

```markdown
## 🔒 Security Sweep: [Datum]

### 🔴 Critical (Sofort fixen)
- [Finding + Datei + Zeile]

### 🟡 Warning (Zeitnah fixen)
- [Finding + Datei + Zeile]

### 🟢 Info (Verbesserung)
- [Finding + Datei + Zeile]

### ✅ Bestanden
- RLS: [X/Y] Tabellen korrekt
- PII: [X/Y] AI-Calls sauber
- Keys: Keine Leaks gefunden
- DSGVO: [Status]
```

---

## 9. User informieren

> "🔒 Security Sweep abgeschlossen. [X] Critical, [Y] Warnings, [Z] Info. [Empfohlene Sofort-Maßnahmen]."
