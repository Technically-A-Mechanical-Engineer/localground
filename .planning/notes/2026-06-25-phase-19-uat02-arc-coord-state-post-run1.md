# v3.0.1 Phase 19 (Skill Runtime UAT) — UAT-02 Arc — COORDINATOR State Snapshot (POST-RUN-1)

**Date:** 2026-06-25 (local; state-file timestamps are UTC = 2026-06-26T03:xx)
**Branch:** master (local-only; pushes at the v3.0.1 release tag)
**Supersedes:** `2026-06-25-phase-19-uat02-arc-coord-state.md` (pre-Run-1; that one said "UAT-02 not yet started"). Read THIS file for the current re-anchor.
**Natural break:** UAT-02 Run 1 (both sessions) closed PASS — the load-bearing two-session loop. Runs 2 + 3 pending.

## §1 Current arc state
- Workflow position: Phase 19 executing INTERACTIVELY (COORDINATOR, no subagents, no --auto, worktrees=false). 19-08 DONE. **UAT-02 Run 1 DONE (PASS).** In the UAT-02 arc, Runs 2 + 3 + the 19-UAT.md update + 19-02-SUMMARY remain.
- **SC2 = PASS.** Real `/localground:migrate` plugin command, full two-session continuation-token loop across a Claude Code restart. Session 1: `localground_copy` (72/72 files, robocopy exit 1 = success) + `localground_verify` (`allPassed: true`, seed markers survived) + state written to dest BASE path (L-7) with `session: 1`. Restart from dest with `--plugin-dir`. Session 2: cold-read state, settings scan (no-op — fixture has no `.claude/`/`CLAUDE.md`/memory), state flipped to `session: 2` + `completedTimestamp`. No state loss, no dup work.
- On-disk now: `C:/Users/rlasalle/Projects/lg-uat-19-dest/localground-migrate-state.json` = `session: 2`, `completedTimestamp: 2026-06-26T03:43:08.000Z`, per-project `settingsMigrated:false`/`referencesUpdated:false`. Dest project `lg-uat-19-dest/lg-uat-fixture-19/` = 72 files (this is the 19-03 reap target).
- Last commit SHA: **a9b0b5b** (19-08 Task 4) — UNCHANGED. Run-1 transcripts are uncommitted (plan 19-02 commits once after the SUMMARY, per interactive-COORDINATOR cadence). Working tree otherwise clean.
- THIS arc's sessions load the plugin via `claude --plugin-dir "C:/Users/rlasalle/Projects/localground"`. MCP: one `localground` → `packages/mcp/dist/index.js`, ✔ Connected (`--scope user`).

## §2 Locked decisions / ratifications
- 19-08 fixed skill-registration: 5 `/localground:*` skills register as a repo-root PLUGIN (`.claude-plugin/plugin.json` + `skills/<verb>/SKILL.md`). UAT-01 re-confirmed via real `/localground:seed`.
- D-A repo-root plugin; D-B/C-1 NO `.mcp.json` (auto-starts → competing server); UAT uses the `--scope user` local-dist MCP server only; D-C/H-4 distribution + bundled `.mcp.json` + end-user auto-register → Phase 20.
- Plugin mechanics (memory `reference_plugin_packaging`): command = skill DIR name; `name:` display-only; `.mcp.json` auto-starts; `--plugin-dir` to load, `/reload-plugins` for edits.
- UAT-02 = Scenario C (D-01): 3 runs of `/localground:migrate`. Run 1 happy-path (DONE/PASS), Run 2 idempotency, Run 3 missing-state-file. `migrate` is `disable-model-invocation` → MAINTAINER types it; COORDINATOR observes + captures.
- **Run-1 ratifications (new):** (a) state-file location L-7 = dest BASE path, confirmed. (b) Session 2 uses NO MCP tools by design — filesystem read/scan/write only; SC2's load-bearing proof is the `session:1→2` transition, not a tool-call envelope. (c) `settingsMigrated/referencesUpdated = false` is the HONEST value for this fixture (nothing in scope) — not a defect. (d) The seed manifest's OneDrive references are deliberately NOT rewritten — it must keep original-source provenance for `localground_verify`/reap; the skill's settings scope is correctly narrow (`CLAUDE.md` + `.claude/memory/` only).

## §3 EXECUTOR paste-block
N/A — solo interactive COORDINATOR arc; no separate executor session.

## §4 REVIEWER state + invocation calibration
- No open REVIEWER items for the UAT-02 arc. (19-08 plan was adversarially reviewed pre-execution: 4-lens Workflow + Codex cross-model + safety re-check; 2 guarded-deletion defects fixed + re-verified PASS; committed c83ab4a.)

## §5 Carry-forward calibration (lessons this arc)
- **AskUserQuestion blocks the user's terminal input** — don't use it when the answer needs the user to type/run something in their terminal; ask in prose (memory `feedback_askuserquestion_terminal`).
- **A backup under `~/.claude/skills/` registers as a phantom skill** (recursive scan) — keep backups OUT of the scan path. 19-08 backup relocated to `~/.claude/_localground-backup-20260625-210050`.
- **SKILL.md `name:` is display-only** for the `skills/<dir>/` layout — command derives from the directory.
- **`disable-model-invocation` skills (migrate/cleanup) are invisible to me** — maintainer must invoke; confirm slash-menu presence (`/localground` → 5).
- **Every UAT-time session needs `--plugin-dir`** or the commands vanish (production install registers globally; UAT loads ad-hoc per session).
- **`jq` is absent in this Git Bash env** — substitute `python -c` / `test` / `find` for state-file parsing. Reassess plan wording in 19-07.

## §6 Resumption flow + forward work

### Resumption checklist (post-relaunch, cold session)
1. Read this snapshot.
2. Read on-disk state `C:/Users/rlasalle/Projects/lg-uat-19-dest/localground-migrate-state.json` (expect `session: 2`).
3. Read `19-transcripts/migrate-session-1.md` + `migrate-session-2.md` (both PASS) and `19-02-PLAN.md` (Task 2 = Runs 2+3; Task 3 = 19-UAT.md update).
4. Verify plugin loaded: `/localground` → 5 commands; `claude mcp list` → one `localground` → `packages/mcp/dist/index.js`. Verify git tip a9b0b5b, tree clean (transcripts uncommitted is expected).

### Open task stubs (in-conversation task IDs; recreate if lost on restart)
- [x] #1 UAT-02 Run 1 Session 2 — DONE (PASS).
- [ ] #2 UAT-02 Run 2 (idempotency replay) + capture `migrate-idempotency.md`.
- [ ] #3 UAT-02 Run 3 (missing-state-file fallback) + capture `migrate-missing-state.md`.
- [ ] #4 Update `19-UAT.md` row 2 (SC2 → VERIFIED, frontmatter 1/5→2/5, +artifact/spot-check rows, UAT-02 → SATISFIED). Blocked by #2,#3.
- [ ] #5 Write `19-02-SUMMARY.md` (note reap target `lg-uat-19-dest/lg-uat-fixture-19/`). Blocked by #4.
- [ ] (later) UAT-03 reap → UAT-04 cleanup → UAT-05 verify → 19-06 tarball replay → 19-07 finalize.
- [ ] (housekeeping) delete `lg-uat-19-plugintest`, `~/.claude/_localground-backup-*`, and the discarded `lg-uat-19-dest-DISCARDED-broken-toolpath-s1`.

### Forward work map (Runs 2 + 3 runbook — RECOMMENDED: both in ONE fresh session)
1. **Relaunch fresh** (clean cold read; this Session-2 session already wrote `session:2`): `cd "C:/Users/rlasalle/Projects/lg-uat-19-dest"` then `claude --plugin-dir "C:/Users/rlasalle/Projects/localground"`; confirm `/localground` shows 5.
2. User re-anchors: `continue Phase 19, UAT-02 Run 2`.
3. **Run 2 (idempotency):** user types `/localground:migrate`. Skill reads state → `session: 2` (≠1) → **Session 1 logic** (no early-exit, per Correction 3) → `localground_detect` → present projects → **user declines all** → clean exit. COORDINATOR verifies state file byte-UNCHANGED (md5/content compare). Capture `migrate-idempotency.md` (anchors incl `## Skill enters Session 1 logic (NOT Session 2 — per skill spec lines 17-21)`, `## State file integrity check (post-Run-2)`).
4. **Run 3 (missing-state):** COORDINATOR deletes `<dest>/localground-migrate-state.json` (BASE path, L-7) + confirms gone → user types `/localground:migrate` → no file → Session 1 logic → detect → **user declines all** → clean exit, no stack trace. Capture `migrate-missing-state.md` (anchors incl `## Pre-run state confirmation` showing "No such file", `## Tool call: localground_detect`).
5. Then #4 (19-UAT.md row 2 → VERIFIED, 2/5) and #5 (19-02-SUMMARY) — and only then the single plan-19-02 commit.

**Deviation note for verifier:** plan 19-02 specifies a separate fresh launch per run; folding Run 2+3 into one fresh session is intentional — their on-disk preconditions differ (`session:2` present vs. file deleted), which is the actual variable under test, and one fresh launch already clears the Session-2 context contamination concern.

### Compaction guidance for future-coord-self
- Next natural break: after Run 3 closes (before the 19-UAT.md edit), or after #4/#5 land (the plan-19-02 commit point).
