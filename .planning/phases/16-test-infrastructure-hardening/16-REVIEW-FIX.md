---
phase: 16-test-infrastructure-hardening
fixed_at: 2026-04-26
review_path: .planning/phases/16-test-infrastructure-hardening/16-REVIEW.md
iteration: 1
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Phase 16: Code Review Fix Report

**Fixed at:** 2026-04-26
**Source review:** `.planning/phases/16-test-infrastructure-hardening/16-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope (`critical_warning`): 1
- Fixed: 1
- Skipped: 0
- Out of scope (info-level, `--all` flag not set): 2 (IN-01, IN-02)

## Fixed Issues

### WR-01: `fs.rm` runs before `reapChildren` in CLI fixture-cleanup `afterEach`

**Files modified:** `packages/cli/test/smoke.test.ts`
**Commit:** `0136116`
**Applied fix:** Reversed the order of the two `await` calls in the fixture-based describe block's `afterEach` (lines 125-131) so `reapChildren()` runs before `fs.rm(tmpDir, ...)`. Added a three-line comment above the calls explaining that the order is load-bearing — drain children before filesystem cleanup so a future test that leaves a child alive cannot hold a Windows file handle inside `tmpDir` and trigger `EBUSY`. The read-only describe block's `afterEach` (line 102) was already correct (only reaps children — no fixture to clean) and was not touched.

**Verification:**
- Tier 1: Re-read lines 115-140; `await reapChildren()` is at line 129, `await fs.rm(tmpDir, ...)` is at line 130. Surrounding code intact.
- Tier 2: `grep -n "await reapChildren" packages/cli/test/smoke.test.ts` shows hits at lines 103 and 129 — fixture-block call is now BEFORE the `fs.rm` call.
- Tier 3 (full test suite): `npm test` passes — 16 files / 79 tests, 2 platform-skipped (matches expected counts in the dispatch prompt).

## Out of Scope

The following info-level findings are documented but not fixed because the fix scope is `critical_warning` (default). Re-run with `--all` to include them.

### IN-01: `decode.test.ts` reparse-point test is vacuous when `result.success === false`

**File:** `packages/core/test/environment/decode.test.ts:103-106`
**Reason:** info-level, `--all` flag not set. REVIEW.md classifies this as a deferrable trade-off acknowledged in 16-01-SUMMARY.md and explicitly recommends deferring to the Phase 17 / CORE-13/14 decoder calibration work.
**Original issue:** The success-branch narrow is correct, but the failure branch is unasserted. If `decode()` regresses to silently filtering reparse-point entries, the test passes with zero assertions executed.

### IN-02: Misleading comment in CLI smoke test

**File:** `packages/cli/test/smoke.test.ts:20-22`
**Reason:** info-level, `--all` flag not set. Comment-only fix, no behavioral impact.
**Original issue:** Comment claims each describe block clears "its slice" of the children array. There is no slicing — both `afterEach` hooks call the shared `reapChildren` helper, which clears the entire array via `children.length = 0`. The "slice" framing implies per-describe partitioning that doesn't exist.

---

_Fixed: 2026-04-26_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
