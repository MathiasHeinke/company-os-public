# Content Machine Domain Pack Setup

Status: installable guided-pilot runbook

## Setup Loop

1. Confirm company, offer, audience, first channel and approval owner.
2. Check whether a Founder Voice and Belief Model exists. If not, run the M0
   seed interview before claiming voice fidelity.
3. Record allowed source classes in Source Inventory. Do not inspect private
   tools unless the operator explicitly approves the source and scope.
4. Initialize the local project:

   ```bash
   node scripts/content/content-machine-start.mjs \
     --root ${CLIENT_ROOT} \
     --company "Example Company" \
     --approval-owner "Founder" \
     --primary-channel "LinkedIn" \
     --write \
     --json
   ```

5. Create first vault cards from approved source material or manual founder
   answers.
6. Create a raw founder brief before drafting strong founder-voice content.
7. Run council review before derivatives or release packets.
8. Route release packets into the existing Social, Blog, Video or Book gates.

## Folder Contract

```text
content/content-machine/
  00_intake/
  01_source_inventory/
  02_vault/
  03_research/
  04_founder_interviews/
  05_raw_briefs/
  06_anchor_drafts/
  07_council_reviews/
  08_derivatives/
  09_release_packets/
  10_performance/
  11_lessons/
```

## Default Boundary

Draft-only and local-first. No public publish, schedule, send, spend, connector
write, credential collection, broad private-source mining, durable memory write
or Plane Done transition.

## Required Gates

- FVBM check before founder-voice claims
- Source Inventory before reading optional tools
- council review before release packets
- claim safety before public-facing output
- quality and capability-pack evaluator gates before claiming pack readiness
- HG-2.5 before external publish, schedule, send or CMS/social write
- HG-4 for founder voice identity and strategic public positioning
