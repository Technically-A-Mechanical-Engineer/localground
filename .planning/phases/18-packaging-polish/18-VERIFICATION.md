---
phase: 18-packaging-polish
verified: 2026-04-27T16:00:00Z
status: passed
score: 14/14 must-haves verified
overrides_applied: 0
---

# Phase 18: Packaging Polish Verification Report

**Phase Goal:** Published `@localground/mcp` and `@localground/cli` tarballs contain only compiled output, cutting download size for end users.
**Verified:** 2026-04-27T16:00:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

The phase goal is achieved. Both publishable manifests declare `"files": ["dist"]`; `npm pack --dry-run --json` for both packages emits exactly 5 files (`README.md`, `dist/index.d.ts`, `dist/index.js`, `dist/index.js.map`, `package.json`) with no stowaways from `src/`, `test/`, or any of the three config files. The clean-install smoke check (`scripts/verify-tarball.mjs`) packs each tarball, installs into a fresh `os.tmpdir()` directory with `--ignore-scripts`, invokes the bin entry with `--version`, and asserts exit 0 + semver stdout — all passing on Windows + Node 22.18.0. The smoke check is wired into CI as a step between strict type-check and test, locking the post-Phase-18 tarball shape against silent regression.

### Observable Truths

| #  | Truth (Plan must_have) | Status | Evidence |
|----|------------------------|--------|----------|
| 1  | PKG-01: both manifests declare `"files": ["dist"]` | VERIFIED | `grep -c '"files": \["dist"\]'` returns 1 in `packages/mcp/package.json:16` and 1 in `packages/cli/package.json:16` |
| 2  | PKG-02 mcp dry-run: emits dist/index.js, dist/index.d.ts, dist/index.js.map, package.json, README.md and excludes src/, test/, config files | VERIFIED | `npm pack --dry-run --json -w @localground/mcp` returns 5-file list matching exactly; durable evidence at `.planning/phases/18-packaging-polish/18-01-pack-evidence.txt` |
| 3  | PKG-02 cli dry-run: same shape | VERIFIED | Same command for cli: identical 5-file list; same evidence file |
| 4  | D-04: packages/core/package.json NOT modified | VERIFIED | `git log -1 -- packages/core/package.json` returns `fb1efe9` (Phase 12, well before Phase 18 start). No `"files"` key in core's manifest |
| 5  | D-05: no .npmignore created | VERIFIED | `find . -name .npmignore -not -path "*/node_modules/*"` returns no matches |
| 6  | Bundle invariant: @localground/core in devDependencies (not dependencies) | VERIFIED | mcp: dev=`*`, deps=absent. cli: dev=`*`, deps=absent. Both confirmed via `node -e` |
| 7  | PKG-02 full: scripts/verify-tarball.mjs packs+installs+executes --version with --ignore-scripts in os.tmpdir() | VERIFIED | `npm run verify:tarball` exits 0 with `OK (version=3.0.0)` for both packages; full output matches 18-02-SUMMARY baseline |
| 8  | D-01: smoke check is scripted (scripts/verify-tarball.mjs) wired via npm script `verify:tarball` and ci.yml step "Verify tarball shape (npm pack + clean install)" between strict type-check and test | VERIFIED | `package.json:17` has `"verify:tarball": "node scripts/verify-tarball.mjs"`; ci.yml line 45-46 has the named step; awk ordering check confirms type-check (42) < verify-tarball (45) < test (48) |
| 9  | D-02: spawn discipline — os.tmpdir+mkdtemp, array args, no execSync, no shell:true, win32 branch, npm.cmd vs npm | VERIFIED | grep counts: shell:true=0, execSync=0, spawn(=1, spawnSync(=2, mkdtemp=2, tmpdir=2, win32=2 — all match D-02 acceptance criteria. Script uses `process.execPath + npm-cli.js` resolution (deviation documented in 18-02-SUMMARY) which preserves D-02 spirit and the win32 branch |
| 10 | D-03: dist/index.js.map asserted in tarball | VERIFIED | `REQUIRED_FILES` in `verify-tarball.mjs:71` includes `dist/index.js.map`; assertion runs every invocation. Evidence file confirms presence in both tarballs |
| 11 | T-18-05 mitigated: --ignore-scripts on tarball install | VERIFIED | `verify-tarball.mjs:181` passes `'--ignore-scripts'` to npm install; grep count = 1 |
| 12 | MCP --version: handler in mcp/src/index.ts BEFORE StdioServerTransport | VERIFIED | `packages/mcp/src/index.ts:833-836` `if (process.argv.includes('--version'))` block runs before line 838 `new StdioServerTransport()`. Empirical: `node packages/mcp/dist/index.js --version` outputs `3.0.0` and exit 0 with NO "running on stdio" stderr message (grep returns 0) |
| 13 | SC-3 README + package.json preservation | VERIFIED | Both files appear in both tarballs per evidence file and live re-run |
| 14 | SC-4 clean-install resolves entry points | VERIFIED | End-to-end run completes for both packages with `OK (version=3.0.0)` — proves `dist/index.js` self-resolves all imports after install |

**Score:** 14/14 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/mcp/package.json` | Contains `"files": ["dist"]` | VERIFIED | Line 16; bundle invariant intact |
| `packages/cli/package.json` | Contains `"files": ["dist"]` | VERIFIED | Line 16; bundle invariant intact |
| `packages/mcp/src/index.ts` | --version short-circuit before transport | VERIFIED | Lines 833-836 before line 838 |
| `scripts/verify-tarball.mjs` | New persistent regression guard, ≥80 lines, D-02 compliant | VERIFIED | 229 lines, all D-02 grep checks pass |
| `.github/workflows/ci.yml` | New "Verify tarball shape" step, correct position | VERIFIED | Line 45-46, between strict-type-check and test |
| `package.json` (root) | `verify:tarball` npm script wired to script | VERIFIED | Line 17 |
| `.planning/phases/18-packaging-polish/18-01-pack-evidence.txt` | Durable record of tarball file lists | VERIFIED | Both `## @localground/mcp` and `## @localground/cli` sections present, 5 files each, no stowaways |
| `packages/core/package.json` (D-04) | Byte-identical to pre-phase | VERIFIED | Last commit `fb1efe9` from Phase 12 |

### Key Link Verification

| From | To | Via | Status |
|------|----|----|--------|
| `packages/mcp/package.json files: ["dist"]` | npm pack tarball | npm publish file inclusion logic | WIRED — dry-run output confirms exactly 5 files, no source/test/config leak |
| `packages/cli/package.json files: ["dist"]` | npm pack tarball | npm publish file inclusion logic | WIRED — same |
| ci.yml step "Verify tarball shape" | scripts/verify-tarball.mjs | `npm run verify:tarball` | WIRED — `grep "npm run verify:tarball"` matches in ci.yml, root package.json script resolves to `node scripts/verify-tarball.mjs` |
| scripts/verify-tarball.mjs | mcp/dist/index.js --version | `spawn(execPath, [installedBin, '--version'])` | WIRED — `verify-tarball.mjs:200` matches pattern; mcp short-circuit at 833-836 makes it deterministic |
| scripts/verify-tarball.mjs | cli/dist/index.js --version | `spawn(execPath, [installedBin, '--version'])` | WIRED — same line; cli's commander already exposes --version |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| scripts/verify-tarball.mjs | `dryRunList` | `npm pack --dry-run --json` via spawnSync | Yes — empirical: 5 entries per package | FLOWING |
| scripts/verify-tarball.mjs | `versionResult.stdout` | spawn of installed bin with --version | Yes — empirical: `3.0.0\n` for both | FLOWING |
| 18-01-pack-evidence.txt | tarball file lists | npm pack dry-run captured during Wave 1 Task 3 | Yes — file is non-empty, both packages present, matches live re-run | FLOWING |

No artifacts render hardcoded empty data; this is a packaging/CI phase — output is process exit codes and tarball contents, both empirically validated.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| MCP --version exits 0 with semver stdout | `node packages/mcp/dist/index.js --version` | `3.0.0` exit 0 | PASS |
| MCP --version does NOT boot transport | `node packages/mcp/dist/index.js --version 2>&1 \| grep -c "running on stdio"` | 0 | PASS |
| CLI --version exits 0 | `node packages/cli/dist/index.js --version` | `3.0.0` exit 0 | PASS |
| Verify-tarball script syntax valid | `node --check scripts/verify-tarball.mjs` | exit 0 | PASS |
| End-to-end pack+install+version | `npm run verify:tarball` | "All packages verified", exit 0 | PASS |
| Tarball shape matches evidence | `npm pack --dry-run --json -w @localground/mcp` then `-w @localground/cli` | 5 files each, identical to evidence | PASS |
| Bundle invariant preserved | `node -e "console.log(require('./packages/mcp/package.json').dependencies['@localground/core']\|\|'absent')"` | absent | PASS |
| No .npmignore in repo (D-05) | `find . -name .npmignore -not -path "*/node_modules/*"` | empty | PASS |
| Core manifest unmodified (D-04) | `git log -1 -- packages/core/package.json` | fb1efe9 (Phase 12) | PASS |
| All 6 documented commits exist | `git log --oneline | grep -E "(795d250\|9c3c0bb\|2722712\|bf29889\|dda3688\|96976ef)"` | all 6 found | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| **PKG-01** | 18-01-PLAN | Both packages declare `"files": ["dist"]` | SATISFIED | mcp/package.json:16, cli/package.json:16 |
| **PKG-02** | 18-01-PLAN, 18-02-PLAN | npm pack --dry-run excludes src/, test/, tsconfig.json, tsup.config.ts, vitest.config.ts | SATISFIED | Evidence file + live dry-run; both layers (manifest + automated regression test) closed |

No orphaned requirements detected. REQUIREMENTS.md traceability table already marks PKG-01 + PKG-02 as Phase 18 → Complete, consistent with this verification.

### Roadmap Success Criteria Coverage

| SC | Description | Status | Evidence |
|----|-------------|--------|----------|
| SC-1 | Both package.jsons contain `"files": ["dist"]` | SATISFIED | Direct file read |
| SC-2 | dry-run shows dist/ present and src/, test/, tsconfig.json, tsup.config.ts, vitest.config.ts absent | SATISFIED | Evidence file + live re-run; assertTarballShape enforces both required + forbidden lists |
| SC-3 | dry-run shows README.md and package.json present alongside dist/ | SATISFIED | Both files in both tarballs (evidence file confirmed) |
| SC-4 | Local install from packed tarball resolves imports + exposes documented entry points | SATISFIED | `npm run verify:tarball` packs into fresh tmp dir, installs with `--ignore-scripts`, executes `--version` on installed bin entries — both packages return semver and exit 0 |

### Decision Gates (D-01..D-05)

| Decision | Status | Evidence |
|----------|--------|----------|
| D-01: Scripted, CI-wired smoke check | HONORED | scripts/verify-tarball.mjs + npm script + ci.yml step |
| D-02: spawn discipline (no shell:true, no execSync, os.tmpdir+mkdtemp, npm.cmd vs npm via win32 branch) | HONORED | All grep counts match; deviation from literal `npm.cmd` to `process.execPath + npm-cli.js` is more secure (still no shell mode), preserves win32 branch, and was forced by Node 20+ CVE-2024-27980 mitigation. Documented in 18-02-SUMMARY. |
| D-03: dist/index.js.map ships with tarball | HONORED | REQUIRED_FILES asserts presence; evidence file confirms |
| D-04: packages/core/package.json byte-identical | HONORED | git log shows last touch in Phase 12 (fb1efe9); no `files` key |
| D-05: No .npmignore created | HONORED | find returns no matches |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none specific to Phase 18 commits) | | | | |

The code review (`18-REVIEW.md`) flagged three issues — all advisory, non-blocking:

- **WR-01** (Warning): `fs.rm` cleanup lacks `maxRetries`/`retryDelay` — could mask successful runs on Windows CI under tmp-dir contention. Real but speculative; the local Windows run succeeded. Belongs as backlog hardening, not a Phase 18 blocker.
- **WR-02** (Warning): `spawnSync` calls in `dryRunFiles`/`packReal` lack `timeout` (asymmetric with `run()`'s 60s watchdog). Could allow indefinite hang in pathological cases. Same backlog category.
- **NF-01** (Info): `dryRunFiles` JSON-shape assumption is unguarded. Cosmetic — would surface as cryptic stack trace if npm changes its --json shape.

These do not invalidate Phase 18 — none affect goal achievement. Recommend tracking as v3.0.1 backlog hardening (alongside the 999.7 buildCandidates trailing-edge defect from Phase 17) for the next phase to consider.

### Human Verification Required

None. All verification was deterministic and reproducible from the filesystem + git + local empirical commands. Phase 18 is local-only — no remote npm publish behavior to test (that's Phase 20).

### Gaps Summary

No gaps. Phase 18 ships PKG-01 and PKG-02 fully closed under both manifest declaration and automated CI regression test. The smoke check provides Phase 20's release pipeline with a high-confidence baseline that the published tarball shape installs cleanly. Two CI-reliability defects exist in `verify-tarball.mjs` (WR-01, WR-02 from the code review), but both are advisory hardening recommendations, not goal-blocking issues — the script works correctly on the platforms under test and meets every D-NN/PKG-NN acceptance criterion.

## Cross-check

- **Empirical end-to-end:** `npm run verify:tarball` produces the exact baseline output documented in 18-02-SUMMARY ("All packages verified", `OK (version=3.0.0)` for both). Confirmed against the user's manual run.
- **Tarball file lists are identical** between the durable evidence file (`18-01-pack-evidence.txt`, captured during Wave 1) and a fresh `npm pack --dry-run --json` invocation at verification time — proves the manifest change is stable, not just transiently correct.
- **All 6 documented task commits exist on master:** 795d250, 9c3c0bb, 2722712 (Wave 1) and bf29889, dda3688, 96976ef (Wave 2). master HEAD is `9550000` (docs(18): add code review report).
- **Plan deviations documented in SUMMARYs are sound:** Wave 1's transient `/tmp/verify-pack.mjs` shell:true is irrelevant (transient, never committed). Wave 2's `process.execPath + npm-cli.js` resolution is a stronger D-02 implementation than the plan body's literal `npm.cmd` (which would have failed CI on Windows due to CVE-2024-27980). Both deviations preserve plan intent and satisfy all acceptance grep criteria.
- **Code review findings (WR-01, WR-02, NF-01)** are accurate and worth tracking — they describe realistic CI-flake vectors on Windows runners under contention, but none of them are reachable in the current local-only environment, and none affect goal achievement. Recommend opening a hardening backlog item before Phase 20 first-run validation, but do not block Phase 18 closure.

---

*Verified: 2026-04-27T16:00:00Z*
*Verifier: Claude (gsd-verifier)*
