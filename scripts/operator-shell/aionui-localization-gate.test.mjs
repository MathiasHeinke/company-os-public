import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  AIONUI_COMMAND_EVE_LOCALE_PACK_LANGUAGE,
  AIONUI_COMMAND_EVE_LOCALE_PACK_NAMESPACES,
} from "./aionui-command-eve-overlay-core.mjs";
import { validateAionuiCommandEveLocalization } from "./aionui-localization-gate.mjs";

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "aionui-locale-gate-test-"));
}

function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function writeAionuiEnUsFixture(aionuiRoot, companyOsRoot) {
  const sourcePackRoot = path.join(
    companyOsRoot,
    "assets/brand/eve-command/aionui-overlay/locales",
    AIONUI_COMMAND_EVE_LOCALE_PACK_LANGUAGE,
  );
  const enUsRoot = path.join(aionuiRoot, "packages/desktop/src/renderer/services/i18n/locales/en-US");
  for (const namespace of AIONUI_COMMAND_EVE_LOCALE_PACK_NAMESPACES) {
    writeFile(
      path.join(enUsRoot, `${namespace}.json`),
      fs.readFileSync(path.join(sourcePackRoot, `${namespace}.json`), "utf8"),
    );
  }
}

test("validateAionuiCommandEveLocalization passes when de-DE keeps en-US key and placeholder parity", () => {
  const aionuiRoot = tmpDir();
  writeAionuiEnUsFixture(aionuiRoot, process.cwd());

  const result = validateAionuiCommandEveLocalization({
    companyOsRoot: process.cwd(),
    aionuiRoot,
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "pass");
  assert.equal(result.namespace_count, AIONUI_COMMAND_EVE_LOCALE_PACK_NAMESPACES.length);
  assert.ok(result.leaf_count > 2000);
  assert.equal(result.errors.length, 0);
});

test("validateAionuiCommandEveLocalization blocks placeholder drift", () => {
  const root = tmpDir();
  const companyOsRoot = path.join(root, "Company.OS");
  const aionuiRoot = path.join(root, "AionUi");
  const sourcePackRoot = path.join(
    process.cwd(),
    "assets/brand/eve-command/aionui-overlay/locales",
    AIONUI_COMMAND_EVE_LOCALE_PACK_LANGUAGE,
  );
  const targetPackRoot = path.join(
    companyOsRoot,
    "assets/brand/eve-command/aionui-overlay/locales",
    AIONUI_COMMAND_EVE_LOCALE_PACK_LANGUAGE,
  );
  fs.cpSync(sourcePackRoot, targetPackRoot, { recursive: true });
  writeAionuiEnUsFixture(aionuiRoot, companyOsRoot);

  const loginFile = path.join(targetPackRoot, "login.json");
  const login = JSON.parse(fs.readFileSync(loginFile, "utf8"));
  login.brand = "⌘ EVE {{version}}";
  fs.writeFileSync(loginFile, `${JSON.stringify(login, null, 2)}\n`);

  const result = validateAionuiCommandEveLocalization({
    companyOsRoot,
    aionuiRoot,
  });

  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.includes("login: placeholder mismatch brand")));
});
