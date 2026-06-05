import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  COMMAND_EVE_SELF_INSTALL_VERSION,
  renderCommandEveSelfInstallReport,
  runCommandEveSelfInstall,
  writeCommandEveSelfInstallReport,
} from "./command-eve-self-install-core.mjs";

function tmpDir(prefix = "command-eve-self-install-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFile(dir, relativePath, content = "placeholder\n") {
  const absolute = path.join(dir, relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content);
  return absolute;
}

function manifest() {
  return {
    version: "command-eve-operator-shell-manifest/v0",
    release: "1.0.0-alpha.3",
    status: "alpha",
    components: {
      aionui: {
        repo: "https://github.com/iOfficeAI/AionUi.git",
        tag: "v2.1.10",
        commit: "83f52aff5c3e79c066798162dbdaa6d4c8ec220f",
        license: "Apache-2.0",
        default_install_mode: "source-overlay",
      },
      aioncore: {
        version: "v0.1.19",
        source: "AionUI package.json aioncoreVersion",
        install_mode: "aionui-prepare-script",
      },
      hermes: {
        package: "hermes-agent",
        version: "0.15.2",
        tag: "v2026.5.29.2",
        license: "MIT",
      },
    },
    default_inference: {
      provider: "openrouter",
      model: "minimax/minimax-m3",
    },
    blocked_actions: ["do not collect API keys in chat"],
  };
}

function makeSource() {
  const source = tmpDir("command-eve-self-install-source-");
  writeFile(source, "VERSION", "1.0.0-alpha.3\n");
  writeFile(source, "kits/company-os-kit/README.md", "# Kit readme\n");
  writeFile(source, "kits/company-os-kit/AGENTS.md", "# Kit agents\n");
  writeFile(source, "kits/company-os-kit/templates/worker-template.md", "# Worker\n");
  writeFile(source, "kits/company-os-kit/.company-os/operations/install-record.example.md", "Company.OS version: 1.0.0-alpha.3\n");
  writeFile(source, "kits/company-os-kit/.company-os/operations/workspace-registry.example.json", "{\"execution_ledger\":\"plane\"}\n");
  writeFile(source, "kits/company-os-kit/.company-os/operations/software-stack.example.md", "# Stack\n");
  writeFile(source, "kits/company-os-kit/.company-os/operations/human-gates.example.md", "# Gates\n");
  writeFile(source, "kits/company-os-kit/.company-os/operations/first-run-checklist.example.md", "# Checklist\n");
  writeFile(source, "kits/company-os-kit/.company-os/templates/company-discovery-brief.md", "# Discovery template\n");
  writeFile(source, "kits/company-os-kit/.company-os/onboarding/company-intake.example.json", "{}\n");
  writeFile(source, "registries/operator-shell/command-eve-1.0-alpha.json", `${JSON.stringify(manifest(), null, 2)}\n`);
  return source;
}

function seed() {
  return {
    companyName: "Example Pilot GmbH",
    website: "https://example.com",
    primaryOffer: "Marketing operating system",
    buyer: "founder-led service teams",
    approvalOwner: "Pilot Founder",
    firstDepartment: "marketing",
  };
}

test("dry-run self-install plans public RC and operator shell without writing target state", () => {
  const source = makeSource();
  const root = tmpDir("command-eve-self-install-target-root-");
  const target = path.join(root, "client");

  const result = runCommandEveSelfInstall({
    source,
    target,
    date: "2026-06-04",
    seed: seed(),
    dryRun: true,
    installMode: "web-release",
    platform: "darwin",
    arch: "arm64",
  });

  assert.equal(result.version, COMMAND_EVE_SELF_INSTALL_VERSION);
  assert.equal(result.dry_run, true);
  assert.equal(result.public_rc_dry_run.status, "dry-run");
  assert.equal(result.operator_plan.release, "1.0.0-alpha.3");
  assert.equal(result.operator_plan.manifest.aionui.tag, "v2.1.10");
  assert.equal(result.operator_plan.manifest.aioncore.version, "v0.1.19");
  assert.equal(result.operator_plan.manifest.hermes.version, "0.15.2");
  assert.equal(result.operator_commands.start_eve, path.join(target, ".company-os/bin/start_eve"));
  assert.equal(fs.existsSync(target), false);
});

test("self-install blocks incomplete signup seed before target writes", () => {
  const source = makeSource();
  const root = tmpDir("command-eve-self-install-target-root-");
  const target = path.join(root, "client");

  const result = runCommandEveSelfInstall({
    source,
    target,
    date: "2026-06-04",
    seed: { companyName: "Example Pilot GmbH" },
    dryRun: true,
    installMode: "web-release",
    platform: "darwin",
    arch: "arm64",
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.stages[0].id, "input.validate");
  assert.deepEqual(result.stages[0].errors, [
    "company.website or company.domain is required",
    "company.primary_offer is required",
    "buyer is required",
    "approval_owner is required",
  ]);
  assert.equal(fs.existsSync(target), false);
});

test("self-install requires an explicit target path", () => {
  const source = makeSource();

  const result = runCommandEveSelfInstall({
    source,
    date: "2026-06-04",
    seed: seed(),
    dryRun: true,
    installMode: "web-release",
    platform: "darwin",
    arch: "arm64",
  });

  assert.equal(result.ok, false);
  assert.equal(result.status, "blocked");
  assert.equal(result.checks.target.ok, false);
  assert.deepEqual(result.checks.target.errors, ["target is required"]);
});

test("self-install report renders component pins, commands and boundaries", () => {
  const target = tmpDir("command-eve-self-install-report-");
  const result = {
    version: COMMAND_EVE_SELF_INSTALL_VERSION,
    ok: true,
    status: "pass",
    source: "/tmp/company-os-public",
    target,
    source_version: "1.0.0-alpha.3",
    release: "1.0.0-alpha.3",
    date: "2026-06-04",
    seed_preview: {
      company: "Example Pilot GmbH",
      website: "https://example.com",
      offer: "Marketing operating system",
      buyer: "founder-led service teams",
      first_department: "marketing",
      approval_owner: "Pilot Founder",
    },
    operator_shell: {
      manifest: {
        aionui: { tag: "v2.1.10" },
        aioncore: { version: "v0.1.19" },
        hermes: { version: "0.15.2" },
        inference: { provider: "openrouter", model: "minimax/minimax-m3" },
      },
    },
    stages: [
      { id: "self_install.preflight", ok: true, status: "ready" },
      { id: "public_rc.install", ok: true, status: "pass" },
      { id: "operator_shell.install", ok: true, status: "pass" },
    ],
    operator_commands: {
      start_eve: path.join(target, ".company-os/bin/start_eve"),
      update_eve_check: `${path.join(target, ".company-os/bin/update_eve")} check`,
      update_eve_apply: `${path.join(target, ".company-os/bin/update_eve")} apply`,
    },
    next_steps: ["Start EVE"],
  };

  const rendered = renderCommandEveSelfInstallReport(result);
  assert.match(rendered, /AionUI: v2\.1\.10/);
  assert.match(rendered, /Hermes Agent: 0\.15\.2/);
  assert.match(rendered, /Start EVE/);
  assert.match(rendered, /no raw API keys in chat/);

  const report = writeCommandEveSelfInstallReport({ result, date: "2026-06-04" });
  assert.ok(fs.existsSync(report.markdown));
  assert.ok(fs.existsSync(report.json));
  assert.match(fs.readFileSync(report.markdown, "utf8"), /Command EVE Self-Install - 1\.0\.0-alpha\.3/);
});
