# UAT-01 Transcript: /localground:seed

**Captured:** 2026-06-26T00:00:59Z (2026-06-25 19:00 CDT)
**Fixture:** `C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Documents/lg-uat-fixture-19`
**MCP runtime:** local-dist (D-04 inner loop) — `packages/mcp/dist/index.js`, registered `--scope user`
**Driver:** Claude (Opus 4.8) executing the skill flow; maintainer (Robert LaSalle) is pass/fail judge
**Skill:** `.claude/skills/localground-seed.md` — flow: `localground_detect` → confirm project → `localground_seed` → report

## Skill invocation prompt

```
Run /localground:seed against the project at
"C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Documents/lg-uat-fixture-19".
```

## Tool call: localground_detect

**Request:** `localground_detect` (no parameters)

**Response (`isError: false`):** structured environment JSON. Key fields:
- `platform`: windows / powershell, homeDir `C:\Users\rlasalle`
- `cloud`: onedrive, syncRoot `C:\Users\rlasalle\OneDrive`, `isCloudSynced: true`
- `projects`: 15 discovered (OneDrive-synced set under `…/Documents/Projects` + local `C:\Users\rlasalle\Projects` copies)
- `pathHashes`: 23 entries; 6 decode to `null` (see Observations)

## Tool call: localground_seed

**Request:**
```json
{ "projectPath": "C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Documents/lg-uat-fixture-19" }
```

**Response (`isError: false`):**
```json
{
  "version": 1,
  "toolkitVersion": "3.0.0",
  "created": "2026-06-26T00:00:59.917Z",
  "projectPath": "C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Documents/lg-uat-fixture-19",
  "projectName": "lg-uat-fixture-19",
  "markers": [
    {
      "type": "test-file",
      "path": "C:\\Users\\rlasalle\\OneDrive - ThermoTek, Inc\\Documents\\lg-uat-fixture-19\\.localground-seed-test",
      "checksum": "d51c375daae6b2b53173032c3443efe3609c58a8c87e0f4d5ffbee6433f1fc20"
    },
    {
      "type": "git-tag",
      "tag": "localground/seed/2026-06-26T00-00-59-707Z",
      "commitHash": "eec8f2a41794bef48201d2943975d6673d8ddfdd"
    }
  ]
}
```

## Skill output to user

```
Seed Complete

Project: lg-uat-fixture-19
Path:    C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Documents/lg-uat-fixture-19
Markers:
  Test file: .localground-seed-test (checksum: d51c375d…fc20)
  Git tag:   localground/seed/2026-06-26T00-00-59-707Z (commit: eec8f2a4)
Manifest:  .localground-seed-manifest.json

Next: Run /localground:migrate when ready to move this project.
```

## On-disk evidence (post-run)

```
$ cat .localground-seed-manifest.json
{ version:1, toolkitVersion:"3.0.0", created:"2026-06-26T00:00:59.917Z",
  projectPath, projectName:"lg-uat-fixture-19",
  markers:[test-file (checksum d51c375d…fc20), git-tag localground/seed/… (eec8f2a4)] }
# all 6 schema keys present: version, toolkitVersion, created, projectPath, projectName, markers

$ ls -la .localground-seed-test
-rw-r--r-- 112 bytes  .localground-seed-test            # exists

$ git tag --list
localground/seed/2026-06-26T00-00-59-707Z

$ git rev-parse HEAD
eec8f2a41794bef48201d2943975d6673d8ddfdd                 # == manifest commitHash

$ git status --short
?? .localground-seed-manifest.json
?? .localground-seed-test
# seed plants test file + manifest in the working tree (untracked); the git tag is a
# lightweight tag pinning the pre-seed HEAD. Markers are intentionally not committed —
# verify/reap checks the test-file checksum + tag survive migration.
```

## Observations / discrepancies

1. **Git tag scheme differs from the plan's expected pattern.** Actual tag: `localground/seed/<ISO-ish timestamp>`. Plan 19-01 step 6 + acceptance criterion #8 expect `lg-seed-*`; the skill doc example (`localground-seed.md:47`) likewise shows `lg-seed-v1`. **The product behaves correctly** — a tag was created and pinned to the pre-seed HEAD. The `lg-seed-*` pattern in the plan and skill-doc example is stale and should be corrected to `localground/seed/*`. **Plan/doc defect, not a product defect.**
2. **6 path-hash entries decode to `null`** in `localground_detect`: `.claude-skills`, `Documents-Claude-Projects`, `Training-With-Amit-2026-03-29`, `0159…CC-CLI` (×3 variants), `claude-code-cloud-sync-migration`. Mix of deleted/renamed folders (legitimate `no_candidates`) and the `0159…CC_CLI` underscore→hyphen case. Relevant to UAT-05 (verify) and the known decode boundary; not a UAT-01 concern.

## Verdict

**SC1** — `/localground:seed` produces a valid `.localground-seed-manifest.json` (6 keys) plus a user-readable summary, with the underlying `localground_seed` MCP tool call visible in this transcript: **PASS** (pending maintainer confirmation).
