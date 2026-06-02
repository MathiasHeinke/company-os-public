# Command Center Read Model

Generated: 2026-05-20T12:00:00.000Z
Schema: command-center-read-model/v0
Read-only: true

## Morning Brief

5 run(s) visible; 1 blocked; 2 need decision-gate review; 0 need HG-4 human review; 1 HG-3 CEO release(s); 1 HG-3.5 packet(s); 3 trace card(s)

## Worker Runs

| Issue | Run | Worker | Controller | Decision Gate | Next Action | Source Event |
|---|---|---|---|---|---|---|
| [WORK_ITEM_ID] | run_example_904 | idle | none | required HG-3 | Hold CEO critical release and route to EVE HG-3.5 | evt_example_904_hg3_hold |
| [WORK_ITEM_ID] | run_example_903 | idle | none | released HG-3 | private beta release may proceed with rollback verified | evt_example_903_hg3_release |
| [WORK_ITEM_ID] | run_example_902 | idle | blocked | none | repair runtime auth | evt_example_902_auth_failed |
| [WORK_ITEM_ID] | run_example_901 | needs_audit | ready_for_gate_review | required | review release evidence | evt_example_901_human_gate |
| [WORK_ITEM_ID] | run_example_900 | needs_audit | pass | none | dispatch dependent work or close | evt_example_900_controller_pass |

## Decision Gate Queue

| Issue | Run | Gate | Next Action | Source Event |
|---|---|---|---|---|
| [WORK_ITEM_ID] | run_example_904 | HG-3 | Hold CEO critical release and route to EVE HG-3.5 | evt_example_904_hg3_hold |
| [WORK_ITEM_ID] | run_example_901 | unknown | review release evidence | evt_example_901_human_gate |

## CEO Critical Releases

| Issue | Run | Authority | Released By | Confidence | Source Event |
|---|---|---|---|---|---|
| [WORK_ITEM_ID] | run_example_903 | CEO_CRITICAL | Codex-GPT-5.5-xhigh | 0.98 | evt_example_903_hg3_release |

## EVE / HG-3.5 Packets

| Issue | Run | Origin | Status | Simulated | Source Event |
|---|---|---|---|---|---|
| [WORK_ITEM_ID] | run_example_904 | HG-3 | awaiting-chief-of-staff-review | true | evt_example_904_hg3_hold |

## Trace Summary Cards

| Issue | Run | Agent | Trace Markdown | Prompt Result | Source Event |
|---|---|---|---|---|---|
| [WORK_ITEM_ID] | run_example_901 | claude | /example/company-os/reports/observability/raindrop-workshop/2026-05-20/run_example_901.md | none | evt_example_901_reported |
| [WORK_ITEM_ID] | run_example_900 | claude | /example/company-os/reports/observability/raindrop-workshop/2026-05-20/run_example_900.md | none | evt_example_900_reported |
| [WORK_ITEM_ID] | run_example_900 | claude | none | /example/company-os/reports/observability/raindrop-workshop/2026-05-20/run_example_900.prompt-result.md | evt_example_900_prompt_eval |

## Blocked Actions

- no Plane writes
- no Plane Done transitions
- no worker dispatch
- no deploy/publish/send/schedule/spend
- no production writes
