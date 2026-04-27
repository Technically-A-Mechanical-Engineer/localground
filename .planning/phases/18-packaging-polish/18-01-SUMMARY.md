---
phase: 18-packaging-polish
plan: 01
subsystem: infra
tags: [npm, packaging, tarball, monorepo, tsup, files-field]

# Dependency graph
requires:
  - phase: 11-monorepo-restructure
    provides: "Three-package monorepo with @localground/core bundled into mcp/cli via tsup noExternal"
  - phase: 14-publish-pipeline
    provides: "v3.0.0 published to npm with @localground/core in devDependencies (bundle invariant)"
provides:
  - "packages/mcp/package.json declares files: [\"dist\"] — tarball ships only compiled output + package.json + README.md"
  - "packages/cli/package.json declares files: [\"dist\"] — same"
  - ".planning/phases/18-packaging-polish/18-01-pack-evidence.txt — durable record of post-PKG-01 tarball file lists for both packages"
  - "PKG-01 closed (manifest declarations) and PKG-02 closed at the manifest layer (npm pack --dry-run inclusion/exclusion verified)"
affects: [phase-18-02-tarball-smoke-check, phase-19-skill-runtime-uat, phase-20-release-pipeline-validation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "files: [\"dist\"] in package.json as single source of truth (no .npmignore — D-05)"
    - "Source maps retained in published tarballs (D-03 — debug fidelity > tarball weight)"
    - "Bundle invariant pattern: workspace deps bundled via tsup noExternal stay in devDependencies"

key-files:
  created:
    - .planning/phases/18-packaging-polish/18-01-pack-evidence.txt
  modified:
    - packages/mcp/package.json
    - packages/cli/package.json

key-decisions:
  - "Followed locked decisions D-01..D-05 from 18-CONTEXT.md verbatim — no re-litigation"
  - "Transient verify-pack.mjs used shell:true on Windows for npm.cmd resolution (not committed to repo); persistent script lands in Plan 02 with proper Windows-aware spawn pattern"

patterns-established:
  - "Manifest files-field convention: \"files\": [\"dist\"] slots between \"exports\" and \"publishConfig\" per canonical npm key order"
  - "Tarball evidence capture: 18-01-pack-evidence.txt records the npm pack --dry-run file list at the time of the manifest change — diagnostic baseline for future regression detection"

requirements-completed: [PKG-01, PKG-02]

# Metrics
duration: 7min
completed: 2026-04-27
---

# Phase 18 Plan 01: Packaging Polish Summary

**Both publishable manifests declare `files: ["dist"]` — tarballs cut to compiled output + package.json + README.md, with bundle invariant and D-04/D-05 scope boundaries preserved.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-27T13:06:14Z
- **Completed:** 2026-04-27T13:13:00Z (approx)
- **Tasks:** 3
- **Files modified:** 2 (mcp + cli package.json)
- **Files created:** 1 (pack-evidence.txt)

## Accomplishments
- `packages/mcp/package.json` and `packages/cli/package.json` both contain `"files": ["dist"]` (PKG-01)
- `npm pack --dry-run --json` for both packages emits exactly 5 files: `README.md`, `dist/index.d.ts`, `dist/index.js`, `dist/index.js.map`, `package.json` (PKG-02 inclusion/exclusion verified)
- No `src/`, `test/`, `tsconfig.json`, `tsup.config.ts`, or `vitest.config.ts` leak into either tarball
- Bundle invariant preserved: `@localground/core` remains in `devDependencies` (not `dependencies`) for both mcp and cli
- D-04 verified: `packages/core/package.json` byte-identical to pre-phase state (last touched in commit `fb1efe9` from Phase 12)
- D-05 verified: no `.npmignore` files anywhere in the repo
- D-03 verified: `dist/index.js.map` ships in both tarballs

## Task Commits

Each task was committed atomically:

1. **Task 1: Add files field to packages/mcp/package.json** — `795d250` (chore)
2. **Task 2: Add files field to packages/cli/package.json** — `9c3c0bb` (chore)
3. **Task 3: Verify tarball shape via npm pack --dry-run** — `2722712` (test — evidence capture)

## Files Created/Modified

- `packages/mcp/package.json` — added one line: `"files": ["dist"],` between `"exports"` and `"publishConfig"`
- `packages/cli/package.json` — added one line: `"files": ["dist"],` (mirror of mcp)
- `.planning/phases/18-packaging-polish/18-01-pack-evidence.txt` — new file; durable record of `npm pack --dry-run` output for both packages

### Diff: packages/mcp/package.json

```diff
       "types": "./dist/index.d.ts"
     }
   },
+  "files": ["dist"],
   "publishConfig": {
     "access": "public"
   },
```

### Diff: packages/cli/package.json

```diff
       "types": "./dist/index.d.ts"
     }
   },
+  "files": ["dist"],
   "publishConfig": {
     "access": "public"
   },
```

### Tarball file lists (from 18-01-pack-evidence.txt)

**`@localground/mcp`** (5 files, 48,442 bytes packed / 215,878 bytes unpacked):
- README.md
- dist/index.d.ts
- dist/index.js
- dist/index.js.map
- package.json

Required present: YES — Stowaways present: NONE

**`@localground/cli`** (5 files):
- README.md
- dist/index.d.ts
- dist/index.js
- dist/index.js.map
- package.json

Required present: YES — Stowaways present: NONE

### Bundle invariant verification (post-edit `devDependencies` blocks)

Both files preserve the bundle invariant (per memory `feedback_monorepo_bundled_deps.md`):

```json
"devDependencies": {
  "@localground/core": "*"
}
```

`@localground/core` is NOT in `dependencies` of either package. tsup `noExternal: ['@localground/core']` continues to inline core's source into `dist/index.js` at build time, so consumers never need to resolve `@localground/core` at install time.

### packages/core/package.json verification (D-04)

`git status -- packages/core/package.json` reports `nothing to commit, working tree clean`. Last commit touching the file is `fb1efe9` (Phase 12, well before Phase 18 start). Confirmed byte-identical to pre-phase state.

## Decisions Made

- **Followed all locked decisions from 18-CONTEXT.md verbatim** — D-01 through D-05 were settled before execution; no re-litigation occurred.
- **Transient verification script (`/tmp/verify-pack.mjs`) used `shell: true` on Windows** — required because Node 20+ rejects direct `.cmd` spawn with `EINVAL` (security tightening introduced December 2023). Args were static literals (no injection surface). The persistent CI-wired script delivered by Plan 02 (`scripts/verify-tarball.mjs`) will use the production-grade Windows-aware spawn pattern. The transient script was not committed to the repo.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added `shell: true` to spawnSync in transient verify-pack.mjs for Windows .cmd resolution**

- **Found during:** Task 3 (initial run of `node /tmp/verify-pack.mjs`)
- **Issue:** `spawnSync('npm.cmd', [...], { encoding: 'utf8' })` failed with `EINVAL` on Windows. Node 20+ refuses direct `.cmd` spawn without `shell: true` (Node.js security patch CVE-2024-27980 mitigation).
- **Fix:** Added `shell: process.platform === 'win32'` to the spawnSync options block in the transient verification script, with an inline comment noting that the persistent Plan-02 script uses the production-grade pattern. All args remain static literals (no injection surface; D-02 spirit preserved for the transient one-shot).
- **Files modified:** `C:\Users\rlasalle\AppData\Local\Temp\verify-pack.mjs` (transient — not committed; consumed once and discarded)
- **Verification:** `node verify-pack.mjs` exits 0 with output "OK — both tarballs include required files and exclude forbidden ones"; `18-01-pack-evidence.txt` populated correctly.
- **Committed in:** N/A — script is transient by design per plan instructions ("/tmp/verify-pack.mjs (transient one-shot — does NOT get committed)"). The evidence file it produced was committed in `2722712`.

---

**Total deviations:** 1 auto-fixed (1 blocking — Windows-specific Node spawn behavior)
**Impact on plan:** Zero scope creep. The deviation only affected the transient verification mechanism, not any committed artifact. The persistent CI-wired script in Plan 02 will replace this one-shot with a properly engineered Windows-aware version.

## Issues Encountered

- Initial `Write` tool call to `/tmp/verify-pack.mjs` placed the file under Git Bash's `/tmp` mount (which is not the same path Node resolves on Windows). Resolved by writing the script to the absolute Windows path `C:\Users\rlasalle\AppData\Local\Temp\verify-pack.mjs` and invoking it with that path. Documenting because it's a recurring trap on Windows + Git Bash environments — Node's `os.tmpdir()` and Git Bash's `/tmp` are different paths.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Plan 18-02 ready to start.** PKG-01 manifests in place; Plan 02 layers the persistent CI-wired smoke check (`scripts/verify-tarball.mjs` + `.github/workflows/ci.yml` step) on top of the manifest change. The smoke check protects the `files: ["dist"]` declaration from future regression by performing a clean-directory `npm install <tgz>` and invoking the published binaries.
- **No blockers.** v3.0.1 milestone progress on track (5 of 7 plans complete after this commit; 6 of 7 after 18-02 ships).
- **Phase 19 (Skill Runtime UAT) and Phase 20 (Release Pipeline Validation)** will both run against tarballs with the post-Phase-18 shape — same shape as future v3.0.1 publishes.

## Self-Check: PASSED

- Files modified — verified present:
  - `packages/mcp/package.json` — `grep -c '"files": \["dist"\]'` returns 1
  - `packages/cli/package.json` — `grep -c '"files": \["dist"\]'` returns 1
  - `packages/core/package.json` — `git status` clean (D-04 preserved)
- Files created — verified present:
  - `.planning/phases/18-packaging-polish/18-01-pack-evidence.txt` — exists, contains both `## @localground/mcp` and `## @localground/cli` sections, all required-file grep counts ≥2, stowaway grep returns 0
- Commits — verified in `git log`:
  - `795d250` — Task 1 (mcp manifest)
  - `9c3c0bb` — Task 2 (cli manifest)
  - `2722712` — Task 3 (pack evidence)

---
*Phase: 18-packaging-polish*
*Completed: 2026-04-27*
