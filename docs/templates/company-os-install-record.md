# Company.OS Install Record

Status: template
Use for: pinning the exact Company.OS baseline installed into a company or workspace

## Install Metadata

```text
Company.OS version:
Autonomy profile:
Maturity score:
Install date:
Installed by:
Client/company:
Execution ledger:
Workspace registry:
Automation registry:
HumanGate owner:
First pilot issue:
Known disabled lanes:
```

## Governance Baseline

```text
HG-0 owner:
HG-1 owner:
HG-2 owner:
HG-3 owner:
Maximum autonomy ceiling:
Default worker mode:
Default branch pattern:
Report root:
Event ledger:
Cost ledger:
```

## Required First-Pilot Gates

- [ ] Source-of-truth files linked
- [ ] Workspace registry promoted from example to active registry
- [ ] Automation registry promoted from example to active registry
- [ ] Runtime auth preflight green
- [ ] Git worktree hygiene green
- [ ] Budget brake configured
- [ ] Artifact Truth configured
- [ ] First issue passes the 10/10 work-order quality bar
- [ ] HG-3 boundaries reviewed with the founder or delegated human
- [ ] Morning brief destination defined

## Disabled Lanes

List every lane that is intentionally unavailable during the first rollout.

```text
- Merge:
- Push:
- Deploy:
- Production writes:
- Schema/RLS/auth:
- Public publishing:
- Outreach:
- New spend:
- Durable memory writes by workers:
- Direct Done transitions:
```

## Upgrade Notes

Record every upgrade with date, previous version, next version, changed gates,
new disabled lanes and evidence from the controller.
