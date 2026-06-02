# Command EVE Installable Operator Shell Plane Contracts

Status: draft parent/child contract set
Date: 2026-05-27
Use for: turning the AionUI/Hermes/Command EVE productization decision into
Plane-ready worker contracts that can later be materialized by `/goal`.

## Decision

Command EVE should not be a loose post-install overlay. The product target is a
single versioned install path that prepares Company.OS, AionUI, Hermes, EVE
skills, connector templates and updates as one governed system.

The first implementation remains gated:

- installable package and local shell setup are owned by `role:cto`
- visible capability/connector UX is owned jointly by `role:cpo` and `role:cto`
- connector auth stays human-owned and read-only-first
- public release, production writes, sends, spend, deploys and `Done` stay
  blocked until the matching HumanGate and controller evidence exist

## Parent Contract

- `docs/templates/command-eve-installable-operator-shell-parent-worker-contract.md`

## Child Contracts

1. `docs/templates/command-eve-installer-architecture-worker-contract.md`
2. `docs/templates/command-eve-aionui-extension-worker-contract.md`
3. `docs/templates/command-eve-installer-cli-worker-contract.md`
4. `docs/templates/command-eve-connector-catalog-worker-contract.md`
5. `docs/templates/command-eve-hermes-runtime-packaging-worker-contract.md`
6. `docs/templates/command-eve-update-lifecycle-worker-contract.md`
7. `docs/templates/command-eve-goal-materialization-worker-contract.md`
8. `docs/templates/command-eve-fresh-install-e2e-worker-contract.md`
9. `docs/templates/command-eve-security-productization-audit-worker-contract.md`

## Goal Readiness Rule

All contracts start with `dispatch: manual`. A future `/goal` run may promote a
child to `dispatch: ready` only after:

1. `${COMPANY_OS_ROOT}` placeholders are resolved to the target root.
2. Stage 0.5 Contract Controller returns `CONTRACT_PASS`.
3. Stage 0.65 Runtime Executability returns `RUNTIME_READY_PASS`.
4. Required connector auth is proven by preflight, not by manifest presence.
5. HumanGate level is confirmed for the target company.

## Plane Materialization

Materialized on 2026-05-27 into CompanyOS / COMPA with stable
`external_source: company-os-contract-materializer`:

| Item | Contract |
|---|---|
| `[WORK_ITEM_ID]` | Parent / Command EVE Installable Operator Shell |
| `[WORK_ITEM_ID]` | Installer Architecture |
| `[WORK_ITEM_ID]` | AionUI Extension |
| `[WORK_ITEM_ID]` | Installer CLI |
| `[WORK_ITEM_ID]` | Connector Catalog |
| `[WORK_ITEM_ID]` | Hermes Runtime Packaging |
| `[WORK_ITEM_ID]` | Update Lifecycle |
| `[WORK_ITEM_ID]` | Goal Materialization |
| `[WORK_ITEM_ID]` | Fresh Install E2E |
| `[WORK_ITEM_ID]` | Security Productization Audit |

All children point to `[WORK_ITEM_ID]` as parent. Role labels are set in Plane.
Non-pilot children remain parked on `dispatch: manual`; this is the intended
guardrail, not a failure.

Pilot promotion evidence:

- `[WORK_ITEM_ID]` Installer Architecture is the first promoted child
  (`dispatch: ready`).
- Stage 0.5 posted `CONTRACT_PASS` on 2026-05-27
  (`controller.contract-review`, comment
  `e64370c4-3579-4fe9-8b87-fe753760d504`, description hash
  `cab05ae86214b703ba6112757371383bc4a45c1decfdd1cfe2224a175773f7a9`).
- Stage 0.65 posted `RUNTIME_READY_PASS` on 2026-05-27
  (`controller.runtime-ready`, comment
  `9286a85a-f4e4-4a00-8774-1be988c52e35`).
- Dispatcher v0 wrote a fresh `worker.lock` and `worker.context` for
  `[WORK_ITEM_ID]` after superseding the stale hash lock.
- Runtime Dispatcher v1.2 live run
  `7584829b-9ac3-44cf-87c4-715e5e2d88db` returned `PASS` with Claude Sonnet,
  `P1-code-bounded`, `acceptEdits`, five heartbeats, stream health `PASS`,
  no out-of-scope worker writes, and Plane comments:
  `worker.run-summary` `da6b37c6-0778-4e0b-a639-e0f3fca46908`,
  `worker.reported` `026f8a71-ed66-4bc6-9c96-177c1a14ec14`.
- CAO post returned `PASS`
  (`controller.verdict`, comment `b8893052-120b-47f3-8832-0d18e55985c3`).
- Codex Controller post returned `AUTO-GO` under HG-2.5
  (`controller.decision`, comment `9967d58b-b358-4dea-b100-3253d5c89911`).
- Worker artifact:
  `reports/command-eve-installer/installer-architecture.md`.
- Runtime report:
  `reports/command-eve-installer/installer-architecture.md.7584829b-9ac3-44cf-87c4-715e5e2d88db.runtime.md`.
- Prompt-result evaluation returned `WARN` (0.813), with follow-up pressure on
  Raindrop coverage and stricter reflection/learning detection.

Second pilot promotion evidence:

- `[WORK_ITEM_ID]` AionUI Extension is the second promoted child
  (`dispatch: ready`), depending on `[WORK_ITEM_ID]`.
- Stage 0.5 posted `CONTRACT_PASS` on 2026-05-27
  (`controller.contract-review`, comment
  `17198f16-35ed-4839-bc15-20fcd6567767`, description hash
  `6c561a6514789790adc038bef43b2faf591f8ee8d6090a9c4f136feabdc066be`).
- Stage 0.65 posted `RUNTIME_READY_PASS` on 2026-05-27
  (`controller.runtime-ready`, comment
  `c7ebb870-e3b2-4684-a685-e6c32ea024f0`).
- Dispatcher v0 wrote a fresh `worker.lock` and `worker.context` for
  `[WORK_ITEM_ID]`.
- Runtime Dispatcher v1.2 live run
  `058f0b08-74d1-46eb-8d0c-93257de8e5a0` returned `PASS` with Claude Sonnet,
  `P1-code-bounded`, `acceptEdits`, seven heartbeats, stream health `PASS`,
  no out-of-scope worker writes, and Plane comments:
  `worker.run-summary` `9fa64e11-1061-4c47-9727-f661c1494a55`,
  `worker.reported` `fcf85483-01f7-42c9-8081-6dbfcfc10715`.
- CAO post returned `PASS`
  (`controller.verdict`, comment `d7328b7a-500c-43cb-b4e6-64f76a46bf24`).
- Codex Controller post returned `AUTO-GO` under HG-2.5
  (`controller.decision`, comment `14e48e7f-dc29-4c6c-ac06-87b4562cdef0`).
- Worker artifacts:
  `reports/command-eve-installer/aionui-extension-design.md` and
  `docs/integrations/aionui-hermes-blog-department-skill.md`.
- Runtime report:
  `reports/command-eve-installer/aionui-extension-design.md.058f0b08-74d1-46eb-8d0c-93257de8e5a0.runtime.md`.
- Gates returned `PASS`: worker-ledger-validator for
  `docs/templates/command-eve-aionui-extension-worker-contract.md` with
  `role:cpo`, plus the AionUI content check for Blog Department,
  Video-First Content Engine, Department Capability Pack and connector states.
- Prompt-result evaluation returned `WARN` (0.813), again due observability
  coverage and reflection/learning detector strictness, not due runtime,
  scope, CAO or controller failure.

Third pilot promotion evidence:

- `[WORK_ITEM_ID]` Installer CLI is the third promoted child (`dispatch: ready`),
  depending on `[WORK_ITEM_ID]` and `[WORK_ITEM_ID]`.
- First Stage 0.5 attempt correctly returned
  `CONTRACT_PATCH_REQUIRED` for `contract-review.sandbox-required`; the
  contract was remediated to a real sandbox workspace at
  `${LOCAL_WORKSPACE}`.
- Stage 0.5 then posted `CONTRACT_PASS` on 2026-05-27
  (`controller.contract-review`, comment
  `457c3d2f-1d3b-4407-860c-f33764f37c52`, description hash
  `55f3f0817c293b0a4976eead97b3a73f5aa2360059305c1759fc9eca89b9f9b1`).
- Stage 0.65 posted `RUNTIME_READY_PASS` on 2026-05-27
  (`controller.runtime-ready`, comment
  `2503f573-7bbb-4497-afd1-8457361bee68`).
- Dispatcher v0 wrote a fresh `worker.lock` and `worker.context` for
  `[WORK_ITEM_ID]` (`worker.lock` comment
  `25671579-7134-4c6d-9d75-977d0c13d645`, `worker.context` comment
  `9399ef41-cda8-4d9a-bd9b-bbad03966e8b`).
- Runtime Dispatcher v1.2 live run
  `50ff05d0-9652-4f5f-a2e6-446a9fe2c603` returned `PASS` with Claude Sonnet,
  `P1-code-bounded`, `acceptEdits`, 14 heartbeats, stream health `PASS`, no
  out-of-scope worker writes, and Plane comments:
  `worker.run-summary` `6c45c094-8103-4fb5-97c2-cd93a166ab77`,
  `worker.reported` `6bfcaa7a-ce02-460b-81df-88a645933900`.
- CAO post returned `PASS`
  (`controller.verdict`, comment `c1a69f44-d68a-4e5a-92f3-5557f9f47110`).
- Codex Controller post returned `AUTO-GO` under HG-2.5
  (`controller.decision`, comment `9a3c976e-6bce-4c97-9126-68c728009668`).
- Worker artifacts:
  `reports/command-eve-installer/installer-cli-report.md`,
  `reports/command-eve-installer/installer-cli-report.md.50ff05d0-9652-4f5f-a2e6-446a9fe2c603.runtime.md`.
- Implemented sandbox changes integrated into the main workspace after
  controller PASS: `scripts/install/bootstrap-core.mjs`,
  `scripts/operator-shell/aionui-command-eve-overlay-core.mjs`,
  `scripts/operator-shell/aionui-command-eve-overlay-core.test.mjs`.
- Post-integration Codex corrections filled skill card metadata and normalized
  new auth-surface strings to ASCII.
- Post-integration gates returned `PASS`: worker-ledger-validator,
  `node --test scripts/operator-shell/aionui-command-eve-overlay-core.test.mjs scripts/operator-shell/eve-sidecar-core.test.mjs`
  (23/23), bootstrap dry-run, overlay dry-run, EVE sidecar prepare dry-run and
  `git diff --check`.
- Prompt-result evaluation returned `PASS` (0.938).

Fourth pilot promotion evidence:

- `[WORK_ITEM_ID]` Connector Catalog is the fourth promoted child
  (`dispatch: ready`), depending on `[WORK_ITEM_ID]`.
- Stage 0.5 first correctly returned `CEO_GATE_REQUIRED` because the contract
  declares `human_gate: HG-3`.
- Codex/CEO issued pre-dispatch HG-3 release
  `human_gate.released` comment
  `f0606303-87a0-4e5e-a2c3-21bb73bb59bd` after the release validator returned
  `PASS` with 32 checks and 0 blockers.
- Stage 0.5 then posted `CONTRACT_PASS`
  (`controller.contract-review`, comment
  `9a659ab6-16a3-4bae-9245-ba8f4c225a0c`, description hash
  `c9add3fe68aadceb4bff383a6b19f393c7f8a88893369c62f2cc52d166c7f8fd`).
- Stage 0.65 reused the existing `RUNTIME_READY_PASS`
  (`controller.runtime-ready`, comment
  `bcface82-0561-44a6-8042-4747abb5731b`).
- Dispatcher v0 wrote a fresh `worker.lock` and `worker.context` for
  `[WORK_ITEM_ID]` (`worker.lock` comment
  `c3538b11-aa49-4a59-aebf-998261571349`, `worker.context` comment
  `902989ae-7b97-4d91-b690-97e716473219`).
- Runtime Dispatcher v1.2 live run
  `d65286fc-ab04-4b42-b8ae-80a0b391a8c1` returned `PASS` with Claude Sonnet,
  `P1-code-bounded`, `acceptEdits`, 10 heartbeats, stream health `PASS`, no
  out-of-scope worker writes, and Plane comments:
  `worker.run-summary` `0a187a27-2745-45d7-8cb7-39e5a21c99c4`,
  `worker.reported` `9ebb7bc0-1c43-48ba-8c7d-24dac0367179`.
- CAO post returned `PASS`
  (`controller.verdict`, comment `ff4a14af-28ce-4a66-8fb3-e9de6fecf713`).
- Codex Controller post correctly returned `ASK-CEO-HG3`
  (`controller.decision`, comment `bc4ba77b-0b7a-4d82-8c0b-38d0e5099f99`)
  because the generic controller CLI does not yet consume
  `human_gate.released` comments as `release_authority: CEO_CRITICAL` inputs.
- Codex/CEO issued post-run HG-3 release
  `human_gate.released` comment
  `cfdf957a-935b-4fe5-96dd-db56dae385eb` after the release validator returned
  `PASS` with 29 checks and 0 blockers.
- Codex/CEO then posted final `AUTO-GO` for the guided-pilot connector catalog
  release (`controller.decision`, comment
  `58cf220a-4dcc-4097-b561-95cfa2125ec4`) while connector auth enablement,
  public release, self-serve release, customer production install, merge,
  push, deploy, production writes and Plane Done remain blocked.
- Worker artifacts:
  `reports/command-eve-installer/connector-catalog-matrix.md`,
  `reports/command-eve-installer/connector-catalog-matrix.md.d65286fc-ab04-4b42-b8ae-80a0b391a8c1.runtime.md`,
  `reports/command-eve-installer/compa-370-hg3-release-card.md`,
  `reports/command-eve-installer/compa-370-post-run-hg3-release-card.md`.
- Implemented sandbox changes integrated into the main workspace after
  CAO PASS and post-run HG-3 release:
  `kits/company-os-kit/.company-os/eve/connector-manifests.json`,
  `schemas/eve/connector-manifest.schema.json`,
  `scripts/operator-shell/aionui-command-eve-overlay-core.mjs`,
  `scripts/operator-shell/aionui-command-eve-overlay-core.test.mjs`.
- Post-integration gates returned `PASS`: worker-ledger-validator, manifest
  and schema JSON parse, EVE sidecar prepare dry-run, AionUI overlay dry-run,
  bootstrap dry-run, `git diff --check`, and
  `node --test scripts/operator-shell/aionui-command-eve-overlay-core.test.mjs scripts/operator-shell/eve-sidecar-core.test.mjs scripts/operator-shell/start-eve-core.test.mjs scripts/plane/plane-contract-materializer-core.test.mjs scripts/orchestration/worker-ledger-validator.test.mjs scripts/orchestration/runtime-dispatcher-v1.test.mjs scripts/orchestration/scheduler-stage-0506-core.test.mjs scripts/release-gates/human-gate-release-core.test.mjs`
  (204/204).
- Prompt-result evaluation returned `PASS` (0.875).
- GitNexus impact was LOW for `buildEveCapabilityCards` and
  `applyAionuiCommandEveOverlay`; `readPreflightEvidence` is a new exported
  helper and will be indexed on the next GitNexus analyze.
- Known follow-ups: derive the intermediate `unverified` state from an
  auth-pending evidence file, and expose `--preflight-results-dir` on the
  overlay CLI entry point.

Fifth pilot promotion evidence:

- `[WORK_ITEM_ID]` Hermes Runtime Packaging is the fifth promoted child
  (`dispatch: ready`), depending on `[WORK_ITEM_ID]`.
- Stage 0.5 posted `CONTRACT_PASS`
  (`controller.contract-review`, comment
  `92578f9d-238d-4b23-bef8-a1ceee6c770c`, description hash
  `e44c2de5d1b17de5cc56b0e685f314eedb0c8c1c3ea2fb0e731d71111c0c06b7`).
- Stage 0.65 posted `RUNTIME_READY_PASS`
  (`controller.runtime-ready`, comment
  `c327c08e-0419-4230-b442-5931a25280c5`).
- Dispatcher v0 locked the item and wrote context for the current hash.
- Runtime Dispatcher v1.2 run
  `a1dabe6c-3401-4181-bb02-7d9905cff04a` timed out while the worker was
  writing the final report. Scope guard stayed clean: no out-of-scope files,
  no external changed files, stream health `PASS`.
- Codex reran the decisive verification gates independently in the sandbox:
  worker-ledger-validator `PASS`, `git diff --check` `PASS`,
  `node --test scripts/operator-shell/eve-sidecar-core.test.mjs` `PASS`
  (23/23), EVE sidecar preflight `PASS`, EVE sidecar smoke `PASS`.
- Post-integration main-workspace gates also returned `PASS`: worker-ledger,
  `git diff --check`, `node --test scripts/operator-shell/eve-sidecar-core.test.mjs`
  (23/23), EVE sidecar preflight and EVE sidecar smoke.
- Codex/CEO issued manual HG-2.5 `AUTO-GO` dependency release
  (`controller.decision`, comment
  `c235f5a9-b8b2-407a-af72-229e220e0d4e`) with explicit timeout caveat.
- The timeout path was then normalized as a bounded controller acceptance,
  not as a retroactive CAO or Worker PASS (`controller.self-fix-accepted`,
  comment `cc19d0f8-c86c-46f8-9bea-43e0476ab9b7`). Evidence remains the
  stream-health PASS, zero out-of-scope writes, zero external changed files
  and deterministic Codex rerun gates listed in
  `reports/command-eve-installer/compa-371-controller-autogo.md`.
- Worker artifacts:
  `reports/command-eve-installer/hermes-runtime-packaging.md`,
  `reports/command-eve-installer/hermes-runtime-packaging.md.a1dabe6c-3401-4181-bb02-7d9905cff04a.runtime.md`,
  `reports/command-eve-installer/compa-371-controller-autogo.md`.
- Implemented sandbox changes integrated into the main workspace after
  independent controller verification:
  `scripts/operator-shell/eve-sidecar-core.mjs`,
  `scripts/operator-shell/eve-sidecar-core.test.mjs`.
- Hermes runtime decision is now explicit in preflight output:
  Hermes `0.14.0`, commit `2517917de`, `commit-pinned`,
  update channel `manual-explicit`, provider `openrouter`, default model
  `gpt-5.1-codex-mini`.
- Known follow-ups: add a short smoke prompt mode, surface smoke timeout config
  in sidecar output, and turn Hermes upstream drift into structured preflight
  metadata.

Sixth pilot promotion evidence:

- `[WORK_ITEM_ID]` Update Lifecycle is the sixth promoted child
  (`dispatch: ready`), depending on `[WORK_ITEM_ID]`.
- Stage 0.5 initially posted `CONTRACT_PASS`
  (`controller.contract-review`, comment
  `cd39e8b0-72fb-4064-a301-d10b64b496aa`, description hash
  `4f4ad408a1040ecca16f98bed7ef083b3f30f4bedc06b95e80e40f1871be15bf`)
  and Stage 0.65 posted `RUNTIME_READY_PASS`
  (`controller.runtime-ready`, comment
  `7e8668bf-deaf-4ab5-b084-0c2dfa5f54f2`).
- Runtime Dispatcher v1.2 live run
  `b85528da-1187-421c-bdc3-20633f7ecfcd` returned `PASS` with Claude
  Sonnet, `P1-code-bounded`, `acceptEdits`, 12 heartbeats, stream health
  `PASS`, no out-of-scope worker writes, and Plane comments:
  `worker.run-summary` `4e2f6424-6920-46f6-9af1-7efc7e56586e`,
  `worker.reported` `a410336c-70ce-44d0-87d2-d7b2a2105aac`.
- CAO post returned `PASS`
  (`controller.verdict`, comment `72eba369-eeb0-499c-90f3-4af92dd4cf87`).
- Codex Controller post returned `AUTO-GO` under HG-2.5
  (`controller.decision`, comment `9250892f-7241-4f80-8400-1e927d600c80`).
- Post-worker Codex review closed two apply-path edge cases before main
  integration: `applyCompanyOsUpdate` now refuses `source-is-target` and
  `not-installed` targets instead of silently applying an invalid update.
- The worker contract check command was corrected to keep its
  `--write-report` output inside the sandbox during worker execution. Stage
  0.5 then posted a fresh `CONTRACT_PASS`
  (`controller.contract-review`, comment
  `bfe4d8ab-2b65-49fe-8e68-c6d6f81e9499`, description hash
  `95f9cd92ed98b7c41e30b4f6c589131ea5aca7f6cf22fb96b14dea3cd343e6ab`)
  and Stage 0.65 posted a fresh `RUNTIME_READY_PASS`
  (`controller.runtime-ready`, comment
  `07cfe09d-32f6-4e0e-aa2d-098a96f3ea4a`).
- Worker artifacts:
  `reports/command-eve-installer/update-lifecycle.md`,
  `reports/command-eve-installer/update-lifecycle.md.b85528da-1187-421c-bdc3-20633f7ecfcd.runtime.md`,
  `reports/company-os-updates/2026-05-28/company-os-update-n-a.md`,
  `reports/company-os-updates/2026-05-28/company-os-update-n-a.json`.
- Implemented sandbox changes integrated into the main workspace after CAO PASS
  and Codex Controller AUTO-GO:
  `scripts/update/company-os-update-core.mjs`,
  `scripts/update/company-os-update-core.test.mjs`.
- Main-workspace gates returned `PASS`: worker-ledger-validator,
  `node --test scripts/update/company-os-update-core.test.mjs` (23/23),
  `node scripts/update/company-os-update.mjs check --source ${LOCAL_WORKSPACE} --target ${LOCAL_WORKSPACE} --write-report --json`
  (`status: "source-is-target"`, zero changes), `git diff --check`, and the
  broader regression suite
  `node --test scripts/update/company-os-update-core.test.mjs scripts/operator-shell/aionui-command-eve-overlay-core.test.mjs scripts/operator-shell/eve-sidecar-core.test.mjs scripts/operator-shell/start-eve-core.test.mjs scripts/plane/plane-contract-materializer-core.test.mjs scripts/orchestration/worker-ledger-validator.test.mjs scripts/orchestration/runtime-dispatcher-v1.test.mjs scripts/orchestration/scheduler-stage-0506-core.test.mjs scripts/release-gates/human-gate-release-core.test.mjs`
  (237/237).
- Prompt-result evaluation returned `WARN` (0.813), due rubric coverage and
  reflection/learning signal strictness rather than a runtime, scope, CAO or
  controller failure.
- Known follow-up: add a connector-manifest merge helper. The current update
  lifecycle intentionally classifies connector manifests as `manual-review`
  until that merge path is proven.

Seventh pilot promotion evidence:

- `[WORK_ITEM_ID]` Goal Materialization is the seventh promoted child
  (`dispatch: ready`), depending on `[WORK_ITEM_ID]`.
- Stage 0.5 posted `CONTRACT_PASS`
  (`controller.contract-review`, comment
  `8d373a05-1a1b-4aba-81fa-18b92908b53e`, description hash
  `7d7cd8674c9f37f8ee009693bea44e3e0bea007eee4c36e7c8062d23a4becb7d`)
  and Stage 0.65 posted `RUNTIME_READY_PASS`
  (`controller.runtime-ready`, comment
  `ac49bf97-a6db-40c5-b259-ddeecc9c2ee7`).
- Two runtime hardening issues were closed before the final PASS:
  `ca5a78e8-34e2-4a62-ba65-23c21f347546` produced good goal artifacts but
  exposed a parser-risk in reports that contained example non-PASS states; the
  contract now requires a final parser-safe `worker.reported` YAML block.
  `344b541b-22a6-485c-9324-68fb4fb1737c` exposed Claude project-memory
  auto-read scope drift; Runtime Dispatcher v1.2 now allows only the
  workspace-owned Claude `MEMORY.md` path derived from explicit allowed read
  roots and still blocks unrelated workspace memory.
- Fresh Dispatcher v0 lock was posted after the old lock expired
  (`worker.lock`, comment `e43e9dc6-d166-4cec-ae21-a961c951c4e5`,
  context comment `82361dc5-6961-4a85-a517-b5e7e8864ea8`, lock run
  `518719f0-5506-451b-8a86-df94030009be`).
- Runtime Dispatcher v1.2 live run
  `46a46ef9-7939-4c3d-a5d3-391c29e17905` returned `PASS` with Claude
  Sonnet, `P1-code-bounded`, `acceptEdits`, 6 heartbeats, stream health
  `PASS`, no out-of-scope worker writes, no runtime interventions, and Plane
  comments: `worker.run-summary`
  `663aec19-6d11-4f1e-a9df-7c74bdf5bc94`, `worker.reported`
  `b97d5c37-9d37-411b-83a1-97a3b5a22e30`.
- CAO post returned `PASS`
  (`controller.verdict`, comment `544ab61c-7854-48fd-a028-61f017bd4fc3`).
- Codex Controller post returned `AUTO-GO` under HG-2.5
  (`controller.decision`, comment `d01baba9-285a-413e-8e85-00cfbaeb969f`).
- Prompt-result evaluation returned `PASS` (0.938), with contract completeness,
  observability quality, learning capture and privacy verdict all green.
- Worker artifacts:
  `reports/command-eve-installer/goal-materialization-plan.md`,
  `reports/command-eve-installer/goal-materialization-plan.md.46a46ef9-7939-4c3d-a5d3-391c29e17905.runtime.md`,
  `reports/command-eve-installer/goal-materialization-plan.46a46ef9-7939-4c3d-a5d3-391c29e17905.stream.jsonl`,
  `reports/goals/2026-05-28/command-eve-installable-operator-shell-materialize.md`,
  `reports/goals/2026-05-28/command-eve-installable-operator-shell-materialize.json`,
  `reports/observability/raindrop-workshop/2026-05-28/46a46ef9-7939-4c3d-a5d3-391c29e17905.prompt-result.md`.
- Implemented controller hardening integrated into the main workspace:
  `scripts/orchestration/runtime-dispatcher-v12-core.mjs`,
  `scripts/orchestration/runtime-dispatcher-v12-core.test.mjs`.
- Post-integration main-workspace gates returned `PASS`:
  `node --test scripts/orchestration/runtime-dispatcher-v12-core.test.mjs scripts/orchestration/runtime-dispatcher-v1.test.mjs scripts/goal/goal-core.test.mjs scripts/goal/intake-to-plane-core.test.mjs`
  (229/229), worker-ledger-validator for `[WORK_ITEM_ID]`, `goal.mjs --help`,
  `goal.mjs materialize --write --json` dry-run (`applyResult: null`),
  `git diff --check`, and GitNexus impact on
  `detectRuntimeToolScopeViolations` (`LOW`, impactedCount 0). GitNexus
  detect-changes reported medium risk because the broader workspace still has
  unrelated dirty files outside this [WORK_ITEM_ID] change set.

Eighth pilot promotion evidence:

- `[WORK_ITEM_ID]` Fresh Install E2E is the eighth promoted child
  (`dispatch: ready`), depending on `[WORK_ITEM_ID]`.
- The contract was promoted from placeholder/manual to a bounded CAO verify
  run: sandbox workspace
  `${LOCAL_WORKSPACE}`,
  fake-company target `tmp/command-eve-fresh-install`, explicit
  `depends_on: [WORK_ITEM_ID]`, parser-safe reporting, zero-spend budget,
  kill switch, allowed read/write paths, and allowlisted install/onboarding/
  sidecar/update gates.
- Materializer updated Plane item `[WORK_ITEM_ID]`
  (`b6073dbd-1bdc-4dad-8919-cd0e0d2b9475`) with `role:cao`.
- Stage 0.5 posted `CONTRACT_PASS`
  (`controller.contract-review`, comment
  `9f637058-64e4-45aa-9384-3950a292b118`, description hash
  `15e258c728c2087b3541cbff97d3d447eb92e738ca53f0d9b98c375e8a5ed58d`)
  and Stage 0.65 posted `RUNTIME_READY_PASS`
  (`controller.runtime-ready`, comment
  `0616650b-28f0-473a-9521-2e056374e04f`).
- Runtime preflight initially caught stale CAO runtime capability
  (`last_verified_at: 2026-05-13`, `stale_after_days: 14`). The registry was
  refreshed to `2026-05-28` without expanding autonomy, connectors or
  production authority; `capability-registry.mjs` then returned `PASS`.
- Dispatcher v0 lock was posted
  (`worker.lock`, comment `6be1457f-c585-4333-ac33-553a502b40d9`,
  context comment `85ea24d3-fc10-4209-a086-cc31d88db5c3`, lock run
  `b5ad8a46-f8c9-4d25-a7bc-3ae5fec5d665`).
- Runtime Dispatcher v1.2 live run
  `31cc7648-e933-438b-a4ec-ec1bd0ce1584` returned `PASS` with Claude
  Sonnet, `P1-code-bounded`, `acceptEdits`, 4 heartbeats, stream health
  `PASS`, no out-of-scope worker writes, no runtime interventions, and Plane
  comments: `worker.run-summary`
  `76da8608-d4dd-4248-8624-c38511890f4c`, `worker.reported`
  `0a25fb0b-87a8-4e40-a928-ec0f18e83d02`.
- CAO post returned `PASS`
  (`controller.verdict`, comment `b4eec1d7-9483-4d0e-92fb-2b0d54717639`).
- Codex Controller post returned `AUTO-GO` under HG-2.5
  (`controller.decision`, comment `c62d48e7-57e6-47c7-a95c-98603a122329`).
- Fresh install E2E gates returned `PASS` (8/8): worker-ledger-validator,
  bootstrap dry-run, real temp install, first-company packet, EVE sidecar
  prepare dry-run, EVE sidecar preflight, update check, path/privacy safety.
- Worker artifacts:
  `reports/command-eve-installer/fresh-install-e2e.md`,
  `reports/command-eve-installer/fresh-install-e2e.md.31cc7648-e933-438b-a4ec-ec1bd0ce1584.runtime.md`,
  `reports/command-eve-installer/fresh-install-e2e.31cc7648-e933-438b-a4ec-ec1bd0ce1584.stream.jsonl`,
  `reports/observability/raindrop-workshop/2026-05-28/31cc7648-e933-438b-a4ec-ec1bd0ce1584.prompt-result.md`.
- Known follow-ups from the E2E run: seed a target `VERSION` file during
  bootstrap, add an explicit `--report-dir` option to update check, promote
  Hermes upstream lag into a structured warning, and document the expected
  first-company-packet overwrite of the bootstrap discovery stub.
- Post-integration main-workspace gates returned `PASS`: validator for
  `[WORK_ITEM_ID]`, capability registry tests/CLI check, runtime-dispatcher tests,
  fresh install dry-run, real temp install, first-company packet,
  `eve-sidecar prepare --dry-run`, `eve-sidecar preflight`, and
  `company-os-update check --write-report` against
  `tmp/command-eve-fresh-install-main-gate-2026-05-28-final-a`.

Ninth pilot promotion evidence:

- `[WORK_ITEM_ID]` Security Productization Audit is the ninth promoted child
  (`dispatch: ready`), depending on `[WORK_ITEM_ID]`.
- The contract was promoted from placeholder/manual to a bounded CAO audit
  run in sandbox workspace
  `${LOCAL_WORKSPACE}`,
  with `human_gate: HG-3`, `capability_profile:
  claude-clevel-worker/cao/runtime`, `inference_class: P2-code-shared`,
  zero-spend budget, kill switch, sandbox-only report writes and explicit
  public/self-serve release blocks.
- Materializer updated Plane item `[WORK_ITEM_ID]`
  (`8522312f-e890-4023-86c2-f044f59d882a`) with `role:cao`.
- Initial Stage 0.5 correctly returned `CEO_GATE_REQUIRED` for HG-3
  (`controller.contract-review`, comment
  `4fc20629-d37a-47b5-a762-a65bcad0e8c1`), then Stage 0.6 routed the release
  need (`controller.contract-remediation`, comment
  `5d04b69b-4724-4466-bbae-3159da83cf76`), and Stage 0.65 posted
  `RUNTIME_READY_PASS` (`controller.runtime-ready`, comment
  `28bd7d40-c1d4-45fa-bd9a-746eb35b2079`).
- Codex/CEO issued pre-dispatch HG-3 release `human_gate.released` comment
  `f7f8b2e8-4c13-4995-abad-9803f6a920a1` after the release validator returned
  `PASS` with 32 checks and 0 blockers.
- After the invalid `P2-audit` inference class was corrected to
  `P2-code-shared`, Stage 0.5 posted fresh `CONTRACT_PASS`
  (`controller.contract-review`, comment
  `814b62a7-0274-4327-adb1-2ab61cb7bd5e`, description hash
  `4cde5b01937f627a92f4c92ac521487d572e41028c32dad9bd408864690f2647`)
  and Stage 0.65 posted fresh `RUNTIME_READY_PASS`
  (`controller.runtime-ready`, comment
  `d909fb6b-6494-4649-badb-e3ff5481125a`).
- Dispatcher v0 locked the item and wrote context
  (`worker.lock`, comment `9fef180a-2931-4fe3-b11e-79335b5f81e2`,
  `worker.context`, comment `be2d8645-a127-4bf9-92cc-7822b24cadb2`,
  dry-run/lock run `edd2b73d-e475-4450-ad6c-0dfb7b493951`).
- Runtime Dispatcher v1.2 live run
  `c992e4a5-1836-42a3-ad8f-773afda31271` returned `PASS` with Claude Opus,
  `P2-code-shared`, `acceptEdits`, 7 heartbeats, stream health `PASS`,
  no runtime interventions, no external changed files and no out-of-scope
  worker writes. Plane comments: `worker.run-summary`
  `c9d580ed-8091-47c9-a127-9cb010c7a0bc`, `worker.reported`
  `bbaa5484-7077-4041-9d94-340bbdbb5d18`.
- CAO post returned `PASS`
  (`controller.verdict`, comment `7c48b502-848a-4e34-986a-022329cccb9c`).
- The generic Codex Controller post correctly returned `ASK-CEO-HG3`
  (`controller.decision`, comment `d58a9fe5-a252-41ac-88d0-fb2ee323ae19`)
  because the generic CLI does not yet consume `human_gate.released` comments
  as `release_authority: CEO_CRITICAL` inputs.
- Codex/CEO issued post-run HG-3 release `human_gate.released` comment
  `b2d7e477-fbdf-4c3d-a678-2abc3847f173` after the release validator returned
  `PASS` with 32 checks and 0 blockers
  (`c992e4a5-1836-42a3-ad8f-773afda31271-human_gate.released-HG-3-20260528134609650`).
- Codex/CEO then posted the final `AUTO-GO` controller decision for the
  guided-pilot audit gate (`controller.decision`, comment
  `e9ef1df6-6475-4868-a91f-a799898d8627`) while explicitly keeping
  public release, self-serve release, customer production install, connector
  auth enablement, merge, push, deploy and Plane Done blocked.
- Worker artifacts:
  `reports/command-eve-installer/security-productization-audit.md`,
  `reports/command-eve-installer/security-productization-audit.md.c992e4a5-1836-42a3-ad8f-773afda31271.runtime.md`,
  `reports/command-eve-installer/security-productization-audit.c992e4a5-1836-42a3-ad8f-773afda31271.stream.jsonl`,
  `reports/command-eve-installer/compa-375-hg3-release-card.md`,
  `reports/command-eve-installer/compa-375-post-run-hg3-release-card.md`,
  `reports/command-eve-installer/compa-375-post-run-hg3-release-validation.json`,
  `reports/observability/raindrop-workshop/2026-05-28/c992e4a5-1836-42a3-ad8f-773afda31271.prompt-result.md`.
- Prompt-result evaluation returned `PASS` (0.938).
- Security/productization audit verdict: `PASS` for guided pilot release of
  the Command EVE installable operator shell package. Public/self-serve
  release remains blocked by the four known PUB blocker classes: live metrics
  ledgers, internal reports, hard-coded developer paths and source-company
  domain literals. Those are not guided-pilot blockers.

Parent synthesis and completion review evidence:

- `goal.mjs synthesize --parent [WORK_ITEM_ID] --dry-run --write --json` returned
  `READY_FOR_PARENT_COMPLETION_REVIEW` with 9/9 children complete and 0
  blockers.
- Synthesis artifacts:
  `reports/goals/2026-05-28/compa-366-synthesis.md` and
  `reports/goals/2026-05-28/compa-366-synthesis.json`.
- Parent completion review:
  `reports/goals/2026-05-28/compa-366-parent-completion-review.md`.
- HG-2.5 parent review release validation returned `PASS` with 35 checks and
  0 blockers:
  `reports/releases/2026-05-28/compa-366-parent-completion-release-validation.json`.
- Plane comments on parent `[WORK_ITEM_ID]`: `human_gate.released`
  `594f86f7-e636-4a06-968b-87d85dca5746`, CAO parent synthesis `PASS`
  `bb9b7b1d-5f0f-4873-8650-cde0969ab2ce`, Codex Controller parent
  completion `AUTO-GO` `735304e2-37e4-4e74-8401-3bee3e43bd5c`.
- This closes the guided-pilot parent review only. Plane Done, public release,
  self-serve release, customer production install, connector auth enablement,
  merge, push, deploy and production writes remain blocked.

Materializer command:

```bash
node scripts/plane/plane-contract-materializer.mjs \
  --workspace companyos \
  --project-id 3537d502-b5a7-4214-9f7d-8f571fb1cd1e \
  --apply \
  --update-existing \
  --json
```

## Non-Negotiables

- No installer asks for passwords, cookies, raw tokens, recovery codes,
  payment details or `.env` contents in chat.
- No connector is called `configured` until its preflight passes.
- AionUI is an operator shell, not a second execution ledger.
- Plane remains the canonical Company.OS execution ledger.
- Local company facts, auth state, HumanGate owners and customer context are
  never overwritten by update.
