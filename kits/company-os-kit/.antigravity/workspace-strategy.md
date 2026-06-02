# 🗺️ Antigravity Workspace Strategy

> **Welcher Workspace profitiert von welchem Tool?**
> Dieses Dokument ist die Source of Truth für MCP-Server, Skills, Plugins und Persona-Zuordnungen.

---

## MCP-Server → Workspace Benefit Matrix

| MCP Server | Capability | ARES Bio.OS | The Swarm | NOUS Bridge | Meta-Workspace |
|---|---|---|---|---|---|
| **Supabase** | DB, Auth, Edge Functions, Migrations | ✅ Kern | ✅ Kern | ⚡ Edge Cases | ❌ |
| **GitHub** | Repos, PRs, Issues, Code Search | ✅ | ✅ | ✅ | ✅ |
| **Cloud Run** | Container Deploy, Services | ⚡ Optional | ⚡ Optional | ✅ Kern | ⚡ Optional |
| **Stitch** | UI Design Generation | ⚡ Prototyping | ⚡ Prototyping | ❌ | ✅ Kern |
| **Context7** (via Gateway) | Live API & Library Docs (No Hallucinations) | ✅ Kern | ✅ Kern | ✅ Kern | ✅ Kern |
| **Honcho MCP** | Semantic Memory (Cloud) für Arch-Decisions | ✅ Kern | ✅ Kern | ⚡ Setup | ✅ Kern |
| **Playwright** | Autonomes E2E Browser-Testing für QA | ✅ Kern | ✅ Kern | ❌ | ❌ |

**Legende:** ✅ Kern = Täglicher Einsatz | ⚡ = Situativ hilfreich | ❌ = Nicht relevant

---

## Persona → Workspace Relevanz

| Persona | ARES Bio.OS | The Swarm | NOUS Bridge | Meta-Workspace |
|---|---|---|---|---|
| 🧬 NOUS | ✅ Immer | ✅ Immer | ✅ Immer | ✅ Immer |
| 🖥️ Carmack | ✅ Engines, DB | ✅ Backend | ✅ Node.js | ⚡ |
| ⚛️ React Architect | ✅ UI/Components | ✅ Chat UI | ❌ | ❌ |
| 🖤 Steve Jobs | ✅ UX Vision | ✅ UX | ❌ | ⚡ Strategy |
| 🔍 Sherlock | ✅ Audit | ✅ Audit | ✅ Security | ✅ Kit Audit |
| 🕶️ Mr. Robot | ✅ Security | ✅ RLS/PII | ✅ Bridge Security | ⚡ |
| 🧠 Karpathy | ✅ System Design | ✅ Architecture | ✅ MCP Design | ✅ Kit Evolution |
| 📡 Cypher | ✅ Performance | ✅ Bundle | ⚡ | ❌ |
| 🥃 Don Draper | ✅ Copy | ✅ Chat UX Copy | ❌ | ⚡ Docs |
| 🌌 The Nexus | ✅ AI Architecture | ✅ AI Chat | ✅ MCP/Agent | ✅ Agent Design |
| 🛠️ The Refactorer | ✅ TDD/SOLID | ✅ Code Quality | ✅ Tests | ⚡ |

---

## Neue Capabilities → Impact Assessment

Wenn ein neues Tool/Skill/Plugin hinzukommt, bewerte es nach:

1. **Reach:** Wie viele Workspaces profitieren?
2. **Depth:** Wie tief ist der Impact pro Workspace?
3. **Integration:** Passt es in bestehende Chains/Mastertables?
4. **Maintenance:** Wie viel Pflege braucht es?

### Gewünschte Erweiterungen (Backlog)

| Tool/Capability | Status | Impact | Priorität |
|---|---|---|---|
| Figma MCP | 🟡 Evaluieren | Frontend-Projekte — Design Sync | Mittel |
| Linear/Jira MCP | 🟡 Evaluieren | Alle — Task Management | Mittel |
| Sentry MCP | 🟡 Evaluieren | Alle — Error Tracking | Mittel |

---

## Kit-Update-Protokoll

Wenn das Kit (`antigravity-kit/`) aktualisiert wird:

1. **Changelog schreiben** in `antigravity-kit/CHANGELOG.md`
2. **Diff prüfen** gegen aktive Workspace-Kopien
3. **Workspaces aktualisieren** die profitieren
4. **architect-memory.md** Layer 2 updaten
5. **Persona-Registry** aktualisieren falls neue Personas hinzukommen

---

*Zuletzt aktualisiert: 24.03.2026*
