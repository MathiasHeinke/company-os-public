# CapabilityProfile Template

Use for: C-level roles, controller roles and repeatable worker lanes.

## Purpose

`CapabilityProfile` defines what rules, knowledge, skills, workflows, personas
and harnesses an agent may use for a specific work type.

## Template

```markdown
CapabilityProfile:
RoleOwner:
Department:
DefaultAutonomyLevel:

RuleSet:
- global-agents
- workspace-agents

KnowledgeBase:
- [knowledge file, ADR, wiki, memory store, code graph]

Workflow:
- audit
- plan
- implement
- controller-review

SkillPack:
- [skill name or path]

PersonaLens:
- none

Harness:
- canonical-agent-review

RuntimeAuth:
- [required auth sentinel]

HonchoWorkspace:
  read: none | company | personal | product | install-specific
  write: none | proposal-only | controller-approved

StalenessRule:
- refresh before dispatch when older than N days

AllowedTools:
- read files
- run tests

ForbiddenTools:
- production writes
- deploy
- send external email

HumanGates:
- production
- legal
- medical
- spend
- public publishing
```

## Rules

- Persona lenses do not create ownership.
- Skills and tools are only available when named by this profile or the worker
  contract.
- Private knowledge is not inherited automatically by productizable kit users.
- Claude Code profiles must list plugins, connectors, commands, skills,
  subagents and Honcho boundaries explicitly. See
  `docs/orchestration/claude-clevel-worker-runtime.md`.
