---
phase: 22-core-versioning-audit-filter
plan: 02
subsystem: core/environment, cli, mcp
tags: [core-15, looksLikeProject, audit-filter, detect-filter, path-shape, regression-test]

requires:
  - phase: 22-core-versioning-audit-filter/22-01
    provides: seed() parameterization (BUILD-01); both consumer files already at current HEAD

provides:
  - CORE-15: looksLikeProject tightened with AppData first-segment and other-user-home rejection (path-shape-only)
  - CORE-15: regression-lock test locking root-rejection + plain-folder discovery + both D-06 tightenings
  - CORE-15: detect surface on CLI and MCP now routes through .filter(looksLikeProject) identically to audit

affects: [phase-23-decoder-trailing-edge, any future audit/detect consumer]

tech-stack:
  added: []
  patterns:
    - "First-segment-below-home AppData rejection: path.relative(home, resolved).split(path.sep)[0].toLowerCase() === 'appdata'"
    - "Users-container guard: path.dirname(home) + caseEqual(parentOfResolved, usersContainer) — cross-platform other-user-home rejection"
    - "Detect filter mirrors audit filter: both use .filter(Success narrow).map(string).filter(looksLikeProject).map(ProjectEntry)"

key-files:
  created:
    - packages/core/test/environment/looksLikeProject.test.ts
  modified:
    - packages/core/src/environment/looksLikeProject.ts
    - packages/cli/src/index.ts
    - packages/mcp/src/index.ts

key-decisions:
  - "D-04: regression-lock test created (looksLikeProject.test.ts, 12 tests) — mandatory deliverable per CORE-15"
  - "D-05: no marker check added — plain-folder projects >=2 below home remain discoverable; D-05 tripwire test locks this"
  - "D-06(a): other-user home rejection via path.dirname(home) users-container guard; intentional exception (SharedProjects-type direct container child) documented and locked in test"
  - "D-06(b): AppData rejection via first-segment-below-home logic — rejects both <home>/AppData and <home>/AppData/Local; denylist is AppData ONLY (no node_modules/.cache/Library)"
  - "D-07: detect surface wired to .filter(looksLikeProject) on both CLI (~:63) and MCP (~:212); grep -c returns 2 per file (audit + detect)"
  - "HIGH 3 fix confirmed: detect enrichedProjects now filtered identically to audit's autoDiscovered"

requirements-completed: [CORE-15]

duration: ~4min
completed: 2026-06-30
---

# Phase 22 Plan 02: Core Versioning & Audit Filter (CORE-15) Summary

**Path-shape-only looksLikeProject tightening (AppData first-segment + other-user-home guards), regression-lock test (12 assertions), and detect-surface filter wiring on both CLI and MCP so audit and detect behave identically.**

## Performance

- **Duration:** ~4 minutes
- **Started:** 2026-06-30T16:55:56Z
- **Completed:** 2026-06-30T17:00:00Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Tightened `looksLikeProject` with two path-shape-only guards: users-container rejection (other-user home roots + documented intentional exception for any direct container child) and AppData first-segment rejection (covers both `<home>\AppData` and `<home>\AppData\Local`). Denylist is AppData only. Predicate stays pure `string → boolean` with no marker check.
- Created `packages/core/test/environment/looksLikeProject.test.ts` (12 tests): locks root/home rejection, plain-folder discovery D-05 tripwire, D-06(a) other-user-home + intentional exception, D-06(b) AppData at both depths with non-AppData counter-proofs. All 12 green on Windows; portable via `os.homedir()`.
- Wired `.filter(looksLikeProject)` into the detect `enrichedProjects` construction on both CLI (`~:63`) and MCP (`~:212`), closing the HIGH-3 leak where detect surfaced unfiltered roots. Both files now have 2 `.filter(looksLikeProject)` calls (audit + detect). Full suite 107/107 passed.

## Task Commits

1. **Task 1: Tighten looksLikeProject** — `a09f813` (feat)
2. **Task 2: Create looksLikeProject.test.ts** — `32f5793` (test)
3. **Task 3: Wire detect filter on CLI + MCP** — `bc0d900` (feat)

## Verification Evidence

| Check | Result |
|-------|--------|
| `npm run build` (root) | Green — tsup builds core → mcp → cli clean |
| `npm run build:check` (root) | Green — zero tsc errors across src+test |
| `npx vitest run packages/core/test/environment/looksLikeProject.test.ts` | 12/12 passed |
| `npx vitest run` (full suite) | 107 passed, 2 pre-existing skips — no regressions |
| `grep -c ".filter(looksLikeProject)" packages/cli/src/index.ts` | 2 (audit + detect) |
| `grep -c ".filter(looksLikeProject)" packages/mcp/src/index.ts` | 2 (audit + detect) |
| `grep -v "^[[:space:]]*[*/]" looksLikeProject.ts \| grep -c "AppData"` | 1 (code line, not doc comment) |
| `grep -c "path.dirname(home)"` looksLikeProject.ts | 1 |
| `grep -cE "node_modules|\.cache|Library"` looksLikeProject.ts | 0 (AppData-only denylist) |
| `grep -v comment \| grep -c "package.json"` looksLikeProject.ts | 0 (no marker check) |
| `grep -cE "throw \|async \|await \|fs\."` looksLikeProject.ts | 0 (pure function) |

## Files Created/Modified

- `packages/core/src/environment/looksLikeProject.ts` — Two D-06 guard clauses added (users-container + AppData first-segment); doc comment updated with new rejection cases and intentional exception
- `packages/core/test/environment/looksLikeProject.test.ts` — NEW: 12-test regression-lock suite; real-fs convention, os.homedir()-derived paths, no mocked fs
- `packages/cli/src/index.ts` — detect `enrichedProjects` now `...filter(Success).map(string).filter(looksLikeProject).map(ProjectEntry)` (~:63)
- `packages/mcp/src/index.ts` — detect `enrichedProjects` identical transformation (~:212)

## Deviations from Plan

None — plan executed exactly as written. The critical constraints (AppData first-segment logic, AppData-only denylist, no marker check, users-container guard, detect filter on both consumers) all honored verbatim.

## Issues Encountered

None.

## Known Stubs

None. All changes are behavioral (predicate guards + filter wiring). No placeholder values, no TODO markers, no hardcoded empty returns.

## Threat Flags

None. The two new guard clauses in `looksLikeProject` are pure in-memory path-string operations — no new network surface, no I/O, no auth path, no trust boundary change. The detect filter wiring reduces the information-disclosure surface (T-22-04) rather than introducing new surface.

## Next Phase Readiness

- Phase 22 complete (both plans: BUILD-01 + CORE-15)
- Phase 23 (CORE-16 — decoder trailing-edge `buildCandidates` fix) is the final v3.1.0 phase; it is isolated and does not depend on this plan's changes
- All ~29 unpushed commits (including both Phase 22 plans) ready for push + PR when user initiates

## Self-Check: PASSED

| Item | Result |
|------|--------|
| `packages/core/src/environment/looksLikeProject.ts` | FOUND |
| `packages/core/test/environment/looksLikeProject.test.ts` | FOUND |
| `packages/cli/src/index.ts` | FOUND |
| `packages/mcp/src/index.ts` | FOUND |
| Commit `a09f813` | FOUND |
| Commit `32f5793` | FOUND |
| Commit `bc0d900` | FOUND |

---
*Phase: 22-core-versioning-audit-filter*
*Completed: 2026-06-30*
