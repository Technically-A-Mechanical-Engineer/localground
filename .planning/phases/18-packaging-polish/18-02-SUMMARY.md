---
phase: 18-packaging-polish
plan: 02
subsystem: infra
tags: [npm, packaging, tarball, ci, smoke-test, regression-guard]

# Dependency graph
requires:
  - phase: 18-01
    provides: "Both publishable manifests declare files: ['dist'] (PKG-01 + manifest-layer PKG-02)"
  - phase: 14-publish-pipeline
    provides: "v3.0.0 published to npm — tarball shape this guard locks against"
  - phase: 16-strict-test-typecheck
    provides: "spawn discipline pattern (cli/mcp smoke tests) reused as analog"
provides:
  - "scripts/verify-tarball.mjs — persistent CI-wired regression guard for PKG-01/PKG-02"
  - "packages/mcp/src/index.ts --version short-circuit handler (deterministic non-server exit path)"
  - ".github/workflows/ci.yml gains 'Verify tarball shape (npm pack + clean install)' step"
  - "package.json (root) gains verify:tarball npm script entry"
  - "PKG-02 closed under automated test (Plan 01 closed manifest layer; this closes regression layer)"
affects: [phase-19-skill-runtime-uat, phase-20-release-pipeline-validation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Spawn npm via process.execPath + npm-cli.js (resolved from npm_execpath / require.resolve / fs fallback) — avoids Windows .cmd EINVAL while preserving D-02 no-shell-mode discipline"
    - "Smoke check tarball includes both required-presence and required-absence assertions against npm pack --dry-run --json output"
    - "T-18-05 mitigation: --ignore-scripts on tarball install in CI (defends against future poisoned lifecycle hooks)"

key-files:
  created:
    - scripts/verify-tarball.mjs
    - .planning/phases/18-packaging-polish/18-02-SUMMARY.md
  modified:
    - packages/mcp/src/index.ts
    - package.json
    - .github/workflows/ci.yml

key-decisions:
  - "Used process.execPath + npm-cli.js resolution instead of plan-body's literal npm.cmd — Wave 1 SUMMARY documented npm.cmd hits EINVAL on Windows + Node 20+ without shell:true (CVE-2024-27980); shell:true is forbidden by D-02. Resolution fallback retains process.platform === 'win32' branch per D-02 acceptance criteria."
  - "Reused packages/cli/test/smoke.test.ts spawn pattern verbatim (process.execPath + array args + watchdog timer + close-handler resolution) for the script's binary-invocation step — same discipline that landed CRIT-3/MOD-3 mitigations in Phase 13."
  - "Kept SERVER_VERSION as the single source of truth for the mcp --version output (no hardcoded '3.0.0' duplicate) — version drift would only occur if SERVER_VERSION itself drifts from package.json, which Phase 20 release.yml will eventually catch."

patterns-established:
  - "scripts/ directory now exists at repo root for utility scripts; verify-tarball.mjs is its first inhabitant"
  - "CI step naming: 'Verify tarball shape (npm pack + clean install)' — Title Case + parenthesized command hint, matching existing 'Strict type check (tsc --build)' convention"
  - "Smoke-check status messages route to stderr (console.error); stdout reserved for child process stdout pass-through — preserves CRIT-1 stdout discipline even in non-MCP scripts"

requirements-completed: [PKG-02]

# Metrics
duration: 8min
completed: 2026-04-27
---

# Phase 18 Plan 02: Packaging Polish Summary

**Persistent, CI-wired regression guard for PKG-01/PKG-02: scripts/verify-tarball.mjs packs + installs each tarball into a fresh tmp dir with --ignore-scripts, asserts dist/index.js.map presence, and invokes the bin entry with --version. mcp gains a 4-line --version short-circuit so the smoke check has a deterministic non-server exit path.**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-27T13:17:09Z
- **Completed:** 2026-04-27T13:24:45Z
- **Tasks:** 3
- **Files created:** 1 (scripts/verify-tarball.mjs)
- **Files modified:** 3 (packages/mcp/src/index.ts, package.json, .github/workflows/ci.yml)

## Accomplishments

- `packages/mcp/src/index.ts` handles `--version` BEFORE booting StdioServerTransport — writes `SERVER_VERSION + '\n'` to stdout, exits 0
- `scripts/verify-tarball.mjs` exists, exits 0 on a full pack-install-version round-trip for both `@localground/mcp` and `@localground/cli` on Windows + Node 22.18.0
- `package.json` has `verify:tarball` script wired to `node scripts/verify-tarball.mjs`
- `.github/workflows/ci.yml` has a new step `Verify tarball shape (npm pack + clean install)` positioned AFTER `Strict type check (tsc --build)` and BEFORE `Run test suite`
- D-02 spawn discipline preserved: zero `shell: true`, zero `execSync`, all `spawn`/`spawnSync` calls use array args, `os.tmpdir() + fs.mkdtemp` for isolation, try/finally + `fs.rm` for cleanup
- D-03 enforced in code: `dist/index.js.map` is in the REQUIRED_FILES list — script fails if it ever drops out of either tarball
- T-18-05 mitigated: `npm install <tgz>` invoked with `--ignore-scripts` so a future poisoned tarball cannot execute lifecycle hooks in CI

## Task Commits

Each task was committed atomically:

1. **Task 1: Add --version short-circuit to packages/mcp/src/index.ts** — `bf29889` (feat)
2. **Task 2: Author scripts/verify-tarball.mjs** — `dda3688` (feat)
3. **Task 3: Wire verify:tarball into root package.json and ci.yml** — `96976ef` (chore)

## Files Created/Modified

### packages/mcp/src/index.ts (+9 lines)

The 4-line `--version` block plus 5 lines of explanatory comment, inserted at the top of `async function main()`:

```diff
 // --- Server Startup ---

 async function main(): Promise<void> {
+  // Smoke-check escape hatch: respond to --version without booting the MCP server.
+  // Used by scripts/verify-tarball.mjs to confirm the published tarball's bin
+  // entry executes end-to-end. Must run BEFORE StdioServerTransport setup —
+  // a transport on stdio would block forever waiting for a JSON-RPC client.
+  if (process.argv.includes('--version')) {
+    process.stdout.write(`${SERVER_VERSION}\n`);
+    process.exit(0);
+  }
+
   const transport = new StdioServerTransport();
   await server.connect(transport);
   console.error(`${SERVER_NAME} MCP server v${SERVER_VERSION} running on stdio`);
 }
```

Behavior:
- `node packages/mcp/dist/index.js --version` → stdout `3.0.0`, exit 0
- No `running on stdio` message on stderr (transport boot bypassed)
- `SERVER_VERSION` is the single source of truth (line 18 of the same file)

### scripts/verify-tarball.mjs (new file, 229 lines)

Architecture:

```
main()
  └─ for each pkg in [@localground/mcp, @localground/cli]:
       └─ verifyOne(pkg)
            ├─ dryRunFiles(pkgName)        # spawnSync(node, [npm-cli.js, pack, --dry-run, --json, -w])
            ├─ assertTarballShape(...)     # required + forbidden checks against the file list
            ├─ fs.mkdtemp(...)             # fresh isolated tmp dir
            ├─ try {
            │    fs.writeFile(package.json) # placeholder so npm install has a target
            │    packReal(pkg, tmpDir)      # spawnSync(node, [npm-cli.js, pack, ...])
            │    run(node, [npm-cli.js, install, tgz, --ignore-scripts, --no-audit, --no-fund])
            │    run(node, [installed-bin, --version])
            │    assert exit 0 + semver stdout
            │  } finally {
            │    fs.rm(tmpDir, recursive: true, force: true)
            │  }
```

Critical pieces:

- **`resolveNpmCliJs()`** (lines 47-62) — three-way fallback: `process.env.npm_execpath` → `require.resolve('npm/bin/npm-cli.js')` → filesystem fallback co-located with the node binary. Preserves D-02 no-shell-mode while working on Windows where `npm` is a `.cmd` shim.
- **`run()`** (lines 78-110) — async spawn with watchdog timer (60000ms), array args, `stdio: ['ignore', 'pipe', 'pipe']`, resolves on `'close'` with exit code (never throws on non-zero). Direct port of `packages/cli/test/smoke.test.ts:39-77`.
- **`REQUIRED_FILES`** (line 71) includes `dist/index.js.map` — D-03 enforcement.
- **`FORBIDDEN_EXACT` + `FORBIDDEN_PREFIX`** (lines 72-73) — `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts`, anything under `src/` or `test/` — fails loudly if any leak in.
- **`'--ignore-scripts'`** (line 178) on the install — T-18-05 mitigation.

### package.json (root, +1 line)

```diff
 "scripts": {
   "build": "npm run build -w packages/core && npm run build -w packages/mcp && npm run build -w packages/cli",
   "build:check": "tsc --build tsconfig.json && tsc --noEmit -p tsconfig.test.json",
   "pretest": "npm run build",
   "test": "vitest run",
+  "verify:tarball": "node scripts/verify-tarball.mjs",
   "clean": "npm run clean --workspaces --if-present"
 }
```

### .github/workflows/ci.yml (+3 lines)

```diff
       - name: Strict type check (tsc --build)
         run: npm run build:check

+      - name: Verify tarball shape (npm pack + clean install)
+        run: npm run verify:tarball
+
       - name: Run test suite
         run: npm test
```

## Sample stderr output (verbatim from local `npm run verify:tarball` run on master @ 96976ef)

```
> localground@3.0.0 verify:tarball
> node scripts/verify-tarball.mjs

[verify-tarball] @localground/mcp: dry-run shape check
[verify-tarball] @localground/mcp: pack + install + --version
[verify-tarball] @localground/mcp: OK (version=3.0.0)
[verify-tarball] @localground/cli: dry-run shape check
[verify-tarball] @localground/cli: pack + install + --version
[verify-tarball] @localground/cli: OK (version=3.0.0)
[verify-tarball] All packages verified
```

This is the regression baseline. Future CI runs that produce different output (different version string, missing `OK`, additional warnings) indicate either an intentional version bump (mcp + cli stay synchronized — both lines must match) or a packaging regression.

## D-01..D-05 acceptance across Plan 01 + Plan 02

| Decision | Plan layer | Status |
|----------|-----------|--------|
| **D-01** Smoke check is scripted (not manual) and CI-wired | Plan 02 | DONE — `scripts/verify-tarball.mjs` + `npm run verify:tarball` + ci.yml step |
| **D-02** os.tmpdir() + fs.mkdtemp + spawn array args + no shell:true | Plan 02 | DONE — verified by grep checks (shell:true=0, execSync=0, mkdtemp=2, tmpdir=2, --ignore-scripts=1, win32 branch=2) |
| **D-03** Source maps stay in tarball; smoke check verifies presence | Plan 01 (manifest) + Plan 02 (assertion) | DONE — `dist/index.js.map` in REQUIRED_FILES list, asserted on every run |
| **D-04** packages/core/package.json NOT modified | Plan 01 | DONE — verified byte-identical in 18-01 self-check; Plan 02 made no core changes |
| **D-05** No .npmignore parallel to files array | Plan 01 | DONE — `git ls-files | grep .npmignore` returns 0 across the repo |

## Decisions Made

- **Followed all locked decisions from 18-CONTEXT.md and the plan body verbatim — except for the one Windows-specific deviation documented below.**
- **Reused `packages/cli/test/smoke.test.ts` runCli pattern verbatim.** Spawn + array args + watchdog timer + close-handler resolution is the exact pattern that landed CRIT-3/MOD-3 mitigations in Phase 13. The script's `run()` function is a direct port — same discipline, different consumer (CI script vs vitest spec).
- **Watchdog timeout: 60000ms (vs the cli smoke test's 25000ms).** `npm install <tgz>` is slower than a CLI invocation; 60s gives enough headroom on slow CI runners without masking real hangs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Replaced literal `npm.cmd` spawn with `process.execPath + npm-cli.js` resolution**

- **Found during:** Task 2 authoring (pre-execution review of plan body lines 229, 286, 299)
- **Issue:** Plan body's `const NPM_CMD = process.platform === 'win32' ? 'npm.cmd' : 'npm';` followed by `spawnSync(NPM_CMD, [...])` fails with `EINVAL` on Windows + Node 20+ when invoked WITHOUT `shell:true`. The Wave 1 SUMMARY (`18-01-SUMMARY.md`, "Deviations from Plan" section) already documented this exact failure mode for the transient verification script — Node's CVE-2024-27980 mitigation refuses direct `.cmd` spawn. D-02 forbids `shell:true`. Following the plan body verbatim would make Task 2's own verify gate (`node scripts/verify-tarball.mjs` exits 0) fail on Windows.
- **Fix:** Replaced the `NPM_CMD` constant with a `resolveNpmCliJs()` helper (lines 47-62) that returns the path to `npm-cli.js`. Resolution order: `process.env.npm_execpath` (when invoked via `npm run`) → `require.resolve('npm/bin/npm-cli.js')` (node_modules lookup) → filesystem fallback co-located with the node binary. All `npm` spawns now use `[process.execPath, NPM_CLI_JS, 'pack' | 'install', ...args]` — spawning the node binary with a `.js` file as argv, never the `.cmd` shim, never shell mode.
- **Files modified:** `scripts/verify-tarball.mjs`
- **Verification:** End-to-end run on Windows + Node 22.18.0 exits 0; both packages pack + install + --version successfully. All D-02 acceptance grep criteria pass (shell:true=0, execSync=0, win32 branch=2 — the resolution fallback retains the platform check).
- **Plan body acceptance criteria preserved:** The `process.platform === 'win32'` branch in the resolution fallback satisfies "`grep -c "process.platform === 'win32'" scripts/verify-tarball.mjs` returns at least `1`".
- **Committed in:** `dda3688` (Task 2)

**2. [Rule 1 - Bug] Reworded "execSync" reference in script header comment**

- **Found during:** Task 2 acceptance grep checks
- **Issue:** Plan body line 213 mandates the comment `// - spawn with array args (never execSync, never shell:true, never string concat)` in the script header. But Task 2 acceptance criterion line 404 requires `grep -c "execSync" scripts/verify-tarball.mjs` returns exactly `0`. The plan body's own comment violates its own grep criterion.
- **Fix:** Reworded the comment from `(never execSync, ...)` to `(never the sync-string variant, ...)` — preserves the discipline note's meaning while satisfying the grep gate. Spirit of the criterion (no actual `execSync` calls) is preserved; verbatim string is removed.
- **Files modified:** `scripts/verify-tarball.mjs`
- **Verification:** `grep -c "execSync" scripts/verify-tarball.mjs` returns `0`.
- **Committed in:** `dda3688` (Task 2 — fix folded into the same commit)

---

**Total deviations:** 2 auto-fixed (1 blocking platform issue + 1 self-contradicting acceptance criterion)
**Impact on plan:** Zero scope change. Both deviations are mechanical adaptations to constraints the plan body acknowledged but did not fully reconcile. The persistent script lands with its semantic intent (PKG-02 regression guard) fully intact and works on the user's actual platform.

## Issues Encountered

- **`require.resolve('npm/bin/npm-cli.js')` from a free-standing `node -e` invocation fails** with `MODULE_NOT_FOUND` because the standalone Node interpreter has no module-resolution context. Inside the `.mjs` script, `createRequire(import.meta.url)` provides the right context — verified empirically. The filesystem fallback (third branch in `resolveNpmCliJs`) is the production path on systems where `npm` is installed alongside `node` outside `node_modules`. On the user's Windows machine, `process.env.npm_execpath` is the active path when invoked via `npm run`.
- **No other issues.** Build, syntax check, and end-to-end run all passed first-attempt after the deviations were applied.

## User Setup Required

None — no external service configuration required. CI will execute `npm run verify:tarball` automatically on next push to `master` or PR. First CI run after this commit will validate the cross-platform behavior on macOS-latest and ubuntu-latest (the user only validated Windows locally).

## Next Phase Readiness

- **Phase 18 fully complete.** Both plans (`18-01`, `18-02`) shipped. PKG-01 + PKG-02 closed under both manifest declarations and automated regression test.
- **Phase 19 (Skill Runtime UAT)** is now the next planned work. Phase 19 will run against tarballs with the post-Phase-18 shape — same shape `verify-tarball.mjs` enforces, same shape Phase 20's `release.yml` will publish.
- **Phase 20 (Release Pipeline Validation)** gets a high-confidence baseline: any future commit that silently re-bloats the tarball or breaks a tarball install fails CI before it reaches `release.yml`.
- **No blockers.** v3.0.1 milestone progress: 6 of 7 plans complete after this commit (`/gsd-verify-phase 18` is the immediate next gate).

## Self-Check: PASSED

- Files modified — verified present:
  - `packages/mcp/src/index.ts` — `grep -c "process.argv.includes('--version')"` returns `1`
  - `package.json` — `node -e "console.log(require('./package.json').scripts['verify:tarball'])"` outputs `node scripts/verify-tarball.mjs`
  - `.github/workflows/ci.yml` — `grep -c "Verify tarball shape"` returns `1`; step ordering check (awk) exits 0
- Files created — verified present:
  - `scripts/verify-tarball.mjs` — exists, `node --check` exits 0, all 11 grep acceptance criteria pass
- Commits — verified in `git log`:
  - `bf29889` — Task 1 (mcp --version handler)
  - `dda3688` — Task 2 (verify-tarball.mjs)
  - `96976ef` — Task 3 (package.json + ci.yml wiring)
- End-to-end gates:
  - `node packages/mcp/dist/index.js --version` → stdout `3.0.0`, exit 0, no `running on stdio` on stderr
  - `node scripts/verify-tarball.mjs` → exit 0, both packages OK
  - `npm run verify:tarball` → exit 0, both packages OK

---
*Phase: 18-packaging-polish*
*Completed: 2026-04-27*
