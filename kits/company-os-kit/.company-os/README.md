# Company.OS Org Layer

This folder contains the organization-level Company.OS operating layer.

Org agents are not expert personas. They own role, scope, reporting, stop rules,
delegation, and quality gates. Operations files define how those roles become
execution-ledger work orders, scheduled controller passes, worker reports and
HumanGate decisions.

Expert personas remain specialist lenses. Org agents may assign expert lenses to
bounded subtasks, but expert lenses do not own departments and do not
self-promote.

Required org charters:

- CEO Worker / Chief of Staff
- CTO Agent
- CPO Agent
- CMO Agent
- QA / Eval Agent
- Controller Agent

Every org charter must declare mission, ownership boundaries, inputs, outputs,
tools, authority, stop rules, reporting, escalation, score pattern, starting
autonomy, and first pilot.

Required operations files:

- `operations/autonomous-work-order-pipeline.md`
- `operations/workspace-registry.example.json`
- `operations/automation-registry.example.md`
- `operations/obsidian-brain-interface.example.md`
- `templates/linear-worker-issue-template.md`
- `templates/company-discovery-brief.md`

Customize the example registry files before enabling scheduled dispatch in a
client or new company workspace.

Before department rollout, complete the company discovery brief and run the
business pressure test workflow. Do not create a full company backlog until the
first department wedge is clear.
