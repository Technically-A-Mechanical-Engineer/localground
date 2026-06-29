---
status: partial
phase: 21-supply-chain-bin-hardening
source: [21-VERIFICATION.md]
started: "2026-06-29T20:20:49Z"
updated: "2026-06-29T20:20:49Z"
---

## Current Test

[awaiting human testing]

## Tests

### 1. pinact live run — verify-pins CI job exits 0 on push
expected: After pushing the Phase 21 commits to origin, the dedicated `verify-pins` job on `ubuntu-latest` runs `pinact run --verify --check`, resolves every pinned `uses:` SHA in ci.yml and release.yml to its `# vX.Y.Z` comment tag via the live GitHub API (using the supplied GITHUB_TOKEN), and exits 0 on a clean repo — failing closed on any unpinned / mismatched / wrong-tag ref. The local box has no `go`/`pinact`, so the live broken-pin reproduction is a CI-on-push obligation; the static fail-closed posture (`--check` mode, `pinact@v4.1.0` exact-pin, no `continue-on-error`/`|| true`/skipping `if:`, dedicated ubuntu-only job) is already verified.
result: [pending]

### 2. SLSA-provenance attestation read-back (D-11)
expected: On the next actual tagged release (v3.1.0), `gh attestation verify` against both published packages (`@localground/mcp`, `@localground/cli`) confirms a surviving SLSA-v1 provenance attestation produced by the OIDC publish flow. This cannot be proven by the dry-run publish step or any CI-on-push step — it is a next-real-release read-back obligation. OIDC posture preservation (`id-token: write`, `--provenance` ×4, `package-manager-cache: false`, single-job) is already verified statically.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
