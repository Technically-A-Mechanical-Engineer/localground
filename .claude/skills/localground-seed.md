---
name: localground-seed
description: Plant verifiable markers in a Claude Code project before migration. Detects environment and seeds markers for post-migration verification.
allowed-tools:
  - mcp__localground__localground_detect
  - mcp__localground__localground_seed
---

# /localground:seed

Plant verifiable markers in a project before migrating it off cloud-synced storage. These markers let you confirm after migration that the copy is complete and uncorrupted.

## What To Do

1. **Detect environment** by calling `localground_detect`. Parse the JSON response. Report the environment summary to the user:
   - OS and shell
   - Cloud sync service and whether CWD is cloud-synced
   - Number of projects and path-hash entries discovered

2. **Ask the user** which project to seed. If only one project is discovered, confirm it. If CWD is a git repo, suggest CWD. The `projectPath` must be an absolute path.

3. **Seed markers** by calling `localground_seed` with the confirmed `projectPath`. Parse the JSON response.

4. **Report results** to the user:
   - If successful: list each marker planted (test file path + checksum, git tag name + commit hash), and the manifest file path
   - If failed: report the error reason and detail clearly

5. **Guide next step:** Tell the user: "Markers planted. When you're ready to migrate, run `/localground:migrate` to copy this project to local storage."

## Error Handling

- If `localground_detect` returns `isError: true`, report the error and stop
- If `localground_seed` returns `isError: true`, report the error. Common causes: project already seeded (manifest exists), not a git repo (git tag cannot be created)
- Never proceed to seed without confirming the project path with the user

## Output Format

Use natural language, not raw JSON. Present the manifest details in a readable format:

```
Seed Complete

Project: my-project
Path:    C:/Users/user/Projects/my-project
Markers:
  Test file: .localground-seed-test (checksum: a1b2c3d4...)
  Git tag:   localground/seed/2026-06-26T00-00-59-707Z (commit: e5f6g7h8)
Manifest:  .localground-seed-manifest.json

Next: Run /localground:migrate when ready to move this project.
```
