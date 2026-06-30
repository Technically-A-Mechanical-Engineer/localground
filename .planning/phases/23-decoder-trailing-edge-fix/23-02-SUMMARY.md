---
phase: 23-decoder-trailing-edge-fix
plan: 02
subsystem: core
tags: [decoder, path-hash, vitest, regression-matrix]

# Dependency graph
requires:
  - phase: 23-decoder-trailing-edge-fix (plan 01)
    provides: "Additive Case 3 '--' prefix branch in buildCandidates() + case-insensitive verify-then-return filter in decode(), fixing the CORE-16 trailing-edge defect"
provides:
  - "Exhaustive 9-char x 5-position real-fs value-asserted regression matrix locking the 23-01 fix and its non-regression boundary"
  - "Explicit L-03 canonical OneDrive value re-assertion (load-bearing v3.0.0 buildCandidates decode confirmed non-regressing)"
  - "Documented Foo&& two-trailing-special boundary guard pinning the out-of-CORE-16-scope edge"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Position-matrix regression testing via it.each over a fixed character set, with a shared real-fs round-trip helper asserting decoded VALUE equality (not just success) at every cell"

key-files:
  created: []
  modified:
    - packages/core/test/environment/decode.test.ts

key-decisions:
  - "Both tasks landed in a single edit/commit (matrix + OneDrive/Foo&& guards) rather than two separate commits, because the plan placed the OneDrive and Foo&& tests inside/adjacent to the same new describe block as the matrix — splitting would have required an artificial intermediate state. No content deviation from the plan's verbatim code blocks."
  - "Per the plan-checker-corrected empirical finding: BOTH trailing-edge AND leading-edge matrix rows are FLIPS repaired by the 23-01 additive '--' branch — master returns no_candidates for both. Only mid-component, interior-with-child, and leaf are non-regression guards (already SUCCESS on master). This is recorded accurately in the test comments and here, per the plan's explicit instruction not to mischaracterize leading-edge as 'already succeeds on master.'"

requirements-completed: [CORE-16]

# Metrics
duration: 6min
completed: 2026-06-30
---

# Phase 23 Plan 02: Decoder Trailing-Edge Fix (CORE-16) Exhaustive Matrix Summary

**45-case real-fs value-asserted regression matrix (9 special chars x 5 positions) plus an explicit canonical-OneDrive value re-assertion and a documented Foo&& boundary guard, locking the 23-01 decoder fix with zero production code changes.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-06-30T19:18:30Z (approx, immediately following 23-01 close)
- **Completed:** 2026-06-30T19:24:29Z
- **Tasks:** 2 completed (landed in a single commit — see Deviations)
- **Files modified:** 1

## Accomplishments
- Added `describe('decode — CORE-16 special-char position matrix', ...)` with its own real-fs `beforeEach`/`afterEach` (mkdtemp + realpath + rm), exercising all 9 special characters (`'`, `&`, `[`, `]`, `(`, `)`, `+`, `=`, `%`) across 5 positions via `it.each` — 45 individually-reporting cases, every one asserting `decodedPath.toLowerCase()` equality against the real fixture path (value-level, not merely `success`)
- Confirmed empirically that BOTH trailing-edge-of-intermediate AND leading-edge-of-intermediate rows are flips: both return `no_candidates` on pre-23-01 master and SUCCESS only because of the 23-01 additive `encodedName + '--'` branch — not two different mechanisms
- Confirmed mid-component, interior-with-deeper-child (the canonical `Acme & Co` shape), and leaf positions are non-regression guards — all 27 of those cases (3 positions x 9 chars) pass without relying on the new branch
- Added an explicit L-03 value test building a real `OneDrive - ThermoTek, Inc\Documents\Projects\Claude-Home`-shaped fixture under `os.tmpdir()` and asserting the decoded value matches exactly — re-proving the load-bearing v3.0.0 `buildCandidates` OneDrive fix has not regressed
- Added a documented `Foo&&` boundary guard asserting the two-trailing-special-character case stays `no_candidates` — pins the intentionally out-of-scope edge (ROADMAP backlog 999.8) so a future regex-widening attempt would be caught as a scope violation, not silently accepted
- Touched zero production code — `packages/core/src/environment/decode.ts` is byte-identical to its post-23-01 state

## Task Commits

Both tasks were delivered in a single commit because the plan's Task 2 tests were placed inside/adjacent to the same new describe block introduced in Task 1, and the matrix + guards were written as one coherent edit:

1. **Task 1 (9x5 exhaustive matrix) + Task 2 (OneDrive value re-assertion + Foo&& boundary guard)** - `91b4867` (test)

**Plan metadata:** (this commit, immediately following)

## Files Created/Modified
- `packages/core/test/environment/decode.test.ts` — new `describe('decode — CORE-16 special-char position matrix', ...)` block added after the existing `describe('decode', ...)` block: a `SPECIAL_CHARS` const, an `assertRoundTrip` helper (real-fs subtree creation + encode + decode + value assertion with explicit `decodedPath !== null` narrowing for the strict tsc gate), five `it.each(SPECIAL_CHARS)` blocks (trailing-edge, leading-edge, mid-component, interior-with-child, leaf), an explicit OneDrive-shaped value test, and the documented `Foo&&` boundary guard

## Decisions Made
- Single-commit delivery for both tasks (see key-decisions above) — no content deviation, only a sequencing simplification justified by the plan's own code layout.
- All five position families and both standalone tests use the plan's verbatim code blocks; no discretionary implementation choices were required.

## Deviations from Plan

None affecting content or correctness. One sequencing note: Tasks 1 and 2 were committed together as `91b4867` rather than as two separate commits, because the plan's own action blocks place the OneDrive/Foo&& tests as a continuation of the same matrix describe block — splitting into two commits would have required either an incomplete intermediate file state or an artificial reordering not present in the plan. All acceptance criteria for both tasks are independently verifiable against the single commit's diff.

## Issues Encountered

None. The known `dist/` staleness gotcha (flagged in the prior-wave context) was avoided by running `npm run build -w packages/core` before the targeted vitest run, and the final acceptance check used the repo-root `npm test` (which runs `pretest` to rebuild) as instructed.

## Verification Results

- `cd packages/core && npx vitest run test/environment/decode.test.ts` (post-build): **64 passed, 1 skipped** (17 pre-existing decode tests + 45 new matrix cases + 2 new standalone tests = 64; the 1 skip is the pre-existing Windows-symlink-elevation skip, unrelated to this plan).
- `npm run build:check` (repo root): **zero errors** — strict tsc gate across all four project configs (core/mcp/cli src + tsconfig.test.json) passed cleanly.
- `npm test` (repo root, full monorepo suite, pretest rebuilds all three packages): **17 test files passed, 156 tests passed, 2 skipped, 0 failed** — additive growth over the 107/2 Phase-22 baseline confirmed (107 baseline + 45 matrix + 2 new standalone tests = 154 minimum expected; actual 156 passed reflects the baseline already having grown slightly beyond 107 by the time of this run, e.g. the 12-test `looksLikeProject` suite from Phase 22). No regressions anywhere in core, mcp, or cli.
- `git diff --name-only` for this plan's commit: only `packages/core/test/environment/decode.test.ts` — no production file touched (L-02 honored).

## Accuracy Note (Plan-Checker-Corrected Finding)

Per the plan's explicit instruction: BOTH the trailing-edge-of-intermediate row AND the leading-edge-of-intermediate row in the 9x5 matrix are FLIPS — both shapes return `no_candidates` against a verbatim port of pre-23-01 master and only succeed because of the 23-01 additive `encodedName + '--'` branch (master returns `no_candidates` for both — empirically confirmed at plan time per 23-CONTEXT.md `<empirical_findings>`). This summary does NOT characterize leading-edge as "already succeeds on master." Only mid-component, interior-with-deeper-child, and leaf are true non-regression guards (already SUCCESS before 23-01, still SUCCESS after).

## Known Boundary (Documented, Not a Stub)

The `Foo&&` two-trailing-special-character case is intentionally left unfixed and is guarded (not stubbed) — it asserts `no_candidates` and will stay that way unless a future plan deliberately widens scope. Generalizing the additive branch to N trailing specials is out of CORE-16 scope per L-01 (locked `+ '--'` shape) and is tracked separately as ROADMAP backlog item 999.8 (already recorded, commit `ad70502`).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- CORE-16 is now fully complete: the defect fix (23-01) plus the exhaustive regression-proofing the user chose (23-02, D-02) are both landed and verified non-regressing against the full monorepo suite.
- This was the last remaining v3.1.0 requirement (SEC-01/CLI-06 in Phase 21; BUILD-01/CORE-15 in Phase 22; CORE-16 here). No blockers for milestone close.
- ROADMAP backlog 999.8 (multi-trailing-special-character decode) remains open and unsequenced, by design — out of CORE-16/v3.1.0 scope.

---
*Phase: 23-decoder-trailing-edge-fix*
*Completed: 2026-06-30*
