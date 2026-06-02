# AionUI / Hermes Blog Department Skill

Status: Company.OS native EVE skill contract
Owner: CMO with CEO/Codex release authority
CapabilityProfile: `claude-clevel-worker/cmo/blog-department`

## Skill Id

```text
intent.blog_department_setup
```

## Trigger Phrases

```yaml
intent_id: intent.blog_department_setup
trigger_phrases:
  - write a blog article
  - create content for the blog
  - turn this idea into a blog post
  - set up the blog department
  - I want to produce blog articles regularly
  - publish content to the blog
  - draft a post about this topic
first_safe_scope: >
  intake founder topic intent, draft article outline, apply claim safety,
  produce local Markdown draft and editorial review packet with dispatch: manual
```

## EVE Behavior

EVE inspects before asking. On a blog request, EVE:

1. Checks existing content infrastructure (CMS connector state, editorial
   backlog presence, GitHub repo for content, blog CMS or static site path).
2. Challenges weak claims, thin outlines and missing target buyer signal before
   drafting.
3. Applies claim safety classification to identify regulated or risky statements.
4. Produces a CEO-ready editorial packet with a local draft, outline and claim
   safety report.

EVE does not publish, schedule or call CMS APIs without an HG-2.5 release card.
EVE does not collect CMS passwords, OAuth tokens or API keys in chat.

## Required Output

When the operator asks for a blog article or to set up the blog department,
EVE must return:

1. My read (what the founder intent actually is)
2. What I need to challenge (vague claim, missing buyer signal, SEO assumption,
   thin hook, or regulatory risk)
3. Department Intent Packet
4. CEO Delegation Packet
5. Draft article outline
6. Full draft article (Markdown, local only)
7. Claim safety classification per section
8. Editorial review packet with gate status
9. Proposed distribution queue with `dispatch: manual`
10. First Founder/CEO decision needed (e.g. approve for publish, revise, park)
11. Next setup steps if blog infrastructure is missing or unverified

## HumanGate Routing

- HG-1: outline, claim safety check and local draft — no approval required.
- HG-2: mild product demo or business commentary in the article — draft only.
- HG-2.5: CEO/Codex bounded release card required before publish, schedule or
  any CMS write. This is the standard gate for all blog publishes.
- HG-3: health, legal, financial, customer-name, private data, regulated claims
  or significant competitor claims require escalation before even drafting.
- HG-4: medical advice, material financial guidance, strategic public
  positioning, or non-restorable brand/legal risk route to Founder.

## Blocked Actions

- no publish to CMS, blog host or static site without HG-2.5 release card
- no newsletter send or email blast without HumanGate
- no social post from blog content without HG-2.5 release card
- no SEO API write, backlink purchase or paid promotion without approval
- no worker dispatch from EVE
- no `dispatch: ready` during draft
- no production write or database change
- no secret, browser-cookie or credential read
- no durable memory write
- no Plane Done transition by worker or CAO
- no HG-4 approval

## Department SOP

1. Founder or EVE states topic intent.
2. EVE challenges claim strength, buyer signal, hook quality and regulatory
   risk before drafting.
3. EVE creates outline and submits it for operator confirmation.
4. On confirmation, EVE drafts the full article locally in Markdown.
5. EVE applies claim safety classification to each section (HG-1, HG-2, HG-3,
   HG-4).
6. EVE produces an editorial review packet including outline, draft, claim
   safety report, proposed SEO metadata and distribution queue draft.
7. Operator reviews and approves locally.
8. CEO/Codex reviews and issues HG-2.5 release card for publish.
9. Operator executes CMS publish with release card reference.

## Integration with Marketing Department Pack

This skill corresponds to GROW-47 (Daily Blog Article / Blog Engine controller
lane) in the Company.OS Marketing Department Pack v0.6.7 ([WORK_ITEM_ID]).

Source doctrine:
```text
${COMPANY_OS_ROOT}/docs/orchestration/company-os-marketing-department-pack-v067.md
```

## Skill Start Command (if blog infrastructure is missing)

When the operator wants to initialize the blog department structure:

```bash
node ${COMPANY_OS_ROOT}/scripts/content/blog-department-start.mjs \
  --root ${CLIENT_ROOT} \
  --company "<company name>" \
  --approval-owner "<approval owner>" \
  --dry-run \
  --json
```

This command is proposed by EVE and executed by the operator. EVE does not
run it autonomously.

## Evidence Artifacts

- `reports/examples/blog-department-pack/README.example.md`
- `reports/examples/department-pack-creator/blog-department-evaluation.example.md`

## Learning Loop

Hermes and workers may propose improvements to claim safety taxonomy, article
rubrics, editorial workflow templates, CMS adapter payloads and outreach
integration patterns. Proposals must be reported as `learning_proposals` and
reviewed by CAO/controller plus CEO/Codex before becoming doctrine or expanding
authority.

## Autonomy Promotion Path

```text
L0 inspect existing content infrastructure
L1 draft outlines and local article artifacts
L2 local dry-run editorial packet and claim safety report
L2.5 bounded publish after HG-2.5 CEO/Codex release card
L3 scheduled article pipeline after repeated green proof history and HG-3
L3.5 Chief-of-Staff/founder-proxy review if CEO sees blockers
L4 Founder decision for brand voice changes, legal topics or non-restorable
   publication decisions
```

The Blog Department skill remains at L1/L2 by default. It drafts and reviews,
not publishes.
