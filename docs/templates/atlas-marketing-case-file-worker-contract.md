# ATLAS Marketing Case File Worker Contract

Use this template for one daily ATLAS Case File child item in Plane project
`GROW`. The item must carry exactly one role label: `role:cmo`.

The contract is intentionally strict: it lets the CMO worker use the existing
`[SOURCE_WORKSPACE]` pipeline while keeping public claims, image generation,
scheduling and reporting under Company.OS control.

## Plane Contract

```yaml
role: role:cmo
parent_seat: role:cmo
agent: claude
mode: implement
workspace: ${LOCAL_WORKSPACE}
dispatch: ready
RunAt: set concrete ISO timestamp before dispatch
DependsOn:
Scope: one daily ATLAS Case File for the target date; no unrelated site, pipeline or schedule refactors.
source_of_truth:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
acceptance_criteria:
  - One ATLAS Case File deck exists for the target date with a source table, case-file-carousel.json, valid visual-final.md, generated no-text cover image and rendered carousel slides.
  - X and LinkedIn public copy repeat the hook, explain why the map is useful and ask exactly one reply-worthy closing question.
  - The deck contains concrete source-backed values, thresholds, counts, time windows, evidence classes or claim boundaries; it does not rely on abstract meta labels.
  - X Upload-Post payload uses up to four selected PNG slides and LinkedIn uses the full slide set as image slides.
  - The worker reports PASS only after local eval, case-file doctrine, visual-brief gate, artifact truth or equivalent freshness check, Upload-Post dry-run and remote preflight pass.
gates:
  - cd ${LOCAL_WORKSPACE} && git status --short
  - cd ${LOCAL_WORKSPACE} && npm run marketing:finalize -- --date YYYY-MM-DD --refresh-visuals
  - cd ${LOCAL_WORKSPACE} && npm run marketing:images -- --date YYYY-MM-DD --provider codex --quality high --size 1024x1536
  - cd ${LOCAL_WORKSPACE} && npm run marketing:case-files -- --date YYYY-MM-DD
  - cd ${LOCAL_WORKSPACE} && npm run marketing:plan -- --date YYYY-MM-DD --days 14 --cadence growth
  - cd ${LOCAL_WORKSPACE} && npm run marketing:eval -- --date YYYY-MM-DD
  - cd ${LOCAL_WORKSPACE} && npm run marketing:schedule -- --date YYYY-MM-DD --remote-preflight
  - cd ${LOCAL_WORKSPACE} && git diff --check
human_gate: HG-2.5
reporting: Plane worker.reported with absolute artifact paths, Upload-Post dry-run paths, scheduled job ids if any, command results, blocker state, reflection, learning_proposals and subagents: [].
OutcomeArtifacts:
  - ${LOCAL_WORKSPACE}
AllowedReadPaths:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
BlockedActions: do not mark Plane Done; do not write Linear; do not write durable memory; do not create broad duplicate Plane issues; do not publish or schedule outside the approved release card; do not give personal medical advice; do not provide sourcing, vendor, prescription, compounding, titration, cycle or self-injection instructions; do not overwrite approved images with --force unless the contract or CEO explicitly allows it.
EscalationPolicy: stop with NEEDS_HUMAN when personal medical advice, Rx protocol instruction, sourcing, vendor guidance, prescription, compounding, titration, cycle advice, self-injection instruction, spend, legal claims, irreversible publish actions or out-of-release-card actions are required.
Layer: CMO
RoleName: ATLAS daily Case File producer
RoleLabel: role:cmo
ParentSeat: role:cmo
RoleOwner: CMO
Department: Growth
AccountableLayer: C-Level
ReportsTo: CEO
AutonomyLevel: L2 draft, L2.5 schedule only after release card
Controller: codex
DecisionOwner: CMO
Sandbox: required
AllowedWritePaths:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
MaxRuntime: 45m
MaxSpend: EUR 0
KillSwitch: Plane comment KILL <work-item-ref> or local sentinel runtime/kill/<work-item-ref>.
Heartbeat: write a worker heartbeat every 10 minutes when the runtime supports it; otherwise include last successful gate in worker.reported.
OutcomeSpec: Produce one evidence-backed, saveable ATLAS Case File package and schedule-ready X and LinkedIn payloads.
OutcomeRubric:
  - PASS only if reader utility is explicit and concrete.
  - PASS only if all public quantitative values are source-backed.
  - PASS only if the generated cover background is topic-specific and text-free.
  - PASS only if public text says ATLAS Bio.OS, never ARES Bio.OS.
  - REJECT if the post is primarily an ATLAS product explainer.
  - REJECT if the visual is generic, decorative or missing data density.
OutcomeMaxIterations: 1
OutcomeGrader: CAO then Codex
OutcomePassThreshold: PASS
RuntimeAuth:
  - claude-max-oauth-ok
  - codex-chatgpt-login-ok-for-image-generation
  - upload-post-preflight-ok
  - filesystem-read-write-ok
GateExecutionPolicy: worker-runs-declared-gates
EventPolicy: metrics-jsonl
EventSink: metrics-jsonl
EventTypes:
  - worker.started
  - worker.reported
StateReducer: issue-state-from-agent-events
DreamPolicy: proposal-only
MemoryStore: none
MemoryUpdatePolicy: proposal-only
ReflectionPolicy: required
LearningProposalPolicy: required
SessionPolicy: no-subagents
Coordinator: false
SubAgentRoster: none
SharedFilesystem: target-workspace-only
ContextIsolation: target-workspace-only
CapabilityProfile: claude-clevel-worker/cmo/atlas-growth-case-file
RuntimeAdapter: local-cli
ManagedAgentCompatibility: local-only
```

## Worker Report Minimum

```yaml
worker.reported:
  version: marketing-cmo-case-file-v0
  state: PASS
  role: role:cmo
  date: YYYY-MM-DD
  topic: <topic>
  artifacts:
    case_file_spec: /absolute/path/case-file-carousel.json
    cover_image: /absolute/path/image.png
    carousel_dir: /absolute/path/carousel
    distribution_plan: /absolute/path/upload-post-submissions.json
  platform_payloads:
    x: ready|blocked
    linkedin: ready|blocked
  gates:
    - marketing:case-files PASS
    - marketing:eval PASS
    - upload-post-remote-preflight PASS
  blockers: []
  reflection: <one paragraph>
  learning_proposals: []
  subagents: []
```
