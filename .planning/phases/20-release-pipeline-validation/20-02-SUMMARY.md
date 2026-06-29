---
phase: 20-release-pipeline-validation
plan: "02"
subsystem: infra
tags: [github-actions, release-workflow, oidc, npm-publish, provenance]

# Dependency graph
requires:
  - phase: 20-release-pipeline-validation/20-01
    provides: "repository field + license in mcp/cli manifests (D-04/D-05); PROJECT.md updated (D-13)"
provides:
  - "Hardened release.yml: Node 22.x (OIDC floor), no npm cache, tag↔version preflight, dry-run-both gate"
affects: ["20-03", "20-04", "20-05", "20-06"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Tag↔version preflight using GITHUB_REF_NAME vs node -p require(...).version"
    - "Dry-run-both gate: npm publish --dry-run for both packages before either real publish"
    - "Cache-free privileged workflow (D-09 cache-poisoning hardening)"

key-files:
  created: []
  modified:
    - ".github/workflows/release.yml"

key-decisions:
  - "D-02 applied: node-version '20.x' → '22.x' (npm ≥11.5.1 OIDC floor); ci.yml untouched"
  - "D-09 applied: cache: 'npm' removed from release setup-node step (cache-poisoning hardening)"
  - "D-07 applied: Preflight step asserts GITHUB_REF_NAME == v<mcp version> and mcp == cli version"
  - "D-08 applied: Dry-run-both gate precedes both real publishes; step name explicitly documents pack/manifest guard scope, NOT an auth/OIDC check (review M1)"
  - "D-01 preserved: no NODE_AUTH_TOKEN added; workflow stays pure-OIDC"

patterns-established:
  - "dry-run-both step name includes 'NOT an auth check' to prevent M1 confusion in future edits"

requirements-completed: [PIPE-02]

# Metrics
duration: 1min
completed: 2026-06-29
---

# Phase 20 Plan 02: Release Workflow Hardening Summary

**release.yml hardened for first-ever v3.0.1 tag run: Node 22.x (OIDC floor), no privileged cache, tag↔version preflight, and dry-run-both pack/manifest gate before either irreversible publish**

## Performance

- **Duration:** 1 min
- **Started:** 2026-06-29T05:08:56Z
- **Completed:** 2026-06-29T05:10:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Node 22.x in release job satisfies the npm ≥11.5.1 OIDC trusted-publishing floor (D-02)
- npm cache removed from privileged release job, eliminating cache-poisoning attack surface (D-09)
- Preflight step catches wrong-tag / version-mismatch before any publish, with `::error::` + `exit 1` (D-07)
- Dry-run-both gate surfaces pack/manifest/file-list errors while the registry is still untouched; step name documents it is NOT an auth/OIDC proof (D-08, review M1)
- Workflow stays pure-OIDC: no NODE_AUTH_TOKEN wired anywhere (D-01)

## Task Commits

Each task was committed atomically:

1. **Task 1: Bump release job to Node 22.x and remove npm cache** - `e47ad02` (chore)
2. **Task 2: Add preflight + dry-run-both gate** - `f469174` (feat)

**Plan metadata:** see final docs commit below

## Files Created/Modified

- `.github/workflows/release.yml` — Node 22.x, no npm cache, Preflight step, Dry-run-both step; real publish steps unchanged and in correct order

## Decisions Made

- `22.x` used (not `22.14.x`) for forward-compatibility with patch releases, per CONTEXT "Claude's Discretion"
- Dry-run-both step name includes "(pack/manifest guard — NOT an auth check)" to enforce M1 scope boundary in the YAML itself, not just in docs

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required for this plan. (D-03 npmjs.com trusted-publisher config is a separate manual prerequisite before pushing the v3.0.1 tag, per 20-CONTEXT.md.)

## Next Phase Readiness

- release.yml is fully hardened for the v3.0.1 tag run
- Remaining Phase 20 work: 20-03 (first push to GitHub/PIPE-01 CI run), 20-04 (version bump to 3.0.1 + lockfile regen), 20-05 (OIDC publish + post-publish checks), 20-06 (end-user validation SC5/DOC-03)

## Self-Check: PASSED

- `.github/workflows/release.yml` exists and contains all required elements (verified by automated node -e checks)
- Commits e47ad02 and f469174 confirmed in git log
- ci.yml verified unchanged (still node-version: '20.x')

---
*Phase: 20-release-pipeline-validation*
*Completed: 2026-06-29*
