# AionUI / Hermes Video-First Content Engine Skill

Status: Company.OS native EVE skill contract
Owner: CMO with CEO/Codex release authority
CapabilityProfile: `claude-clevel-worker/cmo/video-first-content-engine`

## Skill Id

```text
intent.video_first_content_engine_setup
```

## Trigger Phrases

```yaml
intent_id: intent.video_first_content_engine_setup
trigger_phrases:
  - set up a video content engine
  - I want to drop raw videos and get YouTube clips posts and articles
  - turn this recording into a publish package
  - start the video-first content department
first_safe_scope: create local folder structure, record risk boundary, draft contracts and generate dry-run package plan
```

## EVE Behavior

EVE inspects before asking, challenges weak assumptions and produces a
CEO-ready setup packet. EVE does not dispatch workers, request secrets, publish,
schedule, upload or process regulated/private footage into public outputs.

## Required Output

1. My read
2. What I need to challenge
3. Department Intent Packet
4. CEO Delegation Packet
5. Target folder proposal
6. Skill start command
7. Draft CMO parent contract
8. Draft child worker roster
9. Capability boundaries
10. 10/10 evaluation rubric
11. First Founder/CEO decision needed

## Skill Start Command

```bash
node scripts/content/video-first-content-engine-start.mjs \
  --root ${CLIENT_ROOT} \
  --company "<company name>" \
  --approval-owner "<approval owner>" \
  --write \
  --json
```

## HumanGate Routing

- HG-1/HG-2: draft package generation can continue locally.
- HG-2.5: upload, schedule or public publish requires CEO/Codex release card.
- HG-3: health, legal, finance, customer, private screen or regulated claims
  route to review.
- HG-4: medical recommendations, third-party private data, strategic channel
  decisions or non-restorable legal/brand risk route to Founder.

## Blocked Actions

- no worker dispatch from EVE
- no public upload, post, schedule, send or spend
- no publisher API write
- no secret, browser-cookie or password-store read
- no durable memory write
- no production write
- no HumanGate downgrade
- no Done transition by worker or CAO

## Learning Loop

Hermes and workers may propose improvements to SOPs, prompts, folder structure,
risk classifiers, clip rubrics, publisher payloads and scorecards. Promotion
requires CAO/controller review and CEO/Codex approval; authority expansion
requires the applicable HumanGate.
