---
phase: 19-skill-runtime-uat
verified: TBD
status: TBD
score: 5/5 truths verified
overrides_applied: 0
requirements_verified: 5/5
---

# Phase 19: Skill Runtime UAT — Evidence Index

**Phase goal:** All five `/localground:*` skills route correctly through the registered `@localground/mcp` server and execute end-to-end against real filesystems — including the two-session continuation-token loop that no other test exercises.

This index is plan-authored and updated by each plan as its UAT lands. `19-07` finalizes the frontmatter `status` and `verified` timestamp. The verifier appends a `## Verifier Cross-Check` section per D-09 (augment, do not overwrite).

### Observable Truths (Roadmap Success Criteria)

| #   | Truth                                                                                                                                                                  | Status   | Evidence                                                                                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| SC1 | `/localground:seed` produces a valid `.localground-seed-manifest.json` file plus a user-readable summary, with the underlying `localground_seed` MCP tool call visible in the transcript | VERIFIED | Re-confirmed via a REAL `/localground:seed` command (19-08 Task 4): plugin command → skill → `localground_detect` + `localground_seed` (isError:false) → manifest on disk. Evidence: `19-transcripts/plugin-registration.md` (§ Tool call (routing proof), § On-disk evidence). TOOL-only validation in `19-transcripts/seed.md` (19-01) stands as corroboration. |
| SC2 | `/localground:migrate` Session 1 writes `localground-migrate-state.json`, Claude Code restarts from the new path, Session 2 picks up the state file, completes settings migration, and exits without state loss or duplicate work | VERIFIED | `19-transcripts/migrate-session-1.md § Tool call: localground_copy`, `§ State file (post-Session-1)`; `19-transcripts/migrate-session-2.md § State file (post-Session-2)` (session: 2 + completedTimestamp); `19-transcripts/migrate-idempotency.md § Skill enters Session 1 logic` (REWORDED per Correction 3 — no session: 2 early-exit, falls into Session 1); `19-transcripts/migrate-missing-state.md § Pre-run state confirmation` (state file deleted from BASE path per L-7) + `§ Tool call: localground_detect` (Session 1 entry confirmed) |
| SC3 | `/localground:reap` invokes both `localground_verify` and `localground_health_check` and produces a natural-language report mapping findings to recommendations | VERIFIED | `19-transcripts/reap.md § Tool call: localground_health_check` (6-check response array; the seed_markers check carries `verify()` internally per index.ts:637-650, satisfying "invokes both"); `§ Skill output to user — traffic-light table` (rendered natural-language report); `§ Skill interpretation` (YELLOW — git_integrity WARN mapped to a `/localground:cleanup` recommendation; 5 PASS rolled up); `§ Manifest cross-check (post-run)` (2 markers — manifest survived UAT-02 migrate per L-6) |
| SC4 | `/localground:cleanup` lists candidates from `localground_cleanup_scan`, requires per-item confirmation, and only deletes items the user explicitly confirms (zero deletions on items declined or skipped) | VERIFIED | `19-transcripts/cleanup.md § Tool call: localground_cleanup_scan` (3 ScanMatch candidates); `§ Candidate 1 dialogue (response: yes)` (file edited), `§ Candidate 2 dialogue (response: no)`, `§ Candidate 3 dialogue (response: skip all)` (verbatim per L-8 → halt); `§ Post-run state verification` (checksum diff: exactly 1 file changed = the YES file; declined + skipped files byte-identical to pre-run, stale refs still on disk). REFRAMED per Correction 1: file-reference fixture under os.tmpdir() (D-11/D-14), NOT directory candidates (cleanup-scan emits only ScanMatch records). |
| SC5 | `/localground:verify` invokes `localground_audit` and produces a traffic-light report whose recommendations map to actionable next steps | VERIFIED | `19-transcripts/verify.md § Tool call: localground_audit` (summary: 15 projects / 60 checks / 29 PASS / 23 WARN / 8 FAIL + per-project `projects` array); `§ Skill output to user — traffic-light table per project` + `§ Skill output to user — overall summary` (RED roll-up); `§ Skill recommendations` (each WARN/FAIL class → named next step: cloud-synced → `/localground:seed`+`/localground:migrate`, not_a_git_repo → `git init`, stale refs → `/localground:cleanup`). L-11 known-reading + 6/23 null path-hash decode assessment in `§ Auto-discovery filter check`. RED is correct behavior (toolkit detects real env issues; criterion is findings→recommendations mapping). |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact                                       | Expected                                                                                          | Status   | Details                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------- |
| `19-transcripts/seed.md`                       | UAT-01 transcript with section anchors for detect + seed tool calls + on-disk evidence            | VERIFIED | Authored by plan 19-01 Task 2                                       |
| `<fixture>/.localground-seed-manifest.json`    | Valid JSON with 6 keys (version, toolkitVersion, created, projectPath, projectName, markers)       | VERIFIED | Captured in `19-transcripts/seed.md` § On-disk evidence (post-run) |
| `19-transcripts/migrate-session-1.md`          | UAT-02 Run 1 Session 1 transcript (detect + copy + verify + state-write)                          | VERIFIED | Authored by plan 19-02 Task 1                                       |
| `19-transcripts/migrate-session-2.md`          | UAT-02 Run 1 Session 2 transcript (state-read + settings + state-update)                          | VERIFIED | Authored by plan 19-02 Task 1                                       |
| `19-transcripts/migrate-idempotency.md`        | UAT-02 Run 2 idempotency replay transcript (REWORDED per Correction 3)                            | VERIFIED | Authored by plan 19-02 Task 2                                       |
| `19-transcripts/migrate-missing-state.md`      | UAT-02 Run 3 missing-state-file fallback transcript                                               | VERIFIED | Authored by plan 19-02 Task 2                                       |
| `<dest>/localground-migrate-state.json`        | State file at destination BASE path (L-7), session: 2 + completedTimestamp post-Run-1             | VERIFIED | Captured in migrate-session-1.md + migrate-session-2.md § State file sections; deleted in Run 3 (missing-state test) by design |
| `19-transcripts/reap.md`                       | UAT-03 transcript — health_check tool call + 6-check response + traffic-light table + interpretation | VERIFIED | Authored by plan 19-03 Task 1                                       |
| `19-transcripts/cleanup.md`                    | UAT-04 transcript — cleanup_scan + 3-candidate dialogues + post-run checksum diff (REFRAMED per Correction 1) | VERIFIED | Authored by plan 19-04 Task 2                                       |
| `<os.tmpdir>/lg-uat-cleanup-fixture-19/`       | Synthetic fixture (D-11/D-14 — under tmpdir, NOT real artifacts); 3 scannable files with stale OneDrive refs | VERIFIED | Created in plan 19-04 Task 1; reaped across a session-exit gap, rebuilt for the run; auto-cleaned at reboot |
| `19-transcripts/verify.md`                     | UAT-05 transcript — audit auto-discovery + per-project traffic-light + recommendations + L-11 check | VERIFIED | Authored by plan 19-05 Task 1                                       |
| (more rows added by 19-06)                     |                                                                                                  | PENDING  |                                                                    |

### Behavioral Spot-Checks

| Behavior                                            | Command                                       | Result                                              | Status |
| --------------------------------------------------- | --------------------------------------------- | --------------------------------------------------- | ------ |
| localground MCP server registered with --scope user | `claude mcp list`                             | localground present, ✔ Connected, scope=user, cross-cwd | PASS   |
| local-dist binary --version short-circuits cleanly  | `node packages/mcp/dist/index.js --version`   | exit 0; `3.0.0` to stdout; no transport-boot stderr | PASS   |
| plugin loads after `--plugin-dir` restart; seed/reap/verify register + `/localground:seed` routes end-to-end | `claude --plugin-dir <repo>` then `/localground:seed` | 3 model-invocable commands register; seed routes to MCP tools + markers on disk (19-08) | PASS |
| migrate/cleanup model-hidden (disable-model-invocation) yet user-invocable in slash menu | type `/localground` | maintainer confirmed both appear in the slash menu (2026-06-26) | PASS |
| C-1: exactly one localground MCP server (local-dist), no auto-started plugin server | `claude mcp list` | one `localground` → `packages/mcp/dist/index.js`, ✔ Connected; no competing server | PASS   |
| State file at destination BASE path (L-7)           | `test -f <dest>/localground-migrate-state.json` (post-Session-1) | exists                                 | PASS   |
| State file post-Session-2 has session: 2            | `python -c "json.load(...)" <dest>/localground-migrate-state.json` (jq absent) | session: 2 + non-null completedTimestamp | PASS   |
| Idempotency replay (Run 2) does not corrupt state   | sha256 compare (python hashlib) of state file before/after Run 2 | unchanged (`87bd066f…`, 765 bytes)     | PASS   |
| Missing-state-file fallback (Run 3) enters Session 1 cleanly | Run 3 transcript shows `localground_detect` call with no state file present | Session 1 entered, no error / no stack trace | PASS   |
| UAT-02 manifest survived migration (reap seed_markers)       | `python -c "len(json.load(...)['markers'])"` (jq absent) on `<dest>/lg-uat-fixture-19/.localground-seed-manifest.json` | 2 (>=2 expected); health_check seed_markers = PASS "All 2 markers verified" | PASS   |
| health_check returned a 6-check array                        | reap.md § Tool call: localground_health_check (response `checks` count) | 6 entries (1 WARN git_integrity, 5 PASS) | PASS   |
| Skill produced natural-language report mapping findings      | reap.md § Skill output to user — traffic-light table + § Skill interpretation | YELLOW roll-up; git_integrity WARN mapped to `/localground:cleanup` recommendation | PASS   |
| Source/target alignment byte-exact (check #6)               | reap.md § Tool call: localground_health_check (source_target_alignment detail) | PASS — 72 files, 31508 bytes match | PASS   |
| UAT-04 fixture under tmpdir (D-11/D-14)                      | `cygpath -m "$(node -e …tmpdir())"` (plan's node -e snippet broke → substituted) | path under `AppData/Local/Temp`, NOT a real maintainer dir | PASS   |
| cleanup-scan returned >= 3 ScanMatch records on fixture     | cleanup.md § Tool call: localground_cleanup_scan response               | 3 entries (filesScanned 4)                          | PASS   |
| "skip all" verbatim (L-8) halted processing                 | cleanup.md § Candidate 3 dialogue (response: skip all)                  | exact string `skip all` then halt + summary         | PASS   |
| Post-run: declined+skipped items byte-identical             | diff pre-run-checksums.txt post-run-checksums.txt                        | exactly 1 line different (the YES file only)        | PASS   |
| localground_audit auto-discovery returns summary+projects   | verify.md § Tool call: localground_audit response                       | summary keys + 15-project array (60 checks)         | PASS   |
| Recommendations map to actionable next steps (SC5)          | verify.md § Skill recommendations                                       | each WARN/FAIL class → named next step              | PASS   |
| L-11 known-reading documented (looksLikeProject filter)     | verify.md § Auto-discovery filter check                                 | root/home excluded; 6/23 null decodes not errors    | PASS   |
| (more rows added by 19-06)                          |                                               |                                                     | PENDING |

### Requirements Coverage

| Requirement | Source Plan(s) | Description                                   | Status    | Evidence                                                                       |
| ----------- | -------------- | --------------------------------------------- | --------- | ----------------------------------------------------------------------------- |
| UAT-01      | 19-01, 19-06, 19-08 | /localground:seed runtime validation          | SATISFIED | Real `/localground:seed` command routed end-to-end to MCP tools + markers on disk — `19-transcripts/plugin-registration.md` |
| UAT-02      | 19-02, 19-06   | /localground:migrate two-session loop         | SATISFIED | 4 transcripts in `19-transcripts/` + state file at destination base path; all three input states (no file / session: 1 / session: 2) exercised |
| UAT-03      | 19-03, 19-06   | /localground:reap health check                | SATISFIED | `19-transcripts/reap.md § Tool call: localground_health_check` (6-check array) + `§ Skill interpretation` (findings→recommendations); manifest survived UAT-02 migrate (post-run cross-check, 2 markers) |
| UAT-04      | 19-04, 19-06   | /localground:cleanup per-item confirmation    | SATISFIED | `19-transcripts/cleanup.md` § Candidate 1/2/3 dialogues + § Post-run state verification (checksum diff: exactly 1 file changed). Synthetic os.tmpdir fixture, reframed per Correction 1 (file-references only) |
| UAT-05      | 19-05, 19-06   | /localground:verify environment audit         | SATISFIED | `19-transcripts/verify.md § Tool call: localground_audit` (15 projects, RED roll-up) + `§ Skill recommendations` (findings→named next steps); L-11 + 6/23 null-decode assessment in `§ Auto-discovery filter check` |

**Coverage so far:** 5/5 requirement IDs satisfied; 0 pending (local-dist runtime; tarball-gate replay in 19-06 then 19-07 finalizes frontmatter status).

### Human Verification Required

Phase 19 is manual UAT. The maintainer (Robert LaSalle) executes each `/localground:*` skill in Claude Code (or directs Claude to drive it under observation) and judges pass/fail; transcripts are captured per skill. The verifier's role is to cross-check that transcripts exist with the required section anchors and that this index's frontmatter + tables match the recorded evidence — NOT to re-run the skills.

### Gaps Summary

(Populated by 19-07 after all per-skill UATs run.)

Carried forward from UAT-01 (non-blocking):
- **Doc drift (corrected in 19-01):** seed git-tag scheme is `localground/seed/<timestamp>`, not the `lg-seed-*` shown in plan 19-01 step 6 / acceptance #8 and the skill-doc example. Skill-doc example fixed; plan criterion noted in 19-01-SUMMARY. No product change. Product behaves correctly and the manifest records the real tag name, so verify/reap match downstream.
- **Decode boundary (observed, for UAT-05):** 6 of 23 path-hash entries decode to `null` (deleted/renamed folders + the `0159…CC_CLI` underscore case). To be assessed under UAT-05.

Carried forward from UAT-02 (non-blocking):
- **`jq` absent in the Git Bash env:** plan 19-02's `jq -r '.session'` verification commands fail with `command not found`; substituted `python -c` / `test` / `find` / `python hashlib` throughout. Environment/plan-assumption gap, not a product defect. Reassess plan wording in 19-07.
- **UAT-time plugin loading vs end-user install (for 19-07 / Phase 20):** every UAT session loaded the plugin ad-hoc via `claude --plugin-dir`; the migrate skill's stock Session-1 handoff omits `--plugin-dir` (it assumes a global install). Surface the UAT-time-vs-end-user loading distinction; tie to H-4 (end-user auto-register path → Phase 20).
- **Run 2/3 executed in-session (not a fresh launch):** by deliberate COORDINATOR decision (see migrate-idempotency.md), because the re-anchor snapshot lives in a different project (`localground/.planning/`) than the migrate CWD (`lg-uat-19-dest`). Session-detection is a deterministic on-disk read and idempotency is proven by sha256 before/after, so cold context was not load-bearing.
