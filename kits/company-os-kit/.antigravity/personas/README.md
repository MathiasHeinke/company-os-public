# Persona Doctrine — Role-Based Public Personas

**Operator-facing. Not legal advice.**

---

## Doctrine: Role-Based Public Personas Only

The Company.OS Kit ships **role-based expert persona archetypes only**. Named personas — including representations of living persons, fictional characters, brand characters, or proper-name analogues — are not included in the public kit.

### Why

Public distribution of named-person or named-character personas as productized AI assets raises right-of-publicity, trademark, and IP concerns that have not been resolved on a doctrine or license level. Specifically:

- **Living public figures:** Right of publicity varies by jurisdiction; commercial use of a person's name/likeness/identity without consent is commonly restricted, even in instructional or transformative formats.
- **Fictional characters:** May be protected by trademark or copyright. A character name may be associated with a media property whose IP owner can assert rights (e.g. TV/film characters, novel characters still under copyright protection).
- **Named characters from media:** Even if a character name feels generic, the original IP owner may assert trade dress or brand confusion claims.

The Company.OS MIT license covers the code in this repository. It does not grant the right to commercially distribute persona representations of named individuals or named fictional characters. Those rights are owned by the individuals or their estates, or by the IP holders of the media properties.

This note explains the doctrine choice. **It is not legal advice.** If your deployment requires named or character personas for distribution, consult qualified legal counsel in your jurisdiction.

---

## Public Kit: Included Role-Based Personas

These personas ship with the public kit and are safe for distribution:

| File | Role | Domain |
|------|------|--------|
| `ai-architect.md` | AI Architect | AI/ML systems, RAG pipelines, multi-agent architecture |
| `ai-systems-architect.md` | AI Systems Architect | Meta-architecture, system strategy, AI pipelines |
| `audit-investigator.md` | Audit Investigator | Debugging, investigation, production audits |
| `behavioral-scientist.md` | Behavioral Scientist | UX psychology, cognitive biases, nudge design |
| `code-quality-architect.md` | Code Quality Architect | Refactoring, clean code, SOLID principles, TDD |
| `compliance-officer.md` | Compliance Officer | Privacy, data protection, regulatory compliance |
| `copy-architect.md` | Copy Architect | Copywriting, positioning, brand voice |
| `engineering-lead.md` | Engineering Lead | Backend systems, algorithms, production engineering |
| `first-principles-thinker.md` | First Principles Thinker | Radical simplification, deletion-first design |
| `growth-engine.md` | Growth Engine | Growth strategy, marketing pressure-test |
| `meta-orchestrator.md` | Meta Orchestrator | Context loading, routing, system orientation |
| `motion-designer.md` | Motion Designer | Animation, visual storytelling, Remotion/Framer |
| `performance-engineer.md` | Performance Engineer | Performance optimization, SRE, caching |
| `product-visionary.md` | Product Visionary | Product design, UX standard, brand experience |
| `react-architect.md` | React Architect | UI/UX, React, state management, interaction design |
| `resilience-engineer.md` | Resilience Engineer | Reliability, failure modes, antifragility |
| `security-engineer.md` | Security Engineer | Application security, RLS, PII handling |

---

## Private Overlay: Named or Domain-Specific Personas

If your deployment uses:

- **Named personas** (inspired by specific individuals or characters), or
- **Domain-specific personas** (e.g. longevity science, regulated medical, legal, financial)

keep those in a **private overlay** that is not part of any public distribution.

Recommended path: `~/.company-os/private-overlays/[workspace]/personas/`

Named personas from an operator's internal development kit may remain in private workspaces where the operator controls distribution. They must not be included in any public repository or client-facing installation that ships under the Company.OS Kit name.

---

## Adding New Personas to the Public Kit

Role-based personas added to the public kit must:

- Use a **role-describing ID** (e.g. `domain-researcher`, `legal-analyst`) — not a person's name or character name
- Describe an **archetype**, not a specific individual
- Not reference any named person, fictional character, or media property in their content
- Be reviewed by the operator before including in a client installation

---

## Agentic Router

The `.antigravity/agentic-router.md` dispatch table and chain tables reference only the role-based persona IDs listed above. Update the router when adding new personas.
