# Public Release Hygiene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert Company.OS from internal/productizable to release-gated by adding provenance, IP/naming cleanup, and secret/private-reference checks.

**Architecture:** Keep the current kit intact for internal use while documenting and preparing a public-safe release path. Do not push public; this plan only creates gates and cleanup instructions.

**Tech Stack:** Markdown, ripgrep, Git, optional gitleaks/trufflehog.

---

## Files

- Create: `docs/release/public-release-gate.md`
- Create: `docs/release/kit-provenance-matrix.md`
- Create: `docs/release/persona-ip-cleanup-plan.md`
- Modify: `reports/audits/company-os-deep-audit-synthesis-2026-05-06.md`

## Task 1: Create Release Gate

- [ ] **Step 1: Create `docs/release/public-release-gate.md`**

Use this content:

````markdown
# Public Release Gate

Company.OS must not be pushed public until every gate below passes.

## Required Gates

- Secret scan passed.
- Private-reference scan passed.
- Persona/IP cleanup complete.
- Third-party provenance matrix complete.
- License compatibility reviewed.
- `.antigravity/` naming decision documented.
- Branch protection plan exists.
- PR template exists.
- Release checklist reviewed by human.

## Commands

```bash
find . -type f \( -name '.env' -o -path '*/node_modules/*' -o -name '.DS_Store' \)
rg -n "(API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY|SERVICE_ROLE|sk-|ghp_|xoxb-|Bearer|hch-)" .
rg -n "Mathias|ARES|Fyn|Antigravity|/Users/|MAT-[0-9]+|marketing@" .
git status --short
```

## Human Gate

Public release requires Mathias/Codex approval after the gate output is attached
to Linear `[WORK_ITEM_ID]`.
````

- [ ] **Step 2: Verify release gate exists**

Run:

```bash
test -f docs/release/public-release-gate.md && echo ok
```

Expected:

```text
ok
```

## Task 2: Create Kit Provenance Matrix

- [ ] **Step 1: Create `docs/release/kit-provenance-matrix.md`**

Use this table structure:

```markdown
# Kit Provenance Matrix

| Path | Type | Origin | License/Permission | Public Status | Action |
|---|---|---|---|---|---|
| `kits/company-os-kit/.agents/workflows/agentic-plan.md` | workflow | internal Antigravity Kit | internal | hold | review and assign owner |
| `kits/company-os-kit/.agents/workflows/deep-audit.md` | workflow | internal Antigravity Kit | internal | hold | review and add eval case |
| `kits/company-os-kit/.antigravity/personas/` | personas | internal Antigravity Kit | mixed/IP risk | block | rebrand or move private |
| `kits/company-os-kit/.antigravity/knowledge/` | knowledge | internal Antigravity Kit | internal | hold | scan for ARES/private references |
| `kits/company-os-kit/scripts/autoresearch-bioengine/` | eval example | ARES-derived | internal | block public | make optional private example or sanitize |
```

- [ ] **Step 2: Expand matrix from file list**

Run:

```bash
find kits/company-os-kit -maxdepth 3 -type f | sort
```

Add rows for any public-risk paths not covered by the starter rows.

## Task 3: Create Persona/IP Cleanup Plan

- [ ] **Step 1: Create `docs/release/persona-ip-cleanup-plan.md`**

Use this content:

```markdown
# Persona IP Cleanup Plan

## Rule

Public Company.OS roles must be archetypal, not named after living people,
recently deceased people, brands, or fictional characters.

## Cleanup Mapping

| Current Persona | Public Archetype | Action |
|---|---|---|
| `john-carmack.md` | `runtime-engineer.md` | rebrand |
| `steve-jobs.md` | `product-vision-reviewer.md` | rebrand |
| `elon-musk.md` | `first-principles-operator.md` | rebrand |
| `andrej-karpathy.md` | `ai-systems-researcher.md` | rebrand |
| `daniel-kahneman.md` | `decision-bias-reviewer.md` | rebrand |
| `don-draper.md` | `brand-copy-strategist.md` | rebrand |
| `mr-robot.md` | `security-adversary.md` | rebrand |
| `sherlock-holmes.md` | `forensic-auditor.md` | rebrand |
| `cypher-sre.md` | `sre-resilience-reviewer.md` | rebrand |

## Private Alias Policy

Internal cultural aliases may remain only in private workspaces. They must not
ship in the MIT track by default.
```

- [ ] **Step 2: Verify risky names still exist before cleanup**

Run:

```bash
rg -n "john-carmack|steve-jobs|elon-musk|don-draper|mr-robot|sherlock" kits/company-os-kit/.antigravity/personas docs/release/persona-ip-cleanup-plan.md
```

Expected: matches appear until the cleanup is executed.

## Task 4: Run Private-Reference Scan

- [ ] **Step 1: Run current scan**

Run:

```bash
rg -n "Mathias|ARES|Fyn|Antigravity|/Users/|MAT-[0-9]+|marketing@" .
```

Expected:

```text
Matches exist today. This is why public release remains blocked.
```

- [ ] **Step 2: Record result**

Append a dated scan summary to `docs/release/public-release-gate.md`:

```markdown
## Scan Result - 2026-05-06

Status: blocked

Reason: internal references still exist in kit/docs and need cleanup or private
classification before public release.
```

## Task 5: Update Audit Synthesis

- [ ] **Step 1: Record release hygiene plan**

Update the iteration section in `reports/audits/company-os-deep-audit-synthesis-2026-05-06.md`:

```markdown
Public Release Hygiene Plan Status: ready for execution
Target score lift: Company.OS Kit 5.0 -> 6.0, GitHub/release 4.0 -> 5.8, Security/compliance 5.0 -> 6.0
```

- [ ] **Step 2: Verify**

Run:

```bash
git diff --check
```

Expected: no output.
