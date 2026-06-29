---
phase: 19-skill-runtime-uat
verified: 2026-06-28T23:54:07Z
status: passed
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

### Tarball-Runtime Replay (19-06 — D-04 gating pass)

The five skills were **re-run on the packaged tarball runtime** (`@localground/mcp` installed from `localground-mcp-3.0.0.tgz` (48,701 B) into `<os.tmpdir>/lg-uat-19-tarball-install`, registered via `claude mcp add … node <tarball-path>`, swap @ 2026-06-28T17:32:34Z) across two fresh relaunches — proving the skills route + execute identically when served by the **published artifact** rather than the local-dist working tree (the D-04 gate).

**The honesty rule (why tarball needs its own evidence):** local-dist and tarball binaries are both `3.0.0` with byte-identical tool responses — no envelope, version string, or `claude mcp get` proves *which binary served a call*. The only honest proof is a **process-identity witness** (a live `node.exe` whose command line contains `lg-uat-19-tarball-install` AND none serving `packages/mcp/dist/index.js`) + a launch timestamp post-dating the swap. Every tarball transcript carries this witness block, captured immutably at session launch.

| SC | Tarball evidence (runtime = tarball node) |
| --- | --- |
| SC1 seed | `tarball-seed.md` — `localground_detect` + `localground_seed` (isError:false), manifest on disk, checksum d51c375d…, tag `localground/seed/2026-06-28T17-48-04-708Z` on 650a60e *(PID 5880, launch 17:37:38Z > swap)* |
| SC2 migrate | **happy-path two-session boundary** (D-04 carve-out — Runs 2/3 are skill-logic branches already proven under local-dist): `tarball-migrate-session-1.md` (S1: copy 72 files robocopy exit1, verify allPassed:true, state `session:1` at dest BASE/L-7) + `tarball-migrate-session-2.md` (S2: state `session:1→2` + non-null `completedTimestamp`; filesystem-only by design) *(S1 PID 5880; S2 PID 103716, launch 18:47:20Z > swap)* |
| SC3 reap | `tarball-reap.md` — `localground_health_check` 6-check (5 PASS, 1 WARN = expected untracked seed markers); manifest cross-check 2 markers survived migration; source/target align PASS (72 files) *(PID 103716)* |
| SC4 cleanup | `tarball-cleanup.md` — `localground_cleanup_scan` 3 ScanMatch; per-item yes/no/skip-all dialogue; post-run md5 diff = **exactly 1 file changed** (note.md `dff09930…`→`c0ace4d8…`, byte-identical to local-dist); declined/skipped byte-identical *(PID 103716)* |
| SC5 verify | `tarball-verify.md` — `localground_audit` auto-discovery, `summary{17 projects/68 checks/32P/26W/10F/FAIL}` + `projects` array; recommendations mapped; RED = correct (real findings) *(PID 103716)* |

**Result:** every skill produced behavior **identical to its local-dist counterpart** on the tarball runtime (SC5 deltas = expected residual fixtures, NOT runtime differences — see `tarball-verify.md § Delta-from-local-dist analysis`). Two relaunches: **Relaunch A** (seed + migrate S1; PID 5880 @ 17:37:38Z) and **Relaunch B** (migrate S2 + reap + cleanup + verify; PID 103716 @ 18:47:20Z — post-dating both the swap AND the SR-6 install-dir reap+recovery @ ~18:38Z). **Honesty gate: 6/6 transcripts** carry launch-ts>swap + config=tarball + tarball-only process-identity witness. Registration **restored to local-dist** post-gate (`claude mcp get` = known-good target).

**Tarball binary `--version` → `3.0.0`** is recorded as **boot-sanity only** (Phase 0) — `--version` short-circuits before the stdio transport, so it is NOT runtime proof; the per-transcript process-identity witness is the runtime proof.

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
| `19-transcripts/tarball-seed.md`              | UAT-01 tarball replay — witness + detect + seed + manifest on disk | VERIFIED | 19-06 Relaunch A (tarball PID 5880, 17:37:38Z) |
| `19-transcripts/tarball-migrate-session-1.md` | UAT-02 tarball S1 — witness + copy (72 files) + verify + state `session:1` (L-7) | VERIFIED | 19-06 Relaunch A (tarball PID 5880) |
| `19-transcripts/tarball-migrate-session-2.md` | UAT-02 tarball S2 — witness + state `session:1→2` + completedTimestamp (filesystem-only) | VERIFIED | 19-06 Relaunch B (tarball PID 103716, 18:47:20Z) |
| `19-transcripts/tarball-reap.md`              | UAT-03 tarball — witness + health_check 6-check + manifest cross-check (2 markers) | VERIFIED | 19-06 Relaunch B (tarball PID 103716) |
| `19-transcripts/tarball-cleanup.md`           | UAT-04 tarball — witness + cleanup_scan 3 candidates + md5 diff (1 file changed) | VERIFIED | 19-06 Relaunch B (tarball PID 103716) |
| `19-transcripts/tarball-verify.md`            | UAT-05 tarball — witness + audit (17 proj/68 checks) + recommendations | VERIFIED | 19-06 Relaunch B (tarball PID 103716) |

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
| Tarball process-identity witness (Relaunch A) | `Get-CimInstance … node.exe` | PID 5880 = `lg-uat-19-tarball-install`; NO local-dist node; launch 17:37:38Z > swap 17:32:34Z | PASS |
| Tarball process-identity witness (Relaunch B) | `Get-CimInstance … node.exe` | PID 103716 = tarball; NO local-dist node; launch 18:47:20Z > swap AND > recovery ~18:38Z | PASS |
| Tarball config binding (both relaunches) | `claude mcp get localground` | Args = tarball-install path, Scope: User (A connect-probe false-negative / B ✔ Connected — both overridden by live calls) | PASS |
| SR-6 install-dir reap + recovery | re-install same `.tgz` (48,701 B) | dir purged across A→B gap (MODULE_NOT_FOUND); recovered ~18:38Z byte-identical; B node post-dates recovery | PASS |
| Tarball migrate S2 state transition (SC2) | `python -c json.load(...)` | session `1→2` + completedTimestamp 2026-06-28T19:01:28.611Z; settingsMigrated/referencesUpdated=false (honest) | PASS |
| Tarball cleanup md5 diff (SC4) | `diff pre/post-run-checksums` | exactly 1 file changed (note.md); declined(no)+skipped(skip all) byte-identical | PASS |
| Tarball audit summary+projects (SC5) | `localground_audit` | summary{17/68/32P/26W/10F/FAIL} + 17-project array; deltas vs local-dist = expected residuals | PASS |
| Tarball `--version` boot-sanity (NOT runtime proof) | `node <tarball>/dist/index.js --version` | `3.0.0` exit 0 (Phase 0); short-circuits before stdio — witness is the runtime proof | PASS |
| Honesty gate: 6/6 tarball transcripts | grep witness anchor + launch-ts>swap + tarball config + no-local-dist | all 6 PASS; restore unblocked + run post-gate | PASS |
| Registration restored to local-dist post-gate | `claude mcp get localground` | Scope: User config + ✔ Connected + Args=…/packages/mcp/dist/index.js (known-good) | PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Description                                   | Status    | Evidence                                                                       |
| ----------- | -------------- | --------------------------------------------- | --------- | ----------------------------------------------------------------------------- |
| UAT-01      | 19-01, 19-06, 19-08 | /localground:seed runtime validation          | SATISFIED | Real `/localground:seed` command routed end-to-end to MCP tools + markers on disk — `19-transcripts/plugin-registration.md` |
| UAT-02      | 19-02, 19-06   | /localground:migrate two-session loop         | SATISFIED | 4 transcripts in `19-transcripts/` + state file at destination base path; all three input states (no file / session: 1 / session: 2) exercised |
| UAT-03      | 19-03, 19-06   | /localground:reap health check                | SATISFIED | `19-transcripts/reap.md § Tool call: localground_health_check` (6-check array) + `§ Skill interpretation` (findings→recommendations); manifest survived UAT-02 migrate (post-run cross-check, 2 markers) |
| UAT-04      | 19-04, 19-06   | /localground:cleanup per-item confirmation    | SATISFIED | `19-transcripts/cleanup.md` § Candidate 1/2/3 dialogues + § Post-run state verification (checksum diff: exactly 1 file changed). Synthetic os.tmpdir fixture, reframed per Correction 1 (file-references only) |
| UAT-05      | 19-05, 19-06   | /localground:verify environment audit         | SATISFIED | `19-transcripts/verify.md § Tool call: localground_audit` (15 projects, RED roll-up) + `§ Skill recommendations` (findings→named next steps); L-11 + 6/23 null-decode assessment in `§ Auto-discovery filter check` |

**Coverage so far:** 5/5 requirement IDs satisfied; 0 pending. Local-dist runtime verified (19-01..05/08); **tarball-gate replay (19-06) COMPLETE** — all 5 skills re-verified on the packaged artifact across 2 relaunches; honesty gate 6/6 PASS; registration restored to local-dist (see § Tarball-Runtime Replay). 19-07 finalizes frontmatter status.

### Human Verification Required

Phase 19 is manual UAT. The maintainer (Robert LaSalle) executes each `/localground:*` skill in Claude Code (or directs Claude to drive it under observation) and judges pass/fail; transcripts are captured per skill. The verifier's role is to cross-check that transcripts exist with the required section anchors and that this index's frontmatter + tables match the recorded evidence — NOT to re-run the skills.

### Gaps Summary

Phase 19 is observational UAT. Per CONTEXT D-17, no skill behavior changes were introduced. The following items are deliberately outside Phase 19's scope or are acknowledged non-gating findings.

**Deferred to v3.1.0** (per CONTEXT D-02, D-03):
- Crash-resume mid-loop test (D-02) — race-prone in manual UAT; belongs in deterministic Vitest against `chunk()` + `copy()`.
- Multi-project migration batching (D-03) — fixture overhead disproportionate; ROADMAP SC #2 specifies single-project handoff.

**Deferred to Phase 20** (release-pipeline validation):
- `npx -y @localground/cli@3.0.1 detect` smoke against the published tarball (Phase 20 / H-4 end-user install).
- First green CI run on master (PIPE-01).
- First OIDC + provenance publish on the `v3.0.1` tag (PIPE-02).
- npmjs.com per-package README rendering (DOC-03).
- **Bundled `.mcp.json` + npx end-user auto-register path (H-4):** every UAT session loaded the plugin ad-hoc via `claude --plugin-dir`, and the migrate skill's stock Session-1 handoff omits `--plugin-dir` (it assumes a global install). The UAT-time-vs-end-user loading distinction is validated in Phase 20.

**Known limitations** (acknowledged, not gating):
- **999.7** trailing-edge `buildCandidates` defect (Phase 17 backlog) — `encode("Trailing<X>")` strips the trailing hyphen; a CORE-13 char at the trailing edge of an intermediate path component fails decode. Active-environment impact: zero per the 2026-04-27 23-path-hash diagnostic. Fix deferred to v3.1.0.
- **L-11 known reading:** `localground_audit` filters via `looksLikeProject` (packages/mcp/src/index.ts:712-718) — filesystem-root + home-dir entries excluded (correct, not a defect). 6/23 path-hash entries decode to `null` (deleted/renamed folders + the `0159…CC_CLI` underscore case); they never become audited projects and contribute zero audit FAILs.
- **Correction 1 reframe:** `localground_cleanup_scan` emits only ScanMatch records (file references), NOT directory candidates. UAT-04 fixtures aligned with the actual code path; the cleanup skill's directory-candidate prose (localground-cleanup.md) is forward-looking spec, not currently exercised by the scan tool. Future enhancement (not Phase 19 scope per D-17).
- **UAT-02 tarball replay = Run 1 only:** the happy-path two-session boundary is exercised on the tarball runtime; Runs 2 (idempotency) and 3 (missing-state-file fallback) proved out under local-dist (plan 19-02) and depend on skill logic (state-file branch detection in localground-migrate.md), NOT the runtime path — the skill loads identically on both runtimes, so local-dist proof transitively covers the tarball runtime. (Runs 2/3 were also executed in-session rather than via a fresh launch — a deliberate COORDINATOR decision; session-detection is a deterministic on-disk read and idempotency is proven by sha256 before/after, so cold context was not load-bearing.)
- **Seed git-tag scheme** is `localground/seed/<timestamp>` (not the `lg-seed-*` shown in plan 19-01 step 6 / acceptance #8 and an earlier skill-doc example). Skill-doc example corrected in 19-01; product behavior is correct and the manifest records the real tag, so reap/verify match downstream. No product change.

**Environment/tooling findings** (NOT product defects; reconciled here):
- **`jq` absent** in the Git Bash env — plan-body `jq -r '.session'` commands fail `command not found`; substituted `python -c` / `md5sum` / `test` throughout 19-02..19-06. Plan-assumption gap, not a product issue.
- **`node -e 'require("os").tmpdir()'` breaks under Git Bash quoting** (backslash collapse) → use `cygpath` for tmpdir resolution (applied across the 19-06 replay).
- **Windows reaps loose `%TEMP%` files** across a session exit/return gap (directory shells survive) → tmpdir fixtures must be built and consumed within one continuous session (UAT-04), and long-lived tmpdir install dirs need a survival re-check across relaunch gaps (the 19-06 SR-6 install-dir reap+recovery @ ~18:38Z). Diagnosed environmental (the `scan()` source is read-only).
- **MCP path-format:** `claude mcp add` registration paths are consumed by native Windows node → must be the `C:/…` form, not MSYS `/c/…` (cygpath -u).

**Post-UAT housekeeping** (separate deliberate operation, NOT folded into Phase 19 per D-11/D-13 — preserves the safety-test invariant that the test validating "we don't accidentally delete things" must not itself become an unsafe deletion event):
- Local-dist UAT chain: `lg-uat-fixture-19/` (OneDrive, seeded) + `lg-uat-19-dest/` + quarantined `lg-uat-19-dest-DISCARDED-broken-toolpath-s1/` + `lg-uat-19-plugintest/`.
- Tarball UAT chain: `lg-uat-fixture-19-tarball/` (OneDrive) + `lg-uat-19-dest-tarball/` + the tarball install dir `<TEMP>/lg-uat-19-tarball-install/` + `packages/mcp/localground-mcp-3.0.0.tgz`.
- Guarded plugin backup `~/.claude/_localground-backup-20260625-210050/`.
- Phase 14 fixture artifacts (OneDrive QMS folder + 2535-file local target) (D-13); 3 diagnosed debug entries on the maintainer's machine (D-11).

**UAT-discovered findings:** None — all 5 UATs (UAT-01 through UAT-05) closed under BOTH the local-dist runtime (plans 19-01..05, with the skill-registration defect fixed in 19-08) AND the tarball-runtime replay (plan 19-06, D-04 gating pass) without product defects. Honesty gate 6/6 on the tarball transcripts. Phase 19 advances the milestone to Phase 20.

---

## Verifier Cross-Check

**Verifier:** Claude (gsd-verifier, D-09 cross-check) · **Cross-checked:** 2026-06-28 · **Mode:** read-only artifact verification (no skills/MCP tools re-run; manual-UAT phase)

This section is **appended** per D-09 / the `feedback_plan_authored_verification` rule. No existing index content was modified, reordered, or overwritten.

### What I independently confirmed (against on-disk evidence, not index claims)

**Transcript existence (15 files — all present in `19-transcripts/`):**
- 8 local-dist: `seed.md`, `migrate-session-1.md`, `migrate-session-2.md`, `migrate-idempotency.md`, `migrate-missing-state.md`, `reap.md`, `cleanup.md`, `verify.md`.
- 6 tarball: `tarball-seed.md`, `tarball-migrate-session-1.md`, `tarball-migrate-session-2.md`, `tarball-reap.md`, `tarball-cleanup.md`, `tarball-verify.md`.
- Plus `plugin-registration.md` (19-08 Task 4) — the primary SC1/UAT-01 routing-proof evidence the index cites.

**Section anchors (every anchor the index cites was located by grep, not assumed):**
- `seed.md`: `## Tool call: localground_detect`, `## Tool call: localground_seed`, `## On-disk evidence (post-run)` — present.
- `migrate-session-1.md`: `## Tool call: localground_copy (chunk 1)`, `## Tool call: localground_verify`, `## State file (post-Session-1)` — present.
- `migrate-session-2.md`: `## State file (post-Session-2)` — present.
- `migrate-idempotency.md`: `## Skill enters Session 1 logic (NOT Session 2 …)` — present (matches Correction 3 rewording).
- `migrate-missing-state.md`: `## Pre-run state confirmation`, `## Tool call: localground_detect` — present.
- `reap.md`: `## Tool call: localground_health_check`, `## Skill output to user — traffic-light table`, `## Skill interpretation …`, `## Manifest cross-check (post-run)` — present.
- `cleanup.md`: `## Tool call: localground_cleanup_scan`, `## Candidate 1/2/3 dialogue (yes/no/skip all)`, `## Post-run state verification` — present.
- `verify.md`: `## Tool call: localground_audit`, `## Skill output to user — traffic-light table per project`, `## Skill recommendations`, `## Auto-discovery filter check (L-11 known reading)` — present.
- `plugin-registration.md`: `## Tool call (routing proof)`, `## On-disk evidence` — present.

**Tarball runtime witness (honesty proof — the load-bearing claim):**
- All **6/6** tarball transcripts carry a `## Tarball runtime witness` anchor (grep-confirmed).
- Process-identity + launch-ts > swap-ts (2026-06-28T17:32:34Z) verified per transcript:
  - **Relaunch A** — `tarball-seed.md`, `tarball-migrate-session-1.md`: PID **5880**, launch **17:37:38Z** > swap; CommandLine = `…/lg-uat-19-tarball-install/…/dist/index.js`; explicit "NO node serving `packages/mcp/dist/index.js`".
  - **Relaunch B** — `tarball-migrate-session-2.md`, `tarball-reap.md`, `tarball-cleanup.md`, `tarball-verify.md`: PID **103716**, launch **18:47:20Z** > swap AND > recovery ~18:38Z; CommandLine = tarball-install path; live-binding proof via `localground_detect isError:false`.
- The tarball SC2 framing is **honest, not overstated**: `tarball-migrate-session-2.md` § Observations explicitly states Session 2 is filesystem-only and does NOT exercise the tarball MCP *binary* — the binary exercise lives in Relaunch-A Session 1 (`localground_copy` 72 files + `localground_verify allPassed:true` on PID 5880). The witness binds the session; the state transition (`session:1→2` + `completedTimestamp 2026-06-28T19:01:28.611Z`) is the load-bearing evidence. Index row 37 + row 96 match the transcript verbatim.

**Substantive value cross-checks (read transcript bodies, compared to index numbers):**
- SC1: `plugin-registration.md` real-command routing chain (slash → `skills/seed/SKILL.md` → `localground_detect`+`localground_seed` isError:false → 6-key manifest + sha256 `d51c375d…` + git tag on disk). Matches index row 20.
- SC2 local-dist: state file at dest **BASE** path (L-7), `session:1`, dest==src file count 72/72. Matches index + spot-check row 77.
- SC3: `health_check` 6-check array (git_integrity WARN; placeholder/cloud/path-hash/seed_markers/source_target_alignment PASS); YELLOW roll-up; WARN→`/localground:cleanup` recommendation; manifest 2 markers. Matches index row 22 + rows 81–84.
- SC4: md5 diff = **exactly 1 file changed** (note.md `dff09930…`→`c0ace4d8…`); declined(`no`) + skipped(`skip all`) byte-identical with stale OneDrive refs intact. Matches index row 23 + row 88.
- SC5 local-dist: `localground_audit summary{15/60/29P/23W/8F/FAIL}` + 15-project array; recommendations map WARN/FAIL classes to named next steps; L-11 filter documented. Matches index row 24 + rows 89–91.
- Tarball SC1: checksum `d51c375d…`, tag `localground/seed/2026-06-28T17-48-04-708Z` on commit `650a60e`. Matches index row 36.
- Tarball SC4: md5 diff exactly 1 file (note.md), byte-identical to local-dist. Matches index row 39 + row 97.
- Tarball SC5: `summary{17/68/32P/26W/10F/FAIL}`, counts reconcile (17×4=68; 32+26+10=68; FAIL=10 all not_a_git_repo). Matches index row 40 + row 98.

**Required-Artifacts on-disk spot-checks (Bash `test`/`ls`/`stat`):**
- Per-plan SUMMARYs `19-01` … `19-06` — all present. `19-07-SUMMARY.md` absent (expected — 19-07 finalizes this index; not a gap).
- Dest fixture manifest `…/lg-uat-19-dest/lg-uat-fixture-19/.localground-seed-manifest.json` — **present** (corroborates spot-check row 81, 2 markers survived migration).
- tmpdir install dir `<TEMP>/lg-uat-19-tarball-install` — **present** (consistent with the SR-6 reap+recovery narrative; not yet reaped this session).

**Frontmatter justification (`status: passed`):**
- 5/5 Observable Truths VERIFIED with on-disk evidence (confirmed above).
- 5/5 Requirements Coverage SATISFIED (UAT-01…05).
- 5/5 tarball replay rows SATISFIED.
- No terminal `diagnosed` row; no FAILED row in the Observable Truths or Requirements tables.
- `score: 5/5`, `requirements_verified: 5/5`, `overrides_applied: 0` — all consistent with the evidence.

### Discrepancies / gaps found

**None that affect phase closure.** Two informational notes (neither is a gap; both are accurate as the index records them):
1. The packaged tarball `…/packages/mcp/localground-mcp-3.0.0.tgz` is **not currently on disk** — but the index lists it only as a **post-UAT housekeeping** target (Gaps Summary, tarball UAT chain), never as a currently-present Required Artifact. The tarball was packed/installed/swapped during 19-06; its evidence is immutable in the 6 witness blocks (PID + launch-ts + CommandLine). Absence of the `.tgz` afterward is expected, not a gap.
2. The SC1 primary evidence pointer correctly migrated from the TOOL-only `seed.md` (19-01) to the real-command `plugin-registration.md` (19-08) after the skill-registration fix. The index documents this transparently (UAT-01 source plans = 19-01, 19-06, 19-08; `seed.md` retained as corroboration). Both files exist with the cited anchors. Internally consistent.

### Verdict

**VERIFIED** — the evidence index matches the recorded evidence on disk. All 15 transcripts exist with the cited section anchors; all 6 tarball transcripts carry the process-identity witness with launch timestamps post-dating the 17:32:34Z swap (PID 5880 @ 17:37:38Z; PID 103716 @ 18:47:20Z); all 5 Observable Truths, 5 Requirements, and 5 tarball replay rows are substantively corroborated (not merely asserted); no terminal `diagnosed` row exists. The honesty gate (6/6 tarball witnesses, including the explicit "Session 2 is filesystem-only / binary exercise is in Session 1" disclosure) holds. `status: passed` is justified. **Phase 19 closure is sound.**

_Verifier cross-check appended: 2026-06-28 · Claude (gsd-verifier)_
