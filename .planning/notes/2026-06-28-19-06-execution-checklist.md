# 19-06 Tarball-Gate Replay — Execution Checklist (follow-along)

**Status:** FINALIZED post-review — stress-test verdict **GO-WITH-CHANGES** (0 blockers, 8 required changes folded in). Review: workflow `we4p0x4pi` (3 Claude lenses + adversarial synthesis). Codex cross-model lens did not run (config error).
**Legend:** `[ME]` = Claude does it · `[YOU]` = maintainer types/acts in terminal · `[GATE]` = stop and confirm before continuing.
**My context resets at every relaunch.** At each fresh launch you tell me **"resume from snapshot"** and I re-anchor before doing anything.

**The core honesty rule (why this is hardened):** local-dist and tarball binaries are both `3.0.0` with **byte-identical** tool responses — nothing in a tool-call envelope, version string, or `claude mcp list` proves *which binary served the call*. `claude mcp list` reads the on-disk config (what the *next* session binds to), NOT the live binding of a running session. So every tarball transcript must carry a **process-identity witness**: a live `node.exe` whose command line contains `lg-uat-19-tarball-install` AND no `node.exe` serving `packages/mcp/dist/index.js`. That witness — plus a launch timestamp post-dating the swap — is the only honest proof.

---

## ⛑ ABORT / RESTORE failsafe (run any time to recover your env)

Hardened: scope-explicit + idempotent (double-remove clears any stray local-scope entry from a botched swap), and verified with `claude mcp get` so the **Scope** line prints.

```bash
claude mcp remove localground -s user  2>/dev/null
claude mcp remove localground -s local 2>/dev/null
claude mcp add localground --scope user -- node "C:/Users/rlasalle/Projects/localground/packages/mcp/dist/index.js"
claude mcp get localground
```

**Known-good target (captured pre-swap 2026-06-28 — restore is NOT done until `claude mcp get` matches this):**
```
localground:
  Scope: User config
  Type: stdio
  Command: node
  Args: C:/Users/rlasalle/Projects/localground/packages/mcp/dist/index.js
```

---

## 🔁 Per-session witness protocol (run at EVERY fresh relaunch, before driving any skill)

`[ME]` captures these at session **launch** and writes them into each transcript **immutably** (before any skill runs, so a later restore can't poison them):

1. Record the verbatim `claude --plugin-dir …` launch command + ISO timestamp (must be **after** the swap timestamp).
2. `claude mcp get localground` → paste (confirms config = tarball at launch).
3. Confirm the 5 `/localground:*` commands loaded (plugin actually mounted this session).
4. **Process-identity witness** (PowerShell, observes the LIVE binary, not config):
   ```powershell
   Get-CimInstance Win32_Process -Filter "name='node.exe'" | Select-Object ProcessId,CommandLine | Format-List
   ```
   ✅ must show a `node.exe` whose CommandLine contains `lg-uat-19-tarball-install`
   ✅ must show **NO** `node.exe` whose CommandLine contains `packages/mcp/dist/index.js`
   → paste under a `## Tarball runtime witness` anchor in the transcript.
   *(Close any other localground-connected Claude sessions first, or they'll show up here.)*

---

## PHASE 0 — Pre-flight (this session, no relaunch yet)

- [x] `[ME]` build + pack mcp tarball → `localground-mcp-3.0.0.tgz` (5 files, 48.7 kB) ✓
- [x] `[ME]` install into `…/Temp/lg-uat-19-tarball-install` with `--ignore-scripts` ✓
- [x] `[ME]` tarball binary `--version` → `3.0.0`, exit 0, clean stderr ✓ *(boot-sanity only — NOT runtime proof; --version short-circuits before the stdio transport)*
- [x] `[ME]` capture pre-swap `claude mcp get localground` (known-good target above) ✓
- [x] `[ME]` write mid-exec handoff snapshot → `.planning/notes/2026-06-28-phase-19-tarball-replay-midexec-coord-state.md` ✓
- [x] `[ME]` **swap registration → tarball** ✓ — **SWAP TIMESTAMP (UTC): 2026-06-28T17:32:34Z** (Relaunch A/B launches MUST post-date this):
      ```bash
      TARBALL_BIN="C:/Users/rlasalle/AppData/Local/Temp/lg-uat-19-tarball-install/node_modules/@localground/mcp/dist/index.js"
      claude mcp remove localground -s user  2>/dev/null
      claude mcp remove localground -s local 2>/dev/null
      claude mcp add localground --scope user -- node "$TARBALL_BIN"
      claude mcp get localground
      ```
      *(Registration path MUST be the `C:/…` native-Windows form — NOT MSYS `/c/…` from cygpath -u — because claude spawns native `node`. cygpath -u stays for Git Bash file ops only.)*
- [x] `[ME]` verify `claude mcp get` shows the **tarball** path + Scope: User config + single entry ✓ *(config-level only — THIS session is still pinned to local-dist; expected, the relaunches fix it)*
- [x] `[GATE]` config = tarball confirmed + swap timestamp recorded ✓ → **ready to relaunch**

## PHASE A — Relaunch A (seed + migrate Session 1)

- [x] `[YOU]` exit this session; launch fresh (any cwd):
      `claude --plugin-dir "C:/Users/rlasalle/Projects/localground"`
- [x] `[YOU]` tell me: **"resume from snapshot"**
- [x] `[ME]` re-anchor + run the **per-session witness protocol** ✓ — launch **17:37:38Z** > swap **17:32:34Z**; config=tarball; PID **5880** tarball-only (NO local-dist node); live `localground_detect` returned valid JSON. ⚠ NOTE: `claude mcp get` printed `× Failed to connect` — **probe false-negative**, overridden by the working live tool call (this is evidence *for* the honesty rule, recorded in the seed transcript witness block).
- [x] `[ME]` build fresh OneDrive fixture `lg-uat-fixture-19-tarball` (git init + 3 commits) ✓ — 18 tracked files (README + 12 src + 5 docs); commits 650a60e/3b0e600/9499e7a; FRESH confirmed (no seed manifest, L-5)
- [x] `[ME]` drive `/localground:seed` → capture `tarball-seed.md` (incl. witness block) ✓ — test-file checksum d51c375d…, tag localground/seed/2026-06-28T17-48-04-708Z on 650a60e; transcript written w/ witness block
- [x] `[GATE]` seed manifest on disk, `isError:false` ✓ — manifest byte-matches envelope; sha256 re-verified = d51c375d…
- [x] `[YOU]` type verbatim — **slash command MUST be the FIRST token** (a leading "Run " makes it prose; the disable-model-invocation skill never activates, and hand-driving is DISQUALIFIED for UAT-02 per the H-3 discarded tool-path run). First attempt used the "Run …" prose form → no skill body injected; re-type:
      `/localground:migrate The project to migrate is "C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Documents/lg-uat-fixture-19-tarball". Migrate it to "C:/Users/rlasalle/Projects/lg-uat-19-dest-tarball".`
- [x] `[YOU]` confirm each prompt: project → destination → copy = **yes** ✓ — genuine slash command activated (ARGUMENTS carried both paths); maintainer replied **yes** at the copy gate
- [x] `[ME]` capture `tarball-migrate-session-1.md` (incl. witness block); verify state `session:1` at dest BASE path (L-7) ✓ — copy done:true (robocopy exit 1, 72 files); verify allPassed:true; transcript written
- [x] `[GATE]` state file `session:1` present at `lg-uat-19-dest-tarball/` ✓ — session=1, ts 2026-06-28T18:05:20.894Z, L-7 satisfied (base path, no stray subdir); smoke check 72==72

## PHASE B — Relaunch B (migrate Session 2 + reap + cleanup + verify)

- [x] `[YOU]` exit; relaunch **from the destination**:
      `cd "C:/Users/rlasalle/Projects/lg-uat-19-dest-tarball"` then
      `claude --plugin-dir "C:/Users/rlasalle/Projects/localground"`
- [x] `[YOU]` tell me: **"resume from snapshot"**
- [x] `[ME]` re-anchor + run the **per-session witness protocol** ✓ — launch **18:47:20Z** (PID 103716 tarball node) > swap 17:32:34Z AND > recovery ~18:38Z; `claude mcp get` config=tarball + √ Connected; live `localground_detect` isError:false; NO local-dist `node.exe`. Witness block stamped immutably into all 4 Session-B transcripts (migrate-S2 / reap / cleanup / verify). Launch command recorded as scripted `claude --plugin-dir …` (slash-command mount self-proves at line 93).
- [x] `[ME]` *(install-dir survival recheck)* — ⚠ **REAPED & RECOVERED.** `%TEMP%/lg-uat-19-tarball-install` was purged across the Phase A→B gap (whole dir gone; `node …/dist/index.js --version` → `MODULE_NOT_FOUND`; zero localground `node.exe` live; `claude mcp get` → true-negative `Failed to connect`). **Recovered 2026-06-28 13:38 CDT:** re-installed the SAME surviving `.tgz` (48,701 B, byte-identical Phase-0 artifact — NOT re-packed, so all 6 transcripts test one artifact) into the same temp path via `npm install --ignore-scripts` (94 pkgs); binary now loads `3.0.0`; **registration unchanged** (still the temp path → no `claude mcp add` needed) and now `✔ Connected`; dest `session:1` state intact. **SR-6 fired exactly as designed.** *(Witness protocol — line 91 — could NOT run in the reaped session; it runs in the fresh "try 3" relaunch against the now-live tarball node. "try 2" session name = a snapshot-discovery miss [bare "resume from snapshot" with cwd=dest found no `.planning/notes/`], NOT a runtime failure.)*
- [x] `[YOU]` type (slash command FIRST, no "Run " prefix): `/localground:migrate`  *(skill detects `session:1` → Session 2)* ✓ — genuine `plugin:localground:migrate` activated (bare, ARGUMENTS empty; first-token slash, no prose form)
- [x] `[ME]` capture `tarball-migrate-session-2.md`; verify state `session:2` + `completedTimestamp` ✓ — skill-execution record appended (genuine activation, session-detection, no-op settings scan w/ seed-manifest preserved, post-state JSON, reminders, verdict PASS)
- [x] `[GATE]` state `session:2` + non-null timestamp ✓ — `session==2` True; `completedTimestamp`=2026-06-28T19:01:28.611Z (non-null); python read-back confirmed; `settingsMigrated`/`referencesUpdated`=false (honest, nothing in scope)
- [x] `[ME]` drive `/localground:reap` on `lg-uat-19-dest-tarball/lg-uat-fixture-19-tarball` → `tarball-reap.md` + manifest cross-check ✓ — model-invocable, Skill tool; 2 live tarball-binary calls (detect + health_check, PID 103716); transcript written
- [x] `[GATE]` 6-check array returned; manifest survived migration ✓ — 6 checks (5 PASS, 1 WARN=expected untracked seed markers, 0 FAIL); seed_markers PASS; manifest cross-check = 2 markers (test-file + git-tag); source/target align PASS (72 files). Overall YELLOW (housekeeping only). Matches local-dist `reap.md`.
- [x] `[ME]` build fresh synthetic UAT-04 fixture under tmpdir via **cygpath** (`TMP=$(cygpath -u "$TEMP")`); record pre-run md5; **I give you the exact path** ✓ — `C:/Users/rlasalle/AppData/Local/Temp/lg-uat-cleanup-fixture-19-tarball` (3 ref files + checksums; native Test-Path:True verified; baseline persisted in `tarball-cleanup.md`). Path given below.
- [x] `[YOU]` type (slash command FIRST, no "Run " prefix): `/localground:cleanup against the directory "<path I give you>". I will respond to each candidate one at a time.`
- [x] `[YOU]` respond, in order: candidate 1 = **yes**, candidate 2 = **no**, candidate 3 = **skip all**
- [x] `[ME]` capture `tarball-cleanup.md`; post-run md5 diff ✓ — genuine activation; scan filesScanned:4/matchCount:3 (live tarball-binary call, PID 103716); dialogue yes/no/skip-all captured; pre/post md5 recorded; transcript written
- [x] `[GATE]` exactly **1 file changed** (the YES file); declined/skipped byte-identical ✓ — diff = 1 changed line (note.md `dff09930…`→`c0ace4d8…`, identical to local-dist); `.clauderc`(no) + `CLAUDE.md`(skip all) md5 unchanged + still carry stale refs (no silent edit). SC4 satisfied.
- [x] `[ME]` drive `/localground:verify` → `tarball-verify.md` *(note inline: audit surface includes residual 19-01..03 + plugintest fixtures — expected, not a runtime delta)* ✓ — model-invocable, Skill tool; live `localground_audit` (PID 103716); 17 projects/68 checks; transcript written. Deltas vs local-dist (15→17: +dest-tarball, +packages/mcp; localground git PASS→WARN active-work) all expected residuals, NOT runtime deltas.
- [x] `[GATE]` `summary` + `projects` keys present; recommendations mapped ✓ — summary{projectsAudited:17,totalChecks:68,pass:32,warn:26,fail:10,overallStatus:FAIL}; projects[17]×4checks; 5 recommendation classes mapped (seed+migrate / git init / commit / cleanup / no-action). RED=correct (real findings, not all-pass).
- [x] `[GATE]` ⚠ **HONESTY GATE — all 6 tarball transcripts contain (a) launch ts > swap ts, (b) launch config = tarball, (c) process-identity witness = tarball-only.** ✓ VERIFIED 6/6 — witness anchor + tarball-install config + launch ts (A:17:37:38Z / B:18:47:20Z, both > swap 17:32:34Z; B also > recovery ~18:38Z) + explicit "NO local-dist node" (seed.md L30-31; mig-1 L15; 4 Relaunch-B blocks). [grep "0" on seed.md = false-negative: bold `**NO**` vs space-after-NO pattern; confirmed by reading L31.] RESTORE NOW UNBLOCKED → running.

## PHASE C — Restore + close (session B, after the honesty gate; optional 3rd relaunch for max rigor)

- [x] `[ME]` **restore registration → local-dist** (hardened, idempotent — same as ABORT block): ✓ — remove -s user exit0 (cleared tarball), remove -s local exit1 (no stray, idempotent), add exit0
      ```bash
      claude mcp remove localground -s user  2>/dev/null
      claude mcp remove localground -s local 2>/dev/null
      claude mcp add localground --scope user -- node "C:/Users/rlasalle/Projects/localground/packages/mcp/dist/index.js"
      claude mcp get localground
      ```
- [x] `[GATE]` ⚠ restore NOT done until `claude mcp get` shows **Scope: User config + Args …/packages/mcp/dist/index.js**. *(Runtime re-confirm happens on your NEXT launch — if that session's localground tools error, re-run the ABORT block.)* ✓ — `claude mcp get` shows Scope: User config + ✔ Connected + Args=…/packages/mcp/dist/index.js, byte-matches known-good target.
- [x] `[ME]` cleanup **in-session**: delete `.tgz` + synthetic UAT-04 fixture (not held open) ✓ — `.tgz` (48,701 B) + `lg-uat-cleanup-fixture-19-tarball` both deleted; install dir survives (EBUSY-deferred to line 118)
- [ ] `[YOU]` cleanup **after closing session B** (Windows EBUSY — the tarball `dist/index.js` is held open by the live session): from a NEW shell `rm -rf "$(cygpath -u "$TEMP")/lg-uat-19-tarball-install"`  *(or just let reboot reap it)*
- [x] `[ME]` update `19-UAT.md` (local/tarball evidence split + Tarball-Runtime Replay section + 6 artifact rows + spot-check rows **incl. process-identity-witness rows**; tighten UAT-02 wording to "happy-path two-session boundary"; list --version under boot-sanity not runtime) ✓ — added § Tarball-Runtime Replay (SC1-5 tarball map + honesty rule + 2 relaunches + 6/6 gate), 6 artifact rows, 10 spot-check rows (incl. both witness rows + restore row), coverage line updated. Frontmatter status left TBD for 19-07.
- [x] `[ME]` *(recommended)* adversarial verification workflow on the closeout ✓ — 5-agent panel (workflow `w2w1n4240`): **CLOSEOUT_SOUND / PROCEED**. Independently re-confirmed byte-identical binaries (sha256 12858210…), LIVE witness PID 103716 still tarball (recovery mtime 18:38:05Z between swap & launch B), all 5 SC verdicts reconcile. 3 findings all low/info, none blocking (caveat-wording inversion = strengthening; dead PID 5880 = inherent/disclosed; Codex non-run = honest). No doc fix required.
- [x] `[ME]` write `19-06-SUMMARY.md` (record the 8 review-driven deviations) ✓ — full frontmatter + 8 required/6 nice-to-have change table + execution-time deviations (SR-6 reap+recovery, try-2 miss, mcp-get probe inconsistency, grep false-negative, cygpath) + hand-off to 19-07
- [x] `[ME]` `git add -f` + commit (trailers); update ROADMAP / STATE / memory with new SHA ✓ — commit **07eddff** (12 files, +1174/-15); ROADMAP 19-06 `[x]` + Phase 19 6/7; STATE → 19-06 complete, next 19-07. *(Ticked post-commit per the agreed sequence; this tick + the STATE "Last commit" line are an uncommitted working-tree delta for the reviewing session to fold in.)*
- [ ] `[YOU]` any future work: relaunch with `--plugin-dir` (now back on local-dist inner loop)

---

**Fixture/path reference**
- Tarball install: `<tmpdir>/lg-uat-19-tarball-install/node_modules/@localground/mcp/dist/index.js`
- Local-dist (restore target): `C:/Users/rlasalle/Projects/localground/packages/mcp/dist/index.js`
- Seed/migrate source (NEW, OneDrive): `C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Documents/lg-uat-fixture-19-tarball`
- Migrate destination (NEW): `C:/Users/rlasalle/Projects/lg-uat-19-dest-tarball`
- UAT-04 fixture (NEW, tmpdir): `<tmpdir>/lg-uat-cleanup-fixture-19-tarball`

**Review-change provenance (for 19-06-SUMMARY deviations):** process-identity witness + launch-timestamp (EH-01/03/04); restore-ordering honesty gate (EH-02); hardened scope-explicit idempotent restore (SR-1); verbatim pre-swap registration snapshot (SR-2); defer tarball-install rm -rf to post-session (SR-4); cygpath everywhere (SR-5); runtime-witness in acceptance (EH-07); plus nice-to-haves: per-relaunch plugin-load check (SR-7), install-dir survival recheck (SR-6), UAT-02 "happy-path" wording (EH-06), --version as boot-sanity (EH-08), residual-fixtures note in verify (SR-8), full-registration-scope check (EH-05).

---

## Notes — load-bearing lessons (this arc)

1. **MCP servers bind at session start and are NOT hot-reloadable.** There is no in-session repoint — `/mcp` can't, and `claude mcp add/remove` only rewrites the on-disk config consumed by the *next* session. To exercise a different binary you MUST relaunch. The relaunch architecture (Phase A/B + the per-session witness) is load-bearing, not a convenience.
2. **When two binaries are byte-identical, nothing in a tool envelope, version string, or `claude mcp get` proves which one served a call.** Local-dist and tarball `index.js` were byte-identical (sha256 `12858210…`, both `3.0.0`). The ONLY honest runtime proof is a **process-identity witness** — a live `node.exe` whose command line contains the target install path AND none serving the other — plus a launch timestamp post-dating the swap, captured immutably at launch before any skill runs.
3. **Config restore ≠ live rebind (confirmed live this arc).** The restore (`claude mcp add` back to local-dist) rewrote config but did NOT restart the running server — the live session stayed bound to the tarball (PID 103716) the whole time. The adversarial verifier used this as *additional* live proof of the honesty rule. Runtime re-confirm happens only on the *next* launch.
4. **`%TEMP%` is reaped across session-exit gaps on Windows (SR-6).** The tarball install dir vanished between Relaunch A and B (`MODULE_NOT_FOUND`); recovered by reinstalling the same byte-identical `.tgz`. Recheck install-dir/fixture survival at every relaunch — never assume `%TEMP%` persists across a session boundary.

*Captured here (not in long-term memory) per maintainer instruction, 2026-06-28.*
