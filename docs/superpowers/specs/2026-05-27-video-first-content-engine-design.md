# Video-First Content Engine Design

Status: design draft
Date: 2026-05-27
Owner: CEO/Codex design, CMO department pack candidate
Target: public-repo-safe Company.OS Department Capability Pack

## Purpose

Build a reusable Company.OS video-first content department pack that turns raw
video capture into a complete gated distribution package:

```text
raw video -> local processing -> transcript -> risk gate -> YouTube package
-> clips -> LinkedIn/X posts -> blog/article -> CAO/controller scorecard
```

The pack is modeled after the Blog Engine quality bar, but the primary input is
raw video. The first release must prove high-quality local processing and
publishing packages without uploading, scheduling or posting externally.

## Positioning

The engine is for founder-led, expert-led or operator-led companies where the
best source material is spontaneous work, product building, commentary,
screen-recording, field notes or internal reflection.

The operating rule is:

```text
Capture maximal frei. Publishing maximal systematisiert.
```

The department should make high-frequency capture safe by moving the real effort
into deterministic processing, quality gates, claim safety and review routing.

## Non-Goals

- No public upload, public scheduling or public posting in the first slice.
- No platform credential setup in the public template.
- No automatic medical, legal, financial or regulated advice publishing.
- No private raw memory, personal files, customer data, browser cookies or
  secrets in the public repo.
- No source-company-specific channel strategy hardcoded into the pack.

## MVP Scope

The MVP processes one local raw video and emits a full artifact package:

- normalized local working copy
- transcript
- subtitles or subtitle-ready file
- chapter candidates
- risk/HumanGate classification report
- YouTube longform title, description, chapters and thumbnail/frame brief
- clip plan and optional local clip files
- LinkedIn and X post drafts
- blog/article draft derived from the video
- evidence/claim ledger
- CAO/controller scorecard
- learning proposals

All publisher actions are dry-run only. The output may say "ready for HG-2.5
publish review" but must not publish, schedule or upload.

## Folder Model

The public template should use placeholders and relative roots:

```text
content/video-engine/
  01_inbox_raw/
  02_processing/
  03_review_required/
  04_publish_ready/
  05_clips/
  06_reports/
  07_archive/
```

`01_inbox_raw/` is operator input. `04_publish_ready/` contains only reviewed
packages and never means auto-published. `03_review_required/` is a hard stop
for any HG-3/HG-4 material.

## Pipeline

1. **Ingest.** Detect a raw video and create a run id, manifest and working
   directory. Do not delete or mutate the raw source.
2. **Preflight scan.** Capture basic metadata, duration, dimensions, audio
   presence and visible-screen risk hints where available.
3. **Local processing.** Use declared tools such as `ffmpeg` for trim,
   transcode, audio normalization and optional clip extraction.
4. **Transcript.** Produce transcript plus timestamped segments. Transcription
   provider must be declared and replaceable.
5. **Segmentation.** Identify topics, hooks, chapters, claim clusters and clip
   candidates.
6. **Risk/HumanGate routing.** Classify the run before any publish-ready claim:
   HG1/HG2 can proceed to package generation; HG3/HG4 moves to review.
7. **Editorial package.** Generate YouTube metadata, clip briefs, platform post
   drafts and blog/article draft from the same source ledger.
8. **Quality gates.** Reject incomplete artifacts, weak titles, missing
   transcript, unsupported claims, missing risk report, missing reviewer gate or
   private/source-company literals.
9. **CAO/controller scorecard.** Produce a machine-readable verdict:
   `PASS`, `REVISE`, `REVIEW_REQUIRED`, `REJECT` or `BLOCKED`.
10. **Learning loop.** Workers may propose SOP, prompt, rubric or capability
    improvements, but cannot silently update doctrine.

## HumanGates

| Gate | Use |
|---|---|
| HG1 | Normal build log, product thinking, general commentary, no sensitive data. |
| HG2 | Product demo, mild claims, client-neutral business commentary, reversible distribution decision. |
| HG2.5 | CEO/Codex bounded release card for upload/schedule/publish after artifact truth and rollback/cancel path. |
| HG3 | Health, longevity, Rx, peptide, financial, legal, customer, private screen or potentially regulated claims. |
| HG3.5 | Chief-of-Staff/founder-proxy packet when CEO sees unresolved release blockers. |
| HG4 | Medical recommendation, personal/private third-party data, non-restorable legal/brand/reputation risk, strategic channel decision. |

The default MVP never crosses HG-2.5. HG-3/HG-4 material is packaged for review
only.

## Worker Roster

The department pack should materialize these child lanes:

| Worker | Role | Output |
|---|---|---|
| Intake and Media Preflight | role:cmo / role:coo support | run manifest, source metadata, processing readiness |
| Media Processor | role:cmo | normalized file, audio pass, optional clip files |
| Transcript and Segmenter | role:cmo | transcript, chapters, topic map, clip candidates |
| Risk and Claim Safety | role:cmo | HumanGate classification, claim ledger, blocked segments |
| Editorial Packager | role:cmo | YouTube metadata, posts, article draft, thumbnail/frame brief |
| Clip Producer | role:cmo | short-form clip plan and optional local clips |
| Publisher Adapter Dry-Run | role:cmo / role:coo support | platform payload validation without upload |
| CAO/Controller Evaluator | role:cao | scorecard, PASS/REVISE/REJECT, learning proposals |

The parent contract coordinates setup, source truth, capability boundaries,
evidence and release path. It does not perform worker actions.

## Capability Boundary

The first CapabilityProfile should allow:

- read/write inside the declared video-engine workspace
- `ffmpeg` metadata, trim, normalize and clip commands
- local transcription command or declared transcription adapter
- local Markdown/JSON artifact writes
- deterministic validators and private-path scans

It should block:

- public upload, schedule, post or send
- publisher API writes
- reading browser cookies, password stores, private raw memory or unrelated
  filesystem paths
- secret printing
- production data writes
- changing HumanGate levels
- durable memory writes without controller review
- worker/CAO Done transitions

## Quality Bar

The MVP is not accepted unless the artifact package is independently auditable.

Required checks:

- raw video remains unchanged
- run manifest exists
- transcript exists and references the source video
- all publish package files exist
- every public-facing draft has platform and audience declared
- claims are classified as source-backed, personal experience, opinion,
  uncertain or blocked
- HG-3/HG-4 segments never land in `04_publish_ready/`
- output contains no private absolute paths, secrets or source-company literals
- publisher adapters run only in dry-run mode
- scorecard includes verification commands and unresolved risks

## Public Repo Productization

The pack must be generic enough for a new company to install:

- use `${COMPANY_OS_ROOT}`, `${CLIENT_ROOT}` and `${VIDEO_ENGINE_ROOT}`
  placeholders
- include fake-company example artifacts, not private founder raw material
- make video providers replaceable
- document optional dependencies instead of assuming local installation
- provide dry-run examples with tiny fixture media or metadata-only fixtures
- ship no credentials, tokens, private channel ids or real personal footage

## AionUI / EVE / Hermes UX

EVE should expose this as a native setup skill:

```text
"Set up a video content engine for our company."
"I want to drop raw videos and get YouTube, clips, posts and articles."
"Turn this recording into a publish package."
```

EVE response must produce:

1. founder/company intent read
2. missing setup questions only
3. source/capture folder proposal
4. risk boundary and approval owner
5. CEO delegation packet
6. CMO parent contract draft
7. child worker roster
8. dry-run command plan
9. 10/10 evaluation plan
10. first HumanGate decision needed

## Evaluation Strategy

Use the Department Capability Pack rubric. The Video-First Engine adds these
domain-specific disciplines:

- media integrity
- transcript fidelity
- segment usefulness
- public claim safety
- clip/platform fit
- publisher dry-run correctness
- privacy/screen redaction readiness

`READY` requires 10/10 across the generic department rubric plus these video
domain checks. A 9/10 gap is acceptable only with evidence, external constraint
and follow-up worker contract.

## First Implementation Plan Boundary

The first implementation should create the Department Capability Pack artifacts,
not a full autonomous scheduler:

- `company-os-video-first-content-engine-department-pack-v0.md`
- domain pack setup file
- AionUI/Hermes skill file
- parent worker contract
- child worker contracts
- capability registry proposal
- example report and scorecard
- evaluator fixture or extension proposal

Local media execution can be a second slice unless the team decides to include a
small fixture-based proof in the same pass.

## Open Decisions

1. Ledger backend naming should follow the upcoming Execution Ledger v2 decision
   rather than hardcoding Plane-first wording.
2. Transcription provider should be adapter-based; default public template may
   use a placeholder command until dependency choice is approved.
3. Redaction depth for screens needs a separate gate. MVP can classify and stop;
   auto-redaction can come later.
4. Actual public publishing requires HG-2.5 or higher plus publisher-specific
   rollback/cancel evidence.
