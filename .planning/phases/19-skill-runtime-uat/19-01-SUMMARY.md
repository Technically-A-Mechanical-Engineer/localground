---
phase: 19-skill-runtime-uat
plan: 01
subsystem: uat
tags: [uat, mcp, skill-runtime, seed, onedrive-fixture, manual-uat]

# Dependency graph
requires:
  - phase: 17-core-decoder-calibration
    provides: "decode-and-enrich code paths the skills exercise at runtime"
  - phase: 18-packaging-polish
    provides: "final tarball shape; dist binary --version short-circuit (Phase 18 SC4 baseline)"
provides:
  - "localground MCP server registered --scope user against packages/mcp/dist/index.js (D-04 inner loop) — visible cross-cwd for plans 19-02..19-05"
  - "fresh seeded OneDrive fixture at C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Documents/lg-uat-fixture-19 — 19-02 reuses this as the migrate SOURCE"
  - "19-UAT.md plan-authored evidence index (SC1 VERIFIED, SC2-5 PENDING)"
  - "19-transcripts/seed.md — UAT-01 transcript with section anchors"
  - "UAT-01 closed PASS (SC1 satisfied)"
affects: [phase-19-02-migrate, phase-19-03-reap, phase-19-06-tarball-replay, phase-19-07-finalize]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Manual UAT driven by Claude under maintainer pass/fail judgment (not gsd-executor subagent — interactive inline)"
    - "MCP stdio server registered --scope user for cross-cwd visibility (L-1); remove-then-add swap (L-2)"
    - "Evidence = section-anchored transcript (19-transcripts/*.md) + plan-authored 19-UAT.md index"

key-files:
  created:
    - .planning/phases/19-skill-runtime-uat/19-UAT.md
    - .planning/phases/19-skill-runtime-uat/19-transcripts/seed.md
  modified:
    - .claude/skills/localground-seed.md

key-decisions:
  - "UAT-01 judged PASS by maintainer (Robert LaSalle) per Claude recommendation"
  - "Git-tag scheme discrepancy (localground/seed/<ts> vs plan/skill-doc lg-seed-*) classified as DOC defect, not product defect — skill-doc example corrected; plan acceptance criterion noted here for 19-07 cleanup"
  - "Fresh fixture per D-12 (not Phase 14 reuse); driven by Claude with maintainer judging, consistent with manual-UAT intent (D-17 observational scope preserved — no product behavior changes)"

requirements-completed: [UAT-01]

# Metrics
duration: ~1 session (setup pre-restart + run post-restart)
completed: 2026-06-25
---

# Phase 19 Plan 01: Skill Runtime UAT — UAT-01 (/localground:seed) Summary

**`/localground:seed` validated end-to-end against the registered local-dist MCP server: detect → seed produced a valid 6-key manifest, test-file marker, and git tag on a fresh OneDrive fixture. SC1 PASS (maintainer-confirmed). One doc-level discrepancy found and corrected.**

## How this plan ran

Manual UAT, executed **interactively** (not via gsd-executor subagent). Deterministic setup (build, MCP registration, fixture creation) was run by Claude via shell before the Claude Code restart; the skill run (`localground_detect` → `localground_seed`) was driven by Claude in the post-restart session with the maintainer as pass/fail judge. `workflow.use_worktrees=false` was set first (local config.json — untracked/ignored by design).

## Accomplishments (acceptance criteria)

- **MCP registration (Task 1):** `localground` registered `--scope user` → `packages/mcp/dist/index.js`; `claude mcp list` shows it **✔ Connected** from both the repo cwd and an outside cwd (L-1 cross-cwd property). `node dist/index.js --version` → `3.0.0`, exit 0 (Phase 18 SC4 baseline intact — no transport boot).
- **Fresh fixture (Task 2, D-12):** `C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Documents/lg-uat-fixture-19` — `git init`, 3 commits, 18 tracked files, no pre-existing `.localground-seed-test` (L-5 clean).
- **UAT-01 run (Task 2):** `localground_detect` returned structured env JSON (`isError:false`); `localground_seed` returned a manifest with all 6 keys (`isError:false`). On disk: `.localground-seed-manifest.json` written, `.localground-seed-test` present (112 B), git tag `localground/seed/2026-06-26T00-00-59-707Z` pinned to HEAD `eec8f2a4` (== manifest `commitHash`).
- **19-UAT.md skeleton (Task 3):** plan-authored with Phase 18 5-field frontmatter, 5-row Observable Truths table (SC1 VERIFIED), Requirements Coverage (UAT-01 SATISFIED), Behavioral Spot-Checks, Human Verification Required, Gaps Summary placeholder. No `## Verifier Cross-Check` section (reserved for gsd-verifier per D-09).

## Discrepancy found and resolved

**Git-tag scheme mismatch (DOC defect, not product defect).** Actual seed tag: `localground/seed/<ISO-ish timestamp>`. Plan 19-01 step 6 + acceptance criterion #8 expect `lg-seed-*`; the skill-doc Output Format example (`localground-seed.md`) showed `lg-seed-v1`. The product is correct — the tag is created and the manifest records the real name, so `verify`/`reap` match it downstream.

- **Fix applied:** skill-doc example corrected to `localground/seed/<timestamp>`.
- **Carried to 19-07:** plan 19-01 acceptance criterion #8 / step 6 wording (`lg-seed-*`) should be corrected in any plan-doc cleanup; logged in 19-UAT.md Gaps Summary.

## Observation for downstream (UAT-05)

`localground_detect` reported 6 of 23 path-hash entries decoding to `null`: `.claude-skills`, `Documents-Claude-Projects`, `Training-With-Amit-2026-03-29`, `0159…CC-CLI` (×3 variants), `claude-code-cloud-sync-migration`. Mix of deleted/renamed folders (legitimate `no_candidates`) and the `0159…CC_CLI` underscore→hyphen case (related to the 999.7 decode boundary). To be assessed under UAT-05 (`/localground:verify`).

## Hand-off to 19-02 (UAT-02 — migrate)

- **Migrate SOURCE = the seeded fixture:** `C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Documents/lg-uat-fixture-19` (now seeded — do NOT re-seed; L-5 would refuse).
- UAT-02 is the load-bearing two-session test and **requires a Claude Code restart mid-run** (Session 1 from source cwd → restart from destination → Session 2). MCP server is already `--scope user`, so it remains visible across both cwds — no re-registration needed.
- Destination will be a fresh path (e.g. `C:/Users/rlasalle/Projects/lg-uat-19-dest`), created by the migrate flow.

## Self-Check: PASSED

- `19-transcripts/seed.md` exists; contains `## Tool call: localground_detect`, `## Tool call: localground_seed`, `## On-disk evidence (post-run)`.
- `<fixture>/.localground-seed-manifest.json` exists, valid JSON, 6 keys.
- `<fixture>/.localground-seed-test` exists; git tag `localground/seed/*` present and pinned to HEAD.
- `19-UAT.md` exists; frontmatter `score: 1/5 truths verified`, `requirements_verified: 1/5`; SC1 row VERIFIED; no `## Verifier Cross-Check` section.
- `.claude/skills/localground-seed.md` example tag corrected.

---
*Phase: 19-skill-runtime-uat — Plan 01*
*UAT-01: PASS (maintainer-confirmed 2026-06-25)*
