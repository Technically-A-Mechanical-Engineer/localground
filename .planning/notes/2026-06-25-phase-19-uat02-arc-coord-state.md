# v3.0.1 Phase 19 (Skill Runtime UAT) — UAT-02 Arc — COORDINATOR State Snapshot

**Date:** 2026-06-25
**Branch:** master (local-only; pushes at the v3.0.1 release tag)
**Context threshold reached at:** user-invoked at a natural break (19-08 complete)
**Strategic natural break:** 19-08 plugin-fix fully landed (all 4 tasks, committed a9b0b5b); UAT-02 not yet started

## §1 Current arc state
- Workflow position: Phase 19 executing INTERACTIVELY (COORDINATOR, no subagents, no --auto, worktrees=false). 19-08 DONE. Entering the UAT-02 arc.
- Branch state: master, local-only. THIS session has the plugin loaded via `claude --plugin-dir "C:/Users/rlasalle/Projects/localground"`.
- Last commit SHA: **a9b0b5b** (19-08 Task 4). Chain: c83ab4a (revised plan) → b3a45ff (plugin structure T1-3) → a9b0b5b (Task 4 proof). Prior tip f4a165d.

## §2 Locked decisions / ratifications
- 19-08 fixed the skill-registration defect: 5 `/localground:*` skills now register as a repo-root PLUGIN (`.claude-plugin/plugin.json` + `skills/<verb>/SKILL.md`). All 5 confirmed registered; UAT-01 re-confirmed via a real `/localground:seed` routing proof.
- D-A repo-root plugin; D-B/C-1 NO `.mcp.json` in 19-08 (it auto-starts on load → competing server); UAT uses the existing `--scope user` local-dist MCP server only; D-C/H-4 distribution + bundled `.mcp.json` + end-user auto-register → Phase 20.
- Plugin mechanics canonical in memory `reference_plugin_packaging`: command = skill DIR name; `name:` is display-only; `.mcp.json` auto-starts; `--plugin-dir` to load, `/reload-plugins` for edits.
- UAT-02 = Scenario C (D-01): 3 runs of `/localground:migrate` — Run 1 happy-path (two-session loop, the load-bearing test), Run 2 idempotency, Run 3 missing-state-file. `migrate` is `disable-model-invocation` → MAINTAINER types it; I observe + capture.

## §3 EXECUTOR paste-block
N/A — solo interactive COORDINATOR arc; no separate executor session.

## §4 REVIEWER state + invocation calibration
- 19-08 plan was adversarially reviewed before execution: 4-lens Workflow (finding-application/regression/safety/completeness) + a cross-model Codex `needs-attention` pass + a focused safety re-check. Safety lens caught 2 guarded-deletion defects (ordering + orphan SKILL.md) → fixed → re-verified PASS. All findings applied + committed (c83ab4a). No open REVIEWER items for the UAT-02 arc.

## §5 Carry-forward calibration (lessons this arc)
- **AskUserQuestion blocks the user's terminal input** — don't use it when the answer needs the user to type/run something in their terminal; ask in prose (N=2; memory `feedback_askuserquestion_terminal`).
- **A backup under `~/.claude/skills/` registers as a phantom skill** (recursive scan) — keep backups OUT of the scan path. The 19-08 backup was relocated to `~/.claude/_localground-backup-20260625-210050`.
- **SKILL.md `name:` is display-only** for the `skills/<dir>/` layout (doc delta vs the earlier claude-code-guide claim) — command derives from the directory.
- **`disable-model-invocation` skills (migrate/cleanup) are invisible to me** — maintainer must invoke and confirm slash-menu presence.

## §6 Resumption flow + forward work

### Resumption checklist (post-compaction / post-relaunch)
1. Read this snapshot.
2. Read memory `project_next_step.md`; `19-08-SUMMARY.md`; `19-02-PLAN.md`; `19-UAT.md`.
3. Verify plugin loaded: type `/localground` → 5 commands; `claude mcp list` → exactly one `localground` → `packages/mcp/dist/index.js`.
4. Verify git: tip a9b0b5b; working tree clean.

### Open task stubs
- [ ] Discard stale `C:/Users/rlasalle/Projects/lg-uat-19-dest` (invalid session:1 state — H-3).
- [ ] UAT-02 Run 1: Session 1 (detect→copy→verify→write state to dest base) → RESTART from dest with `--plugin-dir` → Session 2 (settings migration). Maintainer types `/localground:migrate` in each.
- [ ] UAT-02 Runs 2 (idempotency) + 3 (missing-state-file).
- [ ] UAT-03 (reap) → UAT-04 (cleanup, synthetic tmpdir) → UAT-05 (verify) → 19-06 tarball replay → 19-07 finalize.
- [ ] Post-UAT housekeeping: delete `lg-uat-19-plugintest` + `~/.claude/_localground-backup-*`.

### Forward work map (UAT-02 runbook — handed to user)
1. I discard `lg-uat-19-dest`. 2. **Session 1 (this/loaded session):** user types `/localground:migrate`; source = `.../Documents/lg-uat-fixture-19` (seeded, don't re-seed), dest base = `.../Projects/lg-uat-19-dest`; I drive copy/verify/state. 3. **Restart (user):** `cd "C:/Users/rlasalle/Projects/lg-uat-19-dest"` then `claude --plugin-dir "C:/Users/rlasalle/Projects/localground"`; confirm `/localground` shows 5. 4. **Session 2:** user says "continue Phase 19, UAT-02 Session 2" then `/localground:migrate`. **EVERY session needs `--plugin-dir` or the commands vanish.**

### Compaction guidance for future-coord-self
- Next natural break: after UAT-02 Run 1 closes (SC2 graded), or before the next mid-run restart.
