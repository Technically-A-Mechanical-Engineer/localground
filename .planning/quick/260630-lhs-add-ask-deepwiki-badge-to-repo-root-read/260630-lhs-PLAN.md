---
quick_id: 260630-lhs
slug: add-ask-deepwiki-badge-to-repo-root-read
type: quick
date: 2026-06-30
files_modified:
  - README.md
---

# Quick Task 260630-lhs: Add Ask DeepWiki badge to repo-root README.md

<objective>
Add the "Ask DeepWiki" badge to the GitHub-facing repo-root `README.md` so the repo's landing page links to its DeepWiki page. Scope is the repo-root README only — the per-package npm READMEs (`packages/mcp/README.md`, `packages/cli/README.md`) are intentionally untouched.
</objective>

<tasks>

<task type="auto">
  <name>Task 1: Insert DeepWiki badge under the H1 title</name>
  <files>README.md</files>
  <action>
    Insert the badge on its own line directly below the H1 (`# LocalGround Toolkit for Claude Code`) and above the description paragraph, surrounded by blank lines. Exact markdown (verbatim):

    `[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/Technically-A-Mechanical-Engineer/localground)`

    Do not modify any other line. Do not add other badges. Do not touch the per-package READMEs.
  </action>
  <verify>
    <automated>grep -c "deepwiki.com/Technically-A-Mechanical-Engineer/localground" README.md</automated>
  </verify>
  <done>The badge appears once on its own line between the H1 and the description; no other line changed.</done>
</task>

</tasks>

<success_criteria>
- README.md contains the verbatim DeepWiki badge markdown once, placed under the H1.
- Only README.md is modified; per-package READMEs untouched.
</success_criteria>
