---
phase: 21-supply-chain-bin-hardening
verified: 2026-06-29T21:00:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
human_verification_resolved: "2026-06-30 — both items closed at the v3.1.0 release. (1) pinact live run: the verify-pins CI job ran green on the release-arc pushes (CI runs 28474832184 / 28476101573 / 28478278176), confirming live tag->SHA resolution on a hosted runner. (2) SLSA-provenance read-back (D-11): Release run 28478299477 published @localground/mcp@3.1.0 + @localground/cli@3.1.0 via OIDC; registry dist.attestations shows SLSA-v1 provenance for both, and `npm audit signatures` on a clean install verified all registry signatures (97/97) and attestations with zero failures. CORRECTION: npmjs.com-published provenance is verified via `npm audit signatures`, NOT the `oci://npm.pkg.github.com/...` form noted below (that targets GitHub Packages, a different registry)."
human_verification:
  - test: "Push the current branch to origin and confirm the verify-pins CI job passes"
    expected: "The verify-pins job (ubuntu-latest) runs pinact run --verify --check against live GitHub API and exits 0, confirming each pinned SHA resolves to its commented tag (v7.0.0, v6.4.0)"
    why_human: "pinact and Go are not installed locally; live tag->SHA resolution against the GitHub API requires a GitHub-hosted runner. The static posture is fully verified; the live proof only runs on push. Accepted per the verified_environment_context deferral."
  - test: "On the next actual tagged release (v3.1.0), run: gh attestation verify oci://npm.pkg.github.com/@localground/mcp@<version> --owner Technically-A-Mechanical-Engineer AND gh attestation verify oci://npm.pkg.github.com/@localground/cli@<version> --owner Technically-A-Mechanical-Engineer"
    expected: "Both commands return a verified SLSA-provenance attestation, confirming OIDC posture survived the supply-chain changes and a real provenance artifact was produced"
    why_human: "A --dry-run publish does not produce a real attestation. Verified OIDC posture preservation (id-token: write, --provenance x4, package-manager-cache: false, single-job) statically; the surviving attestation must be read back from the actual published artifact. Accepted per the verified_environment_context deferral (D-11)."
---

# Phase 21: Supply-Chain & Bin Hardening Verification Report

**Phase Goal:** The release supply chain is pinned and verifiable, and the mcp bin reports its version robustly without ever booting the transport.
**Verified:** 2026-06-29T21:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Every third-party `uses:` in BOTH ci.yml and release.yml pinned to 40-char SHA + `# vX.Y.Z` comment | ✓ VERIFIED | All 5 `uses:` refs use the two locked SHAs (40-char confirmed by shell). ci.yml lines 28, 31, 56; release.yml lines 19, 22. No floating `@v4`/`@v6` tags remain (grep returned zero matches). |
| 2 | Each pinned SHA verified to resolve to its tag via fail-closed pinact gate | ✓ VERIFIED (static) | `verify-pins:` job present in ci.yml (lines 51-64): dedicated ubuntu-latest, `shell: bash`, runs `pinact run --verify --check`, pinact exact-pinned `@v4.1.0` (go install path), GITHUB_TOKEN supplied, no `continue-on-error`/`\|\| true`/`set +e`. Live run = human obligation (accepted deferral). |
| 3 | Publish job exact-pins npm >= 11.5.1 AND Node >= 22.14.0, with numeric runtime floor-assert | ✓ VERIFIED | release.yml: `npm@11.18.0` (line 31), `node-version: '22.14.0'` (line 24). Floor-assert step (lines 34-44) uses `sort -V` ge() function. Lexical-trap correctness proven in SUMMARY (22.9.0 fails, 22.100.0 passes). No `npm@^11.5.1` or `22.x` remain. |
| 4 | Dependabot github-actions config present | ✓ VERIFIED | `.github/dependabot.yml` exists: `version: 2`, `package-ecosystem: "github-actions"`, `directory: "/"`, `interval: "weekly"`, `groups:` block. Accepted-gap comments present (run: literal gap, security-updates gap). |
| 5 | mcp bin robustly recognizes version flags, exits before transport boot; fall-through is case-sensitive and exact; no parser dep | ✓ VERIFIED | `isVersionRequest()` helper (index.ts:837-845): `arg === '--version'`, `arg.startsWith('--version=')`, `arg === '-v'`, `arg === '-V'`. Called at line 853 before `new StdioServerTransport()` (line 858). No `commander`/`yargs` import. Smoke tests lock all 8 behavioral cases with positive-handshake proof for fall-through. `npm test` = 93 passed, 2 skipped. |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.github/workflows/ci.yml` | SHA-pinned actions + dedicated ubuntu-only verify-pins job | ✓ VERIFIED | Both actions pinned; verify-pins job is a sibling (not inside test matrix); pinact exact-pinned v4.1.0; fail-closed |
| `.github/workflows/release.yml` | SHA-pinned actions, exact npm pin, Node floor, numeric floor-assert, OIDC preserved | ✓ VERIFIED | All claims verified against file. `--provenance` appears 4 times (lines 69, 70, 73, 76). `id-token: write` at line 10. `package-manager-cache: false` at line 25. Single `release:` job. |
| `.github/dependabot.yml` | github-actions weekly grouped config | ✓ VERIFIED | File matches canonical schema; accepted-gap documentation present |
| `packages/mcp/src/index.ts` | Robust pre-transport version predicate | ✓ VERIFIED | `isVersionRequest()` at lines 837-845; called at line 853 before transport at line 858; old brittle `process.argv.includes('--version')` is gone |
| `packages/mcp/test/smoke.test.ts` | Tests for all 8 behavioral cases + child reaping | ✓ VERIFIED | `describe('MCP bin --version predicate')` block (lines 166-227); 4 match tests + 4 fall-through tests; all tracked via `trackedSpawnServer(args)`; fall-through proven by handshake |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `.github/workflows/ci.yml` | GitHub API (live tag->SHA resolution) | `verify-pins:` job running `pinact run --verify --check` | ✓ WIRED (static) | Job present, ubuntu-only, fail-closed, pinact@v4.1.0, GITHUB_TOKEN supplied. Live resolution = next push obligation. |
| `.github/workflows/release.yml` | OIDC trusted publishing | `id-token: write` + `--provenance` (preserved) | ✓ WIRED | `id-token: write` confirmed; `--provenance` on all 4 publish invocations confirmed; single-job structure confirmed |
| `packages/mcp/src/index.ts` | stdout + process.exit(0) | `isVersionRequest()` predicate before StdioServerTransport | ✓ WIRED | Predicate at lines 837-845 called at line 853, transport at line 858 — ordering verified in file |
| `scripts/verify-tarball.mjs` | `packages/mcp/src/index.ts` bin --version | spawn bin with --version, assert stdout.trim() === version + exit 0 | ✓ WIRED | SUMMARY confirms `npm run verify:tarball` exits 0; script unchanged; exact-string contract intact |

### Data-Flow Trace (Level 4)

Not applicable — this phase produces CI/workflow config files and a TypeScript predicate, not data-rendering components.

### Behavioral Spot-Checks

| Behavior | Evidence | Status |
|----------|----------|--------|
| `isVersionRequest(['--version'])` returns true | Source: `arg === '--version'` in predicate | ✓ VERIFIED (static) |
| `isVersionRequest(['--version=foo'])` returns true | Source: `arg.startsWith('--version=')` — exact prefix, not bare startsWith | ✓ VERIFIED (static) |
| `isVersionRequest(['-v'])` returns true | Source: `arg === '-v'` | ✓ VERIFIED (static) |
| `isVersionRequest(['-V'])` returns true | Source: `arg === '-V'` | ✓ VERIFIED (static) |
| `isVersionRequest(['--versions'])` returns false | `--versions` fails `=== '--version'` and does NOT match `startsWith('--version=')` (no `=`) and is not `-v`/`-V` | ✓ VERIFIED (static + smoke test) |
| `isVersionRequest(['--Version'])` returns false | Case-sensitive: `'--Version' !== '--version'`; locked by smoke test handshake proof | ✓ VERIFIED (static + smoke test) |
| ge() numeric floor-assert rejects 22.9.0 as below 22.14.0 | SUMMARY documents local execution: `npm=11.18.0 node=22.9.0 -> exit 1`; 22.100.0 passes (lexical-trap validation) | ✓ VERIFIED (execution evidence in SUMMARY) |
| `--provenance` count >= 4 | Grep: 4 occurrences in release.yml (lines 69, 70, 73, 76) | ✓ VERIFIED |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SEC-01 | 21-01-PLAN.md | SHA-pin all `uses:` refs in both workflows, verify pins resolve, exact-pin npm/Node with runtime assert, Dependabot github-actions, preserve OIDC/provenance | ✓ SATISFIED | All 5 sub-requirements verified in artifacts above. REQUIREMENTS.md marks SEC-01 Complete at Phase 21. |
| CLI-06 | 21-02-PLAN.md | mcp bin recognizes `--version`/`--version=…`/`-v`/`-V`, prints version, exits 0 before transport; `--Version`/`--VERSION` fall through; no parser dep | ✓ SATISFIED | `isVersionRequest()` predicate, smoke tests, verify-tarball all confirm. REQUIREMENTS.md marks CLI-06 Complete at Phase 21. |

Both requirement IDs from PLAN frontmatter are accounted for. REQUIREMENTS.md traceability table marks both Complete at Phase 21. BUILD-01/CORE-15/CORE-16 are mapped to Phases 22-23 (not Phase 21 scope).

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `.github/workflows/release.yml` | 39-43 | `ge()` via `sort -V` accepts prerelease versions (e.g. `22.14.0-nightly`) as satisfying the floor | INFO | Low — inputs are controlled (setup-node pins exact `22.14.0`, npm pins exact `11.18.0`). WR-01 from code review; accepted as residual on the D-06-sanctioned idiom. Not a blocker. |
| `packages/mcp/test/smoke.test.ts` | 176-193 | `trackedSpawnServer`/`afterEach` reaper duplicated in second describe block | INFO | Zero — both copies are correct and reaping discipline is sound. IN-02 from code review; cosmetic only. |
| `.github/workflows/release.yml` | 34-44 | Floor-assert `run:` block uses POSIX constructs without explicit `shell: bash` declaration | INFO | Zero — ubuntu-latest default shell is bash. IN-01 from code review; cosmetic inconsistency with ci.yml. |

No BLOCKER anti-patterns found. All three flagged items are INFO-level and were identified and dispositioned in the code review (WR-01 accepted, IN-01/IN-02 cosmetic).

### Human Verification Required

#### 1. pinact Live Tag-to-SHA Resolution (CI-on-push obligation)

**Test:** Push the current branch to origin and let the `verify-pins` CI job run.
**Expected:** The `verify-pins` job on ubuntu-latest runs `pinact run --verify --check` via the GitHub API, exits 0 (all 5 SHA pins resolve to their commented tags), and the CI run shows green.
**Why human:** pinact and Go are not installed on the local dev box. The static posture is fully verified (fail-closed mode, exact-pinned verifier, no bypass). The live GitHub API resolution proof can only run on a GitHub-hosted runner. This is an accepted deferral per the verified_environment_context.

#### 2. SLSA-Provenance Attestation Surviving (next tagged release obligation)

**Test:** After the next actual tagged release (v3.1.0), run:
```bash
gh attestation verify oci://npm.pkg.github.com/@localground/mcp@<version> --owner Technically-A-Mechanical-Engineer
gh attestation verify oci://npm.pkg.github.com/@localground/cli@<version> --owner Technically-A-Mechanical-Engineer
```
**Expected:** Both commands return verified attestations, confirming the OIDC publish produced a surviving SLSA-provenance artifact.
**Why human:** A `--dry-run` publish does not produce a real attestation. The OIDC posture is statically verified (id-token: write retained, --provenance on all 4 publish calls, package-manager-cache: false, single-job structure). The live provenance read-back must happen on the next real publish. This is the D-11 closure obligation documented in both plans and the SUMMARY.

### Gaps Summary

No code gaps. Both SEC-01 and CLI-06 are fully implemented and verified statically. The two human verification items are documented, accepted deferrals from the start of the phase — not implementation gaps discovered here.

- Human item 1 (pinact live run) is a CI-on-push proof that requires a GitHub-hosted runner. Static evidence confirms fail-closed posture.
- Human item 2 (SLSA attestation) is a next-release read-back. OIDC posture preservation is statically confirmed.

---

_Verified: 2026-06-29T21:00:00Z_
_Verifier: Claude (gsd-verifier)_
