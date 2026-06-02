# Video-First Content Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public-repo-safe Company.OS CMO department pack that turns raw video into dry-run YouTube, clip, social and article packages, and provides a start command that creates the drop-folder structure for immediate local testing.

**Architecture:** The first slice is artifact-first and fail-closed: Company.OS owns SOP, contracts, capability boundaries, EVE/Hermes UX, registry entries and deterministic gates; publisher actions remain dry-run only. A small Node start utility initializes the local video-engine folder tree and manifest without reading or processing videos.

**Tech Stack:** Markdown Company.OS docs, JSON registries, Node.js ESM CLI/core modules, `node --test`, existing worker-ledger and department-pack evaluators.

---

### Task 1: Department Pack Surfaces

**Files:**
- Create: `docs/orchestration/company-os-video-first-content-engine-department-pack-v0.md`
- Create: `kits/company-os-kit/.company-os/domain-packs/video-first-content-engine/setup.md`
- Create: `kits/company-os-kit/.agents/workflows/video-first-content-engine-setup.md`
- Create: `docs/integrations/aionui-hermes-video-first-content-engine-skill.md`
- Create: `reports/examples/video-first-content-engine-pack/README.example.md`

- [ ] Write the SOP, kit setup, workflow, EVE/Hermes skill and example report.
- [ ] Keep all actions draft/dry-run until HG-2.5+ release.
- [ ] Ensure no private source-company names, private paths or secrets appear.

### Task 2: Parent and Child Worker Contracts

**Files:**
- Create: `docs/templates/company-os-video-first-content-engine-parent-worker-contract.md`
- Create: `docs/templates/company-os-video-first-content-engine-research-worker-contract.md`
- Create: `docs/templates/company-os-video-first-content-engine-draft-worker-contract.md`
- Create: `docs/templates/company-os-video-first-content-engine-media-preflight-worker-contract.md`
- Create: `docs/templates/company-os-video-first-content-engine-media-processor-worker-contract.md`
- Create: `docs/templates/company-os-video-first-content-engine-transcript-segmenter-worker-contract.md`
- Create: `docs/templates/company-os-video-first-content-engine-risk-claim-safety-worker-contract.md`
- Create: `docs/templates/company-os-video-first-content-engine-editorial-packager-worker-contract.md`
- Create: `docs/templates/company-os-video-first-content-engine-clip-producer-worker-contract.md`
- Create: `docs/templates/company-os-video-first-content-engine-publisher-dry-run-worker-contract.md`

- [ ] Write flat fenced YAML worker contracts with `dispatch: manual`.
- [ ] Include source, scope, acceptance, gates, HumanGate, reporting, blocked actions, reflection and learning policies.
- [ ] Make every contract compatible with `worker-ledger-validator.mjs`.

### Task 3: Skill Start Folder Initializer

**Files:**
- Create: `scripts/content/video-first-content-engine-start-core.mjs`
- Create: `scripts/content/video-first-content-engine-start.mjs`
- Create: `scripts/content/video-first-content-engine-start-core.test.mjs`

- [ ] Implement a pure core that plans and writes the folder tree under `content/video-engine/`.
- [ ] Include `01_inbox_raw`, `02_processing`, `03_review_required`, `04_publish_ready`, `05_clips`, `06_reports`, `07_archive`.
- [ ] Write `video-engine.config.json`, `RUNBOOK.md` and folder README files.
- [ ] Test dry-run, write mode, idempotency and private path rejection.

### Task 4: Registries and Index

**Files:**
- Modify: `registries/domain-packs/company-os.json`
- Modify: `registries/capabilities/company-os.json`
- Modify: `docs/system-index.md`

- [ ] Add `video-first-content-engine` as a CMO domain pack.
- [ ] Add `claude-clevel-worker/cmo/video-first-content-engine` CapabilityProfile.
- [ ] Add a System Index row for the new pack and start utility.

### Task 5: Evaluation Evidence and First Test Folder

**Files:**
- Create: `reports/examples/department-pack-creator/video-first-content-engine-evaluation.example.md`
- Generate: `reports/examples/department-pack-creator/2026-05-27/video-first-content-engine-evaluation.example.md`
- Generate: `reports/examples/department-pack-creator/2026-05-27/video-first-content-engine-evaluation.example.json`
- Generate ignored local test folder: `tmp/video-first-content-engine-test/content/video-engine/`

- [ ] Run worker-ledger validator on every contract.
- [ ] Run department capability pack evaluator.
- [ ] Run content start utility tests.
- [ ] Run start utility once into ignored `tmp/video-first-content-engine-test`.
- [ ] Run private literal and whitespace checks.
