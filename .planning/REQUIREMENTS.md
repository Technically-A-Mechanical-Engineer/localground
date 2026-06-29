# Requirements: LocalGround Toolkit v3.1.0

**Defined:** 2026-06-29
**Milestone:** v3.1.0 — Hardening and Hygiene
**Core Value:** Get Claude Code users off cloud-synced storage safely — no data loss, no silent failures, every action verified before and after.

A hardening/correctness milestone — five carry-forward items from the v3.0.1 close. No new feature surface. Phases continue from 20 (start at 21). Each requirement maps to a roadmap phase.

## v3.1.0 Requirements

### Supply-Chain Security

Harden the release pipeline — the `id-token: write` publish job is the repo's highest-privilege surface. Source: carry-forward MD-01. Research: `research/STACK.md`, `research/PITFALLS.md`.

- [ ] **SEC-01**: Every third-party GitHub Actions `uses:` reference in `.github/workflows/ci.yml` and `release.yml` is pinned to a full 40-character commit SHA carrying a `# vX.Y.Z` version comment, and each pinned SHA is verified to actually resolve to its commented tag (e.g. via `pinact`/`zizmor` or a CI check — a SHA can point at a fork/wrong commit); the publish job exact-pins the runner npm to a specific version ≥ 11.5.1 **and** runs on Node ≥ 22.14.0 (the paired OIDC floors), asserting both at runtime; a Dependabot `github-actions` config keeps the pins updatable; the release continues to publish via OIDC with no stored npm token, retains `id-token: write`, and produces a surviving SLSA-provenance attestation

### Build / Version Integrity

Eliminate the last hardcoded version literal so the seed manifest cannot drift from the package version — the same drift class fixed for the bins' `--version` in v3.0.1. Source: carry-forward #1. Research: `research/ARCHITECTURE.md`, `research/PITFALLS.md`.

- [ ] **BUILD-01**: The seed manifest's `toolkitVersion` always equals the consuming package's version (`@localground/mcp` or `@localground/cli`) in both the dev build and the packaged tarball, with no hardcoded version literal remaining in `seed.ts`; `scripts/verify-tarball.mjs` is extended to assert the seed-path version *value* (today it gates only the bin `--version`)

### CLI / Bin Robustness

Replace the brittle one-flag check in the mcp bin without over-engineering. Source: carry-forward MD-02. Research: `research/FEATURES.md`, `research/PITFALLS.md`.

- [ ] **CLI-06**: The mcp bin robustly recognizes a `--version` request — including `--version=…` and a `-v`/`-V` alias — prints the version string to stdout, exits 0, and never boots the stdio transport; long-form flags are case-sensitive, so `--Version`/`--VERSION` are intentionally NOT treated as version requests and fall through to normal startup (defined, testable behavior for the case the bug report flagged); the existing pre-transport short-circuit, `process.exit(0)`, and exact-string contract that `verify-tarball.mjs` depends on are preserved; no argument-parser dependency is added to the mcp package

### Core Correctness

Two pure-`@localground/core` fixes; both land in the shared library so the CLI `audit`/`detect` and the MCP `audit`/`decode_path_hash` tools inherit them identically. Source: carry-forward #4 (CORE-15) and backlog 999.7 (CORE-16). Research: `research/ARCHITECTURE.md`, `research/FEATURES.md`, `research/PITFALLS.md`.

- [ ] **CORE-15**: Audit auto-discovery does not surface home, drive, or system roots (e.g. `C:\Users\…`) as candidate projects, while plain-folder projects that have no `.git`/`package.json` marker remain discoverable (decision D-01 preserved — no marker-file check); the fix lives in shared core so CLI and MCP audit behave identically; a regression test locks both the root-rejection and the D-01 plain-folder-discovery invariants. *(Reproduce the `audit-includes-root-paths` symptom against current `master` first — this may resolve to a regression-lock test rather than a logic change.)*
- [ ] **CORE-16**: A special character (`'`, `&`, `[`, `]`, `(`, `)`, `+`, `=`, `%`) at the trailing edge of an intermediate path component round-trips through `encode()` / `decode()` losslessly; the 17/17 currently-passing path-hashes and the load-bearing v3.0.0 OneDrive `buildCandidates` fix do not regress; trailing-edge, leading-edge, and mid-component fixtures are added. *(Fix the trailing-hyphen-strip asymmetry in `buildCandidates`; do not widen the Phase-17 character class to a catch-all.)*

## Future Requirements

Deferred to a later release. Tracked but not in the v3.1.0 roadmap.

### CLI UX (v3.2.0)

- **CLI-05** (formerly 999.5): TIER 2 streaming refactor of `spawnTool` — async `spawn()` with line-streaming (Option B) or inherited stdio (Option A) so robocopy/rsync per-line progress surfaces during MCP-driven copy through `/localground:migrate`. Deferred from v3.1.0 on 2026-06-29: architectural change with real regression risk on the live copy path; the TIER 1 stderr-status mitigation already shipped in Phase 14-11.

## Out of Scope

Explicitly excluded from v3.1.0. Documented to prevent scope creep mid-milestone.

| Feature | Reason |
|---------|--------|
| New MCP tools or skills | v3.1.0 is a hardening minor; new feature surface belongs in v3.2.0+ |
| Streaming refactor of `spawnTool` (CLI-05) | Deferred to v3.2.0 (see Future Requirements); architectural change incompatible with a hardening batch |
| Marker-file (`.git`/`package.json`) project detection | Regresses decision D-01 (plain-folder projects must stay discoverable); CORE-15 must filter by path shape, not markers |
| Catch-all decoder regex | Breaks the calibrated Phase-17 17/17 round-trips; CORE-16 fixes `buildCandidates`, not the character class |
| Argument-parser dependency (commander/yargs) in the mcp bin | Unjustified for one flag; CLI-06 stays hand-rolled |
| Bumping tsup to ^9 | Installed is ^8.5.1; `define` works on v8; no reason to bump as part of this milestone |
| MCP SDK v2 migration | v1.x still stable; migration will be mechanical when v2 stabilizes |
| Replacing OIDC trusted publishing with stored tokens | OIDC stores no secret and is retryable; tokens expire ≤90 days (a maintenance trap) |

## Traceability

Which phases cover which requirements.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 21 — Supply-Chain & Bin Hardening | Pending |
| CLI-06 | Phase 21 — Supply-Chain & Bin Hardening | Pending |
| BUILD-01 | Phase 22 — Core Versioning & Audit Filter | Pending |
| CORE-15 | Phase 22 — Core Versioning & Audit Filter | Pending |
| CORE-16 | Phase 23 — Decoder Trailing-Edge Fix | Pending |

**Coverage:**
- v3.1.0 requirements: 5 total
- Mapped to phases: 5 (Phases 21-23) ✓
- Unmapped: 0

Build order preserved across phases: SEC-01 → CLI-06 → BUILD-01 → CORE-15 → CORE-16.

---
*Requirements defined: 2026-06-29 — five carry-forward items from the v3.0.1 close (Hardening and Hygiene). CLI-05 deferred to v3.2.0.*
*Cross-model reviewed 2026-06-29 (Codex / GPT-5, read-only): applied SEC-01 Node ≥22.14.0 floor + SHA↔tag verification, CLI-06 case-sensitivity contract, and BUILD-01/SEC-01 wording precision. No blockers raised; structure confirmed sound.*
*Traceability mapped 2026-06-29 — all 5 requirements mapped to Phases 21-23 (5/5 coverage).*
