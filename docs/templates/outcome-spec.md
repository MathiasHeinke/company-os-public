# OutcomeSpec Template

Use for: any scheduled, long-running, multiagent, controller-reviewed or L3
sandbox worker issue.

## Purpose

`OutcomeSpec` defines what done means and how the work will be graded. It turns
acceptance criteria into a controller-verifiable outcome.

## Template

```markdown
OutcomeSpec:
- [one concrete result]

OutcomeRubric:
- Outcome Quality:
- Scope Discipline:
- Source Discipline:
- Evidence Quality:
- Gate Discipline:
- Handoff Quality:

OutcomeMaxIterations:

OutcomeGrader: controller | separate-agent | human | managed-agent-grader

OutcomePassThreshold:
- ReviewVerdict:
- Minimum operational score:
- Required CEO intent gate:

OutcomeArtifacts:
- [absolute report path, branch, diff, file, deck, table, dashboard, etc.]

OutcomeFailureMode: NEEDS_REWORK | BLOCKED | NEEDS_HUMAN | REJECT
```

## Rules

- `OutcomeGrader` cannot be the same worker that produced the artifact.
- `OutcomePassThreshold` cannot bypass HumanGate.
- `OutcomeArtifacts` must be findable without reading chat history.
- Use `docs/harnesses/canonical-agent-review-harness.md` for
  `ReviewVerdict`, operational score and CEO intent fit semantics.
