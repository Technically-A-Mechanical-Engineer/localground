---
description: Guided cleanup — scan for stale cloud storage artifacts and delete confirmed items with platform-appropriate shell commands.
disable-model-invocation: true
allowed-tools:
  - mcp__localground__localground_cleanup_scan
---

# /localground:cleanup

Scan for stale cloud storage artifacts and guide the user through deleting them one at a time.

## What To Do

### Step 1: Scan for Candidates

Call `localground_cleanup_scan` with the directory to scan (ask the user, or use CWD). Parse the JSON response.

If no candidates found, tell the user: "No stale cloud storage artifacts found. Nothing to clean up."

### Step 2: Present Each Candidate

For each match in the scan results, present it clearly:

```
Candidate 1 of N:
  File: CLAUDE.md
  Line: 15
  Cloud path: C:/Users/user/OneDrive/Projects/my-project
  Content: "Active project path: C:/Users/user/OneDrive/Projects/my-project"
  
  Delete this reference? (yes/no/skip all)
```

Wait for the user to respond to EACH candidate individually. Never batch-confirm. Never auto-delete.

### Step 3: Execute Confirmed Deletions

For file reference matches (stale paths in config files), the appropriate action is to **edit the file** to update or remove the stale reference — not to delete the entire file.

For directory candidates (stale source folders, orphan path-hash directories), execute deletion using the platform-appropriate command:

First detect the shell by checking environment:
- If on Windows (PowerShell): `Remove-Item -Recurse -Force "<absolute-path>"`
- If on macOS/Linux (bash/zsh): `rm -rf "<absolute-path>"`

Execute the deletion via the Bash tool. Always quote the path. Report success or failure for each item.

### Step 4: Summary

After processing all candidates, present a summary:
- Items found: N
- Items deleted: N
- Items skipped: N
- Any errors encountered

## Important Rules

- **Never delete without explicit per-item user confirmation**
- **Never batch-confirm** — each item gets its own yes/no
- **Always quote paths** in deletion commands to handle spaces and special characters
- **Scan is always read-only** — only the Bash tool deletions modify the filesystem
- If the user says "skip all", stop processing remaining candidates
- If a deletion fails, report the error and continue to the next candidate
- Distinguish between file reference cleanup (edit the file) and directory cleanup (delete the directory)
