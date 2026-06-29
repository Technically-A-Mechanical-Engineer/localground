# Requirements: LocalGround Toolkit v3.0.1

**Defined:** 2026-04-26
**Milestone:** v3.0.1 — Validation and Hardening
**Core Value:** Get Claude Code users off cloud-synced storage safely — no data loss, no silent failures, every action verified before and after.

## v3.0.1 Requirements

Requirements for the v3.0.1 patch release. Each maps to a roadmap phase.

### Skill Runtime Validation (UAT)

End-to-end UAT against the registered `@localground/mcp` server. v3.0.0 verified static skill compliance; these requirements validate runtime behavior. Source: backlog item 999.1 (formerly Phase 14 UAT Tests 12-16, all blocked behind MCP-server registration).

- [ ] **UAT-01**: `/localground:seed` skill executes end-to-end against the registered MCP server — calls `localground_seed`, presents a valid manifest, returns user-readable output
- [ ] **UAT-02**: `/localground:migrate` skill orchestrates the two-session continuation-token loop — Session 1 writes `localground-migrate-state.json`, Session 2 picks it up after Claude Code restart, completes settings migration without state loss (CRITICAL — only test that exercises the continuation-token code path; defects here would silently strand users mid-migration)
- [ ] **UAT-03**: `/localground:reap` skill executes end-to-end — calls `localground_verify` plus `localground_health_check`, generates a natural-language report
- [ ] **UAT-04**: `/localground:cleanup` skill executes end-to-end — calls `localground_cleanup_scan`, presents per-item findings, collects per-item confirmation, executes deletions only on confirmed items
- [ ] **UAT-05**: `/localground:verify` skill executes end-to-end — calls `localground_audit`, generates a traffic-light report with mapped recommendations

### Pipeline First-Run Validation

Both GitHub Actions workflows shipped with v3.0.0 are structurally verified but unexecuted end-to-end. Source: backlog item 999.2.

- [ ] **PIPE-01**: `ci.yml` first end-to-end run on master push lands green across the 3-OS matrix (Windows / macOS / Linux on Node 20.x); any platform-specific failures are diagnosed and resolved before milestone close
- [x] **PIPE-02**: `release.yml` first end-to-end run on v3.0.1 tag publishes both `@localground/mcp@3.0.1` and `@localground/cli@3.0.1` to npm with OIDC trusted-publisher provenance attestation visible on npmjs.com

### Test Infrastructure

Quality-gate restoration and test hygiene cleanup. Source: backlog item 999.3.

- [x] **TEST-01**: `tsc --build` restored as a CI quality gate alongside tsup; D-18 (~30 implicit-any errors that tsup tolerates but tsc rejects) resolved without weakening strict mode
- [x] **TEST-02**: Vitest cleanup hang on `npm test` exit eliminated via `afterEach` cleanup of spawned children in MCP and CLI smoke tests; `npm test` exits with the same code Vitest reports
- [x] **TEST-03**: L-01 closed — `placeholder.test.ts` adds an explicit `expect(platformResult.success).toBe(true)` precondition guard so dependent assertions can never silently no-op
- [x] **TEST-04**: L-02 closed — `decode.test.ts` tautological assertion (`expect(typeof result.success).toBe('boolean')`, which can never fail given the discriminated union) replaced with a meaningful check

### Packaging

npm tarball weight reduction. Source: backlog item 999.4.

- [x] **PKG-01**: Both `packages/mcp/package.json` and `packages/cli/package.json` declare `"files": ["dist"]`, restricting the published tarball to compiled output
- [x] **PKG-02**: Verified via `npm pack --dry-run` (or equivalent) that `src/`, `test/`, `tsconfig.json`, `tsup.config.ts`, and `vitest.config.ts` no longer appear in the tarball; `dist/` contents preserved

### Core Correctness

Decoder regex coverage gap closure. Source: backlog item 999.6.

- [x] **CORE-13**: `encode()` regex in `packages/core/src/environment/decode.ts` calibrated against actual Claude Code CLI encoding behavior; folder names containing apostrophes, ampersands, brackets, parentheses, plus signs, equals signs, percent signs, and other special characters round-trip through `encode()` / `decode()` correctly (extends v3.0.0 CORE-02)
- [x] **CORE-14**: WR-01 closed — silent decode failures from regex undercoverage eliminated; verified by reproducing the user's original 23-path-hash sample (where 6 returned `no_candidates`) or an equivalent reproduction case, with all `no_candidates` either explained (deleted source folder) or fixed (regex-coverage gap)

### Documentation

Per-package npm-page documentation visibility. Source: post-roadmap user clarification — `packages/mcp/README.md` and `packages/cli/README.md` were added in PR #11 (merged to master 2026-04-27) but were not part of the v3.0.0 publish, so npmjs.com currently shows the empty-state placeholder for both packages. Reference memory: `feedback_npm_package_readme.md`.

- [x] **DOC-03**: Per-package READMEs (`packages/mcp/README.md` and `packages/cli/README.md`) ship in the v3.0.1 tarballs published to npm and render on the `@localground/mcp@3.0.1` and `@localground/cli@3.0.1` npmjs.com package pages, replacing the empty-state placeholder shown for v3.0.0 (extends v3.0.0 DOC-01, DOC-02)

## v3.1.0 Requirements

Deferred to the next minor release. Tracked but not in the v3.0.1 roadmap.

### CLI UX

- **CLI-05**: TIER 2 streaming refactor of `spawnTool` — change `spawnSync` with captured stdio to async `spawn()` with line-streaming via `child.stdout('data')` (Option B) or inherited stdio (Option A), so robocopy/rsync per-line progress surfaces to the user during MCP-driven copy operations through the `/localground:migrate` skill (formerly backlog 999.5; deferred because architectural change with real risk surface and TIER 1 mitigation already shipped in Phase 14-11)

## Out of Scope

Explicitly excluded from v3.0.1. Documented to prevent scope creep mid-milestone.

| Feature | Reason |
|---------|--------|
| New MCP tools or skills | v3.0.1 is a patch release; new feature surface area belongs in v3.1.0+ |
| MCP SDK v2 migration | v1.x still stable; v2 still pre-stable; migration will be mechanical when v2 stabilizes |
| Auto-deletion in MCP tools | Safety model invariant — scan returns candidates, skill collects confirmation, user (or skill on behalf of user) executes |
| Configuration file (`.localgroundrc`) | Fixed safety model; CLI flags handle one-time options |
| GUI / TUI / IDE extension | Claude Code is the UI; CLI emits structured data |
| Streaming refactor of `spawnTool` | Deferred to v3.1.0 (see v3.1.0 Requirements above); architectural change incompatible with patch-release scope |
| Per-package CHANGELOG.md files | Single repo-level changelog suffices for two packages on synchronized versions |
| CONTRIBUTING.md | Zero contributors; signal-driven addition only |

## Traceability

Which phases cover which requirements. Updated by the roadmapper.

| Requirement | Phase | Status |
|-------------|-------|--------|
| TEST-01 | Phase 16 | Complete |
| TEST-02 | Phase 16 | Complete |
| TEST-03 | Phase 16 | Complete |
| TEST-04 | Phase 16 | Complete |
| CORE-13 | Phase 17 | Complete |
| CORE-14 | Phase 17 | Complete |
| PKG-01 | Phase 18 | Complete |
| PKG-02 | Phase 18 | Complete |
| UAT-01 | Phase 19 | Pending |
| UAT-02 | Phase 19 | Pending |
| UAT-03 | Phase 19 | Pending |
| UAT-04 | Phase 19 | Pending |
| UAT-05 | Phase 19 | Pending |
| PIPE-01 | Phase 20 | Pending |
| PIPE-02 | Phase 20 | Complete |
| DOC-03 | Phase 20 | Complete |

**Coverage:**
- v3.0.1 requirements: 16 total
- Mapped to phases: 16 ✓
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-26*
*Last updated: 2026-04-27 — roadmap mapped 16/16 requirements to Phases 16-20 (DOC-03 added post-roadmap to lock per-package README visibility on npmjs.com)*
