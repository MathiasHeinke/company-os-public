# AionUI / Hermes / EVE Portable Bootstrap

Status: 0.7.2 portable sidecar contract
Date: 2026-05-25
Use for: starting the AionUI + Hermes + EVE pilot without committing private
sidecars or machine-specific paths to Company.OS

## Boundary

Company.OS owns the doctrine, packet shape, prompts, gates and adapter contract.
AionUI and Hermes remain local sidecars until a later adoption/fork decision is
approved.

Do not commit:

- AionUI clone
- Hermes Agent clone
- local Hermes home/profile
- browser data
- secrets, cookies, tokens or `.env`
- private EVE overlays

## Required Environment

```bash
export COMPANY_OS_ROOT="${HOME}/Developer/Company.OS"
export COMPANY_OS_PRIVATE_ROOT="${HOME}/Developer/company-os-private-ops"
export AIONUI_SIDECAR_ROOT="${COMPANY_OS_PRIVATE_ROOT}/aionui-sidecar/AionUi"
export HERMES_SIDECAR_ROOT="${COMPANY_OS_PRIVATE_ROOT}/hermes-sidecar/hermes-agent"
export HERMES_HOME="${COMPANY_OS_PRIVATE_ROOT}/hermes-sidecar/hermes-home"
export HERMES_COMPANYOS_WRAPPER="${COMPANY_OS_PRIVATE_ROOT}/hermes-sidecar/hermes-companyos"
export AIONUI_DATA_DIR="${COMPANY_OS_PRIVATE_ROOT}/aionui-sidecar/aionui-data"
export AIONUI_LOG_DIR="${COMPANY_OS_PRIVATE_ROOT}/aionui-sidecar/aionui-logs"
export AIONUI_HERMES_BIN="${COMPANY_OS_PRIVATE_ROOT}/aionui-sidecar/bin"
```

The wrapper directory must contain a `hermes` executable that invokes the
Company.OS-scoped Hermes profile without exposing tokens to AionUI.

Hermes must also have a non-empty default inference model in the local private
profile before AionUI launches it without extra flags. The verified 2026-05-25
pilot setting is:

```bash
hermes config set model.provider openrouter
hermes config set model.default gpt-5.1-codex-mini
```

This writes only to `${HERMES_HOME}/config.yaml`; do not commit that file.

Hermes must also be installed with its ACP adapter extra, because AionUI starts
Hermes through `hermes acp`:

```bash
cd "${HERMES_SIDECAR_ROOT}"
venv/bin/python -m pip install -e '.[acp]'
```

## Preflight

Preferred 0.7.2 entrypoint:

```bash
node "${COMPANY_OS_ROOT}/scripts/operator-shell/start_eve.mjs" check \
  --company-os-root "${COMPANY_OS_ROOT}" \
  --apply-overlay \
  --auth-check \
  --write-report \
  --json
```

This runs the practical `/start_eve` preflight: Command EVE AionUI
default-agent overlay, EVE sidecar prepare, EVE/Hermes preflight and optional
Hermes model/auth smoke. It prints the local AionUI start command only after
the chain is ready.

For a read-only check that does not apply the AionUI overlay, omit
`--apply-overlay`.

Check:

```bash
node "${COMPANY_OS_ROOT}/scripts/operator-shell/eve-sidecar.mjs" preflight \
  --company-os-root "${COMPANY_OS_ROOT}"
```

The preflight checks AionUI, Hermes, the local shim, `HERMES_HOME/SOUL.md`,
the Hermes default model config, Hermes ACP dependency availability and the
read-only Command Center packet. It also records AionUI/Hermes versions and git
commits for the pilot report.

## Command EVE AionUI Overlay

The local AionUI UI changes are reproducible from Company.OS; do not hand-edit
a fresh AionUI clone and call it installed.

Run the read-only check first:

```bash
node "${COMPANY_OS_ROOT}/scripts/operator-shell/aionui-command-eve-overlay.mjs" preflight \
  --company-os-root "${COMPANY_OS_ROOT}" \
  --aionui-root "${AIONUI_SIDECAR_ROOT}"
```

Apply the overlay:

```bash
node "${COMPANY_OS_ROOT}/scripts/operator-shell/aionui-command-eve-overlay.mjs" apply \
  --company-os-root "${COMPANY_OS_ROOT}" \
  --aionui-root "${AIONUI_SIDECAR_ROOT}"
```

The overlay copies:

```text
assets/brand/eve-command/aionui-overlay/public/command-eve-logo.svg
assets/brand/eve-command/aionui-overlay/public/eve-intent-wait.mp4
assets/brand/eve-command/aionui-overlay/public/eve-intent-wait-anchor.png
assets/brand/eve-command/aionui-overlay/public/eve-wait-focus.mp4
assets/brand/eve-command/aionui-overlay/public/eve-wait-focus-anchor.png
assets/brand/eve-command/aionui-overlay/public/eve-wait-companion.mp4
assets/brand/eve-command/aionui-overlay/public/eve-wait-companion-anchor.png
assets/brand/eve-command/aionui-overlay/public/eve-wait-review.mp4
assets/brand/eve-command/aionui-overlay/public/eve-wait-review-anchor.png
assets/brand/eve-command/aionui-overlay/public/eve-wait-call.mp4
assets/brand/eve-command/aionui-overlay/public/eve-wait-call-anchor.png
```

and applies:

```text
assets/brand/eve-command/aionui-overlay/patches/command-eve-aionui.patch
```

Use the overlay CLI rather than applying this patch by hand; the patch is
stored with zero-context hunks so the CLI applies it with `git apply
--unidiff-zero`.

Current overlay behavior:

- sidebar brand shows the Command EVE mark plus `EVE`
- Hermes remains the default backend but is displayed as EVE
- model/assistant picker is hidden on the first screen
- five face-focused EVE wait video variants render 1:1 above the input and
  rotate after each clip
- the input placeholder speaks as EVE, not Hermes

Prepare or refresh the Command EVE sidecar context:

```bash
node "${COMPANY_OS_ROOT}/scripts/operator-shell/eve-sidecar.mjs" prepare \
  --company-os-root "${COMPANY_OS_ROOT}"
```

This writes generated local-only files under `${COMPANY_OS_PRIVATE_ROOT}` and
`HERMES_HOME`:

```text
${HERMES_HOME}/SOUL.md
${COMPANY_OS_PRIVATE_ROOT}/aion-companyos-context/EVE_SOUL_BOOT.md
${COMPANY_OS_PRIVATE_ROOT}/aion-companyos-context/EVE_RUNTIME_BOOT_PACKET.json
${COMPANY_OS_PRIVATE_ROOT}/aion-companyos-context/aionui-skills/command-eve-first-run/SKILL.md
${COMPANY_OS_PRIVATE_ROOT}/aion-companyos-context/EVE_CONNECTOR_MANIFESTS.json
${COMPANY_OS_PRIVATE_ROOT}/aion-companyos-context/AION_COMPANYOS_OPERATOR.md
${COMPANY_OS_PRIVATE_ROOT}/aion-companyos-context/AIONUI_HERMES_START.md
${HERMES_COMPANYOS_WRAPPER}
${AIONUI_HERMES_BIN}/hermes
```

If an existing non-generated `SOUL.md` is present, the prepare step backs it up
before writing Command EVE's generated runtime soul.

Hermes version must be pinned in the pilot report as either:

```text
updated_and_smoked:
  version:
  commit:
```

or:

```text
intentionally_pinned:
  version:
  commit:
  reason:
```

## Start Command

After `start_eve.mjs check` passes, print only the command:

```bash
node "${COMPANY_OS_ROOT}/scripts/operator-shell/start_eve.mjs" start-command \
  --company-os-root "${COMPANY_OS_ROOT}" \
  --auth-check \
  --port 25809
```

The lower-level sidecar command remains available for debugging:

```bash
node "${COMPANY_OS_ROOT}/scripts/operator-shell/eve-sidecar.mjs" start-command \
  --company-os-root "${COMPANY_OS_ROOT}" \
  --port 25809
```

To start the local WebUI after prepare/preflight:

```bash
node "${COMPANY_OS_ROOT}/scripts/operator-shell/eve-sidecar.mjs" start \
  --company-os-root "${COMPANY_OS_ROOT}" \
  --port 25809 \
  --write-report
```

The UI must bind to `127.0.0.1` for the pilot. If it opens an auth screen, use
the local sidecar reset path; do not paste chat-visible credentials.

## EVE Context Bundle

Load only these public Company.OS files plus approved private overlays:

```text
docs/operations/eve-founder-intent-operating-layer.md
docs/operations/eve-first-run-founder-onboarding.md
docs/operations/command-eve-first-run-skill-pack.md
docs/operations/eve-soul-boot-contract.md
docs/operations/intent-to-department-reporting-chain.md
docs/integrations/aionui-hermes-command-center-handoff.md
docs/integrations/aionui-hermes-eve-portable-bootstrap.md
docs/releases/0.7a-command-center-read-model.md
reports/examples/command-center-read-model/command-center-read-model.example.md
reports/examples/command-center-read-model/command-center-read-model.example.json
reports/examples/command-center-read-model/hg35-eve-packet.example.json
```

Private overlays are allowed only under `${COMPANY_OS_PRIVATE_ROOT}` and must be
listed in the pilot report without copying their content into Company.OS.

## Soul.md Discovery

Hermes Agent may carry its own `SOUL.md` or equivalent persona boot file in the
sidecar. The 0.7.2 pilot must not assume the correct file path blindly. Before
the EVE smoke, record one of these in the pilot report:

```yaml
hermes_soul_location:
  status: found|not_found|not_supported
  path:
  reason:
```

If Hermes has a supported soul/persona boot file, it must load Command EVE's
identity from:

```text
docs/operations/eve-soul-boot-contract.md
```

If Hermes has no supported soul/persona boot file, the wrapper must inject the
same content as runtime context and mark `status: not_supported`. In both
cases, Company.OS remains the source of truth for EVE's Chief-of-Staff role;
the sidecar may cache or display it, but may not fork the role doctrine
silently.

## EVE Guided Onboarding Input

After the first-company packet exists, the EVE runtime should load the client
setup queue from:

```text
.company-os/onboarding/eve-boot-packet.json
.company-os/onboarding/intake-record.json
.company-os/company-discovery-brief.md
reports/company-discovery/YYYY-MM-DD/first-company-packet.md
```

`eve-boot-packet.json` is the first source for EVE's opening move. If present,
EVE should start with the known account/company/report seed, ask for
confirmation and then offer the next setup choice. If it is missing, EVE should
read `${COMPANY_OS_PRIVATE_ROOT}/aion-companyos-context/EVE_RUNTIME_BOOT_PACKET.json`
before answering. If that runtime packet says only the Company.OS kit/template
exists, EVE must not claim the workspace is empty. She should say the client
runtime is not initialized yet and offer exactly three next choices:

1. generate the first-company packet from the known signup/report seed
2. inspect existing systems read-only
3. continue as product-demo

EVE should use the `eve_onboarding` block to guide the operator through:

- the initial greeting as `Command EVE`
- existing-system inventory before new setup
- account pages to open
- permissions to grant or deny
- missing tools to install
- skill/workflow requests to classify
- memory sources that may or may not be saved
- first goals to convert into CEO Delegation Packets

EVE may ask the operator to open a website or login screen. EVE may not collect
passwords, cookies, tokens, recovery codes or payment details, and may not
complete signup/spend/auth steps on the operator's behalf.

## EVE First-Run Skill Pack

The prepare step also materializes a runtime skill and connector manifest:

```text
${COMPANY_OS_PRIVATE_ROOT}/aion-companyos-context/aionui-skills/command-eve-first-run/SKILL.md
${COMPANY_OS_PRIVATE_ROOT}/aion-companyos-context/EVE_CONNECTOR_MANIFESTS.json
```

Canonical sources:

```text
docs/operations/command-eve-first-run-skill-pack.md
kits/company-os-kit/.company-os/eve/connector-manifests.json
schemas/eve/connector-manifest.schema.json
```

The skill pack tells EVE to inspect before asking. It separates first-run
company discovery from connector setup, memory setup, execution-ledger setup,
GitHub/GitNexus setup, Google setup and first-goal setup.

Connector policy:

- Local Company.OS workspace and AionUI/Hermes are core runtime.
- Plane is core for Company.OS-native execution but existing ledgers are
  adapted read-only first.
- Honcho and GitHub/GitNexus are autonomy core, not first-message blockers.
- Calendar/Drive are recommended when attention or docs matter.
- Gmail, product backend/payment/deploy surfaces and marketing publishing
  connectors are gated by department wedge and HumanGate.

EVE should use the `existing_systems` block to decide whether to adapt existing
Plane/Linear/Jira/Notion/Trello/spreadsheet work, roles and tools before
creating new Company.OS parent/child structure. If a user already has an
execution ledger with substantial work, EVE must first summarize what exists
and ask for CEO/Codex approval before migration, duplication or restructuring.

## First Smoke Prompt

Run the scripted Hermes one-shot smoke:

```bash
node "${COMPANY_OS_ROOT}/scripts/operator-shell/eve-sidecar.mjs" smoke \
  --company-os-root "${COMPANY_OS_ROOT}" \
  --write-report
```

If a new machine has credentials but no default model yet, pass the model
explicitly for the smoke and then set the same values in the private Hermes
profile:

```bash
node "${COMPANY_OS_ROOT}/scripts/operator-shell/eve-sidecar.mjs" smoke \
  --company-os-root "${COMPANY_OS_ROOT}" \
  --provider openrouter \
  --model gpt-5.1-codex-mini \
  --write-report
```

The smoke is only a pass when Hermes returns non-empty EVE output. A zero exit
with an empty response is treated as blocked because it usually means the
provider/auth path exists but no model is configured.

Manual prompt fallback:

```text
You are Command EVE in the Company.OS AionUI/Hermes sandbox.
Use only the loaded Company.OS docs and read-only packet.
Return:
1. a five-line morning brief,
2. blocked actions,
3. one Founder Intent Packet,
4. one CEO Delegation Packet,
5. one Plane worker-contract draft with dispatch: manual,
6. one existing-system inventory summary,
7. what you refuse to do in this pilot.
```

## Pass Criteria

- Every claim cites a loaded doc or packet artifact.
- EVE introduces itself as Command EVE and starts an initialization inventory.
- Existing Plane/Linear/task/tool state is summarized before new structures are
  proposed.
- Blocked actions are visible.
- Worker contract keeps `dispatch: manual`.
- EVE refuses direct execution, Done, deploy, publishing, sending, spend and
  HG-4 approval.
- AionUI receives no Plane write token, Supabase service-role key, Stripe write
  key, GitHub push token or browser cookies.
- Pilot report records AionUI version/commit, Hermes version/commit, local-only
  data/log dirs, Hermes soul location status, screenshot paths if any, and
  unresolved blockers.

Canonical local report:

```text
reports/operator-shell/YYYY-MM-DD/eve-aionui-hermes-start-packet.md
reports/operator-shell/YYYY-MM-DD/eve-aionui-hermes-start-packet.json
```

## `/update_eve` Rule

`/update_eve` first updates Company.OS kit/docs through
`scripts/update/company-os-update.mjs`. AionUI/Hermes sidecar updates are a
separate explicit step. If the update includes frontend branding or first-run
UI changes, re-run the overlay preflight/apply commands above and then run the
Hermes/EVE smoke.

```text
sidecar_update_required: yes|no
aionui_update_approved_by:
hermes_update_approved_by:
post_update_smoke_required: yes
```

No sidecar update is applied as a side effect of a Company.OS kit update.
