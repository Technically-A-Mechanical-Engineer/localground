---
phase: 22-core-versioning-audit-filter
verified: 2026-06-30T12:15:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
---

# Phase 22: Core Versioning & Audit Filter — Verification Report

**Phase Goal:** The seed manifest version can no longer drift from the package version, and audit auto-discovery excludes system/home/drive roots while still finding marker-less plain-folder projects.
**Verified:** 2026-06-30T12:15:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC-1 | seed manifest `toolkitVersion` always equals the consuming package's version on dev build AND packaged tarball | VERIFIED | `node scripts/verify-tarball.mjs` — both packages logged `OK (version=3.0.2, seedManifest=3.0.2)`. Value equality confirmed via CLI bin `seed --json` + MCP JSON-RPC `localground_seed` tool, both reading the written manifest file. |
| SC-2 | No hardcoded version literal remains in `packages/core/src/operations/seed.ts` | VERIFIED | `grep -c "toolkitVersion: '3.0.2'" packages/core/src/operations/seed.ts` → **0**. Line 142 now reads `toolkitVersion,` (object shorthand consuming the new param). |
| SC-3 | `scripts/verify-tarball.mjs` extended to assert seed-path version VALUE (not just bin `--version`) | VERIFIED | Lines 215-299 of `verify-tarball.mjs` seed a real git repo through each package's real consumer surface (CLI bin `seed --json` for `@localground/cli`; MCP JSON-RPC `localground_seed` for `@localground/mcp`) and assert `manifestVersion !== expectedVersion` throws with a drift message. The value gate runs on both packages and passed. |
| SC-4 | Audit AND detect auto-discovery no longer surface home/drive/system roots (e.g. `C:\Users\…`, AppData tree, other-user homes) while plain-folder projects with NO marker stay discoverable | VERIFIED | `looksLikeProject.ts` adds two guards: users-container rejection (other-user home roots + documented intentional exception) and AppData first-segment rejection. `looksLikeProject.test.ts` 12/12 green, confirming all rejection + acceptance invariants. Detect wired via `.filter(looksLikeProject)` at cli:67 and mcp:215. |
| SC-5 | CORE-15 fix lives in shared `@localground/core`; CLI `audit`/`detect` and MCP `audit`/`detect` inherit identically; regression test locks BOTH root-rejection AND plain-folder-discovery | VERIFIED | `grep -c ".filter(looksLikeProject)"` → 2 per file (audit at cli:515 + mcp:722; detect at cli:67 + mcp:215). Both import the same predicate from `@localground/core`. `looksLikeProject.test.ts` locks root-rejection (Group 1) and plain-folder discovery D-05 tripwire (Group 2) alongside both D-06 tightenings. |

**Score: 5/5 truths verified**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/core/src/operations/seed.ts` | `seed()` parameterized with `toolkitVersion: string`; no hardcoded `'3.0.2'` literal | VERIFIED | Signature at line 50-53 has `toolkitVersion: string`. Line 142 uses object shorthand. Phase 22 diff = +4/-1 on this file. |
| `packages/mcp/src/index.ts` | Seed call site passes `SERVER_VERSION` | VERIFIED | Line 295: `const result = await seed(projectPath, SERVER_VERSION);`. `SERVER_VERSION` derived at lines 19-21 from `package.json`. |
| `packages/cli/src/index.ts` | Seed call site passes `VERSION`; detect enrichedProjects `.filter(looksLikeProject)` | VERIFIED | Line 138: `seed(projectPath, VERSION)`. Line 67: `.filter(looksLikeProject)` between the Success-narrow `.filter` and the ProjectEntry `.map`. |
| `packages/core/test/operations/seed.test.ts` | 2-arg calls + value-equality assertion `toBe('9.9.9-test')` | VERIFIED | `TOOLKIT_VERSION = '9.9.9-test'` at line 27. All 7 existing calls use `TOOLKIT_VERSION` as second arg. Line 115: `expect(result.data.toolkitVersion).toBe(TOOLKIT_VERSION)`. 7/7 passed in live run. |
| `scripts/verify-tarball.mjs` | Seed-path version-VALUE assertion; `manifestVersion !== expectedVersion` gate; no `shell: true` | VERIFIED | Lines 294-299 contain the value gate. Line 237: `manifestPath` reads `.localground-seed-manifest.json`. Both CLI and MCP branches present. `grep -c "shell: true"` → 0. |
| `packages/core/src/environment/looksLikeProject.ts` | AppData first-segment rejection; users-container guard; `path.dirname(home)` present; no marker check; pure function | VERIFIED | Lines 76-94 add both guards. `path.dirname(home)` at line 76. No `package.json` in code (doc comment only). No `throw`, `async`, `await`, `fs.` in function body. |
| `packages/core/test/environment/looksLikeProject.test.ts` | NEW file; 12 tests; all groups present; no `vi.mock`/`memfs`; imports from `@localground/core` | VERIFIED | File exists, 12 tests (Groups 1-4), import at line 4. 12/12 passed in live run. No mocked fs. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `packages/mcp/src/index.ts:295` | `packages/core/src/operations/seed.ts seed()` | `seed(projectPath, SERVER_VERSION)` | WIRED | Grep confirmed: exact string at line 295. |
| `packages/cli/src/index.ts:138` | `packages/core/src/operations/seed.ts seed()` | `seed(projectPath, VERSION)` | WIRED | Grep confirmed: exact string at line 138. |
| `packages/cli/src/index.ts:67` (detect) | `packages/core/src/environment/looksLikeProject.ts` | `.filter(looksLikeProject)` | WIRED | Grep count = 2 in cli (audit:515 + detect:67). |
| `packages/mcp/src/index.ts:215` (detect) | `packages/core/src/environment/looksLikeProject.ts` | `.filter(looksLikeProject)` | WIRED | Grep count = 2 in mcp (audit:722 + detect:215). |
| `scripts/verify-tarball.mjs verifyOne()` | Each tarball's real consumer surface | CLI `seed --json` / MCP `localground_seed` JSON-RPC, reads manifest file | WIRED | Both branches execute, write manifest, read `toolkitVersion`, assert equality. Passed live. |
| `packages/core/test/environment/looksLikeProject.test.ts` | `looksLikeProject` | `import { looksLikeProject } from '@localground/core'` | WIRED | Line 4 confirmed. 12 tests invoke the function. |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `seed.ts manifest.toolkitVersion` | `toolkitVersion` param | Caller (`seed(projectPath, VERSION/SERVER_VERSION)`) | Yes — runtime `package.json` version, not a literal | FLOWING |
| `looksLikeProject.ts` predicate | `absolutePath` arg | Decoded path-hash strings in audit/detect | Yes — real filesystem paths from Claude config dir | FLOWING |
| `verify-tarball.mjs manifestVersion` | Manifest JSON from disk | Written by real tarball's `seed()` invocation | Yes — file written by packaged build, then read back | FLOWING |

---

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| `npm run build` exits 0, all three packages | `npm run build 2>&1` | core 37.56KB, mcp 62.20KB, cli 58.07KB — no errors | PASS |
| `npm run build:check` (strict tsc) exits 0 | `npm run build:check 2>&1` | Silent exit 0 — zero tsc errors across src+test | PASS |
| Full vitest suite 107 passed | `npx vitest run 2>&1` | **107 passed, 2 skipped** (17 test files) | PASS |
| looksLikeProject regression-lock: 12/12 | `npx vitest run packages/core/test/environment/looksLikeProject.test.ts` | **12 passed** | PASS |
| verify-tarball value gate exits 0, both packages | `node scripts/verify-tarball.mjs` | `@localground/mcp: OK (version=3.0.2, seedManifest=3.0.2)` + `@localground/cli: OK (version=3.0.2, seedManifest=3.0.2)` | PASS |
| Hardcoded literal absent | `grep -c "toolkitVersion: '3.0.2'" packages/core/src/operations/seed.ts` | **0** | PASS |
| detect filter count — cli | `grep -c ".filter(looksLikeProject)" packages/cli/src/index.ts` | **2** (audit + detect) | PASS |
| detect filter count — mcp | `grep -c ".filter(looksLikeProject)" packages/mcp/src/index.ts` | **2** (audit + detect) | PASS |
| No shell:true in verify-tarball | `grep -c "shell: true" scripts/verify-tarball.mjs` | **0** | PASS |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| BUILD-01 | 22-01-PLAN.md | Seed manifest `toolkitVersion` equals consuming package version in dev build + tarball; no hardcoded literal; `verify-tarball.mjs` asserts seed-path version value | SATISFIED | SC-1 through SC-3 all VERIFIED. `grep` confirms literal removed. `verify-tarball.mjs` live run confirmed value equality. REQUIREMENTS.md marks BUILD-01 complete `[x]`. |
| CORE-15 | 22-02-PLAN.md | Audit auto-discovery does not surface home/drive/system roots; plain-folder projects remain discoverable; fix in shared core; CLI + MCP audit behave identically; regression test locks both invariants | SATISFIED | SC-4 and SC-5 both VERIFIED. `looksLikeProject.ts` guards confirmed in code. 12-test suite green. Both audit and detect filter call sites verified (2 per consumer file). REQUIREMENTS.md marks CORE-15 complete `[x]`. |

CORE-16 is correctly marked pending in REQUIREMENTS.md and is mapped to Phase 23, not this phase.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `packages/core/src/operations/seed.ts` | 98 | `await fs.readFile(testFilePath, 'utf8')` — no try/catch; can throw instead of returning `Result` | Warning | CR-01 from 22-REVIEW.md. **Pre-existing code — not introduced by Phase 22.** Phase 22 diff on this file is +4/-1, touching only the JSDoc, the signature, and line 142 (manifest literal). The unguarded read was present before Phase 22 started. This is a legitimate quality issue to address in a follow-on fix, but it is not a phase gap. |
| `scripts/verify-tarball.mjs` | 75-91 | MCP driver arg alignment has no fast-fail guard if `binEntry` is undefined | Info | WR-01 from 22-REVIEW.md. Fragile but currently correct. CI-only script in a controlled environment. Not a blocker. |
| `scripts/verify-tarball.mjs` | 63 | `resolveNpmCliJs()` fallback path not validated for existence | Info | WR-02 from 22-REVIEW.md. Only fires in unusual CI configurations. Not a blocker. |
| `packages/core/src/operations/seed.ts` | 109, 143 | Two separate `new Date()` calls for tag name and manifest `created` | Info | WR-03 from 22-REVIEW.md. Cosmetic/forensic inconvenience, no data loss. Not a blocker. |

---

### Human Verification Required

None. All success criteria were fully verifiable by code inspection and command execution.

---

### Gaps Summary

No gaps. All 5 success criteria are VERIFIED by codebase evidence and live command execution. Both requirement IDs (BUILD-01, CORE-15) are satisfied and marked complete in REQUIREMENTS.md.

The pre-existing CR-01 defect (`fs.readFile` without try/catch in `seed.ts` line 98) was confirmed not introduced by Phase 22 — the git diff shows Phase 22's changes to `seed.ts` are exactly +4/-1 touching the JSDoc, signature, and line 142 only. CR-01 is a backlog item for a follow-on fix.

---

_Verified: 2026-06-30T12:15:00Z_
_Verifier: Claude (gsd-verifier)_
