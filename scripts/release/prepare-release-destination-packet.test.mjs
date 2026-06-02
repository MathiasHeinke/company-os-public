import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  RELEASE_DESTINATION_PACKET_VERSION,
  runPrepareReleaseDestinationPacket,
} from "./prepare-release-destination-packet.mjs";

function tempRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "release-destination-packet-test-"));
  fs.writeFileSync(path.join(root, "VERSION"), "0.5.1-alpha.1\n");
  return root;
}

test("runPrepareReleaseDestinationPacket rejects missing target repo", () => {
  const result = runPrepareReleaseDestinationPacket({
    sourceRoot: tempRoot(),
    now: () => new Date("2026-05-17T10:00:00.000Z"),
    sourceRepo: "MathiasHeinke/company-os",
  });

  assert.equal(result.version, RELEASE_DESTINATION_PACKET_VERSION);
  assert.equal(result.status, "REJECT");
  assert.equal(result.exit_code, 2);
  assert.equal(result.reason, "target_repo.required");
});

test("runPrepareReleaseDestinationPacket rejects non owner/repo targets", () => {
  const result = runPrepareReleaseDestinationPacket({
    targetRepo: "company-os-public",
    sourceRoot: tempRoot(),
    now: () => new Date("2026-05-17T10:00:00.000Z"),
    sourceRepo: "MathiasHeinke/company-os",
  });

  assert.equal(result.status, "REJECT");
  assert.equal(result.reason, "target_repo.invalid-format");
});

test("runPrepareReleaseDestinationPacket rejects the current private source repo", () => {
  const result = runPrepareReleaseDestinationPacket({
    targetRepo: "MathiasHeinke/company-os",
    sourceRoot: tempRoot(),
    now: () => new Date("2026-05-17T10:00:00.000Z"),
    sourceRepo: "https://github.com/MathiasHeinke/company-os.git",
  });

  assert.equal(result.status, "REJECT");
  assert.equal(result.reason, "target_repo.matches-private-source");
});

test("runPrepareReleaseDestinationPacket emits a no-push HG-2.5 command packet", () => {
  const result = runPrepareReleaseDestinationPacket({
    targetRepo: "MathiasHeinke/company-os-public",
    sourceRoot: tempRoot(),
    now: () => new Date("2026-05-17T10:00:00.000Z"),
    sourceRepo: "MathiasHeinke/company-os",
  });

  assert.equal(result.status, "PASS");
  assert.equal(result.exit_code, 0);
  assert.equal(result.generated_at, "2026-05-17T10:00:00.000Z");
  assert.equal(result.release_version, "0.5.1-alpha.1");
  assert.equal(result.target_remote_ssh, "git@github.com:MathiasHeinke/company-os-public.git");
  assert.equal(result.performs_remote_write, false);
  assert.equal(result.required_human_gate, "HG-2.5");
  assert.ok(result.blocked_actions_remaining.includes("external remote write"));
  assert.ok(result.command_packet.packet_commands.some((line) => line.includes("build-public-mirror.mjs")));
  assert.ok(result.command_packet.hg25_hold_commands.some((line) => line.includes("push -u origin main")));
  assert.ok(!result.command_packet.packet_commands.some((line) => /push -u origin main/.test(line)));

  const checks = new Map(result.checks.map((check) => [check.id, check]));
  assert.equal(checks.get("remote-write.not-executed")?.status, "pass");
});
