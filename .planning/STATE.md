---
gsd_state_version: 1.0
milestone: v3.0.1
milestone_name: Validation and Hardening
status: planning
stopped_at: Phase 18 context gathered
last_updated: "2026-04-27T12:28:09.638Z"
last_activity: 2026-04-27
progress:
  total_phases: 5
  completed_phases: 2
  total_plans: 5
  completed_plans: 5
  percent: 100
---

# Project State

**Status:** Ready to plan
**Last Activity:** 2026-04-27
**Current focus:** Phase 17 — core-decoder-calibration

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-04-26 after v3.0.1 milestone start)

**Core value:** Get Claude Code users off cloud-synced storage safely — no data loss, no silent failures, every action verified before and after.

**Last shipped:** v3.0.0 MCP Server + CLI Tooling (2026-04-26) — `@localground/mcp@3.0.0` + `@localground/cli@3.0.0` live on npm; full archive at `.planning/milestones/v3.0.0-ROADMAP.md`.

## Current Position

Phase: 18
Plan: Not started
Status: Phase complete — ready for verification
Last activity: 2026-04-27

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

### Pending Todos

None.

### Blockers/Concerns

None at v3.0.1 roadmap close. Two known-deferred validation items now sequenced into Phase 20:

- ci.yml first run will land on first push to master after this commit cycle (PIPE-01)
- release.yml first OIDC + provenance run will land on first `vN.N.N` tag push (PIPE-02; v3.0.1 tag)

## Session Continuity

Last session: 2026-04-27T12:28:09.620Z
Stopped at: Phase 18 context gathered
Resume file: 
.planning/phases/18-packaging-polish/18-CONTEXT.md
