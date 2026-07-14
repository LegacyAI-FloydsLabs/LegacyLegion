# LegacyLegion — FLOYD.md
**Version:** 1.7.2
**Initialized:** 2026-05-12T14:58:52-0400
**Governance:** .supercache/ v1.7.2
**Port:** 3106 (claimed in port-registry.json)
**Drive:** SanDisk1Tb
**Path:** /Volumes/SanDisk1Tb/LegacyLegion

> **Compliance Notice:** This file must match the template at
> `.supercache/templates/floyd-md-template.md`. If you are an agent reading
> this file and it is missing sections from the template, edit this file to
> add them. Preserve all project-specific content below. The template is the
> spec. This file is the implementation. Make them match.

---

## Agent Contract

You are working on **LegacyLegion**, a Legacy AI project.

**This file (`FLOYD.md`) is the canonical project spec.** It is authoritative for project identity, stack, ports, build commands, environment variables, and project-specific rules. All agents — Floyd, Claude, or any model routed through the OhMyFloyd harness — read this file first.

**Some projects also have a `CLAUDE.md` adapter** alongside this file. That adapter is optional and applies only when Claude is the active agent. It does not duplicate anything here; it layers Claude-specific behavior and role guidance on top. If `CLAUDE.md` conflicts with `FLOYD.md` on project facts, `FLOYD.md` wins. See `.supercache/templates/claude-md-template.md` for the adapter spec.

### Before You Start
1. Read this file completely. Do not skim. Every section constrains your behavior.
2. **If you are Claude Code**: also read `CLAUDE.md` if it exists at the project root. It contains your role, division of labor with Floyd, and Claude-specific rules.
3. Read `.supercache/READONLY` — you MUST NOT write to `.supercache/`.
4. Read `SSOT/LegacyLegion-phase1_SSOT.md` for current project state. Perform the Verification Sweep Protocol defined in `.supercache/contracts/document-management.md` for sections relevant to your task.
5. Read `Issues/LegacyLegion-phase1_ISSUES.md` for open issues and blockers.
6. Read `.supercache/manifests/port-allocation-policy.yaml` — NEVER use port 3000, 5000, 8000, 8080, or any other forbidden port. This project uses port **3106**. Do not change it without Douglas Talley's explicit approval.
7. Read `.supercache/contracts/execution-contract.md` — this governs how you prove your work.
8. Read `.supercache/contracts/repo-structure.md` — canonical layout for this project's language, plus the migration workflow if structural changes are needed.
9. Read `.supercache/contracts/git-discipline.md` — pre-commit checklist, commit message standards, secret hygiene, and reputation guardrails.
10. Read `.supercache/contracts/document-management.md` — Anti-Cruft Rule, canonical document homes, SSOT verification sweep, reference materials tier.
11. Read `.supercache/contracts/repo-hygiene.md` — `.gitignore` baseline for this language, cleanup triggers, project root tidiness standards.
12. Read `.supercache/manifests/model-routing.yaml` — this tells you which LLM to use for what.

### Governance Location
```
.supercache/ → /Volumes/SanDisk1Tb/.supercache
```
This directory contains global templates, contracts, manifests, and routing config.
It is **READ-ONLY**. Do not create, modify, or delete any file there.

### Where You Write

| Location             | Purpose                                          | Example                                         |
|----------------------|--------------------------------------------------|-------------------------------------------------|
| `SSOT/`              | Project status, decisions, findings, verification | `SSOT/LegacyLegion-phase1_SSOT.md`, `SSOT/decision-log.md` |
| `Issues/`            | Bugs, blockers, tasks, help-desk ledger          | `Issues/LegacyLegion-phase1_ISSUES.md`, `Issues/0001-description.md` |
| `.floyd/`            | Agent working state, session logs, runtime cache | `.floyd/agent_log.jsonl`                        |
| Project source files | Your actual work                                 | Any file in the project tree not listed below   |

### Where You Do NOT Write

| Location                         | Reason                                       |
|----------------------------------|----------------------------------------------|
| `.supercache/`                   | Global governance — READ-ONLY for all agents |
| `nextjs_space/.env.local`, `nextjs_space/.env*.local` | Secret-bearing local environment files; `.env.example` is allowed |
| `nextjs_space/node_modules/`     | Dependency install output                    |
| `nextjs_space/.next/`            | Next.js build/cache output                   |
| `nextjs_space/dogfood-output/`   | Local QA artifacts unless explicitly curated |

---

## Project Identity

| Field                | Value                                                                   |
|----------------------|-------------------------------------------------------------------------|
| **Name**             | LegacyLegion                                                            |
| **Purpose**          | AI-led marketing operations platform for Legacy AI agency workflows: agents plan/execute/verifiably route marketing work while humans handle credentials, approvals, and relationship/field actions. |
| **Primary Language** | TypeScript (Next.js application in `nextjs_space/`)                     |
| **Runtime**          | Node.js with Yarn 4.10.3 via Corepack                                  |
| **Module System**    | ESM / Next.js App Router                                                |
| **Framework**        | Next.js 14.2.35, React 18.2.0                                           |
| **Database**         | PostgreSQL via Prisma 6.7.0                                             |
| **Port**             | **3106** — claimed in `/Volumes/SanDisk1Tb/SSOT/port-registry.json`    |
| **Repository**       | `https://github.com/LegacyAI-FloydsLabs/LegacyLegion.git`              |
| **Current Phase**    | Phase 1 merged to `main`; canonical active checkout is `/Volumes/SanDisk1Tb/LegacyLegion` |

---

## Project Structure

```
LegacyLegion/
├── nextjs_space/                 # Runnable Next.js 14 application root
│   ├── app/                      # App Router pages and API routes
│   ├── components/               # Shared React UI components
│   ├── lib/                      # Agent, prospecting, intelligence, export, auth, and utility modules
│   ├── prisma/                   # Prisma schema for PostgreSQL-backed app data
│   ├── scripts/                  # Verification, seed, and contract-test scripts
│   ├── docs/                     # App-specific release and review documentation
│   ├── package.json              # Yarn scripts and dependency manifest
│   └── yarn.lock                 # Committed Yarn lockfile
├── .vercelignore                 # Vercel upload exclusion rules
├── SSOT/                         # Project status, decisions, architecture facts, verification records
├── Issues/                       # Project issue ledger
├── .floyd/                       # Agent working state; gitignored
├── .gitignore                    # Repo ignore rules
└── FLOYD.md                      # Canonical project governance spec
```

---

## Build & Verify Commands

<!-- Every command must be copy-pasteable from the project root. -->
<!-- Every command must have an expected result so the agent knows pass/fail. -->
<!-- If a command does not apply, write 'N/A — [reason]' in the Expected Result column. -->

| Action         | Command                                                                 | Expected Result             |
|----------------|-------------------------------------------------------------------------|-----------------------------|
| **Install**    | `cd nextjs_space && yarn install --immutable`                         | Exit 0, lockfile unchanged  |
| **Type check** | `cd nextjs_space && yarn tsc --noEmit --pretty false`                   | Exit 0, no errors           |
| **Build**      | `cd nextjs_space && yarn build`                                         | Exit 0                      |
| **Test**       | `cd nextjs_space && yarn test`                                          | Exit 0, all tests pass      |
| **Lint**       | `cd nextjs_space && yarn lint`                                          | Exit 0                      |
| **Start**      | `cd nextjs_space && yarn start --hostname 127.0.0.1 --port 3106`        | Service up on port 3106     |
| **Dev**        | `cd nextjs_space && yarn dev --hostname 127.0.0.1 --port 3106`          | Live reload active on 3106  |

### Verification sequence after any change:
```bash
cd nextjs_space && yarn install --immutable && yarn lint && yarn tsc --noEmit --pretty false && yarn test && yarn build
```

---

## Port Allocation

<!-- If this project does not bind a port, replace the table with: -->
<!-- "This project is a CLI/library/script. No port binding. No claim needed." -->

| Port     | Service                                          | Status                              |
|----------|--------------------------------------------------|-------------------------------------|
| **3106** | Next.js local dev/review surface for phase-1 app | **CLAIMED** in `port-registry.json` |

**Rules:**
- This project runs locally on port **3106**. That port is claimed in `/Volumes/SanDisk1Tb/SSOT/port-registry.json`.
- Do not change the port without Douglas Talley's explicit approval.
- Do not bind to any port in the forbidden list (see `.supercache/manifests/port-allocation-policy.yaml`).
- Verify before starting: `lsof -i :3106` — if something else is bound, investigate before killing.

---

## Project-Specific Rules

| #   | Rule | Rationale |
|-----|------|-----------|
| R1  | Use Yarn only from `nextjs_space/`; do not introduce npm, pnpm, or framework upgrades inside feature work. | The handoff and lockfile are Yarn-based, and hidden package-manager drift breaks reproducibility. |
| R2  | Schema work must be additive unless a separate migration plan is approved; never run destructive Prisma commands against shared data. | Client, lead, agent-memory, and work-order records are operational data. |
| R3  | Missing external credentials must surface structured not-configured states; never return fabricated prospect, GBP, analytics, or campaign data. | The product sells evidence-backed marketing operations, not plausible mock output. |
| R4  | Any external write, outreach, publishing, credential use, client-visible delivery, or spend-bearing action requires a human approval state. | The LLM is the senior operator, but humans own account risk, client trust, and real-world actions. |
| R5  | Keep raw secrets out of code, docs, commits, logs, screenshots, and chat transcripts. | This repository is public on GitHub and must be safe if read externally. |

---

## Known Patterns & Lessons

| Pattern | Trigger | Fix | Confidence |
|---------|---------|-----|------------|
| canonical-worktree-first | New work starts after Phase 1 merge | Treat `/Volumes/SanDisk1Tb/LegacyLegion` on `main` as the canonical active checkout; archived/reference material stays in `.floyd/quarantine/` unless explicitly reviewed and sanitized. | 1.0 |
| connector-not-configured | External API key/env var is absent | Return explicit not-configured/error state; do not mock or invent marketing data. | 1.0 |
| approval-before-external-write | Agent proposes outreach, publishing, client-visible delivery, account change, or spend-bearing action | Create/reuse approval state before executing; record approval evidence. | 1.0 |

---

## Environment Variables

<!-- Source: environment files under `nextjs_space/` (DO NOT COMMIT secret values). -->
<!-- Template status: create/update `.env.example` before onboarding new operators. -->

| Variable | Required | Purpose | Example |
|----------|----------|---------|---------|
| `PORT` | Yes | Local Next.js review port | `3106` |
| `NEXTAUTH_URL` | Yes | Canonical app URL for auth callbacks | `http://127.0.0.1:3106` |
| `NEXTAUTH_SECRET` | Yes | NextAuth signing secret | `<secret>` |
| `DATABASE_URL` | Yes | PostgreSQL connection for Prisma | `<postgres-url>` |
| `ABACUSAI_API_KEY` | Yes for agent/RouteLLM features | LLM and RouteLLM calls | `<secret>` |
| `AGENT_API_URL` | No | Legacy agent bridge endpoint when used | `<url>` |
| `APOLLO_API_KEY` | No | Apollo prospecting connector | `<secret-if-enabled>` |
| `EXPLORIUM_API_KEY` | No | Explorium prospecting connector | `<secret-if-enabled>` |
| `PINECONE_API_KEY` | No | Pinecone memory connector | `<secret-if-enabled>` |
| `PINECONE_PRIMARY_HOST` | No | Pinecone index host for memory/search | `<url-if-enabled>` |
| `MEMORY_NAMESPACE_PREFIX` | No | Optional Pinecone namespace prefix | `legacy-legion` |
| `CRON_SECRET` | No | Authenticates scheduled route execution | `<secret-if-enabled>` |
| `NOTIF_ID_DAILY_DIGEST` | No | Notification type ID for daily digest | `<id-if-enabled>` |
| `NOTIFICATION_API_URL` | No | Notification delivery API endpoint | `<url-if-enabled>` |
| `NOTIFICATION_API_KEY` | No | Notification delivery API key | `<secret-if-enabled>` |

---

## Execution Contract

Before claiming any task complete, provide:

1. **Exact action taken** — what you did, specifically
2. **Direct evidence** — file path + line, command + output, diff, or screenshot
3. **Verification result** — run the verification sequence above, all must exit 0
4. **Status** — mark COMPLETE only after steps 1-3 are proven

See `.supercache/contracts/execution-contract.md` for the full contract.

---

## Mandatory execution contract
For EACH requested item:
1) Show exact action taken
2) Show direct evidence (file/line/command/output)
3) Show verification result
4) Mark status only after proof

## Forbidden behaviors
- Declaring "done" without evidence
- Collapsing multiple requested items into one vague summary
- Skipping failed steps without explicit blocker report

## Required output structure
A) Requested items checklist
B) Per-item evidence ledger
C) Verification receipts
D) Completeness matrix (item -> done/blocked -> evidence)

## Hard gate
If any requested item has no evidence row, final status MUST be INCOMPLETE.
