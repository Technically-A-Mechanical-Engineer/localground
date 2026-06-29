# Roadmap: LocalGround Toolkit

## Milestones

- ✅ **v1.2.0 Cloud-Sync Toolkit** -- Phases 1-4 (shipped 2026-04-11) -- [archive](milestones/v1.2.0-ROADMAP.md)
- ✅ **v2.0.0 Five-Prompt Toolkit with Unified Versioning** -- Phases 5-11 (shipped 2026-04-12) -- [archive](milestones/v2.0.0-ROADMAP.md)
- ✅ **v3.0.0 MCP Server + CLI Tooling** -- Phases 12-15 (shipped 2026-04-26) -- [archive](milestones/v3.0.0-ROADMAP.md)
- ✅ **v3.0.1 Validation and Hardening** -- Phases 16-20 (shipped 2026-06-29 as v3.0.2) -- [archive](milestones/v3.0.1-ROADMAP.md)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)
- 999.x: Backlog parking lot (unsequenced — see Backlog section)

## Phases (v3.0.1 -- Completed)

<details>
<summary>✅ v3.0.1 Validation and Hardening (Phases 16-20) -- SHIPPED 2026-06-29 (published to npm as v3.0.2)</summary>

- [x] Phase 16: Test Infrastructure Hardening (3/3 plans) -- completed 2026-04-27 — restored `tsc --build` strict gate over src+test, eliminated Vitest cleanup hang, closed two test-hygiene findings (TEST-01..04)
- [x] Phase 17: Core Decoder Calibration (2/2 plans) -- completed 2026-04-27 — `encode()` regex widened to seven special-char classes; WR-01 closed with deleted-source diagnostic traceability (CORE-13, CORE-14)
- [x] Phase 18: Packaging Polish (2/2 plans) -- completed 2026-04-27 — `files: ["dist"]` on both publishable packages + CI-wired `npm pack` regression guard (PKG-01, PKG-02)
- [x] Phase 19: Skill Runtime UAT (7/7 plans) -- completed 2026-06-28 — all 5 `/localground:*` skills validated end-to-end vs the registered MCP server (incl. two-session migrate continuation loop across a restart), on both dev build and packaged tarball (UAT-01..05); comprehension AFFIRMED
- [x] Phase 20: Release Pipeline Validation (7/7 plans) -- completed 2026-06-29 — first-ever `ci.yml` (3-OS green) + `release.yml` (OIDC + provenance) runs; validation caught an SC5 defect in 3.0.1 (binaries printed 3.0.0) → fix-forward shipped v3.0.2 (PIPE-01, PIPE-02, DOC-03); comprehension AFFIRMED

Full archive: [milestones/v3.0.1-ROADMAP.md](milestones/v3.0.1-ROADMAP.md)

</details>

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
| 16. Test Infrastructure Hardening | v3.0.1 | 3/3 | Complete | 2026-04-27 |
| 17. Core Decoder Calibration | v3.0.1 | 2/2 | Complete | 2026-04-27 |
| 18. Packaging Polish | v3.0.1 | 2/2 | Complete | 2026-04-27 |
| 19. Skill Runtime UAT | v3.0.1 | 7/7 | Complete | 2026-06-28 |
| 20. Release Pipeline Validation | v3.0.1→3.0.2 | 7/7 | Complete | 2026-06-29 |

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
*v3.0.1 amendment: 2026-04-27 — added DOC-03 (per-package READMEs visible on npmjs.com) mapped to Phase 20*
*v3.0.1 milestone closed: 2026-06-29 — Phases 16-20 collapsed to archive; shipped to npm as v3.0.2 (SC5 fix-forward). Carry-forward to v3.1.0: seed toolkitVersion drift-proofing, MD-01 (SHA-pin actions), MD-02 (mcp --version parsing), CLI-05 (999.5).*
