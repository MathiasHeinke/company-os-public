# Tech Stack Context — [PROJEKT]

> Meta-workspace context for the agents that operate `[PROJEKT]`.
> Replace every `[PLACEHOLDER]` with the value that applies to your
> install. Do not paste live credentials, production hostnames, internal
> service identifiers or customer data into this file; those belong in
> the operator's private overlay, not in the public kit.

---

## IDE & Agent Tools

| Aspect | Choice |
|---|---|
| IDE / Agent host | `[IDE or agent host]` |
| Agent framework | `[Persona / role-agent system in use]` |
| Routing | `[Router / dispatch pattern]` |
| Memory (operational) | `memory-bank/` (file-based ground truth) |
| Memory (strategic) | `architect-memory.md` (decision records, see logs/) |
| Memory (semantic) | `[Honcho or equivalent semantic provider]` |
| Config | `.antigravity/` kit + `.agents/rules/` |

---

## MCP Servers (Model Context Protocol)

Reference each MCP server by capability, not by vendor branding, so the
kit stays portable across providers.

| Server | Interface | Capabilities |
|---|---|---|
| `[Library docs server]` | `[stdio / HTTP / port]` | Library documentation, PII scrubbing |
| `[Database / backend server]` | `[stdio / HTTP]` | DB queries, migrations, edge functions, types, advisors |
| `[Git host server]` | `[stdio]` | Repos, pull requests, issues, code search, releases |
| `[Container / runtime server]` | `[stdio / HTTP]` | Container deploy, service management, logs |
| `[UI design server]` | `[stdio]` | UI design generation, screen creation, variants |
| `[Code intelligence server]` | `[stdio]` | Code intelligence: query, impact, context, rename, detect changes |

### Code intelligence

Every managed workspace in `[PROJEKT]` should be indexed by a code
intelligence MCP server. Agents must run impact analysis before editing
shared symbols and must verify scope before pushing.

### Gateway / runtime stack

| Component | Provider | Model / Config |
|---|---|---|
| LLM | `[Provider]` | `[Model id]` |
| Embedder | `[Provider]` | `[Model id]` |
| Memory | `[Semantic memory provider]` and file-based memory bank | `memory-bank/*.md` |
| PII scrubber | Regex | Email, phone, payment, IBAN, government identifier |
| Library docs | `[Server]` | `[Token budget]` |
| Autostart | `[Service manager]` | `[Service name]` |

---

## Managed Workspaces

| Workspace | Tech Stack | Gateway | Relevant Role Agents |
|---|---|---|---|
| `[Workspace A]` | `[Stack]` | `[Gateway state]` | `[Role agents]` |
| `[Workspace B]` | `[Stack]` | `[Gateway state]` | `[Role agents]` |

---

## Kit System

| Aspect | Details |
|---|---|
| Role agents | `[Count]` (in `.antigravity/personas/`) |
| Knowledge files | `[Count]` (in `.antigravity/knowledge/`) |
| Workflows | `[Count]` (in `.antigravity/workflows/`) |
| Mastertables | `[Count]` |
| Chains | `[Count]` |
| Memory bank | `[Count]` template files (in `memory-bank/`) |
| MCP gateway | Template in `scripts/mcp-gateway-template/` |

---

## Boot Sequence (Layer Principle)

```
Layer 0    -> Identity (main agent = system-prompt + main-agent.md)
Layer 0.5  -> Working memory (activeContext.md + progress.md)
Layer 0.75 -> Infrastructure (gateway health check)
Layer 1    -> Rules (copy-rules + tech-stack + agentic-router)
Layer 2    -> On-demand (role agents, knowledge, architect-memory)
```

---

## Data Flow

```
User intent -> Main agent (Layer 0) -> Memory bank (Layer 0.5)
                                          |
                                Gateway check (Layer 0.75)
                                          |
                                Agentic router -> Role agent / Chain / Mastertable
                                          |
                                MCP servers (library docs / DB / git / runtime / design / code intelligence)
                                          |
                                Workspace-specific work
                                          |
                                Quality gate -> /update-memory -> Output
```
