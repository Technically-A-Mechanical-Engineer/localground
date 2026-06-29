---
phase: 21-supply-chain-bin-hardening
plan: "01"
subsystem: supply-chain
tags: [security, github-actions, ci, release, sha-pin, dependabot, oidc, provenance]
dependency_graph:
  requires: []
  provides: [SEC-01-partial, SHA-pinned-workflows, verify-pins-gate, npm-floor-assert, dependabot-config]
  affects: [.github/workflows/ci.yml, .github/workflows/release.yml, .github/dependabot.yml]
tech_stack:
  added: [pinact@v4.1.0 (CI-only, go install), Dependabot github-actions]
  patterns: [SHA-pin-with-comment, numeric-floor-assert-sort-V, fail-closed-pinact-gate, dedicated-ubuntu-only-job]
key_files:
  created: [.github/dependabot.yml]
  modified: [.github/workflows/ci.yml, .github/workflows/release.yml]
decisions:
  - "D-01: SHA-pin actions/checkout to 9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0 and actions/setup-node to 48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0 in both workflows — Codex-confirmed 2026-06-29"
  - "D-02: verify-pins job runs pinact run --verify --check (pinact@v4.1.0, ubuntu-only, fail-closed) — NOT in the 3-OS matrix"
  - "D-04: npm exact-pinned to npm@11.18.0 in release.yml (replaces range npm@^11.5.1)"
  - "D-05: Node floor raised to node-version 22.14.0 (replaces floating 22.x)"
  - "D-06: numeric floor-assert using sort -V ge() function — proven correct against lexical-trap vectors locally"
  - "D-08: .github/dependabot.yml created with github-actions weekly grouped updates"
  - "D-11: SLSA-provenance attestation closure is a release obligation — must be read back on the next actual tagged release, NOT a CI-on-push step"
metrics:
  duration: "2m 49s"
  completed: "2026-06-29"
  tasks_completed: 3
  files_created: 1
  files_modified: 2
---

# Phase 21 Plan 01: SHA-pin workflows + pinact gate + npm/Node floor-assert + Dependabot Summary

SHA-pin both GitHub Actions workflows (checkout v7.0.0, setup-node v6.4.0) with a fail-closed `pinact run --verify --check` gate (dedicated ubuntu-only job, pinact@v4.1.0 exact-pinned), exact-pin npm@11.18.0 + raise the Node floor to 22.14.0 with a numeric `sort -V` runtime floor-assert, add a manual-bump note, and create a github-actions Dependabot weekly grouped config — OIDC/provenance posture fully preserved.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | SHA-pin both workflows + add dedicated verify-pins job | ad44f37 | .github/workflows/ci.yml, .github/workflows/release.yml |
| 2 | Exact-pin npm, raise Node floor, add NUMERIC floor-assert + manual-bump note | 1e4c627 | .github/workflows/release.yml |
| 3 | Add github-actions Dependabot config | 917a305 | .github/dependabot.yml |

## Verification Results

### Task 1 automated verification
```
PASS
```
All checks: both SHAs in both workflows, `pinact run --verify --check` in ci.yml, `verify-pins:` job present, `pinact/v4/cmd/pinact@v4.1.0` present, no `pinact@latest`, no `continue-on-error`.

Additional: no `@v4` floating refs remain in either workflow; test matrix stays on `node-version: ['20.x']`; `package-manager-cache: false` preserved in release.yml; no zizmor added.

### Task 2 automated verification
```
PASS
```
All checks: `npm@11.18.0` present, `npm@^11.5.1` absent, `node-version: '22.14.0'` present, `node-version: '22.x'` absent, `id-token: write` preserved, `--provenance` count = 4, `package-manager-cache: false` preserved, MANUAL-BUMP comment present, `::error::` present, no lexical string operators.

**Numeric floor-assert correctness proven by local execution:**
```
=== Test vectors ===
npm=11.4.0 node=22.9.0 -> [FAIL npm < 11.5.1] [FAIL node < 22.14.0] exit 1
Expected: exit 1

npm=11.18.0 node=22.20.0 -> exit 0
Expected: exit 0

npm=11.18.0 node=22.9.0 -> [FAIL node < 22.14.0] exit 1
Expected: exit 1 (22.9.0 is sub-floor; lexical-trap rejection proves numeric compare)

npm=11.18.0 node=22.100.0 -> exit 0
Expected: exit 0 (22.100.0 > floor; lexical compare would wrongly fail this)
```

The `sort -V` based `ge()` function correctly handles the lexical trap: 22.9.0 fails (sub-floor), 22.100.0 passes (>= floor). A lexical string compare would get both backwards.

### Task 3 automated verification
```
PASS
```
All checks: file exists, `version: 2`, `package-ecosystem: github-actions`, `interval: weekly`, `groups:` block present. Both accepted gaps documented in header comment (run: literal not tracked; security-updates not separately grouped).

## Deviations from Plan

### Auto-deferred (environment constraint, not a code deviation)

**[Environment Constraint] Pinact fail-closed live reproduction not executed locally**
- **Found during:** Task 1
- **Issue:** The plan's acceptance criteria require executing `pinact` against a deliberately-broken pin and pasting the non-zero exit code. `go` and `pinact` are not installed on this machine, and the environment constraints explicitly prohibit installing system-wide toolchain on the user's dev box.
- **Disposition:** Reclassified as a CI-on-push verification obligation per the environment constraints guidance: the first push of this branch will trigger the `verify-pins` job (ubuntu-latest with Go pre-installed) running `pinact run --verify --check` against live GitHub API resolution — that IS the authoritative fail-closed proof.
- **Static evidence establishes fail-closed posture:**
  1. `--check` mode is non-mutating and fails on any mismatch (vs bare `pinact run --verify` which auto-corrects)
  2. The gate has no `continue-on-error: true`, no `|| true`/`|| :`, no `set +e`, and no `if:` that skips on push/PR
  3. The verifier is exact-pinned to `@v4.1.0` (not `@latest`)
  4. The job is a dedicated `ubuntu-latest` sibling (not inside the 3-OS matrix)
- **Same pattern as:** D-11's SLSA-provenance attestation deferral — authoritative proof comes from the next real run, not a local simulation

## D-11 Closure Obligation

**SLSA-Provenance Attestation — Closure Verification Required at Next Tagged Release**

SC #4 requires that "the release still produces a surviving SLSA-provenance attestation." This cannot be proven by the dry-run publish step (`--dry-run` does not produce an attestation) and cannot be proven by CI-on-push (no real publish happens). The OIDC posture is preserved byte-for-byte (`id-token: write`, `--provenance` on all four publish invocations, `package-manager-cache: false`, no stored npm token), but the SURVIVING attestation must be read back from the GitHub Attestations UI or via `gh attestation verify` on the next actual tagged release that triggers release.yml.

**Verification action required:** On the next real tagged release (v3.1.0), verify:
```bash
gh attestation verify oci://npm.pkg.github.com/@localground/mcp@<version> --owner Technically-A-Mechanical-Engineer
gh attestation verify oci://npm.pkg.github.com/@localground/cli@<version> --owner Technically-A-Mechanical-Engineer
```
Or check the GitHub Attestations tab for the release run.

## Known Stubs

None. All three deliverables are complete and functional YAML/config — no placeholder data flows to UI rendering.

## Threat Flags

No new security-relevant surface introduced beyond what the plan's threat model covers. The `verify-pins` job adds a GitHub API call (live tag→SHA resolution) but this is the intended behavior of T-21-02's mitigation.

## Self-Check: PASSED

File existence:
- .github/workflows/ci.yml: FOUND (modified)
- .github/workflows/release.yml: FOUND (modified)
- .github/dependabot.yml: FOUND (created)
- .planning/phases/21-supply-chain-bin-hardening/21-01-SUMMARY.md: FOUND (this file)

Commits:
- ad44f37: feat(21-01): SHA-pin both workflows + add dedicated verify-pins job (D-01, D-02, D-03)
- 1e4c627: feat(21-01): exact-pin npm@11.18.0, raise Node floor, add numeric floor-assert (D-04..D-07, D-09, D-10)
- 917a305: feat(21-01): add github-actions Dependabot config with weekly grouped updates (D-08)
