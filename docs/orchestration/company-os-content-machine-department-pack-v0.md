# Company.OS Content Machine Department Pack v0

Status: guided-pilot department pack
Use for: turning founder context, source material and market signals into a
safe content operating system that can feed social, blog, book, video and
campaign lanes without defaulting to AI slop.

## Purpose

The Content Machine is the shared CMO substrate before any format-specific
content pack runs.

It is not a social scheduler, blog engine, book writer or video processor. It
creates the context layer those packs should read from:

```text
marketing intent
-> source inventory
-> Founder Voice and Belief Model check
-> content vault
-> research dossier
-> founder interview / raw brief
-> anchor draft
-> writer council
-> derivative package
-> release packet
-> performance and lessons
```

The core product rule:

```text
Real founder context first. Public publishing remains gated.
```

## Public Install Principle

The pack must work in a fresh public Company.OS install.

It must not assume that the company uses Codex, Claude Code, Slack, Notion,
Gmail, GitHub, Supabase, Upload-Post or any specific CRM. Those systems are
optional declared sources or connectors. EVE may inspect only sources the
operator explicitly approves and only through the install's connector policy.

Private mining is never the default.

## Trigger / Intent

```yaml
intent_id: intent.content_machine_setup
trigger_phrases:
  - set up my marketing pipeline
  - set up a content machine
  - I want to do social media
  - I want to produce content regularly
  - turn my ideas into posts articles and campaigns
  - build a founder content system
first_safe_scope: initialize the local content-machine surface, capture allowed
  sources, check FVBM status, create a first vault and raw-brief workflow,
  and keep all outputs draft-only.
```

## Founder Intake

EVE asks only for missing fields and summarizes after at most three questions.

Required to start:

- company, offer, buyer and primary audience
- first channel intent: LinkedIn, X, blog, newsletter, book, video or campaign
- approval owner for public voice and publishing
- existing FVBM status: missing, M0, M1, M2 or M3
- allowed source classes: website, docs, repos, transcripts, calls, exports,
  analytics, manual notes or none yet
- off-limits topics, claims, customer data and private surfaces

Useful but optional:

- three to five voice samples
- one negative style sample
- current content channels and cadence
- current lead source or revenue objective
- existing content backlog
- first target market: local, DACH, global or mixed

## Department SOP

1. EVE inspects the first-run boot packet and company discovery brief.
2. EVE checks FVBM status. If no confirmed model exists, EVE offers the M0
   seed interview from `docs/operations/eve-m0-seed-interview.md`.
3. Source Inventory records what may be read, where it lives, who approved it,
   sensitivity, allowed action ceiling and freshness.
4. Vault Scout turns approved source signals into topic cards. Each card has
   source, score, audience value, proof potential and HumanGate level.
5. Founder Interview asks for real stories, numbers, tension, beliefs and
   concrete examples before strong founder-voice pieces are drafted.
6. Raw Brief stores founder words, examples and proof. It is sacred source
   material. Draft workers may quote or adapt it but must not erase its meaning.
7. Researcher creates a sourced dossier for selected anchor ideas.
8. Draft worker creates one anchor draft and optional platform variants.
9. Writer Council reviews the draft through separate lenses: anti-slop, founder
   voice, buyer value, claim safety, platform fit and business outcome.
10. Revision Loop iterates until the agreed quality threshold passes.
11. Derivative worker creates native derivatives only after the anchor passes.
12. Release Packet enters the existing blog/social/video/book release gates.
13. Learning Loop compares the first draft with the founder-approved final and
    proposes updates to `content-lessons.md` and FVBM. Durable promotion remains
    gated.

## Quality Thresholds

Default thresholds:

- Daily social draft: council average 8/10.
- Anchor post, newsletter, blog or campaign: council average 8.5/10.
- Book chapter, strategic public stance or high-risk claim: council average
  9/10 plus the relevant CAO/HumanGate review.

The council must separate two classes of fixes:

- editorial fixes the machine may revise
- information gaps only the founder or approved source can answer

Information gaps route back to the Founder Interview or Source Inventory. They
must not be hallucinated.

## Folder Surface

The starter command creates:

```text
content/content-machine/
  00_intake/
  01_source_inventory/
  02_vault/
  03_research/
  04_founder_interviews/
  05_raw_briefs/
  06_anchor_drafts/
  07_council_reviews/
  08_derivatives/
  09_release_packets/
  10_performance/
  11_lessons/
  RUNBOOK.md
  content-machine.config.json
```

## CEO Delegation Packet

```yaml
objective: Create a public-repo-safe Content Machine that turns approved
  company context and founder voice into gated content packets for social,
  blog, video, book and campaign lanes.
recommended_release_band: guided alpha
source_of_truth:
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-content-machine-department-pack-v0.md
  - ${COMPANY_OS_ROOT}/docs/operations/eve-founder-voice-belief-model.md
  - ${COMPANY_OS_ROOT}/docs/operations/eve-m0-seed-interview.md
  - ${COMPANY_OS_ROOT}/docs/orchestration/company-os-marketing-department-pack-v067.md
owner_role: role:cmo
support_roles:
  - role:cao
  - role:coo
human_gate: HG-2.5 for external publish, schedule, send or connector write;
  HG-4 for founder voice identity, strategic positioning and non-restorable
  public commitments.
blocked_actions:
  - no public publishing
  - no public scheduling
  - no outreach send
  - no spend
  - no credential, cookie or token collection
  - no broad private-source mining
  - no durable memory write without approval
  - no Plane Done transition by worker or CAO
```

## Capability Boundary

Allowed:

- read confirmed company discovery artifacts
- read confirmed FVBM or run M0 seed interview prompts
- create local draft-only Markdown and JSON artifacts in the declared content
  machine folder
- propose source inventory entries
- propose FVBM and content lesson updates
- prepare release packets for existing gated lanes

Forbidden:

- public publish, upload, schedule, send or spend
- reading broad inboxes, browser storage, private chats or raw repos without
  explicit source inventory approval
- persisting private memory without confirmation
- claiming a founder voice match when FVBM is missing or low confidence
- inventing stories, numbers, customer examples or proof
- downgrading HumanGates

## CapabilityProfile Requirements

Use `claude-clevel-worker/cmo/content-machine` for Content Machine setup,
research, draft, council and learning-loop workers.

Allowed:

- read/write inside the declared local Content Machine folder
- local Markdown and JSON artifact writes
- source inventory proposal and approved-source reading
- FVBM status check and M0 seed interview prompts
- draft-only vault cards, raw briefs, anchor drafts, council reports,
  derivative drafts and release packets
- deterministic validators and private-literal scans

Forbidden:

- public publish, upload, schedule, send or spend
- social, CMS, newsletter, CRM or publisher API writes
- credential, password, token or browser-cookie collection
- broad private-source mining outside Source Inventory
- production data writes
- HumanGate downgrade
- durable memory writes without confirmation and review
- Done transition by worker or CAO

## Allowed / Forbidden Surfaces

Allowed: docs, templates, local reports, draft-only content artifacts, local
test folders, proposal-only learning notes, fake-company examples and approved
Source Inventory paths.

Forbidden: secrets, browser storage, raw private memory, production writes,
public publish/send/schedule/spend, connector expansion, publisher API writes,
unapproved inboxes or repositories and Done transitions.

## HumanGates

- HG-1: local source inventory, vault cards and low-risk raw briefs.
- HG-2: draft-only anchor artifacts, council review and internal derivatives.
- HG-2.5: CEO/Codex bounded release card before external publish, upload,
  schedule, send, CMS write, social scheduler handoff or newsletter handoff.
- HG-3: legal, financial, customer, private, security, regulated or
  high-risk factual claims.
- HG-3.5: Chief-of-Staff/founder-proxy review for sensitive positioning or
  unresolved founder-voice uncertainty.
- HG-4: founder voice identity, strategic positioning, non-restorable public
  commitments and final publication under the founder's name.

## Quality Gates

- worker contract parseability via `worker-ledger-validator.mjs`
- department pack evaluator READY status via
  `company-os-department-pack-evaluator.mjs`
- starter command dry-run and write-mode tests
- private path, secret and source-company literal scan
- FVBM status present before founder-voice claims
- Source Inventory present before optional source reads
- raw founder brief present before strong founder-voice anchor drafts
- council review present before derivatives or release packets
- HG-2.5 release card before any public-facing connector write

## Evidence Artifacts

- `reports/examples/content-machine-pack/README.example.md`
- `reports/examples/department-pack-creator/content-machine-evaluation.example.md`
- `reports/examples/department-pack-creator/2026-06-04/content-machine-evaluation.example.md`
- `reports/examples/department-pack-creator/2026-06-04/content-machine-evaluation.example.json`

## Learning Loop

Workers may propose improvements to source inventory questions, vault scoring,
founder interview prompts, raw brief shape, council lenses, derivative rules,
performance taxonomy, FVBM prompts or CapabilityProfile boundaries. Those
proposals are reported as `learning_proposals` and remain proposal-only until
reviewed by CAO/controller plus CEO/Codex.

## Autonomy Promotion Path

L0 inspect -> L1 initialize folders -> L2 local draft package -> L2.5 bounded
release review -> L3 critical reversible runtime after repeated green proof
history -> L3.5 Chief-of-Staff/founder-proxy review -> L4 Founder decision.

The guided-pilot pack remains L1/L2 by default. Generated worker contracts use
`dispatch: manual` and cannot publish, schedule, send, spend or mark Done.

## 10/10 Evaluation Rubric

Use `${COMPANY_OS_ROOT}/docs/templates/company-os-capability-pack-eval-rubric.md`.

Domain-specific 10/10 additions:

- founder truth before drafting
- approved source inventory before inspection
- raw brief fidelity
- anti-slop council rigor
- buyer value and business outcome clarity
- claim traceability
- platform-native derivatives
- public release gate correctness

## Integration Points

The Content Machine feeds these existing packs:

- Blog Department skill
- Video-First Content Engine
- Book Authoring Department Pack
- Social Approval Queue
- Marketing Department Pack Planner, Evidence Scout, Claim Safety, Visual
  Director, Distribution Manager and Performance Analyst

Those packs remain responsible for format-specific output and release gates.
The Content Machine owns source, raw founder context, draft quality and
learning continuity.

## Done Criteria

The pack is installable when:

- starter command creates the folder surface idempotently
- docs, kit runbook and EVE skill surface exist
- parent and child worker templates pass parseability checks; manual templates
  may return only `contract.dispatch-not-ready`
- unit tests prove dry-run, write, idempotency, force overwrite and private
  literal rejection
- no public action is possible from the starter command
- EVE can describe the setup flow without requiring any private connector
