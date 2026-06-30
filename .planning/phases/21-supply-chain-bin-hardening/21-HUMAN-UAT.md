---
status: passed
phase: 21-supply-chain-bin-hardening
source: [21-VERIFICATION.md]
started: "2026-06-29T20:20:49Z"
updated: "2026-06-30"
---

## Current Test

Complete — both human-verification items resolved at the v3.1.0 release (2026-06-30).

## Tests

### 1. pinact live run — verify-pins CI job exits 0 on push
expected: After pushing the Phase 21 commits to origin, the dedicated `verify-pins` job on `ubuntu-latest` runs `pinact run --verify --check`, resolves every pinned `uses:` SHA in ci.yml and release.yml to its `# vX.Y.Z` comment tag via the live GitHub API, and exits 0 — failing closed on any unpinned / mismatched / wrong-tag ref.
result: [passed] — the `verify-pins` job ran green on the v3.1.0 release-arc pushes (CI runs 28474832184, 28476101573, 28478278176). Live tag→SHA resolution against the GitHub API confirmed on a GitHub-hosted runner; exit 0 each time.

### 2. SLSA-provenance attestation read-back (D-11)
expected: On the actual tagged release (v3.1.0), both published packages (`@localground/mcp`, `@localground/cli`) carry a surviving, verifiable SLSA-v1 provenance attestation produced by the OIDC publish flow.
result: [passed] — Release workflow run 28478299477 published both packages via OIDC. Registry confirms `dist.attestations.provenance.predicateType = https://slsa.dev/provenance/v1` for both `@localground/mcp@3.1.0` and `@localground/cli@3.1.0`. `npm audit signatures` on a clean install cryptographically verified all registry signatures (97/97) and attestations (zero failures). NOTE: verified via `npm audit signatures` — the correct tool for npmjs.com provenance — not the `oci://npm.pkg.github.com/...` form originally noted, which targets GitHub Packages (a different registry than the public npm registry these published to).

## Summary

total: 2
passed: 2
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps

None. Both items were accepted release-gated deferrals (provable only on a hosted runner / the real published artifact), now closed at the v3.1.0 release on 2026-06-30.
