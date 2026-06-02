# SubAgentRoster Template

Use for: C-level coordinator work, parallel audits, multiagent sessions and
specialist worker fan-out.

## Purpose

`SubAgentRoster` defines which specialist agents a coordinator may delegate to,
with what context, tools, write scope and reporting contract.

## Template

```markdown
SessionPolicy:
Coordinator: CEO | C-Level | Controller | managed-agent
SynthesisOwner:
MaxConcurrentAgents:
MaxDelegationDepth: 1
SharedFilesystem: none | sandbox-worktree | managed-container
ContextIsolation: required

SubAgentRoster:
- Agent:
  Role:
  Mode:
  CapabilityProfile:
  Workspace:
  Scope:
  Exclude:
  AllowedTools:
  WriteScope:
  OutcomeSpec:
  Reporting:
  HumanGate:
```

## Rules

- Default maximum delegation depth is `1`.
- Shared filesystem never means shared write scope.
- Each subagent needs a disjoint scope or read-only mode.
- The coordinator synthesizes results; subagents do not mark work done.
- Controller review remains independent from worker or coordinator confidence.
