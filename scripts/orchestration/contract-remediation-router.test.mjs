import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTRACT_REMEDIATION_TITLE,
  REMEDIATION_ACTIONS,
  REMEDIATION_REASON_CODES,
  buildRemediationYaml,
  routeContractRemediation,
} from "./contract-remediation-router.mjs";
import {
  CONTRACT_REVIEW_VERDICTS,
} from "./contract-controller.mjs";

const ITEM = {
  id: "item-1",
  sequence_id: 154,
  name: "Test Item",
  description_html: "<pre><code>role: role:cto\nagent: claude</code></pre>",
};

function review(verdict, fields = {}) {
  return {
    comment_id: "review-1",
    fields: {
      verdict,
      description_hash: "abc",
      ...fields,
    },
  };
}

test("CONTRACT_PASS produces no remediation route", () => {
  const route = routeContractRemediation({
    item: ITEM,
    labelNames: ["role:cto"],
    latestReview: review(CONTRACT_REVIEW_VERDICTS.PASS),
  });
  assert.equal(route.route_required, false);
  assert.equal(route.route_owner, "none");
  assert.equal(route.action, REMEDIATION_ACTIONS.NONE);
  assert.deepEqual(route.reason_codes, [REMEDIATION_REASON_CODES.PASS]);
});

test("PATCH_REQUIRED routes to the owning C-Level seat", () => {
  const route = routeContractRemediation({
    item: ITEM,
    labelNames: ["role:cmo"],
    latestReview: review(CONTRACT_REVIEW_VERDICTS.PATCH_REQUIRED),
  });
  assert.equal(route.route_owner, "role:cmo");
  assert.equal(route.escalation_level, "c-level");
  assert.deepEqual(route.escalation_path, ["role:cmo", "ceo"]);
  assert.equal(route.action, REMEDIATION_ACTIONS.PATCH_CONTRACT);
  assert.deepEqual(route.reason_codes, [REMEDIATION_REASON_CODES.PATCH_TO_CLEVEL]);
});

test("SPEC_REQUIRED routes to the owning C-Level seat for spec pre-work", () => {
  const route = routeContractRemediation({
    item: ITEM,
    labelNames: ["role:cpo"],
    latestReview: review(CONTRACT_REVIEW_VERDICTS.SPEC_REQUIRED),
  });
  assert.equal(route.route_owner, "role:cpo");
  assert.equal(route.action, REMEDIATION_ACTIONS.CREATE_SPEC);
  assert.deepEqual(route.reason_codes, [REMEDIATION_REASON_CODES.SPEC_TO_CLEVEL]);
});

test("SPLIT_REQUIRED routes decomposition to the owning C-Level seat", () => {
  const route = routeContractRemediation({
    item: ITEM,
    labelNames: ["role:coo"],
    latestReview: review(CONTRACT_REVIEW_VERDICTS.SPLIT_REQUIRED),
  });
  assert.equal(route.route_owner, "role:coo");
  assert.equal(route.action, REMEDIATION_ACTIONS.SPLIT_CONTRACT);
  assert.deepEqual(route.reason_codes, [REMEDIATION_REASON_CODES.SPLIT_TO_CLEVEL]);
});

test("REJECT routes rewrite or park decision to the owning C-Level seat", () => {
  const route = routeContractRemediation({
    item: ITEM,
    labelNames: ["role:cto"],
    latestReview: review(CONTRACT_REVIEW_VERDICTS.REJECT),
  });
  assert.equal(route.route_owner, "role:cto");
  assert.equal(route.action, REMEDIATION_ACTIONS.REWRITE_OR_PARK);
  assert.deepEqual(route.reason_codes, [REMEDIATION_REASON_CODES.REJECT_TO_CLEVEL]);
});

test("CEO_GATE_REQUIRED starts with C-Level package, then CEO/Codex HG-3", () => {
  const route = routeContractRemediation({
    item: ITEM,
    labelNames: ["role:cfo"],
    latestReview: review(CONTRACT_REVIEW_VERDICTS.CEO_GATE_REQUIRED),
  });
  assert.equal(route.route_owner, "role:cfo");
  assert.equal(route.ceo_gate_required, true);
  assert.deepEqual(route.escalation_path, ["role:cfo", "ceo"]);
  assert.equal(route.action, REMEDIATION_ACTIONS.PREPARE_CEO_GATE);
  assert.deepEqual(route.reason_codes, [REMEDIATION_REASON_CODES.CEO_GATE_TO_CLEVEL]);
});

test("FOUNDER_GATE_REQUIRED routes via CEO and Chief-of-Staff to Founder HG-4", () => {
  const route = routeContractRemediation({
    item: ITEM,
    labelNames: ["role:cfo"],
    latestReview: review(CONTRACT_REVIEW_VERDICTS.FOUNDER_GATE_REQUIRED),
  });
  assert.equal(route.route_owner, "role:cfo");
  assert.equal(route.founder_gate_required, true);
  assert.deepEqual(route.escalation_path, ["role:cfo", "ceo", "chief-of-staff", "founder"]);
  assert.equal(route.action, REMEDIATION_ACTIONS.PREPARE_FOUNDER_GATE);
  assert.deepEqual(route.reason_codes, [REMEDIATION_REASON_CODES.FOUNDER_GATE_TO_CLEVEL]);
});

test("missing role owner escalates to CEO, not Founder", () => {
  const route = routeContractRemediation({
    item: ITEM,
    labelNames: [],
    latestReview: review(CONTRACT_REVIEW_VERDICTS.PATCH_REQUIRED),
  });
  assert.equal(route.route_owner, "ceo");
  assert.equal(route.escalation_level, "ceo");
  assert.deepEqual(route.escalation_path, ["ceo"]);
  assert.deepEqual(route.reason_codes, [REMEDIATION_REASON_CODES.OWNER_MISSING]);
});

test("missing contract review asks owner to rerun Stage 0.5", () => {
  const route = routeContractRemediation({
    item: ITEM,
    labelNames: ["role:cto"],
    latestReview: null,
  });
  assert.equal(route.route_owner, "role:cto");
  assert.equal(route.action, REMEDIATION_ACTIONS.RERUN_CONTRACT_CONTROLLER);
  assert.deepEqual(route.reason_codes, [REMEDIATION_REASON_CODES.REVIEW_MISSING]);
});

test("unparseable contract review asks owner to rerun Stage 0.5", () => {
  const route = routeContractRemediation({
    item: ITEM,
    labelNames: ["role:cto"],
    latestReview: review("", {}),
  });
  assert.equal(route.route_owner, "role:cto");
  assert.equal(route.action, REMEDIATION_ACTIONS.RERUN_CONTRACT_CONTROLLER);
  assert.deepEqual(route.reason_codes, [REMEDIATION_REASON_CODES.REVIEW_UNPARSEABLE]);
});

test("unknown verdict escalates to CEO for classification", () => {
  const route = routeContractRemediation({
    item: ITEM,
    labelNames: ["role:cto"],
    latestReview: review("SOMETHING_ELSE"),
  });
  assert.equal(route.route_owner, "ceo");
  assert.equal(route.action, REMEDIATION_ACTIONS.ESCALATE_TO_CEO);
  assert.deepEqual(route.reason_codes, [REMEDIATION_REASON_CODES.UNKNOWN_VERDICT]);
});

test("buildRemediationYaml emits the machine-readable comment title", () => {
  const route = routeContractRemediation({
    item: ITEM,
    labelNames: ["role:cto"],
    latestReview: review(CONTRACT_REVIEW_VERDICTS.PATCH_REQUIRED),
  });
  const yaml = buildRemediationYaml({ route, reviewer: "test" });
  assert.match(yaml, new RegExp(`^${CONTRACT_REMEDIATION_TITLE}:`));
  assert.match(yaml, /route_owner: role:cto/);
  assert.match(yaml, /action: patch-contract-and-rerun-contract-controller/);
});
