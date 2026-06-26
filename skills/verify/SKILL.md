---
description: Environment-wide audit — discover all projects, run health checks, generate traffic-light report with recommendations.
allowed-tools:
  - mcp__localground__localground_audit
---

# /localground:verify

Run an environment-wide audit across all Claude Code projects. Discovers projects automatically, runs health checks on each, and generates a traffic-light report with actionable recommendations.

## What To Do

1. **Run audit** by calling `localground_audit` with no arguments (auto-discovers all projects). Optionally pass `projectPaths` if the user specifies particular projects.

   Parse the JSON response. It contains:
   - `summary`: overall counts (projectsAudited, pass, warn, fail, overallStatus)
   - `projects`: array of per-project results, each with `projectPath` and `checks` array

2. **Present the report** as a traffic-light table per project:

```
Environment Audit

C:/Users/user/Projects/my-project
  PASS  git integrity       OK
  PASS  placeholder files   None
  PASS  cloud sync          Local storage
  PASS  stale references    Clean (12 files scanned)

C:/Users/user/Projects/other-project
  WARN  git integrity       Uncommitted changes
  PASS  placeholder files   None
  WARN  cloud sync          Cloud-synced (OneDrive)
  PASS  stale references    Clean (8 files scanned)

Overall: YELLOW (8 checks: 6 PASS, 2 WARN, 0 FAIL)
  2 projects audited
```

3. **Provide recommendations** after the table:
   - For each WARN or FAIL, explain what it means and what the user should do
   - If any project is cloud-synced: recommend running `/localground:seed` then `/localground:migrate`
   - If stale references found: recommend running `/localground:cleanup` to review them
   - If all checks pass: "Your environment is healthy. No action needed."

## Error Handling

- If `localground_audit` returns `isError: true`, report the error and suggest running individual commands (detect, reap) as an alternative
- If no projects are discovered, report that no Claude Code projects were found and suggest verifying Claude Code is installed and has been used in at least one project
