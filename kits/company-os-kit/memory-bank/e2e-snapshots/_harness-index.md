# 📊 Harness Index — [Projektname]

> **Zweck:** Registry aller E2E Harness Snapshots für dieses Projekt.
> Wird automatisch von `/fortress-audit` und `/deep-e2e` aktualisiert.

---

## Snapshots

| Datum | Scope | Trigger | Passed | Bugfixed | Failed | Engine | Security | Datei |
|-------|-------|---------|--------|----------|--------|--------|----------|-------|
| — | — | — | — | — | — | — | — | — |

## Trend

```
Reliability Score = (Passed + Bugfixed) / Total × 100

Letzte 5 Snapshots:
  [Noch keine Daten]
```

## Regeln

1. **Jeder Fortress-Durchlauf** erzeugt mindestens 2 Snapshots (Baseline + Post-Fortress)
2. **Jeder Deep E2E Durchlauf** erzeugt 1 Snapshot
3. **Snapshot-Naming:** `[YYYY-MM-DD]_[type]_[scope].md`
   - Types: `baseline`, `fortress`, `targeted`, `engine-eval`
4. **Retention:** Snapshots > 30 Tage alt können komprimiert werden (Summary-Zeile behalten, Detail löschen)
