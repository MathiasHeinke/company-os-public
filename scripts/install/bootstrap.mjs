#!/usr/bin/env node
import { runBootstrap } from "./bootstrap-core.mjs";

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {
    command,
    source: process.cwd(),
    target: "",
    dryRun: false,
    json: false,
    force: false,
    help: false,
  };

  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === "--help" || arg === "-h") { options.help = true; continue; }
    if (arg === "--dry-run") { options.dryRun = true; continue; }
    if (arg === "--json") { options.json = true; continue; }
    if (arg === "--force") { options.force = true; continue; }
    const nextValue = () => {
      i += 1;
      if (i >= rest.length) throw new Error(`Missing value for ${arg}`);
      return rest[i];
    };
    if (arg === "--source") { options.source = nextValue(); continue; }
    if (arg === "--target") { options.target = nextValue(); continue; }
    throw new Error(`Unknown argument: ${arg}`);
  }
  return options;
}

function printHelp() {
  process.stdout.write(
    [
      "Usage:",
      "  bootstrap.mjs install [options]",
      "",
      "Options:",
      "  --source PATH   Company.OS repo root containing kits/company-os-kit/.",
      "                  Default: current working directory.",
      "  --target PATH   Destination directory to install kit files into. Required.",
      "  --dry-run       Show what would be copied without writing any files.",
      "  --json          Print result as JSON.",
      "  --force         Allow overwriting existing target files.",
      "",
      "Generated active files:",
      "  .company-os/install-record.md",
      "  .company-os/company-discovery-brief.md",
      "  .company-os/first-run-checklist.md",
      "  .company-os/operations/workspace-registry.json",
      "  .company-os/operations/software-stack.md",
      "  .company-os/operations/human-gates.md",
      "",
      "Exit codes:",
      "  0  Success (or dry-run success).",
      "  2  Blocked (collision, error, or wrong command).",
      "  1  Unhandled runtime error.",
    ].join("\n") + "\n",
  );
}

function printResult(result, json) {
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  if (result.ok) {
    const tag = result.dry_run ? "DRY-RUN" : "PASS";
    process.stdout.write(
      `${tag}: ${result.files_to_copy.length} file(s) to copy` +
      (result.files_copied.length ? `, ${result.files_copied.length} copied` : "") +
      (result.generated_files.length ? `, ${result.generated_files.length} active file(s) generated` : "") +
      `\n`,
    );
    if (result.next_steps.length) {
      process.stdout.write("Next steps:\n");
      for (const step of result.next_steps) {
        process.stdout.write(`- ${step}\n`);
      }
    }
  } else {
    const detail = result.error ?? result.message ?? result.status;
    process.stdout.write(`${result.status.toUpperCase()}: ${detail}\n`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help || options.command !== "install") {
    printHelp();
    if (!options.help) process.exitCode = 2;
    return;
  }

  if (!options.target) {
    process.stderr.write("Error: --target is required.\n");
    printHelp();
    process.exitCode = 2;
    return;
  }

  const result = runBootstrap({
    source: options.source,
    target: options.target,
    dryRun: options.dryRun,
    force: options.force,
  });

  printResult(result, options.json);
  if (!result.ok) process.exitCode = 2;
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message || String(error)}\n`);
  process.exitCode = 1;
});
