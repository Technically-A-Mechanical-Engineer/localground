# UAT-04 Tarball Replay: /localground:cleanup (candidate-by-candidate)

**Captured (witness):** 2026-06-28T18:47:20Z (launch) · **Skill run:** pending
**Target fixture:** fresh synthetic UAT-04 fixture under `<os.tmpdir>/lg-uat-cleanup-fixture-19-tarball` (built via cygpath at run time; exact path assigned then)
**MCP runtime:** TARBALL-INSTALL — `<os.tmpdir>/lg-uat-19-tarball-install/node_modules/@localground/mcp/dist/index.js` (swap @ 2026-06-28T17:32:34Z; reaped + recovered ~18:38Z)
**Driver:** maintainer types disable-model-invocation `/localground:cleanup` (slash command FIRST token, no `Run ` prefix); responds candidate 1 = yes, 2 = no, 3 = skip all
**Acceptance:** exactly 1 file changed (the YES file); declined/skipped candidates byte-identical (pre/post md5 diff)

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

## Pre-run state (fixture built — checklist line 98, `[ME]`)

Synthetic fixture under `os.tmpdir()` (D-11/D-14 safety invariant), FRESH (L-5 — `rm -rf` before build). 3 scannable text files, each with one stale OneDrive reference matching the cloud-path pattern (file-reference candidates per `cleanup_scan` → `ScanMatch`, NOT directory candidates):

- **Native path (scanner `dirPath`):** `C:/Users/rlasalle/AppData/Local/Temp/lg-uat-cleanup-fixture-19-tarball` — verified present from the native (PowerShell) view: `Test-Path: True`, 4 files incl. `pre-run-checksums.txt`. `$env:TEMP = C:\Users\rlasalle\AppData\Local\Temp`; the Git-Bash `/tmp` mount is the same directory (no cygpath footgun this run — contrast local-dist environmental finding #1).
- **Reference content (pre-run):**
  - `.claude/memory/note.md` line 1: `Old project location: C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Projects/stale-project-3`
  - `.clauderc` line 1: `legacy_path=C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Projects/stale-project-2`
  - `CLAUDE.md` line 2: `Active project path: C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Projects/stale-project-1`
- **Pre-run checksums (md5; `jq` absent → `md5sum`):**
  ```
  a8b4579003e1bdadcb75c10c8bbc0e20 *CLAUDE.md
  7fe8320cf876857abb967608902130d2 *.clauderc
  dff09930a52113f89657bb7182220daf *.claude/memory/note.md
  ```
  (`.clauderc` + `note.md` md5s are byte-identical to local-dist `cleanup.md` — same content; `CLAUDE.md` differs only by an added line-1 header, ref still on line 2.)

## Skill invocation prompt

`/localground:cleanup` is `disable-model-invocation: true` — the MAINTAINER typed the slash command (first token, ARGUMENTS carried the directory); Claude drove the scan + per-item edits while the maintainer supplied each free-text confirmation. Verbatim:
```
/localground:cleanup against the directory "C:/Users/rlasalle/AppData/Local/Temp/lg-uat-cleanup-fixture-19-tarball". I will respond to each candidate one at a time.
```
Skill body loaded from `skills/cleanup/SKILL.md` (`disable-model-invocation: true`, `allowed-tools: [mcp__localground__localground_cleanup_scan]`) — confirming command → plugin-skill routing for a model-hidden, maintainer-invoked command.

## Tool call: localground_cleanup_scan (tarball runtime)

**Envelope:** `{ "dirPath": "C:/Users/rlasalle/AppData/Local/Temp/lg-uat-cleanup-fixture-19-tarball" }` (skill step 1). Executed against PID 103716 (tarball — per witness block above).

**Response (verbatim):**
```json
{
  "matches": [
    { "file": ".claude\\memory\\note.md", "line": 1, "content": "Old project location: C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Projects/stale-project-3", "cloudPath": "OneDrive" },
    { "file": ".clauderc",                "line": 1, "content": "legacy_path=C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Projects/stale-project-2",        "cloudPath": "OneDrive" },
    { "file": "CLAUDE.md",                "line": 2, "content": "Active project path: C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Projects/stale-project-1",  "cloudPath": "OneDrive" }
  ],
  "filesScanned": 4,
  "matchCount": 3
}
```
`isError:false`. 3 candidates (one per file). Scan is read-only. Candidate emission order = note.md, .clauderc, CLAUDE.md — **identical to local-dist** `cleanup.md`. Fixture NOT reaped (filesScanned:4 = 3 refs + pre-run-checksums.txt).

## Candidate 1 dialogue (response: yes)

```
Candidate 1 of 3:
  File:       .claude/memory/note.md
  Line:       1
  Cloud path: OneDrive
  Content:    "Old project location: C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Projects/stale-project-3"
  Delete this reference? (yes / no / skip all)
```
**Maintainer response:** `yes`
**Skill action:** file-reference match → **edited** the file (NOT deleted), per skill step 3. Read `.claude/memory/note.md`, then Edit replaced the stale line:
- old: `Old project location: C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Projects/stale-project-3`
- new: `Old project location: removed (migrated to local storage)`

The replacement carries no cloud keyword → a re-scan would no longer match. md5 `dff09930…` → `c0ace4d8…`.

## Candidate 2 dialogue (response: no)

```
Candidate 2 of 3:
  File:       .clauderc
  Line:       1
  Cloud path: OneDrive
  Content:    "legacy_path=C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Projects/stale-project-2"
  Delete this reference? (yes / no / skip all)
```
**Maintainer response:** `no`
**Skill action:** no-op. `.clauderc` left untouched; no Edit/Bash write. md5 unchanged (`7fe8320c…`); stale OneDrive reference remains on disk verbatim.

## Candidate 3 dialogue (response: skip all)

```
Candidate 3 of 3:
  File:       CLAUDE.md
  Line:       2
  Cloud path: OneDrive
  Content:    "Active project path: C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Projects/stale-project-1"
  Delete this reference? (yes / no / skip all)
```
**Maintainer response:** `skip all` (per L-8 — exact free-text string, not a Y/N keystroke or menu)
**Skill action:** halt. Per rule "If the user says 'skip all', stop processing remaining candidates." CLAUDE.md NOT edited; processing stopped. Candidate 3 was the last, so the halt's "remaining-untouched" property is proven by CLAUDE.md staying byte-identical (md5 `a8b45790…`).

## Skill output to user — Step 4 summary

```
Cleanup summary:
  Items found:   3
  Items edited:  1  (.claude/memory/note.md — confirmed "yes")
  Items skipped: 2  (.clauderc — "no"; CLAUDE.md — "skip all" → halt)
  Errors:        0
```

## Post-run state verification

Pre-run → post-run checksums (md5; `jq` absent → `md5sum`):
```
PRE :  a8b4579003e1bdadcb75c10c8bbc0e20 *CLAUDE.md
       7fe8320cf876857abb967608902130d2 *.clauderc
       dff09930a52113f89657bb7182220daf *.claude/memory/note.md
POST:  a8b4579003e1bdadcb75c10c8bbc0e20 *CLAUDE.md
       7fe8320cf876857abb967608902130d2 *.clauderc
       c0ace4d89224aa21209caf432cb2b9f8 *.claude/memory/note.md
```
`diff` — exactly ONE line different (note.md); changed-file count = **1**:
```
3c3
< dff09930a52113f89657bb7182220daf *.claude/memory/note.md
---
> c0ace4d89224aa21209caf432cb2b9f8 *.claude/memory/note.md
```

| File | Response | md5 pre → post | Verdict |
| --- | --- | --- | --- |
| `.claude/memory/note.md` | `yes` | `dff09930…` → `c0ace4d8…` | CHANGED (edited as confirmed) |
| `.clauderc` | `no` | `7fe8320c…` → `7fe8320c…` | UNCHANGED (declined → no edit) |
| `CLAUDE.md` | `skip all` | `a8b45790…` → `a8b45790…` | UNCHANGED (skipped → no edit) |

Declined/skipped content still carries its stale OneDrive reference on disk (proves no silent edit):
- `.clauderc`: `legacy_path=C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Projects/stale-project-2`
- `CLAUDE.md`: `Active project path: C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Projects/stale-project-1`
- `.claude/memory/note.md` (edited): `Old project location: removed (migrated to local storage)`

**Cross-run note:** the post-run `note.md` hash `c0ace4d89224aa21209caf432cb2b9f8` is **byte-identical to local-dist** `cleanup.md` — same edit replacement, faithful replay.

## Verdict (SC4, tarball runtime)

`/localground:cleanup` on the tarball runtime: listed 3 candidates from `localground_cleanup_scan`, required per-item confirmation (never batch-confirmed), and edited ONLY the explicitly-confirmed item — zero edits on the declined (`no`) and skipped (`skip all`) items. The checksum diff is canonical: **exactly one file changed**. **SC4 satisfied — identical outcome to local-dist `cleanup.md`.**
