# Portable Path Placeholders

Canonical placeholder family used across `docs/`, `kits/company-os-kit/` and
copyable command snippets so that a fresh external operator can paste a command
without editing a private home path.

This doc is the resolution rule. When you see `${COMPANY_OS_ROOT}` or
`${CLAUDE_BIN}` in any other Company.OS doc, kit, or example, resolve it
against this table.

## Rules

- Public Company.OS docs and kit content must not contain hard-coded
  `/Users/<name>/...` literals. Use the placeholders below instead.
- `${...}` placeholders are POSIX shell variable references. They expand at
  command run time, so a reader can either `export` them once per shell or
  substitute by hand before pasting.
- Tilde (`~`) means the operator's home directory. It is a portable, OS-level
  alias and is acceptable inside example paths that should resolve under any
  home.
- The placeholders are conventions, not a runtime contract. Scripts should
  accept their normal CLI flags (`--workspace-path`, `--company-root`, etc.)
  and let the operator pass an absolute path.

## Placeholder family

| Placeholder | Meaning | Default resolution example |
|---|---|---|
| `${COMPANY_OS_ROOT}` | Operator's local Company.OS clone. | `~/Developer/Company.OS` |
| `${DEVELOPER_ROOT}` | Parent of `${COMPANY_OS_ROOT}` where related project clones live side-by-side. | `~/Developer` |
| `${WORKTREE_ROOT}` | Sandbox worktree base for runtime dispatcher worktrees. | `~/Developer/[SOURCE_WORKSPACE]/<workspace>/<topic-branch>` |
| `${SANDBOX_ROOT}` | Parent directory under which all worktrees live. | `~/Developer/[SOURCE_WORKSPACE]` |
| `${CLAUDE_BIN}` | Absolute path to the Claude CLI binary the operator installed. | `$(which claude)`, often `~/Library/pnpm/claude` on macOS pnpm setups |
| `${GEMINI_BIN}` | Absolute path to the Gemini CLI binary the operator installed. | `$(which gemini)`, often `~/Library/pnpm/gemini` |
| `${GITNEXUS_BIN}` | Absolute path to the GitNexus CLI binary the operator installed. | `$(which gitnexus)`, often `~/Library/pnpm/gitnexus` |
| `${PNPM_BIN_DIR}` | Directory containing pnpm-installed local CLI shims when the operator uses pnpm. | `~/Library/pnpm` on common macOS pnpm setups |
| `${CODEX_HOME}` | Codex CLI configuration root on the operator's machine. | `~/.codex` |
| `${CLAUDE_HOME}` | Claude CLI configuration root on the operator's machine. | `~/.claude` |
| `${CODEX_PLUGIN_ROOT}` | Operator-local Codex plugin source/cache root for custom plugins. | `~/plugins` or `${CODEX_HOME}/plugins` |
| `${PLANE_PLUGIN_ROOT}` | Operator-local clone of the `company-os-plane` Codex plugin source directory. | `${CODEX_PLUGIN_ROOT}/company-os-plane` |
| `${SITE_PROJECT_ROOT}` | Generic placeholder for a separate site / product clone the example integrates with. | `~/Developer/<example-site>` |
| `${CLIENT_APP_ROOT}` | Client app/backend clone when a client-domain example explicitly needs it. | `${DEVELOPER_ROOT}/<client-app>` |
| `${CLIENT_DESKTOP_ROOT}` | Client desktop/control-plane clone when a client-domain example explicitly needs it. | `${DEVELOPER_ROOT}/<client-desktop>` |
| `${CLIENT_DASHBOARD_ROOT}` | Client dashboard/command-center clone when a client-domain example explicitly needs it. | `${DEVELOPER_ROOT}/<client-dashboard>` |
| `${CLIENT_WEBSITE_ROOT}` | Client website/growth clone when a client-domain example explicitly needs it. | `${DEVELOPER_ROOT}/<client-website>` |

## Three-step resolution order for a fresh operator

1. **Read this table.** Pick the placeholder you need from the list above.
2. **Set or substitute.** Either `export COMPANY_OS_ROOT="$HOME/Developer/Company.OS"`
   in your shell, or replace the placeholder by hand before pasting the command.
3. **Run the command.** Scripts accept the resolved absolute path through
   their normal `--workspace-path`, `--company-root`, `--workspace`, etc.
   flags; the placeholder never has to leak into a script source file.

## Examples

```bash
export COMPANY_OS_ROOT="$HOME/Developer/Company.OS"
export CLAUDE_BIN="$(which claude)"

node "${COMPANY_OS_ROOT}/scripts/runtime/automation-runtime-runner.mjs" \
  --workspace-path "${COMPANY_OS_ROOT}" \
  --json
```

```bash
"${CLAUDE_BIN}" -p "Return exactly: CLAUDE_AUTH_OK"
```

```bash
"${GITNEXUS_BIN}" detect-changes --repo company-os --scope unstaged
```

## Where this applies

- All `docs/` files that describe runnable command sequences.
- `kits/company-os-kit/**` content that ships in the public mirror.
- Example registries, example workflows, sample worker contracts.
- Generated artifacts that summarize tracked content (e.g. `docs/page-index.md`)
  must not echo private `/Users/<name>/...` strings even when the source
  reports do; the page-index generator scrubs them at extraction time.

## Where this does not apply

- Internal report bodies in `reports/**` outside `reports/examples/` — those
  are stripped from the public mirror by the public-mirror builder and may
  retain absolute paths for internal auditability.
- Live Plane work item descriptions and runtime worker contracts — the
  dispatcher requires exact absolute paths there for scope-guard precision
  and forbids the worker from rewriting them.
- The `scripts/release/build-public-mirror.mjs` and
  `scripts/release/verify-clean-clone.mjs` source code — those operate on
  paths the operator passes through CLI args.

## Related

- `scripts/release/build-public-mirror.mjs` — strips internal-only paths.
- `scripts/release/verify-clean-clone.mjs` — `private.path.scan` check fails
  on any `/Users/[a-zA-Z][-a-zA-Z0-9]+` literal under `docs/` or `kits/`.
- `scripts/page-index/page-index-core.mjs` — `scrubPrivatePathsInString`
  redacts `/Users/<name>/...` matches before they enter the generated index.
