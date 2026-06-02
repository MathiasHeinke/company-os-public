#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import {
  CONTRACT_WIZARD_QUESTIONS,
  CONTRACT_WIZARD_VERSION,
  buildWizardAnswers,
  diagnoseWizardTooling,
  renderWizardMarkdown,
  validateWizardAnswers,
} from "./plane-contract-wizard-core.mjs";

function pushOption(options, key, value) {
  if (!options[key]) options[key] = [];
  options[key].push(value);
}

function parseArgs(argv) {
  const args = {
    command: argv[0] || "help",
    output: "",
    json: false,
  };

  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`Missing value for ${arg}`);
      return argv[index];
    };
    if (arg === "--title") args.title = next();
    else if (arg === "--role") args.role = next();
    else if (arg === "--parent-seat") args.parent_seat = next();
    else if (arg === "--agent") args.agent = next();
    else if (arg === "--mode") args.mode = next();
    else if (arg === "--workspace") args.workspace = next();
    else if (arg === "--dispatch") args.dispatch = next();
    else if (arg === "--source") pushOption(args, "source_of_truth", next());
    else if (arg === "--acceptance") pushOption(args, "acceptance_criteria", next());
    else if (arg === "--gate") pushOption(args, "gates", next());
    else if (arg === "--allowed-write-path") pushOption(args, "allowed_write_paths", next());
    else if (arg === "--allowed-claude-tool") pushOption(args, "allowed_claude_tools", next());
    else if (arg === "--subagent-roster") pushOption(args, "subagent_roster", next());
    else if (arg === "--human-gate") args.human_gate = next();
    else if (arg === "--blocked-actions") args.blocked_actions = next();
    else if (arg === "--reporting") args.reporting = next();
    else if (arg === "--capability-profile") args.capability_profile = next();
    else if (arg === "--sandbox") args.sandbox = next();
    else if (arg === "--runtime-auth") args.runtime_auth = next();
    else if (arg === "--runtime-browser-auth") args.runtime_browser_auth = next();
    else if (arg === "--runtime-permission-mode") args.runtime_permission_mode = next();
    else if (arg === "--inference-class") args.inference_class = next();
    else if (arg === "--output") args.output = next();
    else if (arg === "--json") args.json = true;
    else if (arg === "--help" || arg === "-h") args.command = "help";
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function printHelp() {
  console.log([
    "Usage: plane-contract-wizard.mjs <questions|draft|diagnose|validate> [options]",
    "",
    "Commands:",
    "  questions              Print the intake question schema.",
    "  draft                  Render a Plane-copyable Worker Contract markdown.",
    "  diagnose               Emit Contract Wizard tool diagnostics as JSON only (no markdown).",
    "  validate               Validate provided answers without rendering.",
    "",
    "Draft/diagnose options:",
    "  --title <text>",
    "  --role role:cto|role:cpo|role:cmo|role:coo|role:cfo|role:cao",
    "  --parent-seat <role>",
    "  --agent claude|codex|gemini|human",
    "  --mode audit|plan|implement|verify|research|report|review",
    "  --workspace <registry:key|path>",
    "  --dispatch manual|ready|scheduled",
    "  --source <entry>                 Repeatable.",
    "  --acceptance <entry>             Repeatable.",
    "  --gate <entry>                   Repeatable.",
    "  --allowed-write-path <entry>     Repeatable.",
    "  --allowed-claude-tool <entry>    Repeatable. Merged with safe tools derived from gates.",
    "  --subagent-roster <entry>        Repeatable. Allows Task only when non-empty.",
    "  --human-gate HG-1|HG-2|HG-2.5|HG-3|HG-3.5|HG-4",
    "  --capability-profile <profile>",
    "  --sandbox required|none",
    "  --runtime-auth <sentinel>",
    "  --runtime-browser-auth none|forbidden|browser-connector|operator-shared-session",
    "  --runtime-permission-mode <mode>",
    "  --inference-class <class>",
    "  --output <path>",
    "  --json",
  ].join("\n"));
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === "help") {
    printHelp();
    return;
  }

  if (args.command === "questions") {
    const result = {
      version: CONTRACT_WIZARD_VERSION,
      questions: CONTRACT_WIZARD_QUESTIONS,
    };
    if (args.json) printJson(result);
    else for (const question of CONTRACT_WIZARD_QUESTIONS) console.log(`${question.id}\t${question.prompt}`);
    return;
  }

  if (args.command === "validate") {
    const answers = buildWizardAnswers(args);
    const validation = validateWizardAnswers(answers);
    const result = { version: CONTRACT_WIZARD_VERSION, ok: validation.ok, errors: validation.errors, answers };
    if (args.json) printJson(result);
    else if (validation.ok) console.log("Contract wizard answers: pass");
    else console.error(`Contract wizard answers: fail\n- ${validation.errors.join("\n- ")}`);
    process.exitCode = validation.ok ? 0 : 1;
    return;
  }

  if (args.command === "diagnose") {
    const answers = buildWizardAnswers(args);
    const diagnostics = diagnoseWizardTooling(answers);
    printJson({
      version: CONTRACT_WIZARD_VERSION,
      ok: true,
      tool_diagnostics: diagnostics,
    });
    return;
  }

  if (args.command === "draft") {
    const answers = buildWizardAnswers(args);
    const markdown = renderWizardMarkdown(args);
    const diagnostics = diagnoseWizardTooling(answers);
    if (args.output) {
      const target = path.resolve(args.output);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, markdown, "utf8");
    }
    if (args.json) {
      printJson({
        version: CONTRACT_WIZARD_VERSION,
        ok: true,
        output: args.output ? path.resolve(args.output) : null,
        markdown,
        tool_diagnostics: diagnostics,
      });
    } else if (args.output) {
      console.log(`Wrote ${args.output}`);
    } else {
      process.stdout.write(markdown);
    }
    return;
  }

  throw new Error(`Unknown command: ${args.command}`);
}

main();
