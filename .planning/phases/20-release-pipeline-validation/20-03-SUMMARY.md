---
phase: 20-release-pipeline-validation
plan: "03"
subsystem: release-infra
tags: [ci, github-actions, npm-trusted-publisher, oidc, push-gate, build-pipeline-fix]
dependency_graph:
  requires: [20-01, 20-02]
  provides: [PIPE-01, SC1, D-03, H1, D-10-push-gate]
  affects: [.github/workflows/ci.yml-run, package.json, origin/master]
tech_stack:
  added: []
  patterns: [incremental-release-gate, oidc-trusted-publisher, non-emitting-typecheck]
key_files:
  created:
    - .planning/phases/20-release-pipeline-validation/20-PIPELINE-LOG.md
  modified:
    - package.json
decisions:
  - "PIPE-01 / SC1 satisfied: ci.yml run 28351195225 GREEN on windows + macos + ubuntu (Node 20.x)"
  - "D-10 push gate satisfied: pre-flight pushed via plain `git push origin master` (no tags, L1 honored); v3.0.0 tag NOT leaked to remote"
  - "D-03 / H1 satisfied: trusted publisher VERIFIED present on both @localground/mcp and @localground/cli (release.yml, Allowed actions: npm publish) — pre-existing from v3.0.0 era, no recreation needed"
  - "DEVIATION: a real CI build-pipeline defect was found and fixed (commit d531c2b) — build:check (tsc --build) was clobbering tsup's bundled dist; switched to flat non-emitting tsc --noEmit per-package"
deviations:
  - "Plan Task 1 assumed the Wave-1 fixes were uncommitted and would be squashed into one 'build(20): pre-flight' commit. Reality: the Wave-1 executors already committed them atomically (4fe24e5/131ad32/064b821/e47ad02/f469174). No squash commit was created (nothing to stage); proceeded directly to push. Push-gate verify (HEAD==origin/master, version 3.0.0, no v3.0.0 tag on remote) all satisfied."
  - "First push CI run (28350344033) was RED on all 3 OSes — a real packaging defect surfaced (build:check clobbering tsup dist). Diagnosed via systematic-debugging, fixed in d531c2b, re-pushed; run 28351195225 GREEN. Plan Task 2 explicitly authorizes this fix-recommit-repush loop."
  - "Task 3 was a VERIFY (config pre-existed from v3.0.0), not a CREATE."
metrics:
  completed_date: "2026-06-29"
  tasks_completed: 3
  tasks_total: 3
  ci_runs: 2
  green_run_id: "28351195225"
---

# Phase 20 Plan 03: First Push + CI Green + Trusted-Publisher Summary

The first guarded operational gate of the release. Pushed the pre-flight fixes to origin/master, achieved a green 3-OS CI run (after diagnosing+fixing a real packaging defect), and verified the per-package npm trusted-publisher config. All before the version bump and tag. NON-autonomous; executed inline by the orchestrator with human checkpoints.

## Tasks Completed

| Task | Name | Result |
|------|------|--------|
| 1 | Commit pre-flight + push master (D-10, L1) | Pushed `8b1eea2..39ff102`, then fix `39ff102..d531c2b`; plain push, no tags |
| 2 | CI green on Windows/macOS/Linux (PIPE-01/SC1) | Run 28351195225 GREEN on all 3 OSes (after red 28350344033 → fix → green) |
| 3 | npm trusted-publisher per package (D-03/H1) | VERIFIED present on mcp + cli (release.yml, Allowed actions: npm publish) |

## The CI failure, diagnosis, and fix (Task 2)

The first push's CI run (**28350344033**) failed on all 3 OS jobs at the "Verify tarball shape" step: `ERR_MODULE_NOT_FOUND: Cannot find package '@localground/core' imported from .../@localground/mcp/dist/index.js`.

**Root cause** (full investigation in 20-PIPELINE-LOG.md): ci.yml runs `build` (tsup → bundled dist, core inlined) → `build:check` (`tsc --build tsconfig.json`, which **emits** an unbundled transpile into the same `dist/` because root tsconfig is `composite:true`+`declaration:true`+`outDir:./dist`) → `verify:tarball`. The tsc emit clobbered tsup's bundled `dist/index.js`, so the packed tarball imported `@localground/core` at runtime and failed on clean install. Masked locally by `.tsbuildinfo` incremental caching; first surfaced now because this is the first CI run since `build:check` (Phase 16) and `verify:tarball` (Phase 18) were both in ci.yml. **release.yml has no `build:check` step, so the actual published artifact path was never affected.**

**Fix (commit d531c2b):** `build:check` changed from emitting `tsc --build tsconfig.json` to flat non-emitting per-package `tsc --noEmit -p packages/{core,mcp,cli}/tsconfig.json` + `tsconfig.test.json`. Same strict type coverage (verified it still catches a deliberately-injected type error), zero emit → can never clobber the bundled dist again. Proven end-to-end against the exact CI sequence locally before pushing; CI run 28351195225 then went green on all 3 OSes.

## Verification Results

- `git rev-parse HEAD == git rev-parse origin/master` after push ✓
- `git ls-remote --tags origin` does NOT list v3.0.0 (L1 honored) ✓
- ci.yml run 28351195225: `success` on Test (windows-latest), Test (macos-latest), Test (ubuntu-latest) ✓
- Trusted publisher Edit view confirmed on both packages: org `Technically-A-Mechanical-Engineer`, repo `localground`, workflow `release.yml`, Allowed actions `npm publish` ✓
- Versions still 3.0.0 (bump deferred to 20-04) ✓

## Deviations from Plan

1. **No squash pre-flight commit** — Wave-1 executors already committed the fixes atomically; proceeded to push directly. Push-gate invariants all satisfied.
2. **Red CI → fix → green** — a real build-pipeline defect (build:check dist clobber) was diagnosed and fixed (d531c2b) per Task 2's explicit retry authorization.
3. **Task 3 was verify, not create** — trusted publisher pre-existed from the v3.0.0 release; verified the exact OIDC-match values, no recreation.

## Threat Flags

T-20-09 (trusted-publisher mismatch / wrong Allowed action) — mitigated and VERIFIED: both packages confirmed `release.yml` + Allowed actions `npm publish`. T-20-20 (v3.0.0 tag leak) — mitigated: plain push, `git ls-remote --tags origin` clean of v3.0.0. T-20-10/T-20-11 — accepted/mitigated as planned.

## Self-Check: PASSED

- CI green run 28351195225 confirmed via `gh run view` (all 3 OS jobs success)
- Trusted publisher verified on both packages (owner-confirmed Edit view)
- Fix commit d531c2b present and pushed; HEAD == origin/master
- 20-PIPELINE-LOG.md created with full run-ID evidence + root-cause record
