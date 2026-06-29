---
phase: 20-release-pipeline-validation
plan: "01"
subsystem: release-infra
tags: [npm-publish, provenance, manifest, docs]
dependency_graph:
  requires: []
  provides: [D-04, D-05, D-13, DOC-03-pre-publish]
  affects: [packages/mcp/package.json, packages/cli/package.json, .planning/PROJECT.md]
tech_stack:
  added: []
  patterns: [case-exact-repository-url, npm-provenance-manifest-prerequisites]
key_files:
  created: []
  modified:
    - packages/mcp/package.json
    - packages/cli/package.json
    - .planning/PROJECT.md
decisions:
  - "D-04 satisfied: repository.url uses exact casing Technically-A-Mechanical-Engineer/localground (E422 blocker removed)"
  - "D-05 satisfied: license MIT added to both published manifests"
  - "D-13 satisfied: PROJECT.md now describes three forms explicitly — MCP server, CLI, paste-prompts — plus the plugin"
  - "DOC-03 pre-publish portion verified: both per-package READMEs carry install commands, Windows workaround, and MIT"
  - "Versions unchanged at 3.0.0 — bump deferred to plan 20-04 per D-06/D-10 sequencing"
metrics:
  duration: "77 seconds"
  completed_date: "2026-06-29"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 3
---

# Phase 20 Plan 01: Manifest Metadata Pre-flight Summary

npm provenance/OIDC E422 blocker removed — both published manifests now carry a case-exact `repository` field and MIT `license`; PROJECT.md updated to describe three distribution forms.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add repository + license to MCP manifest (D-04, D-05) | 4fe24e5 | packages/mcp/package.json |
| 2 | Add repository + license to CLI manifest (D-04, D-05) | 131ad32 | packages/cli/package.json |
| 3 | PROJECT.md three-forms + README verify (D-13, DOC-03) | 064b821 | .planning/PROJECT.md |

## Decisions Made

- **D-04 closed:** `repository.url` set to `git+https://github.com/Technically-A-Mechanical-Engineer/localground.git` (case-exact) in both `@localground/mcp` and `@localground/cli` manifests. `directory` fields are `packages/mcp` and `packages/cli` respectively. The E422 hard blocker is removed.
- **D-05 closed:** `license: "MIT"` added to both published manifests. npm will no longer warn "no license field" on publish.
- **D-13 closed:** PROJECT.md "What This Is" section updated from the stale "two forms" description to an explicit three-forms enumeration (MCP server, CLI, paste-and-run prompts) plus plugin mention.
- **DOC-03 pre-publish portion verified:** Both `packages/mcp/README.md` and `packages/cli/README.md` carry name heading, `## Install` section with correct install commands (including the Windows `cmd /c npx` workaround in the MCP README), and `MIT` license statement. Live npmjs.com render confirmation deferred to plan 20-06 (post-publish gate).
- **Versions held at 3.0.0:** All manifests remain at 3.0.0; the 3.0.0→3.0.1 bump is a single aligned commit in plan 20-04 per D-06/D-10 sequencing.

## Verification Results

All three automated `node -e` verify commands passed:

```
OK mcp repository+license+version-untouched
OK cli repository+license+version-untouched
OK PROJECT.md three-forms + both READMEs render-ready
```

## Deviations from Plan

None — plan executed exactly as written. The only operational note is that `.planning/PROJECT.md` required `git add -f` per the documented gitignore-but-tracked pattern (expected, not a deviation).

## Known Stubs

None. This plan edits manifest metadata and doc text only — no data-flow or rendering paths involved.

## Threat Flags

None. All surface changes are metadata on public packages (T-20-02 accepted). T-20-01 and T-20-03 mitigated by this plan's edits.

## Self-Check: PASSED

- packages/mcp/package.json: present and verified (node -e parse + field assertions pass)
- packages/cli/package.json: present and verified (node -e parse + field assertions pass)
- .planning/PROJECT.md: present and verified (node -e readFile regex assertions pass)
- Commits 4fe24e5, 131ad32, 064b821: present in git log
