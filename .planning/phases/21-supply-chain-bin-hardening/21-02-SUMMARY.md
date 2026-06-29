---
phase: 21-supply-chain-bin-hardening
plan: "02"
subsystem: mcp-bin
tags: [cli-06, version-predicate, spawn-discipline, smoke-tests]
dependency_graph:
  requires: [21-01]
  provides: [robust-mcp-version-predicate, version-predicate-smoke-tests]
  affects: [packages/mcp/src/index.ts, packages/mcp/test/smoke.test.ts]
tech_stack:
  added: []
  patterns: [pre-transport-short-circuit, hand-rolled-predicate, tracked-spawn-reaper, positive-handshake-proof]
key_files:
  created: []
  modified:
    - packages/mcp/src/index.ts
    - packages/mcp/test/smoke.test.ts
decisions:
  - "isVersionRequest() helper extracted (module-scope) for readability and direct testability; D-12/D-13/D-14 all hold either way"
  - "Positive-handshake proof chosen for fall-through tests — weaker bounded-window 'did not exit within Nms' form explicitly rejected per plan WARNING 3"
  - "trackedSpawnServer(args) signature change is backward-compatible (args defaults to []); existing no-arg call sites unchanged"
metrics:
  duration_minutes: 8
  completed_date: "2026-06-29"
  tasks_completed: 3
  files_changed: 2
---

# Phase 21 Plan 02: MCP Bin Version Predicate Summary

Robust hand-rolled `isVersionRequest()` predicate replacing brittle `process.argv.includes('--version')`, recognizing `--version`, `--version=…`, `-v`, `-V`; case-sensitive fall-through for `--Version`/`--VERSION`/`--versions`/`--versioned`; all locked by smoke tests with tracked-child reaping.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Widen version-request predicate (D-12, D-13, D-14) | 63973cd | packages/mcp/src/index.ts |
| 2 | Add smoke tests — match + case-sensitive fall-through with child reaping | a885f2a | packages/mcp/test/smoke.test.ts |
| 3 | Confirm verify-tarball CLI-06 contract still passes | (no file change) | scripts/verify-tarball.mjs (unchanged) |

## What Was Built

**Task 1 — `packages/mcp/src/index.ts`**

Extracted a module-scope `isVersionRequest(argv: string[]): boolean` helper that matches:
- `arg === '--version'` — bare exact form (the verify-tarball contract)
- `arg.startsWith('--version=')` — prefix/equals form
- `arg === '-v'` — short lowercase alias
- `arg === '-V'` — short uppercase alias

`main()` now calls `if (isVersionRequest(process.argv.slice(2)))` replacing the bare `process.argv.includes('--version')`. The body (stdout write + `process.exit(0)`) and its position before `new StdioServerTransport()` are unchanged. No commander/yargs import added (D-14).

**Task 2 — `packages/mcp/test/smoke.test.ts`**

- `spawnServer(args: string[] = [])` and `trackedSpawnServer(args: string[] = [])` — backward-compatible signature change
- New `describe('MCP bin --version predicate')` block with its own `children[]` + `afterEach` reaper
- Match tests (D-12): `--version`, `--version=x`, `-v`, `-V` — each asserts `exit 0` + `stdout.trim() === pkgVersion`
- Fall-through tests (D-13): `--Version`, `--VERSION`, `--versions`, `--versioned` — each proven by a successful `handshake()` call (positive JSON-RPC initialize proof; no flaky bounded-window check)
- Version read from `packages/mcp/package.json` at test time — no hardcoded literal

**Task 3 — verify-tarball regression**

`npm run verify:tarball` exits 0. `scripts/verify-tarball.mjs` was not modified.

Output:
```
[verify-tarball] @localground/mcp: dry-run shape check
[verify-tarball] @localground/mcp: pack + install + --version
[verify-tarball] @localground/mcp: OK (version=3.0.2)
[verify-tarball] @localground/cli: dry-run shape check
[verify-tarball] @localground/cli: pack + install + --version
[verify-tarball] @localground/cli: OK (version=3.0.2)
[verify-tarball] All packages verified
```

## Verification Results

```
npm test — 93 passed, 2 skipped (16 test files)

MCP bin --version predicate:
  ✓ prints version and exits 0 for --version
  ✓ prints version and exits 0 for --version=x
  ✓ prints version and exits 0 for -v
  ✓ prints version and exits 0 for -V
  ✓ falls through to server startup (handshake succeeds) for --Version
  ✓ falls through to server startup (handshake succeeds) for --VERSION
  ✓ falls through to server startup (handshake succeeds) for --versions
  ✓ falls through to server startup (handshake succeeds) for --versioned

npm run verify:tarball — exit 0 (bare --version contract intact)
```

## Deviations from Plan

None — plan executed exactly as written.

The `isVersionRequest()` helper form (vs inline check) was the planner's preferred recommendation and was adopted — this is Claude's Discretion as noted in the plan, not a deviation.

## Threat Mitigations Applied

| Threat ID | Status |
|-----------|--------|
| T-21-08 — DoS: transport hang on missed version flag (`-v`) | MITIGATED — predicate now matches `-v`/`-V`/`--version=…` |
| T-21-09 — Tampering: over-broad predicate swallowing fall-through flags | MITIGATED — case-sensitive exact long-form; locked by handshake smoke tests |
| T-21-10 — Supply-chain: commander/yargs dep expansion | MITIGATED — hand-rolled predicate, no parser dep added |
| T-21-11 — Repudiation: silent stdout contract drift | MITIGATED — `verify:tarball` regression gate passed; script unchanged |
| T-21-14 — Resource leak: hung fall-through test child | MITIGATED — all version-flag spawns via `trackedSpawnServer(args)`; reaped in `afterEach` |

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes introduced.

## Self-Check: PASSED

- `packages/mcp/src/index.ts` — modified, `isVersionRequest` helper present, `process.argv.includes('--version')` removed
- `packages/mcp/test/smoke.test.ts` — modified, `describe('MCP bin --version predicate')` block present
- `scripts/verify-tarball.mjs` — unchanged (no diff)
- Commit `63973cd` — exists (`feat(21-02): widen mcp bin version-request predicate`)
- Commit `a885f2a` — exists (`test(21-02): add version-predicate smoke tests with child reaping`)
- `npm test` — 93 passed, 0 failures
- `npm run verify:tarball` — exit 0
