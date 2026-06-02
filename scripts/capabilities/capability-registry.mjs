#!/usr/bin/env node
import { evaluateCapabilityProfile, loadCapabilityRegistry } from "./capability-registry-core.mjs";

function parseArgs(argv) {
  const args = {
    registry: undefined,
    profile: undefined,
    agent: "claude",
    role: undefined,
    mode: undefined,
    workspace: undefined,
    autonomy: undefined,
    subagents: undefined,
    json: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--json") args.json = true;
    else if (arg === "--registry") args.registry = argv[++index];
    else if (arg === "--profile") args.profile = argv[++index];
    else if (arg === "--agent") args.agent = argv[++index];
    else if (arg === "--role") args.role = argv[++index];
    else if (arg === "--mode") args.mode = argv[++index];
    else if (arg === "--workspace") args.workspace = argv[++index];
    else if (arg === "--autonomy") args.autonomy = argv[++index];
    else if (arg === "--subagents") args.subagents = argv[++index];
  }

  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const registryResult = loadCapabilityRegistry(args.registry);
  if (!registryResult.ok) {
    print({ ok: false, reason_codes: registryResult.reason_codes, evidence: registryResult.evidence }, args.json);
    process.exitCode = 2;
    return;
  }

  const result = evaluateCapabilityProfile({
    registry: registryResult.registry,
    contractFields: {
      Agent: args.agent,
      RoleLabel: args.role,
      Mode: args.mode,
      Workspace: args.workspace,
      AutonomyLevel: args.autonomy,
      CapabilityProfile: args.profile,
      SubAgentRoster: args.subagents
    }
  });

  print(result, args.json);
  process.exitCode = result.ok ? 0 : 2;
}

function print(payload, json) {
  if (json) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }
  console.log(payload.ok ? "PASS" : "BLOCKED");
  if (payload.reason_codes?.length) {
    console.log(`reason_codes=${payload.reason_codes.join(",")}`);
  }
  console.log(JSON.stringify(payload.evidence || {}, null, 2));
}

main();
