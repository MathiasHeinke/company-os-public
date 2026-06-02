---
description: Test-Driven Development — Red→Green→Refactor als eisernes Gesetz
---

# 🧪 TDD — Red → Green → Refactor

Strikte Test-Driven Development Pipeline. Kein Code ohne Test. Kein Commit ohne Grün.

> Auslöser: `/tdd [Funktion/Feature]`

---

## 1. Kontext laden

// turbo
```
Lies: .antigravity/personas/john-carmack.md
Lies: .antigravity/logs/architect-memory.md
```

Carmack ist Lead für die gesamte TDD-Pipeline.

---

## 2. Test-Scope definieren

Bestimme BEVOR Code geschrieben wird:
- Welche Funktion/Methode wird getestet?
- Was sind die erwarteten Inputs und Outputs?
- Was sind die Edge Cases?

> **Regel:** Ein TDD-Zyklus = eine Funktion/Methode. Nicht mehr.

---

## 3. TDD-Zyklus (pro Funktion)

### 🔴 RED — Failing Test schreiben

```
1. Schreibe einen Test der die gewünschte Funktion beschreibt
2. Verifiziere: Test MUSS fehlschlagen
   → Falls Test sofort grün ist: Test ist trivial, verschärfen!
3. Commit: "test: [Funktionsname] — failing test"
```

### 🟢 GREEN — Minimalen Code schreiben

```
1. Schreibe den MINIMALEN Code, damit der Test besteht
   → Kein Over-Engineering, kein „ich mach noch schnell..."
2. Verifiziere: Test MUSS jetzt bestehen
   → Falls nicht: Code fixen, NICHT den Test ändern!
3. Commit: "feat: [Funktionsname] — passing"
```

### 🔄 REFACTOR — The Refactorer Cleanup

```
1. Lade The Refactorer Mindset: .antigravity/personas/the-refactorer.md
2. Refactore den Code: DRY, Clean Naming, Edge Cases härten
3. Verifiziere: Test MUSS immer noch bestehen
   → Falls Test bricht: Refactoring war zu aggressiv, Rollback!
4. Commit: "refactor: [Funktionsname] — cleanup"
```

### ✅ COMMIT — Zyklus abschließen

```
git add -A && git commit -m "tdd: [Funktionsname] complete (red→green→refactor)"
```

---

## 4. Nächster Zyklus oder Gate

Wiederhole Step 3 für die nächste Funktion/Methode.
Wenn alle Funktionen abgedeckt sind → weiter zu Step 5.

---

## 5. 🔍 Sherlock Quality Gate

// turbo
```
Lies: .antigravity/personas/sherlock-holmes.md
```

Sherlock prüft:

| Prüfpunkt | Bestanden? |
|---|---|
| Alle Tests grün? | ☐ |
| Edge Cases abgedeckt? | ☐ |
| Keine `any`-Casts in neuem Code? | ☐ |
| Error Handling vorhanden? | ☐ |
| Kein toter Code eingeführt? | ☐ |

Bei Fails → zurück zu Step 3, neuer Red-Zyklus für das fehlende Szenario.

---

## Eiserne TDD-Regeln

> [!CAUTION]
> Diese Regeln sind NICHT verhandelbar.

1. **Kein Code ohne Test** → Wurde Code ohne Test geschrieben? Sofort löschen.
2. **Test zuerst ändern, nie den Code um den Test herumbauen** → Der Test definiert das Verhalten.
3. **Ein Zyklus = eine Funktion/Methode** → Keine Monster-Zyklen.
4. **Grün heißt Commit** — nicht „ich mach noch schnell..." → Scope Creep ist der Feind.
5. **Refactoring darf Tests nie brechen** → Sonst war es kein Refactoring, sondern ein Feature.
