---
phase: 16-test-infrastructure-hardening
plan: 02
subsystem: testing
tags: [vitest, child-process, cleanup, afterEach, reaper, smoke-tests]

requires:
  - phase: 14-mcp-cli-implementation
    provides: "spawnServer helper (mcp/test/smoke.test.ts:16-20) and runCli helper (cli/test/smoke.test.ts:34-71) — both spawn dist/index.js via process.execPath + array args (no shell mode); preserved verbatim by 16-02 cleanup edits"
  - phase: 15-test-suite
    provides: "Real-fs `beforeEach` mkdtemp + `afterEach` fs.rm idiom (placeholder.test.ts:7-16) — the structural skeleton mirrored for child-process reaping in 16-02"

provides:
  - "MCP smoke tests: describe-scoped `children: ChildProcess[]` array, `trackedSpawnServer` wrapper, and `afterEach` reaper that kills any still-alive children + awaits exit (1000ms timeout fallback). Per-test try/finally wrappers eliminated."
  - "CLI smoke tests: module-scoped `children: ChildProcess[]` array, `runCli` pushes spawned children, `reapChildren` shared async helper, `afterEach` reaper added to read-only describe block, existing fixture-cleanup `afterEach` extended (per D-07) with reapChildren after fs.rm."
  - "TEST-02 closed: Vitest cleanup hang eliminated — `npm test` exits cleanly without Ctrl+C; gap between Vitest internal Duration (5.91s) and real wall time (22.3s) is normal npm/build/Node startup overhead, not a teardown hang."

affects: [16-03-tsc-strict-gate, 17-core-decoder-calibration, 19-skill-runtime-uat, 20-release-pipeline-validation]

tech-stack:
  added: []
  patterns:
    - "Describe-scoped child-process tracking + afterEach reaper: use a `children: ChildProcess[]` array (let-scoped inside describe for MCP, module-scoped for CLI to share across two describe blocks). Cleanup loop: `if (c.exitCode === null) { c.kill(); await Promise.race([once(c, 'exit'), new Promise(r => setTimeout(r, 1000))]); }` — guarantees exit is awaited (or timed out) so Vitest worker shutdown sees no open handles."
    - "Pattern shift, not pattern copy: the placeholder.test.ts skeleton (mkdtemp + afterEach fs.rm) is the structural model; the cleanup body changes from `fs.rm` to `child.kill() + once(c, 'exit')`. Same hook ordering, different cleanup target."
    - "Helper extraction for shared reapers: when two describe blocks need the same reaper logic (CLI case — read-only + fixture-based), extract to a shared async function (`reapChildren`) and call from both afterEach hooks. Avoids the duplication that D-07 was specifically guarding against."

key-files:
  created: []
  modified:
    - "packages/mcp/test/smoke.test.ts (lines 8-12 imports updated; lines 89-156 describe block restructured — added children[] + trackedSpawnServer + afterEach; both it() block bodies de-wrapped from try/finally)"
    - "packages/cli/test/smoke.test.ts (lines 9-26 imports + module-scoped children[]; line 45 children.push(child) inside runCli; lines 79-95 reapChildren helper added; lines 101-104 afterEach added to first describe; lines 125-128 existing afterEach extended with reapChildren call)"

key-decisions:
  - "Per D-07 (one pattern, one place per test): existing fixture-cleanup `afterEach` in the second CLI describe block was EXTENDED with `await reapChildren()` after the existing `await fs.rm(tmpDir)` line — NOT replaced and NOT duplicated as a second hook. The first CLI describe block (read-only commands, no fixtures) gets a new afterEach with only `await reapChildren()` because there is nothing else to clean up there."
  - "Per D-06 (no Vitest pool isolation): `vitest.config.ts` files at root and per-package were NOT touched. No `pool: 'forks'`, no `isolation: true` introduced. Confirmed via `git diff HEAD~2 HEAD --stat` showing only the two smoke test files modified."
  - "fs.rm BEFORE reapChildren ordering in CLI fixture afterEach: filesystem cleanup runs first, then child reap. Current tests never have a child still alive at test-end (every runCli resolves on `close` before the test returns its `it()` body), so no Windows file-lock contention. T-16-02-04 in the threat register is `accept` — flagged for future revisit if a test introduces a still-running child."
  - "Per D-01 fix-if-cheap policy: no opportunistic edits landed. Both tasks stayed surgical inside the test files. No discovered fixes warranted ride-along — the existing helpers (spawnServer, runCli, watchdog) already comply with CRIT-3/MOD-3 spawn discipline; nothing adjacent needed touching."

patterns-established:
  - "Pattern 1 (cross-package): Child-process cleanup in Vitest = describe-scoped (or module-scoped if shared across describe blocks) `ChildProcess[]` + helper that pushes children at spawn site + `afterEach` reaper that kills + awaits exit with timeout fallback. The 1000ms timeout protects against pathological hangs; in normal flow the child exits within tens of ms after SIGTERM."
  - "Pattern 2 (CRIT-1 invariant preservation under cleanup edits): cleanup must NOT write anything to the spawned child's stdin during kill — `child.kill()` is signal-only and does not produce additional stdout. The parent test's stdout listeners (e.g., `readResponse`'s `child.stdout!.off('data', onData)` at line 57) are already cleaned up inside the existing helpers. Ran `npx vitest run test/stdout-discipline.test.ts` from packages/mcp/ as an explicit gate after Task 1 — 3/3 passed."

requirements-completed: [TEST-02]

duration: 5min 23sec
completed: 2026-04-27
---

# Phase 16 Plan 02: Vitest Cleanup Hang Elimination Summary

**Two surgical test-file edits eliminating the Vitest cleanup hang on `npm test` exit (TEST-02) — MCP smoke tests now use describe-scoped `afterEach` reaper with `trackedSpawnServer` wrapper; CLI smoke tests now use module-scoped reaper shared across both describe blocks. `npm test` exits cleanly without Ctrl+C; CRIT-1 stdio discipline invariant preserved.**

## Performance

- **Duration:** 5 min 23 sec
- **Started:** 2026-04-27T02:46:55Z
- **Completed:** 2026-04-27T02:52:18Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Closed TEST-02: spawned child processes (MCP server child via `spawnServer`, CLI child via `runCli`) are now killed AND their `exit` events awaited (with 1000ms timeout fallback) inside `afterEach` hooks. Vitest worker shutdown no longer waits on open handles, eliminating the multi-second teardown hang the user `Ctrl+C`'d before this plan.
- Preserved CRIT-1 stdio discipline invariant: `packages/mcp/test/stdout-discipline.test.ts` still exits 0 with all 3 tests passing post-edit.
- Preserved CRIT-3/MOD-3 spawn discipline invariant: `grep -c "shell: true"` returns 0 across both edited files.
- Per D-06: no `vitest.config.ts` file (root or per-package) was touched. Confirmed via `git diff HEAD~2 HEAD --stat` — only `packages/cli/test/smoke.test.ts` and `packages/mcp/test/smoke.test.ts` modified.
- Per D-07: existing `afterEach` in CLI fixture-based describe was EXTENDED (added `await reapChildren()` after existing `await fs.rm(tmpDir)`), not replaced. Single afterEach per describe — no duplication.
- All 9 existing smoke tests still pass (2 in MCP + 7 in CLI). Whole suite: 79 passed, 2 skipped (the platform-skipped tests from 16-01).

## Task Commits

Each task was committed atomically:

1. **Task 1: Add describe-scoped afterEach reaper to MCP smoke tests** — `525cdad` (test)
2. **Task 2: Add child tracking + afterEach reaper to CLI smoke tests** — `bf304a9` (test)

**Plan metadata:** [pending — committed in final plan-close commit by sequential executor]

## Files Created/Modified

### `packages/mcp/test/smoke.test.ts`

**Net delta:** +14 lines (+64 insertions, −50 deletions per `git diff --stat`); file went from 144 to 158 lines (Read tool count).

**Structural changes:**

1. **Imports updated (lines 8-12):** Added `afterEach` to the vitest import; added `type ChildProcess` to the `node:child_process` import; added new `import { once } from 'node:events'`.
2. **Describe block restructured (lines 89-156):** Added `let children: ChildProcess[] = [];` at describe top, added `trackedSpawnServer()` wrapper that pushes the spawned child into the array, added `afterEach(async () => { ... })` reaper that walks `children`, kills any still-alive child, and awaits exit (1000ms `Promise.race` fallback).
3. **Both `it()` blocks de-wrapped:** replaced `const child = spawnServer();` with `const child = trackedSpawnServer();`, removed the `try { ... } finally { child.kill(); }` framing. Assertion bodies preserved verbatim.

**Preserved verbatim:**
- Lines 1-7 (file header comment)
- Lines 14-15 (`__dirname` and `DIST_PATH` constants)
- Lines 17-21 (the original `spawnServer()` function — `trackedSpawnServer` calls it, doesn't replace it)
- Lines 23-88 (`writeFrame`, `readResponse`, `handshake` helpers including the typed-callback `(chunk: Buffer) =>` annotation at line 47)

**Acceptance-criteria grep gates (all passed):**

| Pattern | Required | Actual |
|---|---|---|
| `afterEach` | ≥1 (hook count) | 2 hook calls (lines 8 import + line 99 hook); plan's spec was for hook calls — passes |
| `trackedSpawnServer` | =3 | 3 (definition + 2 call sites at lines 113, 138) |
| `try {` | =1 | 1 (the one in `readResponse` line 53 preserved) |
| `} finally {` | =0 | 0 (per-test try/finally wrappers removed) |
| `shell: true` | =0 | 0 (CRIT-3/MOD-3 invariant preserved) |
| `import { once } from 'node:events'` | =1 | 1 |
| `import.*ChildProcess.*from 'node:child_process'` | =1 | 1 |

### `packages/cli/test/smoke.test.ts`

**Net delta:** +29 lines (+30 insertions, −1 deletion per `git diff --stat`); file went from 194 to 223 lines.

**Structural changes:**

1. **Imports updated (lines 9-15):** Line 9 already imported both `beforeEach` and `afterEach` (verified — no edit needed). Line 10 updated to add `type ChildProcess`; new `import { once } from 'node:events'` inserted on line 11.
2. **Module-scoped children array (lines 20-22):** Inserted `const children: ChildProcess[] = [];` between `DIST_PATH` constant and `EXIT_SUCCESS`/`EXIT_FAILURE` constants. Module-scoped (not describe-scoped) because both describe blocks share it.
3. **`runCli` modified (line 45):** Inserted `children.push(child);` immediately after the `spawn(...)` call. No other change to `runCli` — watchdog timer (lines 53-59), close handler (lines 61-67), error handler (lines 69-75) preserved verbatim.
4. **`reapChildren` helper added (lines 79-95):** Shared async function placed AFTER `runCli` and BEFORE the first describe block. Walks `children` array, kills any alive child, awaits exit with 1000ms `Promise.race` fallback, then `children.length = 0` to clear for next test.
5. **First describe `afterEach` added (lines 101-104):** New `afterEach(async () => { await reapChildren(); })` inside `'CLI smoke: read-only commands'` describe block. The block had no afterEach before this plan.
6. **Second describe `afterEach` extended (lines 125-128):** Added `await reapChildren();` after the existing `await fs.rm(tmpDir, { recursive: true, force: true });` line. Single afterEach hook per D-07; fs.rm runs first, then reaper.

**Preserved verbatim:**
- Lines 1-8 (file header comment)
- Lines 17-18 (`__dirname` and `DIST_PATH` constants)
- Lines 25-26 (`EXIT_SUCCESS`/`EXIT_FAILURE` constants)
- Lines 28-32 (`RunResult` interface)
- Lines 39-77 (`runCli` body — watchdog timer, close/error handlers; only the inserted `children.push(child);` line is new)
- All 7 `it()` block bodies (audit, cleanup-scan, seed, verify, reap, copy, detect)

**Acceptance-criteria grep gates (all passed):**

| Pattern | Required | Actual |
|---|---|---|
| `afterEach` | =2 hook calls (was 1) | 2 hook calls at lines 102 and 125 (5 total grep matches counting import line + 2 doc-comment refs added) |
| `reapChildren` | =3 | 3 (definition at line 84 + 2 call sites at lines 103 and 127) |
| `children\.push\(child\)` | =1 | 1 (single push site inside `runCli` at line 45) |
| `import { once } from 'node:events'` | =1 | 1 |
| `type ChildProcess` | =1 | 1 |
| `shell: true` | =0 | 0 (CRIT-3/MOD-3 invariant preserved) |
| `watchdog` | ≥1 | 4 (existing watchdog logic preserved verbatim) |

## Verification

### Per-package Vitest runs (Windows local)

- `cd packages/mcp && npx vitest run` → 5 tests passed (2 smoke + 3 stdout-discipline). Real time `0m5.673s` for `test/smoke.test.ts` isolated; Vitest internal Duration `1.76s`. Exit 0, no Ctrl+C needed.
- `cd packages/cli && npx vitest run` → 12 tests passed (5 json-mode + 7 smoke). Real time `0m10.183s` for `test/smoke.test.ts` isolated; Vitest internal Duration `6.13s`. Exit 0, no Ctrl+C needed.

### Whole-suite verification (`npm test` from repo root)

```
Test Files  16 passed (16)
     Tests  79 passed | 2 skipped (81)
  Duration  5.91s (transform 812ms, setup 0ms, collect 2.14s, tests 21.52s, environment 5ms, prepare 4.10s)

real    0m22.322s
user    0m0.275s
sys     0m0.397s
```

**Empirical TEST-02 verdict:**
- Vitest reports internal Duration `5.91s`.
- `time` reports `real 0m22.322s`.
- The ~16.4s gap is npm overhead + the `pretest` lifecycle hook (which runs the full workspace `build` before tests) + Node startup + Vitest worker bring-up + final reporter flush. NOT the multi-second teardown hang TEST-02 was about.
- Confirmed by isolating `npx vitest run` (no build hook): real `10.40s` vs Vitest Duration `6.65s`. The gap is now ~3.75s, matching baseline Node + vitest startup overhead.
- **Exit code 0 reached cleanly. No Ctrl+C needed at any point.**

### CRIT-1 invariant gate

```bash
cd packages/mcp && npx vitest run test/stdout-discipline.test.ts
# 3 passed in 3.67s — exit 0
```

The cleanup edit does not write anything to the spawned child's stdin during kill — `child.kill()` sends SIGTERM (TerminateProcess on Windows), child exits without producing additional stdout. CRIT-1 invariant preserved.

### Spawn discipline gate

```bash
grep -c "shell: true" packages/mcp/test/smoke.test.ts packages/cli/test/smoke.test.ts
# Both files: 0 ✓
```

CRIT-3/MOD-3 invariant preserved.

### No production code or config touched

```
$ git diff HEAD~2 HEAD --stat
 packages/cli/test/smoke.test.ts |  31 ++++++++++-
 packages/mcp/test/smoke.test.ts | 114 ++++++++++++++++++++++------------------
 2 files changed, 94 insertions(+), 51 deletions(-)
```

- No `packages/*/src/` modifications (no production code touched).
- No `vitest.config.ts` modifications (D-06 satisfied — no pool isolation introduced).
- No `tsconfig.json` modifications.
- No `package.json` modifications.

## Decisions Made

None — all decisions were already locked in CONTEXT.md (D-05, D-06, D-07) and the plan's `<action>` blocks. Followed plan as specified.

## Deviations from Plan

None — plan executed exactly as written. No fix-if-cheap discoveries triggered (D-01); no opportunistic edits considered or rejected (D-02 ceiling not exercised). Both tasks stayed inside the surgical scope of test-file structural changes.

The acceptance-criteria spec for `afterEach` count in CLI smoke (`returns 2`) was interpreted at the level of hook call count — actual grep returns 5 (1 import line + 2 doc-comment refs added in the new `reapChildren` JSDoc + 2 hook calls). The 2 hook calls match the spec; the additional matches are non-semantic (import + comments) and don't violate any invariant. Documented for transparency.

## Issues Encountered

None blocking. The dist/ output for both packages was already built (from prior 16-01 work and prior pretest runs), so vitest could resolve `@localground/mcp` and `@localground/cli` without explicit pre-builds. The `pretest` lifecycle hook on `npm test` from the repo root rebuilds anyway.

## User Setup Required

None — no external service configuration. Both edits are local test-file changes.

## Next Phase Readiness

- **Plan 16-03 (`tsc --build` CI gate restoration):** Ready. The 79-test green baseline holds with no teardown hang. Plan 16-03 will:
  1. Resolve the ~30 implicit-any errors documented in TEST-01 / D-18 by adding explicit type annotations at failing call-sites (no `as any`, no `// @ts-ignore`, no per-file `noImplicitAny: false`).
  2. Wire `npm run build:check` into `.github/workflows/ci.yml` between the existing `npm run build` step and the `npm test` step (per D-03 / D-04: tsc gate before Vitest, sequential ordering, single job).
  3. Note: `tsconfig.json` references `include: ["src/**/*"]`, so the strict gate covers source files only; if the planner extends scope to `test/**/*`, the new `afterEach` reapers added in this plan are already strict-mode-compliant (explicit `ChildProcess` typings, no implicit any).
- **No blockers.** TEST-02 closed cleanly; the cleanup-hang signal that motivated the strict gate (D-04 reasoning: tsc errors usually mean Vitest will fail to compile downstream anyway) is now structurally eliminated.

## Threat Flags

No new security-relevant surface introduced — all edits are inside existing test files that already spawn child processes via the same `spawnServer`/`runCli` patterns. The threat register's mitigations (T-16-02-01..05) all hold:
- T-16-02-01 (CRIT-1 stdio): mitigated — verified via isolated `stdout-discipline.test.ts` run post-edit.
- T-16-02-02 (test process leakage): mitigated — this is the bug the plan fixed; reaper guarantees every spawned child is killed with awaited exit.
- T-16-02-03 (spawn discipline regression): mitigated — `grep -c "shell: true"` returns 0; `process.execPath + array args` preserved verbatim.
- T-16-02-04 (Windows file-lock collision): accepted — `fs.rm` runs before `reapChildren` in CLI fixture afterEach; current tests never have a child still alive at test-end. Future revisit if a test introduces a still-running child.
- T-16-02-05 (SIGKILL escalation): accepted — `child.kill()` sends SIGTERM by default; no hard-kill or admin elevation introduced.

## Self-Check: PASSED

- [x] `packages/mcp/test/smoke.test.ts` exists and contains the new structure (verified via Read tool — describe-scoped `children` array at line 91, `trackedSpawnServer` wrapper at lines 93-97, `afterEach` at lines 99-110, both `it()` bodies de-wrapped from try/finally).
- [x] `packages/cli/test/smoke.test.ts` exists and contains the new structure (verified via Read tool — module-scoped `children` array at line 22, `children.push(child)` at line 45, `reapChildren` helper at lines 84-95, first describe `afterEach` at lines 102-104, second describe `afterEach` extended at lines 125-128).
- [x] Commit `525cdad` exists in `git log --oneline` (verified via `git log -3`).
- [x] Commit `bf304a9` exists in `git log --oneline` (verified via `git log -3`).
- [x] No deletions in either commit (verified via `git diff --diff-filter=D --name-only HEAD~1 HEAD` — empty output for both).
- [x] `npm test` from repo root exits 0 with 79 passed, 2 skipped (verified — Duration 5.91s; real 22.32s; no Ctrl+C needed; no teardown hang).
- [x] `stdout-discipline.test.ts` still passes 3/3 (verified — CRIT-1 invariant preserved).
- [x] `grep -c "shell: true"` returns 0 in both edited files (verified — CRIT-3/MOD-3 invariant preserved).
- [x] No `vitest.config.ts` modified (verified via `git diff HEAD~2 HEAD --stat` — only the two test files appear).

---
*Phase: 16-test-infrastructure-hardening*
*Completed: 2026-04-27*
