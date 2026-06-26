---
phase: 19-skill-runtime-uat
verified: TBD
status: TBD
score: 1/5 truths verified
overrides_applied: 0
requirements_verified: 1/5
---

# Phase 19: Skill Runtime UAT — Evidence Index

**Phase goal:** All five `/localground:*` skills route correctly through the registered `@localground/mcp` server and execute end-to-end against real filesystems — including the two-session continuation-token loop that no other test exercises.

This index is plan-authored and updated by each plan as its UAT lands. `19-07` finalizes the frontmatter `status` and `verified` timestamp. The verifier appends a `## Verifier Cross-Check` section per D-09 (augment, do not overwrite).

### Observable Truths (Roadmap Success Criteria)

| #   | Truth                                                                                                                                                                  | Status   | Evidence                                                                                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| SC1 | `/localground:seed` produces a valid `.localground-seed-manifest.json` file plus a user-readable summary, with the underlying `localground_seed` MCP tool call visible in the transcript | VERIFIED | `19-transcripts/seed.md` § Tool call: localground_seed and § On-disk evidence (post-run) |
| SC2 | `/localground:migrate` Session 1 writes `localground-migrate-state.json`, Claude Code restarts from the new path, Session 2 picks up the state file, completes settings migration, and exits without state loss or duplicate work | PENDING  | See plan 19-02-PLAN.md |
| SC3 | `/localground:reap` invokes both `localground_verify` and `localground_health_check` and produces a natural-language report mapping findings to recommendations | PENDING  | See plan 19-03-PLAN.md |
| SC4 | `/localground:cleanup` lists candidates from `localground_cleanup_scan`, requires per-item confirmation, and only deletes items the user explicitly confirms (zero deletions on items declined or skipped) | PENDING  | See plan 19-04-PLAN.md |
| SC5 | `/localground:verify` invokes `localground_audit` and produces a traffic-light report whose recommendations map to actionable next steps | PENDING  | See plan 19-05-PLAN.md |

**Score:** 1/5 truths verified

### Required Artifacts

| Artifact                                       | Expected                                                                                          | Status   | Details                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------- |
| `19-transcripts/seed.md`                       | UAT-01 transcript with section anchors for detect + seed tool calls + on-disk evidence            | VERIFIED | Authored by plan 19-01 Task 2                                       |
| `<fixture>/.localground-seed-manifest.json`    | Valid JSON with 6 keys (version, toolkitVersion, created, projectPath, projectName, markers)       | VERIFIED | Captured in `19-transcripts/seed.md` § On-disk evidence (post-run) |
| (more rows added by 19-02 .. 19-06)            |                                                                                                  | PENDING  |                                                                    |

### Behavioral Spot-Checks

| Behavior                                            | Command                                       | Result                                              | Status |
| --------------------------------------------------- | --------------------------------------------- | --------------------------------------------------- | ------ |
| localground MCP server registered with --scope user | `claude mcp list`                             | localground present, ✔ Connected, scope=user, cross-cwd | PASS   |
| local-dist binary --version short-circuits cleanly  | `node packages/mcp/dist/index.js --version`   | exit 0; `3.0.0` to stdout; no transport-boot stderr | PASS   |
| (more rows added by 19-02 .. 19-06)                 |                                               |                                                     | PENDING |

### Requirements Coverage

| Requirement | Source Plan(s) | Description                                   | Status    | Evidence                                                                       |
| ----------- | -------------- | --------------------------------------------- | --------- | ----------------------------------------------------------------------------- |
| UAT-01      | 19-01, 19-06   | /localground:seed runtime validation          | SATISFIED | `19-transcripts/seed.md` § Tool call: localground_seed; on-disk manifest evidence |
| UAT-02      | 19-02, 19-06   | /localground:migrate two-session loop         | PENDING   | See 19-02-PLAN.md                                                              |
| UAT-03      | 19-03, 19-06   | /localground:reap health check                | PENDING   | See 19-03-PLAN.md                                                              |
| UAT-04      | 19-04, 19-06   | /localground:cleanup per-item confirmation    | PENDING   | See 19-04-PLAN.md                                                              |
| UAT-05      | 19-05, 19-06   | /localground:verify environment audit         | PENDING   | See 19-05-PLAN.md                                                              |

**Coverage so far:** 1/5 requirement IDs satisfied; 4 pending.

### Human Verification Required

Phase 19 is manual UAT. The maintainer (Robert LaSalle) executes each `/localground:*` skill in Claude Code (or directs Claude to drive it under observation) and judges pass/fail; transcripts are captured per skill. The verifier's role is to cross-check that transcripts exist with the required section anchors and that this index's frontmatter + tables match the recorded evidence — NOT to re-run the skills.

### Gaps Summary

(Populated by 19-07 after all per-skill UATs run.)

Carried forward from UAT-01 (non-blocking):
- **Doc drift (corrected in 19-01):** seed git-tag scheme is `localground/seed/<timestamp>`, not the `lg-seed-*` shown in plan 19-01 step 6 / acceptance #8 and the skill-doc example. Skill-doc example fixed; plan criterion noted in 19-01-SUMMARY. No product change. Product behaves correctly and the manifest records the real tag name, so verify/reap match downstream.
- **Decode boundary (observed, for UAT-05):** 6 of 23 path-hash entries decode to `null` (deleted/renamed folders + the `0159…CC_CLI` underscore case). To be assessed under UAT-05.
