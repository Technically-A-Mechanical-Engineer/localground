---
phase: 18
fixed_at: 2026-04-27T16:45:00Z
review_path: .planning/phases/18-packaging-polish/18-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 18: Code Review Fix Report

**Fixed at:** 2026-04-27T16:45:00Z
**Source review:** `.planning/phases/18-packaging-polish/18-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 2 (WR-01, WR-02 — `critical_warning` scope)
- Fixed: 2
- Skipped: 0

NF-01 (info-level) intentionally out of scope; deferred to backlog if needed.

## Fixed Issues

### WR-01: `fs.rm` cleanup will throw on Windows tmp lock errors, masking successful smoke checks as CI failures

**Files modified:** `scripts/verify-tarball.mjs`
**Commit:** `aec6584`
**Applied fix:** Added `maxRetries: 5, retryDelay: 200` to the `fs.rm` options object at line 215. Cleanup now retries on Windows tmp-dir lock errors (`EBUSY`/`EPERM`/`EMFILE`/`ENFILE`/`ENOTEMPTY`) with linear backoff (~1.5s grace), so transient locks after `npm install <tgz>` no longer mask a successful smoke check as a CI failure.

### WR-02: `spawnSync` calls in `dryRunFiles` and `packReal` have no timeout, allowing indefinite hang

**Files modified:** `scripts/verify-tarball.mjs`
**Commit:** `b99f8e6`
**Applied fix:** Added `timeout: SPAWN_TIMEOUT_MS` (60000 ms) to both `spawnSync` option objects (lines 119 and 132). A hung `npm pack` now fails fast instead of burning the GitHub Actions job-level 360-minute timeout. The existing `if (r.status !== 0)` check correctly catches the timeout case (`r.status` becomes `null` on timeout). Skipped the optional `ETIMEDOUT` error-branching suggested in the review — the review explicitly labelled it optional, and scope fidelity prefers the minimum durable fix.

## Skipped Issues

None.

## Post-Fix Verification

End-to-end run:
```
$ npm run verify:tarball
[verify-tarball] @localground/mcp: dry-run shape check
[verify-tarball] @localground/mcp: pack + install + --version
[verify-tarball] @localground/mcp: OK (version=3.0.0)
[verify-tarball] @localground/cli: dry-run shape check
[verify-tarball] @localground/cli: pack + install + --version
[verify-tarball] @localground/cli: OK (version=3.0.0)
[verify-tarball] All packages verified
```

Both packages pass dry-run shape, real pack, install (`--ignore-scripts`), and `--version` exit-zero check. The retried `fs.rm` completed cleanly without raising. The `spawnSync` timeout did not trip on the happy path.

**D-02 spawn discipline preserved:** zero `shell: true`, zero `execSync`, all spawn calls use array args. The Windows-aware `process.platform === 'win32'` branch in `resolveNpmCliJs` is unchanged.

**Tier 1 + Tier 2 verification per fix:**
- Tier 1 — re-read modified region after each Edit; confirmed fix text present and surrounding code intact.
- Tier 2 — `node -c scripts/verify-tarball.mjs` passed after each fix.

---

_Fixed: 2026-04-27T16:45:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
