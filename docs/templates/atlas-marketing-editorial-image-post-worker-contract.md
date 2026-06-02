# ATLAS Marketing Editorial Image Post Worker Contract

Use this template for the daily non-carousel social lane: one or more
source-backed ATLAS Bio.OS article-style posts with a generated image plus
public X and LinkedIn copy.

This is separate from the Case File lane. Case Files are slide decks. This lane
produces the classic article/image social package.

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
Scope: produce or finalize the daily ATLAS editorial image-post package for the target date; no unrelated site, blog-engine, product-desk or scheduler refactors.
source_of_truth:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
acceptance_criteria:
  - Daily editorial folder for the target date exists with manifest.json, publishing-queue.json and at least five ranked content candidates.
  - At least one non-Case-File image post is publish-ready or needs only minor edit, with article-final.md, source-table.md, x-final.en.md, linkedin-final.en.md, visual-final.md and image.png.
  - Public copy says ATLAS Bio.OS, never ARES Bio.OS, and contains no internal routing metadata, platform notes, source footers or automation notes.
  - The image has visible reader utility: concrete source-backed facts, gates, ranges, caveats or a useful decision/mechanism map, not abstract labels or decorative context.
  - X and LinkedIn Upload-Post dry-run payloads use image media when image.png exists and do not fall back to text-only.
  - The worker reports PASS only after finalization, image generation, distribution plan, eval gate, Upload-Post dry-run and remote preflight pass.
gates:
  - cd ${LOCAL_WORKSPACE} && git status --short
  - cd ${LOCAL_WORKSPACE} && npm run marketing:normalize -- --date YYYY-MM-DD
  - cd ${LOCAL_WORKSPACE} && npm run marketing:finalize -- --date YYYY-MM-DD --refresh-visuals
  - cd ${LOCAL_WORKSPACE} && npm run marketing:images -- --date YYYY-MM-DD --provider codex --quality high --size 1024x1536
  - cd ${LOCAL_WORKSPACE} && npm run marketing:plan -- --date YYYY-MM-DD --days 14 --cadence growth
  - cd ${LOCAL_WORKSPACE} && npm run marketing:eval -- --date YYYY-MM-DD
  - cd ${LOCAL_WORKSPACE} && npm run marketing:schedule -- --date YYYY-MM-DD --remote-preflight
  - cd ${LOCAL_WORKSPACE} && git diff --check
human_gate: HG-2.5
reporting: Plane worker.reported with absolute artifact paths, selected piece ids, Upload-Post dry-run path, media paths, command results, blocker state, reflection, learning_proposals and subagents: [].
OutcomeArtifacts:
  - ${LOCAL_WORKSPACE}
AllowedReadPaths:
  - ${LOCAL_WORKSPACE}
  - ${LOCAL_WORKSPACE}
BlockedActions: do not mark Plane Done; do not write Linear; do not write durable memory; do not create broad duplicate Plane issues; do not publish or schedule outside the approved release card; do not give personal medical advice; do not provide sourcing, vendor, prescription, compounding, titration, cycle or self-injection instructions; do not overwrite approved images with --force unless the contract or CEO explicitly allows it.
EscalationPolicy: stop with NEEDS_HUMAN when personal medical advice, Rx protocol instruction, sourcing, vendor guidance, prescription, compounding, titration, cycle advice, self-injection instruction, spend, legal claims, irreversible publish actions or out-of-release-card actions are required.
Layer: CMO
RoleName: ATLAS daily editorial image-post producer
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
OutcomeSpec: Produce one evidence-backed, image-backed ATLAS editorial social package and schedule-ready X and LinkedIn payloads.
OutcomeRubric:
  - PASS only if reader utility is explicit and concrete.
  - PASS only if scientific/public claims are backed by source-table entries.
  - PASS only if Upload-Post dry-run uses the intended image media.
  - PASS only if public text says ATLAS Bio.OS, never ARES Bio.OS.
  - REJECT if the post is a product explainer without standalone reader value.
  - REJECT if the image is generic, decorative, text-only metadata or too low-density.
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
CapabilityProfile: claude-clevel-worker/cmo/atlas-growth-editorial-image-post
RuntimeAdapter: local-cli
ManagedAgentCompatibility: local-only
```
