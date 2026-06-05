# Command EVE Daily Posting Automation

Status: v1 image-first queue
Owner: Founder / CMO
Start date: 2026-06-03

## Purpose

Prepare a daily social posting queue that makes Command EVE visible as the
operating system behind the marketing itself.

The automation prepares drafts, claim notes, visual prompts, Image 2.0 assets,
scheduling suggestions and a Founder approval checklist. It does not publish,
schedule, send, spend, scrape private accounts or bypass HumanGate approval.

Every Command EVE post that enters Upload-Post must be image-first. Text-only
Upload-Post jobs are a blocker unless the Founder explicitly asks for a
text-only exception in the same scheduling instruction.

## Cadence

Daily target mix:

- 4 German Command EVE posts for the DACH founder-led business lane
- 4 English Command EVE posts for the global founder/operator/AI-builder lane
- [SOURCE_COMPANY] Bio.OS is optional as a separate proof slot when explicitly requested

Editorial mix inside each language lane:

- 1 direct Command EVE / offer / audit / founder-round post max per language
- 3 category-leadership posts per language that teach, interpret or
  pressure-test AI work without selling the product directly
- German and English posts are sibling angles, not literal translations. Use
  the same operating thesis only when the local market frame, examples and CTA
  differ clearly.

Default channel:

- LinkedIn first
- X optional after Founder approval
- Blog only for expanded posts

Default daily windows Europe/Berlin:

- 08:40 DE Command EVE proof / POV
- 09:10 EN Command EVE category POV
- 11:20 DE Command EVE pain / governance
- 12:10 EN Command EVE agent operations / cost control
- 14:10 DE Command EVE offer / behind-the-scenes
- 15:10 EN Command EVE founder/operator narrative
- 17:20 DE Command EVE founder CTA / audit angle
- 18:10 EN Command EVE global CTA / partnership angle

If all posts go to the same LinkedIn profile, keep at least 30 minutes between
slots and watch saturation. If engagement drops, collapse to 2 DE + 2 EN per
day and move the remaining posts to a backlog queue.

## Source Of Truth

Use these files before drafting:

- `docs/strategy/command-eve-offer-v1.md`
- `docs/strategy/command-eve-outreach-kit.md`
- `assets/brand/eve-command/DESIGN.md`
- `docs/orchestration/company-os-marketing-department-pack-v067.md`
- `docs/governance/marketing-hg25-vision-release-gate.md`
- recent `reports/marketing-department-v067/daily-post-metrics-harvester-*.md`

The visual design source is `https://try.command-eve.com` and its local design
distillation at `assets/brand/eve-command/DESIGN.md`.

## Post Pillars

Command EVE:

1. AI governance: companies already use AI, but nobody steers it.
2. AI ROI: better throughput, fewer scattered tools, controlled cost.
3. Agent work reality: what current tools make possible and where they fail.
4. Founder work: context switching, approval loops, delegation and throughput.
5. Proof loop: this marketing is produced by the system.
6. Operator offer: external AI operator installs the operating layer.
7. Re-entry authority: marketing/sales operations, now run by AI.

[SOURCE_COMPANY] Bio.OS:

1. [SOURCE_COMPANY] as proof that EVE can build serious product systems.
2. Health data as cockpit, not advice.
3. Claim boundary: education, context and review, not diagnosis or treatment.

## Workflow

1. Research Scout performs a short current-topic sweep.
2. Planner selects eight topics from the pillars: four German, four English.
3. Draft producer writes platform-native LinkedIn copy in the target language.
4. Visual Director writes one visual brief per post using
   `assets/brand/eve-command/DESIGN.md`.
5. Image Director creates one final infographic image per post through the
   Codex CLI Image 2.0 lane, mirroring the [SOURCE_COMPANY] image-post pattern:
   `visual-final.md` -> `image-generation.json` -> `image.png`.
6. Image QA checks that every final Upload-Post candidate has a valid PNG,
   non-empty `image-generation.json`, Command EVE styling, orange command/gate
   accents, black/ink EVE wordmark if present, and no broken/generated gibberish
   text.
7. Claim/copy gate checks each public copy with
   `scripts/release-gates/marketing-copy-lint.mjs`.
8. CMO marks each post as `draft`, `needs_revision` or `ready_for_founder`.
9. Founder approves, rewrites or parks.
10. Only Founder or an explicitly approved release action posts externally.
11. After publishing, Performance Analyst records metrics and learnings for the
   next queue.

## Research Sweep

Every queue should inspect current signals where possible:

- OpenAI / Codex / ChatGPT product direction
- Anthropic / Claude / Claude Code / Managed Agents
- EU AI Act, AI literacy, privacy, governance and business compliance
- agent costs, token burn, runaway automation and model-routing economics
- AI in knowledge work, consulting, agencies and professional services
- creator/operator examples that make agent work concrete

Use primary sources where possible. If using secondary sources, label them as
news signals, not facts of record.

## Hard Stop Rules

- No autonomous public posting.
- No autonomous scheduling.
- No text-only Upload-Post scheduling for Command EVE unless Founder explicitly
  approves a same-run exception.
- No automatic DMs or outreach sends.
- No customer, private, finance, health or legal raw data in drafts.
- No unsupported revenue, medical, legal or partnership claims.
- No founder-voice commitment without Founder approval.
- [SOURCE_COMPANY] posts must not contain personal medical advice, diagnosis, treatment,
  dosage, sourcing or protocol guidance.
- No Upload-Post job may be marked ready without `image.png` and
  `image-generation.json` for each post.
- Generated visuals may include only short, checked infographic labels. Long
  post copy stays outside the image.

## Output Shape

Each daily queue lives at:

```text
reports/marketing/daily-posting/YYYY-MM-DD-command-eve-bilingual-queue.md
```

Required sections per post:

- channel
- language
- suggested time
- pillar
- public copy
- CTA
- visual brief
- visual prompt / overlay plan
- image path
- image generation metadata path
- claim/copy risk
- approval status
- after-publish metric fields
