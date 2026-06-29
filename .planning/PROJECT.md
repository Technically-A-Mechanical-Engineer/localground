# LocalGround Toolkit for Claude Code

## What This Is

A toolkit that helps Claude Code CLI users migrate project folders off cloud-synced storage, verify migration integrity, clean up stale artifacts, and audit environment health. As of v3.0.0, the toolkit ships in three forms: (1) MCP server (`@localground/mcp`) — exposes 9 operations as native Claude Code tool calls via the Model Context Protocol; (2) standalone CLI (`@localground/cli`) — 7 commands for terminal or scripted use via `npx`; (3) paste-and-run prompts in `prompts/` — the original v2.0.0 no-install fallback. A Claude Code plugin packages the 5 workflow skills (`/localground:seed`, `/localground:migrate`, `/localground:reap`, `/localground:cleanup`, `/localground:verify`) for one-command installation. Target audience: Claude Code users hitting git errors, file lock failures, or sync conflicts from working in OneDrive, Dropbox, Google Drive, or iCloud folders.

## Core Value

Get Claude Code users off cloud-synced storage safely — no data loss, no silent failures, every action verified before and after.

## Current Milestone: v3.0.1 — Validation and Hardening

**Goal:** Validate that v3.0.0 actually works end-to-end at runtime (skills + pipelines), close the known correctness gap in path-hash decoding, and reduce npm tarball weight — all while v3.0.0 implementation context is still warm.

**Target features:**

- Execute UAT Tests 12-16 against the registered `@localground/mcp` server — Test 15 (`/localground:migrate` two-session orchestration) is the only test that exercises the continuation-token loop and `localground-migrate-state.json` handoff
- Land first end-to-end runs of `ci.yml` (3-OS matrix on master push) and `release.yml` (OIDC + provenance on v3.0.1 tag)
- Restore `tsc --build` as a CI quality gate, eliminate the Vitest cleanup hang on `npm test` exit, and close two LOW-severity test hygiene findings (L-01, L-02)
- Trim npm tarball download size by adding `"files": ["dist"]` to `packages/mcp/package.json` and `packages/cli/package.json`
- Calibrate the `encode()` regex in `packages/core/src/environment/decode.ts` against actual Claude Code CLI behavior so silent decode failures stop slipping through (WR-01)

**Key context:** v3.0.0 closed with two pipelines structurally verified but unexecuted, five UAT tests blocked behind MCP-server registration, and one regex correctness gap (6 of 23 path-hashes returned `no_candidates` on the user's machine, root cause undetermined). The TIER 2 streaming refactor of `spawnTool` (999.5) is deliberately deferred to v3.1.0 — TIER 1 mitigation already shipped, and the architectural change carries enough risk surface to belong in a minor release.

## Current State

**v3.0.0 shipped 2026-04-26** to npm:
- `@localground/mcp@3.0.0` — MCP server with 9 tool calls
- `@localground/cli@3.0.0` — standalone CLI with 7 commands
- `@localground/core` — shared deterministic operations library (workspace-internal, bundled into mcp + cli)
- 5 Claude Code skills: `/localground:seed`, `/localground:migrate`, `/localground:reap`, `/localground:cleanup`, `/localground:verify`
- v2.0.0 paste-and-run prompts preserved in `prompts/` as no-install fallback

**Quality gates:** 79-test Vitest suite (real-fs fixtures, no mocks) — clean exit, no teardown hang; `tsc --build` strict gate covering both src AND test files via `tsconfig.test.json`; 3-OS GitHub Actions CI (Win/Mac/Linux on Node 20.x) with Build → Strict type check → Test ordering; tag-triggered OIDC release workflow with provenance attestation (configured for v3.0.1+; v3.0.0 was published manually due to npm/cli#8544).

**v3.0.1 progress:** Phases 16-18 complete 2026-04-27 — TEST-01..04 (test infra), CORE-13 (decoder calibration), PKG-01..02 (packaging polish) validated. Phases 19-20 (skill UAT, release pipeline validation) remain.

**Codebase:** 5,877 LOC TypeScript across 47 `.ts` files in `packages/`. Result-typed core (no exceptions thrown), strict TypeScript, tsup bundled.

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

### Active

**v3.0.1 — Validation and Hardening (in progress):**

- [ ] UAT Tests 12-16 executed end-to-end with `@localground/mcp` registered in Claude Code; Test 15 validates two-session continuation-token loop and state-file handoff (promoted from 999.1)
- [ ] `ci.yml` first run on master green across the 3-OS matrix on Node 20.x (promoted from 999.2)
- [ ] `release.yml` first OIDC + provenance publish lands successfully on v3.0.1 tag (promoted from 999.2)

### Backlog (captured in ROADMAP.md `## Backlog`, 999.x numbering)

- **999.5** TIER 2 streaming refactor of spawnTool — deferred to v3.1.0 (architectural change; TIER 1 mitigation already shipped)

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
*Last updated: 2026-04-27 after Phase 18 (Packaging Polish) complete — PKG-01 and PKG-02 satisfied; tarball regression guard wired into ci.yml; remaining v3.0.1 work covers Phases 19-20 (skill UAT, release pipeline validation).*
