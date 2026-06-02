# Client Installable Work Order Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Productize the autonomous Linear-driven work-order pattern so Company.OS can be installed in a new company with the same CEO/controller, C-level owner, low-cost worker, report, event, and HumanGate pipeline.

**Architecture:** Keep the canonical doctrine in `docs/operations/`, mirror installable artifacts into `kits/company-os-kit/.company-os/`, and update the public entry points so future sessions and clients find the same setup path. The pipeline remains generic and avoids ARES, private memory, customer data, or live credential assumptions.

**Tech Stack:** Markdown operating docs, Company.OS Kit templates, Linear execution ledger, headless Linear helper, cost router, agent event ledger, runtime auth preflight.

---

## Files

- Create: `docs/operations/client-installable-autonomous-work-order-pipeline.md`
- Create: `kits/company-os-kit/.company-os/operations/autonomous-work-order-pipeline.md`
- Create: `kits/company-os-kit/.company-os/operations/workspace-registry.example.json`
- Create: `kits/company-os-kit/.company-os/operations/automation-registry.example.md`
- Create: `kits/company-os-kit/.company-os/templates/linear-worker-issue-template.md`
- Modify: `docs/system-index.md`
- Modify: `README.md`
- Modify: `docs/bootstrap/fresh-company-setup.md`
- Modify: `docs/operations/operating-system-setup-checklist.md`
- Modify: `docs/operations/autonomous-work-order-doctrine.md`
- Modify: `kits/company-os-kit/README.md`

### Task 1: Canonical Client Pipeline Doc

- [ ] **Step 1: Create the canonical operations doc**

Create `docs/operations/client-installable-autonomous-work-order-pipeline.md` with:

- sales-safe positioning
- installation phases
- minimal architecture
- roles and HumanGate semantics
- Linear issue contract
- scheduler lifecycle
- cost-router and worker routing
- privacy/redaction rules
- readiness checklist
- first pilot pattern
- package boundaries for client implementation

- [ ] **Step 2: Verify no private data leaked**

Run:

```bash
rg -n "ARES|Fyn|Mathias|[SOURCE_WORKSPACE]|mheinke|bio-os|private|customer|\\.env|sk-|ghp_|lin_api_" docs/operations/client-installable-autonomous-work-order-pipeline.md
```

Expected:

```text
No matches except generic words like private if used as a policy label.
```

### Task 2: Installable Kit Mirror

- [ ] **Step 1: Add kit pipeline guide**

Create `kits/company-os-kit/.company-os/operations/autonomous-work-order-pipeline.md` as the lightweight local runtime guide installed into a new company repo.

- [ ] **Step 2: Add workspace registry example**

Create `kits/company-os-kit/.company-os/operations/workspace-registry.example.json` with generic keys:

```json
{
  "schema_version": "company-os-workspace-registry/v1",
  "company": {
    "name": "Example Company",
    "timezone": "Europe/Berlin",
    "developer_root": "${DEVELOPER_ROOT}"
  },
  "workspaces": {
    "company-os": {
      "path": "${COMPANY_OS_ROOT}",
      "type": "operating-system",
      "linear_team": "OPS",
      "default_controller": "codex"
    },
    "product": {
      "path": "${DEVELOPER_ROOT}/product",
      "type": "product",
      "linear_team": "ENG",
      "default_controller": "codex"
    }
  }
}
```

- [ ] **Step 3: Add automation registry example**

Create `kits/company-os-kit/.company-os/operations/automation-registry.example.md` with the minimum recurring jobs for a new company.

- [ ] **Step 4: Add Linear worker template**

Create `kits/company-os-kit/.company-os/templates/linear-worker-issue-template.md` using the parseable fields required by Company.OS.

### Task 3: Entry Point Updates

- [ ] **Step 1: Update system index**

Add a Quick Load Map row for the client-installable work-order pipeline.

- [ ] **Step 2: Update README**

Add the new operations doc to Quick Start and Repository Status.

- [ ] **Step 3: Update fresh company setup**

In Phase 9, add the client-installable pipeline doc and kit mirror files to the install list.

- [ ] **Step 4: Update setup checklist**

Add a resale/client pipeline readiness section.

- [ ] **Step 5: Update autonomous work-order doctrine**

Point implementers to the client-installable pipeline when packaging for another company.

- [ ] **Step 6: Update kit README**

Document the new `.company-os/operations/` and `.company-os/templates/` files.

### Task 4: Verification

- [ ] **Step 1: Placeholder scan**

Run:

```bash
rg -n "TBD|TODO|FIXME|PLACEHOLDER|\\[CLIENT\\]|\\[COMPANY\\]" docs/operations/client-installable-autonomous-work-order-pipeline.md kits/company-os-kit/.company-os
```

Expected:

```text
No matches.
```

- [ ] **Step 2: Private marker scan**

Run:

```bash
rg -n "ARES|Fyn|Mathias|[SOURCE_WORKSPACE]|mheinke|bio-os|sk-|ghp_|lin_api_|SERVICE_ROLE|PRIVATE_KEY" docs/operations/client-installable-autonomous-work-order-pipeline.md kits/company-os-kit/.company-os
```

Expected:

```text
No matches.
```

- [ ] **Step 3: Git status scope**

Run:

```bash
git status --short
```

Expected:

Only the planned docs and kit files are changed, plus any pre-existing unrelated local changes.
