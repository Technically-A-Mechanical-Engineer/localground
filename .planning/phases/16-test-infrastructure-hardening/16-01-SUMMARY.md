---
phase: 16-test-infrastructure-hardening
plan: 01
subsystem: testing
tags: [vitest, typescript, test-hygiene, result-type, discriminated-union]

requires:
  - phase: 14-mcp-cli-implementation
    provides: "Result<T, R> discriminated-union pattern with assert-then-narrow doublet (placeholder.test.ts:24-26 model) and success-branch round-trip pattern (decode.test.ts:63-71 model)"

provides:
  - "Precondition assertion in placeholder.test.ts fourth it() block — silent no-op path eliminated when detectPlatform fails (TEST-03 closed)"
  - "Meaningful success-branch contract on the reparse-point test in decode.test.ts — tautological discriminated-union check replaced with hashDirName + decodedPath assertions (TEST-04 closed)"

affects: [16-02-vitest-cleanup, 16-03-tsc-strict-gate, 17-core-decoder-calibration]

tech-stack:
  added: []
  patterns:
    - "Pattern propagation in-file: when one it() block uses assert-then-narrow correctly (placeholder.test.ts:24-26), apply the same doublet to every parallel block in the same describe — closes silent no-op coverage gaps without expanding scope."
    - "Tautology elimination via success-branch contract: replace expect(typeof result.success).toBe('boolean') with if (result.success) { assert on result.data fields } — keeps the test's stated 'must NOT throw' invariant while adding meaningful coverage when the success branch is taken."

key-files:
  created: []
  modified:
    - "packages/core/test/integrity/placeholder.test.ts (line 73 inserted)"
    - "packages/core/test/environment/decode.test.ts (lines 102-106 replaced — 1 line removed, 5 added)"

key-decisions:
  - "Per D-Claude-1: the decode.test.ts replacement targets data.decodedPath of the round-trip success branch (not data.exists), mirroring the analog at lines 63-71. No failure-branch assertion added — over-specifies on OS-dependent traversal paths and contradicts the test's documented 'decode may return success or no_candidates' intent."
  - "Per D-01 fix-if-cheap policy: no opportunistic edits landed. Both tasks stayed surgical inside their respective it() blocks. No discoveries warranted ride-along (the third it() block in placeholder.test.ts hardcodes 'macos' literal because of the .skipIf compile-time platform guard, so it intentionally does not call detectPlatform — no edit needed)."

patterns-established:
  - "Pattern 1: Pre-existing in-file pattern is the canonical analog. When fixing a test hygiene issue, the closest model is usually a sibling it() block in the same file — propagate the existing doublet rather than synthesizing a new shape."
  - "Pattern 2: Surgical scope discipline. A 5-line ceiling per D-02 makes 'while I'm here' edits very narrow; both tasks finished with 1-line and 5-line deltas respectively."

requirements-completed: [TEST-03, TEST-04]

duration: 4min
completed: 2026-04-27
---

# Phase 16 Plan 01: Test Hygiene Fixes Summary

**Two surgical test-file edits closing TEST-03 (silent no-op assertion) and TEST-04 (tautological discriminated-union check) — placeholder.test.ts now fails loudly when detectPlatform fails; decode.test.ts now asserts a meaningful success-branch contract instead of a typeof tautology that could never fail.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-27T02:37:25Z
- **Completed:** 2026-04-27T02:41:26Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Closed TEST-03: `placeholder.test.ts` fourth `it()` block now has the explicit `expect(platformResult.success).toBe(true)` precondition guard above the existing narrow check
- Closed TEST-04: `decode.test.ts` reparse-point test no longer contains the tautological `expect(typeof result.success).toBe('boolean')` — replaced with success-branch assertions on `data.hashDirName` and `data.decodedPath`
- Full Vitest suite stays green (16 test files, 79 tests passed, 2 skipped) on Windows local — no test cleanup hang on this run

## Task Commits

Each task was committed atomically:

1. **Task 1: Add missing precondition assertion in placeholder.test.ts (TEST-03)** — `0b2dafe` (test)
2. **Task 2: Replace tautological assertion in decode.test.ts (TEST-04)** — `6e46702` (test)

**Plan metadata:** [pending — committed in final plan-close commit by sequential executor]

## Files Created/Modified

### `packages/core/test/integrity/placeholder.test.ts`
- **Edit:** Inserted `expect(platformResult.success).toBe(true);` at line 73, between `const platformResult = detectPlatform();` (line 72) and `if (!platformResult.success) return;` (now line 74)
- **Net delta:** +1 line (file went from 86 to 87 lines per Read tool; `wc -l` shows 86 due to no trailing newline)
- **Why this fix:** Without the explicit assert, the narrow guard `if (!platformResult.success) return;` would silently exit the test if `detectPlatform` ever failed — the test would report "passed" without exercising any of the `placeholderDetect` assertions below. The assert-then-narrow doublet (mirrored from lines 24-26 in the same file) makes the test fail loudly instead.

**Before:**
```typescript
    const platformResult = detectPlatform();
    if (!platformResult.success) return;
```

**After:**
```typescript
    const platformResult = detectPlatform();
    expect(platformResult.success).toBe(true);
    if (!platformResult.success) return;
```

### `packages/core/test/environment/decode.test.ts`
- **Edit:** Replaced the tautology at the end of the reparse-point test (`it.skipIf(...)` block, line 102) with a 5-line success-branch contract block
- **Net delta:** +4 lines (1 line removed, 5 lines added — comment + `if (result.success) {` + 2 assertions + `}`); file went from 137 to 141 lines per Read tool
- **Why this fix:** `result.success` is typed as `boolean` in the discriminated union, so `typeof result.success` is always `'boolean'` — the assertion can never fail regardless of code correctness. The replacement asserts the meaningful contract on the success branch (decoded path equals input hash; decodedPath is non-null) while leaving the failure branch intentionally unasserted to preserve the test's documented "decode may return success or no_candidates" intent.

**Before (lines 100-102):**
```typescript
      // decode may return success or no_candidates depending on OS traversal behavior,
      // but it must NOT throw an error — the traversal must be stable.
      expect(typeof result.success).toBe('boolean');
```

**After (lines 100-106):**
```typescript
      // decode may return success or no_candidates depending on OS traversal behavior,
      // but it must NOT throw an error — the traversal must be stable.
      // Success-branch contract: decoded path resolves through the symlink (mirrors lines 63-71 round-trip pattern).
      if (result.success) {
        expect(result.data.hashDirName).toBe(hash);
        expect(result.data.decodedPath).not.toBeNull();
      }
```

## `it()` blocks NOT modified in placeholder.test.ts (and why)

Per the PATTERNS.md sweep-table analysis (lines 227-234), only the fourth `it()` block needed a fix. Confirmed by inspection:

| Block | Lines | Status | Rationale for no edit |
|-------|-------|--------|----------------------|
| `'returns success with hasPlaceholders: false...'` | 18-35 | already correct | Has full `expect(platformResult.success).toBe(true)` doublet at lines 24-26 |
| `'returns dir_not_found for a non-existent directory'` | 37-48 | already correct | Has full doublet at lines 38-40 |
| `'detects .icloud placeholder files on macOS'` | 52-67 | no fix needed | Hardcodes `'macos'` literal at line 60; `.skipIf(process.platform !== 'darwin')` makes the platform value compile-time known. No `detectPlatform()` call → no doublet to propagate. |
| `'returns structured result with all expected fields'` | 69-84 | **fixed in Task 1** | Was missing the `expect(...).toBe(true)` line above the narrow guard at line 73 |

`grep -c 'detectPlatform()' packages/core/test/integrity/placeholder.test.ts` returns `3` (3 calls preserved — the macOS test does not call it, and the fix added an assertion adjacent to an existing call rather than adding a new call).

## Verification

**Per-file Vitest runs (local Windows, both files):**
- `npx vitest run test/integrity/placeholder.test.ts` → 4 tests (1 skipped on Windows because of `.skipIf(process.platform !== 'darwin')`), 3 passed, exit 0
- `npx vitest run test/environment/decode.test.ts` → 10 tests (1 skipped on Windows local because the reparse-point test requires admin/CI for symlink creation: `.skipIf(process.platform === 'win32' && !process.env.CI)`), 9 passed, exit 0

**Whole-suite verification (`npm test` from repo root):**
- 16 test files passed
- 79 tests passed, 2 skipped (the two platform-skipped tests above)
- Duration: 6.28s
- Exit code: 0
- No Vitest cleanup hang manifested on this run (the TEST-02 hang is intermittent in CONTEXT.md framing; the structural fix lands in plan 16-02 regardless)

**Grep gate verification:**
```bash
# Tautology must be gone:
grep -c "expect(typeof result\.success)\.toBe('boolean')" packages/core/test/environment/decode.test.ts
# Returned: 0 ✓

# New precondition assertion present 3 times in placeholder.test.ts (existing 2 + new 1):
grep -c 'expect(platformResult\.success)\.toBe(true)' packages/core/test/integrity/placeholder.test.ts
# Returned: 3 ✓

# detectPlatform() count unchanged at 3:
grep -c 'detectPlatform()' packages/core/test/integrity/placeholder.test.ts
# Returned: 3 ✓

# New success-branch assertions appear twice in decode.test.ts (round-trip + reparse-point):
grep -c 'expect(result\.data\.hashDirName)\.toBe(hash)' packages/core/test/environment/decode.test.ts
# Returned: 2 ✓
grep -c 'expect(result\.data\.decodedPath)\.not\.toBeNull()' packages/core/test/environment/decode.test.ts
# Returned: 2 ✓
```

## Decisions Made

None — both decisions were already locked in CONTEXT.md (D-Claude-1) and the plan's `<action>` blocks. Followed plan as specified.

## Deviations from Plan

None — plan executed exactly as written. No fix-if-cheap discoveries triggered (D-01); no opportunistic edits considered or rejected (D-02 ceiling not exercised).

## Issues Encountered

**Pre-existing build precondition for vitest:** First `npx vitest run` invocation from `packages/core/` failed with `Failed to resolve entry for package "@localground/core"` because the `dist/` output didn't exist on the freshly-cloned-feeling working tree. Resolved by running `npm run build` for `@localground/core` first (the `pretest` lifecycle hook does this automatically when running from repo root via `npm test`, but per-file vitest runs from a package directory require an explicit prior build). Not a deviation — this is normal monorepo workflow, not something the plan needed to handle.

## User Setup Required

None — no external service configuration required. Both edits are local test-file changes.

## Next Phase Readiness

- **Plan 16-02 (Vitest cleanup hang elimination):** Ready. The cleanup pattern in PATTERNS.md (lines 67-141) is unchanged — the `afterEach`-based child-process reaper for MCP/CLI smoke tests can land on top of this plan's clean working tree.
- **Plan 16-03 (tsc --build CI gate):** Ready. No `.ts` source files were modified in this plan — only `.test.ts` files, which `tsc --build` already excludes per the planner-flag note in PATTERNS.md (`include: ["src/**/*"]` in `packages/*/tsconfig.json`).
- **No blockers.** The 79-test green baseline holds; both edits strengthen test contracts without altering behavior of any production code path.

## Self-Check: PASSED

- [x] `packages/core/test/integrity/placeholder.test.ts` exists and contains the new assertion (verified via Read tool — line 73 shows `expect(platformResult.success).toBe(true);`)
- [x] `packages/core/test/environment/decode.test.ts` exists and contains the new success-branch block (verified via Read tool — lines 102-106 show the replacement)
- [x] Commit `0b2dafe` exists in `git log --oneline` (verified)
- [x] Commit `6e46702` exists in `git log --oneline` (verified)
- [x] No deletions in either commit (verified via `git diff --diff-filter=D --name-only HEAD~1 HEAD` — empty output)
- [x] `npm test` from repo root exits 0 with 79 passed (verified)

---
*Phase: 16-test-infrastructure-hardening*
*Completed: 2026-04-27*
