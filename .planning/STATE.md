---
gsd_state_version: 1.0
milestone: v3.0.1
milestone_name: Validation and Hardening
status: executing
stopped_at: "Completed Phase 20 Plan 04 — version bump 3.0.0->3.0.1 (all 5 manifests + lockfile regen, commit 4818cfb, D-06). Next: Plan 20-05 (push bump commit, CI-green wait, annotated v3.0.1 tag, release.yml OIDC publish)"
last_updated: "2026-06-29T06:06:54.387Z"
last_activity: 2026-06-29
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 21
  completed_plans: 19
  percent: 90
---

# Project State

**Status:** Ready to execute
**Last Activity:** 2026-06-29
**Current focus:** Phase 20 — release-pipeline-validation

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-26 after v3.0.1 milestone start)

**Core value:** Get Claude Code users off cloud-synced storage safely — no data loss, no silent failures, every action verified before and after.

**Last shipped:** v3.0.0 MCP Server + CLI Tooling (2026-04-26) — `@localground/mcp@3.0.0` + `@localground/cli@3.0.0` live on npm; full archive at `.planning/milestones/v3.0.0-ROADMAP.md`.

## Current Position

Phase: 20 (release-pipeline-validation) — EXECUTING
Plan: 4 of 6
Status: Wave 3 complete — version bump committed (4818cfb). Next = Wave 4 (20-05: push, CI-green, tag, OIDC publish).
Last activity: 2026-06-29

## Roadmap Summary

| Phase | Name | Requirements |
|-------|------|--------------|
| 16 | Test Infrastructure Hardening | TEST-01, TEST-02, TEST-03, TEST-04 |
| 17 | Core Decoder Calibration | CORE-13, CORE-14 |
| 18 | Packaging Polish | PKG-01, PKG-02 |
| 19 | Skill Runtime UAT | UAT-01, UAT-02, UAT-03, UAT-04, UAT-05 |
| 20 | Release Pipeline Validation | PIPE-01, PIPE-02 |

Sequencing rationale: Test infrastructure first (hardened gate amplifies confidence in subsequent codebase changes including TEST-01's own D-18 implicit-any fix). Decoder calibration second (regex changes land under restored tsc gate; closes WR-01 before UAT exercises decode). Packaging third (independent; lands before UAT so `npm pack --dry-run` validation reflects final tarball shape). UAT fourth (validates v3.0.0 codebase plus v3.0.1 fixes against registered MCP server). Release pipeline last (PIPE-02 fires only on v3.0.1 tag push, which is the milestone close; PIPE-01 monitored throughout and validated as green at close).

## Backlog

One unsequenced item remaining in ROADMAP.md `## Backlog` section after v3.0.1 promotion:

- **999.5** TIER 2 streaming refactor of spawnTool — captured as **CLI-05** under v3.1.0 Requirements in REQUIREMENTS.md; deferred to v3.1.0 (architectural change with real risk surface; TIER 1 mitigation already shipped in Phase 14-11)

Promoted into v3.0.1 Active scope (see ROADMAP.md and REQUIREMENTS.md): 999.1, 999.2, 999.3, 999.4, 999.6.

## Accumulated Context

### Decisions

Full decision log moved to PROJECT.md `## Key Decisions` section (15 v3.0.0-era decisions added at milestone close).

- [Phase 16]: Per D-Claude-1: decode.test.ts replacement asserts data.decodedPath/hashDirName on the success branch only — no failure-branch assertion to preserve test's documented 'must NOT throw' invariant
- [Phase 16]: Per D-01: no opportunistic edits — both 16-01 tasks stayed surgical inside their respective it() blocks (1-line and 5-line deltas)
- [Phase 16]: Per D-05/D-06/D-07: TEST-02 closed via describe-scoped afterEach reaper (no Vitest pool isolation, no vitest.config.ts changes); existing CLI fixture-based afterEach EXTENDED with reapChildren rather than added as a second hook
- [Phase 16]: Phase 16-03: D-18 forecast did not materialize — surfaced 0 implicit-any errors after tsconfig.test.json gate landed; live-fire probe confirmed gate is active; Task 2 vacuous (no manufactured no-op commit)
- [Phase 16]: Phase 16-03: tsconfig.test.json escape hatch (composite:false + noEmit:true at root) chosen over per-package include changes — preserves per-package rootDir while widening strict gate to test/**/* across all workspace packages
- [Phase ?]: [Phase 17-01]: Per D-01 — encode() regex widened from /[\/: ,().]/g to /[\/: ,().'&[]+=%]/g (targeted, not catch-all)
- [Phase ?]: [Phase 17-01]: Rule 3 deviation — added explicit `if (decodedPath !== null)` narrowing inside each new test to satisfy TEST-01 strict tsc gate without losing the loud-failure property of the preceding not.toBeNull() assertion
- [Phase 17]: [Phase 17-02]: WR-01 closed via Phase 17 — encode regex calibration shipped, 6/6 no_candidates documented as deleted sources, traced via 17-VERIFICATION.md (PROJECT.md Key Decisions row + v3.0.0-ROADMAP.md:144 forward-pointer; CORE-14 closure via 6-entry deleted-source diagnostic table in 17-VERIFICATION.md)
- [Phase 18-01]: PKG-01 closed via 1-line additions to packages/mcp/package.json and packages/cli/package.json — `"files": ["dist"]` inserted between `exports` and `publishConfig` per canonical npm key order; bundle invariant preserved (`@localground/core` stays in devDependencies); D-04 honored (packages/core/package.json untouched); D-05 honored (no .npmignore created)
- [Phase 18-01]: Rule 3 deviation — transient `/tmp/verify-pack.mjs` required `shell: true` on Windows for `npm.cmd` resolution (Node 20+ EINVAL on direct .cmd spawn); persistent CI-wired script in Plan 18-02 will use the production-grade Windows-aware spawn pattern
- [Phase ?]: [Phase 18-02]: PKG-02 closed under automated regression test — scripts/verify-tarball.mjs CI-wired into ci.yml step 'Verify tarball shape (npm pack + clean install)'; mcp --version short-circuit added before StdioServerTransport boot for deterministic non-server smoke-check exit path
- [Phase ?]: [Phase 18-02]: Rule 3 deviation — replaced plan-body's literal 'npm.cmd' spawn with process.execPath + npm-cli.js resolution (npm_execpath / require.resolve / fs fallback). Plan-body pattern hits EINVAL on Windows + Node 20+ without shell:true (CVE-2024-27980); shell:true forbidden by D-02. Resolution fallback retains process.platform === 'win32' branch per acceptance criteria.
- [Phase ?]: D-04 closed: repository.url set case-exact in both published manifests — E422 blocker removed
- [Phase ?]: D-05 closed: license MIT added to both published manifests
- [Phase ?]: D-13 closed: PROJECT.md updated to describe three distribution forms (MCP server, CLI, paste-prompts) plus plugin
- [Phase 20-02]: D-02 applied: release.yml node-version 20.x → 22.x (npm ≥11.5.1 OIDC floor); ci.yml untouched
- [Phase 20-02]: D-09 applied: cache: npm removed from release setup-node (cache-poisoning hardening per actions/setup-node #1358)
- [Phase 20-02]: D-07 applied: Preflight step asserts GITHUB_REF_NAME == v<mcp version> and mcp == cli version before any publish
- [Phase 20-02]: D-08 applied: Dry-run-both gate precedes both real publishes; step name documents pack/manifest guard scope, NOT auth/OIDC (review M1)
- [Phase 20-04]: D-06 satisfied — version bump 3.0.0->3.0.1 across all five manifests + lockfile regen in single commit 4818cfb; D-04/M4 per-package repository/license preserved on BOTH mcp+cli; D-10 bump-timing honored (post-CI-green, pre-tag)

### Pending Todos

None.

### Blockers/Concerns

None at v3.0.1 roadmap close. Two known-deferred validation items now sequenced into Phase 20:

- ci.yml first run will land on first push to master after this commit cycle (PIPE-01)
- release.yml first OIDC + provenance run will land on first `vN.N.N` tag push (PIPE-02; v3.0.1 tag)

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260428-lya | Mark decoder-defects debug session resolved with pointers to 17-VERIFICATION and 999.7 backlog | 2026-04-28 | 9ae8881 | [260428-lya-mark-decoder-defects-debug-session-resol](./quick/260428-lya-mark-decoder-defects-debug-session-resol/) |
| 260609-hcb | Dependency vulnerability hardening v3.0.1 — bump vitest + SDK-scoped overrides (npm audit 7→0; all 4 gates green) | 2026-06-09 | 087ff05 | [260609-hcb-dependency-vulnerability-hardening-v3-0-](./quick/260609-hcb-dependency-vulnerability-hardening-v3-0-/) |

## Session Continuity

Last session: 2026-06-29T06:06:54.372Z
Stopped at: Completed Phase 20 Plan 04 — version bump 3.0.0->3.0.1 (all 5 manifests + lockfile regen, commit 4818cfb, D-06). Next: Plan 20-05 (push bump commit, CI-green wait, annotated v3.0.1 tag, release.yml OIDC publish)
Last commit: 4818cfb (build(20): bump all manifests to 3.0.1 + regenerate lockfile (D-06))
Resume file: None
