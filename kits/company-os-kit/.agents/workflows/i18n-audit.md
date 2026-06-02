---
description: i18n Audit — Hardcoded Strings finden, t()-Keys erzwingen, DE/EN Coverage sicherstellen
---

# 🌐 i18n Audit — Internationalisierung prüfen & fixen

Sherlock-Phase: Hardcoded Strings aufspüren. Ramsay-Phase: Sauber extrahieren.

> Auslöser: `/i18n [Sektion oder Datei-Pfad]` — z.B. `/i18n /coach`, `/i18n LoadDetailSheet`, `/i18n src/components/activity`

---

## 1. Sherlock Persona laden

// turbo
Lies die Persona-Datei:
```
.antigravity/personas/sherlock-holmes.md
```

Ab jetzt: Sherlock-Modus. Jeder hardcoded String ist ein Tatort.

---

## 2. Scope bestimmen

Identifiziere alle `.tsx`-Dateien in der angegebenen Sektion:

```bash
find [sektion-pfad] -name "*.tsx" -type f | head -50
```

Falls der User einen Komponentennamen statt Pfad angegeben hat, suche die Datei:

```bash
fd "[Komponentenname]" src/ -e tsx
```

---

## 3. Hardcoded String Scan

Suche nach hardcoded deutschen **und** englischen Strings in den gefundenen Dateien.

### 3a. Hardcoded Text in JSX (kein `t()` Wrapper)

```bash
# Deutsche Strings in JSX — Text zwischen > und < Tags
grep -rn ">[A-ZÄÖÜ][a-zäöüß]\{2,\}" [sektion-pfad] --include="*.tsx" | grep -v "t(" | grep -v "className" | head -40

# Häufige deutsche Wörter ohne t() Wrapper
grep -rn '"Fehler\|"Speichern\|"Laden\|"Löschen\|"Bearbeiten\|"Abbrechen\|"Zurück\|"Weiter\|"Schließen' [sektion-pfad] --include="*.tsx" | grep -v "t(" | head -30

# Häufige englische Wörter ohne t() direkt in JSX
grep -rn '"Loading\|"Save\|"Cancel\|"Delete\|"Error\|"Success\|"Close\|"Back\|"Submit' [sektion-pfad] --include="*.tsx" | grep -v "t(" | head -30
```

### 3b. Placeholder & Label Strings

```bash
# Placeholder, title, aria-label ohne t()
grep -rn 'placeholder="\|title="\|aria-label="' [sektion-pfad] --include="*.tsx" | grep -v "t(" | head -20
```

### 3c. Toast/Notification Strings

```bash
# toast() Aufrufe mit hardcoded Strings
grep -rn 'toast\.\|sonner\.' [sektion-pfad] --include="*.tsx" | grep -v "t(" | head -20
```

---

## 4. Coverage Check: DE ↔ EN Symmetrie

Prüfe ob alle Keys in beiden Sprachen vorhanden sind:

```bash
# Zähle Keys pro Sprache
grep -c "'" src/hooks/useTranslation.tsx | head -5

# Finde Keys die nur in DE existieren (suche Keys aus dem de-Block die nicht im en-Block sind)
```

Lies `src/hooks/useTranslation.tsx` und vergleiche die `de` und `en` Blöcke:
- Zähle Keys in `de` vs `en`
- Liste fehlende Keys auf (DE vorhanden, EN fehlt — oder umgekehrt)

---

## 5. Audit-Report erstellen

Erstelle einen Report als Artefakt:

```markdown
# 🌐 i18n Audit: [Sektion]

## Zusammenfassung
- Dateien gescannt: X
- Hardcoded Strings gefunden: X
- Fehlende t()-Keys: X
- DE/EN Asymmetrien: X

## Hardcoded Strings (Priorität 🔴)
| Datei | Zeile | String | Vorgeschlagener Key |
|---|---|---|---|
| ... | ... | ... | ... |

## Fehlende Keys (Priorität 🟡)
| Key | Vorhanden in | Fehlt in |
|---|---|---|
| ... | DE | EN |

## Bereits korrekt (✅)
X von Y Strings verwenden t()
```

---

## 6. Persona wechseln → The Refactorer Fix-Phase

// turbo
Lies die Persona-Datei:
```
.antigravity/personas/the-refactorer.md
```

Ramsay-Modus: Strings extrahieren, Keys anlegen, Code sauber machen.

---

## 7. Fixes implementieren

Für jeden gefundenen hardcoded String:

1. **Key generieren** — Namespace-Konvention: `[sektion].[element].[beschreibung]`
   - Beispiel: `activity.loadDetail.noData`, `coach.chat.placeholder`
2. **String in `t()` wrappen** — In der TSX-Datei den String durch `t('key')` ersetzen
3. **Key in DE + EN eintragen** — In `src/hooks/useTranslation.tsx` beide Sprachen gleichzeitig befüllen
4. **Parametrisierte Strings** — Dynamische Werte als `t('key', { param: value })` mit `{param}` Platzhalter

**Ramsay-Regel:** „Kein String verlässt die Küche ohne t()-Wrapper!"

---

## 8. Build & Verify

// turbo
```bash
npm run build
```

Prüfe:
- ✅ Build erfolgreich → Weiter
- ❌ Build-Fehler → Fix den Fehler, wiederhole

---

## 9. Ergebnis melden

> **🌐 i18n AUDIT COMPLETE:**
> - Sektion: `[path]`
> - Dateien gescannt: X
> - Strings extrahiert: X
> - Neue Keys angelegt: X (DE + EN)
> - Coverage: DE X Keys / EN X Keys
> - Build: ✅
