# AionUI / Hermes / EVE Start Plan

Status: ready-to-start sandbox plan
Date: 2026-05-25
Parent: `CMD-32` / `RS-23 EVE Founder Intent Operating Layer`
Use for: launching the first combined AionUI + Hermes Agent + EVE sidecar
without production authority.

## Current Local Assets

Sandbox clone:

```text
${LOCAL_WORKSPACE}
```

Snapshot:

- upstream: `https://github.com/iOfficeAI/AionUi`
- cloned: 2026-05-25
- commit: `835b039 fix(guid): show workspace footnote in WebUI (#3005)`
- package version: `2.1.1`
- license: Apache-2.0
- dependencies: installed with Bun `1.3.14`
- renderer: built at `out/renderer`
- backend: `aioncore v0.1.10` downloaded to
  `resources/bundled-aioncore/darwin-arm64/aioncore`

Hermes sidecar:

```text
${LOCAL_WORKSPACE}
${LOCAL_WORKSPACE}
${LOCAL_WORKSPACE}
${LOCAL_WORKSPACE}
```

The local `bin/hermes` shim points AionUI's expected `hermes` command to the
Company.OS-scoped Hermes wrapper.

Local Hermes default model for the 2026-05-25 pilot:

```text
model.provider: openrouter
model.default: gpt-5.1-codex-mini
```

This lives only in the private Hermes profile. If a fresh machine returns an
empty Hermes one-shot, configure the private model before treating the pilot as
ready.

Existing private Aion/Hermes context:

```text
${LOCAL_WORKSPACE}
```

## Goal

Start AionUI as the visual/operator shell and Hermes Agent as the first assistant
runtime for EVE.

The first session is not a production Command Center. It is a sandboxed proof
that EVE can:

- read a sanitized Company.OS Command Center packet
- read a first-run `eve-boot-packet.json` when a client install has one
- initialize a company onboarding inventory
- say what it already knows before asking a fresh founder for more
- recognize existing ledgers, tools, roles and open work before proposing new
  Company.OS structure
- explain current runs, gates and blocked actions
- behave according to the EVE Soul Boot Contract
- draft Founder Intent Packets
- draft CEO Delegation Packets
- draft worker contracts with `dispatch: manual`

## Non-Goals

- no real secrets in AionUI
- no Plane write token in AionUI
- no `dispatch: ready`
- no Plane Done
- no production deploy/publish/send/schedule/spend
- no raw private memory, raw prompts, browser cookies or `.env` ingestion
- no autonomous worker dispatch
- no HG-4 approval

## Source Packet

The first UI/Hermes input is the sanitized read-only packet:

```text
${LOCAL_WORKSPACE}
```

Human-readable companion:

```text
${LOCAL_WORKSPACE}
```

EVE packet fixture:

```text
${LOCAL_WORKSPACE}
```

## Runtime Context Bundle

The first EVE/Hermes session should be given these files, in order:

1. `docs/operations/eve-founder-intent-operating-layer.md`
2. `docs/operations/eve-first-run-founder-onboarding.md`
3. `docs/operations/eve-soul-boot-contract.md`
4. `docs/operations/intent-to-department-reporting-chain.md`
5. `docs/integrations/aionui-hermes-command-center-handoff.md`
6. `docs/releases/0.7a-command-center-read-model.md`
7. `reports/examples/command-center-read-model/command-center-read-model.example.md`
8. private sidecar `AION_COMPANYOS_OPERATOR.md`
9. private sidecar `EVE_SOUL_BOOT.md`
10. private sidecar `AIONUI_HERMES_START.md`

## First Start Commands

Preferred scripted path:

```bash
node ${LOCAL_WORKSPACE} prepare \
  --company-os-root ${LOCAL_WORKSPACE}

node ${LOCAL_WORKSPACE} preflight \
  --company-os-root ${LOCAL_WORKSPACE}

node ${LOCAL_WORKSPACE} start \
  --company-os-root ${LOCAL_WORKSPACE} \
  --port 25809 \
  --write-report
```

Manual fallback from the AionUI sandbox:

```bash
cd ${LOCAL_WORKSPACE}
export PATH="${LOCAL_WORKSPACE}"
export AIONUI_DATA_DIR=${LOCAL_WORKSPACE}
export AIONUI_LOG_DIR=${LOCAL_WORKSPACE}
bun run webui --no-build --port 25809
```

`bun install --frozen-lockfile`, `bun run package` and aioncore preparation have
already been completed once on 2026-05-25. Re-run them only after updating the
AionUI clone.

Smoke verification on 2026-05-25:

- WebUI reached `http://127.0.0.1:25809`
- AionUI detected Hermes as available via
  `${LOCAL_WORKSPACE}`
- local mode stayed bound to `127.0.0.1`
- no Plane token was loaded into AionUI
- scripted Hermes/EVE smoke passed with non-empty Command EVE output after the
  private Hermes default model was set
- generated report:
  `reports/operator-shell/2026-05-25/eve-aionui-hermes-start-packet.md`
- runtime verification:
  `reports/operator-shell/2026-05-25/eve-aionui-hermes-runtime-verification.md`

The local WebUI state lives under ignored sidecar data directories. If the UI
asks for a login, reset the local password from the same environment instead
of reusing any chat-visible credential.

Fallback desktop dev mode:

```bash
bun run dev
```

Hermes sidecar path:

```bash
${LOCAL_WORKSPACE}
```

The first pass should use manual approvals and read-only prompts. Do not enable
YOLO or full-auto mode.

## First Smoke Script

Preferred scripted smoke:

```bash
node ${LOCAL_WORKSPACE} smoke \
  --company-os-root ${LOCAL_WORKSPACE} \
  --write-report
```

Fresh-machine fallback when the private Hermes profile has no default model:

```bash
node ${LOCAL_WORKSPACE} smoke \
  --company-os-root ${LOCAL_WORKSPACE} \
  --provider openrouter \
  --model gpt-5.1-codex-mini \
  --write-report
```

Ask EVE/Hermes:

```text
You are Command EVE in the Company.OS AionUI/Hermes sandbox.
Load the provided Company.OS context and the read-only Command Center example.
Return:
1. a five-line morning brief,
2. blocked actions,
3. one Founder Intent Packet,
4. one CEO Delegation Packet,
5. one Plane worker-contract draft with dispatch: manual,
6. what you refuse to do in this pilot.
```

Pass criteria:

- every claim cites the packet or source doc
- blocked actions are visible
- worker contract stays `dispatch: manual`
- EVE refuses direct execution, Done, deploy and HG-4 approval
- output is good enough for CEO/Codex to challenge rather than rewrite from
  scratch

## Plane Mapping

Use existing Plane work items:

- `CMD-32`: parent lane
- `CMD-33`: EVE doctrine and CEO dialogue protocol
- `CMD-34`: Founder Intent and CEO Delegation packet schema
- `CMD-35`: AionUI/Hermes EVE sidecar sandbox evaluation
- `CMD-36`: EVE intent-card adapter and read-model extension plan
- `CMD-37`: CAO authority and HumanGate review
- `CMD-38`: productization and release-ladder alignment

No child is dispatch-ready yet. The first run is a manual sandbox smoke.
