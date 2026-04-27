---
phase: 16-test-infrastructure-hardening
plan: 03
subsystem: testing
tags: [tsconfig, tsc-build, ci-gate, strict-mode, github-actions]

requires:
  - phase: 14-mcp-cli-implementation
    provides: "Composite tsconfig.json (root) with strict:true and references to packages/*; per-package tsconfigs with rootDir:./src + include:[src/**/*] (the constraint that forced the new root-level escape hatch)"
  - phase: 15-test-suite
    provides: "Type-annotated callback patterns in test files (e.g., (chunk: Buffer) =>; JSON.parse(line) as { id?: unknown }) that left the codebase strict-clean once test/**/* was added to the gate scope"
  - phase: 16-02-vitest-cleanup
    provides: "Typed ChildProcess[] additions in MCP/CLI smoke tests; explicit `type ChildProcess` imports — landed under what was effectively the new gate scope before the gate was wired"

provides:
  - "Root-level tsconfig.test.json — composite:false, noEmit:true, includes packages/*/src/**/* AND packages/*/test/**/* under inherited strict mode (escapes per-package rootDir constraint)"
  - "Updated package.json build:check script — chains `tsc --build tsconfig.json && tsc --noEmit -p tsconfig.test.json` so the gate covers both source and test scopes in one command"
  - "New CI step `Strict type check (tsc --build)` in .github/workflows/ci.yml between Build and Test — fail-fast, no continue-on-error, inherits the existing 3-OS matrix"
  - "TEST-01 closed structurally: tsc --build is restored as a CI quality gate over both src and test files without weakening strict mode"

affects: [17-core-decoder-calibration, 18-packaging-polish, 19-skill-runtime-uat, 20-release-pipeline-validation]

tech-stack:
  added: []
  patterns:
    - "Pattern 1 (gate-scope escape hatch): when a composite project's per-package rootDir constraint blocks broader include patterns, add a sibling root-level tsconfig.*.json that extends the composite root but overrides composite:false + noEmit:true + rootDir:'.' — this preserves all strictness flags while widening the scope. Strict family stays inherited (verified via `tsc --showConfig`); only emit-related fields are overridden."
    - "Pattern 2 (gate verification via live-fire probe): before declaring a new type-check gate active, add a deliberate violation (untyped parameter), confirm the expected diagnostic fires (TS7006 in our case), then revert. 30 seconds of work that distinguishes 'gate is active and clean' from 'gate is silently no-op'. Done before Task 1 commit."
    - "Pattern 3 (forecast vs. evidence): when a documented forecast (D-18: ~30 implicit-any errors) doesn't materialize, trust the diagnostics over the forecast. `tsc --extendedDiagnostics` reports actual files/lines checked; `tsc --listFiles` confirms include globs activated. The advisory criterion 'must exit non-zero' encodes the forecast — the deeper invariant 'gate covers src + test under strict' is what acceptance actually requires."

key-files:
  created:
    - "tsconfig.test.json (16 lines — extends root, overrides emit-related fields, includes packages/*/{src,test}/**/*)"
  modified:
    - "package.json (line 14 build:check script extended with `&& tsc --noEmit -p tsconfig.test.json`)"
    - ".github/workflows/ci.yml (3 lines inserted between line 40 and line 42 — new Strict type check step; file 43 → 46 lines)"

key-decisions:
  - "Per the plan's Step 2.5 escalation guardrail (forecast vs. ceiling): D-18 forecast was ~30 errors, ceiling was 50. Empirical surfaced count was 0. The plan's Task 2 (annotation work) became vacuously true — no manufactured no-op commit was created. Documented as a transparent deviation with diagnostic evidence, not silently skipped."
  - "Per advisor recommendation: live-fire probe (deliberate untyped parameter → confirmed TS7006 fires → reverted) was run before Task 1 commit to prove the gate is active and not silently no-op'ing on the include glob. Diagnostic evidence captured: 394 files / 5,897 lines TS checked under full strict family per `tsc --extendedDiagnostics` and `tsc --showConfig`."
  - "Per D-Claude-3 (sweep order): not exercised because there was nothing to sweep. Had errors materialized, fix order would have been core → mcp → cli per the plan."
  - "Per D-01/D-02 (fix-if-cheap policy): not exercised — no opportunistic discoveries. Both files Phase 16 modified in plans 16-01 and 16-02 are now under the new gate, and they were strict-clean already."

patterns-established:
  - "Pattern A: Root-level tsconfig.test.json escape hatch — composite:false + noEmit:true overrides on extends-the-root. Reusable for any future scope expansion that hits the rootDir wall (e.g., adding scripts/**/*, examples/**/*)."
  - "Pattern B: CI gate insertion via additive step (no new job, no matrix changes) — preserves runtime cost (~3s tsc on 5,897 lines), inherits the 3-OS matrix, and respects D-04's fail-fast intent. New step between two existing steps with consistent indentation."

requirements-completed: [TEST-01]

duration: 5min 3sec
completed: 2026-04-27
---

# Phase 16 Plan 03: tsc Strict Gate Restoration Summary

**Restored `tsc --build` as a CI quality gate over both source and test files (TEST-01) without weakening strict mode. The naive approach of adding `test/**/*` to per-package tsconfigs was rejected because composite + rootDir:./src forbids it; the chosen escape hatch is a root-level `tsconfig.test.json` with composite:false + noEmit:true. Empirical surprise: the D-18 forecast of ~30 implicit-any errors did NOT materialize — the codebase passes the expanded gate clean (394 files / 5,897 lines TS checked). Live-fire probe confirmed the gate is active. CI step wired between Build and Test with fail-fast semantics.**

## Performance

- **Duration:** 5 min 3 sec
- **Started:** 2026-04-27T03:04:09Z
- **Completed:** 2026-04-27T03:09:12Z
- **Tasks:** 2 of 3 executed (Task 2 became vacuous — see Forecast Reconciliation below)
- **Files created:** 1
- **Files modified:** 2

## Accomplishments

- Created `tsconfig.test.json` at the repo root — extends the composite root tsconfig with `composite:false`, `noEmit:true`, `rootDir:"."`, and includes both `packages/*/src/**/*` and `packages/*/test/**/*`. Strict-mode family inherited unchanged (`noImplicitAny:true`, `strictNullChecks:true`, all -Strict flags).
- Updated `package.json` `build:check` script to chain the composite build with the new test-scope no-emit type check: `tsc --build tsconfig.json && tsc --noEmit -p tsconfig.test.json`.
- Inserted new `Strict type check (tsc --build)` step in `.github/workflows/ci.yml` between the existing Build and Test steps. Fail-fast preserved (no `continue-on-error`); 3-OS matrix unchanged.
- Live-fire probe confirmed the gate fires TS7006 on a deliberate untyped parameter (probe added → diagnostic confirmed → reverted before Task 1 commit).
- All no-bypass invariants verified clean across the production + test code: zero `as any`, zero `@ts-ignore`, zero `noImplicitAny:false`, zero `strict:false`.
- Whole test suite still green: 79 tests passed, 2 skipped (the platform-skipped tests from prior plans). `npm test` exits cleanly without Ctrl+C (Plan 16-02's reapers held).

## Task Commits

Each task was committed atomically (Task 2 had no work — see Forecast Reconciliation):

1. **Task 1: Create tsconfig.test.json and update build:check script** — `be8899c` (chore)
2. **Task 2: Fix all surfaced implicit-any errors** — *vacuous; no commit (see Forecast Reconciliation)*
3. **Task 3: Wire build:check into ci.yml as a fail-fast step** — `1547581` (ci)

**Plan metadata:** [pending — committed in final plan-close commit by sequential executor]

## Files Created/Modified

### `tsconfig.test.json` (NEW, 16 lines)

```jsonc
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "composite": false,
    "noEmit": true,
    "declaration": false,
    "declarationMap": false,
    "sourceMap": false,
    "rootDir": "."
  },
  "include": [
    "packages/*/src/**/*",
    "packages/*/test/**/*"
  ],
  "exclude": [
    "**/dist/**",
    "**/node_modules/**"
  ]
}
```

**Rationale per override:**
| Override | Purpose |
|---|---|
| `extends: "./tsconfig.json"` | Inherits `strict:true` + every -Strict family flag from the composite root (TEST-01 invariant: "without weakening strict mode"). |
| `composite: false` | Escapes the rootDir constraint that the per-package composites enforce. Without this, TS6059 fires for any file outside the per-package `rootDir:./src`. |
| `noEmit: true` | This config exists for type checking only. No `.d.ts` outputs to manage; no collision with the composite build's emit. |
| `declaration: false`, `declarationMap: false`, `sourceMap: false` | Disable artifacts not needed for a no-emit pass; some TS versions forbid declaration emission alongside `composite:false`. |
| `rootDir: "."` | Overrides the inherited `"./src"` so the include patterns can span all packages from the repo root. |
| `include: ["packages/*/src/**/*", "packages/*/test/**/*"]` | Covers source AND test files for every workspace package. |
| `exclude: ["**/dist/**", "**/node_modules/**"]` | Keeps generated `.d.ts` and dependency code out of the type-check pass. |

### `package.json` (line 14, modified)

**Before:**
```json
    "build:check": "tsc --build tsconfig.json",
```

**After:**
```json
    "build:check": "tsc --build tsconfig.json && tsc --noEmit -p tsconfig.test.json",
```

The `&&` chain runs the composite build first (which validates the per-package rootDir-bounded scope and emits `.d.ts` files that test files resolve against). On composite-build failure, the second command is skipped (POSIX `&&` semantics; same on Windows via npm's shell wrapper).

### `.github/workflows/ci.yml` (lines 39-46, +3 lines)

**Before (lines 39-43):**
```yaml
      - name: Build all workspace packages
        run: npm run build

      - name: Run test suite
        run: npm test
```

**After (lines 39-46):**
```yaml
      - name: Build all workspace packages
        run: npm run build

      - name: Strict type check (tsc --build)
        run: npm run build:check

      - name: Run test suite
        run: npm test
```

3-OS matrix at lines 22-24 unchanged. No `continue-on-error` (D-04: tsc failure must stop the job). New step runs `npm run build:check`, which is the same script developers run locally — single source of truth for the strict gate.

## Forecast Reconciliation

**The plan's D-18 forecast of ~30 implicit-any errors did NOT materialize.** Empirical surfaced count after Task 1: **0 errors**.

**Diagnostic evidence the gate is real and active (not silently no-op'ing):**

```
$ npx tsc --noEmit -p tsconfig.test.json --extendedDiagnostics
Files:                         394
Lines of TypeScript:          5897
Identifiers:                164438
Symbols:                    150311
Types:                       21400
Check time:                  1.23s
Total time:                  2.72s

$ npx tsc --noEmit -p tsconfig.test.json --listFiles | grep -cE "/test/"
16   # all 16 test files included

$ npx tsc --noEmit -p tsconfig.test.json --showConfig | head
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    ...
  }
}
```

**Live-fire probe (executed before Task 1 commit, then reverted):**

Deliberately introduced an untyped parameter in `packages/core/test/environment/platform.test.ts`:
```typescript
function _probe(x) { return x; }
_probe(1);
```

Result: `tsc --noEmit -p tsconfig.test.json` returned `error TS7006: Parameter 'x' implicitly has an 'any' type.` File reverted to original state. `npm run build:check` exits 0 again.

**Why D-18's ~30 figure didn't manifest** (most likely root causes):
1. Test files in `packages/*/test/**/*` were already using the typed callback patterns PATTERNS.md cites as analogs (`(chunk: Buffer) =>`, `JSON.parse(line) as { id?: unknown }`).
2. Phase 16-02 added explicit `type ChildProcess` imports and `let children: ChildProcess[] = []` typings to MCP and CLI smoke tests as part of TEST-02 cleanup — landed under what was effectively the new gate scope before the gate was wired.
3. `packages/*/src/**/*` was already typed clean under the existing `tsc --build` (which had `include:["src/**/*"]` per package). The D-18 forecast was made when src + test were jointly imagined under a strict gate; once each landed independently typed, the union surfaced no new errors.

**Why this is documented as a deviation, not a failure:**
The plan's Task 1 acceptance criterion `Running 'npm run build:check' surfaces a non-zero exit code` encoded the D-18 forecast as a hard requirement. The deeper invariant — "gate covers both src and test under strict mode" — is satisfied empirically (394 files / 5,897 lines / full strict family / live-fire probe confirms TS7006 fires). Task 2 ("fix all surfaced errors") becomes vacuously true at zero errors; no manufactured no-op commit was created. The plan's own Step 2.6 says "If any error remains, the plan is not done" — the contrapositive holds: at zero errors, the strict-gate work is complete.

## Verification

### Local pre-CI verification

```bash
$ npm run build:check
> tsc --build tsconfig.json && tsc --noEmit -p tsconfig.test.json
EXIT: 0

$ npm test
Test Files  16 passed (16)
     Tests  79 passed | 2 skipped (81)
  Duration  6.56s
EXIT: 0
```

Both green from repo root. No Ctrl+C needed (16-02 reapers held).

### Strict-mode invariant gate

```bash
$ grep -E '"(strict|noImplicitAny)":\s*false' tsconfig.json tsconfig.test.json packages/*/tsconfig.json
# Zero matches — no strictness loosening anywhere.
```

### No-bypass invariant gate

```bash
$ grep -rn "as any" packages/core/src packages/core/test packages/mcp/src packages/mcp/test packages/cli/src packages/cli/test --include='*.ts' | grep -v '^[[:space:]]*//' | wc -l
0

$ grep -rn "@ts-ignore" packages --include='*.ts' | wc -l
0

$ grep -rn "noImplicitAny.*false" packages --include='*.json' | wc -l
0

$ grep -c '"strict": true' tsconfig.json
1
```

All zero / one. No `as any` introduced; no `@ts-ignore`; no per-file strictness loosening; root strict flag preserved.

### CI step ordering gate

```bash
$ awk '/Build all workspace packages/{a=NR} /Strict type check/{b=NR} /Run test suite/{c=NR} END{print (a < b && b < c) ? "ok" : "fail"}' .github/workflows/ci.yml
ok
```

Build → Strict type check → Run test suite confirmed.

### CI step structural gates

| Pattern | Required | Actual |
|---|---|---|
| `Strict type check (tsc --build)` | =1 | 1 |
| `npm run build:check` | =1 | 1 |
| `Build all workspace packages` | =1 | 1 |
| `Run test suite` | =1 | 1 |
| `continue-on-error` | =0 | 0 |
| `windows-latest, macos-latest, ubuntu-latest` | =1 | 1 |
| Total file line count | =46 | 46 |

### YAML syntax gate

```bash
$ python -c "import yaml; doc = yaml.safe_load(open('.github/workflows/ci.yml')); print('YAML OK; jobs:', list(doc['jobs'].keys()))"
YAML OK; jobs: ['test']
```

(`js-yaml` is not installed locally; Python's `yaml` package validated the file. `action-validator` was attempted but the npx wrapper failed to resolve on Windows — Python fallback covers the syntactic gate the plan required.)

### Per-package tsconfig untouched

```bash
$ git diff packages/core/tsconfig.json packages/mcp/tsconfig.json packages/cli/tsconfig.json | wc -l
0
```

No per-package tsconfig modified — composite + rootDir:./src + include:[src/**/*] preserved verbatim.

## Decisions Made

None requiring user input. All decisions exercised in this plan were already locked in CONTEXT.md (D-03, D-04, D-Claude-2, D-Claude-3) or made by the advisor / planner before execution started. Two empirical decisions documented above:
- Skipped Task 2 because the surfaced error count was 0 (vacuous; no manufactured no-op commit).
- Used Python's `yaml` package as the YAML syntax gate fallback when `js-yaml` and `action-validator` weren't locally available on Windows.

## Deviations from Plan

**1. [Documented Deviation — Forecast vs. Evidence] Task 2 vacuous; D-18 forecast did not materialize.**

- **Found during:** Task 1 verification (`npm run build:check` after creating tsconfig.test.json + updating script)
- **Issue:** Plan Task 2's behavior block ("After: every surfaced error is fixed") presumes a non-zero starting error count. Plan Task 1 acceptance criteria includes "Running `npm run build:check` surfaces a non-zero exit code" as a positive gate.
- **Empirical reality:** Surfaced count is 0. The gate IS active and IS covering 16 test files + all source files under full strict mode (verified via `tsc --extendedDiagnostics`, `tsc --listFiles`, `tsc --showConfig`, and a live-fire probe that confirmed TS7006 fires on a deliberate untyped parameter).
- **Decision:** Task 2 was skipped — no annotation work was needed and no manufactured no-op commit was created. The plan's deeper invariant ("tsc --build covers src + test under strict mode without weakening strict") is satisfied empirically.
- **Files modified:** None (no annotation work).
- **Commit:** None.
- **Risk:** Future contributors might wonder "why is there no Task 2 commit?" — this deviation section + the Forecast Reconciliation section above are the durable record. The CI gate landing in Task 3 will catch any future regression that introduces an implicit any (the live-fire probe proved this).

**2. [Tool Substitution] action-validator unavailable; used Python yaml as YAML syntax fallback.**

- **Found during:** Task 3 verification.
- **Issue:** The plan's acceptance criteria mention `npx --yes -p @action-validator/core@^0.6.0 action-validator` as the YAML+schema validation step, with `js-yaml` as an alternative fallback for syntactic-only validation.
- **Local environment:** `action-validator` failed silently on Windows (npx wrapper couldn't resolve the binary); `js-yaml` not installed in the workspace.
- **Resolution:** Used Python's `yaml.safe_load()` as the equivalent syntactic gate — same effect as the js-yaml fallback the plan documented. YAML parsed cleanly and the `jobs` key resolved as expected.
- **Files modified:** None.
- **Commit:** None.

## Issues Encountered

None blocking. The build:check command's first half (`tsc --build tsconfig.json`) requires the per-package `dist/` outputs to be fresh-ish for module resolution, but it's a tsc-driven incremental build and re-runs as needed. Confirmed by running `npm run build` once manually before invoking build:check during Task 1 verification — npm's pretest lifecycle hook on `npm test` handles this automatically in CI.

## User Setup Required

None — no external service configuration required. The CI step will activate on the first push to the branch under PR review (Phase 20 / PIPE-01 covers the master-first-run validation).

## Next Phase Readiness

- **Phase 17 (Core Decoder Calibration):** Ready. CORE-13/CORE-14 regex calibration work will land under the hardened typing gate — any regex-related type changes will surface immediately if implicit-any creeps in. The `--listFiles` evidence confirms `packages/core/src/environment/decode.ts` and related files are in scope.
- **Phase 18 (Packaging Polish):** Ready. PKG-01/PKG-02 work touches package.json + per-package package.json + tsup config + READMEs, none of which the new gate covers. Independent of this plan's gates.
- **Phase 19 (Skill Runtime UAT):** Ready. UAT-01..05 exercises the live MCP server + CLI; this plan's strict gate runs in CI on every push, so any UAT-driven code change would be gated before reaching the test runner.
- **Phase 20 (Release Pipeline Validation):** PIPE-01 explicitly validates the first green CI run on master after this commit cycle — the strict gate is one of the things PIPE-01 confirms. PIPE-02 covers the OIDC + provenance run on tag push (independent of this plan).
- **No blockers.** Strict gate landed clean, codebase strict-clean under expanded scope, CI step ready for first push.

## Threat Flags

No new security-relevant surface introduced. The threat register's mitigations (T-16-03-01..06) all hold:

- **T-16-03-01 (strict-mode bypass via tsconfig.test.json):** Mitigated. Acceptance grep verified zero `"strict":false` and zero `"noImplicitAny":false` matches across all relevant config files. The new tsconfig.test.json only overrides `composite/noEmit/declaration/sourceMap/rootDir` — never strict-family flags. Verified empirically via `tsc --showConfig`.
- **T-16-03-02 (type-error suppression via `as any` or `@ts-ignore`):** Mitigated. Grep across all production + test `.ts` files: zero `as any`, zero `@ts-ignore`. No new files added these patterns.
- **T-16-03-03 (CI gate bypass via test-only edits):** Mitigated. `tsconfig.test.json` includes `packages/*/test/**/*` (verified via `tsc --listFiles` showing all 16 test files). A future PR adding `as any` to a test file will be caught.
- **T-16-03-04 (CI runtime regression):** Accepted. `tsc --build` on 5,897 lines completes in ~3 seconds per `tsc --extendedDiagnostics`. D-04's runtime trade-off held.
- **T-16-03-05 (silent error suppression by future contributors):** Mitigated structurally. The CI step has no `continue-on-error`; future violations will produce red CI checks. PIPE-01 (Phase 20) validates the first green run on master.
- **T-16-03-06 (spawn discipline regression in fixes):** Mitigated by virtue of zero fixes — no spawn calls were touched in this plan.

## Self-Check: PASSED

- [x] `tsconfig.test.json` exists at repo root with composite:false + noEmit:true + packages/*/test/**/* (verified via Read tool — 16 lines, content matches plan spec).
- [x] `package.json` build:check script exactly matches `tsc --build tsconfig.json && tsc --noEmit -p tsconfig.test.json` (verified via `node -e "console.log(require('./package.json').scripts['build:check'])"`).
- [x] `.github/workflows/ci.yml` contains the new step with correct ordering Build → Strict type check → Test (verified via grep + awk ordering check).
- [x] No per-package tsconfig modified (verified via `git diff` returning 0 lines).
- [x] No `as any`, no `@ts-ignore`, no `noImplicitAny:false` introduced (verified via grep — all zero).
- [x] `npm run build:check` exits 0 from repo root (verified — second post-Task 3 run).
- [x] `npm test` exits 0 from repo root with 79 passed / 2 skipped (verified — no Ctrl+C needed).
- [x] Commit `be8899c` exists in `git log --oneline` (Task 1 — verified).
- [x] Commit `1547581` exists in `git log --oneline` (Task 3 — verified).
- [x] No deletions in either commit (verified via `git diff --diff-filter=D --name-only HEAD~2 HEAD` — empty output).
- [x] Live-fire probe documented in Forecast Reconciliation (deliberate untyped parameter → TS7006 fires → reverted, all before Task 1 commit).
- [x] Whole suite green: 16 test files, 79 tests passed, 2 skipped, exit 0.

---
*Phase: 16-test-infrastructure-hardening*
*Completed: 2026-04-27*
