---
phase: 20-release-pipeline-validation
plan: "05"
subsystem: release-infra
tags: [oidc, npm-publish, provenance, irreversible, trusted-publisher, recovery]
dependency_graph:
  requires: [20-04]
  provides: [PIPE-02, SC2, D-10-final-guards]
  affects: [.github/workflows/release.yml, "npm:@localground/mcp@3.0.1", "npm:@localground/cli@3.0.1", "git tag v3.0.1"]
tech_stack:
  added: []
  patterns: [oidc-trusted-publishing, ci-green-on-exact-commit, pre-tag-registry-matrix, npm-runner-upgrade]
key_files:
  created: []
  modified:
    - .github/workflows/release.yml
decisions:
  - "PIPE-02 / SC2 satisfied: v3.0.1 tag published BOTH @localground/mcp@3.0.1 and @localground/cli@3.0.1 to npm via OIDC + provenance"
  - "D-10 final guards all executed in order: CI-green-on-exact-commit -> annotated tag -> tag-content verify -> pre-tag registry matrix (both absent) -> push"
  - "D-01 honored: published via PURE OIDC (no token fallback used); token path never needed"
  - "CONFIRMED root cause of the 4-attempt recovery: Node 22.x bundles npm 10.9.x (< the 11.5.1 OIDC floor). Fix: `npm install -g npm@^11.5.1` on the runner. D-02's 'Node 22.x ships npm >=11.5.1' assumption was FALSE."
  - "H2 recovery matrix never triggered — branch (a) (nothing live) held across all 4 attempts; no immutable version burned"
deviations:
  - "FOUR release.yml iterations were needed before the publish succeeded (all on master, each re-tagged v3.0.1 to the new commit since a tag's workflow runs from the tagged commit; safe because nothing was published): (1) base setup-node@v4 -> E404; (2) setup-node@v6 -> E404 (placeholder NODE_AUTH_TOKEN from registry-url persisted in v6 too); (3) removed registry-url -> ENEEDAUTH (no token, but npm 10.9 still didn't attempt OIDC); (4) added `npm install -g npm@^11.5.1` -> SUCCESS."
  - "The decisive diagnostic was attempt 3's ENEEDAUTH (no token + no OIDC attempt), which proved npm wasn't doing OIDC at all -> a version-floor problem, confirmed by reading the bundled npm (10.9.3) shipped with Node 22.18."
  - "release.yml ended at: setup-node@v6 (no registry-url) + `npm install -g npm@^11.5.1` + pure-OIDC `npm publish --provenance --access public` per package. Commits: 8fe734e (v6), de99207 (drop registry-url), 2a9034e (npm upgrade — the fix)."
metrics:
  completed_date: "2026-06-29"
  tasks_completed: 3
  tasks_total: 3
  release_attempts: 4
  final_release_run: "28354644986"
  tag_commit: "2a9034e"
---

# Phase 20 Plan 05: Tag + OIDC Publish Summary

The milestone's single irreversible moment, executed inline with a human gate at the tag push. **v3.0.1 is live: both `@localground/mcp@3.0.1` and `@localground/cli@3.0.1` published via OIDC trusted publishing + provenance.** Reaching success required a 4-attempt recovery against a confirmed npm-version root cause; no immutable version was ever burned (branch (a) throughout).

## Tasks Completed

| Task | Name | Result |
|------|------|--------|
| 1 | Push bump commit (CI-on-tag-target) | master pushed; ci.yml green on the exact commit |
| 2 | CI-green → tag → verify content → pre-tag registry (M3) → push tag | all D-10 guards green; tag pushed |
| 3 | release.yml publishes both (PIPE-02/SC2) + H2 recovery | **PUBLISHED** both @3.0.1 after the 4-attempt npm-version fix |

## The irreversible-publish guards (D-10), all green before each tag push

- **CI-green-on-exact-commit:** the tagged commit's own 3-OS ci.yml run was confirmed `success` before every tag push.
- **Tag-content verification:** `git ls-tree`/`cat-file` (MSYS-safe; avoids Git-Bash `ref:path` colon mangling) confirmed both manifests `3.0.1` + repository + MIT at the tag.
- **Pre-tag registry matrix (M3):** `npm view @localground/{mcp,cli}@3.0.1` confirmed BOTH absent before each push; the final push was guarded by a conditional that would have aborted if either were live.

## The 4-attempt recovery (root cause + fix)

| # | release.yml state | Result | Why |
|---|-------------------|--------|-----|
| 1 | setup-node@v4 + registry-url | `E404` on PUT | npm 10.9 didn't do OIDC; fell to setup-node's placeholder `NODE_AUTH_TOKEN` → invalid token auth |
| 2 | setup-node@v6 + registry-url | `E404` | placeholder token persists in v6 too — action version was a red herring |
| 3 | setup-node@v6, NO registry-url | `ENEEDAUTH` | no token written, but npm 10.9 STILL didn't attempt OIDC → no auth at all |
| 4 | + `npm install -g npm@^11.5.1` | **SUCCESS** | OIDC-capable npm → OIDC engaged with the (already-correct) trusted-publisher config |

**Confirmed root cause:** Node 22.x bundles **npm 10.9.x**, below npm's OIDC trusted-publishing floor of **11.5.1**. Verified by reading the npm bundled with Node 22.18 (`10.9.3`). D-02's premise that "Node 22.x (≥22.14.0) ships npm ≥11.5.1" was incorrect; the runner npm must be explicitly upgraded.

## Verification Results

- Release run 28354644986: `success` — Preflight ✓, Dry-run-both ✓, Publish mcp ✓, Publish cli ✓.
- `npm view @localground/mcp@3.0.1 version` → `3.0.1`; `npm view @localground/cli@3.0.1 version` → `3.0.1`; dist-tags `latest` = `3.0.1` for both.
- v3.0.1 tag on remote (annotated `e3efe8e` → commit `2a9034e`).

## Threat Flags

T-20-17 (irreversible partial publish) — did NOT materialize: the M3 pre-tag matrix + branch-(a) state meant every failed attempt left the registry untouched; the ordered mcp-then-cli publish only ran to completion on the successful attempt. T-20-18 (auth) — resolved by the npm-floor fix; pure OIDC (no token). T-20-19 (provenance) — both published with provenance.

## Follow-up for phase close / future

- **release.yml now depends on an explicit npm upgrade step** — worth noting in docs so a future maintainer doesn't remove it assuming Node 22 suffices for OIDC.
- D-02's npm-version premise should be corrected in the milestone record (the Node-version floor does NOT imply the npm-version floor).

## Self-Check: PASSED

- Both packages confirmed live at 3.0.1 via `npm view` (registry truth, not just run status)
- Release run 28354644986 = success with both publish steps green
- v3.0.1 tag on remote → commit 2a9034e (which carries the npm-upgrade fix)
- Pure OIDC (D-01); no token fallback used; H2 recovery never triggered
