# LocalGround Toolkit for Claude Code

## What This Is

A toolkit that helps Claude Code CLI users migrate project folders off cloud-synced storage, verify migration integrity, clean up stale artifacts, and audit environment health. As of v3.0.0, the toolkit ships in three forms: (1) MCP server (`@localground/mcp`) — exposes 9 operations as native Claude Code tool calls via the Model Context Protocol; (2) standalone CLI (`@localground/cli`) — 7 commands for terminal or scripted use via `npx`; (3) paste-and-run prompts in `prompts/` — the original v2.0.0 no-install fallback. A Claude Code plugin packages the 5 workflow skills (`/localground:seed`, `/localground:migrate`, `/localground:reap`, `/localground:cleanup`, `/localground:verify`) for one-command installation. Target audience: Claude Code users hitting git errors, file lock failures, or sync conflicts from working in OneDrive, Dropbox, Google Drive, or iCloud folders.

## Core Value

Get Claude Code users off cloud-synced storage safely — no data loss, no silent failures, every action verified before and after.

## Current Milestone: v3.1.0 Hardening and Hygiene

**Goal:** Close the v3.0.1 carry-forward loop — drift-proof versioning, harden the release supply chain, and fix two decoder/audit correctness gaps — with no new feature surface.

**Target features:**
- **BUILD-01** — Seed `toolkitVersion` derived from `package.json` instead of a hardcoded literal (same drift class fixed for `--version` in v3.0.1)
- **SEC-01** — SHA-pin GitHub Actions (`checkout`, `setup-node`) + exact-pin runner npm in the publish job (the `id-token: write` job is the repo's highest-privilege surface) — MD-01
- **CLI-06** — Robust `--version` arg parsing in the mcp bin (handles `--version=foo` / `--Version`; replaces the hand-rolled `process.argv.includes('--version')`) — MD-02
- **CORE-15** — Audit project-fingerprint filter so auto-discovery stops scanning all of `C:\Users\…` (debug `audit-includes-root-paths`)
- **CORE-16** — Path-hash decode trailing-edge special-character round-trips correctly — 999.7

**Deferred to v3.2.0:** CLI-05 / 999.5 — TIER 2 streaming refactor of `spawnTool` for live MCP-driven copy progress (architectural change with real regression risk; TIER 1 stderr-status mitigation already shipped in Phase 14-11).

## Current State

**v3.0.0 shipped 2026-04-26** to npm:
- `@localground/mcp@3.0.0` — MCP server with 9 tool calls
- `@localground/cli@3.0.0` — standalone CLI with 7 commands
- `@localground/core` — shared deterministic operations library (workspace-internal, bundled into mcp + cli)
- 5 Claude Code skills: `/localground:seed`, `/localground:migrate`, `/localground:reap`, `/localground:cleanup`, `/localground:verify`
- v2.0.0 paste-and-run prompts preserved in `prompts/` as no-install fallback

**Quality gates:** 79-test Vitest suite (real-fs fixtures, no mocks) — clean exit, no teardown hang; `tsc --build` strict gate covering both src AND test files via `tsconfig.test.json`; 3-OS GitHub Actions CI (Win/Mac/Linux on Node 20.x) with Build → Strict type check → Test ordering; tag-triggered OIDC release workflow with provenance attestation (configured for v3.0.1+; v3.0.0 was published manually due to npm/cli#8544).

**v3.0.1 shipped 2026-06-29** (published to npm as **v3.0.2** after the SC5 fix-forward):
- `@localground/mcp@3.0.2` + `@localground/cli@3.0.2` live as `latest` with **SLSA-v1 provenance** — the first packages in the project's history to carry provenance (v3.0.0 was a manual, provenance-less publish)
- Both GitHub Actions workflows ran end-to-end for the first time: `ci.yml` green on the 3-OS matrix; `release.yml` OIDC-published both packages. Phase-20 validation caught a real immutable-publish defect (3.0.1 binaries misreported `3.0.0`) → fixed-forward to v3.0.2 with runtime version derivation + a CI version-equality gate
- All 5 `/localground:*` skills runtime-UAT'd against the registered MCP server (Phase 19); test infra hardened, decoder calibrated, tarballs trimmed (Phases 16-18)
- Comprehension gates AFFIRMED for Phases 19 and 20

**v3.1.0 Hardening and Hygiene — in progress (Phases 21-22 of 23 complete, 2026-06-30):** Supply chain SHA-pinned with a `pinact` CI verify-pins gate + paired OIDC floors, and the mcp `--version` parser hardened (Phase 21); the seed manifest version now derives from each package's runtime version with a tarball-level value gate, and audit *and* detect filter out home/drive/system/AppData/other-user roots via the shared `looksLikeProject` predicate while keeping marker-less plain folders discoverable (Phase 22). Only CORE-16 (decoder trailing-edge fix, Phase 23) remains.

**Codebase:** ~7,100 LOC TypeScript across `packages/`. Result-typed core (no exceptions thrown), strict TypeScript (tsc gate over src+test), tsup bundled; bins derive `--version` from `package.json` at runtime.

## Requirements

### Validated

**v1.2.0 (shipped 2026-04-11):**
- ✓ Auto-detect OS, shell, cloud sync service, and project inventory — v1.2.0
- ✓ Phased migration with verification at every step — v1.2.0
- ✓ No deletions during migration — v1.2.0
- ✓ Two-session design with generated Session 2 prompt — v1.2.0
- ✓ Five-dimension constraint model (Must/Must-not/Prefer/Escalate/Recover) — v1.2.0
- ✓ Three-way shell detection (PowerShell / bash-on-Windows / native bash) — v1.2.0
- ✓ Multi-signal prior migration detection (four-signal cascade) — v1.2.0
- ✓ Pre-copy placeholder verification (detect cloud-only stubs before copying) — v1.2.0
- ✓ Cleanup prompt with dual-mode detection (post-migration / standalone) — v1.2.0
- ✓ Individual confirmation on every deletion in cleanup — v1.2.0
- ✓ Verification prompt auditing project health, path-hash integrity, stale references — v1.2.0

**v2.0.0 (shipped 2026-04-12):**
- ✓ Sow/Reap prompt — post-migration marker verification + health checks — v2.0.0
- ✓ Seed prompt — pre-migration marker planting — v2.0.0
- ✓ Unified toolkit versioning across all prompts — v2.0.0
- ✓ All five prompts passed eight NEC prompt frameworks — v2.0.0
- ✓ LocalGround rename and repo restructure — v2.0.0

**v3.0.0 (shipped 2026-04-26):**
- ✓ Three-package monorepo (`@localground/core`, `@localground/mcp`, `@localground/cli`) with TypeScript strict mode — v3.0.0
- ✓ MCP server exposing 9 tools (detect, decode_path_hash, seed, copy, verify, health_check, audit, cleanup_scan, placeholder_check) with annotations and structured error responses — v3.0.0
- ✓ Standalone CLI with 7 commands and global `--json` flag — v3.0.0
- ✓ 5 Claude Code skills with `allowed-tools` frontmatter (gated skills use `disable-model-invocation: true`) — v3.0.0
- ✓ Vitest test suite with real-fs fixtures (no mocked filesystem) — v3.0.0
- ✓ GitHub Actions CI on Windows/macOS/Linux — v3.0.0
- ✓ npm publishing pipeline with OIDC trusted publishing and provenance — v3.0.0 (manual first publish; OIDC for v3.0.1+)
- ✓ v2.0.0 prompts preserved as no-install fallback — v3.0.0
- ✓ README documents three install paths (MCP add, CLI install, legacy prompts) including Windows `cmd /c` setup — v3.0.0
- ✓ Decoder handles Windows mixed-punctuation OneDrive paths via filesystem-listing reverse-encode — v3.0.0 (Phase 14-08 gap-closure)
- ✓ Audit auto-discovery scoped via `looksLikeProject` predicate — v3.0.0 (Phase 14-10 gap-closure)
- ✓ CLI long operations emit stderr status lines (TIER 1) gated on `!jsonMode` — v3.0.0 (Phase 14-11 gap-closure)

**v3.0.1 — Phase 16 Test Infrastructure Hardening (completed 2026-04-27):**
- ✓ `tsc --build` restored as CI quality gate covering both src and test files via root-level `tsconfig.test.json` (composite:false, noEmit:true, inherits strict family); D-18 implicit-any regression resolved (TEST-01) — v3.0.1 Phase 16
- ✓ Vitest cleanup hang eliminated via describe-scoped `afterEach` reapers tracking spawned children in MCP and CLI smoke tests (TEST-02) — v3.0.1 Phase 16
- ✓ `placeholder.test.ts` silent-precondition guard added — assertion fires before narrow guard so a forced `success=false` fails loudly (TEST-03) — v3.0.1 Phase 16
- ✓ `decode.test.ts` tautological assertion replaced with success-branch contract on `data.hashDirName` and `data.decodedPath` (TEST-04) — v3.0.1 Phase 16

**v3.0.1 — Phase 17 Core Decoder Calibration (completed 2026-04-27):**
- ✓ `encode()` regex in `packages/core/src/environment/decode.ts` calibrated against actual Claude Code CLI behavior; silent decode failures eliminated for 17 of 23 historic path-hashes (CORE-13) — v3.0.1 Phase 17

**v3.0.1 — Phase 18 Packaging Polish (completed 2026-04-27):**
- ✓ `packages/mcp/package.json` and `packages/cli/package.json` declare `"files": ["dist"]`; tarballs ship 5 files only (README, package.json, dist/index.{js,d.ts,js.map}) (PKG-01) — v3.0.1 Phase 18
- ✓ `npm pack --dry-run` regression guard scripted as `scripts/verify-tarball.mjs` and wired into `.github/workflows/ci.yml` after Build, before Test (PKG-02) — v3.0.1 Phase 18

**v3.0.1 — Phase 19 Skill Runtime UAT (completed 2026-06-28):**
- ✓ All 5 `/localground:*` skills route correctly through the registered `@localground/mcp` server and execute end-to-end against real filesystems (UAT-01..05) — proven on both the dev build and the packaged tarball (process-identity honesty gate 6/6) — v3.0.1 Phase 19
- ✓ Two-session `/localground:migrate` continuation-token loop validated across a real Claude Code restart — the only path no automated test covers (UAT-02) — v3.0.1 Phase 19

**v3.0.1 — Phase 20 Release Pipeline Validation (completed 2026-06-29, shipped as v3.0.2):**
- ✓ `ci.yml` first end-to-end run green across the 3-OS matrix on Node 20.x (PIPE-01) — v3.0.1 Phase 20
- ✓ `release.yml` OIDC-published both packages with SLSA-v1 provenance; validation caught the 3.0.1 version-misreport defect → fixed-forward to v3.0.2 (PIPE-02) — v3.0.1 Phase 20
- ✓ Per-package READMEs render on both npmjs.com pages, replacing the v3.0.0 empty-state placeholder (DOC-03) — v3.0.1 Phase 20

**v3.1.0 — Phase 21 Supply-Chain & Bin Hardening (completed 2026-06-29):**
- ✓ Both GitHub Actions workflows SHA-pinned (40-char SHA + `# vX.Y.Z` comment) with a `pinact` CI verify-pins gate; publish job exact-pins runner npm ≥11.5.1 and runs on Node ≥22.14.0 (paired OIDC floors, asserted at runtime); Dependabot `github-actions` config keeps pins updatable (SEC-01) — v3.1.0 Phase 21
- ✓ mcp bin `--version` parser robustified — recognizes `--version`, `--version=…`, `-v`, `-V`; prints the version and exits 0 without booting the stdio transport; long-form flags case-sensitive (`--Version`/`--VERSION` fall through); no arg-parser dependency added (CLI-06) — v3.1.0 Phase 21

**v3.1.0 — Phase 22 Core Versioning & Audit Filter (completed 2026-06-30):**
- ✓ Seed manifest `toolkitVersion` derives from the consuming package's runtime version (hardcoded `'3.0.2'` literal removed from `seed.ts`); both bins wired through shared `@localground/core`; `scripts/verify-tarball.mjs` extended to assert the seed-path version *value* through each package's real consumer surface (cli `seed --json` bin, mcp `localground_seed` JSON-RPC tool) on the packaged tarball (BUILD-01) — v3.1.0 Phase 22
- ✓ `looksLikeProject` tightened with two path-shape-only rejections (other-user home roots; the AppData tree via first-segment-below-home logic) while preserving D-01 marker-less plain-folder discovery; `detect` wired to `.filter(looksLikeProject)` on both consumers so audit and detect filter identically; a 12-test regression-lock suite locks root-rejection AND plain-folder discovery (CORE-15) — v3.1.0 Phase 22

### Active

**v3.1.0 Hardening and Hygiene — scoped 2026-06-29.** Five requirements (see `.planning/REQUIREMENTS.md`); phases start at 21. Four of five validated — SEC-01 + CLI-06 (Phase 21) and BUILD-01 + CORE-15 (Phase 22); see ### Validated above. One remains:

- ◻ **CORE-16** — Path-hash decode trailing-edge special-character round-trip fix (999.7) — Phase 23 (next)

### Backlog (captured in ROADMAP.md `## Backlog`, 999.x numbering)

- **999.5** TIER 2 streaming refactor of spawnTool — deferred to v3.1.0 (architectural change; TIER 1 mitigation already shipped)
- **999.7** path-hash decode edge defect (trailing-edge special character) — deferred to v3.1.0

### Out of Scope

- Automation of cloud sync pause/resume — too fragile across services, risk of false confidence in file locality
- Multi-user or team migration workflows — these are individual-user tools
- Interactive/TUI elements — one file, one paste, user drives through confirmation gates (legacy prompts) / structured tool calls drive (v3.0.0 hybrid)
- CONTRIBUTING.md — zero contributors, no signal anyone needs contribution guidance yet
- Scheduled re-verification — contradicts one-paste design; "consider re-running" recommendations in reports are sufficient
- Comparison mode (audit two states) — heavy feature for unclear value; defer until someone actually requests it
- Remote/cloud MCP server — LocalGround operates on local filesystem; stdio transport is correct
- Persistent background daemon — Claude Code manages MCP lifecycle; no daemon needed
- GUI or TUI — Claude Code is the UI layer; CLI outputs structured data
- Auto-deletion in MCP tools — safety model: scan tool returns candidates, skill collects confirmation, then executes
- Cross-platform shell emulation — platform-specific tools (robocopy/rsync) are more reliable than abstractions
- Configuration file (`.localgroundrc`) — fixed safety model should not be configurable; CLI flags for one-time options
- Monorepo tooling beyond npm workspaces — three packages with simple deps; Turborepo/Lerna/Nx are overkill
- MCP SDK v2 migration — build on stable v1.x; upgrade when v2 stabilizes (migration will be mechanical)
- Webpack/Rollup bundling — Node.js tools via npm; tsup handles compilation; no bundler needed

## Context

- Project originated from Robert LaSalle's own OneDrive-to-local migration (April 9-10, 2026)
- Generalized into a distributable tool through iterative review against NEC prompt frameworks
- v1.2.0 milestone shipped 2026-04-11 — three prompts (migration, cleanup, verification)
- v2.0.0 milestone shipped 2026-04-12 — five prompts (added seed + reap), unified versioning, LocalGround rename
- v3.0.0 milestone shipped 2026-04-26 — hybrid architecture: MCP server + CLI + skills, with v2.0.0 prompts preserved as fallback. 14 days, 30 plans, 160 commits, 5,877 LOC TypeScript.
- v3.0.0 brainstorm context preserved in `docs/design/v3-brainstorm-context.md` — captured during v2.0.0 audit gap remediation when NEC findings revealed most issues stemmed from ambiguity in deterministic operations that code would handle without ambiguity
- Repo public on GitHub: `Technically-A-Mechanical-Engineer/localground`
- Project owner is not a developer — uses Claude Code as a workflow automation tool. First major npm publishing flow completed in v3.0.0 (manual first publish + OIDC for subsequent).
- Every Claude Code user has Node.js installed — `npx` is zero-install for the target audience.
- Two pipelines (`ci.yml` + `release.yml`) are structurally verified but unexecuted at v3.0.0 close — first runs land at v3.0.1.

## Constraints

- **Distribution format**: Three install paths supported — `claude mcp add @localground/mcp` for MCP server integration, `npx @localground/cli` for direct terminal usage, paste-and-run prompts in `prompts/` as no-install fallback.
- **Platform support**: Windows (PowerShell and Git Bash), macOS (zsh/bash), Linux (bash). Platform detection handled deterministically in code (core library).
- **Runtime**: Node.js >=20.0.0 for v3.0.0 packages. Claude Code CLI as of April 2026 for MCP integration.
- **Safety**: v2.0.0 safety model preserved in v3.0.0 — migration never deletes, cleanup deletes only with confirmed local copy, verification never modifies. Now enforced in code (Result types, no thrown exceptions from core) rather than natural language instructions.
- **Testing**: Deterministic core gets automated tests (Vitest with real-fs fixtures); skills get manual UAT against reduced surface area. CI matrix on three OSes.
- **Backward compatibility**: v2.0.0 prompts remain functional in `prompts/` directory.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Three independent prompts (v1.2.0) | Simple scales — each prompt works standalone. Cross-references by filename, no runtime dependency. | ✓ Validated in v1.2.0 |
| Cleanup prompt has dual-mode detection (v1.2.0) | Works whether user ran migration prompt or not. | ✓ Validated in v1.2.0 |
| No automation of cloud sync pause/resume | Commands undocumented, version-dependent, service-specific. Silent failure would give false confidence. | ✓ Good |
| Prompts, not agents (v1.2.0/v2.0.0) | One-shot playbooks driven by user through confirmation gates. No autonomy, no scheduling. | ✓ Good for v2.0.0; partially superseded by v3.0.0 skills (which are still user-driven, not autonomous) |
| Graceful cross-prompt state (v1.2.0) | Each prompt interprets missing path-hash directories as possible cleanup, not corruption. | ✓ Validated in v1.2.0 |
| Unified toolkit versioning (v2.0.0) | Per-prompt versions create bookkeeping overhead. One toolkit version eliminates the matrix. | ✓ Validated in v2.0.0 |
| Hybrid architecture (v3.0.0) | NEC findings revealed v2.0.0 ambiguity stemmed from deterministic operations encoded in natural language. Code handles those without ambiguity; skills handle judgment. | ✓ Validated in v3.0.0 |
| npm workspaces (not Turborepo/Lerna/Nx) — v3.0.0 | Three packages with simple deps; abstractions premature. | ✓ Validated in v3.0.0 |
| MCP SDK v1.x (not v2) — v3.0.0 | Build on stable; v2 still pre-stable as of April 2026. | ✓ Validated in v3.0.0 |
| tsup for compilation, Vitest for testing — v3.0.0 | Native ESM, faster, integrates cleanly. | ✓ Validated in v3.0.0 |
| Bundle Option A: `noExternal` core in mcp/cli — v3.0.0 | Core stays private; mcp + cli inline its source via tsup. Required moving core to `devDependencies` to avoid phantom runtime dep. | ✓ Validated in v3.0.0 (post-fix) |
| Manual first publish + OIDC for subsequent — v3.0.0 | npm/cli#8544: pre-publish trusted-publisher config not possible. v3.0.0 lacks provenance; v3.0.1+ has full OIDC + provenance. | ✓ Pragmatic — accepts trade-off for first publish |
| Result type pattern (`Result<T, R>`) — v3.0.0 | Discriminated union; consumers narrow before access; type system enforces error handling at every call site. | ✓ Validated in v3.0.0 |
| Stderr-only logging in MCP server — v3.0.0 | Stdout reserved for JSON-RPC; CRIT-1 invariant. | ✓ Validated in v3.0.0 (`stdout-discipline.test.ts` enforces) |
| `--json` flag on every CLI command — v3.0.0 | Stdout = JSON in JSON mode; stderr = status, suppressed in JSON mode. | ✓ Validated in v3.0.0 |
| Real-fs test fixtures (not mocked) — v3.0.0 | Phase 14 found Windows reparse-point and OneDrive-path bugs that mocks cannot reproduce. | ✓ Validated in v3.0.0 (caught real platform bugs) |
| Filesystem-listing reverse-encode decoder — v3.0.0 | Sidesteps separator-guessing; any folder that physically exists decodes correctly. | ✓ Validated in v3.0.0 (closed UAT Defect B) |
| Path-shape-only `looksLikeProject` predicate — v3.0.0 | No `.git`/`package.json` marker check. Supports plain-folder projects (D-01) without polluting audit with root paths. | ✓ Validated in v3.0.0 |
| WR-01 (encode regex calibration) closed via Phase 17 — regex widened to cover seven CORE-13 char classes (apostrophe, ampersand, brackets, plus, equals, percent) | Defensive/forward-looking widening; 17/17 currently-extant path-hashes already round-trip and 6/6 `no_candidates` failures are documented as deleted source folders. Targeted, not catch-all (D-01). | ✓ Validated in v3.0.1 — see [`.planning/phases/17-core-decoder-calibration/17-VERIFICATION.md`](phases/17-core-decoder-calibration/17-VERIFICATION.md) |
| OIDC trusted publishing (no stored token) + Node 22 / npm≥11.5.1 on the release job — v3.0.1 | Write-enabled npm tokens now expire ≤90 days (a maintenance trap for a non-dev maintainer); a failed OIDC attempt publishes nothing and is retryable. Node 22 bundles npm 10.9.x — BELOW npm's 11.5.1 OIDC floor — so the publish job must `npm install -g npm@^11.5.1`. | ✓ Validated in v3.0.1 (4-attempt recovery confirmed the floor; pure-OIDC publish + provenance) |
| Runtime `--version` derivation from `package.json` + CI version-equality gate — v3.0.1 | A manifest-only bump left hardcoded `--version` literals emitting the old version (3.0.1 binaries printed 3.0.0). Derive, don't duplicate; assert built-version == manifest in verify-tarball. | ✓ Validated in v3.0.1 (the gate that would have blocked 3.0.1; clean v3.0.2) |
| Fix-forward over unpublish on the bad 3.0.1 — v3.0.1 | Published npm versions are immutable — cannot replace or republish a version. Fixing forward to 3.0.2 is the only correct recovery. | ✓ Validated in v3.0.1 |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-30 — v3.1.0 Phase 22 (Core Versioning & Audit Filter) complete; BUILD-01 + CORE-15 validated. Four of five v3.1.0 requirements done (SEC-01/CLI-06 Phase 21; BUILD-01/CORE-15 Phase 22); only CORE-16 remains (Phase 23). Reconciled the Active block that Phase 21's completion left stale. Next: plan Phase 23.*
