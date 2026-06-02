# Pilot Operator Handoff And Pricing Test

Status: 0.7.2 guided pilot package
Date: 2026-05-25
Use for: installing Company.OS for a first paid non-founder pilot without
pretending it is self-serve

## Offer Boundary

This package supports a guided, done-for-you pilot. It is not an unrestricted
self-serve product.

Default commercial test:

```text
setup_fee: operator-defined
monthly_pilot_fee: 300-500 EUR
pilot_length: 30 days
autonomy_ceiling: L2
first_department: one wedge only
included: install, discovery, first packet, first Plane parent/children,
          read-only/manual worker smoke, weekly operator handoff
excluded: production writes, public sending/publishing, spend, deploy,
          schema/RLS/auth, worker Done, autonomous scheduler
```

Pricing changes, customer commitments and legal terms remain HG-3/HG-4.

## Operator Handoff Checklist

Before onboarding a pilot client:

- [ ] Company.OS version pinned.
- [ ] Installer dry-run and fresh-target install pass.
- [ ] `.company-os/install-record.md` filled.
- [ ] `.company-os/operations/software-stack.md` filled.
- [ ] `.company-os/operations/human-gates.md` filled.
- [ ] `.company-os/onboarding/company-intake.json` confirmed by the operator.
- [ ] `first-company-packet.mjs` generated discovery brief and Plane draft.
- [ ] Plane workspace/project and `role:*` labels created.
- [ ] First parent and 3-7 child contracts created with `dispatch: manual`.
- [ ] `/update_eve` dry-run report generated.
- [ ] AionUI/Hermes/EVE sidecar is either out of scope or sandbox-smoked.
- [ ] Client understands blocked actions and approval surfaces.

## Pilot Weekly Rhythm

```text
week_0: install + discovery + first company packet
week_1: first department read-only report
week_2: revise worker contracts + improve packet/checklist
week_3: run one manual worker smoke through CAO/controller
week_4: decide continue / park / expand to second wedge
```

## Client-Facing Handoff Packet

The operator gives the client:

- install record summary
- enabled/disabled software stack
- HumanGate owner table
- first department recommendation
- first Plane parent and child list
- first report artifact path
- update report path
- blocked actions
- next approval request

Do not give the client raw internal reports, private sidecar paths, secrets,
Founder memory, live metrics ledgers or unrelated Plane work.

## Success Criteria

The pilot is commercially useful if it produces at least one of:

- a better weekly decision report than the client had before
- a reusable department packet
- a credible list of automatable recurring work
- a clear reason to park Company.OS for this company

The pilot is not successful merely because the kit installed.

## Stop Criteria

Stop or park if:

- the company cannot name a HumanGate owner
- the first wedge requires production writes or public sends immediately
- the operator cannot produce source-of-truth files
- the client wants unsupervised autonomy before CAO/controller evidence
- the commercial expectation depends on guaranteed savings or guaranteed
  revenue lift
