# Plugin & Connector Integration Harness

Status: canonical integration doctrine (v0 — pipeline + governance contract)
Phase: governs how user/third-party plugins, connectors and skills enter Company.OS without bypassing gates
Plane: [WORK_ITEM_ID] (Welle-2B autonomy run)
Last updated: 2026-05-29

## The problem this solves

AionUi (Extension SDK, skills) and Hermes (agentskills.io standard, toolsets) are scopeless by design — a
power user can wire any capability in. That is right for the 0.001% and wrong for a governed founder shell.
The founder's question — "how well does the system integrate plugins, and can a user safely bring their own"
— is answered not by *whether* a plugin can be loaded (it can, via the substrate) but by *whether its
autonomy is governed*. A plugin extends the **body**; its **authority** must route through Company.OS.

Core rule: **a plugin may be discovered and proposed freely; installation into any runtime-capable lane is
scoped/sandboxed, and autonomy is earned only through the registry + gates + eval.**

## The integration pipeline

```text
plugin/connector/skill
  -> 1. registry declaration   (capability registered, never implicit)
  -> 2. scope                  (allowed read/write paths, blocked actions, data boundary)
  -> 3. gate                   (HumanGate level + Stage 0.5/0.65 for any dispatchable use)
  -> 4. eval                   (capability-pack evaluator proof before autonomy)
  -> 5. autonomy               (granted per evidence; sunset + re-eval; never self-granted)
```

A plugin that is only at step 1-2 is *available to the user manually or in a sandboxed/inert lane*, not
*autonomous*. Autonomy (the system using it unattended) requires steps 3-5.

### 1. Registry declaration
Every plugin/connector/skill is declared in `registries/capabilities/company-os.json` (the existing
Capability Registry, validated by `scripts/capabilities/capability-registry-core.mjs`). No capability is
visible to a runtime worker unless registered. AionUi Extension-SDK skills and Hermes/agentskills.io skills
are adopted as the *substrate*, but each must have a registry entry to be governed.

### 2. Scope
Each entry declares: `allowed_read_paths`, `allowed_write_paths`, `blocked_actions`, `data_boundary`
(what private/customer/secret data it must never touch), and `network_scope`. A connector that needs
credentials declares the auth lane (vault-scoped, never raw secrets in repo or prompt).

### 3. Gate
Any *dispatchable* use of the plugin carries a HumanGate level. New/unproven plugins default to HG-2
(bounded, reversible). Production/spend/send/publish capabilities are HG-2.5/HG-3 and never auto-granted to
a fresh plugin. Stage 0.5 (contract quality) and Stage 0.65 (runtime executability) apply before any
`dispatch: ready`.

### 4. Eval
Before a plugin gets autonomy, it passes the capability-pack evaluator
(`scripts/orchestration/company-os-department-pack-evaluator.mjs`, rubric in
`docs/templates/company-os-capability-pack-eval-rubric.md`). The eval proves the plugin does what it claims,
inside its declared scope, with evidence. No eval pass → no autonomy.

### 5. Autonomy (earned, sunset, re-eval)
Autonomy is granted per evidence and is reversible: it carries a sunset (re-eval required after N days or
M uses) and is never self-granted by the plugin or by EVE. This is the Earned-Authority / Trust-Ledger
principle (3.x) applied at the plugin layer from day one, so the pattern is consistent later.

## The "user finds a GitHub repo" flow (founder's example)

When the user finds a capability on GitHub and wants it in EVE:
1. EVE reads the repo (read-only) and proposes a registry declaration + scope (proposal-only).
2. The user/CEO reviews the proposed scope + gate.
3. Any install/test happens in a sandboxed or inert lane until the proof passes.
4. The capability-pack evaluator runs a proof.
5. On pass, the capability is registered at HG-2; autonomy widens only with more evidence.

EVE never self-installs autonomy. It proposes; the gate decides. This is the safe version of
"EVE develops itself" (T7) at the plugin boundary.

## Hard boundaries

- No plugin enables AionUi/Hermes native YOLO / Full-Auto / Team / Cron / delegation autonomy outside
  Company.OS governance (the shadow-autonomy audit, [WORK_ITEM_ID], keeps these disabled).
- No plugin gets credentials except through the declared vault-scoped auth lane; never raw secrets.
- No plugin writes durable memory without the Honcho boundary + correct workspace/peer.
- No plugin marks Plane Done, deploys, publishes, sends or spends without its declared HumanGate release.
- A plugin's `data_boundary` is enforced: a marketing plugin never sees the health domain, etc. (T13
  domain scoping applies).

## Implementation order

1. (this doc) the pipeline + governance contract. **report-only.**
2. Registry schema fields for plugins/connectors (scope, gate, eval-status, autonomy, sunset).
3. A `plugin install proposal` packet shape (what EVE proposes; what the gate reviews).
4. Wire the capability-pack evaluator as the autonomy gate.
5. Adapter notes for AionUi Extension-SDK + Hermes/agentskills.io substrate.

## Non-goals (v0)

- No public plugin marketplace (that is 1.5).
- No auto-install of any capability.
- No change to the canonical execution ledger (Plane) or to who owns HG-4.
