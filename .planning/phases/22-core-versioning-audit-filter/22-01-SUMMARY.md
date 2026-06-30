---
phase: 22-core-versioning-audit-filter
plan: 01
subsystem: core/operations, mcp, cli, scripts
tags: [build-01, version-drift, seed, mcp, cli, tarball-verification]
dependency_graph:
  requires: []
  provides: [BUILD-01, seed-version-parameterization, tarball-seed-value-gate]
  affects: [packages/core, packages/mcp, packages/cli, scripts/verify-tarball.mjs]
tech_stack:
  added: []
  patterns:
    - "Option A: toolkitVersion param injected at call site — no build-config change, no ambient global"
    - "Result<T,R> discipline: seed() adds no throw, no new exit branch"
    - "Spawn discipline: array args, never shell:true; git via spawnSync; node via process.execPath"
    - "MCP JSON-RPC verification: StdioClientTransport driver written into tmpDir; imports resolve from installed tree"
key_files:
  created: []
  modified:
    - packages/core/src/operations/seed.ts
    - packages/mcp/src/index.ts
    - packages/cli/src/index.ts
    - packages/core/test/operations/seed.test.ts
    - packages/core/test/operations/verify.test.ts
    - scripts/verify-tarball.mjs
decisions:
  - "D-01: Option A — seed() parameterized with toolkitVersion; no tsup define, no ambient global, no runtime package.json read in core"
  - "D-02: All 7 existing seed() calls + new value-equality test; TOOLKIT_VERSION = '9.9.9-test' constant"
  - "D-03: Real consumer surface verified — CLI bin `seed --json` + MCP JSON-RPC `localground_seed` tool via StdioClientTransport"
  - "Rule 1 auto-fix: verify.test.ts 3 seed() calls updated to 2-arg form (same signature change, not in plan scope)"
metrics:
  duration: "~20 minutes"
  completed: "2026-06-30"
  tasks: 3
  files: 6
---

# Phase 22 Plan 01: Core Versioning & Audit Filter (BUILD-01) Summary

**One-liner:** Eliminate `toolkitVersion: '3.0.2'` literal in seed.ts via Option-A parameterization; both bins wire their runtime version; tarball-level gate exercises CLI bin `seed --json` and MCP JSON-RPC `localground_seed` tool to assert value equality.

## What Was Built

BUILD-01 closes the seed manifest version drift class. The hardcoded `'3.0.2'` literal at `packages/core/src/operations/seed.ts:139` is replaced with an object-shorthand `toolkitVersion,` consuming a new required `toolkitVersion: string` parameter. Each bin passes its already-derived runtime version:

- `packages/mcp/src/index.ts:294` — `seed(projectPath, SERVER_VERSION)`
- `packages/cli/src/index.ts:136` — `seed(projectPath, VERSION)`

Unit tests updated to the 2-arg form with a value-equality assertion (`result.data.toolkitVersion === '9.9.9-test'`). The tarball verification script extended to assert the seed manifest value through each package's real shipped consumer surface.

## Verification Evidence

| Check | Result |
|-------|--------|
| `npm run build` (root) | Green — tsup builds core → mcp → cli clean |
| `npm run build:check` (root) | Green — zero tsc errors across src+test |
| `npx vitest run packages/core/test/operations/seed.test.ts` | 7/7 passed (incl. new value-equality test) |
| `node scripts/verify-tarball.mjs` | Both packages: `OK (version=3.0.2, seedManifest=3.0.2)` |
| `grep -c "toolkitVersion: '3.0.2'" packages/core/src/operations/seed.ts` | 0 — literal removed |
| `grep -c "shell: true" scripts/verify-tarball.mjs` | 0 — spawn discipline intact |

Full verify-tarball.mjs output:
```
[verify-tarball] @localground/mcp: dry-run shape check
[verify-tarball] @localground/mcp: pack + install + --version
[verify-tarball] @localground/mcp: seed-path version-VALUE assert
[verify-tarball] @localground/mcp: OK (version=3.0.2, seedManifest=3.0.2)
[verify-tarball] @localground/cli: dry-run shape check
[verify-tarball] @localground/cli: pack + install + --version
[verify-tarball] @localground/cli: seed-path version-VALUE assert
[verify-tarball] @localground/cli: OK (version=3.0.2, seedManifest=3.0.2)
[verify-tarball] All packages verified
```

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | `23de871` | feat(22-01): parameterize seed() with toolkitVersion, wire both bins (D-01) |
| Task 2 | `e4c96c0` | test(22-01): update seed.test.ts to 2-arg form + value-equality assertion (D-02) |
| Task 3 | `5bc39cd` | feat(22-01): extend verify-tarball.mjs with seed-path version-VALUE assertion (D-03) |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated verify.test.ts seed() calls to 2-arg form**
- **Found during:** Task 1 (build:check after changing seed() signature)
- **Issue:** `packages/core/test/operations/verify.test.ts` has 3 `seed()` calls at lines 37, 57, 89 that were not listed in the plan's files_modified. The signature change from 1-arg to 2-arg caused tsc TS2554 errors on those calls.
- **Fix:** Updated all 3 calls to pass `'9.9.9-test'` as the second argument.
- **Files modified:** `packages/core/test/operations/verify.test.ts`
- **Commit:** `23de871` (included in Task 1 commit)

**2. [Note] seed.test.ts changes batched into Task 1 commit timing**
- The plan separates Task 1 (seed.ts, mcp, cli) and Task 2 (seed.test.ts) as distinct TDD phases. Because build:check requires all 7 seed() calls to be updated before it passes (Task 1 acceptance criterion), the 7 existing call updates and the TOOLKIT_VERSION constant were applied before the Task 1 commit, then committed in Task 2. The new value-equality test (the TDD GREEN deliverable) is in the Task 2 commit.

### MCP JSON-RPC Path: Worked on Windows

The plan offered an equivalence fallback for the MCP seed assertion if the JSON-RPC handshake proved impractical on Windows. The real `localground_seed` JSON-RPC call via `StdioClientTransport` worked correctly — the mcp tarball's runtime `@modelcontextprotocol/sdk` was available in the install tmpDir and the client/server handshake completed without hanging. The equivalence fallback comment is preserved inline in the script per the plan's requirement.

## Success Criteria Assessment

| Criterion | Status |
|-----------|--------|
| BUILD-01 SC-1: seed manifest toolkitVersion equals consuming package version (dev + tarball) | PASS |
| BUILD-01 SC-2: no hardcoded version literal in seed.ts | PASS — grep count 0 |
| BUILD-01 SC-3: verify-tarball.mjs asserts seed-path version VALUE via real consumer surface | PASS — CLI bin + MCP JSON-RPC |
| D-01: Option A mechanism, no build-config change | PASS |
| D-02: all 7 seed() calls 2-arg + value-equality test | PASS — 8 total (7+1) |
| D-03: verify-tarball extension via real consumer surface | PASS |
| D-07: fix in shared @localground/core | PASS — CLI and MCP inherit identically |

## Known Stubs

None.

## Threat Flags

None. The only new surface is the `mcp-seed-driver.mjs` written into tmpDir during CI verification — it is a local-only, CI-transient file within an already-isolated tmpDir, torn down by the existing `finally` cleanup. No new network, auth, or trust boundary introduced.

## Self-Check: PASSED

| Item | Result |
|------|--------|
| `packages/core/src/operations/seed.ts` | FOUND |
| `packages/mcp/src/index.ts` | FOUND |
| `packages/cli/src/index.ts` | FOUND |
| `packages/core/test/operations/seed.test.ts` | FOUND |
| `scripts/verify-tarball.mjs` | FOUND |
| Commit `23de871` | FOUND |
| Commit `e4c96c0` | FOUND |
| Commit `5bc39cd` | FOUND |
