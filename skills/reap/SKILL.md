---
description: Post-migration health check — verify seed markers and run 6-point health assessment with traffic-light scoring.
allowed-tools:
  - mcp__localground__localground_detect
  - mcp__localground__localground_health_check
  - mcp__localground__localground_verify
---

# /localground:reap

Run a post-migration health check on a project that was copied from cloud-synced storage to a local path. Verifies seed markers survived migration and runs a 6-point health assessment.

## What To Do

1. **Detect environment** by calling `localground_detect`. Parse the JSON response. Confirm the project to check with the user. The project should be at the **destination** (local) path, not the original cloud-synced source.

2. **Run health check** by calling `localground_health_check` with:
   - `projectPath`: the confirmed destination path (absolute)
   - `sourcePath`: (optional) the original source path — ask the user if they know it. Enables the source/target alignment check.
   - `manifestPath`: (optional) only needed if the manifest is not in the default location

   Parse the JSON response. It contains a `checks` array with 6 entries, each having `check`, `status` (PASS/WARN/FAIL/N/A), and `detail`.

3. **Optionally run verify** by calling `localground_verify` with the `projectPath` if the health check shows seed_markers as N/A or FAIL and the user wants more detail on marker verification.

4. **Present the report** as a traffic-light table:

```
Post-Migration Health Check: my-project

PASS  Git integrity         Branch: main, commit: a1b2c3d4
PASS  Placeholder files     No placeholder files detected in 342 files
PASS  Cloud sync status     Project is on local (non-cloud-synced) storage
PASS  Path-hash validity    2 valid path-hash entries
PASS  Seed markers          All 2 markers verified
N/A   Source/target align   No source path provided

Overall: GREEN (6 checks: 5 PASS, 0 WARN, 0 FAIL)
```

5. **Interpret results** in natural language after the table:
   - GREEN: "Migration verified. All checks passed. This project is healthy on local storage."
   - YELLOW: Explain each WARN item and what the user should investigate
   - RED: Explain each FAIL item and what corrective action to take

## Error Handling

- If any MCP tool returns `isError: true`, report the error clearly and continue with remaining checks if possible
- If `localground_health_check` fails entirely, fall back to reporting what can be determined from `localground_detect` alone
