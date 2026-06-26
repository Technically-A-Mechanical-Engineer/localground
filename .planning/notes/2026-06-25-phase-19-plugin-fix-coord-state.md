# v3.0.1 Phase 19 (Skill Runtime UAT) — Plugin-Fix Arc — COORDINATOR State Snapshot

**Date:** 2026-06-25
**Branch:** master (local-only; pushes at v3.0.1 release tag)
**Context threshold reached at:** ~57%
**Strategic natural break:** adversarial review of 19-08 closed (Codex command + 3 workflow lenses returned)

## §1 Current arc state
- Phase 19 UAT executing INTERACTIVELY (COORDINATOR-driven, no subagents, no --auto). worktrees=false.
- localground MCP registered `--scope user` → `node C:/Users/rlasalle/Projects/localground/packages/mcp/dist/index.js` (in ~/.claude.json).
- 19-01 DONE: UAT-01 tool-validated (seed manifest on disk). Commits b4f64ef (skill-doc fix) + 1ad66ed (UAT artifacts). Prior tip f4a165d.
- 19-02 Session 1 ran TOOL-PATH only (copy+verify ok, state file session:1 at lg-uat-19-dest) — NOT via a real command.
- 19-08 plugin-fix plan AUTHORED + STAGED (git add -f, uncommitted) — needs revision per review before execution.

## §2 Locked decisions
- DIAGNOSIS (confirmed): /localground:* don't register — loose `.claude/skills/*.md` aren't recognized; need a PLUGIN (`.claude-plugin/plugin.json` + `skills/<verb>/SKILL.md`). MCP tools themselves work.
- DECISION: package as a Claude Code PLUGIN named `localground` (preserves `/localground:seed` colon syntax). → plan 19-08.
- D-A repo-root plugin. D-B (UAT uses existing --scope user local-dist; npx .mcp.json = release form) — **INVALIDATED by review C-1, see §5.** D-C distribution deferred to Phase 20.

## §3 EXECUTOR paste-block
N/A — solo interactive COORDINATOR arc; no separate executor session.

## §4 REVIEWER state
- Adversarial review done. Workflow wf_f6a18480-493: 3 Opus lenses (registration, blast-radius, diagnosis) returned; Codex agent in-workflow NO-SHOWED (empty). Lens output file: `C:/Users/rlasalle/AppData/Local/Temp/claude/C--Users-rlasalle-Projects-localground/fd6fef7b-2e61-40f5-8efd-c6370b7cd68f/tasks/w6fkxra90.output`
- SEPARATE `/codex:adversarial-review` command DID run → verdict **needs-attention** (Task-3 global-deletion finding). That was the cross-model pass.
- Open: none pending; all findings captured in §5.

## §5 Carry-forward — REVIEW FINDINGS to apply to 19-08 (load-bearing)
- **CRITICAL C-1:** plugin `.mcp.json` AUTO-STARTS on plugin load (docs). D-B "ship npx .mcp.json but inactive" is FALSE → spawns 2nd `localground` server (npx unpublished→hangs, OR published v3.0.0→unfixed code) mid-UAT. FIX: don't ship/load npx .mcp.json during UAT; rely on existing --scope user local-dist; Task-4 pre-check `claude mcp list` = exactly ONE localground → dist.
- **HIGH (Codex, NEW — lenses missed):** Task 3's `rm ~/.claude/skills/localground-*.md` = unguarded deletion OUTSIDE repo. FIX: list matches → verify by hash/header → timestamped backup → maintainer approval before any delete under ~/.claude.
- **HIGH H-1:** command name = DIRECTORY name, not frontmatter `name:`. Loose files carry `name: localground-<verb>` → verbatim lift risks `/localground:localground-seed`. FIX: delete `name:` field; gates `grep -L 'name: localground-'` + `claude plugin validate` BEFORE restart.
- **HIGH H-2:** UAT-01 re-grade incomplete — 19-UAT.md still SC1 VERIFIED / score 1/5; seed "invocation" was PROSE, no slash command dispatched. FIX: flip SC1→PENDING, frontmatter→0/5; Task-4 routing proof = real `/localground:seed`.
- **HIGH H-3:** stale lg-uat-19-dest (session:1 + completed copy from broken tool-path Session 1) would launder invalid UAT-02. FIX: discard lg-uat-19-dest; re-run FULL 2-session loop via real `/localground:migrate`.
- **HIGH H-4 (PENDING USER DECISION):** end-user path (install plugin → bundled .mcp.json auto-reg → routes) validated by neither Phase 19 (D-B disables) nor Phase 20 (no SC); adds 4th distribution channel (PROJECT.md "three forms" now false; DOC-03 lacks plugin docs). FIX: split distribution into own Phase 20 plan + end-user validation SC + PROJECT.md/Key-Decisions update. **Recommended yes; awaiting maintainer.**
- **HIGH(safety) L-2:** `disable-model-invocation: true` is on migrate AND cleanup; plan note says only migrate → risk stripping cleanup (auto-invocable deletion skill). FIX: preserve on BOTH.
- **MED:** `.claude/skills/SKILL.md` "index" isn't a real concept (remove); `/reload-plugins` for inner-loop edits (full restart only first load); add `claude plugin validate` + `find -name SKILL.md` gates; add `skills/`,`.claude-plugin/` to verify-tarball FORBIDDEN_PREFIX.
- **CONFIRMED positives:** diagnosis correct+complete; plugin is the right+minimal call (directory-skills would break the colon syntax); NO npm tarball contamination (files:["dist"] + per-workspace publish + private root).
- Env: `jq` NOT installed (use python/grep); the ~/.claude/skills/localground-*.md copies are non-functional (same defect) — they're exactly what Codex's Task-3 finding is about.

## §6 Resumption flow

### Resumption checklist (post-compaction)
1. Read this snapshot.
2. Re-read: `.planning/phases/19-skill-runtime-uat/19-08-PLAN.md`, `19-UAT.md`, `19-01-SUMMARY.md`, `19-transcripts/migrate-session-1.md`; memory `project_next_step.md`.
3. Re-read lens reviews at the §4 temp output file. (Codex command output is captured in §5 — not on disk.)
4. Verify git: 19-08-PLAN.md is STAGED (git add -f) from the codex review — decide unstage vs keep at revision time.

### Open task stubs
- [ ] Resolve scope-split (H-4) — maintainer decision.
- [ ] Revise 19-08 incorporating C-1, Codex Task-3 guard, H-1, H-2, H-3, L-2, MED gates.
- [ ] Execute revised 19-08 (guarded cleanup; validate before restart).
- [ ] Restart Claude Code with plugin loaded (`--plugin-dir .`), confirm `/localground:*` register; routing proof via real `/localground:seed`.
- [ ] Re-grade UAT-01 in 19-UAT.md after real command dispatch.
- [ ] Discard lg-uat-19-dest; re-run UAT-02 full 2-session loop via real `/localground:migrate`.
- [ ] Resume UAT-03/04/05; then 19-07 finalize; 19-08-SUMMARY.

### Forward work map
Scope-split decision (H-4) FIRST (gates plan revision) → revise 19-08 → execute guarded → restart for Task-4 → re-run UAT-01 (seed) → UAT-02 (full loop) → 03/04/05 → 07.

### Compaction guidance for future-coord-self
Next natural break: after 19-08 revision is committed, or right before the Task-4 plugin-load restart.
```
