---
phase: 18-packaging-polish
reviewed: 2026-04-27T15:30:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - packages/mcp/package.json
  - packages/cli/package.json
  - packages/mcp/src/index.ts
  - scripts/verify-tarball.mjs
  - package.json
  - .github/workflows/ci.yml
findings:
  critical: 0
  warning: 2
  info: 1
  total: 3
status: issues_found
---

# Phase 18: Code Review Report

**Reviewed:** 2026-04-27T15:30:00Z
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Phase 18 (Packaging Polish) lands the documented changes correctly:

- `packages/mcp/package.json` and `packages/cli/package.json` both declare `"files": ["dist"]` — bundle invariant preserved, `@localground/core` remains in `devDependencies` (NOT inverted to `dependencies`) per `feedback_monorepo_bundled_deps.md`.
- `packages/mcp/src/index.ts` short-circuits on `--version` at line 833, BEFORE `new StdioServerTransport()` at line 838. Single `process.stdout.write` exit path; CRIT-1 stdout discipline preserved when `--version` is NOT passed.
- `scripts/verify-tarball.mjs` enforces D-02 spawn discipline (zero `shell: true`, zero `execSync`, all `spawn`/`spawnSync` calls use array args), passes `--ignore-scripts` on `npm install <tgz>` (T-18-05 mitigation), uses `os.tmpdir()` + `fs.mkdtemp` for isolation, and wraps work in try/finally for tmp-dir cleanup.
- `.github/workflows/ci.yml` step ordering is correct: smoke check sits AFTER `Build all workspace packages` + `Strict type check (tsc --build)`, BEFORE `Run test suite`.
- `package.json` (root) wires `verify:tarball` to `node scripts/verify-tarball.mjs`.

The check items called out for explicit attention all pass. However, two real CI-reliability defects exist in the smoke-check script: tmp-dir cleanup can mask a successful run as failed on Windows, and `spawnSync` calls lack the timeout watchdog that `run()` has — both are realistic CI flake vectors.

No security vulnerabilities, no path-traversal risks, no consumer-facing breakage.

## Warnings

### WR-01: `fs.rm` cleanup will throw on Windows tmp lock errors, masking successful smoke checks as CI failures

**File:** `scripts/verify-tarball.mjs:215`
**Issue:** The cleanup in `verifyOne`'s `finally` block is:
```js
await fs.rm(tmpDir, { recursive: true, force: true });
```

`force: true` ONLY suppresses `ENOENT` (per Node fs docs). It does NOT retry on `EBUSY`, `EPERM`, `EMFILE`, `ENFILE`, or `ENOTEMPTY` — which are exactly the errors you hit on Windows when `npm install <tgz>` has just populated `node_modules/` with thousands of files and the OS has not yet released file handles. The default `maxRetries: 0` means a single transient lock turns a green smoke check (both packages verified, `[verify-tarball] All packages verified` already printed via `console.error` inside the try block) into a red CI run because the unhandled `fs.rm` rejection propagates through `verifyOne` → `main().catch` → `process.exit(1)`.

The local Windows run captured in `18-02-SUMMARY.md` happened to succeed, but Windows runners under GitHub Actions exhibit higher tmp-dir contention than a developer machine. This is a real CI flake vector before Phase 20's release pipeline depends on this guard.

**Fix:** Add retry options to the `fs.rm` call so cleanup survives transient Windows locks:
```js
} finally {
  await fs.rm(tmpDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
```
Per Node docs, this retries on `EBUSY`/`EMFILE`/`ENFILE`/`ENOTEMPTY`/`EPERM` with linear backoff. Five retries at 200ms each gives ~1.5s of grace — enough for npm's post-install handles to release without slowing the happy path.

### WR-02: `spawnSync` calls in `dryRunFiles` and `packReal` have no timeout, allowing indefinite hang

**File:** `scripts/verify-tarball.mjs:119, 132`
**Issue:** Asymmetric watchdog discipline. `run()` (lines 79-115) has a 60000ms `setTimeout` watchdog that calls `child.kill()` and rejects on timeout. But the two `spawnSync` callers — `dryRunFiles` (line 119) for `npm pack --dry-run --json`, and `packReal` (line 132) for `npm pack --pack-destination` — have no `timeout` in their options object. If `npm pack` ever hangs (npm registry resolver stall, slow Windows AV scan of the tarball under construction, network outage on a future workspace that adds remote deps), the script hangs until GitHub Actions hits the job-level timeout (default 360 minutes) instead of failing fast with a useful error.

This is the same defect class WR-01 mitigates for the cleanup path — and the same `cli`/`mcp` smoke-test pattern Phase 13 already adopted treats spawn-without-timeout as a reliability bug.

**Fix:** Pass `timeout: 60000` (matching `SPAWN_TIMEOUT_MS`) to both `spawnSync` opts:
```js
// line 119:
const r = spawnSync(process.execPath, [NPM_CLI_JS, 'pack', '--dry-run', '--json', '-w', pkgName], {
  cwd: REPO_ROOT,
  encoding: 'utf8',
  timeout: SPAWN_TIMEOUT_MS,
});

// line 132:
const r = spawnSync(
  process.execPath,
  [NPM_CLI_JS, 'pack', '--pack-destination', outDir, '-w', pkgName, '--json'],
  { cwd: REPO_ROOT, encoding: 'utf8', timeout: SPAWN_TIMEOUT_MS },
);
```

When `spawnSync` times out, `r.status` becomes `null` and `r.error` is set with `code: 'ETIMEDOUT'`. The existing `if (r.status !== 0)` check in both functions correctly catches the timeout case (since `null !== 0`), but the error message would be cryptic. For a sharper message, optionally branch:
```js
if (r.error?.code === 'ETIMEDOUT') {
  throw new Error(`npm pack timed out (${SPAWN_TIMEOUT_MS}ms) for ${pkgName}`);
}
if (r.status !== 0) { /* existing branch */ }
```

## Info

### NF-01: `dryRunFiles` JSON-shape assumption is unguarded

**File:** `scripts/verify-tarball.mjs:127`
**Issue:** `dryRunFiles` returns `parsed[0].files.map((f) => f.path)`. If a future npm version (or an edge case like packing a workspace with no files) ever emits a non-array root, an empty array, or an entry without a `files` property, the access throws `Cannot read properties of undefined (reading 'files')` or similar — caught only by the top-level `main().catch`, producing a cryptic error message in CI logs.

This is unlikely in practice (npm pack --json shape is stable as of npm 10.x) but adds friction when something does go wrong.

**Fix:** Add a shape guard before the access:
```js
if (!Array.isArray(parsed) || !parsed[0] || !Array.isArray(parsed[0].files)) {
  throw new Error(`npm pack --dry-run --json returned unexpected shape for ${pkgName}: ${r.stdout.slice(0, 200)}`);
}
return parsed[0].files.map((f) => f.path);
```

Same guard applies to `packReal` line 142 (`parsed[0].filename`).

---

_Reviewed: 2026-04-27T15:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
