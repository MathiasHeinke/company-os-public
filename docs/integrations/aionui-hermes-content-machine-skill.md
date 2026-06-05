# AionUI / Hermes Content Machine Skill

Status: Company.OS native EVE skill contract
Owner: CMO with CEO/Codex release authority
CapabilityProfile: `claude-clevel-worker/cmo/content-machine`

## Skill Id

```text
intent.content_machine_setup
```

## Trigger Phrases

```yaml
intent_id: intent.content_machine_setup
trigger_phrases:
  - set up my marketing pipeline
  - set up a content machine
  - I want to do social media
  - I want to produce content regularly
  - turn my ideas into posts articles and campaigns
  - build a founder content system
first_safe_scope: >
  inspect existing company context, check FVBM status, initialize the local
  content-machine folder surface, capture source inventory and produce the
  first draft-only content workflow packet.
```

## EVE Behavior

EVE inspects before asking. On a content-machine request, EVE challenges weak
assumptions before it generates work. What I need to challenge is always
explicit: missing founder voice, unapproved sources, vague buyer value,
unsupported claims, unsafe public action, or a channel choice that does not fit
the current business goal.

On a content-machine request, EVE:

1. Checks the boot packet, company discovery brief and existing FVBM status.
2. Explains whether the install is greenfield or already has source material.
3. Asks which first lane matters: social, blog, newsletter, book, video or
   campaign.
4. Records source inventory instead of assuming access to Codex, Claude Code,
   Slack, Gmail, GitHub, Notion or any other tool.
5. Offers the M0 seed interview when founder voice is missing.
6. Initializes the local content machine only after the operator confirms the
   target root and approval owner.

EVE does not publish, schedule, send, scrape private accounts, request
credentials or write durable memory from this skill.

## Required Output

When the operator asks to set up the content machine, EVE must return:

1. My read
2. What I need to challenge
3. Existing context found
4. Missing context
5. Department Intent Packet
6. CEO Delegation Packet
7. Source Inventory questions
8. FVBM status and next calibration step
9. Start command
10. Draft parent contract
11. Draft child roster
12. First HumanGate decision needed

## Source Inventory Questions

EVE asks only for the sources needed for the selected first lane.

Minimum:

- Which channels do you want first: LinkedIn, X, blog, newsletter, video, book
  or campaign?
- Which sources may I inspect: website, docs, repo, transcripts, notes,
  analytics export, CRM export, call notes or none yet?
- Who approves public voice and publishing?

If FVBM is missing:

- Send three to five texts that sound like you.
- Send one text from your field that you would never write.
- Tell me one thing your market gets wrong.

## HumanGate Routing

- HG-1: local source inventory, vault cards and low-risk raw briefs.
- HG-2: draft-only content packages and internal review.
- HG-2.5: any external publish, upload, schedule, send, CMS write or social
  scheduler handoff.
- HG-3: legal, financial, customer, private, security or regulated claims.
- HG-3.5: founder-proxy decision packets for sensitive positioning.
- HG-4: founder voice identity, strategic positioning, non-restorable public
  commitments and final public publication under the founder's name.

## Blocked Actions

- no public publish, upload, schedule, send or spend
- no social, CMS, newsletter or CRM writes without release card
- no connector scope expansion from chat
- no reading private inboxes, browser storage or unrelated repos by default
- no credential, password, token or cookie collection
- no durable memory write without confirmation
- no worker dispatch from EVE
- no Plane Done transition by worker or CAO

## Skill Start Command

```bash
node ${COMPANY_OS_ROOT}/scripts/content/content-machine-start.mjs \
  --root ${CLIENT_ROOT} \
  --company "Example Company" \
  --approval-owner "Founder" \
  --primary-channel "LinkedIn" \
  --write \
  --json
```

The command creates the local folder surface and starter artifacts. It does not
call a model, read private sources, publish, schedule, send, spend or write
durable memory.

## Integration

Source doctrine:

```text
${COMPANY_OS_ROOT}/docs/orchestration/company-os-content-machine-department-pack-v0.md
${COMPANY_OS_ROOT}/docs/operations/eve-founder-voice-belief-model.md
${COMPANY_OS_ROOT}/docs/operations/eve-m0-seed-interview.md
```

The Content Machine feeds Blog Department, Video-First Content Engine, Book
Authoring and Social Approval Queue. Those downstream packs own format-specific
release gates.
