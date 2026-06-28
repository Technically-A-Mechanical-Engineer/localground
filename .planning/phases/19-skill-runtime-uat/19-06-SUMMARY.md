---
phase: 19-skill-runtime-uat
plan: 06
subsystem: uat
tags: [uat, mcp, skill-runtime, tarball, d-04, process-identity-witness, honesty-gate, relaunch, manual-uat]

# Dependency graph
requires:
  - phase: 19-skill-runtime-uat (plan 05)
    provides: "all 5 SCs VERIFIED for the local-dist runtime; 19-UAT.md score 5/5"
  - phase: 19-skill-runtime-uat (plan 08)
    provides: "genuine plugin-routed slash-command activation (post-fix) — required for the disable-model-invocation migrate/cleanup commands"
  - phase: 19-skill-runtime-uat (plan 06 Phase 0)
    provides: "tarball pack (localground-mcp-3.0.0.tgz, 48,701 B) + install into <tmpdir>/lg-uat-19-tarball-install + registration swap @ 2026-06-28T17:32:34Z"
provides:
  - "UAT-01..05 re-verified on the TARBALL runtime (D-04 outer loop) — the published artifact routes + executes identically to local-dist; UAT-02 per the D-04 carve-out = happy-path two-session boundary only"
  - "Honesty gate PASS: 6/6 tarball transcripts carry launch-ts>swap + config=tarball + tarball-only process-identity witness, captured immutably at launch before any restore"
  - "Registration restored to local-dist (known-good target); env returned to inner-loop state"
  - "6 tarball transcripts in 19-transcripts/ (tarball-{seed,migrate-session-1,migrate-session-2,reap,cleanup,verify}.md); 19-UAT.md § Tarball-Runtime Replay + 6 artifact rows + 10 spot-check rows"
affects: [phase-19-07-finalize]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MCP servers bind at session start and are NOT hot-reloadable (claude-code-guide + live docs confirmed) — fresh relaunches are MANDATORY to repoint; relaunch architecture is load-bearing, not optional"
    - "THE honesty rule: local-dist + tarball binaries are both 3.0.0 with byte-identical responses; claude mcp get reads CONFIG (next-session binding), NOT the running session's live binding. Only honest runtime proof = process-identity witness (live node.exe cmdline contains lg-uat-19-tarball-install AND none serving packages/mcp/dist/index.js) + launch ts > swap ts, captured at launch"
    - "Session-2 of migrate is filesystem-only by design (no MCP tool calls); the tarball BINARY exercise for migrate lives in Session-1 (copy+verify). Witness proves the binding; the two-session loop proves the restart-bound state handoff"
    - "SR-6: %TEMP% is reaped across session-exit gaps on Windows — install-dir survival recheck at each relaunch is load-bearing, not a nicety (it fired for real this arc)"

key-files:
  created:
    - .planning/phases/19-skill-runtime-uat/19-transcripts/tarball-seed.md
    - .planning/phases/19-skill-runtime-uat/19-transcripts/tarball-migrate-session-1.md
    - .planning/phases/19-skill-runtime-uat/19-transcripts/tarball-migrate-session-2.md
    - .planning/phases/19-skill-runtime-uat/19-transcripts/tarball-reap.md
    - .planning/phases/19-skill-runtime-uat/19-transcripts/tarball-cleanup.md
    - .planning/phases/19-skill-runtime-uat/19-transcripts/tarball-verify.md
  modified:
    - .planning/phases/19-skill-runtime-uat/19-UAT.md

key-decisions:
  - "Stress-test verdict GO-WITH-CHANGES (workflow we4p0x4pi; 3 Claude lenses + adversarial synthesis; 0 blockers, 8 required + 6 nice-to-have changes ALL folded into the execution checklist). Codex cross-model lens did NOT run (.codex/config.toml error) — proceeded on the Claude review"
  - "D-04 carve-out: UAT-02 tarball replay = Run 1 (happy path) ONLY; Runs 2/3 are skill-logic branches already proven under local-dist (19-02). Wording tightened to 'happy-path two-session boundary' (EH-06)"
  - "Invocation posture: seed/reap/verify model-invocable (COORDINATOR drove via Skill tool); migrate/cleanup disable-model-invocation (MAINTAINER typed, slash command as FIRST token — a leading 'Run ' makes it prose and the skill never activates; hand-driving is DISQUALIFIED per H-3)"
  - "SR-6 fired for real: the tarball install dir was purged from %TEMP% across the Relaunch-A→B gap (MODULE_NOT_FOUND). Recovered by reinstalling the SAME byte-identical .tgz (48,701 B, NOT re-packed) so all 6 transcripts test ONE artifact; the recovered node post-dates the recovery, preserving the honesty chain"
  - "Honesty gate enforced BEFORE restore (EH-02): all 6 transcripts verified to carry the witness while still tarball-bound; restore run only after the gate passed"

requirements-completed: [UAT-01, UAT-02, UAT-03, UAT-04, UAT-05]

# Metrics
duration: "Phase 0 prep + 2 relaunch sessions (A: seed + migrate S1; B: migrate S2 + reap + cleanup + verify) + closeout"
completed: 2026-06-28
---

# Phase 19 Plan 06: Skill Runtime UAT — Tarball-Gate Replay (D-04) Summary

**All five `/localground:*` skills were re-verified on the PACKAGED tarball runtime (`@localground/mcp` installed from `localground-mcp-3.0.0.tgz` into `<tmpdir>/lg-uat-19-tarball-install`, registration swapped @ 2026-06-28T17:32:34Z) across two fresh relaunches. Every skill produced behavior identical to its local-dist counterpart; the honesty gate passed 6/6 (each transcript carries a process-identity witness proving the live binary was the tarball, with a launch timestamp post-dating the swap); registration was restored to local-dist after the gate. This closes the D-04 outer loop — the published artifact, not just the working tree, routes and executes correctly. UAT-02 per the carve-out covers the happy-path two-session boundary only.**

## How this plan ran

Manual UAT, executed **interactively** (COORDINATOR-driven; `worktrees=false`, sequential). Because MCP servers bind at session start and are not hot-reloadable, the replay required **fresh relaunches** to repoint the runtime from local-dist → tarball:

- **Phase 0 (pre-flight):** packed the tarball, installed it with `--ignore-scripts`, captured the verbatim pre-swap registration (known-good restore target, SR-2), wrote the mid-exec handoff snapshot, and swapped the registration to the tarball path. Each subsequent launch must post-date the swap (17:32:34Z).
- **Relaunch A** (`claude --plugin-dir …`, any cwd): re-anchored from snapshot → ran the per-session witness (PID 5880, launch 17:37:38Z) → drove `/localground:seed` (model-invocable) → maintainer typed `/localground:migrate` (Session 1: copy 72 files + verify + state `session:1` at dest BASE, L-7).
- **Relaunch B** (cd dest; `claude --plugin-dir …`): re-anchored → witness (PID 103716, launch 18:47:20Z) → maintainer typed `/localground:migrate` (Session 2: state `1→2` + completedTimestamp) → COORDINATOR drove `/localground:reap`, then maintainer-typed `/localground:cleanup` (yes/no/skip-all), then COORDINATOR drove `/localground:verify`.
- **Closeout (this session = Relaunch B "try 3"):** honesty gate verified 6/6 → restore → in-session cleanup → 19-UAT.md update → this SUMMARY → adversarial verification → commit (on authorization).

## Accomplishments (acceptance criteria)

| SC | Skill | Tarball result | Transcript |
| --- | --- | --- | --- |
| SC1 | seed | `localground_seed` isError:false; manifest on disk; checksum d51c375d…; tag on 650a60e | `tarball-seed.md` |
| SC2 | migrate | S1 copy 72 files (robocopy exit1) + verify allPassed:true + state `session:1` (L-7); S2 state `1→2` + completedTimestamp (filesystem-only) — happy-path two-session boundary | `tarball-migrate-session-{1,2}.md` |
| SC3 | reap | health_check 6-check (5 PASS, 1 WARN=expected untracked seed markers); manifest cross-check 2 markers survived; source/target align PASS (72 files) | `tarball-reap.md` |
| SC4 | cleanup | cleanup_scan 3 ScanMatch; per-item confirm; md5 diff = exactly 1 file changed (note.md `dff09930…`→`c0ace4d8…`, byte-identical to local-dist); declined/skipped byte-identical | `tarball-cleanup.md` |
| SC5 | verify | audit auto-discovery summary{17/68/32P/26W/10F/FAIL} + projects array; recommendations mapped; RED = correct | `tarball-verify.md` |

**Honesty gate:** 6/6 transcripts carry (a) launch ts > swap 17:32:34Z (A:17:37:38Z / B:18:47:20Z; B also > recovery ~18:38Z), (b) config = tarball, (c) tarball-only process-identity witness. **Restore** to local-dist confirmed via `claude mcp get` (Scope: User config + ✔ Connected + Args=…/packages/mcp/dist/index.js = known-good target).

## Deviations from Plan

The stress-test review (GO-WITH-CHANGES) folded **8 required changes + 6 nice-to-haves** into the execution checklist. All were applied:

**Required (8):**
| ID | Change | How applied |
| --- | --- | --- |
| EH-01/03/04 | process-identity witness + launch-timestamp, captured immutably at launch | every transcript carries a `## Tarball runtime witness` block (Get-CimInstance node.exe + launch ts > swap), written before any skill ran |
| EH-02 | restore-ordering honesty gate | all 6 transcripts verified to carry the witness BEFORE restore; restore run only post-gate |
| SR-1 | hardened scope-explicit idempotent restore | `remove -s user` + `remove -s local` (double-remove) + `add --scope user` + `claude mcp get` verify |
| SR-2 | verbatim pre-swap registration snapshot | known-good target captured in Phase 0 + the ABORT block |
| SR-4 | defer tarball-install `rm -rf` to post-session | in-session cleanup deleted only `.tgz` + UAT-04 fixture; install dir left for post-close `[YOU]` (EBUSY) |
| SR-5 | cygpath everywhere | registration path = native `C:/…`; Git-Bash file ops via `cygpath -u`/`-m`; UAT-04 fixture path handed to scanner in native form |
| EH-07 | runtime-witness rows in acceptance | 19-UAT.md gained process-identity-witness spot-check rows (both relaunches) |
| EH-05 | full-registration-scope check | witness records Scope: User config + single entry each session |

**Nice-to-haves (6):** SR-6 install-dir survival recheck (fired for real — see below); SR-7 per-relaunch plugin-load check; EH-06 UAT-02 "happy-path two-session boundary" wording; EH-08 `--version` recorded as boot-sanity, NOT runtime proof; SR-8 residual-fixtures note in verify; (EH-05 above).

**Execution-time deviations (beyond the planned changes):**
- **SR-6 fired for real.** The tarball install dir was purged from `%TEMP%` across the Relaunch-A→B gap (`MODULE_NOT_FOUND`, zero live localground node, true-negative `claude mcp get`). Recovered ~18:38Z by reinstalling the **same byte-identical** `.tgz` (NOT re-packed) into the same path; registration unchanged; Relaunch-B node post-dates the recovery, preserving the honesty chain. The planned "nice-to-have recheck" became load-bearing.
- **"try 2" snapshot-discovery miss.** A bare "resume from snapshot" with cwd=dest found no `.planning/notes/` (the snapshot lives in `localground/.planning/`, not the dest). Resolved on "try 3" by passing the explicit snapshot path. Not a runtime failure.
- **`claude mcp get` probe inconsistency (evidence FOR the honesty rule).** Relaunch A printed `× Failed to connect` (false-negative — overridden by a working live `localground_detect`); Relaunch B printed `✔ Connected` (true-positive). Both confirm that `claude mcp get` status is not runtime proof — the process-identity witness is.
- **Honesty-gate grep false-negative.** The verification grep reported `0` for `tarball-seed.md`'s no-local-dist assertion; reading L30-31 confirmed the assertion is present (bold `**NO**` vs the pattern's space-after-NO). Caught + resolved by reading, not assumed.
- **cygpath `/tmp` mount — no footgun this run.** Unlike local-dist UAT-04 (where a `node -e` tmpdir snippet broke), this run's `cygpath -m "$TEMP"` resolved correctly; the Git-Bash `/tmp` view and native `C:/Users/rlasalle/AppData/Local/Temp` are the same directory (native `Test-Path: True` verified before handing the path to the scanner).
- **Codex cross-model lens did NOT run** (`.codex/config.toml` error). The GO-WITH-CHANGES verdict rests on the 3 Claude lenses + adversarial synthesis. Codex re-fire optional if the maintainer fixes the config.

## Issues Encountered

No product defects. All "issues" were environmental (the SR-6 %TEMP% reap, the snapshot-discovery cwd mismatch, the `claude mcp get` probe behavior) and each is documented above with its resolution. The tarball binary behaved identically to local-dist across all five skills.

## Hand-off to 19-07 (finalize)

- **19-07 finalizes** the `19-UAT.md` frontmatter `status` + `verified` timestamp (left TBD here) and writes the Gaps Summary.
- **Carry-forward (non-blocking):** `jq` absent → `python`/`md5sum` substitutes used throughout (reconcile plan wording); UAT-time `--plugin-dir` loading vs end-user global install (tie to H-4 → Phase 20); the SR-6 %TEMP%-reap lesson (install-dir survival recheck at each relaunch).
- **Post-close `[YOU]`:** `rm -rf "<tmpdir>/lg-uat-19-tarball-install"` from a new shell (EBUSY — held open by this live session) or let reboot reap it.

## Commits

To be committed in a single plan-19-06 commit upon maintainer authorization (`git add -f` for gitignored `.planning/`; local-only `master`; pushes deferred to the v3.0.1 release tag). Artifacts: the 6 `tarball-*.md` transcripts, `19-UAT.md`, this SUMMARY, and the `.planning/notes/` checklist + snapshot.

## Adversarial Verification (closeout — closes the open REVIEWER item)

Per the snapshot's open REVIEWER item ("the 19-06 closeout should be adversarially verified before commit"), a 5-agent adversarial workflow (`w2w1n4240`; 4 skeptical dimension reviewers + synthesis judge) independently ground-truthed the closeout. **Verdict: CLOSEOUT_SOUND → commit recommendation PROCEED.**

Independently re-confirmed (not merely re-read):
- Local-dist and tarball `index.js` are **byte-identical** (sha256 `12858210aef775baa1c509ea410efab8334a1717f94752a4e4336a5c90133023`) — the premise that makes process-identity the only honest distinguisher; the witness is non-circular by construction.
- The **live** tarball witness re-verified during the audit: PID 103716 still alive @ launch `18:47:20.28Z` serving the tarball install dir, **zero** live node serving local-dist.
- Recovery binary mtime `18:38:05Z` sits strictly between swap (17:32:34Z) and launch B (18:47:20Z) — B serves the re-installed byte-identical tarball.
- All 5 SC verdicts reconcile with recorded tool envelopes + on-disk artifacts.

Findings (3, all low/info, none blocking): (1) a wording caveat in the *workflow prompt* (not the closeout docs) predicted a post-restore process witness would show local-dist — reality is the live session stays tarball-bound until the next MCP restart, which *strengthens* the proof; the closeout docs correctly state config→local-dist. (2) The dead Relaunch-A PID 5880 is not live-reverifiable — inherent to a past-tense witness, disclosed + indirectly corroborated (seed tag 650a60e / checksum d51c375d, transcript mtimes, byte-identical binary). (3) The Codex-lens non-run is honestly labeled (no fabricated pass). No remediation required.

## Self-Check: PASSED

- 6 tarball transcripts exist, each with a `## Tarball runtime witness` anchor + its skill-execution record + verdict.
- Honesty gate verified 6/6 (launch-ts>swap + config=tarball + tarball-only witness); restore confirmed against known-good target.
- 19-UAT.md: § Tarball-Runtime Replay added (SC1-5 tarball map), 6 artifact rows + 10 spot-check rows, coverage line updated; frontmatter `status` left TBD for 19-07.
- All 8 required + 6 nice-to-have review changes applied (table above); execution-time deviations documented with resolutions.

---
*Phase: 19-skill-runtime-uat — Plan 06*
*Tarball-gate replay (D-04): PASS — 5/5 skills re-verified on the published artifact; honesty gate 6/6; registration restored (2026-06-28)*
