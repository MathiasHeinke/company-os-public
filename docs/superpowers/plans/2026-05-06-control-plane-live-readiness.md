# Control Plane Live Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Company.OS technically ready for a safe read-only Linear live pilot without enabling autonomous edits.

**Architecture:** Keep executable dispatcher code in the existing runtime repo, but document Company.OS registry policy and GitNexus state in Company.OS. The first live pilot must prove lock, state, ledger, report, and comment behavior on one harmless issue.

**Tech Stack:** Linear, Node dispatcher in `[SOURCE_WORKSPACE]`, GitNexus CLI, Markdown.

---

## Files

- Modify: `${ARES_WEBSITE_ROOT}/scripts/agent-control-plane/workspaces.json`
- Create: `docs/operations/control-plane-live-readiness.md`
- Modify: `reports/audits/company-os-deep-audit-synthesis-2026-05-06.md`

## Task 1: Decide Company.OS Registry Policy

- [ ] **Step 1: Add read-only Company.OS registry entry**

If Company.OS should be dispatchable, add this object to the runtime registry in
`${ARES_WEBSITE_ROOT}/scripts/agent-control-plane/workspaces.json`:

```json
{
  "key": "Company.OS",
  "path": "${COMPANY_OS_ROOT}",
  "linearAliases": ["Company.OS", "company-os", "company os"],
  "allowEdits": false,
  "allowedModes": ["plan", "audit", "triage", "memory-proposal"]
}
```

If Company.OS should be command-only, do not add the object. Instead document the
decision in `docs/operations/control-plane-live-readiness.md`.

- [ ] **Step 2: Validate JSON**

Run:

```bash
node -e "JSON.parse(require('fs').readFileSync('${ARES_WEBSITE_ROOT}/scripts/agent-control-plane/workspaces.json','utf8')); console.log('ok')"
```

Expected:

```text
ok
```

## Task 2: Document Live Readiness

- [x] **Step 1: Create readiness doc**

Create `docs/operations/control-plane-live-readiness.md` with:

```markdown
# Control Plane Live Readiness

## Purpose

This document gates Company.OS and related active workspaces before live Linear
agent dispatch.

## Company.OS Registry Decision

Status: pending | dispatchable-read-only | command-only

Decision:

Reason:

## Required Proof Before `--linear-live`

- `LINEAR_API_KEY` available only in local environment, not committed.
- target issue is harmless and read-only.
- target workspace has `allowEdits: false`.
- workflow states are mapped or documented as skipped.
- remote lock comment is posted.
- state transition to `ai-running` is attempted or documented as skipped.
- report path is written.
- outcome comment is posted.
- ledger append is visible.
- no persistent memory write.
- no direct `Done` transition.

## State Mapping

| Logical State | Linear State |
|---|---|
| ai-ready | |
| ai-running | |
| ai-blocked | |
| needs-human | |
| needs-audit | |
| ready-for-review | |

## First Pilot Candidate

Issue:
Workspace:
Agent:
Mode:
RunAt:
HumanGate:
```

- [x] **Step 2: Verify no live secret appears**

Run:

```bash
rg -n "LINEAR_API_KEY=.*|sk-|Bearer|hch-" docs/operations/control-plane-live-readiness.md
```

Expected: no output.

## Task 3: Check GitNexus Company.OS

- [ ] **Step 1: Run GitNexus status**

Run:

```bash
npx gitnexus status
```

Expected now:

```text
Repository not indexed.
Run: gitnexus analyze
```

- [ ] **Step 2: Decide whether to index**

If approved in-session, run:

```bash
npx gitnexus analyze
npx gitnexus status
```

Expected:

```text
Status: up-to-date
```

If not approved, record `Company.OS GitNexus index: pending` in the readiness doc.

## Task 4: Dry-Run A Harmless Issue Plan

- [ ] **Step 1: Prepare a local fixture issue JSON**

Create or reuse a local tmp issue fixture in the runtime repo that contains:

```markdown
Agent: claude
Mode: audit
Workspace: Company.OS
Dispatch: manual
RunAt:
DependsOn:
Scope: Read only the Company.OS README and report missing release gates.
Acceptance Criteria:
- report path exists
- no file edits
- no Linear Done transition
Gates:
- read-only
HumanGate:
- public release remains blocked
Reporting:
- outcome comment with report path
```

- [ ] **Step 2: Run dispatcher dry-run**

Run from `${ARES_WEBSITE_ROOT}`:

```bash
node scripts/agent-control-plane/dispatcher.mjs run \
  --issue-json tmp/linear-agent-queue.json \
  --completed-json tmp/linear-completed.json \
  --ledger tmp/agent-runs/dispatch-ledger.json \
  --out tmp/company-os-live-readiness-dry-run.json
```

Expected:

```text
No external worker starts because `--execute` is absent.
```

## Task 5: Update Audit Synthesis

- [x] **Step 1: Record readiness outcome**

Update the iteration section in `reports/audits/company-os-deep-audit-synthesis-2026-05-06.md`:

```markdown
Control Plane Readiness Plan Status: manual live pilot passed
Target score lift: Linear runtime 5.0 -> 6.5, GitNexus Company.OS 2.0 -> 6.5, Automation/runtime 5.0 -> 6.2
```

- [x] **Step 2: Verify intended scope**

Run:

```bash
git diff --check
git status --short
```

Expected:

```text
No whitespace errors.
Only Company.OS docs plus optional runtime registry file changed.
```
