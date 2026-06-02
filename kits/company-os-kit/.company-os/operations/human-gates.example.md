# Company.OS Human Gates

Status: example, copy to `.company-os/operations/human-gates.md`
Use for: naming who can approve actions before the first pilot runs

## Owners

| Gate | Owner | Backup | Notes |
|---|---|---|---|
| HG-0 | Founder/operator |  | Read-only reports and local file changes. |
| HG-1 | Founder/operator |  | Low-risk reversible edits. |
| HG-2 | CEO/controller |  | Bounded worker runs and non-production actions. |
| HG-2.5 | CEO/controller |  | Reversible release actions with CAO/controller evidence. |
| HG-3 | Founder or delegated executive |  | Production writes, deploy, schema/RLS/auth, spend. |
| HG-3.5 | Chief-of-Staff / founder proxy |  | Founder-intent review packet before HG-4 escalation. |
| HG-4 | Founder | none | Strategic, irreversible, customer/legal/finance commitments. |

## First-Pilot Ceiling

```text
maximum_autonomy_ceiling: L2
default_worker_dispatch: manual
default_runtime_mode: read-only or dry-run
plane_done_authority: CEO/Founder only
```

## Blocked Until Explicit Release Card

- Production database writes.
- Schema, RLS, auth or service-role changes.
- Public publishing, sending, outreach or paid distribution.
- Customer, finance, legal, health or medical commitments.
- New spend.
- Merge, deploy or release.
- Durable memory writes by workers.
- Direct Plane `Done` transitions by workers or CAO.

## Review Rhythm

```text
morning report owner:
weekly pilot review owner:
first department wedge:
first Plane parent:
first controller decision path:
```
