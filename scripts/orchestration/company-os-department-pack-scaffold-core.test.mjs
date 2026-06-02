import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildDepartmentPackScaffold,
  validateDepartmentPackInput,
  writeDepartmentPackScaffold,
} from "./company-os-department-pack-scaffold-core.mjs";

const SAMPLE_INPUT = Object.freeze({
  root: "/repo",
  packId: "customer-support-kb",
  name: "Customer Support KB",
  ownerRole: "role:coo",
  clientDomain: "customer-support-kb",
  date: "2026-05-26",
});

const EXPECTED_RELATIVE_PATHS = Object.freeze([
  "docs/orchestration/company-os-customer-support-kb-department-pack-v0.md",
  "kits/company-os-kit/.company-os/domain-packs/customer-support-kb/setup.md",
  "kits/company-os-kit/.agents/workflows/customer-support-kb-setup.md",
  "docs/integrations/aionui-hermes-customer-support-kb-skill.md",
  "docs/templates/company-os-customer-support-kb-parent-worker-contract.md",
  "docs/templates/company-os-customer-support-kb-research-worker-contract.md",
  "docs/templates/company-os-customer-support-kb-draft-worker-contract.md",
  "reports/examples/customer-support-kb-pack/README.example.md",
]);

test("validateDepartmentPackInput rejects missing required fields and invalid role", () => {
  assert.throws(() => validateDepartmentPackInput({}), /packId is required/);
  assert.throws(() => validateDepartmentPackInput({ ...SAMPLE_INPUT, ownerRole: "coo" }), /ownerRole must be role:/);
});

test("buildDepartmentPackScaffold creates the required fake non-source-company pack files", () => {
  const scaffold = buildDepartmentPackScaffold(SAMPLE_INPUT);

  assert.equal(scaffold.pack_id, "customer-support-kb");
  assert.equal(scaffold.name, "Customer Support KB");
  assert.deepEqual(scaffold.files.map((file) => file.relative_path).sort(), [...EXPECTED_RELATIVE_PATHS].sort());
  assert.ok(scaffold.files.every((file) => file.absolute_path.startsWith("/repo/")));

  const joined = scaffold.files.map((file) => file.content).join("\n");
  assert.match(joined, /intent\.customer_support_kb_setup/);
  assert.match(joined, /CapabilityProfile: claude-clevel-worker\/cto\/department-capability-pack-creator/);
  assert.match(joined, /dispatch: manual/);
  assert.match(joined, /ReflectionPolicy: required/);
  assert.match(joined, /LearningProposalPolicy: required/);
  assert.doesNotMatch(joined, /\b(?:ATLAS|ARES|bio-os|source-company)\b/i);
  assert.doesNotMatch(joined, /\/Users\/[^/\s]+/);
});

test("scaffold worker contracts are flat fenced YAML contracts", () => {
  const scaffold = buildDepartmentPackScaffold(SAMPLE_INPUT);
  const contractFiles = scaffold.files.filter((file) => /worker-contract\.md$/.test(file.relative_path));

  assert.equal(contractFiles.length, 3);
  for (const file of contractFiles) {
    assert.match(file.content, /```yaml\nrole: role:/);
    assert.match(file.content, /\nparent_seat: role:/);
    assert.match(file.content, /\nagent: claude/);
    assert.match(file.content, /\nworkspace: registry:company-os/);
    assert.match(file.content, /\nsource_of_truth:\n  - \$\{COMPANY_OS_ROOT\}/);
    assert.match(file.content, /\nacceptance_criteria:\n  - /);
    assert.match(file.content, /\ngates:\n  - /);
    assert.match(file.content, /\nhuman_gate: HG-2/);
    assert.doesNotMatch(file.content, /worker_issue_contract:\n\s+role:/);
  }
});

test("writeDepartmentPackScaffold writes all files and report manifest", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "department-pack-scaffold-"));
  const scaffold = buildDepartmentPackScaffold({ ...SAMPLE_INPUT, root });
  const result = writeDepartmentPackScaffold(scaffold);

  assert.equal(result.written.length, EXPECTED_RELATIVE_PATHS.length);
  for (const relativePath of EXPECTED_RELATIVE_PATHS) {
    assert.equal(fs.existsSync(path.join(root, relativePath)), true, relativePath);
  }
  const report = fs.readFileSync(path.join(root, "reports/examples/customer-support-kb-pack/README.example.md"), "utf8");
  assert.match(report, /Department Capability Pack Scaffold/);
  assert.match(report, /10\/10 Evaluation Required/);
});
