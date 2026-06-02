#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import {
  findTemplateById,
  listTemplates,
  loadTemplateRegistry,
  parseVarAssignment,
  renderTemplate,
  validateTemplateRegistry,
} from "./plane-template-registry-core.mjs";

function parseArgs(argv) {
  const args = {
    command: "",
    registry: "registries/plane-templates/company-os.json",
    id: "",
    surface: "",
    vars: {},
    output: "",
    json: false,
  };
  args.command = argv[0] || "help";
  for (let index = 1; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === "--registry") {
      args.registry = argv[++index];
      continue;
    }
    if (item === "--id") {
      args.id = argv[++index];
      continue;
    }
    if (item === "--surface") {
      args.surface = argv[++index];
      continue;
    }
    if (item === "--var") {
      const [key, value] = parseVarAssignment(argv[++index]);
      args.vars[key] = value;
      continue;
    }
    if (item === "--output") {
      args.output = argv[++index];
      continue;
    }
    if (item === "--json") {
      args.json = true;
      continue;
    }
    if (item === "--help" || item === "-h") {
      args.command = "help";
      continue;
    }
    throw new Error(`Unknown argument: ${item}`);
  }
  return args;
}

function printHelp() {
  console.log([
    "Usage: plane-template-registry.mjs <validate|list|render> [options]",
    "",
    "Options:",
    "  --registry <path>        Registry JSON path (default: registries/plane-templates/company-os.json)",
    "  --surface <surface>      Filter list by work_item, project or page",
    "  --id <template-id>       Template id for render",
    "  --var KEY=VALUE          Override a template variable; repeatable",
    "  --output <path>          Write rendered markdown to a file",
    "  --json                   Emit JSON",
  ].join("\n"));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === "help") {
    printHelp();
    return;
  }

  const registryPath = path.resolve(args.registry);
  const registry = loadTemplateRegistry(registryPath);
  const validation = validateTemplateRegistry(registry);
  if (args.command === "validate") {
    if (args.json) {
      console.log(JSON.stringify(validation, null, 2));
    } else if (validation.ok) {
      console.log(`PASS: ${registry.templates.length} templates`);
    } else {
      console.error(`FAIL:\n- ${validation.errors.join("\n- ")}`);
    }
    process.exitCode = validation.ok ? 0 : 1;
    return;
  }
  if (!validation.ok) {
    throw new Error(`Template registry invalid:\n- ${validation.errors.join("\n- ")}`);
  }

  if (args.command === "list") {
    const rows = listTemplates(registry, { surface: args.surface });
    if (args.json) {
      console.log(JSON.stringify({ templates: rows }, null, 2));
    } else {
      for (const row of rows) {
        console.log(`${row.id}\t${row.plane_surface}\t${row.name}`);
      }
    }
    return;
  }

  if (args.command === "render") {
    const template = findTemplateById(registry, args.id);
    if (!template) throw new Error(`Template not found: ${args.id}`);
    const rendered = renderTemplate(template, args.vars);
    if (args.output) {
      fs.mkdirSync(path.dirname(path.resolve(args.output)), { recursive: true });
      fs.writeFileSync(args.output, rendered.body_markdown, "utf8");
    }
    if (args.json) {
      console.log(JSON.stringify(rendered, null, 2));
    } else if (args.output) {
      console.log(`Wrote ${args.output}`);
    } else {
      process.stdout.write(rendered.body_markdown);
    }
    return;
  }

  throw new Error(`Unknown command: ${args.command}`);
}

main();
