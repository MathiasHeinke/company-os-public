---
description: Quick Audit — Sherlock→Ramsay Chain (Shortcut für /sherlock-audit)
---

# /audit — Quick Hardening Chain

## Trigger
- `/audit [Scope]` im Prompt
- Keywords: "Prüfe", "Audit", "Review", "Räum auf", "Pre-Release"

## Schritte

1. **Sherlock Holmes aktivieren:** Lies `.antigravity/personas/sherlock-holmes.md`.
   - Vollständiger Code-Audit über den definierten Scope.
   - Findings nach Severity: 🔴 Critical, 🟡 Warning, 🟢 Info.
   - Output: Strukturierter Audit-Report.

2. **The Refactorer bereinigen:** Lies `.antigravity/personas/the-refactorer.md`.
   - Refactoring-Plan mit konkreten Fixes für die gefundenen Issues.
   - Dead Code, Duplikate, Style-Violations behandeln.

3. **Report speichern:** Erstelle `docs/audits/Audit-[Fall-ID].md`.

4. **DoD-Gate:** Verifiziere Build & Tests.

> **Unterschied zu `/sherlock-audit`:** `/audit` ist die schnelle 2-Persona-Chain. `/sherlock-audit` ist der volle 8-Schritt-Workflow mit Carmack Quality Gate.
