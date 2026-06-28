# v3.0.1 Phase 19 (Skill Runtime UAT) — 19-06 Tarball-Replay MID-EXECUTION — COORDINATOR State Snapshot

**Date:** 2026-06-28
**Branch:** master (local-only; first push at the v3.0.1 release tag)
**Context threshold reached at:** N/A — written deliberately at the Phase-0→Relaunch-A boundary (the tarball runtime requires a fresh session; this snapshot is the recovery channel because the coordinator session is being CLOSED, not compacted).
**Strategic natural break:** Phase 0 complete — registration swapped to tarball; about to relaunch into the tarball runtime for the UAT replays.

> **READING ORDER FOR THE RESUMING (FRESH, TARBALL-CONNECTED) SESSION:**
> 1. Read this snapshot.
> 2. Read `.planning/notes/2026-06-28-19-06-execution-checklist.md` — that is the AUTHORITATIVE step-by-step ledger. Tick its boxes on disk as you complete each step.
> 3. Before driving ANY skill, run the **Per-session witness protocol** (checklist) — confirm launch ts > swap ts (2026-06-28T17:32:34Z), config = tarball, and the process-identity witness shows tarball-only.
> 4. You ARE the coordinator+executor for this session's phase. You maintain the checklist file. There is no other live session helping.

## §1 Current arc state
- Workflow position: Phase 19 executing INTERACTIVELY, plan **19-06** (D-04 tarball-gate replay). **Phase 0 + Relaunch A DONE** (witness PASS; UAT-01 seed + UAT-02 S1 migrate both verified on tarball runtime — transcripts `tarball-seed.md` + `tarball-migrate-session-1.md` written; state `session:1` at `lg-uat-19-dest-tarball/`). **Next = Relaunch B** (migrate S2 + reap + cleanup + verify), then Phase C (restore + close).
- **ACTIVATION LESSON (Relaunch B + cleanup):** maintainer-typed disable-model-invocation skills MUST start with the slash command as the FIRST token — a leading `Run ` makes it prose and the skill never activates (hand-driving is DISQUALIFIED for UAT-02 per H-3). Checklist lines 80/93/99 corrected (no `Run ` prefix). For Relaunch B, the maintainer types bare `/localground:migrate` (skill auto-detects `session:1` → Session 2).
- **Registration swapped to TARBALL at 2026-06-28T17:32:34Z (UTC).** Now: `localground → node C:/Users/rlasalle/AppData/Local/Temp/lg-uat-19-tarball-install/node_modules/@localground/mcp/dist/index.js`, Scope: User config, ✔ Connected, single entry.
- **KNOWN-GOOD RESTORE TARGET (Phase C / abort):** `localground → node C:/Users/rlasalle/Projects/localground/packages/mcp/dist/index.js`, Scope: User config. (Captured verbatim pre-swap.)
- Tarball artifact: `packages/mcp/localground-mcp-3.0.0.tgz` (5 files, 48.7 kB); install dir `<TEMP>/lg-uat-19-tarball-install` (verified present 11:58 + survival-checked at swap). Binary `--version` → 3.0.0 (boot-sanity only, NOT runtime proof).
- Last commit SHA: **956ae03** (UAT-05 closeout). Working tree clean (this snapshot + the checklist live in gitignored `.planning/notes/`, fold into the 19-06 commit via `git add -f`).

## §2 Locked decisions / ratifications
- **Stress-test verdict: GO-WITH-CHANGES** (workflow `we4p0x4pi`, 3 Claude lenses + adversarial synthesis; 0 blockers, 8 required changes — ALL folded into the checklist). Codex cross-model lens did NOT run (config error, line 7 `.codex/config.toml`); proceeded on the Claude review.
- **MCP-pinning CONFIRMED** (claude-code-guide vs live docs + GH issues): servers load at session start, NOT hot-reloadable; `/mcp` can't repoint; no in-session repoint exists. **Fresh relaunches are MANDATORY.** Relaunch architecture is correct and load-bearing.
- **THE honesty rule (load-bearing):** both binaries are 3.0.0 with byte-identical responses → `claude mcp list/get` reads CONFIG (next-session binding), NOT the running session's live binding. The ONLY honest proof per tarball transcript = **process-identity witness** (live `node.exe` cmdline contains `lg-uat-19-tarball-install` AND none serving `packages/mcp/dist/index.js`) + launch ts > swap ts. Captured at session LAUNCH, immutable.
- D-04 carve-out: UAT-02 tarball replay = **Run 1 (happy path) ONLY**; Runs 2/3 are skill-logic branches proven under local-dist. Tighten wording to "happy-path two-session boundary" (EH-06).
- Invocation posture: seed/reap/verify model-invocable (COORDINATOR drives via Skill tool); migrate/cleanup disable-model-invocation (MAINTAINER types). Every session: `claude --plugin-dir "C:/Users/rlasalle/Projects/localground"`.
- L-1 --scope user; L-2 remove→add (no --force); L-5 fresh fixture chain; L-7 state at dest BASE; L-8 "skip all" verbatim; C-1 no .mcp.json (single server).

## §3 EXECUTOR paste-block
N/A — solo interactive COORDINATOR arc. (No EXECUTOR sub-session. The MAINTAINER types the two disable-model-invocation commands: `/localground:migrate` (S1 + S2) and `/localground:cleanup`.)

## §4 REVIEWER state + invocation calibration
- 19-06 EXECUTION STRATEGY reviewed pre-execution (workflow `we4p0x4pi`): GO-WITH-CHANGES, 0 blockers. Full findings in the workflow result; required changes folded into the checklist + provenance line at checklist bottom.
- Prior closeouts (UAT-03/04/05) each adversarially verified VERIFIED/COMMIT/0 blockers.
- **Open REVIEWER item:** the 19-06 CLOSEOUT itself should be adversarially verified at the end (Phase C, like UAT-03/04/05) before commit. Codex re-fire optional if the maintainer fixes `.codex/config.toml`.

## §5 Carry-forward calibration (lessons + the 8 review changes)
- **Process-identity witness** per driving session (EH-01/03/04/05) — PowerShell `Get-CimInstance Win32_Process -Filter "name='node.exe'" | Select ProcessId,CommandLine | fl`; paste under `## Tarball runtime witness` in every tarball transcript.
- **Honesty gate before restore** (EH-02): all 6 transcripts must carry launch-ts + launch-config + process-witness BEFORE the Phase C restore runs; captures taken at launch are immutable.
- **Hardened restore** (SR-1): scope-explicit + idempotent (remove -s user AND -s local, then add --scope user, then `claude mcp get` to confirm Scope line). Same as the checklist ABORT block.
- **Path-format discipline (IMPORTANT):** the `claude mcp add` REGISTRATION path is consumed by native Windows node → MUST be `C:/Users/...` (mixed, cygpath -m or literal), NOT MSYS `/c/Users/...` (cygpath -u). For Git Bash file ops (mkdir/rm -rf/ls) use cygpath -m or -u (both avoid the backslash footgun from `node -e tmpdir()`). The checklist's earlier `cygpath -u` in the registration command was corrected to the literal C:/ path.
- **Defer `rm -rf <tarball-install>`** to AFTER session B closes (SR-4 — Windows EBUSY on the live binary). Keep .tgz + UAT-04 fixture deletion in-session.
- **No mid-fixture session exit** for the UAT-04 tmpdir fixture (build + dialogue same session). Install-dir survival recheck at each relaunch (SR-6).
- jq absent → python/md5sum substitutes (reconcile wording in 19-07).

## §6 Resumption flow + forward work

### Per-session witness protocol (run at EVERY fresh relaunch, before any skill) — see checklist for exact commands
1. Record `claude --plugin-dir …` launch cmd + ISO ts (must be > 2026-06-28T17:32:34Z).
2. `claude mcp get localground` → confirm config = tarball.
3. Confirm the 5 `/localground:*` commands loaded.
4. PowerShell process-identity witness → tarball-only; paste under `## Tarball runtime witness`.

### Forward sequence (authoritative granular steps in the checklist)
- **Relaunch A** (any cwd): `[ME]` build fresh OneDrive fixture `lg-uat-fixture-19-tarball` (FRESH, L-5) + drive `/localground:seed` → `tarball-seed.md`. `[YOU]` type `/localground:migrate` S1 → state `session:1` at dest BASE (`lg-uat-19-dest-tarball`).
- **Relaunch B** (cd dest): install-dir survival recheck. `[YOU]` `/localground:migrate` S2 → `session:2` + timestamp. `[ME]` `/localground:reap` → `tarball-reap.md` (6-check, manifest survived). `[ME]` build UAT-04 tmpdir fixture (cygpath) → give path → `[YOU]` `/localground:cleanup` yes/no/skip-all → `tarball-cleanup.md` (md5 diff = 1 file). `[ME]` `/localground:verify` → `tarball-verify.md`.
- **HONESTY GATE:** all 6 tarball transcripts carry launch-ts>swap-ts + launch-config=tarball + process-witness=tarball-only. Restore NOT before this passes.
- **Phase C** (session B, after gate): restore reg → local-dist (hardened); `claude mcp get` confirms Scope: User config + local-dist Args. In-session delete .tgz + UAT-04 fixture; defer tarball-install rm -rf to a post-close `[YOU]` shell. Update `19-UAT.md` (local/tarball split + Tarball-Runtime Replay section + 6 artifact rows + witness spot-check rows; "happy-path" wording; --version under boot-sanity). Adversarial-verify the closeout. Write `19-06-SUMMARY.md` (record the 8 deviations). `git add -f` + commit (trailers) + update ROADMAP/STATE/memory.

### Transcript files (NEW, this plan)
`19-transcripts/tarball-{seed, migrate-session-1, migrate-session-2, reap, cleanup, verify}.md` — same load-bearing anchors as their local-dist counterparts + a `## Tarball runtime witness` anchor each.

### Files to re-read on resume
This snapshot; `2026-06-28-19-06-execution-checklist.md`; `19-06-PLAN.md`; `19-UAT.md`; the local-dist transcripts (as anchor templates) under `19-transcripts/`.

### Compaction trigger guidance
Each relaunch is a fresh session (cheap context). If a single session's context climbs >70% mid-phase, snapshot + /compact at the next `[GATE]`. Otherwise no compaction needed — relaunches reset context naturally.
