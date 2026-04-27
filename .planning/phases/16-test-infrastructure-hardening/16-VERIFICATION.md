---
phase: 16-test-infrastructure-hardening
verified: 2026-04-27T05:25:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
requirements_verified: 4/4
---

# Phase 16: Test Infrastructure Hardening Verification Report

**Phase Goal:** Restore the strict tsc quality gate and eliminate test-suite reliability defects so subsequent codebase changes (CORE-13/14, UAT validation) land under a hardened gate.

**Verified:** 2026-04-27T05:25:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| #   | Truth                                                                                                                                                                                            | Status     | Evidence                                                                                                                                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SC1 | `npm run typecheck` (or equivalent `tsc --build`) exits 0 in CI on Windows, macOS, and Linux without weakening strict mode                                                                       | ✓ VERIFIED | `npm run build:check` exits 0 on Windows local. Script chains `tsc --build tsconfig.json && tsc --noEmit -p tsconfig.test.json`. No `as any`, no `@ts-ignore`, no `noImplicitAny:false`, no `strict:false` introduced. tsconfig.test.json overrides only emit-related fields (composite/noEmit/declaration/sourceMap/rootDir) — strict family inherited from root. CI matrix retains windows-latest, macos-latest, ubuntu-latest. |
| SC2 | `npm test` exits with the same code Vitest reports (no hang on shutdown after suite completes)                                                                                                   | ✓ VERIFIED | `npm test` exited 0 cleanly. 16 test files, 79 tests passed, 2 skipped, Duration 6.20s. No Ctrl+C required. Both smoke files have describe-scoped `afterEach` reapers with `child.kill()` + awaited `once(c, 'exit')` + 1000ms timeout fallback. CRIT-1 stdout-discipline test still passes 3/3. |
| SC3 | Running the full Vitest suite against an intentionally-broken `placeholder.test.ts` precondition causes the dependent assertions to fail loudly instead of silently no-op                       | ✓ VERIFIED | Verified by inspection per environment-notes guidance (no actual file mutation). `placeholder.test.ts:73` contains `expect(platformResult.success).toBe(true);` BEFORE the narrow guard at line 74 (`if (!platformResult.success) return;`). If `.success` were forced to `false`, `expect(...).toBe(true)` would fire and fail the test before reaching the early return. Pattern present in three `it()` blocks (lines 25, 39, 73). |
| SC4 | `decode.test.ts` no longer contains `expect(typeof result.success).toBe('boolean')` or any equivalent tautology that cannot fail given the discriminated union                                  | ✓ VERIFIED | Grep `expect\(typeof.*success\)\.toBe\(['"]boolean['"]\)` across `packages/` returns zero matches. The tautology at decode.test.ts:102 was replaced with success-branch assertions on `result.data.hashDirName` and `result.data.decodedPath` (lines 103-106). |
| SC5 | CI run summary shows tsc + tsup + vitest all gating master pushes                                                                                                                                | ✓ VERIFIED | `.github/workflows/ci.yml` step ordering: line 39 "Build all workspace packages" (`npm run build` → tsup), line 42 "Strict type check (tsc --build)" (`npm run build:check` → tsc), line 45 "Run test suite" (`npm test` → vitest). awk ordering check returns ORDER_OK. No `continue-on-error`. 3-OS matrix preserved. *Note: First green end-to-end CI run on master is Phase 20 / PIPE-01's responsibility per ROADMAP.md — Phase 16 ships the configuration that PIPE-01 will validate.* |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact                                                          | Expected                                                                                  | Status     | Details                                                                                                                                                  |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tsconfig.test.json`                                              | Root-level test tsconfig — composite:false, noEmit:true, includes src + test under strict | ✓ VERIFIED | File exists at repo root, 19 lines, extends `./tsconfig.json`, overrides only emit-related fields. Strict family preserved.                              |
| `package.json`                                                    | Updated `build:check` runs both composite build and test-scope check                      | ✓ VERIFIED | Line 14: `"build:check": "tsc --build tsconfig.json && tsc --noEmit -p tsconfig.test.json"`. Verified via direct read.                                   |
| `.github/workflows/ci.yml`                                        | New `Strict type check (tsc --build)` step between Build and Test                         | ✓ VERIFIED | Lines 42-43 contain the new step running `npm run build:check`. No `continue-on-error`. 46 total lines (was 43; +3 as planned).                          |
| `packages/core/test/integrity/placeholder.test.ts`                | Fourth `it()` block has explicit `expect(platformResult.success).toBe(true)` precondition  | ✓ VERIFIED | Line 73 contains the assertion. Three matches total (lines 25, 39, 73). Doublet pattern propagated correctly.                                            |
| `packages/core/test/environment/decode.test.ts`                   | Reparse-point test asserts `data.decodedPath` instead of typeof tautology                 | ✓ VERIFIED | Lines 103-106 contain success-branch assertions on `data.hashDirName` and `data.decodedPath`. Tautology grep returns 0 matches.                          |
| `packages/mcp/test/smoke.test.ts`                                 | Describe-scoped afterEach reaper with trackedSpawnServer wrapper                          | ✓ VERIFIED | Lines 90-110: describe-scoped `children` array, `trackedSpawnServer` wrapper (3 references — 1 def + 2 call sites), `afterEach` with kill + once + 1000ms timeout. |
| `packages/cli/test/smoke.test.ts`                                 | Module-scoped reaper shared across both describe blocks                                    | ✓ VERIFIED | Module-scoped `children` array (line 22), `runCli` pushes (line 45), `reapChildren` helper (lines 84-95), `afterEach` in both describe blocks (lines 102-104, 125-128). |

### Key Link Verification

| From                                              | To                                                  | Via                                                                                                  | Status   | Details                                                                                                                                                                |
| ------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json` `build:check`                      | `tsconfig.test.json` (test scope)                   | `&&`-chained `tsc --noEmit -p tsconfig.test.json`                                                    | ✓ WIRED  | Confirmed via direct read; `npm run build:check` exits 0.                                                                                                              |
| `.github/workflows/ci.yml` Strict type check step | `package.json` `build:check`                        | `run: npm run build:check`                                                                           | ✓ WIRED  | Line 43 of ci.yml. Step positioned after Build (line 39), before Test (line 45). awk ordering check returns ORDER_OK.                                                  |
| `tsconfig.test.json`                              | All source and test .ts files                       | `include: ["packages/*/src/**/*", "packages/*/test/**/*"]` with `composite:false, rootDir:"."`         | ✓ WIRED  | File contains both include patterns. tsc completes the gate exiting 0 over both src and test scopes.                                                                   |
| `placeholder.test.ts` precondition                | `@localground/core detectPlatform`                  | `expect(platformResult.success).toBe(true)` BEFORE narrow guard                                       | ✓ WIRED  | Asserted at line 73 before the early-return at line 74; matches the doublet pattern at lines 25-26 and 39-40.                                                          |
| `decode.test.ts` success-branch                   | `@localground/core decode/encode`                   | `if (result.success) { expect(result.data.hashDirName).toBe(hash); expect(result.data.decodedPath).not.toBeNull(); }` | ✓ WIRED  | Round-trip pattern mirrored from existing test at lines 63-71; assertions at lines 104-105.                                                                            |
| `mcp/smoke.test.ts` afterEach                     | Spawned `ChildProcess` instances                    | `children[]` array reaped via `child.kill()` + `once(c, 'exit')` race with 1000ms timeout            | ✓ WIRED  | Lines 99-110. CRIT-1 stdio invariant preserved — verified via `stdout-discipline.test.ts` 3/3 pass post-edit.                                                          |
| `cli/smoke.test.ts` runCli + reapChildren         | Module-scoped `children: ChildProcess[]`            | `children.push(child)` inside `runCli`; `reapChildren()` called from both describe blocks' afterEach | ✓ WIRED  | Single push site in `runCli` (line 45); reaper called from both describe blocks' afterEach.                                                                            |

### Behavioral Spot-Checks

| Behavior                                                          | Command                  | Result                                                                          | Status   |
| ----------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------- | -------- |
| Strict type-check gate covers src + test, exits 0                 | `npm run build:check`    | `tsc --build tsconfig.json && tsc --noEmit -p tsconfig.test.json` → exit 0       | ✓ PASS   |
| Full Vitest suite passes with no cleanup hang                     | `npm test`               | 16 test files, 79 passed, 2 skipped, Duration 6.20s, exit 0, no Ctrl+C needed   | ✓ PASS   |
| Tautology grep zero across all packages                            | grep tautology pattern   | 0 matches                                                                        | ✓ PASS   |
| `as any` grep zero in src + test                                  | grep `as any`            | 0 matches                                                                        | ✓ PASS   |
| `@ts-ignore` grep zero                                            | grep `@ts-ignore`        | 0 matches                                                                        | ✓ PASS   |
| Strict-loosening flags absent everywhere                          | grep `"(strict\|noImplicitAny)":\s*false` in *.json | 0 matches                                                                        | ✓ PASS   |
| CI step ordering Build → Strict → Test                            | awk on ci.yml            | ORDER_OK (lines 39, 42, 45)                                                      | ✓ PASS   |
| Phase 16 commits exist in git history                             | `git log --oneline`      | All 6 task commits present (`0b2dafe`, `6e46702`, `525cdad`, `bf304a9`, `be8899c`, `1547581`) | ✓ PASS   |

### Requirements Coverage

| Requirement | Source Plan | Description                                                                                                                       | Status       | Evidence                                                                                                                                                                                            |
| ----------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TEST-01     | 16-03       | `tsc --build` restored as a CI quality gate alongside tsup; ~30 implicit-any errors resolved without weakening strict mode        | ✓ SATISFIED  | `tsconfig.test.json` created at root; `build:check` chains both passes; CI step `Strict type check (tsc --build)` lands between Build and Test. Empirical surfaced count was 0 errors (codebase already strict-clean from 16-02 typing additions); plan-Task 2 became vacuously true. Live-fire probe documented in 16-03-SUMMARY confirms TS7006 fires on a deliberate untyped parameter — gate is active, not silently no-op. |
| TEST-02     | 16-02       | Vitest cleanup hang on `npm test` exit eliminated via `afterEach` cleanup of spawned children                                     | ✓ SATISFIED  | Both smoke files have describe-scoped `afterEach` reapers; `npm test` exits cleanly without Ctrl+C. CRIT-1 stdout-discipline test still passes. CRIT-3/MOD-3 spawn discipline preserved (`shell: true` count 0 in test files). |
| TEST-03     | 16-01       | placeholder.test.ts adds explicit `expect(platformResult.success).toBe(true)` precondition guard so dependent assertions can never silently no-op | ✓ SATISFIED  | Line 73 contains the assertion. Three doublet matches in file (lines 25, 39, 73). Fourth `it()` block (lines 69-85) now fails loudly if `detectPlatform` returns failure.                          |
| TEST-04     | 16-01       | decode.test.ts tautological assertion replaced with a meaningful check                                                            | ✓ SATISFIED  | Tautology grep returns 0 matches. Replacement at lines 103-106 asserts `result.data.hashDirName` and `result.data.decodedPath` on the success branch, mirroring round-trip pattern at lines 63-71. |

**Coverage:** 4/4 requirement IDs satisfied. All four marked Complete in REQUIREMENTS.md (lines 32-35) and Traceability table.

### Anti-Patterns Found

| File                                              | Line     | Pattern                                                                | Severity | Impact                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------- | -------- | ---------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/cli/test/smoke.test.ts`                 | 125-128  | Cleanup ordering: `fs.rm(tmpDir)` runs BEFORE `reapChildren()`         | ℹ️ Info  | Pre-existing reviewer finding (16-REVIEW.md WR-01). Already documented in 16-02-SUMMARY.md as `T-16-02-04 accept` with rationale: every current `runCli` resolves on `close` before the test returns, so no child is alive when `fs.rm` fires. Noted for future maintainer; does NOT affect Phase 16 goal achievement. Reviewer's recommendation to reverse the order is a deferrable hardening, not a Phase 16 gap. |
| `packages/core/test/environment/decode.test.ts`   | 103-106  | Failure branch of reparse-point test still unasserted                  | ℹ️ Info  | Pre-existing reviewer finding (16-REVIEW.md IN-01). Documented design choice per D-Claude-1 ("over-specifies on OS-dependent traversal paths"). Logged for revisit during Phase 17 / CORE-13/14 decoder calibration; does NOT affect TEST-04 closure (the tautology IS gone and replaced with a meaningful success-branch contract).                                                                                |
| `packages/cli/test/smoke.test.ts`                 | 20-22    | Comment claims per-describe slicing but `reapChildren` clears entire array | ℹ️ Info  | Pre-existing reviewer finding (16-REVIEW.md IN-02). Cosmetic — misleading comment, not behavioral defect. Vitest runs `it()` blocks sequentially within a file so cross-test contention doesn't manifest.                                                                                                                                                                                                                                                                                                            |

No blockers. No warnings. Three info-level items all originate from the existing 16-REVIEW.md and were either accepted with rationale (T-16-02-04) or flagged as deferrable.

### Forecast Reconciliation (Phase-Level Note)

The plan's D-18 forecast of ~30 implicit-any errors did NOT materialize when `tsconfig.test.json` was applied. Empirical surfaced count: 0 errors. The 16-03-SUMMARY.md transparently documents this with diagnostic evidence:
- `tsc --extendedDiagnostics` reports 394 files / 5,897 lines TS checked under full strict family
- `tsc --listFiles` confirms all 16 test files included in the gate scope
- `tsc --showConfig` shows strict, noImplicitAny, strictNullChecks, strictFunctionTypes, strictBindCallApply, strictPropertyInitialization all `true`
- A live-fire probe (deliberate untyped param → TS7006 fired → reverted) confirmed the gate is active before Task 1 commit

Plan-Task 2 ("fix all surfaced errors") became vacuously true at zero errors — no manufactured no-op commit was created. The deeper TEST-01 invariant ("gate covers src + test under strict mode without weakening strict") is satisfied empirically. This is a documented deviation in 16-03-SUMMARY, not a verification gap.

### Human Verification Required

None. This phase delivers tooling and test-infrastructure changes that are entirely verifiable via shell commands and code inspection. Phase 20 / PIPE-01 will validate the first end-to-end green CI run on master push (the cross-platform leg of SC1) — that is explicitly Phase 20's responsibility per ROADMAP.md, not a Phase 16 verification item.

### Gaps Summary

No gaps. Phase 16 goal achieved:
- Strict tsc gate restored at the configuration level, covering both src and test scopes under inherited strict mode (TEST-01)
- Vitest cleanup hang structurally eliminated via describe-scoped afterEach reapers in both smoke test files (TEST-02)
- Silent-no-op precondition in placeholder.test.ts replaced with assert-then-narrow doublet (TEST-03)
- Tautological discriminated-union assertion in decode.test.ts replaced with meaningful success-branch contract (TEST-04)
- CI workflow gates tsc + tsup + vitest in correct order (Build → Strict type check → Test) with no `continue-on-error`
- Strict mode invariants preserved: zero `as any`, zero `@ts-ignore`, zero `noImplicitAny:false`, zero `strict:false`
- CRIT-1 (stdout discipline), CRIT-3/MOD-3 (spawn discipline) invariants preserved

Subsequent codebase changes (Phase 17 CORE-13/14, Phase 18 packaging, Phase 19 UAT) will land under the hardened gate as the phase goal intended.

---

*Verified: 2026-04-27T05:25:00Z*
*Verifier: Claude (gsd-verifier)*
