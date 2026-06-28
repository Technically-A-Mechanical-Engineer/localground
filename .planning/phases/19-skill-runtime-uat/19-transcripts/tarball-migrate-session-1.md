# UAT-02 Run 1 Session 1 Tarball Replay: /localground:migrate (D-04 gating pass)

**Captured:** 2026-06-28T18:05Z
**Source:** C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Documents/lg-uat-fixture-19-tarball
**Destination:** C:/Users/rlasalle/Projects/lg-uat-19-dest-tarball
**MCP runtime:** TARBALL-INSTALL — `<os.tmpdir>/lg-uat-19-tarball-install/node_modules/@localground/mcp/dist/index.js` (swap @ 2026-06-28T17:32:34Z)
**Driver:** Claude (Opus 4.8) executing the **genuine plugin-routed** `/localground:migrate` skill body; maintainer = command-issuer + confirm-gate judge

## Tarball runtime witness

Same session as `tarball-seed.md` (Relaunch A); witness captured at launch, immutable. Re-stated here per the per-session protocol (each tarball transcript carries its own witness block):

- **Launch command:** `claude --plugin-dir "C:/Users/rlasalle/Projects/localground"`
- **Live MCP server process:** PID **5880**, `CreationDate 2026-06-28 12:37:38 local = 17:37:38Z`, CommandLine = `node …/lg-uat-19-tarball-install/node_modules/@localground/mcp/dist/index.js`.
  - ✅ tarball node alive; ✅ NO `node.exe` serving `packages/mcp/dist/index.js`; ✅ launch 17:37:38Z > swap 17:32:34Z.
- **`claude mcp get localground`** → config = tarball-install path, Scope: User config. (`Status: × Failed to connect` = probe false-negative; overridden by working live calls.)
- **Live-binding proof (this run):** `localground_copy` (72 files) + `localground_verify` (`allPassed:true`) below both executed against PID 5880 = tarball. Runtime confirmed tarball.

## Skill invocation prompt

**Activation correction (honest record):** the maintainer's first attempt was the prose form `Run /localground:migrate. The project to migrate is …` — a leading `Run ` made `/localground:migrate` a non-leading token, so the harness treated it as prose and **did not inject the skill body**. (Hand-driving the skill from its file is DISQUALIFIED for UAT-02 — the local-dist tool-path run was discarded/quarantined per H-3.) Re-typed with the slash command as the **first token**:

```
/localground:migrate The project to migrate is "C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Documents/lg-uat-fixture-19-tarball". Migrate it to "C:/Users/rlasalle/Projects/lg-uat-19-dest-tarball".
```

This resolved to `plugin:localground:migrate` and loaded the skill body (`ARGUMENTS` carried both paths) — confirming the genuine plugin command path (post-19-08 fix), not a natural-language reinterpretation.

Session detection: no `localground-migrate-state.json` in CWD (`/c/Users/rlasalle/Projects/localground`) → **Session 1** entered.
```
CWD: /c/Users/rlasalle/Projects/localground
NO state file in CWD -> Session 1 (copy + verify)
```

## Tool call: localground_detect (tarball runtime)

This run reused the per-session witness `localground_detect` (observation 17:40:46Z, same tarball runtime / PID 5880), `isError:false`. Structural summary:
- `platform`: windows / powershell; `cloud`: onedrive, `isCloudSynced:true`
- `projects`: 18 enumerated; `pathHashes`: 25 (6 `decodedPath:null`, residual — expected per L-11)

**Observation (non-blocking, matches local-dist run):** the source fixture at `…\Documents\lg-uat-fixture-19-tarball` is NOT in the auto-discovered `projects` inventory — `localground_detect` scans `…\Documents\Projects\` and `~\Projects\`, and the fixture sits one level up in `…\Documents\` by design. Migration proceeds via the explicit source path, which `localground_copy` accepts directly.

## Project / destination confirmation dialogue

Skill presented the environment summary (Windows/PowerShell; OneDrive synced; 18 projects; 25 path-hashes) and the explicit confirm gate:

> Copy **lg-uat-fixture-19-tarball**
> from `C:\Users\rlasalle\OneDrive - ThermoTek, Inc\Documents\lg-uat-fixture-19-tarball`
> to `C:\Users\rlasalle\Projects\lg-uat-19-dest-tarball\lg-uat-fixture-19-tarball`?

Target pre-checked: does not exist (clean slate — verified before the run).

Maintainer reply: **yes**

## Tool call: localground_copy (chunk 1) (tarball runtime)

Call envelope:
```json
{
  "source": "C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Documents/lg-uat-fixture-19-tarball",
  "target": "C:/Users/rlasalle/Projects/lg-uat-19-dest-tarball/lg-uat-fixture-19-tarball"
}
```
(no `token` — first call)

Response (`done:true`):
```json
{
  "done": true,
  "result": {
    "source": "C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Documents/lg-uat-fixture-19-tarball",
    "target": "C:/Users/rlasalle/Projects/lg-uat-19-dest-tarball/lg-uat-fixture-19-tarball",
    "tool": "robocopy",
    "exitCode": 1,
    "filesCopied": 72,
    "summary": "robocopy completed with exit code 1 (success). 72 files copied."
  }
}
```
`done:true` on the first call (small fixture, single chunk). robocopy exit code 1 ∈ {0..7} = success. Continuation-token loop terminated immediately; no second call required.

## Tool call: localground_verify (tarball runtime)

Call envelope:
```json
{ "projectPath": "C:/Users/rlasalle/Projects/lg-uat-19-dest-tarball/lg-uat-fixture-19-tarball" }
```

Response (`allPassed:true`):
```json
{
  "manifestPath": "C:\\Users\\rlasalle\\Projects\\lg-uat-19-dest-tarball\\lg-uat-fixture-19-tarball\\.localground-seed-manifest.json",
  "allPassed": true,
  "results": [
    { "marker": { "type": "test-file", "path": "C:\\Users\\rlasalle\\OneDrive - ThermoTek, Inc\\Documents\\lg-uat-fixture-19-tarball\\.localground-seed-test", "checksum": "d51c375daae6b2b53173032c3443efe3609c58a8c87e0f4d5ffbee6433f1fc20" }, "passed": true, "detail": "Checksum matches: d51c375daae6b2b53173032c3443efe3609c58a8c87e0f4d5ffbee6433f1fc20" },
    { "marker": { "type": "git-tag", "tag": "localground/seed/2026-06-28T17-48-04-708Z", "commitHash": "650a60e5b7fc4b39da3032c43103c87590c24720" }, "passed": true, "detail": "Git tag \"localground/seed/2026-06-28T17-48-04-708Z\" found and verified" }
  ]
}
```
PASS — test-file checksum matches; git tag present. **L-6 confirmed** (seed markers planted in the cloud-synced source verify byte-identical against the local destination copy) on the tarball runtime.

## State file (post-Session-1, tarball runtime)

Written to the destination **BASE** path (L-7 — `<dest>/localground-migrate-state.json`, NOT inside any project subdir):
```json
{
  "version": "1.0.0",
  "session": 1,
  "timestamp": "2026-06-28T18:05:20.894Z",
  "sourcePath": "C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Documents",
  "destinationPath": "C:/Users/rlasalle/Projects/lg-uat-19-dest-tarball",
  "projects": [
    {
      "name": "lg-uat-fixture-19-tarball",
      "sourcePath": "C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Documents/lg-uat-fixture-19-tarball",
      "destinationPath": "C:/Users/rlasalle/Projects/lg-uat-19-dest-tarball/lg-uat-fixture-19-tarball",
      "verification": { "success": true, "checksumMatch": true, "gitTagPresent": true, "commitHashMatch": true }
    }
  ]
}
```

Shell verification (Git Bash; `jq` absent → `python`/`test`/`find`):
```
STATE FILE OK at base path
OK: no state file inside project subdir (L-7 satisfied)
session = 1
timestamp = 2026-06-28T18:05:20.894Z
--- destination copy smoke check ---
dest fixture file count: 72
src  fixture file count: 72
```
L-7 satisfied (state file at base path, not a project subdir). Copy smoke check: dest count (72) == src count (72).

## Skill output to user (handoff message)

> Migration complete. To finish setup, open Claude Code at the destination path and run `/localground:migrate` again:
> ```
> cd "C:/Users/rlasalle/Projects/lg-uat-19-dest-tarball"
> claude --plugin-dir "C:/Users/rlasalle/Projects/localground"
> ```
> Then run `/localground:migrate` to complete settings migration.

*(UAT-time relaunch uses `--plugin-dir` so the plugin/skills load in the destination cwd that has no `.claude/skills/`; the skill's stock handoff omits the flag because production install registers the plugin globally — surface in 19-07 / Phase 20 per the local-dist Session-1 observation.)*

## Verdict (Session 1 portion of SC2, tarball runtime)

Session 1 happy path via the **genuine** `/localground:migrate` slash command on the tarball runtime: `localground_copy` (continuation-token loop, single chunk, 72 files, robocopy exit 1) + `localground_verify` (markers survived, `allPassed:true`) + state file written to BASE path with `session:1` (L-7) — **PASS**. Session 2 (relaunch-bound, requires `--plugin-dir`) pending Phase B.
