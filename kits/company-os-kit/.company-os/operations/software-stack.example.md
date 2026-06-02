# Company.OS Software Stack

Status: example, copy to `.company-os/operations/software-stack.md`
Use for: recording which app surfaces are enabled for this client install

## Product Boundary

This install starts at autonomy ceiling `L2` unless a controller release card
raises it. Only the first pilot wedge should be enabled.

Reference registry:

```text
docs/registries/company-os-client-stack-registry.md
```

## Required Core

| Surface | Status | Notes |
|---|---|---|
| Git remote | unset | Pin exact Company.OS `VERSION`; do not install `latest`. |
| Company.OS Kit | installed | Created by `scripts/install/bootstrap.mjs`. |
| Plane | unset | Create workspace/project plus `role:*` labels before first worker contract. |
| Local memory bank | installed | Keep current state short; do not paste private chat dumps. |
| Install record | installed | Fill `.company-os/install-record.md`. |
| Workspace registry | installed | Fill `.company-os/operations/workspace-registry.json`. |
| Human gates | installed | Fill `.company-os/operations/human-gates.md`. |

## Required Before Autonomy

| Surface | Status | Gate |
|---|---|---|
| Honcho | disabled | Configure separated workspaces before durable memory writes. |
| Codex | disabled | CEO/controller role only; no uncontrolled dispatch. |
| Claude Code | disabled | Worker runtime only after auth preflight and contract pass. |
| GitNexus | disabled | Required before code-impact work. |
| Capability Registry | disabled | Every runtime worker must name a capability profile. |
| Runtime Dispatcher | disabled | Manual/dry-run first; no worker Done. |

## Optional Connectors

| Surface | Status | Enable when |
|---|---|---|
| AionUI | disabled | The pilot includes an EVE/operator shell. |
| Hermes Agent | disabled | AionUI/EVE sidecar path is in scope. |
| Supabase | disabled | The client product needs DB/auth/storage/edge functions. |
| Upload-Post | disabled | Marketing department pack needs scheduling/publishing. |
| Google Search Console / Analytics | disabled | Growth/SEO pack needs read-only evidence. |
| Stripe | disabled | Payments/revenue ops are in scope. |
| Google Calendar | disabled | Human attention blocks are required. |
| Google Drive | disabled | Client docs live in Drive. |
| Obsidian | disabled | Founder/operator wants a local visual cockpit over Company.OS Markdown truth. |

## Disabled By Default

```text
production writes:
schema/RLS/auth changes:
public publishing:
external outreach:
new spend:
deploy:
merge:
direct Plane Done:
worker durable memory writes:
scheduled autonomy:
```
