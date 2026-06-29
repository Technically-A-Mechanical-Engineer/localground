---
phase: 20-release-pipeline-validation
reviewed: 2026-06-29T12:09:57Z
depth: deep
files_reviewed: 7
files_reviewed_list:
  - packages/cli/src/index.ts
  - packages/mcp/src/index.ts
  - scripts/verify-tarball.mjs
  - .github/workflows/release.yml
  - packages/core/src/operations/seed.ts
  - packages/cli/package.json
  - packages/mcp/package.json
findings:
  critical: 0
  high: 0
  medium: 2
  low: 2
  info: 2
  total: 6
status: issues_found
---

# Phase 20: Code Review Report (Advisory)

**Reviewed:** 2026-06-29T12:09:57Z
**Depth:** deep
**Files Reviewed:** 7
**Status:** issues_found (advisory / non-blocking)

## Summary

Reviewed the Phase 20 release-pipeline changes against the four scoped concerns: runtime version derivation (cli/mcp), the `verify-tarball.mjs` assertion change, the hardcoded seed `toolkitVersion`, and the OIDC `release.yml` posture.

**Headline: no CRITICAL or HIGH findings.** The core correctness risk — runtime version derivation — is implemented correctly and verified end-to-end. I ran `node scripts/verify-tarball.mjs` against real packed tarballs installed into a clean tmp dir: both `@localground/mcp` and `@localground/cli` print `3.0.2`, exactly matching their manifests. All five manifests (root, core, cli, mcp, plugin.json) are aligned at 3.0.2. The `new URL('../package.json', import.meta.url)` resolution survives tsup bundling (verified in `packages/cli/dist/index.js:1208`) and resolves to the package root in the installed layout (`node_modules/@localground/<pkg>/package.json`). `npm pack` always ships `package.json` regardless of the `files: ["dist"]` whitelist, so the dependency is satisfied in the published artifact and guarded by `REQUIRED_FILES` in verify-tarball.

The OIDC release workflow is structurally sound: least-privilege `id-token: write` + `contents: read`, no `NODE_AUTH_TOKEN`/`NPM_TOKEN` anywhere, no `registry-url` (so no `.npmrc` auth file is written), tag==version preflight, and dry-run-both gating ahead of the real publish. The findings below are MEDIUM-and-below hardening items, not defects in the shipped behavior.

## Medium Issues

### MD-01: Supply-chain — GitHub Actions pinned to mutable major-version tags, not commit SHAs

**File:** `.github/workflows/release.yml:19,22` (also `.github/workflows/ci.yml:28,31`)
**Issue:** The release workflow holds `id-token: write` (OIDC trust to npm) and runs `actions/checkout@v4` and `actions/setup-node@v6`. Both are pinned to mutable major-version tags. A compromise or retag of either action repo would execute attacker-controlled code inside a job that can mint an npm provenance/publish token — the highest-value job in the repo. This is the standard hardening gap GitHub and OpenSSF call out for any workflow with `id-token: write` or publish rights. The `npm install -g npm@^11.5.1` step (line 29) is a softer instance of the same class: a floating range pulls whatever the registry serves at run time into the publishing environment.
**Fix:** Pin third-party actions by full commit SHA with the version in a trailing comment, e.g.:
```yaml
      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1
      - uses: actions/setup-node@v6  # → replace with the v6.x commit SHA
```
For the npm upgrade, pin an exact version (`npm@11.5.1`) rather than a `^` range so the publishing toolchain is reproducible. Consider [Dependabot for github-actions] to keep SHAs current. This is a posture improvement, not a live vulnerability — the action upstreams are trusted today.

### MD-02: `verify-tarball.mjs` `--version` assertion is exact-equality but the bins emit no trailing-content guarantee beyond `\n`

**File:** `scripts/verify-tarball.mjs:210-213`
**Issue:** The assertion is now `versionResult.stdout.trim() !== expectedVersion`. This is correct and an improvement over the old semver-shape regex (the regex would have passed the 3.0.1-prints-3.0.0 drift that this whole fix-forward exists to catch). One residual gap: the check trims `stdout` and compares the entire trimmed buffer. Commander (cli) prints exactly `<version>\n`; the mcp escape hatch (`packages/mcp/src/index.ts:837`) writes `${SERVER_VERSION}\n`. Both are clean today. But the assertion would also pass if a future change emitted leading/trailing whitespace-only noise (trimmed away) while it would *fail* loudly on any real stray stdout — which is the safe direction. The actual residual risk is the opposite surface: the mcp `--version` path is a hand-rolled `process.argv.includes('--version')` escape hatch, not a real arg parser, so `localground-mcp --version=foo` or `--Version` would silently boot the server instead of printing a version. verify-tarball only exercises the exact `--version` token, so a regression in the escape-hatch matching would not be caught.
**Fix:** Low-effort hardening — assert the bin's stdout matches `^<expectedVersion>$` after trim (already effectively does) AND that the process exits 0 within the watchdog (already does). The escape-hatch fragility is INFO-grade; if you want to close it, normalize with `process.argv.slice(2).some(a => a === '--version' || a === '-V')`. Not required for ship.

## Low Issues

### LW-01: Module-load-time throw on absent/malformed `package.json` is unguarded in both bins

**File:** `packages/cli/src/index.ts:15-17`, `packages/mcp/src/index.ts:19-21`
**Issue:** `JSON.parse(readFileSync(new URL('../package.json', ...)))` runs at module top level. If `package.json` is missing or corrupt, the bin throws before any arg parsing, before commander, and (for mcp) before the McpServer is constructed. For the CLI this is an acceptable fail-fast — the package is structurally broken and `--version`/`--help` could not be trusted anyway. For the **mcp** bin the failure mode is worse in practice: a top-level throw during MCP startup surfaces to the Claude Code host as a server that exits immediately on stdio with no JSON-RPC handshake, which is opaque to diagnose from the host side. This is guarded against in CI by `verify-tarball`'s `REQUIRED_FILES` (which includes `package.json`) + the `--version` smoke run, so a broken tarball cannot publish green. The exposure is only to post-publish tampering of an installed package, which is out of the threat model.
**Fix:** Acceptable as-is given the CI guard. If you want defense-in-depth for the mcp host experience, wrap the read in a try/catch that falls back to a literal default and `console.error`s the cause, so the server still boots and reports a degraded version rather than vanishing:
```ts
let SERVER_VERSION = '0.0.0-unknown';
try {
  SERVER_VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
} catch (e) {
  console.error('[localground-mcp] could not read package.json version:', e);
}
```
Not blocking — the read-time throw is correct fail-fast behavior and the CI gate covers the publish path.

### LW-02: mcp reads `package.json` synchronously at module top level

**File:** `packages/mcp/src/index.ts:19-21`
**Issue:** Scope item 1 asked about ordering/perf of the top-level read. Assessment: no concern. The `readFileSync` is a single small-file read that completes before `McpServer` construction (line 25), which is the correct order — the version must be known to name the server. It runs once at process start, off the hot path of any tool call. `readFileSync` (sync) at module init is the conventional pattern here and avoids a top-level `await`. No change recommended.
**Fix:** None. Documented for completeness against the scope question.

## Info

### IN-01: `seed.ts` hardcoded `toolkitVersion: '3.0.2'` (known, deferred)

**File:** `packages/core/src/operations/seed.ts:139`
**Issue:** `toolkitVersion` is a hardcoded `'3.0.2'` string literal. It is correctly aligned with the current manifest version this release, so seed manifests written by 3.0.2 will report `3.0.2`. It is a drift candidate for the next version bump (the same class of defect — a literal the manifest bump doesn't touch — that this phase fixed for the `--version` strings). Per the review scope, drift-proofing is explicitly deferred to v3.1.0 and tracked; recording here as the agreed follow-up, not a defect.
**Fix:** None this phase. Deferred to v3.1.0 (derive from a shared constant or the package version, same mechanism now used by the bins).

### IN-02: `release.yml` dry-run gate and step ordering are correct

**File:** `.github/workflows/release.yml:53-62`
**Issue:** Confirming the dry-run-before-publish gate works as intended. GitHub Actions `run:` steps execute under `bash -e` by default, so a non-zero exit from either `npm publish ... --dry-run` (lines 55-56) aborts the step and fails the job before the real publish steps (lines 58-62) run. The preflight tag==version check (lines 41-51) likewise fails closed via explicit `exit 1`. The pure-OIDC `npm publish --provenance --access public` with no token and no `registry-url` is the correct npm trusted-publishing posture for npm >=11.5.1 on Node 22. No auth/secret is written to disk. Sound.
**Fix:** None.

---

_Reviewed: 2026-06-29T12:09:57Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: deep_
