---
phase: 20-release-pipeline-validation
plan: "07"
subsystem: release-infra
gap_closure: true
tags: [sc5, version-drift, fix-forward, runtime-version, defense-in-depth, 3.0.2]
dependency_graph:
  requires: [20-06]
  provides: [SC5-source-fix, version-equality-ci-gate, "3.0.2-built-artifacts"]
  affects:
    - packages/cli/src/index.ts
    - packages/mcp/src/index.ts
    - packages/core/src/operations/seed.ts
    - scripts/verify-tarball.mjs
    - packages/cli/package.json
    - packages/mcp/package.json
    - packages/core/package.json
    - package.json
    - .claude-plugin/plugin.json
    - package-lock.json
    - README.md
    - CHANGELOG.md
tech_stack:
  added: []
  patterns: [runtime-version-from-package-json, version-equality-assertion, fix-forward-immutable-publish]
key_files:
  created: []
  modified:
    - packages/cli/src/index.ts
    - packages/mcp/src/index.ts
    - packages/core/src/operations/seed.ts
    - scripts/verify-tarball.mjs
    - "5 manifests (root, core, mcp, cli, .claude-plugin/plugin.json)"
    - package-lock.json
    - README.md
    - CHANGELOG.md
decisions:
  - "Root cause CONFIRMED: cli/src/index.ts:19 hardcoded .version('3.0.0') and mcp/src/index.ts:18 hardcoded SERVER_VERSION='3.0.0'; the D-06 (20-04) bump updated manifests + lockfile only. The release runner built dist from 2a9034e (manifest 3.0.1, source 3.0.0) -> published 3.0.1 binaries emit 3.0.0. SC5 failed. npm 3.0.1 IMMUTABLE -> fix forward to 3.0.2."
  - "FIX-1 (root cause): both bins now derive version at runtime via readFileSync(new URL('../package.json', import.meta.url)).version. No hardcoded version literal remains in either src/index.ts. Drift-proof: a manifest bump always propagates to --version."
  - "FIX-2 (defense-in-depth): verify-tarball.mjs now asserts built --version EQUALS the package manifest version (string equality), replacing the prior /^\\d+\\.\\d+\\.\\d+/ semver-shape regex that let 3.0.0 pass under a 3.0.1 manifest. This is the CI gate that would have blocked the 3.0.1 publish."
  - "FIX-3: all 5 manifests bumped 3.0.1 -> 3.0.2 (root, core, mcp, cli, .claude-plugin/plugin.json) + package-lock.json regenerated."
  - "FIX-4: README de-staled (## MCP Server / ## CLI headers version-agnostic; 'As of v3.0.0' -> 'Since v3.0.0'); CHANGELOG.md [3.0.2] entry added (Fixed/Changed/Note, 3.0.1 superseded)."
  - "pt-2 (user-approved, adversarial catch): seed.ts toolkitVersion '3.0.0' -> '3.0.2' (the version stamped into seed manifests, bundled into both dists). Literal bump, not derivation: core's nested src/operations/ layout flattens on bundle, so import.meta.url relative read is fragile across source-vs-bundled contexts. Drift-proof host-injection deferred to v3.1.0."
deviations:
  - "CHANGELOG link-reference footer: the spec said 'match the existing compare-link pattern' but the CHANGELOG has no link-reference footer / compare links at all. The executor correctly did NOT fabricate a convention; added only the [3.0.2] entry body. No compare-link footer introduced."
  - "Two commits for the fix (not amended): 2ae1fab (FIX-1..4) + 26659c8 (pt-2 toolkitVersion) per the 'prefer new commit over amend' git rule. The toolkitVersion drift was surfaced by an orchestrator-side adversarial build-grep AFTER the executor's commit, then user-approved."
metrics:
  completed_date: "2026-06-29"
  tasks_completed: 3
  commits: 2
  fix_commit_1: "2ae1fab"
  fix_commit_2: "26659c8"
  manifests_bumped: 5
---

# Phase 20 Plan 07: SC5 Fix-Forward to 3.0.2 Summary

Wave-5 verification proved the published v3.0.1 binaries self-report `3.0.0`. Root cause: the version was a **hardcoded source literal** that the D-06 manifest-only bump never touched. npm 3.0.1 is immutable, so this plan fixes forward to **3.0.2** — fixing the source at the root (runtime derivation), adding a CI gate so the class can never ship again, bumping + de-staling docs, and proving the **built** artifacts emit 3.0.2 before any commit.

## What was wrong (and why CI missed it)

- `--version` was hardcoded: `cli .version('3.0.0')` and `mcp SERVER_VERSION = '3.0.0'`. The 20-04 bump changed package.json manifests + lockfile only; the runner built dist from the tagged commit, so the binaries honestly emitted the stale source literal.
- **CI gap:** `scripts/verify-tarball.mjs` ran `--version` but only asserted it matched a semver-shape regex (`/^\d+\.\d+\.\d+/`), never that it equaled the manifest version. `3.0.0` satisfied the regex, so the 3.0.1 publish went green.

## The fix (5 parts)

| Part | Change | File(s) |
|------|--------|---------|
| FIX-1 (root cause) | `--version` / `SERVER_VERSION` derived at runtime from `../package.json` via `import.meta.url` | cli + mcp `src/index.ts` |
| FIX-2 (defense-in-depth) | verify-tarball asserts built `--version` **==** manifest version (string equality) | `scripts/verify-tarball.mjs` |
| FIX-3 (bump) | 5 manifests 3.0.1 → 3.0.2 + lockfile regen | root, core, mcp, cli, plugin.json, package-lock.json |
| FIX-4 (docs) | README headers version-agnostic + CHANGELOG [3.0.2] entry | README.md, CHANGELOG.md |
| pt-2 (adversarial catch) | seed manifest `toolkitVersion` 3.0.0 → 3.0.2 | `packages/core/src/operations/seed.ts` |

## Build-verified BEFORE commit (the gate the original release skipped)

- `node packages/cli/dist/index.js --version` → **3.0.2**
- `node packages/mcp/dist/index.js --version` → **3.0.2**
- both dists' bundled `toolkitVersion` → **3.0.2**; zero stale `3.0.0` remaining anywhere in dist
- `npm test` → 16 files, **85 passed / 2 skipped**
- `node scripts/verify-tarball.mjs` → green (`OK (version=3.0.2)` for both; new equality gate active)

## Commits + push

- `2ae1fab` — FIX-1..4 (executor)
- `26659c8` — pt-2 toolkitVersion (orchestrator, user-approved)
- Pushed `2a9034e..26659c8` to origin/master. CI run **28357130168** triggered on the version-equality gate.

## NOT done in this plan (gated / deferred)

- **No tag, no publish.** The 3.0.2 re-publish (push ✓ → CI green → tag v3.0.2 → OIDC publish → re-verify SC5 → deprecate 3.0.1) is gated to the user.
- **Drift-proof toolkitVersion (host-injection into `seed()`):** deferred to v3.1.0 — requires a `seed()` signature change rippling through cli, mcp, the MCP seed tool, and tests.

## Self-Check

- SC5 root cause fixed at source AND guarded in CI; 3.0.2 built artifacts emit 3.0.2 (registry-truth pending the gated publish).
- Clean working tree post-commit (only AGENTS.md untracked, nothing under .planning staged).
- CI conclusion to be appended once run 28357130168 finishes.
