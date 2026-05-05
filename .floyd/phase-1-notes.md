# Phase 1 Working Notes

## Repository State
- Live worktree: `/Volumes/SanDisk1Tb/LegacyLegion-phase1`
- Feature branch: `floyd/phase-1-routellm-agents`
- Active commit: `fe4cb5630db5ca2562113910729674aa3c3325e0`
- ABACUS package requested commit `48dcb4c57ae27950bd77cb17fa4d96bbe9269625`, but current-session git evidence shows the commit is unavailable locally and from `origin`; `origin/main` currently points to `fe4cb5630db5ca2562113910729674aa3c3325e0`.
- Decision: use the live authoritative tree per `current_codebase_snapshot/SNAPSHOT_README.md` line 26, while preserving this mismatch as evidence.

## Phase 1 Execution Guardrails
- Build Phase 1 items numerically: 1.1 through 1.10.
- Yarn only.
- Do not alter the existing 9 `AgencyToolType` values or `buildAgencyPrompt` signature.
- Schema changes are additive only: add `AgentThread`, `AgentTurn`, plus relation fields on `User` and `Client`.
- Every route/page that reads session or DB starts with `export const dynamic = 'force-dynamic'`.
- No mock data. Missing external configuration returns structured errors or explicit unavailable status.

## Next Item
Start with Phase 1.1/1.2 RouteLLM cutover in `nextjs_space/app/api/agency/clients/[id]/generate/route.ts`.