# UAT-01 Tarball Replay: /localground:seed (D-04 gating pass)

**Captured:** 2026-06-28T17:48Z
**Fixture:** C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Documents/lg-uat-fixture-19-tarball
**MCP runtime:** TARBALL-INSTALL — `<os.tmpdir>/lg-uat-19-tarball-install/node_modules/@localground/mcp/dist/index.js`
**Registered with:** `claude mcp add localground --scope user -- node <tarball-install-path>` (swap @ 2026-06-28T17:32:34Z)

## Tarball runtime witness

Captured at session launch / before any skill ran (EH-01/03/04/05). This is the **only honest runtime proof** — both binaries are 3.0.0 with byte-identical responses, so `claude mcp list/get` cannot prove which binary served a call.

- **Launch command (per checklist):** `claude --plugin-dir "C:/Users/rlasalle/Projects/localground"`
- **Observation window (UTC):** 2026-06-28T17:40:46Z (witness run); current session.
- **Launch-config check — `claude mcp get localground`:**
  ```
  localground:
    Scope: User config (available in all your projects)
    Status: × Failed to connect
    Type: stdio
    Command: node
    Args: C:/Users/rlasalle/AppData/Local/Temp/lg-uat-19-tarball-install/node_modules/@localground/mcp/dist/index.js
  ```
  Config = tarball ✓. **⚠ `Status: × Failed to connect` is a probe FALSE-NEGATIVE** — the CLI's throwaway health-probe failed, but the live session connection is healthy (proven by the working `localground_detect` call below). This is direct evidence *for* the honesty rule: `claude mcp get` status is NOT runtime proof.
- **Process-identity witness — `Get-CimInstance Win32_Process -Filter "name='node.exe'"`:**
  ```
  ProcessId    : 5880
  CreationDate : 6/28/2026 12:37:38 PM   (local CDT = 17:37:38Z UTC)
  CommandLine  : node C:/Users/rlasalle/AppData/Local/Temp/lg-uat-19-tarball-install/node_modules/@localground/mcp/dist/index.js
  ```
  - ✅ A `node.exe` (PID 5880) whose CommandLine contains `lg-uat-19-tarball-install` is alive.
  - ✅ **NO** `node.exe` whose CommandLine contains `packages/mcp/dist/index.js` (local-dist) — tarball-only.
  - ✅ Launch ts **17:37:38Z** > swap ts **17:32:34Z** (this session post-dates the swap).
  - (Other node procs present: PID 38752 = powerautomate-mcp, PID 74500 = Adobe CC — both unrelated.)
- **Live-binding proof:** `localground_detect` (below) returned a valid structured payload, `isError:false`, served by the only localground node alive = PID 5880 = tarball. **Runtime confirmed tarball.**

## Pre-run: confirm tarball binary is registered

- `claude mcp get localground` → see witness block (Args = tarball-install path; Scope: User config).
- Binary `--version` → `3.0.0` (captured Phase 0 boot-sanity; `--version` short-circuits before the stdio transport, so it is boot-sanity only, NOT runtime proof — the witness block above is the runtime proof).

## Skill invocation prompt

```
Run /localground:seed against the project at "C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Documents/lg-uat-fixture-19-tarball".
```
(Driven by the COORDINATOR via the Skill tool — seed is model-invocable per the §2 invocation posture.)

## Tool call: localground_detect (tarball runtime)

This is the per-session witness `localground_detect` call (observation 17:40:46Z), served by the tarball runtime (PID 5880). `isError:false`. Structural summary of the response:

- `platform`: `{ platform: "windows", shell: "powershell", homeDir: "C:\\Users\\rlasalle", pathSeparator: "\\" }`
- `cloud`: `{ service: "onedrive", syncRoot: "C:\\Users\\rlasalle\\OneDrive", isCloudSynced: true }`
- `projects`: 18 entries enumerated (OneDrive-synced + local Projects roots)
- `pathHashes`: 25 entries enumerated (6 with `decodedPath: null` — residual/unmapped, expected per L-11)
- `claudeConfigDir`: `C:\\Users\\rlasalle\\.claude`

(The newly built fixture lives under `OneDrive/.../Documents/`, not `Documents/Projects/`, so it is not in the `projects` array — expected; seed uses the explicit `projectPath` argument.)

## Tool call: localground_seed (tarball runtime)

**Request:**
```json
{ "projectPath": "C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Documents/lg-uat-fixture-19-tarball" }
```

**Response (`isError:false`):**
```json
{
  "version": 1,
  "toolkitVersion": "3.0.0",
  "created": "2026-06-28T17:48:04.936Z",
  "projectPath": "C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Documents/lg-uat-fixture-19-tarball",
  "projectName": "lg-uat-fixture-19-tarball",
  "markers": [
    {
      "type": "test-file",
      "path": "C:\\Users\\rlasalle\\OneDrive - ThermoTek, Inc\\Documents\\lg-uat-fixture-19-tarball\\.localground-seed-test",
      "checksum": "d51c375daae6b2b53173032c3443efe3609c58a8c87e0f4d5ffbee6433f1fc20"
    },
    {
      "type": "git-tag",
      "tag": "localground/seed/2026-06-28T17-48-04-708Z",
      "commitHash": "650a60e5b7fc4b39da3032c43103c87590c24720"
    }
  ]
}
```

## Skill output to user

```
Seed Complete

Project: lg-uat-fixture-19-tarball
Path:    C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Documents/lg-uat-fixture-19-tarball
Markers:
  Test file: .localground-seed-test (checksum: d51c375daae6b2b53173032c3443efe3609c58a8c87e0f4d5ffbee6433f1fc20)
  Git tag:   localground/seed/2026-06-28T17-48-04-708Z (commit: 650a60e5b7fc4b39da3032c43103c87590c24720)
Manifest:  .localground-seed-manifest.json

Next: Run /localground:migrate when ready to move this project.
```

## On-disk evidence (post-run)

**`.localground-seed-manifest.json` on disk** (byte-matches the tool response above):
```json
{
  "version": 1,
  "toolkitVersion": "3.0.0",
  "created": "2026-06-28T17:48:04.936Z",
  "projectPath": "C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Documents/lg-uat-fixture-19-tarball",
  "projectName": "lg-uat-fixture-19-tarball",
  "markers": [ { "type": "test-file", "path": "...\\.localground-seed-test", "checksum": "d51c375d..." },
               { "type": "git-tag", "tag": "localground/seed/2026-06-28T17-48-04-708Z", "commitHash": "650a60e5..." } ]
}
```

**`.localground-seed-test` content:**
```
LocalGround seed marker — do not modify
Created by LocalGround Toolkit
This file verifies migration integrity
```

**Git tag list (`git tag --list 'localground/seed/*'`):**
```
localground/seed/2026-06-28T17-48-04-708Z
```
(Tag on commit `650a60e` = fixture's third/HEAD commit ✓.)

**Checksum re-verification (`sha256sum .localground-seed-test`):**
```
d51c375daae6b2b53173032c3443efe3609c58a8c87e0f4d5ffbee6433f1fc20
```
= manifest checksum ✓ (independent SHA256 re-compute matches).

**GATE:** seed manifest on disk ✓ · `isError:false` ✓ · checksum verified ✓ → ready for the maintainer-typed `/localground:migrate` Session 1.
