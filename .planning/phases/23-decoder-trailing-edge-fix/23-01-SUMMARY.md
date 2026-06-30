---
phase: 23-decoder-trailing-edge-fix
plan: 01
subsystem: core
tags: [decoder, path-hash, vitest, tdd]

# Dependency graph
requires:
  - phase: 17-core-decoder-calibration
    provides: "encode() regex calibration (7 char classes), 17/17 path-hash round-trips, the empirical trailing-edge reproduction in 17-VERIFICATION.md:135-161 that this plan fixes"
provides:
  - "Additive Case 3 '--' prefix branch in buildCandidates() recovering the trailing-hyphen-strip asymmetry for a single special char at the trailing edge of an intermediate path component"
  - "Case-insensitive verify-then-return filter in decode() replacing best-guess-first (candidates[0])"
  - "RED-proven real-fs reproduction test + spurious-sibling rejection test in decode.test.ts"
affects: [23-02]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Additive recursion branch alongside an existing branch, never replacing it, to guarantee zero regression on currently-passing shapes"
    - "Verify-then-return: a generated candidate list is filtered by re-applying the forward transform (encode) and comparing to the raw input before any candidate is trusted, rather than trusting positional/iteration order"

key-files:
  created: []
  modified:
    - packages/core/src/environment/decode.ts
    - packages/core/test/environment/decode.test.ts

key-decisions:
  - "D-01: decode() returns only a candidate whose encode(candidate).toLowerCase() === hashDirName.toLowerCase(); candidates[0] best-guess-first removed entirely"
  - "L-01: additive encodedName + '--' branch added inside buildCandidates' existing for-loop, immediately after the unmodified single-hyphen Case 2 branch — no replacement, no generalization to N hyphens"
  - "L-02: encode() at decode.ts:106 (character class + leading/trailing hyphen strip) left byte-unchanged — verified via direct grep against original source text"
  - "Step 4 / maxCandidates: cap of 20 left unchanged — the additive branch adds at most one extra recursion per matching entry, the D-01 filter scans the full returned list (not positional candidates[0]), and realistic Claude Code path depths (~12 components, few same-named siblings) do not approach the cap. Raising it was explicitly out of scope for this plan; if the 23-02 exhaustive matrix proves the cap truncates a correct candidate, that escalates as a 23-02 finding, not a retroactive change here."

requirements-completed: [CORE-16]

# Metrics
duration: 3min
completed: 2026-06-30
---

# Phase 23 Plan 01: Decoder Trailing-Edge Fix (CORE-16) Summary

**Additive `encodedName + '--'` branch in `buildCandidates()` paired with a case-insensitive verify-then-return filter in `decode()`, fixing the trailing-special-character round-trip defect without touching `encode()` or regressing the existing 17/17 path-hash suite.**

## Performance

- **Duration:** 3 min (RED commit to GREEN commit)
- **Started:** 2026-06-30T19:15:13Z
- **Completed:** 2026-06-30T19:17:49Z
- **Tasks:** 2 completed
- **Files modified:** 2

## Accomplishments
- Reproduced the CORE-16 defect on a real-fs fixture (`tmpDir/Trailing&/sub`) and proved it fails with `no_candidates` on master BEFORE any fix landed (D-03 reproduce-first)
- Closed the defect with a minimal additive fix: a second prefix branch (`encodedName + '--'`) in `buildCandidates()`, leaving the existing single-hyphen branch byte-unchanged
- Replaced best-guess-first candidate selection with case-insensitive verify-then-return in `decode()`, which is the mechanism that prevents the additive branch from ever returning a spurious sibling
- `encode()` is provably byte-unchanged — confirmed via direct grep against the original character-class and hyphen-strip regex text
- Full monorepo suite (17 test files, 109 tests across core/mcp/cli) green; zero regressions

## Task Commits

Each task was committed atomically (TDD plan — `test` then `feat`):

1. **Task 1: RED — reproduce no_candidates on a real-fs trailing-edge fixture (D-03)** - `0742622` (test)
2. **Task 2: GREEN — additive '--' branch (L-01) + case-insensitive verify-then-return (D-01)** - `66f6331` (feat)

**Plan metadata:** (this commit, immediately following)

## TDD Gate Compliance

RED gate confirmed: `0742622` (`test(23-01): RED reproduce CORE-16 trailing-edge no_candidates`) — the trailing-edge test was run and PASSED while asserting `result.success === false` / `reason === 'no_candidates'` on master, proving the defect against a synthesized real-fs fixture before any fix code was written.

GREEN gate confirmed: `66f6331` (`feat(23-01): additive '--' branch + verify-then-return for CORE-16`) — lands after the RED commit, flips the same test's assertion to `result.success === true`, and turns the spurious-sibling test (written in SUCCESS form from the start, RED until this commit) green.

No REFACTOR commit was needed — the implementation matched the plan's verbatim code with no follow-up cleanup required.

## Files Created/Modified
- `packages/core/src/environment/decode.ts` — `buildCandidates()` gained an additive Case 3 branch (`encodedName + '--'`) immediately after the unmodified Case 2 single-hyphen branch, inside the existing `for (const entry of entries)` loop; `decode()`'s return path replaced `const decodedPath = candidates[0]` with a `candidates.find((c) => encode(c).toLowerCase() === hashDirName.toLowerCase())` filter that falls back to `no_candidates` if nothing round-trips; `encode()` itself untouched
- `packages/core/test/environment/decode.test.ts` — two new tests added to the existing `describe('decode', ...)` block (no new describe block): the CORE-16 trailing-edge reproduction (RED→SUCCESS) and the CORE-16/D-01 spurious-sibling rejection test

## Decisions Made
- All decisions were locked by 23-CONTEXT.md (L-01, L-02, L-03, D-01, D-03) and the plan's verbatim `<action>` blocks — no new decisions required during execution. The only discretionary item (Step 4, `maxCandidates`) was resolved per the plan's own reasoning: left unchanged at 20, with the rationale recorded above and deferred-escalation path to 23-02 noted.

## Deviations from Plan

None — plan executed exactly as written, including verbatim code blocks and exact insertion points.

One execution-mechanics note (not a deviation from plan content, but worth recording for future TDD plans in this repo): the first `npx vitest run` invocation inside `packages/core` after Task 2's source edit still showed both CORE-16 tests RED, because `@localground/core`'s package.json `exports` field resolves to `./dist/index.js` and the workspace `dist/` was stale from before the fix. Running `npm run build -w packages/core` (which the root `pretest` script would have done automatically had `npm test` been invoked from the repo root) picked up the change and both tests went GREEN as expected. No code or test content was altered to work around this — it was a build-freshness issue, resolved by rebuilding, and `npm test` from the repo root (which includes `pretest`) was used for the final full-suite confirmation.

## Issues Encountered

The stale-`dist/` rebuild issue above was diagnosed and resolved within Task 2 before committing; no impact on the final committed state, which was verified post-rebuild with both the targeted decode suite and the full monorepo suite.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- CORE-16's core defect (single special char at trailing edge of an intermediate component) is fixed and verified non-regressing against the full existing suite (decode.test.ts 17/1, full monorepo 109/2 skipped, `npm run build:check` zero errors).
- Deferred to Plan 23-02 per the plan's `<output>` spec: the 9-character × 5-position exhaustive matrix (D-02), an explicit re-assertion of the canonical OneDrive `buildCandidates` decode (L-03), and the documented `Foo&&` double-trailing-special-character boundary guard (out of CORE-16 scope; tracked as ROADMAP backlog 999.8).
- No blockers for 23-02.

---
*Phase: 23-decoder-trailing-edge-fix*
*Completed: 2026-06-30*
