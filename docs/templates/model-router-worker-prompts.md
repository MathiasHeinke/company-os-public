# Model Router Worker Prompt Templates

Status: v0 templates for redacted worker delegation

Use these templates only after the controller has removed secrets, private
memory, customer data, health data, raw emails, and personal finance context.

## Issue Triage

```markdown
# Redacted Issue Triage

Issue:
- ID:
- Title:
- Project:
- Status:
- Priority:

Public/source-safe context:
- 

Return:
- Verdict: do now / defer / reshape / block
- Next action
- Missing source-of-truth
- Risks
- Escalate-to-GPT-5.5 items
```

Recommended worker: Grok 4.3.

## Implementation Plan

```markdown
# Redacted Implementation Plan

Goal:

Allowed files/modules:

Source-of-truth excerpts:
- 

Constraints:
- Read-only planning only.
- Do not update Linear.
- Do not infer private context.

Return:
- Proposed file changes
- Step order
- Gates/tests
- Human gates
- Open questions
```

Recommended worker: Grok 4.3.

## Diff Review

```markdown
# Redacted Diff Review

Scope:

Diff excerpt:
```diff

```

Expected behavior:

Return:
- Findings ordered by severity
- Missing tests
- Risky assumptions
- What GPT-5.5 must decide
```

Recommended workers: Grok 4.3 + DeepSeek V4 Pro.

## Test Generation

```markdown
# Redacted Test Generation

Feature or function:

Existing tests:

Known risk:

Return:
- Minimal high-value tests
- Edge cases
- Fixtures needed
- Tests not worth writing
```

Recommended worker: DeepSeek V4 Pro. Use Gemini CLI as an optional long-context
sidecar after runtime auth/billing sanity passes.

## Spec Drift Audit

```markdown
# Redacted Spec Drift Audit

Spec/source-of-truth excerpts:

Current implementation summary:

Known unresolved items:

Return:
- Drift findings
- Missing acceptance criteria
- Blockers vs non-blockers
- Exact GPT-5.5 decision points
```

Recommended worker: DeepSeek V4 Pro.

## Morning Briefing Redacted Sidecar

```markdown
# Redacted Morning Briefing Sidecar

Date: YYYY-MM-DD

Redacted priority pack:
- Workstream:
- Public/non-private signal:
- Blocker:
- Next possible action:

Constraints:
- Do not request private memory, calendar, finance, health, or customer context.
- Treat all data here as intentionally incomplete.
- The GPT-5.5 controller owns final prioritization.

Return:
- Top 3 execution risks
- Top 3 leverage actions
- Items that require private-context review by GPT-5.5
- Items safe for cheap worker follow-up
```

Recommended workers: Grok 4.3 + DeepSeek V4 Pro.

## External Audit

```markdown
# External Audit

Scope:

Files/excerpts:

Known gates:

Return:
- Findings with severity
- Evidence
- Residual risk
- Required verification
```

Recommended worker: Claude Opus CLI.
