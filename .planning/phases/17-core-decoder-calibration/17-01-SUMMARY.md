---
phase: 17-core-decoder-calibration
plan: 01
subsystem: testing

tags: [encode, decode, regex, path-hash, round-trip, tdd, vitest, typescript-strict]

# Dependency graph
requires:
  - phase: 16-test-infrastructure-hardening
    provides: "Restored tsc strict gate (TEST-01) covering test/**/* via tsconfig.test.json; reaper-ordered afterEach (TEST-02); decode.test.ts tautology removed (TEST-04)"
provides:
  - "Widened encode() regex covering seven CORE-13 char classes (apostrophe, ampersand, brackets, plus, equals, percent — parens/period already covered)"
  - "Six per-class round-trip tests in decode.test.ts using existing real-fs fixture pattern"
affects: [17-02, 19-skill-runtime-uat, decode-consumers]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-class round-trip test pattern — one fixture subdir per CORE-13 char class, encode→decode→case-insensitive equality"
    - "Strict-gate-friendly null narrowing — explicit `if (decodedPath !== null)` guard before string deref preserves loud-failure via preceding `not.toBeNull()` assertion"

key-files:
  created:
    - .planning/phases/17-core-decoder-calibration/17-01-SUMMARY.md
  modified:
    - packages/core/src/environment/decode.ts
    - packages/core/test/environment/decode.test.ts

key-decisions:
  - "D-01 honored: targeted regex widening /[\\\\/: ,().'&\\[\\]+=%]/g (not catch-all [^A-Za-z0-9-])"
  - "D-05 honored: six tests for seven CORE-13 classes (brackets share one fixture)"
  - "D-06 honored: existing 5+5 tests in describe('encode') and describe('decode') unchanged and still passing"
  - "D-07 honored: failing-side coverage out of scope; existing nonexistent-path test covers no_candidates branch"
  - "Rule 3 deviation: plan skeleton called .toLowerCase() on string|null without narrowing; added explicit null guard inside each test to satisfy TEST-01 strict tsc gate while preserving the not.toBeNull() loud-failure assertion ahead of the guard"

patterns-established:
  - "CORE-13 round-trip pattern: real fs fixture under tmpDir → encode(subDir) → decode(hash) → case-insensitive path match (Windows-compatible)"

requirements-completed: [CORE-13]

# Metrics
duration: 9min
completed: 2026-04-27
---

# Phase 17 Plan 01: CORE-13 Decoder Calibration Summary

**Widened encode() regex to cover seven CORE-13 char classes (apostrophe, ampersand, brackets, plus, equals, percent) and added six per-class round-trip tests under the restored Phase 16 strict tsc gate.**

## Performance

- **Duration:** ~9 min
- **Started:** 2026-04-27T05:04:12Z
- **Completed:** 2026-04-27T05:13:04Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `encode()` regex on `packages/core/src/environment/decode.ts:89` widened from `/[\\/: ,().]/g` to `/[\\/: ,().'&\[\]+=%]/g` — adds apostrophe, ampersand, open/close bracket, plus, equals, percent (parens and period already covered).
- Six per-class round-trip tests appended to `packages/core/test/environment/decode.test.ts` inside the existing `describe('decode')` block, reusing the existing `beforeEach`/`afterEach` (8.3 short-name canonicalization via `fs.realpath` inherited automatically).
- Test count moved from 79 passed / 2 skipped to **85 passed / 2 skipped** — exactly the +6 the plan called for.
- Phase 16's restored strict tsc gate (`npm run build:check`) holds clean across both `tsconfig.json` and `tsconfig.test.json`.
- Algorithm in `decode()` / `reconstructPath()` / `buildCandidates()` (lines 31–200) is byte-identical aside from line 89 — the load-bearing v3.0.0 OneDrive corporate-path fix is preserved.

## Exact decode.ts line that changed

`packages/core/src/environment/decode.ts:89`

Before:
```typescript
return filePath.replace(/[\\/: ,().]/g, '-').replace(/^-+|-+$/g, '');
```

After:
```typescript
return filePath.replace(/[\\/: ,().'&\[\]+=%]/g, '-').replace(/^-+|-+$/g, '');
```

The chained `.replace(/^-+|-+$/g, '')` — the strip-leading-trailing-hyphens contract — is unchanged.

## Six fixture folder names and per-class test names

| # | Char class | Fixture folder name | Test name |
|---|------------|---------------------|-----------|
| 1 | apostrophe (`'`) | `O'Brien` | `round-trips encode/decode for a folder name containing an apostrophe (CORE-13)` |
| 2 | ampersand (`&`) | `Rock & Roll` | `round-trips encode/decode for a folder name containing an ampersand (CORE-13)` |
| 3 | brackets (`[` `]`) | `Foo[Bar]` | `round-trips encode/decode for a folder name containing brackets (CORE-13)` |
| 4 | plus (`+`) | `1+1` | `round-trips encode/decode for a folder name containing a plus sign (CORE-13)` |
| 5 | equals (`=`) | `key=val` | `round-trips encode/decode for a folder name containing an equals sign (CORE-13)` |
| 6 | percent (`%`) | `100% Done` | `round-trips encode/decode for a folder name containing a percent sign (CORE-13)` |

Each test creates a real subdirectory under the canonicalized `tmpDir`, encodes the subdir's path, decodes the resulting hash, asserts `result.success === true`, asserts `result.data.hashDirName === hash`, asserts `result.data.decodedPath !== null`, and (under that null narrow) asserts `result.data.decodedPath.toLowerCase() === subDir.toLowerCase()` for Windows case-insensitive equality.

## Task Commits

Each task committed atomically on master (sequential mode, no worktree):

1. **Task 1: Widen encode() regex to cover seven CORE-13 char classes** — `729e8ff` (feat)
2. **Task 2: Append six per-class round-trip tests** — `88eee40` (test)

_Plan metadata commit follows after STATE.md / ROADMAP.md / REQUIREMENTS.md updates._

## Files Created/Modified

- `packages/core/src/environment/decode.ts` — line 89 regex widened (D-01); rest of file byte-identical.
- `packages/core/test/environment/decode.test.ts` — six new `it()` blocks appended inside `describe('decode')` (lines 110–201). No new imports, no new `beforeEach`/`afterEach`, existing 5+5 tests untouched.

## Decisions Made

- Followed plan D-01/D-02/D-05/D-06/D-07 verbatim. No re-litigation of rejected catch-all (D-01) or empirical CC encoder probe (D-02).
- One Rule 3 deviation on test code (see Deviations from Plan).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocker] Added explicit `decodedPath !== null` narrowing inside each new test**

- **Found during:** Task 2 (after appending tests; first `npm run build:check`)
- **Issue:** The plan's exact skeleton (17-01-PLAN.md lines 178–193 / 17-PATTERNS.md lines 110–127) calls `result.data.decodedPath.toLowerCase()` immediately after `expect(result.data.decodedPath).not.toBeNull()`. Vitest's `expect(...).not.toBeNull()` does not narrow the TypeScript type, and `PathHashEntry.decodedPath` is `string | null` (`packages/core/src/types.ts:64`). Phase 16's restored strict tsc gate (`npm run build:check` invoking `tsc --noEmit -p tsconfig.test.json`) rejected the unnarrowed deref with six `TS18047: 'result.data.decodedPath' is possibly 'null'` errors — one per new test.
- **Fix:** Wrapped the `.toLowerCase()` assertion in `if (result.data.decodedPath !== null) { ... }` inside each of the six new tests. The preceding `expect(result.data.decodedPath).not.toBeNull()` runs unconditionally, so a genuine null path still fails loudly (TEST-03 style precondition guard preserved). The case-insensitive equality assertion only runs under the narrowed type, which is the intended success-branch contract.
- **Files modified:** `packages/core/test/environment/decode.test.ts` (six identical insertions, one per `it()` block)
- **Verification:** `npm run build:check` exits 0 across both `tsconfig.json` and `tsconfig.test.json`. `npm test` exits 0 with 85 passed / 2 skipped. The TEST-04 tautology grep stays clean (0 matches).
- **Committed in:** `88eee40` (Task 2 commit — landed atomically with the new tests rather than as a follow-up)

---

**Total deviations:** 1 auto-fixed (Rule 3 - blocker on strict gate)
**Impact on plan:** Single deviation, contained inside Task 2's edit. The plan's intent (round-trip + case-insensitive equality on success) is preserved with stronger type-narrowing semantics. No scope creep.

## Issues Encountered

None beyond the Rule 3 deviation above. Baseline test run (79/2) clean before edits; all gates pass after each task.

## Self-Check: PASSED

- ✓ `packages/core/src/environment/decode.ts:89` contains the widened regex `/[\\/: ,().'&\[\]+=%]/g` (verified via Read)
- ✓ `packages/core/test/environment/decode.test.ts` contains six new `it()` blocks matching `round-trips encode/decode for a folder name containing` (verified via grep -c → 6)
- ✓ Both task commits exist on master (`git log --oneline -3` shows `88eee40` then `729e8ff` then `39f19ee` plan creation)
- ✓ `npm run build:check` exits 0 (Phase 16 strict tsc gate covers both src and test files)
- ✓ `npm test` exits 0 with 85 passed / 2 skipped (was 79/2 — exactly +6 tests)
- ✓ TEST-04 tautology invariant from Phase 16 preserved (`grep -E "expect\(typeof.*success\)\.toBe\(['\"]boolean['\"]\)"` → 0 matches in decode.test.ts)
- ✓ No new imports in decode.test.ts (`grep -c "^import"` → 5, unchanged)

## Next Phase Readiness

- **17-02 (CORE-14)** unblocked — diagnostic table + PROJECT.md WR-01 row + 14-REVIEW.md forward-pointer can land in a separate Wave 2 plan as designed.
- **CORE-13 satisfied** — all seven classes round-trip under real-fs fixtures; existing 17/17 active path-hashes still resolve (regression-clean).
- **No blockers for downstream phases.** Phase 18 (packaging) remains independent; Phase 19 UAT will exercise the wider regex via skill runtime.

---
*Phase: 17-core-decoder-calibration*
*Plan: 01*
*Completed: 2026-04-27*
