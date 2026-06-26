---
description: Two-session migration — copy Claude Code projects from cloud-synced storage to local paths with verification and settings migration.
disable-model-invocation: true
allowed-tools:
  - mcp__localground__localground_detect
  - mcp__localground__localground_copy
  - mcp__localground__localground_verify
---

# /localground:migrate

Migrate Claude Code projects from cloud-synced storage to local paths. This is a two-session workflow.

## Session Detection

**First, check if `localground-migrate-state.json` exists in the current working directory.**

- If it exists AND contains `"session": 1` — enter **Session 2** (settings migration)
- Otherwise — enter **Session 1** (copy and verify)

## Session 1: Copy and Verify

Run this when there is no state file or it has `session: 2` (completed).

### Step 1: Detect Environment

Call `localground_detect`. Parse the JSON response. Present to the user:
- OS, shell, cloud sync service
- Discovered projects (name, path, cloud sync status)
- Ask which projects to migrate and confirm the destination base path

The destination must be a local (non-cloud-synced) absolute path. Suggest `C:/Users/<username>/Projects` on Windows or `~/Projects` on macOS/Linux.

### Step 2: Copy Each Project

For each confirmed project, copy it using the continuation token loop:

1. Call `localground_copy` with `source` and `target` (no token for first call)
2. Parse the JSON response
3. If response contains `"done": true` — copy complete, proceed to verify
4. If response contains `"done": false` — extract the `token` field and call `localground_copy` again with the same `source`, `target`, plus the `token`
5. Repeat until `done: true`
6. Report progress to the user after each chunk: "Copied chunk N/M: folder-name"

Before each project copy, confirm with the user: "Copy [project-name] from [source] to [target]? (yes/no)"

### Step 3: Verify Each Project

For each copied project, call `localground_verify` with the **destination** path. Report per-marker results (PASS/FAIL).

### Step 4: Write State File

Write `localground-migrate-state.json` to the **destination base path** (not inside any project — at the root of where projects were copied to):

```json
{
  "version": "1.0.0",
  "session": 1,
  "timestamp": "<current ISO 8601 timestamp>",
  "sourcePath": "<source base path>",
  "destinationPath": "<destination base path>",
  "projects": [
    {
      "name": "<project-name>",
      "sourcePath": "<full source path>",
      "destinationPath": "<full destination path>",
      "verification": {
        "success": true,
        "checksumMatch": true,
        "gitTagPresent": true,
        "commitHashMatch": true
      }
    }
  ]
}
```

### Step 5: Handoff

Tell the user:
"Migration complete. To finish setup, open Claude Code at the destination path and run `/localground:migrate` again:
```
cd <destination base path>
claude
```
Then run `/localground:migrate` to complete settings migration."

## Session 2: Settings Migration

Run this when `localground-migrate-state.json` exists with `session: 1`.

### Step 1: Read State File

Read and parse `localground-migrate-state.json` from CWD. Validate it has `version`, `session: 1`, `sourcePath`, `destinationPath`, and `projects` array.

### Step 2: Report What Was Migrated

Present the migration summary from the state file:
- Source and destination paths
- Each project with verification status

### Step 3: Migrate Settings

For each project in the state file:
- Check if `.claude/` directory exists in the destination project
- If CLAUDE.md exists, scan for references to the old source path and offer to update them
- If memory files exist (`.claude/memory/`), scan for old path references

Do NOT delete anything. Only update path references in documentation and config files.

### Step 4: Update State File

Update `localground-migrate-state.json`:
- Set `"session": 2`
- Add `"completedTimestamp": "<current ISO 8601>"`
- For each project, add `"settingsMigrated": true` and `"referencesUpdated": true` as applicable

### Step 5: Post-Migration Reminders

Tell the user:
- "Run `/localground:reap` on each migrated project to verify health"
- "Update any IDE workspace settings that reference the old paths"
- "The original source files are still intact — run `/localground:cleanup` when ready to review them for deletion"
- "Git remotes are unchanged — push/pull will work from the new location"

## Important Rules

- Never delete source files or directories
- Always confirm each project copy with the user before starting
- If any copy or verify step fails, stop and report the error — do not continue to the next project
- Always use absolute paths for source and target
- Quote all paths in any commands to handle spaces and special characters
