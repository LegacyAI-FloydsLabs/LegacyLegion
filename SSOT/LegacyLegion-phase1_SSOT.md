# LegacyLegion-phase1 SSOT (Single Source of Truth)
**Created:** 2026-05-12T14:58:52-0400
**Last Updated:** 2026-05-12T14:58:52-0400
**Governance:** .supercache/ v1.7.0

> **Compliance Notice:** This file must match the structure at
> `.supercache/templates/ssot-template.md`. This is the authoritative
> document for architecture and programmatic change facts of **LegacyLegion-phase1**.

---

## Authority

This document is the **single source of truth** for architecture and programmatic change facts of LegacyLegion-phase1. All other documents must be treated as **potentially flawed** unless their facts are confirmed here.

When a fact in any other document contradicts this SSOT, the SSOT wins. If the SSOT itself is wrong, it is corrected via the **Verification Sweep Protocol** below, not by editing other documents to match.

---

## Verification Sweep Protocol (required on every read)

When an agent reads this SSOT to perform a task:

1. Perform a **line-by-line verification review** of the sections relevant to the current task.
2. For each verified fact, append a verification entry to the **Verification Log** at the bottom of this file with:
   - Timestamp (`YYYY-MM-DD HH:MM TZ`)
   - Section/line reference
   - Evidence source (code path + line, command + output, build log, runtime behavior, etc.)
   - Confidence = 100%
3. If any fact cannot be verified to 100% confidence:
   - Mark it **UNVERIFIED** inline in the section where it appears
   - Add an entry to `Issues/LegacyLegion-phase1_ISSUES.md` to track the discrepancy
   - Do NOT proceed on the assumption that the fact is true

### Positive Reinforcement (required)

For each fact verified at 100% confidence during a sweep, emit the acknowledgement:

```
Verified as fact (100%): <fact summary>
```

This pattern is deliberate — it reinforces evidence-first thinking and makes the verification record auditable after the fact.

---

## Current State

**Phase:** Phase 1 merged / canonical checkout cutover
**Status:** Active on `main`
**Last Agent Session:** 2026-05-18 01:50 EDT

---

## Architecture Facts

- Active implementation root is `/Volumes/SanDisk1Tb/LegacyLegion`.
- Runnable app root is `nextjs_space/`.
- `/Volumes/SanDisk1Tb/LegacyLegion` is the canonical `main` worktree; `/Volumes/SanDisk1Tb/LegacyLegion-phase1` has been removed with `git worktree remove`.
- The repository remote is `https://github.com/LegacyAI-FloydsLabs/LegacyLegion.git`; GitHub default branch is `main`.
- Local review port is `3106`, claimed in `/Volumes/SanDisk1Tb/SSOT/port-registry.json`.
- `/Volumes/SanDisk1Tb/LegacyLegionLocal` was reference-only handoff material and is now quarantined outside normal agent paths at `/Volumes/SanDisk1Tb/LegacyLegion/.floyd/quarantine/2026-05-18/LegacyLegionLocal`.

### Stack

- **Primary language**: TypeScript
- **Framework**: Next.js 14.2.28 with React 18.2.0
- **Runtime**: Node.js with Yarn 4.10.3 via Corepack
- **Module system**: ESM / Next.js App Router
- **Database**: PostgreSQL via Prisma 6.7.0

### Key architectural choices

- Treat `/Volumes/SanDisk1Tb/LegacyLegion` on `main` as the active implementation checkout.
- Keep human approval as a hard boundary for credential use, external writes, publishing, outreach, client-visible delivery, and spend-bearing actions.
- Missing connector credentials produce structured not-configured states; mock marketing/prospect/intelligence data is not acceptable.

---

## Key Decisions

| Date | Decision | Rationale | Decided By |
|---|---|---|---|
| 2026-05-17 | Canonicalize active work around `LegacyLegion-phase1` worktree until branch integration | Verified branch/worktree evidence shows phase implementation lives on `floyd/phase-1-routellm-agents`, while `LegacyLegionLocal` is reference-only handoff material. | Agent / Douglas direction |
| 2026-05-17 | Claim port 3106 for local LegacyLegion phase review | Existing local QA references used 3106 and the port was unclaimed/free; forbidden default Next.js ports must be avoided. | Agent |
| 2026-05-18 | Cut over canonical active source to `/Volumes/SanDisk1Tb/LegacyLegion` on `main` | PR #1 merged cleanly and the phase worktree was removed through git worktree management after canonical checkout sync. | Agent / Douglas approval |

<!-- Decisions are append-only. When a decision is superseded, add a new row with the -->
<!-- superseding decision and link back to the old one. Never edit historical rows. -->

---

## Dependencies

| Dependency | Version | Purpose | Criticality |
|---|---|---|---|
| `next` | 14.2.28 | App framework | critical |
| `react` / `react-dom` | 18.2.0 | UI runtime | critical |
| `@prisma/client` / `prisma` | 6.7.0 | PostgreSQL ORM and schema tooling | critical |
| `next-auth` | 4.24.11 | Team/partner authentication | critical |
| `tsx` | 4.20.3 | TypeScript verification scripts | dev-only |

---

## Deployment

| Environment | URL / Location | Status | Last Deploy |
|---|---|---|---|
| production | `https://legacylegion-lc6lgnruc-legacy-floydslabs.vercel.app` | Vercel deployment Ready; protected smoke check returned HTTP 200 | 2026-05-18 01:44 EDT |
| staging | No separate staging project configured in this session | N/A | N/A |
| local | `http://127.0.0.1:3106` from `nextjs_space/` | dev/review port claimed; service not started in this session | N/A |

---

## Known Patterns & Lessons

| Pattern | Trigger | Fix | Confidence |
|---|---|---|---|
| canonical-worktree-first | New work starts while multiple LegacyLegion directories exist | Use `LegacyLegion-phase1` for active phase implementation until branch integration; use `LegacyLegionLocal` as reference-only. | 1.0 |
| connector-not-configured | External credential is absent | Return structured unavailable/not-configured state; never fabricate data. | 1.0 |
| approval-before-external-write | Agent proposes client-visible or external-write action | Require human approval evidence before execution. | 1.0 |

---

## Verification Log (append-only)

Every sweep of this SSOT must append one or more entries here. Never edit or remove existing entries.

| Timestamp | Section / Line | Fact Verified | Evidence Source | Confidence |
|---|---|---|---|---|
| 2026-05-12T14:58:52-0400 | Authority | Document initialized as SSOT | bootstrap.sh --init created from template | 100% |
| 2026-05-17 15:27 -0400 | Current State | Phase 1 worktree is active on `floyd/phase-1-routellm-agents` | `git status --short --branch`; `git worktree list --porcelain`; `git rev-parse HEAD` | 100% |
| 2026-05-17 15:27 -0400 | Architecture Facts | App root is `nextjs_space/`; package scripts expose Yarn lint/test/build/dev/start | `nextjs_space/package.json:4-11`; project directory listing | 100% |
| 2026-05-17 15:27 -0400 | Architecture Facts | Repository remote is `https://github.com/LegacyAI-FloydsLabs/LegacyLegion.git`, default branch `main` | GitHub repo view output and `git remote -v` | 100% |
| 2026-05-17 15:27 -0400 | Deployment | Port 3106 is claimed for local LegacyLegion phase review and was free before claim | `lsof -i :3106` exit 1; `/Volumes/SanDisk1Tb/SSOT/port-registry.json` JSON validation | 100% |
| 2026-05-17 15:27 -0400 | Stack | Package manager is pinned to Yarn 4.10.3 in `nextjs_space/package.json` for deterministic Corepack installs | `nextjs_space/package.json:4`; `yarn --version` | 100% |
| 2026-05-18 00:49 EDT | Architecture Facts | Active implementation remains `/Volumes/SanDisk1Tb/LegacyLegion-phase1` on `floyd/phase-1-routellm-agents`; sibling `/Volumes/SanDisk1Tb/LegacyLegion` remains `main` | `git status --short --branch`; `git worktree list --porcelain`; `git rev-parse HEAD` | 100% |
| 2026-05-18 00:49 EDT | Architecture Facts | PR #1 is open from `floyd/phase-1-routellm-agents` to `main` with CLEAN merge state and no GitHub status checks configured | `pr://LegacyAI-FloydsLabs/LegacyLegion/1?comments=0`; `gh pr view 1 --json state,mergeStateStatus,statusCheckRollup` | 100% |
| 2026-05-18 00:49 EDT | Verification | Local pre-merge verification from `nextjs_space/` passed install, lint, typecheck, tests, and production build | `yarn install --immutable && yarn lint && yarn tsc --noEmit --pretty false && yarn test && yarn build` exit 0 | 100% |
| 2026-05-18 00:54 EDT | Verification | Phase contract tests 1, 2, 3, and 5 passed; Phase 4 memory verification requires approved Pinecone credential use and remains blocked when the key is intentionally blank | `yarn tsx scripts/phase1-dispatcher-test.ts` exit 0; `phase2-prospects-test.ts` exit 0; `phase3-intelligence-test.ts` exit 0; `phase5-export-digest-test.ts` exit 0 with throwaway PostgreSQL; `phase4-memory-test.ts` exits 1 at `PINECONE_API_KEY is required` | 100% |
| 2026-05-18 00:58 EDT | Architecture Facts | `LegacyLegionLocal` reference material was moved out of normal agent paths into canonical-checkout local quarantine | `read LegacyLegionLocal` returned not found; `read LegacyLegion/.floyd/quarantine/2026-05-18` shows `LegacyLegionLocal/` and `WHY.md` | 100% |
| 2026-05-18 01:44 EDT | Verification | Approved external Phase 4 memory verification passed against Pinecone with throwaway PostgreSQL and teardown confirmed | `yarn tsx scripts/phase4-memory-test.ts` exit 0; `lsof -i :55432` exit 1 after teardown | 100% |
| 2026-05-18 01:46 EDT | Deployment | Vercel project `legacylegion` is configured with root directory `nextjs_space`, all restored env keys are configured encrypted for production/preview/development, and production deployment is Ready | `vercel project inspect legacylegion`; Vercel env API upsert reported 13 updated, 0 failed; `vercel inspect legacylegion-lc6lgnruc-legacy-floydslabs.vercel.app`; `vercel curl / --deployment ... -- --head` returned HTTP 200 | 100% |
| 2026-05-18 01:46 EDT | Reference Audit | Downloaded original reference zip is reference-only and contains 55 sensitive/private candidate text files; none were promoted into the project | `/Users/douglastalley/Downloads/LegacyAI_Marketing_Strategy.zip` zip scan over text-like files | 100% |
| 2026-05-18 01:48 EDT | Verification | Final local pre-merge verification passed after Vercel ignore/governance updates | `yarn install --immutable && yarn lint && yarn tsc --noEmit --pretty false && yarn test && yarn build` exit 0 | 100% |
| 2026-05-18 01:50 EDT | Architecture Facts | Canonical checkout is `/Volumes/SanDisk1Tb/LegacyLegion` on `main` at merge commit `f6e3ec3345a423d24cf9e649ddf1734ed441c9e2`; phase worktree was removed | `git pull --ff-only origin main`; `git worktree remove /Volumes/SanDisk1Tb/LegacyLegion-phase1`; `git worktree list --porcelain`; `read LegacyLegion-phase1` returned not found | 100% |
| 2026-05-18 03:33 EDT | Verification | Security hardening added explicit API allowlists, internal/admin/partner route guards, lead assessment tokens, public rate limits, and env-only operator bootstrap | `nextjs_space/middleware.ts`; `nextjs_space/lib/authz.ts`; `nextjs_space/lib/public-assessment-token.ts`; `nextjs_space/lib/rate-limit.ts`; `nextjs_space/scripts/security-hardening-test.ts`; `yarn install --immutable && yarn lint && yarn tsc --noEmit --pretty false && yarn test && yarn build` exit 0 | 100% |
| 2026-05-18 03:36 EDT | Verification | Prisma migrations directory now contains an initial PostgreSQL migration and database backup/restore scripts are available through package scripts | `nextjs_space/prisma/migrations/20260518033300_init/migration.sql`; `nextjs_space/prisma/migrations/migration_lock.toml`; `nextjs_space/scripts/postgres-backup.ts`; `yarn tsx scripts/postgres-backup.ts --help` exit 0; full verification exit 0 | 100% |
| 2026-05-18 03:58 EDT | Verification | Secure client access intake now stores only external vault/admin-invite references, records auditable access events, and gates approve/reject/revoke decisions to admins | `nextjs_space/prisma/schema.prisma`; `nextjs_space/prisma/migrations/20260518042000_client_access_intake/migration.sql`; `nextjs_space/app/api/agency/clients/[id]/access-requests/route.ts`; `nextjs_space/app/api/agency/clients/[id]/access-requests/[requestId]/route.ts`; `nextjs_space/app/app/agency/clients/[id]/_components/client-access-panel.tsx`; `yarn tsx scripts/client-access-test.ts` exit 0; `yarn install --immutable && yarn lint && yarn tsc --noEmit --pretty false && yarn test && yarn build` exit 0 | 100% |
| 2026-05-18 07:18 EDT | Verification | Team-only dogfood mode hides public signup, partner signup/login, client intake, and widget/chat self-service surfaces while preserving future reactivation code paths | `nextjs_space/middleware.ts`; `nextjs_space/app/login/page.tsx`; `nextjs_space/app/app/_components/team-shell.tsx`; `nextjs_space/app/app/referrals/_components/referrals-client.tsx`; `nextjs_space/app/app/agent/_components/agent-settings.tsx`; `nextjs_space/scripts/security-hardening-test.ts`; `yarn install --immutable && yarn lint && yarn tsc --noEmit --pretty false && yarn test && yarn build` exit 0 | 100% |

---

## Change Log (append-only)

- 2026-05-12T14:58:52-0400 — Initialized SSOT.
- 2026-05-17 15:27 -0400 — Canonicalized current project facts, active worktree status, local port claim, dependencies, and deployment status.
- 2026-05-17 15:27 -0400 — Pinned package manager documentation to Yarn 4.10.3 / Corepack and updated install verification command.
- 2026-05-18 00:49 EDT — Rebuilt local pre-merge verification evidence, confirmed PR #1 merge state, and retained production/staging verification as unresolved target-environment evidence.
- 2026-05-18 00:54 EDT — Added phase-script verification evidence and recorded Phase 4 memory verification as blocked pending approved Pinecone credential use.
- 2026-05-18 00:58 EDT — Quarantined `LegacyLegionLocal` reference-only material under the canonical checkout `.floyd/quarantine` directory and recorded the new path.
- 2026-05-18 01:46 EDT — Verified approved Phase 4 memory path, Vercel encrypted environment configuration, production deployment readiness, and original reference package audit.
- 2026-05-18 01:48 EDT — Re-ran final local verification after Vercel ignore and governance evidence updates.
- 2026-05-18 01:50 EDT — Cut canonical active source over to `/Volumes/SanDisk1Tb/LegacyLegion` on `main` and removed the phase worktree.
- 2026-05-18 03:33 EDT — Hardened auth/RBAC and public costly routes, replaced unsafe seed path with env-only operator bootstrap, and verified full local build sequence.
- 2026-05-18 03:36 EDT — Added initial Prisma migration SQL, migration lock, and PostgreSQL backup/restore scripts; re-ran full local verification.

<!-- Append new entries BELOW this comment line, in chronological order. -->
<!-- Never edit or remove existing entries — this is the authoritative change history. -->
- 2026-05-18 03:58 EDT — Added secure client access-intake ledger with external-reference-only storage, admin approval controls, and audit events; verified focused contract test and full local build sequence.
- 2026-05-18 07:18 EDT — Enabled team-only dogfood mode for Douglas/Ryan operations, hiding self-service entry points and verifying focused contracts plus full local build sequence.

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
