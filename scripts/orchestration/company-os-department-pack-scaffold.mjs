#!/usr/bin/env node

import {
  DEPARTMENT_PACK_SCAFFOLD_VERSION,
  buildDepartmentPackScaffold,
  writeDepartmentPackScaffold,
} from "./company-os-department-pack-scaffold-core.mjs";

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    packId: "",
    name: "",
    ownerRole: "",
    clientDomain: "",
    date: new Date().toISOString().slice(0, 10),
    write: false,
    json: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--write") { args.write = true; continue; }
    if (arg === "--json") { args.json = true; continue; }
    const next = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`Missing value for ${arg}`);
      return argv[index];
    };
    if (arg === "--root") { args.root = next(); continue; }
    if (arg === "--pack-id") { args.packId = next(); continue; }
    if (arg === "--name") { args.name = next(); continue; }
    if (arg === "--owner-role") { args.ownerRole = next(); continue; }
    if (arg === "--client-domain") { args.clientDomain = next(); continue; }
    if (arg === "--date") { args.date = next(); continue; }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function renderMarkdown(scaffold, writeResult) {
  return [
    `# Department Pack Scaffold - ${scaffold.name}`,
    "",
    `Version: ${DEPARTMENT_PACK_SCAFFOLD_VERSION}`,
    `Pack ID: ${scaffold.pack_id}`,
    `Date: ${scaffold.date}`,
    `Files: ${scaffold.files.length}`,
    `Written: ${writeResult ? writeResult.written.length : 0}`,
    "",
    "## Files",
    "",
    ...scaffold.files.map((file) => `- ${file.relative_path}`),
    "",
  ].join("\n");
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const scaffold = buildDepartmentPackScaffold({
    root: args.root,
    packId: args.packId,
    name: args.name,
    ownerRole: args.ownerRole,
    clientDomain: args.clientDomain,
    date: args.date,
  });
  const writeResult = args.write ? writeDepartmentPackScaffold(scaffold) : null;
  const result = {
    ok: true,
    version: DEPARTMENT_PACK_SCAFFOLD_VERSION,
    written: Boolean(args.write),
    write_result: writeResult,
    scaffold,
  };
  if (args.json) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  else process.stdout.write(`${renderMarkdown(scaffold, writeResult)}\n`);
}

main();
