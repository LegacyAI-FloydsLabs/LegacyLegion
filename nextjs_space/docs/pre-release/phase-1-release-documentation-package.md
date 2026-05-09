# LegacyLegion Phase 1 Pre-Release Documentation Package

Audience: LegacyAI release owner, internal operators, and implementation engineers preparing the Phase 1 sandbox for release review.

Post-read action: review the conservative internal pre-release decision set, execute the listed verification commands, and resolve QA/environment blockers before any external launch.

Evidence policy: this package is scoped to the diff from `main...HEAD`, current-session file reads, current-session git/build/test output, current-session browser QA artifacts, and public `LegacyAI.info` browser evidence. Anything not directly verified is either excluded from release claims or listed in **Deferred Until Production Evidence Exists** instead of being treated as fact.

## 1. Release Notes

### Release scope

This pre-release documents branch `floyd/phase-1-routellm-agents` at HEAD `4567b8e4b732e51c290a0a8a8f53a48ef4fb7559`, compared against merge-base `fe4cb5630db5ca2562113910729674aa3c3325e0` using `main...HEAD`.

The diff contains 56 changed paths, including the agent chat API, agency chat UI, prospecting routes, intelligence routes, client export route, digest route, Pinecone memory work, Prisma schema additions, phase verification scripts, Vercel cron configuration, and dependency lockfile changes.

### User-facing highlights

- **Role-based agency agents**: The app now defines six personas: Senior Advisor, Marketing Guru, Lead-Gen Manager, Account Manager, Intelligence Agent, and Tool-Builder. The agent route persists turns, recalls scoped memory, streams RouteLLM responses, and can emit tool events when the model returns the documented `TOOL_CALL` format.
- **Vibe prospecting workflow**: Lead-Gen Manager can search net-new prospects through Explorium or Apollo, dedupe against existing leads/prospects, persist results, and promote prospects into leads when they have an email address.
- **Client intelligence snapshots**: Client intelligence can refresh public Google Business Profile data, ingest Google Search Console CSV summaries, upsert a client intelligence record, and write intelligence memory.
- **Client snapshot exports**: Client workspaces now have export support for Markdown, JSON, and PDF snapshots containing profile, engagement, strategy, recent work orders, recent notes, recent conversations, and intelligence brief sections.
- **Daily agency digest**: A non-critical daily digest can collect yesterday’s work orders, new prospects, GBP changes, suggested actions, and open work-order counts, then send through a configured notification API.
- **Dynamic rendering guardrail**: Changed runtime routes/pages observed in the diff use `export const dynamic = 'force-dynamic'`, matching the Phase 1 guardrail for session/database-backed surfaces.

### Verification state

- `yarn build` completed successfully and generated 27 static pages plus dynamic API/app routes.
- `yarn tsx scripts/phase1-dispatcher-test.ts` passed.
- `yarn tsx scripts/phase2-prospects-test.ts` passed.
- `yarn tsx scripts/phase5-export-digest-test.ts` passed against a local throwaway PostgreSQL verification database after Prisma schema sync.
- `yarn lint` passed after committing an explicit ESLint flat config and aligning the ESLint 9-compatible plugin versions.
- `yarn tsc --noEmit --pretty false` passed.
- Fresh local Browser QA on `http://127.0.0.1:3106` confirmed closure of the previously reported high/medium code findings: logout now lands on `/login`, Agent Settings renders the widget snippet without hydration-error output, login exposes a `main` landmark, public audit/Add Lead/ROI calculator/partner application/pipeline/client workspace controls expose names, and the local QA database no longer contains generated Phase 4/Phase 5 fixture clients. External launch remains gated on production/environment verification.

## 2. Quickstart for Release Reviewers

### Prerequisites

Use Yarn. The repository’s Phase 1 notes explicitly say “Yarn only,” and `package.json` exposes `dev`, `build`, `start`, and `lint` scripts.

Required runtime configuration observed in changed/runtime-relevant files:

| Area | Variables |
|---|---|
| Auth and app URLs | `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `DATABASE_URL` |
| RouteLLM / Abacus | `ABACUSAI_API_KEY` |
| Legacy agent bridge | `AGENT_API_URL` |
| Prospecting connectors | `APOLLO_API_KEY`, `EXPLORIUM_API_KEY` |
| Pinecone memory | `PINECONE_API_KEY`, `PINECONE_PRIMARY_HOST`, `MEMORY_NAMESPACE_PREFIX` |
| Cron/digest notifications | `CRON_SECRET`, `NOTIF_ID_DAILY_DIGEST`, `NOTIFICATION_API_URL`, `NOTIFICATION_API_KEY` |
| Build controls | `NEXT_DIST_DIR`, `NEXT_OUTPUT_MODE` |

### Review commands

Run from `nextjs_space`:

```bash
yarn install --immutable
yarn build
yarn lint
yarn tsc --noEmit --pretty false
yarn tsx scripts/phase1-dispatcher-test.ts
yarn tsx scripts/phase2-prospects-test.ts
```

Run the Phase 5 export/digest fixture against a reachable non-production PostgreSQL database:

```bash
DATABASE_URL="postgresql://<user>@<host>:<port>/<throwaway-db>?schema=public" yarn prisma db push --skip-generate
DATABASE_URL="postgresql://<user>@<host>:<port>/<throwaway-db>?schema=public" yarn tsx scripts/phase5-export-digest-test.ts
```

### Local QA references

The latest browser-observed QA evidence is in:

- `dogfood-output/report.md`
- `dogfood-output/browser-qa-report.md`

Do not treat those reports as source truth for implementation details. Treat them as observed runtime behavior and QA acceptance risk.

## 3. What’s New

### 3.1 Agents and memory

The new agent framework separates persona identity from dispatch behavior. Personas declare display names, model hints, allowed tools, and memory namespace templates. The chat route records a user turn, recalls memory, builds a system prompt from persona rules, brand rules, client context, memory, and available tools, then streams the RouteLLM response.

Memory is namespaced by user, persona, and optional client. Retrieved memory is wrapped as untrusted factual context, not executable instruction text. Work orders, client notes, intelligence snapshots, and conversation turns can be upserted into Pinecone-backed memory namespaces.

### 3.2 Prospecting

Prospecting supports three source modes: `explorium`, `apollo`, and `auto`. Natural-language prospecting criteria require RouteLLM. The search limit clamps at 25 in the service layer. Apollo per-page size clamps at 50; Explorium match size clamps at 25.

Search results are mapped into normalized prospect candidates, deduped against existing lead emails, prospect emails, domain/last-name pairs, and source IDs, then persisted as prospects with a lead-generation campaign record. Promotion requires a prospect to exist and have an email address.

### 3.3 Intelligence

Client intelligence refreshes require an existing client and a configured Google Business Profile URL. GBP parsing fetches public Google Maps/Business Profile data, prefers the public `tbm=map` preload endpoint, and rejects empty/malformed payloads instead of fabricating review, photo, or category counts.

GSC ingestion parses CSV rows with `date`, `query`, `clicks`, `impressions`, `ctr`, and `position`, then summarizes row counts, query counts, total clicks, total impressions, average CTR, average position, top queries, top movers, and lost queries.

### 3.4 Exports and digest

Client snapshot exports are available in Markdown, JSON, and PDF. The Markdown section order is Profile, Engagement, Strategy, Recent Work Orders, Recent Notes, Recent Conversations, and Intelligence Brief.

The daily digest uses the same Indianapolis-local operating language: partner-not-vendor, visible work, month-to-month, and client-owned assets. It is scheduled by Vercel cron at `0 11,12 * * *`, with runtime gating for 7:00 AM America/Indiana/Indianapolis.

### 3.5 QA status

Fresh local Browser QA against `http://127.0.0.1:3106` confirms the previously reported logout defect is closed: clicking `Sign out` from the authenticated Command Center lands on `/login`, not `chrome-error://chromewebdata/`. Medium-severity accessibility findings for public audit, Add Lead, ROI calculator, partner application, pipeline lead links, and the client workspace destructive icon button now have explicit labels/names. The login page now uses a `main` landmark.

The broader dogfood report also flagged Agent Settings hydration mismatch and generated phase/test client records dominating the agency roster. Agent Settings now renders without browser-reported hydration errors and updates the widget snippet to `http://127.0.0.1:3106/widget/loader.js` after mount. The generated Phase 5 fixture clients were deleted from the local QA database, and the agency roster now shows `Active Client Roster 0 total`; production/customer-visible demo databases still require separate evidence.

## 4. Upgrade Guide

### 4.1 Database

This branch adds schema surface for agent and prospect workflows:

- `User.agentThreads`
- `Client.agentThreads`
- `Client.prospects`
- `Client.intelligence`
- `AgentThread`
- `AgentTurn`
- `Prospect`
- `LeadGenCampaign`
- `ClientIntelligence`

Before promoting beyond sandbox, prepare and review a Prisma migration against the target environment. The observed schema changes are additive, but the current release package did not verify an applied migration against a reachable production-like database.

### 4.2 Configuration

Set connector keys only for the features intended to operate:

- Agent and digest composition require `ABACUSAI_API_KEY`.
- Apollo prospecting requires `APOLLO_API_KEY`.
- Explorium prospecting requires `EXPLORIUM_API_KEY`.
- Memory persistence requires Pinecone configuration.
- Digest sending requires notification configuration.

Missing connector configuration should surface structured unavailable/error states rather than mock data.

### 4.3 Cron deployment

`vercel.json` defines two cron paths:

- `/api/agency/intelligence/refresh-all` at `30 11,12 * * *`
- `/api/agency/digest/daily` at `0 11,12 * * *`

Both cron routes require `CRON_SECRET` for GET execution and use Indianapolis-local gating. Manual authenticated POST execution is supported for the same route families.

### 4.4 Operator rollout

Recommended rollout sequence:

1. Run the build and phase tests listed in the quickstart.
2. Configure a reachable database and rerun the export/digest test.
3. Use the current Browser QA checklist/results as the local pre-release baseline, then rerun the same flow in the target browser/environment before any external launch.
4. Confirm generated Phase 4/Phase 5 fixture clients are absent from any customer-visible demo database.
5. Confirm final release identifier, release date, and user-facing version name.

## 5. Troubleshooting

| Symptom | Observed cause or evidence | Action |
|---|---|---|
| `Service unavailable` from persona chat | Agent chat route requires `ABACUSAI_API_KEY`. | Set `ABACUSAI_API_KEY` or document that RouteLLM-backed agent chat is unavailable. |
| Prospect search says connector not configured | Apollo and Explorium connectors throw explicit missing-key errors. | Set the relevant connector key or use the other configured source. |
| GBP refresh fails with missing URL | Intelligence service requires `Client.gbpUrl`. | Add a Google Business Profile URL to the client before refreshing. |
| GSC import fails on CSV columns | GSC parser requires date, query, clicks, impressions, ctr, and position columns. | Export or transform GSC data to the expected columns. |
| Daily digest returns notification configuration error | Digest requires `NOTIF_ID_DAILY_DIGEST`, and sending also requires notification API URL/key. | Register/configure the notification type and notification API credentials. |
| Phase 5 export/digest verification fails at fixture creation | Current run could not reach the configured Postgres host. | Provide a reachable database URL and rerun the phase test. |
| `yarn lint` exits before linting | Next.js prompted to configure ESLint interactively. | Commit an explicit ESLint configuration or choose a configuration outside the release run. |
| Logout reaches Chrome error page | Stale Browser QA observed `chrome-error://chromewebdata/` after clicking Sign out. | Current local Browser QA confirms `signOut({ redirect: false })` followed by `router.replace('/login')` lands on `/login`; rerun in the target deployment browser before external launch. |

## 6. FAQ

### Is this package a general changelog for all historical work?

No. It is diff-scoped to `main...HEAD` for the Phase 1 pre-release branch.

### Is this release safe to ship as-is?

The build, lint, typecheck, selected phase tests, and current local Browser QA pass for the previously reported code findings. External launch still requires production/environment verification, including target database migration status, connector credentials, notification delivery, and confirmation that customer-visible demo data is free of generated fixtures.

### Can we claim production database migration readiness?

Not from current evidence. The Prisma schema additions are visible and additive, but the export/digest verification that creates database fixtures failed because the configured Postgres host was unreachable.

### Can we claim live Apollo, Explorium, Pinecone, notification, or RouteLLM integration success?

Only partially. Code paths and missing-config behavior were verified from source and selected scripts. Live third-party end-to-end success was not verified in this package.

### Can we publish the LegacyAI brand positioning?

The local code and docs repeatedly support the positioning “AI-first,” “Indianapolis,” “partner-not-vendor,” “month-to-month,” and “client owns assets.” Current public browser evidence for `https://legacyai.info/` verified the page title “LEGACY AI — We don't sell technology. We sell results.”, loaded page content, empty `agent-browser errors`/`console` output, and `hasException=false`; this resolves the previously deferred client-side-exception classification for the public marketing page but does not replace target deployment Browser QA.

## 7. Traceability Appendix

### Git and build evidence

| Claim | Evidence |
|---|---|
| Branch and diff scope | `git branch --show-current`, `git rev-parse HEAD`, `git merge-base main HEAD`, and `git diff --stat main...HEAD` run from the repository root. |
| Changed file inventory | `git diff --name-only main...HEAD` returned the changed API routes, app pages, libs, schema, scripts, Vercel config, and lockfile. |
| Build status | `yarn build` completed successfully and reported `✓ Compiled successfully` plus route output. |
| Phase dispatcher test | `yarn tsx scripts/phase1-dispatcher-test.ts` printed `phase1-dispatcher-test: PASS`. |
| Phase prospects test | `yarn tsx scripts/phase2-prospects-test.ts` printed `phase2-prospects-test: PASS`. |
| Phase export/digest verification | `DATABASE_URL="postgresql://douglastalley@127.0.0.1:5432/legacy_legion_phase5_verify_20260506_47545?schema=public" yarn tsx scripts/phase5-export-digest-test.ts` printed `phase5-export-digest-test: PASS`. |
| Lint verification | `yarn lint` exited with `LINT_EXIT=0` after adding `eslint.config.mjs`, switching the lint script to `eslint .`, and aligning ESLint 9-compatible plugin versions. |

### Code evidence

| Area | Evidence |
|---|---|
| Package scripts | `nextjs_space/package.json:4-11` defines `dev`, `build`, `start`, `lint`, and Prisma seed. |
| Agent personas | `nextjs_space/lib/agents/registry.ts:3-13` defines persona schema and tool names; `:16-89` defines six personas. |
| Agent chat route | `nextjs_space/app/api/agents/[persona]/chat/route.ts:54-75` validates session/persona/input; `:84-90` recalls memory and builds prompt context; `:98-109` streams RouteLLM; `:143-158` records assistant/tool turns; `:169-174` returns SSE headers. |
| Tool dispatch | `nextjs_space/lib/agents/dispatcher.ts:65-85` dispatches prospect search; `:87-97` dispatches prospect promotion; `:99-104` returns unknown-tool/client/key errors; `:132-183` creates/updates work orders and writes memory. |
| Agent memory | `nextjs_space/lib/agents/memory.ts:40-57` defines namespace prefixing; `:94-97` wraps retrieved memory as untrusted factual context; `:120-163` records turns and upserts memory; `:166-187` recalls scoped/client/default memory; `:189-260` upserts work order, note, and intelligence memory. |
| Prospecting service | `nextjs_space/lib/prospects/service.ts:13-40` defines source/input and limit clamp; `:51-80` resolves natural-language criteria through RouteLLM; `:186-251` searches, dedupes, persists, and counts results; `:254-260` starts promotion requirements. |
| Apollo connector | `nextjs_space/lib/connectors/apollo.ts:40-60` posts to `/mixed_people/api_search` and clamps `per_page`; `:48-50` requires `APOLLO_API_KEY`; `:70-75` throws HTTP errors or returns payload. |
| Explorium connector | `nextjs_space/lib/connectors/explorium.ts:11-19` clamps size and requires `EXPLORIUM_API_KEY`; `:47-75` calls businesses, prospects, and enrichment endpoints. |
| Prospect UI | `nextjs_space/app/app/agency/prospects/page.tsx:11-21` filters and loads up to 100 prospects; `:30-34` exposes “All Prospects” and “Run Prospect Search”; `:36-70` renders filters and cards. |
| Intelligence service | `nextjs_space/lib/intelligence/service.ts:13-26` refreshes GBP and upserts intelligence memory; `:28-40` saves GSC summaries and memory; `:42-64` refreshes all active non-churned clients with GBP URLs. |
| GBP parser | `nextjs_space/lib/intelligence/gbp.ts:16-21` documents public parsing strategy; `:84-111` parses/rejects invalid snapshots; `:114-130` fetches public GBP data. |
| GSC parser | `nextjs_space/lib/intelligence/gsc.ts:71-90` parses required columns; `:98-143` builds GSC summary. |
| Export snapshot | `nextjs_space/lib/exports/client-snapshot.ts:3-13` defines section order and formats; `:45-84` builds snapshots; `:100-164` renders Markdown; `:432-440` renders local PDF output. |
| Export route | `nextjs_space/app/api/agency/clients/[id]/export/route.ts:21-63` authenticates, validates `md/json/pdf`, returns typed downloads, and maps missing clients/export failures. |
| Digest service | `nextjs_space/lib/notifications/daily-digest.ts:3-17` defines digest sections, cron schedule, and notification type; `:50-61` validates notification ID; `:114-170` collects digest data; `:172-205` builds template; `:253-272` sends digest. |
| Digest route | `nextjs_space/app/api/agency/digest/daily/route.ts:30-47` supports authenticated/secret POST, preview, and cron-gated GET. |
| Vercel crons | `nextjs_space/vercel.json:1-12` defines intelligence refresh and daily digest cron schedules. |
| Additive schema | `nextjs_space/prisma/schema.prisma:321-350` adds agent threads/turns; `:353-405` adds prospects/campaigns; `:408-418` adds client intelligence. |
| Runtime dynamic rendering | `grep` found `export const dynamic = 'force-dynamic'` across changed API routes and app pages, including agent chat, prospecting, intelligence, digest, exports, agency pages, leads, pipeline, login, partner, and public routes. |
| Company identity | Public browser check of `https://legacyai.info/` returned title `LEGACY AI — We don't sell technology. We sell results.`, loaded visible page content, returned no `agent-browser errors`/`console` output, and evaluated `hasException=false`; local project/code evidence supports AI-first Indianapolis, partner-not-vendor, month-to-month, client-owned assets. |

### QA evidence

| Source | Evidence |
|---|---|
| Dogfood report | `dogfood-output/report.md:11-19` lists 8 total issues: 0 critical, 2 high, 6 medium, 0 low; these are retained as stale pre-fix baseline findings. |
| Browser QA report | `dogfood-output/browser-qa-report.md:31-39` and `:52-63` are stale pre-fix findings retained as evidence of the defect set this change addresses. |
| Current local Browser QA | `agent-browser` against `http://127.0.0.1:3106` observed named controls on `/get-started`, `/app/leads/new`, `/app/roi-calculator`, `/app/pipeline`, `/app/agency/clients/[id]`, and `/partner/signup`; invalid audit email exposed `Enter a valid email address.`; authenticated logout landed on `/login`; Agent Settings console output contained only React DevTools/Fast Refresh messages and no hydration error. |
| Current fixture cleanup | Local QA DB `legacy_legion_phase5_verify_20260506_47545` deletion returned `2 deleted` for generated Phase 5 clients and `0 remaining fixture clients`; agency roster text then showed `Active Client Roster 0 total` and `No clients yet`. |
| Current public site check | `agent-browser` against `https://legacyai.info/` observed the public title/body content, `agent-browser errors` and `console` returned no output, browser eval returned `hasException=false`, and screenshot `dogfood-output/screenshots/current-public-legacyai-info.png` has sha256 `9e45da95500526d36fd8ced51bf34106fbee655cd1efc9ea11866ffbe06ac110`. |
| Current code verification | `yarn lint`, `yarn tsc --noEmit --pretty false`, and `yarn build` are rerun after this documentation update for the final release-gate receipt. |

## 8. Release Owner Decisions

These decisions use conservative release-management defaults so the package can move forward without inventing unverified facts.

1. **Release identifier**: Use `LegacyLegion Phase 1 Internal Pre-Release`. Do not assign a public semantic version, codename, or launch date until release ownership provides one.
2. **Approved audience**: Internal operators and implementation engineers only. Do not distribute to beta clients, prospects, or website visitors until production verification and QA disposition are complete.
3. **Canonical public domain**: Current public browser evidence did not reproduce the previously observed `LegacyAI.info` client-side exception; treat `LegacyAI.info` as verified brand/marketing evidence only, not as the Phase 1 app deployment QA surface.
4. **Company claim**: Use both claims together for internal positioning: “We don't sell technology. We sell results.” plus partner-not-vendor, month-to-month, client-owned-assets language. Do not make unsupported performance guarantees.
5. **Notification provider**: Treat daily digest delivery as environment-dependent. Do not name a production provider or notification type ID in release copy until `NOTIFICATION_API_URL`, `NOTIFICATION_API_KEY`, and `NOTIF_ID_DAILY_DIGEST` are confirmed in the target environment.
6. **Verification database**: Use a reachable non-production PostgreSQL database for fixture verification. The current local proof used a throwaway database; production data must not be used for destructive fixture creation.
7. **Fixture data policy**: Retain generated Phase 4/Phase 5 fixture records only in throwaway verification databases. Delete or reseed non-production demo data before customer-visible demos.
8. **Theme decision**: Accept the current dark-first theme for internal pre-release. Treat light-mode/media-preference support as a post-internal-release UX improvement unless accessibility QA escalates it.
9. **Prospecting vendor copy**: Describe prospecting generically as configured data connectors. Do not name Apollo or Explorium in public-facing release copy until contractual and compliance approval is explicit.
10. **Browser QA disposition**: Previous high/medium local code findings have current Browser QA closure evidence in this branch. External launch still requires repeating the QA pass against the target deployment and verifying production/customer-visible data hygiene.

## 9. Deferred Until Production Evidence Exists

The following items remain excluded from release claims because current evidence does not prove them:

- Public release name, public version, codename, launch date, or customer-facing announcement date.
- Production database migration status or data-backfill outcome.
- Successful live Apollo, Explorium, Pinecone, RouteLLM, notification API, or email delivery in the production environment.
- Whether generated fixture data is absent from production or customer-visible demo databases.
- Legal/compliance approval for prospecting vendor claims or contact-data enrichment language.
- Final customer-facing pricing/packaging beyond code-observed tier labels and amounts.
- Fresh Browser QA in the target deployment/browser environment, beyond the current local `127.0.0.1:3106` QA pass.

## 10. Internal Pre-Release Copy

Use this copy for internal review only:

> LegacyLegion Phase 1 Internal Pre-Release introduces the internal agency operating layer for LegacyAI: persona-based agency agents, client-scoped memory, configured-connector prospecting, Google Business Profile and Search Console intelligence snapshots, client export packages, and a daily agency digest. The release keeps the platform grounded in LegacyAI’s AI-first Indianapolis positioning: “We don't sell technology. We sell results,” partner-not-vendor, month-to-month, and client-owned assets. Local build, lint, typecheck, dispatcher, prospects, export/digest fixture verification, and current local Browser QA now pass for the previously reported code findings. External launch still requires target-environment Browser QA, production/database verification, connector verification, and customer-visible data hygiene evidence.
