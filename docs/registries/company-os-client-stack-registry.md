# Company.OS Client Stack Registry

Status: canonical 0.7.1 stack boundary
Date: 2026-05-25
Use for: deciding what a client install must connect before first pilot work

## Purpose

Company.OS is the operating layer. It must not smuggle founder-side tooling,
private sidecars or optional department connectors into the minimum client
install.

This registry classifies every supported surface by whether it is required for
the install, required for autonomy, optional for a department, or future-gated.

## Stack Classes

| Class | Meaning | Install behavior |
|---|---|---|
| Required core | Without it, this is not a Company.OS install. | Must be present or explicitly created during onboarding. |
| Required for autonomy | Needed before worker/controller autonomy is enabled. | May be unset at install, but must block runtime dispatch until configured. |
| Optional connector | Needed only for a client domain or department pack. | Off by default; enable per first wedge. |
| Future / gated | Recognized but not productized for client installs. | Document only; no default install or runtime authority. |

## 0.7.1 Minimum Stack

| Surface | Class | First install requirement | Default authority |
|---|---|---|---|
| Git remote | Required core | Repo clone or mirror with pinned `VERSION`. | Read/write by operator only. |
| Company.OS Kit | Required core | Installed into target workspace from `kits/company-os-kit/`. | Local files only. |
| Plane | Required core | Workspace/project, `role:*` labels, parent + child contracts. | Execution ledger, no worker Done. |
| Local memory bank | Required core | `memory-bank/` scaffold present in target workspace. | Local status/memory, no private dumps. |
| Install record | Required core | `.company-os/install-record.md` exists and names version/autonomy ceiling. | Operator-owned. |
| Software stack file | Required core | `.company-os/operations/software-stack.md` records enabled/disabled surfaces. | Operator-owned. |
| Human gates file | Required core | `.company-os/operations/human-gates.md` records HG owners and blocked actions. | Operator/CEO-owned. |
| Honcho | Required for autonomy | Workspace split documented before durable memory use. | Read/proposal first. |
| Codex | Required for autonomy | CEO/controller role and allowed actions documented. | Controller/CEO, no uncontrolled dispatch. |
| Claude Code | Required for autonomy | Worker runtime profile and auth preflight documented. | Worker runtime, bounded by contract. |
| GitNexus | Required for autonomy | Required for code-impact tasks, optional for pure ops/docs. | Read-only graph unless explicitly configured. |
| Capability Registry | Required for autonomy | Runtime tasks must name a capability profile before dispatch. | Gate only. |
| Runtime Dispatcher | Required for autonomy | Manual/dry-run first; scheduler off by default. | No Done, no deploy, no production writes. |

## Optional Connectors

| Surface | Class | Enable when | First gate |
|---|---|---|---|
| AionUI | Optional connector for 0.7.1; required for EVE UI pilot | The client needs an operator shell. | Read-only sidecar smoke. |
| Hermes Agent | Optional connector for 0.7.1; required for EVE UI pilot | AionUI/EVE shell is in scope. | Version pinned or updated, no raw secrets. |
| Supabase | Optional connector | Client product needs DB/auth/storage/edge functions. | RLS + HG-3 for schema/auth/service-role paths. |
| Upload-Post | Optional connector | Marketing department pack is selected. | CEO HG-2.5 for schedule/publish; dry-run first. |
| Google Search Console / Analytics | Optional connector | Growth/SEO pack is selected. | Read-only evidence lane. |
| Stripe | Optional connector | Revenue ops/payments are in scope. | Finance/customer/spend gate before writes. |
| Google Calendar | Optional connector | Founder/operator rhythm needs calendar blocks. | Minimum 30-minute attention blocks only. |
| Google Drive | Optional connector | Client docs live in Drive. | Read/write scopes declared per worker. |
| Obsidian | Optional connector | The founder/operator wants a local visual cockpit over Company.OS Markdown truth. | Local-only read cockpit first; no `.obsidian/` commit, community plugins or sensitive Web Viewer. |

## Future / Gated Surfaces

| Surface | Why gated |
|---|---|
| Fully autonomous scheduler lanes | Require repeated CAO/controller evidence, budget brakes and kill switch proof. |
| Public self-serve install | Requires `productization-readiness --public-release` with no blockers. |
| External publishing/sending/outreach | Requires department-specific release cards and HumanGate authority. |
| Production DB writes | Requires explicit connector scope, RLS proof and HG-3 release. |
| Plane Done automation | Not allowed for workers or CAO; CEO/Founder only. |
| Custom Obsidian plugins | Require source review, version pin, rollback and HumanGate before team rollout. |

## Product Boundary

Company.OS `0.7.1` ships:

- installable kit files
- local memory scaffold
- first-run EVE boot packet example and generated onboarding packet
- Plane-first execution doctrine
- role labels and worker-contract templates
- company discovery and first-pilot docs
- stack, install, human-gate and checklist templates
- optional Obsidian Brain Interface checklist and setup workflow
- dry-run/manual dispatch posture

Company.OS `0.7.1` does not ship:

- private founder sidecars
- client credentials
- AionUI/Hermes clones
- committed `.obsidian/` runtime state
- a requirement that every optional connector is present before EVE can greet
  the founder
- live metrics ledgers for public self-serve release
- a default scheduler that can mutate production state
- automatic publish, send, spend, deploy, merge or Plane Done authority

## First-Pilot Rule

The first non-founder pilot starts at `L2`:

```text
read/report/plan/manual-worker-smoke only
no production writes
no public actions
no scheduled autonomy
no worker Done
```

Promotion beyond `L2` requires a child worker report, CAO verdict, controller
decision and explicit HumanGate release evidence.
