---
status: issues_found
phase: 16-test-infrastructure-hardening
depth: standard
files_reviewed: 7
reviewed: 2026-04-26
diff_base: fb6065b
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
---

# Phase 16: Code Review — Test Infrastructure Hardening

## Files reviewed

- `.github/workflows/ci.yml`
- `package.json`
- `packages/cli/test/smoke.test.ts`
- `packages/core/test/environment/decode.test.ts`
- `packages/core/test/integrity/placeholder.test.ts`
- `packages/mcp/test/smoke.test.ts`
- `tsconfig.test.json`

## Summary

Phase 16 is a clean, surgical phase. The three plans landed exactly the changes their summaries describe: precondition-guard fix in `placeholder.test.ts`, success-branch contract replacing the tautology in `decode.test.ts`, child-process reapers in MCP and CLI smoke tests, and a new root-level `tsconfig.test.json` chained into `build:check` and the CI workflow. CRIT-1 (stdout discipline), CRIT-3/MOD-3 (no `shell: true`, array-args spawns), and the strict-mode invariant ("no weakening") are all preserved per inspection.

No blockers. One real foot-gun for future contributors and two info-level items follow.

## Warnings

### WR-01: `fs.rm` runs before `reapChildren` in CLI fixture-cleanup `afterEach`

**File:** `packages/cli/test/smoke.test.ts:125-128`

```ts
afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
  await reapChildren();
});
```

**Issue:** The cleanup order is "remove `tmpDir`, then reap children." The summary (16-02-SUMMARY.md) acknowledges this as threat T-16-02-04 with status `accept` because today every `runCli` resolves on `close` before the test returns, so no child is alive when `fs.rm` fires. That assumption is invisible in the code itself — a future contributor adding a test that intentionally leaves a child running (e.g., to assert mid-process state) will get one of two failure modes on Windows:

1. `fs.rm` fails because the spawned child still holds a file handle inside `tmpDir` (file lock contention is the exact bug the v3.0.0 testing convention was hardened against).
2. `fs.rm` partially succeeds, leaves orphan handles, and `reapChildren` then kills a child whose CWD/files no longer exist — undefined cleanup state.

The current `force: true` masks (1) on POSIX but not Windows, where `EBUSY` will still surface.

**Fix:** Reverse the order so `reapChildren` runs first, draining any live children before filesystem cleanup. Comment can call out that the order is load-bearing.

```ts
afterEach(async () => {
  await reapChildren();
  await fs.rm(tmpDir, { recursive: true, force: true });
});
```

This costs nothing today (no live children at test-end) and removes the latent foot-gun. The companion mirror — read-only describe block at lines 102-104 — has nothing to clean up beyond children, so it's already fine.

## Info

### IN-01: `decode.test.ts` reparse-point test is vacuous when `result.success === false`

**File:** `packages/core/test/environment/decode.test.ts:103-106`

```ts
if (result.success) {
  expect(result.data.hashDirName).toBe(hash);
  expect(result.data.decodedPath).not.toBeNull();
}
```

**Issue:** This is a strict improvement over the tautology it replaced (TEST-04 closed correctly), but the failure branch is still unasserted. If `decode()` regresses to the bug-mode it was originally written to catch — silently filtering reparse-point entries during traversal so the call returns `no_candidates` instead of resolving the symlinked path — this test passes with zero assertions executed. The "must NOT throw" invariant the plan cites is enforced only structurally (vitest fails on uncaught throws), not asserted.

The 16-01-SUMMARY.md explicitly chose this trade-off ("over-specifies on OS-dependent traversal paths"). Documented design, not a regression. Logging here so the next maintainer can see the residual gap when they revisit Phase 17 / CORE-13/14 decoder calibration work.

**Fix (deferrable):** When the decoder calibration phase lands, consider asserting the OS-by-OS expected branch — Windows CI (`process.env.CI && process.platform === 'win32'`) currently has admin and creates the junction, so the success branch should always be taken on that runner. An `expect(result.success).toBe(true)` precondition would close the gap on the only platform where the test actually runs.

### IN-02: Misleading comment in CLI smoke test

**File:** `packages/cli/test/smoke.test.ts:20-22`

```ts
// Module-scoped children array — populated by runCli, reaped by per-describe afterEach hooks.
// Each describe block clears its slice via `children.length = 0` in afterEach to avoid bleed.
const children: ChildProcess[] = [];
```

**Issue:** The comment claims each describe block clears "its slice" of the array. There is no slicing — both `afterEach` hooks call the shared `reapChildren` helper, which clears the **entire** array via `children.length = 0` (line 94). The "slice" framing implies per-describe partitioning that doesn't exist in the code. A future maintainer reading the comment may believe child-process tracking is partitioned by describe scope and write code that depends on that nonexistent isolation.

**Fix:** Replace the second sentence with the actual semantics:

```ts
// Module-scoped children array — populated by runCli, reaped by per-describe afterEach hooks.
// `reapChildren` clears the full array each call; both describe blocks share this single
// list because vitest runs `it` blocks sequentially within a file, so there is never
// cross-test contention.
```

## Verification of phase invariants (no findings — confirmation only)

- **CRIT-1 stdio discipline:** Phase 16 added no writes to spawned-child stdin during teardown. `child.kill()` is signal-only. Stdout-discipline guard test (`packages/mcp/test/stdout-discipline.test.ts`) referenced in 16-02-SUMMARY.md remains the enforcement layer.
- **CRIT-3/MOD-3 spawn discipline:** Verified `shell: true` count = 0 across both edited smoke tests; all spawns use `process.execPath` + array args.
- **Strict-mode no-weakening (TEST-01 constraint):** `tsconfig.test.json` overrides only `composite/noEmit/declaration/declarationMap/sourceMap/rootDir`. The strict family inherits unchanged from the composite root. No `as any`, no `@ts-ignore`, no `noImplicitAny: false` introduced.
- **Real-fs fixture convention:** All four edited test files continue to use `os.tmpdir()` + `fs.mkdtemp` + `afterEach` `fs.rm`. No mock-fs introduced.
- **Result-type narrowing pattern:** `placeholder.test.ts` 4th `it()` block now matches the assert-then-narrow doublet (lines 24-26 model). `decode.test.ts` reparse-point block now uses success-branch narrow + meaningful assertions on `data.hashDirName` and `data.decodedPath`.
- **CI workflow:** Build → Strict type check → Test ordering correct; no `continue-on-error`; 3-OS matrix unchanged.

---

*Reviewer: Claude (gsd-code-reviewer)*
*Depth: standard*
