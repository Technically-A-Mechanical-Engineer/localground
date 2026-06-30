# LocalGround Toolkit for Claude Code

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Technically-A-Mechanical-Engineer/localground)

A toolkit that helps Claude Code users migrate off cloud-synced storage — with pre-migration verification, migration, post-migration health checks, cleanup, and environment auditing. Since v3.0.0, ships in three forms: an MCP server (`@localground/mcp`) for native Claude Code tool calls, a standalone CLI (`@localground/cli`) for direct terminal use, and the original v2.0.0 paste-and-run prompts as a no-install fallback.

## The Problem

Working in cloud-synced folders (OneDrive, Dropbox, Google Drive, iCloud) causes git errors, file lock failures, and sync conflicts in Claude Code. These services try to sync `.git` internals and Claude Code's settings directories, which breaks things in ways that are hard to diagnose.

## Quick Install

| Path | When to use | Install |
|---|---|---|
| **MCP server** | You want Claude Code to invoke LocalGround tools natively, with conversational guidance. | `claude mcp add --transport stdio localground -- npx -y @localground/mcp` (see Windows note below) |
| **Standalone CLI** | You want one-off commands or scripted automation outside Claude Code. | `npx -y @localground/cli detect` (no installation needed) |
| **Paste-and-run prompts** | You don't want to install anything. | Copy a prompt file from [`prompts/`](prompts/) and paste it into Claude Code CLI. |

All three paths share the same safety model: migration never deletes, cleanup deletes only with individual confirmation and a verified local copy, verification never modifies anything.

> **Skills (plugin form):** The five workflows above are also exposed as Claude Code skills under the `localground` plugin namespace — `/localground:seed`, `/localground:migrate`, `/localground:reap`, `/localground:cleanup`, `/localground:verify` — which route to the same MCP tools. Packaged plugin distribution (marketplace install) is being finalized in a later release; until then, use the MCP server, CLI, or prompts above.

## MCP Server

Add the LocalGround MCP server to Claude Code to invoke all operations as native tool calls.

### Installation

**macOS / Linux:**
```bash
claude mcp add --transport stdio localground -- npx -y @localground/mcp
```

**Windows (PowerShell or Command Prompt):**
```bash
claude mcp add --transport stdio localground -- cmd /c npx -y @localground/mcp
```

> **Windows users:** The `cmd /c` prefix is required. Without it, Claude Code cannot spawn `npx` on Windows because `npx` is a batch script (`.cmd` file), not a native executable. This is the most common setup failure on Windows — do not omit it.

### Available Tools

After registration, Claude Code can call these tools directly:

| Tool | Operation | Read-only? |
|------|-----------|------------|
| `localground_detect` | Detect OS, shell, cloud service, projects, path-hashes | Yes |
| `localground_decode_path_hash` | Decode a `.claude/projects/` directory name to a filesystem path | Yes |
| `localground_seed` | Plant verifiable markers before migration | No |
| `localground_copy` | Copy a project directory with chunked operation and verification | No |
| `localground_verify` | Verify seed markers against manifest | Yes |
| `localground_health_check` | Run 6 health checks on a project (git, placeholders, cloud sync, path-hashes, seed markers, source/target alignment) | Yes |
| `localground_audit` | Environment-wide read-only audit with incremental findings | Yes |
| `localground_cleanup_scan` | Identify stale/orphan/source candidates without deleting | Yes |
| `localground_placeholder_check` | Detect cloud placeholder files in a directory | Yes |

## CLI

Run LocalGround operations directly from your terminal without registering an MCP server. Useful when you want a one-off command, or when you are not running Claude Code interactively.

### Installation

No installation required. The CLI runs through `npx`, which downloads the package on first use:

```bash
# Detect what is on your machine (read-only)
npx -y @localground/cli detect

# Audit the environment (read-only, traffic-light findings)
npx -y @localground/cli audit

# Plant migration markers (writes a test file + git tag)
npx -y @localground/cli seed /path/to/your/project

# Copy a project safely (never deletes the source)
npx -y @localground/cli copy /path/to/source /path/to/destination

# Verify markers survived a copy
npx -y @localground/cli verify /path/to/migrated/project

# Run the six post-migration health checks
npx -y @localground/cli reap /path/to/migrated/project

# Identify cleanup candidates (read-only, no deletion)
npx -y @localground/cli cleanup-scan
```

All commands support `--json` for machine-readable output:

```bash
npx -y @localground/cli detect --json
```

Status messages (e.g., progress lines from a long copy) print to stderr; the JSON output prints to stdout. Pipe stdout to `jq` or save it to a file without losing the status output:

```bash
npx -y @localground/cli audit --json | jq '.findings[] | select(.severity == "fail")'
```

Unlike the MCP server, the CLI does not require the Windows `cmd /c` prefix — `npx` runs directly because you are typing the command interactively, not having Claude Code spawn it.

## Paste-and-Run Prompts (v2.0.0 Fallback)

Five independent markdown prompts that work without any installation. Each prompt is a single file. Copy the entire file and paste it into Claude Code CLI.

| Order | Prompt | File | What It Does | When to Run |
|-------|--------|------|-------------|-------------|
| 1 | **Seed** | [`prompts/localground-seed.md`](prompts/localground-seed.md) | Plants verifiable markers (test file + git tag) in a project before migration. | Before migrating — plant markers to verify copy integrity later. |
| 2 | **Migration** | [`prompts/localground-migration.md`](prompts/localground-migration.md) | Copies project folders from cloud storage to local paths. Never deletes originals. Two-session design. | When you're ready to move off cloud storage. |
| 3 | **Reap** | [`prompts/localground-reap.md`](prompts/localground-reap.md) | Verifies seed markers survived the copy and runs six health checks on the migrated project. | After migration — confirms everything survived intact. |
| 4 | **Cleanup** | [`prompts/localground-cleanup.md`](prompts/localground-cleanup.md) | Removes stale path-hash directories, orphan entries, and source folders after migration. | After you've confirmed the migration is good. |
| 5 | **Verification** | [`prompts/localground-verification.md`](prompts/localground-verification.md) | Audits project health, path-hash integrity, and stale references. Read-only. | Any time — before migration, after migration, after cleanup. |

Each prompt works independently. Seed and Reap are designed as a pair but neither requires the other. The remaining three prompts function standalone.

### How to Use

**Seed (optional — before migration):**
1. Download [`prompts/localground-seed.md`](prompts/localground-seed.md)
2. Open Claude Code CLI from the project you plan to migrate
3. Copy the entire contents of the file and paste it as your first message
4. The prompt plants a test file and git tag that the Reap prompt can verify after migration

**Migration:**
1. Download [`prompts/localground-migration.md`](prompts/localground-migration.md)
2. Open Claude Code CLI from your current (cloud-stored) project folder: `claude --dangerously-skip-permissions` (recommended — avoids cancelled tool calls during parallel file operations; see the migration prompt for details)
3. Copy the entire contents of the file and paste it as your first message
4. Follow the prompts — Session 1 copies folders, Session 2 migrates settings

**Reap (after migration):**
1. Download [`prompts/localground-reap.md`](prompts/localground-reap.md)
2. Open Claude Code CLI from the migrated project's new local folder
3. Copy the entire contents of the file and paste it as your first message
4. The prompt checks for seed markers and runs six health checks — results are reported with pass/fail evidence

**Cleanup (after confirming migration):**
1. Download [`prompts/localground-cleanup.md`](prompts/localground-cleanup.md)
2. Open Claude Code CLI from your local project folder
3. Copy the entire contents of the file and paste it as your first message
4. The prompt works with or without migration artifacts — it detects everything independently

**Verification (audit at any time):**
1. Download [`prompts/localground-verification.md`](prompts/localground-verification.md)
2. Open Claude Code CLI from your local project folder
3. Copy the entire contents of the file and paste it as your first message
4. Review the traffic light summary and findings — each finding includes a plain-language explanation and recommended next step

## Who This Is For

Claude Code users whose projects are in OneDrive, Dropbox, Google Drive, or iCloud-synced folders — or who have already migrated and want to verify health or clean up what's left behind.

## Requirements

- **Claude Code CLI** (terminal or IDE extension). This toolkit does not work in claude.ai web, Claude desktop app, or Cowork mode.
- **Node.js >= 20.0.0** for the MCP server and CLI. Not required if you only use the v2.0.0 paste-and-run prompts.
- **Platform:** Windows (PowerShell or Git Bash), macOS (zsh/bash), or Linux (bash)
- **git** installed and available in your shell

All five prompts and the CLI use three-way shell detection to provide platform-correct commands throughout. The MCP server selects platform-appropriate tools (robocopy on Windows, rsync on macOS/Linux) deterministically.

## Documentation

| File | Purpose |
|------|---------|
| [`CHANGELOG.md`](CHANGELOG.md) | Full version history (Keep a Changelog 1.1.0 format) |
| [`docs/dev-status/dev-status-seed.md`](docs/dev-status/dev-status-seed.md) | Seed prompt build summary, NEC evaluation, testing plan |
| [`docs/dev-status/dev-status-migration.md`](docs/dev-status/dev-status-migration.md) | Migration prompt version history, test results, findings |
| [`docs/dev-status/dev-status-reap.md`](docs/dev-status/dev-status-reap.md) | Reap prompt build summary, NEC evaluation, testing plan |
| [`docs/dev-status/dev-status-cleanup.md`](docs/dev-status/dev-status-cleanup.md) | Cleanup prompt build summary, NEC evaluation, testing plan |
| [`docs/dev-status/dev-status-verification.md`](docs/dev-status/dev-status-verification.md) | Verification prompt build summary, NEC evaluation, testing plan |
| [`docs/evaluations/`](docs/evaluations/) | Per-prompt NEC framework evaluations |
| [`docs/design/2026-04-10-localground-toolkit-design.md`](docs/design/2026-04-10-localground-toolkit-design.md) | Approved design spec for the v3.0.0 expansion |
| [`docs/design/v3-brainstorm-context.md`](docs/design/v3-brainstorm-context.md) | v3.0.0 design context captured during v2.0.0 audit gap remediation |

## Design Principles

- **Safety first.** Migration never deletes. Cleanup deletes only with individual confirmation and verified local copy. Verification never modifies.
- **Verifiable migration.** Seed markers planted before migration are verified after — no trust, only evidence.
- **Auto-detect first, ask second.** If it can be determined from the filesystem, the toolkit doesn't ask.
- **One file, one paste (prompts) — or one command (CLI/MCP).** No plugins, no servers, no config files.
- **Platform-correct commands.** Three-way shell detection in prompts; deterministic platform selection in code.
- **Graceful coexistence.** Each tool interprets missing artifacts as possible prior cleanup, not corruption.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the full version history.

## License

MIT
