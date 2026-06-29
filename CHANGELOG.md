# Changelog

All notable changes to the LocalGround Toolkit will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.2] - 2026-06-29

### Fixed
- `@localground/cli` and `@localground/mcp` `--version` reported `3.0.0` in 3.0.1 because the version was a hardcoded source literal not updated by the version bump. Both now derive their version from `package.json` at runtime (single source of truth).
- `scripts/verify-tarball.mjs` now asserts the built bin's `--version` output equals the package manifest version (previously only checked semver shape), so version drift fails CI.

### Changed
- README section headers are version-agnostic; version history is tracked in this file.

### Note
- 3.0.1 is superseded by 3.0.2 and should not be used (its published binaries misreport their version as 3.0.0).

## [3.0.0] - 2026-04-26

### Added
- `@localground/core` — shared library with 12 deterministic operations: environment detection (platform, cloud service, path-hash decode/encode/classify), integrity checks (SHA-256 checksum, source/target compare, cloud placeholder detection, git fsck), and file operations (copy, seed, verify, scan, chunk for MCP timeout windows). Stays internal (not published to npm); bundled into the published packages.
- `@localground/mcp` — MCP server exposing 9 tools to Claude Code: `localground_detect`, `localground_decode_path_hash`, `localground_seed`, `localground_copy`, `localground_verify`, `localground_health_check`, `localground_audit`, `localground_cleanup_scan`, `localground_placeholder_check`. Uses stdio transport; stdout reserved for JSON-RPC, all logging on stderr. Long operations (copy, audit) emit progress notifications.
- `@localground/cli` — standalone command-line interface with 7 Commander commands: `detect`, `seed`, `copy`, `verify`, `reap`, `audit`, `cleanup-scan`. Every command supports `--json` for machine-readable output. Distributed via `npx` for zero-install usage.
- Five Claude Code skills (`/localground:seed`, `/localground:migrate`, `/localground:reap`, `/localground:cleanup`, `/localground:verify`) — guided workflows that orchestrate the MCP tools with confirmation gates.
- Vitest test suite covering all 12 core functions (deep unit tests with real `os.tmpdir()` fixtures) plus thin smoke tests for the MCP server and CLI.
- GitHub Actions CI on Windows, macOS, and Linux runners (Node 20.x). Tag-triggered npm publish workflow with OIDC trusted publishing and provenance attestation — no stored npm tokens.

### Changed
- Architecture: three-layer split (core library / MCP server / CLI) replaces the single-prompt distribution model. Same safety guarantees (no deletions in MCP tools, verification at every step) now enforced in code instead of prompt instructions.
- Distribution: now available three ways. Add the MCP server (`claude mcp add`) for native Claude Code tool calls; run the CLI directly (`npx @localground/cli`) for one-off terminal operations; or paste the v2.0.0 prompts (still in `prompts/`) for the no-install path.

### Preserved
- All five v2.0.0 paste-and-run prompts in `prompts/` remain frozen and functional as the no-install fallback (INFRA-06). They are not changed in this release; bug fixes to v2 prompts will land in their own future phase.

## [2.0.0] - 2026-04-12

### Added
- Five paste-and-run Markdown prompts that Claude Code users paste into the terminal: `localground-seed.md`, `localground-migration.md`, `localground-reap.md`, `localground-cleanup.md`, `localground-verification.md`.
- Three-way shell detection (PowerShell / Git Bash / native bash/zsh) and platform-specific commands throughout.
- Five-dimension constraint architecture (Must / Must-not / Prefer / Escalate / Recover) governing all prompt behavior.
- Two-session migration design — the migration prompt copies files in Session 1 and migrates Claude Code settings in Session 2 (a relaunch from the new path is required to generate correct path-hash directories).
- Verifiable migration via seed markers — the seed prompt plants a test file and a git tag before migration; the reap prompt verifies they survived the copy.
- Per-prompt safety models. Migration never deletes. Cleanup deletes only with individual confirmation and a verified local copy. Verification never modifies files.

### Changed
- Renamed the post-migration health check prompt from `sow` to `reap` for clearer paired-naming with `seed`.

## [1.2.0] - 2026-04-11

### Added
- Initial cloud-sync migration toolkit with four prompts (Migration, Cleanup, Verification, Documentation). Predecessor to the v2.0.0 unified five-prompt format.
