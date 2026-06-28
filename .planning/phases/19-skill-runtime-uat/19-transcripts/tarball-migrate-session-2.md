# UAT-02 Run 1 Session 2 Tarball Replay: /localground:migrate (settings-migration completion)

**Captured (witness):** 2026-06-28T18:47:20Z (launch) · **Skill run:** pending maintainer invocation
**Source state:** `localground-migrate-state.json` @ dest base = `session:1` (ts 2026-06-28T18:05:20.894Z) → skill auto-detects → **Session 2**
**Destination (cwd):** C:/Users/rlasalle/Projects/lg-uat-19-dest-tarball
**MCP runtime:** TARBALL-INSTALL — `<os.tmpdir>/lg-uat-19-tarball-install/node_modules/@localground/mcp/dist/index.js` (swap @ 2026-06-28T17:32:34Z; reaped + recovered ~18:38Z)
**Driver:** maintainer types the disable-model-invocation `/localground:migrate` (slash command FIRST token, no `Run ` prefix); Claude captures envelopes + verifies state

## Tarball runtime witness

Captured at session **launch** (Relaunch B — the post-recovery "try 3" session) and stamped into all four Session-B transcripts before any skill ran, so the Phase-C restore cannot retroactively poison the proof (EH-02). Immutable.

- **Launch command:** `claude --plugin-dir "C:/Users/rlasalle/Projects/localground"`, cwd = `C:/Users/rlasalle/Projects/lg-uat-19-dest-tarball` (Phase B relaunches from the destination).
- **Live MCP server process:** PID **103716**, `CreationDate 2026-06-28 13:47:20 CDT = 18:47:20Z`, CommandLine = `node C:/Users/rlasalle/AppData/Local/Temp/lg-uat-19-tarball-install/node_modules/@localground/mcp/dist/index.js`.
  - ✅ tarball node alive.
  - ✅ NO `node.exe` serving `packages/mcp/dist/index.js` (other live `node.exe`: Adobe CC Experience + powerautomate-mcp — both unrelated).
  - ✅ launch **18:47:20Z > swap 17:32:34Z** **and > recovery ~18:38Z** → this node serves the RE-INSTALLED tarball, not a stale pre-reap process.
- **`claude mcp get localground`:** Scope: User config · **Status: √ Connected** (true-positive this session; Relaunch A's identical probe false-negatived) · Args = `…/lg-uat-19-tarball-install/node_modules/@localground/mcp/dist/index.js` · single entry.
- **5 `/localground:*` commands:** mounted via `--plugin-dir`; confirmed-on-use when `/localground:migrate` activates as genuine `plugin:localground:migrate` (ARGUMENTS-carrying, not prose reinterpretation).
- **Live-binding proof:** `localground_detect` executed against PID 103716, `isError:false`, returned valid environment JSON (windows/powershell; OneDrive synced; 19 projects; 26 path-hashes, 7 `decodedPath:null` residual per L-11). Live tarball binary confirmed serving.
- **SR-6 (load-bearing):** the tarball install dir was purged across the Phase A→B gap (`MODULE_NOT_FOUND`, zero live localground node, true-negative `claude mcp get`) and recovered ~18:38Z by reinstalling the **same byte-identical** `.tgz` (48,701 B; NOT re-packed). Registration unchanged. All six transcripts therefore exercise one artifact; this session's node post-dates the recovery (above).

---

## Skill invocation prompt

Maintainer typed (verbatim) in the plugin-loaded session launched from the destination cwd:

```
/localground:migrate
```

The slash command was the **first token** → resolved to `plugin:localground:migrate` and injected the skill body (genuine plugin route, NOT prose reinterpretation; ARGUMENTS empty — Session 2 self-detects from the state file in CWD).

**Session detection (skill spec):**
```
CWD: /c/Users/rlasalle/Projects/lg-uat-19-dest-tarball
STATE FILE PRESENT? YES
session = 1  ->  Session 2 (settings migration)
```

## State file read confirmation (Step 1)

Read + parsed `localground-migrate-state.json` from CWD. Schema validation (must have `version`, `session: 1`, `sourcePath`, `destinationPath`, `projects`):
```
keys = ['version', 'session', 'timestamp', 'sourcePath', 'destinationPath', 'projects']
session = 1
projects = ['lg-uat-fixture-19-tarball']
```
All required keys present; `session: 1` confirmed; one project. Schema valid.

## Migration summary report (Step 2)

> **Migration recorded in state file:**
> - **Source base:** `C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Documents`
> - **Destination base:** `C:/Users/rlasalle/Projects/lg-uat-19-dest-tarball`
>
> | Project | Verification (Session 1) |
> |---|---|
> | `lg-uat-fixture-19-tarball` | success ✓, checksumMatch ✓, gitTagPresent ✓, commitHashMatch ✓ |

## Settings migration scan (Step 3)

Scanned the one destination project for migratable settings artifacts:
```
--- .claude/ dir? ---       ABSENT
--- CLAUDE.md? ---          ABSENT
--- .claude/memory/? ---    ABSENT
```
Destination project top-level contents:
```
.git/  .localground-seed-manifest.json  .localground-seed-test  README.md  docs/ (5)  src/ (12)
```

**Result: no in-scope settings to migrate.** No `.claude/`, no `CLAUDE.md`, no `.claude/memory/` → nothing to update. Expected for this fresh L-5 fixture (not a defect); the skill performed a correct no-op rather than fabricating work. **Matches the local-dist Session-2 outcome exactly** (`migrate-session-2.md`).

**Out-of-scope references (intentionally preserved):** a read-only scan (`OneDrive|lg-uat-fixture|Documents`, case-insensitive) over the destination project surfaced old-source-path references ONLY inside `.localground-seed-manifest.json`:
```
.localground-seed-manifest.json:5:  "projectPath": "C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Documents/lg-uat-fixture-19-tarball",
.localground-seed-manifest.json:10:  "path": "C:\\Users\\rlasalle\\OneDrive - ThermoTek, Inc\\Documents\\lg-uat-fixture-19-tarball\\.localground-seed-test",
```
**Correctly NOT migrated.** The seed manifest is a verification artifact that must retain its original-source provenance (path + checksum where markers were planted) so `/localground:reap` + `localground_verify` can confirm the migrated copy matches the source. The settings-migration scope is deliberately narrow (`CLAUDE.md` + `.claude/memory/`); rewriting these would corrupt the verification record. `referencesUpdated: false` is correct + honest.

## State file (post-Session-2, Step 4)

```json
{
  "version": "1.0.0",
  "session": 2,
  "timestamp": "2026-06-28T18:05:20.894Z",
  "sourcePath": "C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Documents",
  "destinationPath": "C:/Users/rlasalle/Projects/lg-uat-19-dest-tarball",
  "projects": [
    {
      "name": "lg-uat-fixture-19-tarball",
      "sourcePath": "C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Documents/lg-uat-fixture-19-tarball",
      "destinationPath": "C:/Users/rlasalle/Projects/lg-uat-19-dest-tarball/lg-uat-fixture-19-tarball",
      "verification": { "success": true, "checksumMatch": true, "gitTagPresent": true, "commitHashMatch": true },
      "settingsMigrated": false,
      "referencesUpdated": false
    }
  ],
  "completedTimestamp": "2026-06-28T19:01:28.611Z"
}
```

Shell verification (Git Bash; `jq` absent → `python`):
```
session = 2
timestamp (session-1) = 2026-06-28T18:05:20.894Z
completedTimestamp = 2026-06-28T19:01:28.611Z
settingsMigrated = False
referencesUpdated = False
verification all true = True
--- GATE ---  session==2: True ; completedTimestamp non-null: True
```
`session: 2` written (continuation across the restart-bound boundary) + non-null `completedTimestamp`; `settingsMigrated`/`referencesUpdated` = `false` (honest — nothing in scope). All Session-1 fields preserved.

## Skill output to user — post-migration reminders (Step 5)

> - Run `/localground:reap` on each migrated project to verify health
> - Update any IDE workspace settings that reference the old paths
> - The original source files are still intact — run `/localground:cleanup` when ready to review them for deletion
> - Git remotes are unchanged — push/pull will work from the new location

## Observations

1. **No MCP tool calls in Session 2 — by design.** The migrate skill's Session 2 path is filesystem-only (read state, scan project, write state); the continuation-token MCP tools (`localground_detect`/`copy`/`verify`) all live in Session 1. The load-bearing evidence is the state-file transition (`session: 1 → 2` + `completedTimestamp`). **Honest scope note for the closeout:** the Session-2 skill body therefore does NOT itself exercise the tarball MCP *binary* — but (a) the per-session witness above proves this session is bound to the tarball runtime, and (b) Relaunch-A Session-1 already exercised tarball `localground_copy` (72 files) + `localground_verify` (`allPassed:true`) against PID 5880. The two-session loop's binary exercise lives in Session 1; Session 2 proves the restart-bound state handoff.
2. **`settingsMigrated: false` / `referencesUpdated: false` are honest values**, not a failure signal.
3. **Seed-manifest provenance preserved** — narrow scope is correct behavior.

## Verdict (Session 2 portion of SC2, tarball runtime)

Session 2 via the GENUINE `/localground:migrate` slash command, launched from the destination after the Relaunch-A→B restart, on the tarball-bound session: state file read + schema-validated (`session: 1`), migration summary reported, settings scan completed (no-op — nothing in scope), state file updated to `session: 2` + non-null `completedTimestamp`, reminders rendered — **PASS**.

**SC2 (full two-session loop) on tarball — PASS.** Session 1 (Relaunch A) wrote `session: 1` to the dest base path (L-7); the session restarted from that path (Relaunch B); Session 2 picked up the state file, completed settings migration, and exited `session: 2` + `completedTimestamp`. No state loss, no duplicate work. The restart-bound state handoff is validated end-to-end on the tarball runtime.
