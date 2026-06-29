---
gsd_state_version: 1.0
milestone: v3.0.1
milestone_name: Validation and Hardening
status: completed
stopped_at: "v3.0.1 milestone CLOSED 2026-06-29 — archived to milestones/v3.0.1-{ROADMAP,REQUIREMENTS}.md; shipped to npm as v3.0.2. Comprehension gates affirmed (Phases 19 + 20). Next: /gsd-new-milestone for v3.1.0."
last_updated: "2026-06-29T15:37:37.217Z"
last_activity: 2026-06-29
progress:
  total_phases: 5
  completed_phases: 5
  total_plans: 21
  completed_plans: 21
  percent: 100
---

# Project State

**Status:** v3.0.1 milestone CLOSED — shipped to npm as v3.0.2
**Last Activity:** 2026-06-29
**Current focus:** Planning next milestone (v3.1.0) — run `/gsd-new-milestone`

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-06-29 after v3.0.1 milestone close)

**Core value:** Get Claude Code users off cloud-synced storage safely — no data loss, no silent failures, every action verified before and after.

**Last shipped:** v3.0.1 Validation and Hardening (2026-06-29) — published to npm as `@localground/mcp@3.0.2` + `@localground/cli@3.0.2` (`latest`, SLSA-v1 provenance) after the SC5 fix-forward; full archive at `.planning/milestones/v3.0.1-ROADMAP.md`.

## Current Position

**v3.0.1 milestone CLOSED 2026-06-29.** All 5 phases (16-20) complete and verified; archived to `milestones/v3.0.1-{ROADMAP,REQUIREMENTS}.md`; ROADMAP collapsed and PROJECT.md evolved. Shipped to npm as v3.0.2 (the SC5 fix-forward — v3.0.1 binaries misreported `3.0.0`; cli/mcp now derive `--version` from package.json and a verify-tarball version-equality gate guards CI). Comprehension gates AFFIRMED for Phases 19 and 20. Optional housekeeping still open: `npm deprecate @localground/{cli,mcp}@3.0.1` (blocked on passkey 2FA — needs an npm automation token; low value since `latest` = 3.0.2).

**Next:** `/gsd-new-milestone` to scope v3.1.0 (carry-forward items below).
Last activity: 2026-06-29 -- v3.0.1 milestone closed; archived; shipped as v3.0.2

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

None. Both pipeline validations are CLOSED:

- PIPE-01: ci.yml green on the 3-OS matrix (run 28357130168 on 26659c8).
- PIPE-02: release.yml OIDC + provenance published 3.0.1 then 3.0.2 (run 28370544899); SC5 re-verified at 3.0.2.

Carry-forward to v3.1.0 (from 20-REVIEW.md / 20-07): (1) drift-proof seed `toolkitVersion` via host-injection; (2) SHA-pin GitHub Actions + exact-pin runner npm in release.yml (MD-01); (3) robust `--version` arg parsing in the mcp bin (MD-02). Optional now: `npm deprecate` 3.0.1 (needs local npm login).

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260428-lya | Mark decoder-defects debug session resolved with pointers to 17-VERIFICATION and 999.7 backlog | 2026-04-28 | 9ae8881 | [260428-lya-mark-decoder-defects-debug-session-resol](./quick/260428-lya-mark-decoder-defects-debug-session-resol/) |
| 260609-hcb | Dependency vulnerability hardening v3.0.1 — bump vitest + SDK-scoped overrides (npm audit 7→0; all 4 gates green) | 2026-06-09 | 087ff05 | [260609-hcb-dependency-vulnerability-hardening-v3-0-](./quick/260609-hcb-dependency-vulnerability-hardening-v3-0-/) |

## Deferred Items

Items acknowledged and deferred at v3.0.1 milestone close on 2026-06-29 (pre-close `audit-open` surfaced 9; all assessed non-blocking):

| Category | Item | Status / disposition |
|----------|------|----------------------|
| debug | cli-silent-long-operations | diagnosed → **v3.1.0** (this IS CLI-05 / 999.5 streaming refactor; already tracked) |
| debug | audit-includes-root-paths | diagnosed → **v3.1.0** candidate (minor: audit scans all of `C:\Users\…`; fix = project-fingerprint filter in core, used by both CLI + MCP audit; diagnosis-only, no fix applied) |
| quick_task | 260411-8t0-fix-four-nec-evaluation-findings-in-clou | missing — stale v1.2.0/v2.0-era orphan reference |
| quick_task | 260411-91n-fix-five-loose-ends-after-phase-2-comple | missing — stale v1.2.0/v2.0-era orphan reference |
| quick_task | 260411-vbq-rename-design-spec-file-from-cloud-sync- | missing — stale v1.2.0/v2.0-era orphan reference |
| quick_task | 260411-vp6-address-all-46-nec-evaluation-findings-a | missing — stale v1.2.0/v2.0-era orphan reference |
| quick_task | 260428-lya-mark-decoder-defects-debug-session-resol | missing — already completed (commit 9ae8881; see Quick Tasks Completed) |
| quick_task | 260609-hcb-dependency-vulnerability-hardening-v3-0- | missing — already completed (commit 087ff05; see Quick Tasks Completed) |
| uat_gap | (phase UAT) | status "passed" — not an open gap |

## Session Continuity

Last session: 2026-06-29
Stopped at: v3.0.1 milestone CLOSED — archived + ROADMAP collapsed + PROJECT.md evolved; shipped to npm as v3.0.2; comprehension gates (19 + 20) affirmed. Next: `/gsd-new-milestone` for v3.1.0.
Last commit: (milestone-close commits — see git log)
Resume file: None
