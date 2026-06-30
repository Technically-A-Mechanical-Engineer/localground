---
quick_id: 260630-m1i
slug: bump-version-3-0-2-to-3-1-0-for-v3-1-0-r
type: quick
date: 2026-06-30
status: complete
files_modified:
  - package.json
  - packages/core/package.json
  - packages/mcp/package.json
  - packages/cli/package.json
  - .claude-plugin/plugin.json
  - package-lock.json
---

# Quick Task 260630-m1i Summary: Bump version 3.0.2 → 3.1.0 for the v3.1.0 release

**Bumped every version-of-record from `3.0.2` to `3.1.0` to align the npm/package version with the v3.1.0 GSD milestone, ahead of the Stage-3 release tag. Code commit `7565f4d`.**

## What was done
- Changed the top-level `"version"` field `3.0.2` → `3.1.0` in **five** manifests:
  - `package.json` (root, `localground`)
  - `packages/core/package.json` (`@localground/core`)
  - `packages/mcp/package.json` (`@localground/mcp`) — **published**
  - `packages/cli/package.json` (`@localground/cli`) — **published**
  - `.claude-plugin/plugin.json` (Claude Code plugin manifest)
- Regenerated `package-lock.json` via `npm install` from repo root. Diff is **exactly** the five version fields — zero dependency-tree churn.
- No source edits (see scope note below).

## Scope correction (4 → 5 files)
The original Stage-2 plan named four manifests. A pre-edit `grep` for `3.0.2` surfaced a **fifth** version-of-record — `.claude-plugin/plugin.json`, the Claude Code plugin manifest, kept in lockstep at `3.0.2`. Bumping it keeps the repo internally consistent. A fresh executor following the literal "exactly these four files" instruction would have missed it; caught by checking before editing.

## Why no source changes
`toolkitVersion` is **derived, not hardcoded**:
- `packages/mcp/src/index.ts` and `packages/cli/src/index.ts` read their version from `package.json` at runtime (`JSON.parse`).
- `seed()` takes `toolkitVersion` as a caller-supplied parameter (the mcp/cli runtime version flows in).
- `scripts/verify-tarball.mjs` asserts the seed manifest's `toolkitVersion` equals `package.json`'s version, guarding the hardcoded-drift class.

So the manifest bump propagates automatically. The `toolkit_version: "2.0.0"` strings in `prompts/localground-*.md` and `docs/dev-status/dev-status-reap.md` are legacy v2.0.0 prompt-era artifacts and were intentionally left untouched.

## Verification
- `grep '"version": "3.1.0"'` across the 5 manifests → **5 matches**; `grep '3.0.2'` across them → **none**.
- `node -p` on `package-lock.json`: root `version` = `3.1.0`, `packages[""].version` = `3.1.0`.
- `npm run build` → exit 0 (all three packages built clean via tsup).
- `npm test` from repo root → **17 files, 156 passed / 2 skipped / 0 failed** (known-green baseline). Version-derivation tests pass against `3.1.0` (seed `toolkitVersion` written to manifest; MCP/CLI `--version` predicates).
- `@localground/mcp` and `@localground/cli` both = `3.1.0` → Stage-3 `release.yml` preflight precondition (`tag == mcp version == cli version`) satisfied.

## Execution note
Executed inline (no planner/executor subagents), mirroring quick task `260630-lhs` — a fully-specified, mechanical change where full-context inline execution is more reliable than delegating to a fresh executor (which would have inherited the 4-file under-scope). Tracked artifacts (PLAN.md, this SUMMARY.md, STATE.md Quick Tasks row, atomic commits) produced exactly as a standard quick task.

## Follow-up flagged (not in this task's scope)
- **CHANGELOG.md** has a `[3.0.2]` entry but no `[3.1.0]` entry yet. `release.yml` does **not** gate on CHANGELOG, so this does not block the tag — but a `[3.1.0]` entry summarizing the milestone (SEC-01, CLI-06, BUILD-01, CORE-15, CORE-16) is good release hygiene. Recommend adding before the Stage-3 tag or folding into milestone-close.

## Notes
- Part of the pending unpushed commits. The next `git push` is the Stage-2 validation push (confirm CI stays green on the bumped state before the Stage-3 publish tag).
- `npm install` reported "1 low severity vulnerability" — pre-existing transitive dependency, unrelated to a version-field bump; out of scope here.

## Self-Check: PASSED
- FOUND: all 5 manifests at "version": "3.1.0" (grep = 5)
- FOUND: package-lock.json root version 3.1.0 (no dep churn)
- FOUND: build exit 0; npm test 156 passed / 2 skipped / 0 failed
- FOUND: .planning/quick/260630-m1i-bump-version-3-0-2-to-3-1-0-for-v3-1-0-r/260630-m1i-PLAN.md
- FOUND: .planning/quick/260630-m1i-bump-version-3-0-2-to-3-1-0-for-v3-1-0-r/260630-m1i-SUMMARY.md
