# UAT-02 Run 2: /localground:migrate idempotency replay (state.session === 2 → falls into Session 1)

**Captured:** 2026-06-26T03:51Z
**CWD:** C:/Users/rlasalle/Projects/lg-uat-19-dest
**MCP runtime:** local-dist (D-04 inner loop) — `node C:/Users/rlasalle/Projects/localground/packages/mcp/dist/index.js`, ✔ Connected
**Driver:** Claude (Opus 4.8) executing the loaded skill body; maintainer = pass/fail judge
**Session continuity note:** Run 2 was executed in the **same** Claude Code session as Run 1 Session 2 (no `/clear`, no relaunch), by deliberate COORDINATOR decision. Rationale: the skill's session-detection branch is a deterministic on-disk read (`state.session`), and idempotency is proven by an objective sha256 before/after — neither depends on a "cold" model context. A fresh launch would have forced re-anchoring from a snapshot that lives in a *different* project (`localground/.planning/`) than this CWD (`lg-uat-19-dest`), trading real fragility for cosmetic isolation. Documented here for verifier transparency.
**Pre-state:** localground-migrate-state.json present at base path with `session: 2` + `completedTimestamp` (from Run 1 Session 2). Pre-run `sha256 = 87bd066fcd9c14784971aa179c1c97384e9cc7365dfcb5e424f081dcbceca236`, 765 bytes.
**Expected behavior (per Correction 3 / 19-RESEARCH § D-01):** skill checks state file, sees `session !== 1`, enters Session 1 logic, calls `localground_detect`, presents project list, maintainer declines, no state corruption.

## Skill invocation prompt

Maintainer typed (verbatim) in the plugin-loaded session:

```
/localground:migrate
```

Resolved to `plugin:localground:migrate`; skill body loaded.

**Session detection (skill spec lines 16-18):**

```
CWD: /c/Users/rlasalle/Projects/lg-uat-19-dest
state file: PRESENT
session = 2   ->   session != 1   ->   enter SESSION 1 (copy and verify)
```

State file present but `session === 2` (not `1`) → per the skill's two-branch logic (`exists AND session: 1` → Session 2; **otherwise** → Session 1), the skill enters **Session 1**. This is the REWORDED Run 2 expectation (Correction 3): the skill has NO `session: 2` early-exit.

## Tool call: localground_detect

Call envelope: `localground_detect` (no args).

Response (abridged — full inventory in session log), `isError: false`:

```json
{
  "platform": { "platform": "windows", "shell": "powershell", "homeDir": "C:\\Users\\rlasalle", "pathSeparator": "\\" },
  "cloud": { "service": "onedrive", "syncRoot": "C:\\Users\\rlasalle\\OneDrive", "isCloudSynced": true },
  "projects": [
    /* cloud-synced migration candidates (OneDrive\\...\\Documents\\Projects\\): */
    { "name": "Claude-Home",            "isCloudSynced": true },
    { "name": "OB1",                    "isCloudSynced": true },
    { "name": "Org-Open-Brain",         "isCloudSynced": true },
    { "name": "QMS-Document-Processor", "isCloudSynced": true },
    { "name": "R Drive NCM Playground1","isCloudSynced": true },
    /* plus local (non-synced) projects incl. the already-migrated dest: */
    { "name": "lg-uat-19-dest", "path": "C:\\Users\\rlasalle\\Projects\\lg-uat-19-dest", "isCloudSynced": false }
    /* ...16 projects total; 23 pathHashes (6 decode null — UAT-05 backlog) */
  ],
  "claudeConfigDir": "C:\\Users\\rlasalle\\.claude"
}
```

`lg-uat-fixture-19` is not in the auto-discovered list (it sits in `…\Documents\` not `…\Documents\Projects\`) — consistent with Run 1 Session 1.

## Skill enters Session 1 logic (NOT Session 2 — per skill spec lines 17-21)

The `localground_detect` call itself is the proof of Session 1 entry: `detect` is a Session 1 Step 1 action. Session 2 never calls `detect` (it reads the state file and migrates settings). Because the skill ran `detect` and presented the migration-candidate project list, it is unambiguously in **Session 1** logic despite `state.session === 2` — confirming there is no `session: 2` early-exit (Correction 3). The skill then presented the environment summary (Windows/PowerShell; OneDrive synced; project inventory) and asked which projects to migrate.

## Maintainer declines all projects

Skill prompt: "Which projects would you like to migrate? (or decline to exit)"

Maintainer reply: **`none`**

No project was selected → the skill performs no `localground_copy`, no `localground_verify`, and (critically) no Step 4 state-file write (Session 1 only writes the state file *after* a successful copy+verify). Clean exit.

## Skill output to user

> No projects selected for migration — nothing to do. The existing migration state at `C:/Users/rlasalle/Projects/lg-uat-19-dest/localground-migrate-state.json` (session 2, completed) is left untouched. Exiting.

No stack trace, no "skill not found" error, no error envelope.

## State file integrity check (post-Run-2)

sha256 compare (Git Bash; `jq` absent → `python` hashlib substituted):

```
pre-Run-2  sha256 = 87bd066fcd9c14784971aa179c1c97384e9cc7365dfcb5e424f081dcbceca236
post-Run-2 sha256 = 87bd066fcd9c14784971aa179c1c97384e9cc7365dfcb5e424f081dcbceca236
UNCHANGED
bytes = 765
```

Content re-parse (confirms no semantic drift):

```
session = 2 | completedTimestamp = 2026-06-26T03:43:08.000Z
```

State file is **byte-identical** before and after the idempotency replay. No corruption, no reversion, no duplicate work. T-19-04 (Tampering — state file) mitigation confirmed.

## Verdict (Run 2 — idempotency replay)

Re-invoking `/localground:migrate` from the destination with `state.session === 2` correctly fell into Session 1 logic (no early-exit, per Correction 3), called `localground_detect`, presented the project list, accepted the maintainer's decline, and exited cleanly with the state file **byte-unchanged** — **PASS**.
