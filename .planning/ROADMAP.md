# Roadmap: LocalGround Toolkit

## Milestones

- ✅ **v1.2.0 Cloud-Sync Toolkit** -- Phases 1-4 (shipped 2026-04-11) -- [archive](milestones/v1.2.0-ROADMAP.md)
- ✅ **v2.0.0 Five-Prompt Toolkit with Unified Versioning** -- Phases 5-11 (shipped 2026-04-12) -- [archive](milestones/v2.0.0-ROADMAP.md)
- ✅ **v3.0.0 MCP Server + CLI Tooling** -- Phases 12-15 (shipped 2026-04-26) -- [archive](milestones/v3.0.0-ROADMAP.md)
- 🚧 **v3.0.1 Validation and Hardening** -- Phases 16-20 (in progress)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)
- 999.x: Backlog parking lot (unsequenced — see Backlog section)

## Phases (v3.0.1 -- In Progress)

- [ ] **Phase 16: Test Infrastructure Hardening** -- Restore tsc gate, eliminate Vitest cleanup hang, close two LOW-severity test hygiene findings
- [ ] **Phase 17: Core Decoder Calibration** -- Calibrate encode() regex against actual Claude Code CLI behavior; eliminate silent decode failures (WR-01)
- [ ] **Phase 18: Packaging Polish** -- Restrict mcp/cli npm tarballs to dist/ only via `files: ["dist"]`
- [ ] **Phase 19: Skill Runtime UAT** -- Execute UAT Tests 12-16 end-to-end with `@localground/mcp` registered in Claude Code
- [ ] **Phase 20: Release Pipeline Validation** -- ci.yml first green run on master + release.yml first OIDC + provenance publish on v3.0.1 tag

## Phase Details

### Phase 16: Test Infrastructure Hardening
**Goal:** Restore the strict tsc quality gate and eliminate test-suite reliability defects so subsequent codebase changes (CORE-13/14, UAT validation) land under a hardened gate.
**Depends on:** Nothing (first phase of v3.0.1; lands before codebase changes by design)
**Requirements:** TEST-01, TEST-02, TEST-03, TEST-04
**Success Criteria** (what must be TRUE):
  1. `npm run typecheck` (or equivalent `tsc --build`) exits 0 in CI on Windows, macOS, and Linux without weakening strict mode
  2. `npm test` exits with the same code Vitest reports (no hang on shutdown after suite completes)
  3. Running the full Vitest suite against an intentionally-broken `placeholder.test.ts` precondition (e.g., forced `platformResult.success = false`) causes the dependent assertions to fail loudly instead of silently no-op
  4. `decode.test.ts` no longer contains `expect(typeof result.success).toBe('boolean')` or any equivalent tautology that cannot fail given the discriminated union
  5. CI run summary shows tsc + tsup + vitest all gating master pushes
**Plans:** 3 plans
- [x] 16-01-PLAN.md (Wave 1) — TEST-03 + TEST-04 test hygiene fixes (placeholder precondition guard, decode tautology replacement)
- [x] 16-02-PLAN.md (Wave 1) — TEST-02 child-process cleanup via afterEach reapers in MCP and CLI smoke tests
- [x] 16-03-PLAN.md (Wave 2) — TEST-01 strict gate restoration via tsconfig.test.json + ci.yml step + implicit-any fixes (core → mcp → cli)

### Phase 17: Core Decoder Calibration
**Goal:** Path-hash decoding round-trips correctly for the full set of special characters Claude Code actually encodes, eliminating silent `no_candidates` failures.
**Depends on:** Phase 16 (regex calibration changes land under restored tsc gate)
**Requirements:** CORE-13, CORE-14
**Success Criteria** (what must be TRUE):
  1. `encode()` followed by `decode()` round-trips folder names containing apostrophes, ampersands, brackets, parentheses, plus signs, equals signs, and percent signs without data loss
  2. Re-running the user's original 23-path-hash reproduction case (or an equivalent reproduction case with documented coverage of the same encoding classes) returns zero unexplained `no_candidates` results — every `no_candidates` either resolves to an existing folder or has a documented reason (e.g., source folder deleted)
  3. Decoder unit tests cover at least one case per newly-supported special character class and pass on Windows, macOS, and Linux
  4. WR-01 entry in CONTEXT.md (or equivalent) is marked closed with a link to the verifying test cases
**Plans:** 2 plans
- [x] 17-01-PLAN.md (Wave 1) — CORE-13 regex widening + per-class round-trip tests in decode.ts and decode.test.ts (D-01, D-02, D-05, D-06, D-07)
- [x] 17-02-PLAN.md (Wave 2) — CORE-14 closure: 17-VERIFICATION.md with deleted-source diagnostic table + PROJECT.md WR-01 row + v3.0.0-ROADMAP.md forward-pointer (D-03, D-04, D-08, D-09)

### Phase 18: Packaging Polish
**Goal:** Published `@localground/mcp` and `@localground/cli` tarballs contain only compiled output, cutting download size for end users.
**Depends on:** Nothing (independent of TEST/CORE work; sequenced before UAT so UAT's `npm pack --dry-run` validation reflects the final tarball shape)
**Requirements:** PKG-01, PKG-02
**Success Criteria** (what must be TRUE):
  1. `packages/mcp/package.json` and `packages/cli/package.json` both contain `"files": ["dist"]`
  2. `npm pack --dry-run` (or equivalent) on each package shows `dist/` contents present and `src/`, `test/`, `tsconfig.json`, `tsup.config.ts`, and `vitest.config.ts` absent from the tarball file list
  3. `npm pack --dry-run` on each package shows `README.md` and `package.json` present alongside `dist/` (npm always preserves these regardless of `files` config — verifies `files: ["dist"]` did not unintentionally strip them)
  4. Local install from the packed tarball into a clean test directory still resolves all imports and exposes the documented entry points (smoke check that bundled `dist/` is self-sufficient)
**Plans:** 2 plans
- [x] 18-01-PLAN.md (Wave 1) — PKG-01 + initial PKG-02 verification: add files: ["dist"] to mcp/cli package.jsons, verify via npm pack --dry-run (D-04, D-05)
- [x] 18-02-PLAN.md (Wave 2) — Full PKG-02 closure: scripts/verify-tarball.mjs + ci.yml step + mcp --version handler, persistent regression guard (D-01, D-02, D-03)

### Phase 19: Skill Runtime UAT
**Goal:** All five `/localground:*` skills route correctly through the registered `@localground/mcp` server and execute end-to-end against real filesystems — including the two-session continuation-token loop that no other test exercises.
**Depends on:** Phase 17 (skills exercise decode-and-enrich code paths), Phase 18 (UAT runs against the same tarball shape that v3.0.1 will publish)
**Requirements:** UAT-01, UAT-02, UAT-03, UAT-04, UAT-05
**Success Criteria** (what must be TRUE):
  1. `/localground:seed` produces a valid `.localground-seed-manifest.json` file plus a user-readable summary, with the underlying `localground_seed` MCP tool call visible in the transcript
  2. `/localground:migrate` Session 1 writes `localground-migrate-state.json`, Claude Code restarts from the new path, Session 2 picks up the state file, completes settings migration, and exits without state loss or duplicate work
  3. `/localground:reap` invokes both `localground_verify` and `localground_health_check` and produces a natural-language report mapping findings to recommendations
  4. `/localground:cleanup` lists candidates from `localground_cleanup_scan`, requires per-item confirmation, and only deletes items the user explicitly confirms (zero deletions on items declined or skipped)
  5. `/localground:verify` invokes `localground_audit` and produces a traffic-light report whose recommendations map to actionable next steps
**Plans:** 7 plans
- [x] 19-01-PLAN.md (Wave 1) - Setup MCP registration with --scope user + UAT-01 (/localground:seed) + 19-UAT.md skeleton
- [x] 19-02-PLAN.md (Wave 2) - UAT-02 (/localground:migrate) Scenario C: 3 runs (happy + idempotency + missing-state-fallback)
- [x] 19-03-PLAN.md (Wave 3) - UAT-03 (/localground:reap) on UAT-02 destination
- [ ] 19-04-PLAN.md (Wave 4) - UAT-04 (/localground:cleanup) synthetic stale-reference fixture, mixed yes/no/skip-all
- [ ] 19-05-PLAN.md (Wave 5) - UAT-05 (/localground:verify) environment-wide audit
- [ ] 19-06-PLAN.md (Wave 6) - Tarball-gate replay (D-04): npm pack + install + 5 routing-handshake tool calls
- [ ] 19-07-PLAN.md (Wave 7) - Finalize 19-UAT.md frontmatter status + Gaps Summary

### Phase 20: Release Pipeline Validation
**Goal:** Both GitHub Actions workflows execute end-to-end for the first time — `ci.yml` green across the 3-OS matrix, and `release.yml` publishes both packages to npm with OIDC provenance and rendered per-package READMEs on the v3.0.1 tag push.
**Depends on:** Phase 16, Phase 17, Phase 18, Phase 19 (all preceding work must be merged to master before the milestone-closing tag is pushed)
**Requirements:** PIPE-01, PIPE-02, DOC-03
**Success Criteria** (what must be TRUE):
  1. The most recent `ci.yml` run on master shows green on Windows, macOS, and Linux jobs at Node 20.x; any platform-specific failures encountered earlier in the milestone are diagnosed and resolved with linked CI run IDs
  2. Pushing the `v3.0.1` tag triggers `release.yml`, which publishes both `@localground/mcp@3.0.1` and `@localground/cli@3.0.1` to npm
  3. Both published packages show provenance attestation visible on npmjs.com via the "Provenance" badge on the package page
  4. Both `@localground/mcp@3.0.1` and `@localground/cli@3.0.1` npmjs.com pages render the per-package README content (`packages/mcp/README.md` and `packages/cli/README.md` respectively) — not the empty-state placeholder shown for v3.0.0
  5. A clean machine running `npx -y @localground/cli@3.0.1 detect` resolves and executes successfully against the published artifacts
**Plans:** TBD

## Phases (v1.2.0 -- Completed)

<details>
<summary>v1.2.0 Cloud-Sync Toolkit (Phases 1-4) -- SHIPPED 2026-04-11</summary>

- [x] Phase 1: Migration v1.2.0 (2/2 plans) -- completed 2026-04-10
- [x] Phase 2: Cleanup v1.0.0 (4/4 plans) -- completed 2026-04-10
- [x] Phase 3: Verification v1.0.0 (3/3 plans) -- completed 2026-04-11
- [x] Phase 4: Documentation Updates (4/4 plans) -- completed 2026-04-11

</details>

## Phases (v2.0.0 -- Completed)

<details>
<summary>v2.0.0 Five-Prompt Toolkit (Phases 5-11) -- SHIPPED 2026-04-12</summary>

- [x] Phase 5: Housekeeping -- File Rename and Docs Restructuring (3/3 plans) -- completed 2026-04-11
- [x] Phase 6: Existing Prompt Fixes (4/4 plans) -- completed 2026-04-11
- [x] Phase 7: Sow Prompt Build (1/1 plans) -- completed 2026-04-11
- [x] Phase 8: Sow NEC Evaluation (2/2 plans) -- completed 2026-04-12
- [x] Phase 9: Seed Prompt Build (1/1 plans) -- completed 2026-04-12
- [x] Phase 10: Seed NEC Evaluation (2/2 plans) -- completed 2026-04-12
- [x] Phase 11: Documentation, Unified Versioning, and Sow-to-Reap Rename (3/3 plans) -- completed 2026-04-12

</details>

## Phases (v3.0.0 -- Completed)

<details>
<summary>v3.0.0 MCP Server + CLI Tooling (Phases 12-15) -- SHIPPED 2026-04-26</summary>

- [x] Phase 12: Monorepo Foundation and Core Library (7/7 plans) -- completed 2026-04-13
- [x] Phase 13: MCP Server (6/6 plans) -- completed 2026-04-13
- [x] Phase 14: Standalone CLI and Claude Code Skills (11/11 plans) -- completed 2026-04-26
- [x] Phase 15: Testing, CI, Publishing, and Documentation (6/6 plans) -- completed 2026-04-26

Full archive: [milestones/v3.0.0-ROADMAP.md](milestones/v3.0.0-ROADMAP.md)

</details>

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Migration v1.2.0 | v1.2.0 | 2/2 | Complete | 2026-04-10 |
| 2. Cleanup v1.0.0 | v1.2.0 | 4/4 | Complete | 2026-04-10 |
| 3. Verification v1.0.0 | v1.2.0 | 3/3 | Complete | 2026-04-11 |
| 4. Documentation Updates | v1.2.0 | 4/4 | Complete | 2026-04-11 |
| 5. Housekeeping | v2.0.0 | 3/3 | Complete | 2026-04-11 |
| 6. Existing Prompt Fixes | v2.0.0 | 4/4 | Complete | 2026-04-11 |
| 7. Sow Prompt Build | v2.0.0 | 1/1 | Complete | 2026-04-11 |
| 8. Sow NEC Evaluation | v2.0.0 | 2/2 | Complete | 2026-04-12 |
| 9. Seed Prompt Build | v2.0.0 | 1/1 | Complete | 2026-04-12 |
| 10. Seed NEC Evaluation | v2.0.0 | 2/2 | Complete | 2026-04-12 |
| 11. Documentation, Unified Versioning, and Sow-to-Reap Rename | v2.0.0 | 3/3 | Complete | 2026-04-12 |
| 12. Monorepo Foundation and Core Library | v3.0.0 | 7/7 | Complete | 2026-04-13 |
| 13. MCP Server | v3.0.0 | 6/6 | Complete | 2026-04-13 |
| 14. Standalone CLI and Claude Code Skills | v3.0.0 | 11/11 | Complete | 2026-04-26 |
| 15. Testing, CI, Publishing, and Documentation | v3.0.0 | 6/6 | Complete | 2026-04-26 |
| 16. Test Infrastructure Hardening | v3.0.1 | 3/3 | Complete    | 2026-04-27 |
| 17. Core Decoder Calibration | v3.0.1 | 2/2 | Complete    | 2026-04-27 |
| 18. Packaging Polish | v3.0.1 | 2/2 | Complete    | 2026-04-27 |
| 19. Skill Runtime UAT | v3.0.1 | 0/7 | Not Started | - |
| 20. Release Pipeline Validation | v3.0.1 | 0/0 | Not Started | - |

## Backlog

Unsequenced items remaining after v3.0.1 promotion. Promote with `/gsd-review-backlog` when ready.

### Phase 999.5: TIER 2 streaming refactor of spawnTool — real-time MCP-driven copy progress (BACKLOG)

**Goal:** Phase 14-11 closed CLI silent operations at TIER 1 (three pre-operation stderr status lines). TIER 2 changes `spawnTool` from `spawnSync` with `stdio=['ignore','pipe','pipe']` to either inherited stdio (Option A) or async `spawn()` with line-streaming via `child.stdout('data')` (Option B). Surfaces robocopy/rsync per-line progress to the user during MCP-driven copy operations through the `/localground:migrate` skill.
**Source:** `.planning/phases/14-standalone-cli-and-claude-code-skills/14-11-SUMMARY.md`; full diagnosis at `.planning/debug/cli-silent-long-operations.md` lines 148-158
**Requirements:** CLI-05 (deferred to v3.1.0; see REQUIREMENTS.md `## v3.1.0 Requirements`)
**Plans:** 0 plans
**Deferral note:** Captured under v3.1.0 Requirements in REQUIREMENTS.md — architectural change with real risk surface; TIER 1 mitigation already shipped. Will not be promoted into v3.0.1.

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

---
*Roadmap created: 2026-04-11*
*v3.0.0 phases added: 2026-04-12*
*v3.0.0 milestone closed: 2026-04-26*
*Backlog seeded at v3.0.0 close: 2026-04-26*
*v3.0.1 phases added: 2026-04-27 (promoted backlog 999.1, 999.2, 999.3, 999.4, 999.6 into Phases 16-20; 999.5 retained as backlog with v3.1.0 deferral note)*
*v3.0.1 amendment: 2026-04-27 — added DOC-03 (per-package READMEs visible on npmjs.com) mapped to Phase 20; augmented Phase 18 SC-3 to verify README inclusion in tarball; augmented Phase 20 SC-4 to verify rendered README on package pages*
