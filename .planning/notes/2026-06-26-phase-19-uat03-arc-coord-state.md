# v3.0.1 Phase 19 (Skill Runtime UAT) — UAT-03-onward Arc — COORDINATOR State Snapshot

**Date:** 2026-06-26
**Branch:** master (local-only; pushes at the v3.0.1 release tag)
**Context threshold reached at:** user-invoked at a natural break (UAT-02 closed + committed)
**Strategic natural break:** UAT-02 fully closed — verified (5-agent workflow, 0 blockers), committed b6e2e5a, ROADMAP/STATE/memory synced; UAT-03 not yet started

## §1 Current arc state
- Workflow position: Phase 19 executing INTERACTIVELY (COORDINATOR, manual UAT, no --auto, no subagent automation OVER UAT; worktrees=false). UAT-01 ✓, UAT-02 ✓ VERIFIED. Entering UAT-03.
- Branch state: master, local-only, working tree CLEAN. Plugin loaded this session via `claude --plugin-dir "C:/Users/rlasalle/Projects/localground"`.
- Last commit SHA: **b6e2e5a** (UAT-02 closeout). Chain: c83ab4a → b3a45ff → a9b0b5b → b6e2e5a. STATE.md = plan 8/14 (57%).

## §2 Locked decisions / ratifications
- UAT-02 (SC2) VERIFIED: 3 /localground:migrate runs passed via the REAL plugin command (Run 1 two-session loop incl. real CC restart; Run 2 idempotency; Run 3 missing-state). All 3 session-detection branches exercised. Canonical evidence: 19-transcripts/migrate-{session-1,session-2,idempotency,missing-state}.md + 19-02-SUMMARY.md.
- Plugin mechanics canonical in memory reference_plugin_packaging: command = skill DIR name; name: display-only; NO .mcp.json shipped (C-1, auto-start would spawn competing server); --plugin-dir loads, EVERY UAT session needs it.
- D-04 hybrid runtime: local-dist MCP for UAT iteration; tarball-install gating at 19-06.
- migrate + cleanup are disable-model-invocation → MAINTAINER types them. seed/reap/verify are model-invocable.

## §3 EXECUTOR paste-block
N/A — solo interactive COORDINATOR arc. NOTE: during UAT-02 a SECOND CC session ran in the dest cwd (lg-uat-19-dest) and authored Session 2 + Runs 2/3 transcripts + 19-UAT.md + 19-02-SUMMARY; THIS (localground-cwd) session verified + committed. The dest session has stood down. If reused for UAT-03+, it must also launch with --plugin-dir.

## §4 REVIEWER state + invocation calibration
- UAT-02 closeout adversarially verified via a 5-agent Workflow (4 parallel dimension audits + 1 adversarial gate). Verdict VERIFIED, commit_recommendation COMMIT, 0 blockers. Decisive: restart proven transcript-independent (two distinct path-hash session dirs + dest-cwd JSONL ledger = 2 detect / 0 copy-verify). Output: tasks/wce0lqh0r.output.
- Open REVIEWER items: NONE. For UAT-03+: workflow OK to VERIFY artifacts, NOT to drive UAT.

## §5 Carry-forward calibration (lessons this arc)
- Verifying UAT artifacts via workflow is allowed; DRIVING UAT via subagents is NOT (manual-UAT constraint).
- rm -rf of pre-existing dirs is blocked by the auto-mode classifier unless explicitly named → pivot to reversible quarantine-rename (fits no-delete ethos). Stale dest = lg-uat-19-dest-DISCARDED-broken-toolpath-s1.
- Write-not-Edit on tracked .planning files: verify with `git diff` (definitive), not just grep.
- Run-sequence drift catch: ground-truth via disk (state file + transcripts) before trusting a "we're at Run N" claim.
- AskUserQuestion blocks terminal input (memory feedback_askuserquestion_terminal) — ask in prose when the user must type/look in terminal.
- session:2 state file deleted in Run 3 → not live-verifiable (MINOR); preserve a copy before missing-state deletion in 19-06.

## §6 Resumption flow + forward work

### Resumption checklist (post-compaction)
1. Read this snapshot.
2. Read memory project_next_step.md; 19-UAT.md; 19-03-PLAN.md; 19-02-SUMMARY.md (§ Hand-off).
3. Verify plugin loaded: `/localground` shows 5; `claude mcp list` → one localground → packages/mcp/dist/index.js.
4. Verify git: tip b6e2e5a; working tree clean.

### Open task stubs
- [ ] UAT-03 (19-03): /localground:reap on C:/Users/rlasalle/Projects/lg-uat-19-dest/lg-uat-fixture-19 (72 files, markers intact). SC3: reap calls localground_verify + localground_health_check → NL report mapping findings→recommendations. Capture transcript; 19-UAT.md row 3 → 3/5. reap is model-invocable.
- [ ] UAT-04 (19-04): /localground:cleanup, SYNTHETIC stale-ref fixture in os.tmpdir (D-10: file-reference ScanMatch only; 3 variants CLAUDE.md/.clauderc/.claude/memory/note.md). Mixed yes/no/skip-all; md5 diff for SC4. cleanup is disable-model-invocation → maintainer types.
- [ ] UAT-05 (19-05): /localground:verify env-wide audit (assess 6/23 null path-hash decodes here).
- [ ] 19-06: tarball-gate replay (D-04) — Run 1 only + 5 routing handshakes. PRESERVE a session:2 state-file copy before any missing-state step.
- [ ] 19-07: finalize 19-UAT.md status/verified + Gaps Summary (autonomous); reconcile jq→python plan wording.
- [ ] Post-UAT housekeeping: delete lg-uat-19-dest-DISCARDED-broken-toolpath-s1, lg-uat-19-plugintest, ~/.claude/_localground-backup-20260625-210050.
- [ ] Phase 20 (H-4): bundled .mcp.json + npx, end-user-install SC, PROJECT.md two→three forms, DOC-03.

### Forward work map
UAT-03 → UAT-04 → UAT-05 → 19-06 → 19-07 (close Phase 19) → Phase 20. Each per-skill UAT: maintainer invokes the REAL slash command (or I drive model-invocable seed/reap/verify under observation), capture transcript, update 19-UAT.md row, commit (git add -f). Milestone advances to Phase 20 only when all 5 UATs land passed.

### Compaction trigger guidance for future-coord-self
- Next natural break: after UAT-03 closes + commits, or before any mid-run CC relaunch.
- EVERY UAT session must launch with --plugin-dir or the commands vanish.
