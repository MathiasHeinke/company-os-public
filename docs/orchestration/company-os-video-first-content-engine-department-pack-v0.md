# Company.OS Video-First Content Engine Department Pack v0

Status: guided-pilot department pack
Use for: turning raw video capture into gated YouTube, clips, social posts and
article packages without public publishing in the first release slice.

## Purpose

Video-First Content Engine supports the founder-led and expert-led content
domain as a reusable Company.OS CMO department pack. It starts as draft-only and
dry-run only: raw videos may be processed into local packages, but no upload,
schedule, social post, email send, spend, production write or Done transition is
allowed without the relevant HumanGate release.

The operating rule:

```text
Capture freely. Publishing is gated.
```

## Trigger / Intent

```yaml
intent_id: intent.video_first_content_engine_setup
trigger_phrases:
  - set up a video content engine
  - turn raw videos into YouTube clips posts and articles
  - start the video-first content department
  - create a publish package from this recording
first_safe_scope: initialize the local drop-folder structure, process one dry-run package, produce risk report and controller scorecard
```

## Founder Intake

EVE asks only for missing fields:

- company, offer, buyer and primary audience
- approved capture folder or local target root
- allowed public channels: YouTube, LinkedIn, X, blog, newsletter or internal
- approval owner for HG-2/HG-2.5/HG-3/HG-4
- claim classes that are off-limits
- privacy constraints: screens, customers, family, finance, health, legal,
  partner data, secrets and private communications
- publishing cadence goal
- success signal: watch time, clips produced, post quality, leads, demo
  requests, community replies or internal knowledge reuse

## CEO Delegation Packet

```yaml
objective: Create a reusable Video-First Content Engine guided department pack with folder initializer, parent/child worker contracts, dry-run publishing packages and hard HumanGate routing.
recommended_release_band: guided alpha
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/superpowers/specs/2026-05-27-video-first-content-engine-design.md
  - ${COMPANY_OS_ROOT}/docs/templates/company-os-department-capability-pack.md
  - ${COMPANY_OS_ROOT}/docs/templates/company-os-capability-pack-eval-rubric.md
owner_role: role:cmo
support_roles:
  - role:coo
  - role:cao
human_gate: HG-2.5 for any external publish package release; HG-3/HG-4 for regulated or private material
blocked_actions:
  - no public upload, post, send or schedule without release card
  - no publisher API write in the MVP
  - no secret or browser-cookie read
  - no production write
  - no Done transition by worker or CAO
```

## Department SOP

1. Operator drops raw video into `content/video-engine/01_inbox_raw/`.
2. Intake and Media Preflight creates a run manifest without mutating the raw
   file.
3. Media Processor creates local working copies, audio normalization notes and
   optional clip files.
4. Transcript and Segmenter creates timestamped transcript, chapters, topics,
   hooks and clip candidates.
5. Risk and Claim Safety classifies segments into HG1, HG2, HG3 or HG4 and
   moves unsafe packages to review.
6. Editorial Packager creates YouTube metadata, LinkedIn/X post drafts,
   blog/article draft and thumbnail/frame brief.
7. Publisher Adapter Dry-Run validates payload shape only. It never uploads.
8. CAO/Controller Evaluator checks artifact truth, gates, risk routing and
   learning proposals.
9. CEO/Codex decides release, revise, park or escalate.

## Skill Start

The setup skill creates the local drop-folder structure:

```bash
node scripts/content/video-first-content-engine-start.mjs \
  --root ${CLIENT_ROOT} \
  --company "Example Company" \
  --approval-owner "Founder" \
  --write \
  --json
```

The command creates:

```text
content/video-engine/
  01_inbox_raw/
  02_processing/
  03_review_required/
  04_publish_ready/
  05_clips/
  06_reports/
  07_archive/
  RUNBOOK.md
  video-engine.config.json
```

`01_inbox_raw/` is the only folder where the operator drops raw videos. The
start command does not read or process videos; it only creates the safe working
surface and configuration.

## C-Level Parent Contract

Use `${COMPANY_OS_ROOT}/docs/templates/company-os-video-first-content-engine-parent-worker-contract.md`.
The parent coordinates setup, contracts, capability boundaries, example reports,
release gates and evaluation. It does not process videos itself.

## Child Worker Contract List

- `${COMPANY_OS_ROOT}/docs/templates/company-os-video-first-content-engine-research-worker-contract.md`
- `${COMPANY_OS_ROOT}/docs/templates/company-os-video-first-content-engine-draft-worker-contract.md`
- `${COMPANY_OS_ROOT}/docs/templates/company-os-video-first-content-engine-media-preflight-worker-contract.md`
- `${COMPANY_OS_ROOT}/docs/templates/company-os-video-first-content-engine-media-processor-worker-contract.md`
- `${COMPANY_OS_ROOT}/docs/templates/company-os-video-first-content-engine-transcript-segmenter-worker-contract.md`
- `${COMPANY_OS_ROOT}/docs/templates/company-os-video-first-content-engine-risk-claim-safety-worker-contract.md`
- `${COMPANY_OS_ROOT}/docs/templates/company-os-video-first-content-engine-editorial-packager-worker-contract.md`
- `${COMPANY_OS_ROOT}/docs/templates/company-os-video-first-content-engine-clip-producer-worker-contract.md`
- `${COMPANY_OS_ROOT}/docs/templates/company-os-video-first-content-engine-publisher-dry-run-worker-contract.md`

All child contracts start with `dispatch: manual`.

## CapabilityProfile Requirements

Use `claude-clevel-worker/cmo/video-first-content-engine` for CMO video-engine
workers.

Allowed:

- read/write inside the declared video-engine workspace
- local Markdown and JSON artifact writes
- `ffmpeg` metadata, trim, normalize and clip commands after preflight
- declared local transcription command or adapter after HG-compatible preflight
- deterministic validators and private-path scans

Forbidden:

- public upload, schedule, post, send or spend
- publisher API writes
- browser cookies, password stores, private raw memory and unrelated filesystem
  reads
- secrets or token printing
- production data writes
- HumanGate downgrade
- durable memory writes without controller review
- Done transition by worker or CAO

## Allowed / Forbidden Surfaces

Allowed: docs, templates, local reports, dry-run package artifacts, local test
folders, proposal-only learning notes and fake-company examples.

Forbidden: secrets, raw private memory, production writes, public publish/send/
schedule/spend, connector expansion, publisher API writes and Done transitions.

## HumanGates

- HG-1: normal build log, product thinking or general commentary without
  sensitive data.
- HG-2: mild product demo or business commentary, still draft/dry-run.
- HG-2.5: CEO/Codex bounded release card for external upload/schedule/publish.
- HG-3: health, legal, financial, customer, private screen or potentially
  regulated claims.
- HG-3.5: Chief-of-Staff/founder-proxy review when CEO sees unresolved blockers.
- HG-4: real Founder decision for medical recommendations, third-party private
  data, strategic channel decisions or non-restorable brand/legal risk.

## Quality Gates

- worker contract parseability via `worker-ledger-validator.mjs`
- department pack evaluator READY status
- skill start tests and dry-run output
- private path, secret and source-company literal scan
- raw video immutability check when media processing is added
- transcript present before editorial package
- HumanGate report present before any publish-ready claim
- publisher adapters dry-run only

## Evidence Artifacts

- `reports/examples/video-first-content-engine-pack/README.example.md`
- `reports/examples/department-pack-creator/video-first-content-engine-evaluation.example.md`
- `reports/examples/department-pack-creator/2026-05-27/video-first-content-engine-evaluation.example.md`
- `reports/examples/department-pack-creator/2026-05-27/video-first-content-engine-evaluation.example.json`

## Learning Loop

Workers may propose improvements to folder structure, prompts, claims taxonomy,
clip rubric, transcript segmentation, publisher payloads, scorecards or
CapabilityProfile boundaries. Those proposals are reported as
`learning_proposals` and reviewed by CAO/controller plus CEO/Codex before they
become doctrine or expand authority.

## Autonomy Promotion Path

L0 inspect -> L1 initialize folders -> L2 local dry-run package -> L2.5 bounded
publish review -> L3 critical reversible runtime after repeated green proof
history -> L3.5 Chief-of-Staff/founder-proxy review -> L4 Founder decision.

The MVP remains L1/L2. It can create folders and dry-run packages, not publish.

## 10/10 Evaluation Rubric

Use `${COMPANY_OS_ROOT}/docs/templates/company-os-capability-pack-eval-rubric.md`.

Domain-specific 10/10 additions:

- media integrity
- transcript fidelity
- segment usefulness
- public claim safety
- clip/platform fit
- publisher dry-run correctness
- privacy and screen-risk readiness
