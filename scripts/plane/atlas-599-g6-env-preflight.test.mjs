import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  evaluateG6Env,
  loadEnv,
  parseArgs,
} from "./atlas-599-g6-env-preflight.mjs";

test("parseArgs captures env-file and json flags", () => {
  const args = parseArgs(["--env-file", "/tmp/g6.env", "--json"]);

  assert.equal(args.envFile, "/tmp/g6.env");
  assert.equal(args.json, true);
});

test("loadEnv reads dotenv-style file without requiring process env", () => {
  const dir = mkdtempSync(join(tmpdir(), "atlas-g6-env-"));
  const file = join(dir, "g6.env");
  writeFileSync(file, [
    "ATLAS_G6_EXPECTED_SUPABASE_PROJECT_REF='nonprodref'",
    "IGNORED LINE",
    "# comment",
  ].join("\n"));

  const env = loadEnv({ envFile: file }, {});

  assert.equal(env.ATLAS_G6_EXPECTED_SUPABASE_PROJECT_REF, "nonprodref");
});

test("evaluateG6Env fails closed when required values are missing", () => {
  const result = evaluateG6Env({});

  assert.equal(result.ok, false);
  assert.equal(result.status, "BLOCKED_ENV");
  assert.equal(result.failed.some((row) => row.name === "ATLAS_G6_USER_A_JWT"), true);
  assert.equal(result.hard_boundaries.includes("no_smoke_execution"), true);
});

test("evaluateG6Env rejects service-role-like keys and forbidden project refs", () => {
  const result = evaluateG6Env(validEnv({
    ATLAS_G6_NON_PROD_SUPABASE_ANON_KEY: "service_role.fake",
    ATLAS_G6_FORBID_PROJECT_REFS: "prodref,nonprodref",
  }));

  assert.equal(result.ok, false);
  assert.equal(result.failed.some((row) => row.name === "anon-key-not-service-role"), true);
  assert.equal(result.failed.some((row) => row.name === "forbid-refs-do-not-match-url"), true);
});

test("evaluateG6Env passes only when non-prod guard values are complete", () => {
  const result = evaluateG6Env(validEnv());

  assert.equal(result.ok, true);
  assert.equal(result.status, "READY_FOR_DRY_RUN");
  assert.match(result.next_command, /recovery-write-smoke\.ts/);
  assert.equal(JSON.stringify(result).includes("jwt-user-a"), false);
  assert.equal(JSON.stringify(result).includes("supersecret123"), false);
});

function validEnv(overrides = {}) {
  return {
    ATLAS_G6_NON_PROD_SUPABASE_URL: "https://nonprodref.supabase.co",
    ATLAS_G6_NON_PROD_SUPABASE_ANON_KEY: "supersecret123",
    ATLAS_G6_EXPECTED_SUPABASE_PROJECT_REF: "nonprodref",
    ATLAS_G6_ALLOW_NON_PROD_WRITE: "I_UNDERSTAND_NON_PROD_ONLY",
    ATLAS_G6_FORBID_PROJECT_REFS: "prodabc,prodxyz",
    ATLAS_G6_USER_A_JWT: "jwt-user-a",
    ATLAS_G6_USER_B_JWT: "jwt-user-b",
    ATLAS_G6_USER_A_ID: "user-a-id",
    ATLAS_G6_ROLLBACK_OWNER: "Codex",
    ...overrides,
  };
}
