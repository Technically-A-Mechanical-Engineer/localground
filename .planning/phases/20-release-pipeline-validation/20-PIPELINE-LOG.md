# Phase 20 — Release Pipeline Log

Operational evidence for the guarded release sequence (PIPE-01 / PIPE-02 / SC1–SC5).

## Task 1 — Pre-flight push (D-10 push gate, PIPE-01 trigger)

- **Pre-flight commits** (Wave 1, already atomic from executors): manifest repository+license (D-04/D-05) `4fe24e5`/`131ad32`, PROJECT.md three-forms (D-13) `064b821`, release.yml OIDC hardening (D-02/D-07/D-08/D-09) `e47ad02`/`f469174`.
- **Push 1:** `git push origin master` → `8b1eea2..39ff102` (plain branch push, no tags — L1 honored; `git ls-remote --tags origin` does NOT list v3.0.0).
- Versions still 3.0.0 at push gate (bump deferred to 20-04). ✓

## Task 2 — CI green across Windows / macOS / Linux (PIPE-01 / SC1)

### Red run (diagnosed + resolved per SC1)
- **Run [28350344033](https://github.com/Technically-A-Mechanical-Engineer/localground/actions/runs/28350344033)** on `39ff102` — **all 3 OS jobs FAILED** at step "Verify tarball shape (npm pack + clean install)".
- **Symptom:** `ERR_MODULE_NOT_FOUND: Cannot find package '@localground/core' imported from .../node_modules/@localground/mcp/dist/index.js`.
- **Root cause (systematic-debugging):** ci.yml order is `build` (tsup → bundled dist, core inlined) → `build:check` (`tsc --build tsconfig.json`, which EMITS an unbundled transpile into the same `dist/` because root tsconfig is `composite:true`+`declaration:true`+`outDir:./dist`) → `verify:tarball`. The tsc emit clobbered tsup's bundled `dist/index.js` (1876 lines → 755 lines, re-introducing the bare `import from '@localground/core'`), so the packed tarball failed on clean install. Masked locally by `.tsbuildinfo` incremental caching (tsc skips emit when outputs look current); surfaced on CI's clean checkout — the **first** CI run since `build:check` (Phase 16) and `verify:tarball` (Phase 18) were both wired into ci.yml. release.yml has no `build:check` step, so the actual publish path was never affected.
- **Fix:** commit `d531c2b` — `build:check` switched from emitting `tsc --build tsconfig.json` to flat non-emitting per-package `tsc --noEmit -p packages/{core,mcp,cli}/tsconfig.json` + `tsconfig.test.json`. Same strict type coverage (verified: still catches type errors), zero emit → can never clobber the bundled dist again (robust to CI step reordering). Proven end-to-end locally against the exact CI sequence before push.

### Green run (SC1 satisfied)
- **Run [28351195225](https://github.com/Technically-A-Mechanical-Engineer/localground/actions/runs/28351195225)** on `d531c2b` — **all 3 OS jobs SUCCESS**: Test (windows-latest) ✓, Test (macos-latest) ✓, Test (ubuntu-latest) ✓. Node 20.x. PIPE-01 / SC1 satisfied.

## Task 3 — npm trusted-publisher config (D-03 / H1)

**VERIFIED (not recreated) — both packages already had a trusted publisher configured during the v3.0.0 release era.** Owner confirmed via Settings → Trusted Publisher → Edit on each package page (2026-06-29):

- [x] **@localground/mcp** — Organization/user `Technically-A-Mechanical-Engineer`, repo `localground`, workflow filename `release.yml`, environment blank, **Allowed actions: `npm publish`** (shown explicitly). ✓
- [x] **@localground/cli** — same values; **Allowed actions: `npm publish`**. ✓

D-03 satisfied. Review H1 (the must-fix-before-tag "Allowed actions: npm publish" criterion) confirmed present on BOTH packages. No web-UI changes were required — the existing config matched the exact OIDC-match values release.yml will present on the v3.0.1 tag.
