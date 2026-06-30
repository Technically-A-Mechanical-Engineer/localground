---
gsd_state_version: 1.0
milestone: v3.1.0
milestone_name: Hardening and Hygiene
status: milestone_complete
stopped_at: Phase 23 complete (Plan 23-02 CORE-16 exhaustive matrix done) -- ready for verification
last_updated: "2026-06-30T19:30:40.984Z"
last_activity: 2026-06-30
progress:
  total_phases: 3
  completed_phases: 4
  total_plans: 6
  completed_plans: 6
  percent: 133
---

# Project State

**Status:** Milestone complete
**Last Activity:** 2026-06-30
**Current focus:** Phase 23 — decoder-trailing-edge-fix

## Project Reference

See: `.planning/PROJECT.md` (updated 2026-06-29 after v3.0.1 milestone close)

**Core value:** Get Claude Code users off cloud-synced storage safely — no data loss, no silent failures, every action verified before and after.

**Last shipped:** v3.0.1 Validation and Hardening (2026-06-29) — published to npm as `@localground/mcp@3.0.2` + `@localground/cli@3.0.2` (`latest`, SLSA-v1 provenance) after the SC5 fix-forward; full archive at `.planning/milestones/v3.0.1-ROADMAP.md`.

## Current Position

Phase: 23
Plan: Not started
Status: Phase complete — ready for verification
Last activity: 2026-06-30

## Roadmap Summary

| Phase | Name | Requirements |
|-------|------|--------------|
| 21 | Supply-Chain & Bin Hardening | SEC-01, CLI-06 |
| 22 | Core Versioning & Audit Filter | BUILD-01, CORE-15 |
| 23 | Decoder Trailing-Edge Fix | CORE-16 |

Sequencing rationale: Ordered by risk isolation, not data dependency — no item hard-blocks another, and the build order is preserved (SEC-01 → CLI-06 → BUILD-01 → CORE-15 → CORE-16). Phase 21 lands first because SEC-01 is pure workflow YAML that hardens the pipeline validating everything else, and CLI-06 is an isolated single-predicate mcp-bin change that batches at zero cost. Phase 22 settles the core build-config change (BUILD-01's tsup `define`) before the risky decode edit, and pairs it with the additive CORE-15 audit-filter (reproduce-first — may resolve to a regression-lock test). Phase 23 isolates CORE-16, the highest-risk item, last: it touches the load-bearing v3.0.0 OneDrive `buildCandidates` fix, so it lands with the full hardened suite as its safety net and nothing blocked behind it. The cross-cutting v3.0.1 lesson — assert the VALUE, not the shape — is encoded as a value assertion in every phase's success criteria.

## Backlog

One unsequenced item remaining in ROADMAP.md `## Backlog` section:

- **999.5** TIER 2 streaming refactor of spawnTool — captured as **CLI-05** under `## Future Requirements` in REQUIREMENTS.md; deferred to **v3.2.0** (architectural change with real risk surface; TIER 1 mitigation already shipped in Phase 14-11).

Promoted into v3.1.0 (see ROADMAP.md and REQUIREMENTS.md): **999.7 → CORE-16 → Phase 23** (path-hash decode trailing-edge fix).

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
- [Phase ?]: [Phase 21-01]: D-01/D-02 SHA-pin actions/checkout+setup-node; pinact@v4.1.0 ubuntu-only verify-pins job fail-closed
- [Phase ?]: [Phase 21-01]: D-04/D-05/D-06 npm exact-pinned 11.18.0; Node floor 22.14.0; numeric sort-V floor-assert; floating 22.x removed
- [Phase ?]: [Phase 21-01]: D-08 .github/dependabot.yml created; github-actions weekly grouped; run: literal gap documented with manual-bump note
- [Phase ?]: [Phase 21-01]: D-11 SLSA-provenance attestation closure is a next-real-release obligation (not CI-on-push)
- [Phase 21-02]: D-12/D-13/D-14 closed: isVersionRequest() helper matches --version, --version=…, -v, -V; case-sensitive --Version/--VERSION/--versions/--versioned fall through; no commander/yargs added; verify-tarball contract intact; positive-handshake proof locks fall-through behavior
- [Phase 22-01]: D-01 Option A — seed() parameterized with toolkitVersion: string; mcp/index.ts:294 passes SERVER_VERSION, cli/index.ts:136 passes VERSION; '3.0.2' literal removed; no build-config change, no ambient global, no runtime package.json read in core
- [Phase 22-01]: D-02 — all 7 existing seed() calls updated to 2-arg form; TOOLKIT_VERSION='9.9.9-test' constant; new value-equality test: expect(result.data.toolkitVersion).toBe(TOOLKIT_VERSION)
- [Phase 22-01]: D-03 — verify-tarball.mjs extended with seed-path value gate; CLI branch invokes bin seed --json; MCP branch uses JSON-RPC StdioClientTransport driver; both assert manifestVersion === expectedVersion; both tarballs passed (version=3.0.2, seedManifest=3.0.2)
- [Phase 22-01]: Rule 1 auto-fix — verify.test.ts 3 seed() calls updated to 2-arg form (not in plan scope; arity change caused TS2554 errors in build:check)
- [Phase ?]: D-04: regression-lock test looksLikeProject.test.ts created (12 tests)
- [Phase ?]: D-05: no marker check — plain-folder discovery tripwire test locked; looksLikeProject stays pure string->boolean
- [Phase ?]: D-06 (a+b): users-container guard rejects other-user homes; AppData first-segment rejects both AppData and AppData/Local; denylist AppData only; intentional exception documented
- [Phase ?]: D-07 HIGH-3 fix: detect enrichedProjects now .filter(looksLikeProject) on both CLI and MCP (2 filter sites per file; audit + detect)
- [Phase 23-01]: D-03 — RED-proven real-fs trailing-edge fixture (tmpDir/Trailing&/sub) committed first; confirmed `no_candidates` on master before any fix code landed
- [Phase 23-01]: L-01 — additive `encodedName + '--'` Case 3 branch added inside buildCandidates' existing loop, immediately after the unmodified single-hyphen Case 2 branch; no generalization to N hyphens
- [Phase 23-01]: D-01 — decode() verify-then-return: `candidates.find((c) => encode(c).toLowerCase() === hashDirName.toLowerCase())` replaces best-guess-first `candidates[0]`; no match falls back to `no_candidates`
- [Phase 23-01]: L-02 — encode() left byte-unchanged; confirmed via direct grep against the original character-class and hyphen-strip regex text
- [Phase 23-01]: Step 4 — maxCandidates cap (20) left unchanged; additive branch adds at most one extra recursion per matching entry and the D-01 filter scans the full candidate list, not positional order; escalation deferred to 23-02 if the exhaustive matrix proves otherwise
- [Phase 23-02]: Both matrix and OneDrive/Foo&& guard tasks landed in one commit (91b4867) since the plan's code blocks place them in the same describe block; no content deviation
- [Phase 23-02]: Confirmed both trailing-edge AND leading-edge matrix rows are flips repaired by the 23-01 additive '--' branch (master returns no_candidates for both); only mid-component, interior-with-child, and leaf are non-regression guards

### Pending Todos

None.

### Blockers/Concerns

None. Both pipeline validations are CLOSED:

- PIPE-01: ci.yml green on the 3-OS matrix (run 28357130168 on 26659c8).
- PIPE-02: release.yml OIDC + provenance published 3.0.1 then 3.0.2 (run 28370544899); SC5 re-verified at 3.0.2.

Carry-forward to v3.1.0 (from 20-REVIEW.md / 20-07), now scoped into Phases 21-23: (1) drift-proof seed `toolkitVersion` (BUILD-01 → Phase 22); (2) SHA-pin GitHub Actions + exact-pin runner npm in release.yml (SEC-01/MD-01 → Phase 21); (3) robust `--version` arg parsing in the mcp bin (CLI-06/MD-02 → Phase 21); plus CORE-15 (audit filter → Phase 22) and CORE-16 (decode trailing-edge → Phase 23). Optional housekeeping: `npm deprecate` 3.0.1 (needs local npm login).

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260428-lya | Mark decoder-defects debug session resolved with pointers to 17-VERIFICATION and 999.7 backlog | 2026-04-28 | 9ae8881 | [260428-lya-mark-decoder-defects-debug-session-resol](./quick/260428-lya-mark-decoder-defects-debug-session-resol/) |
| 260609-hcb | Dependency vulnerability hardening v3.0.1 — bump vitest + SDK-scoped overrides (npm audit 7→0; all 4 gates green) | 2026-06-09 | 087ff05 | [260609-hcb-dependency-vulnerability-hardening-v3-0-](./quick/260609-hcb-dependency-vulnerability-hardening-v3-0-/) |

## Deferred Items

Items acknowledged and deferred at v3.0.1 milestone close on 2026-06-29 (pre-close `audit-open` surfaced 9; all assessed non-blocking):

| Category | Item | Status / disposition |
|----------|------|----------------------|
| debug | cli-silent-long-operations | diagnosed → **v3.2.0** (this IS CLI-05 / 999.5 streaming refactor; deferred from v3.1.0) |
| debug | audit-includes-root-paths | diagnosed → **v3.1.0** (now CORE-15 → Phase 22; reproduce against master first — may resolve to a regression-lock test) |
| quick_task | 260411-8t0-fix-four-nec-evaluation-findings-in-clou | missing — stale v1.2.0/v2.0-era orphan reference |
| quick_task | 260411-91n-fix-five-loose-ends-after-phase-2-comple | missing — stale v1.2.0/v2.0-era orphan reference |
| quick_task | 260411-vbq-rename-design-spec-file-from-cloud-sync- | missing — stale v1.2.0/v2.0-era orphan reference |
| quick_task | 260411-vp6-address-all-46-nec-evaluation-findings-a | missing — stale v1.2.0/v2.0-era orphan reference |
| quick_task | 260428-lya-mark-decoder-defects-debug-session-resol | missing — already completed (commit 9ae8881; see Quick Tasks Completed) |
| quick_task | 260609-hcb-dependency-vulnerability-hardening-v3-0- | missing — already completed (commit 087ff05; see Quick Tasks Completed) |
| uat_gap | (phase UAT) | status "passed" — not an open gap |

## Session Continuity

Last session: 2026-06-30T19:30:40.970Z
Stopped at: Phase 23 complete (Plan 23-02 CORE-16 exhaustive matrix done) -- ready for verification
Last commit: b89c3e7 docs(23-01): append self-check result to summary
Resume file: None
