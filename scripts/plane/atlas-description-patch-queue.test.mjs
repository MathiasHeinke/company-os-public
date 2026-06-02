import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  buildPostPatchCommands,
  buildDescriptionPatchBody,
  loadQueue,
  parseArgs,
  roleFromMarkdown,
  selectQueueItems,
  summarizeItem,
  validateArgs,
  validateSourceMarkdown,
} from "./atlas-description-patch-queue.mjs";

function writeTempFile(name, content) {
  const dir = mkdtempSync(join(tmpdir(), "atlas-description-patch-queue-"));
  const path = join(dir, name);
  writeFileSync(path, content, "utf8");
  return path;
}

const VALID_CONTRACT = `
# Demo

\`\`\`yaml
role: role:cto
parent_seat: role:cto
agent: claude
mode: plan
workspace: ${LOCAL_WORKSPACE}
dispatch: ready
source_of_truth:
  - ${LOCAL_WORKSPACE}
acceptance_criteria:
  - Produce a report-only artifact.
gates:
  - git diff --check
human_gate: HG-4
reporting: ${LOCAL_WORKSPACE}
blocked_actions:
  - never mark Plane Done
target_class: report-only
\`\`\`
`;

test("parseArgs defaults to dry-run and supports ref filters", () => {
  const args = parseArgs([
    "--project-id", "project-1",
    "--queue-file", "queue.json",
    "--ref", "[WORK_ITEM_ID]",
    "--ref", "[WORK_ITEM_ID]",
    "--json",
  ]);

  assert.equal(args.apply, false);
  assert.equal(args.confirmHumanGate, false);
  assert.equal(args.workspace, "companyos");
  assert.deepEqual(args.refs, ["[WORK_ITEM_ID]", "[WORK_ITEM_ID]"]);
  assert.equal(args.json, true);
});

test("validateArgs blocks apply without explicit human-gate confirmation", () => {
  const errors = validateArgs({
    workspace: "companyos",
    projectId: "project-1",
    queueFile: "queue.json",
    apply: true,
    confirmHumanGate: false,
  });

  assert.deepEqual(errors, ["--apply requires --confirm-human-gate"]);
});

test("validateArgs accepts apply only with explicit human-gate confirmation", () => {
  const errors = validateArgs({
    workspace: "companyos",
    projectId: "project-1",
    queueFile: "queue.json",
    apply: true,
    confirmHumanGate: true,
  });

  assert.deepEqual(errors, []);
});

test("buildDescriptionPatchBody only mutates description_html", () => {
  const body = buildDescriptionPatchBody("<pre><code>next</code></pre>");

  assert.deepEqual(Object.keys(body), ["description_html"]);
  assert.equal(body.description_html, "<pre><code>next</code></pre>");
  assert.equal("state" in body, false);
  assert.equal("labels" in body, false);
  assert.equal("assignees" in body, false);
  assert.equal("parent" in body, false);
});

test("selectQueueItems rejects unknown refs before planning", () => {
  const queueItems = [
    { ref: "[WORK_ITEM_ID]" },
    { ref: "[WORK_ITEM_ID]" },
  ];

  assert.deepEqual(selectQueueItems(queueItems, []).selected, queueItems);
  assert.deepEqual(selectQueueItems(queueItems, ["[WORK_ITEM_ID]"]), {
    selected: [{ ref: "[WORK_ITEM_ID]" }],
    unknown: [],
  });
  assert.deepEqual(selectQueueItems(queueItems, ["[WORK_ITEM_ID]"]), {
    selected: [],
    unknown: ["[WORK_ITEM_ID]"],
  });
});

test("buildPostPatchCommands emits scheduler Stage 0.5/0.65 post command without dispatch", () => {
  assert.deepEqual(buildPostPatchCommands({
    workspace: "companyos",
    projectId: "project-1",
    ref: "[WORK_ITEM_ID]",
  }), [
    "node scripts/orchestration/scheduler-stage-0506.mjs --workspace companyos --project-id project-1 --sequence [WORK_ITEM_ID] --mode post --auth app-token --json",
  ]);
});

test("loadQueue rejects empty patchable item sets", () => {
  const path = writeTempFile("queue.json", JSON.stringify({ patchable_items: [] }));
  assert.throws(() => loadQueue(path), /queue has no patchable_items/);
});

test("roleFromMarkdown reads role label from flat contract", () => {
  assert.equal(roleFromMarkdown(VALID_CONTRACT), "role:cto");
  assert.equal(roleFromMarkdown("role:\n  - bad"), "");
});

test("validateSourceMarkdown validates a queued source contract", () => {
  const source = writeTempFile("contract.md", VALID_CONTRACT);
  const verdict = validateSourceMarkdown({ source_markdown: source });

  assert.equal(verdict.ok, true);
  assert.equal(verdict.role, "role:cto");
  assert.deepEqual(verdict.reason_codes, []);
});

test("summarizeItem reports description hash changes without leaking body", () => {
  const summary = summarizeItem({
    queueItem: {
      ref: "[WORK_ITEM_ID]",
      work_item_id: "item-1",
      source_markdown: "/abs/source.md",
      approval_required: "Founder",
      target_posture: "report-only",
    },
    source: {
      ok: true,
      reason_codes: [],
      role: "role:cao",
    },
    current: {
      ok: true,
      status: 200,
      body: { description_html: "<pre><code>old</code></pre>" },
    },
    nextHtml: "<pre><code>new</code></pre>",
  });

  assert.equal(summary.ref, "[WORK_ITEM_ID]");
  assert.equal(summary.current_fetch_ok, true);
  assert.equal(summary.would_change, true);
  assert.match(summary.post_patch_commands[0], /scheduler-stage-0506\.mjs/);
  assert.match(summary.post_patch_commands[0], /--sequence [WORK_ITEM_ID]/);
  assert.equal("description_html" in summary, false);
});
