---
quick_id: 260630-lhs
slug: add-ask-deepwiki-badge-to-repo-root-read
type: quick
date: 2026-06-30
status: complete
files_modified:
  - README.md
---

# Quick Task 260630-lhs Summary: Add Ask DeepWiki badge to repo-root README.md

**Added the "Ask DeepWiki" badge to the repo-root `README.md`, on its own line directly below the H1 title and above the description paragraph. Repo-root README only — per-package npm READMEs untouched.**

## What was done
- Inserted `[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Technically-A-Mechanical-Engineer/localground)` between the H1 (`# LocalGround Toolkit for Claude Code`) and the opening description paragraph, with blank lines on both sides. This is the repo's first badge — there was no prior badge row.
- No other line in README.md changed; no other files touched.

## Execution note
Executed inline (no planner/executor subagents) given the task is a single fully-specified one-line doc insertion — the `/gsd-fast`-class proportionate path. Tracked artifacts (PLAN.md, this SUMMARY.md, STATE.md Quick Tasks row, atomic commit) are produced exactly as a standard quick task would.

## Scope held
- Repo-root `README.md` only. `packages/mcp/README.md` and `packages/cli/README.md` (the npm-page READMEs) were intentionally NOT modified — the DeepWiki badge is GitHub-repo-facing. If the badge is also wanted on the npm package pages, that is a separate change.

## Verification
- `grep -c "deepwiki.com/Technically-A-Mechanical-Engineer/localground" README.md` → 1.
- Badge sits on its own line between the H1 and the description; `git diff` shows a single additive hunk in README.md.

## Notes
- This change is part of the pending unpushed commits and will ride along in the next `git push` (the Stage 1 validation push of the v3.1.0 release flow).

## Self-Check: PASSED
- FOUND: README.md (badge present, grep = 1)
- FOUND: .planning/quick/260630-lhs-add-ask-deepwiki-badge-to-repo-root-read/260630-lhs-PLAN.md
- FOUND: .planning/quick/260630-lhs-add-ask-deepwiki-badge-to-repo-root-read/260630-lhs-SUMMARY.md
