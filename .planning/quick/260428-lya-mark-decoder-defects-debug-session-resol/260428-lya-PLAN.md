---
phase: quick-260428-lya
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - .planning/debug/decoder-defects.md
autonomous: true
requirements:
  - QUICK-260428-LYA
must_haves:
  truths:
    - "decoder-defects.md frontmatter status is `resolved` (not `diagnosed`)"
    - "decoder-defects.md frontmatter `updated:` is `2026-04-28T00:00:00Z`"
    - "The existing `## Resolution` block has its `verification:` field updated from 'N/A — diagnose-only mode...' to a concrete pointer at Phase 17 (17-VERIFICATION.md)"
    - "A new `closure:` YAML field is appended to the `## Resolution` block, naming Phase 17 closure date, what was closed (Defect A + Defect B main case), and the 999.7 buildCandidates backlog handoff"
    - "Exactly ONE `## Resolution` H2 heading exists in the file (no duplicate top-of-file section)"
    - "All other sections (`## Current Focus`, `## Symptoms`, `## Eliminated`, `## Evidence`, and the pre-existing `root_cause:`/`fix:`/`files_changed:` fields) are byte-identical to the pre-edit content"
  artifacts:
    - path: ".planning/debug/decoder-defects.md"
      provides: "Updated tracking record reflecting Phase 17 closure with backlog handoff"
      contains: "closure:"
  key_links:
    - from: ".planning/debug/decoder-defects.md (## Resolution.verification)"
      to: ".planning/phases/17-core-decoder-calibration/17-VERIFICATION.md"
      via: "inline path reference in YAML field"
      pattern: "17-VERIFICATION\\.md"
    - from: ".planning/debug/decoder-defects.md (## Resolution.closure)"
      to: "C:\\Users\\rlasalle\\.claude\\projects\\C--Users-rlasalle-Projects-localground\\memory\\project_999_7_buildcandidates.md"
      via: "memory pointer reference in YAML field"
      pattern: "project_999_7_buildcandidates"
---

<objective>
Mark the decoder-defects debug tracking record as resolved, with explicit pointers to the closing artifact (Phase 17 verification report) and the residual trailing-edge defect now tracked separately as the 999.7 buildCandidates backlog item.

Purpose: The file is currently stale at `status: diagnosed` while Phase 17 (closed 2026-04-27) actually resolved Defect A (CLI/MCP detect surfaces) and the main mixed-separator case of Defect B. Future readers landing on this debug file need an unambiguous "closed" signal in the frontmatter plus closure metadata in the existing `## Resolution` YAML block — whose `verification:` field literally says "N/A — Verification is the responsibility of whichever phase implements the fixes." That phase came (Phase 17); the field gets the pointer it was waiting for.

Output: A single edited file — `.planning/debug/decoder-defects.md` — with updated frontmatter (status, updated date), an updated `verification:` field in the existing `## Resolution` block, and a new `closure:` YAML field appended to the same block. No new `## Resolution` heading is added (avoids duplicate H2). Original diagnostic content (`## Current Focus`, `## Symptoms`, `## Eliminated`, `## Evidence`, and the `root_cause:`/`fix:`/`files_changed:` fields) preserved verbatim.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/debug/decoder-defects.md
@.planning/phases/17-core-decoder-calibration/17-VERIFICATION.md

<notes>
- The file contains an existing `## Resolution` section (lines 119-151 in the pre-edit file) with `root_cause:`/`fix:`/`verification:`/`files_changed:` YAML keys. We are UPDATING this section in place — replacing the `verification:` value and APPENDING a new `closure:` field at the end of the block. We are NOT adding a second `## Resolution` heading; the existing one is sufficient and adding another creates duplicate-H2 doc-hygiene noise.
- `updated:` value MUST be `2026-04-28T00:00:00Z` exactly (matches `created:`/prior `updated:` ISO-8601 format used in the file).
- The 999.7 backlog item lives in user memory at `C:\Users\rlasalle\.claude\projects\C--Users-rlasalle-Projects-localground\memory\project_999_7_buildcandidates.md`, NOT in `.planning/`. Reference it as a memory pointer, not a relative repo path.
- `root_cause:` and `fix:` fields stay verbatim — they are the historical diagnostic record. Only `verification:` (currently "N/A — diagnose-only mode...") gets replaced, and `closure:` gets appended below `files_changed: []`.
</notes>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Mark decoder-defects.md resolved by updating existing ## Resolution block in place</name>
  <files>.planning/debug/decoder-defects.md</files>
  <action>
Use the Edit tool to make exactly FOUR targeted changes to `.planning/debug/decoder-defects.md`. Do not overwrite the file with Write. The file ends up with exactly ONE `## Resolution` heading (the existing one), updated in place.

**Change 1 — Frontmatter status** (line 2):
Replace `status: diagnosed` with `status: resolved`.

**Change 2 — Frontmatter updated date** (line 5):
Replace `updated: 2026-04-26T00:00:00Z` with `updated: 2026-04-28T00:00:00Z`.

**Change 3 — `verification:` field replacement** in the existing `## Resolution` block.

Find the existing block (currently around lines 148-149):

```
verification: |
  N/A — diagnose-only mode. Verification is the responsibility of whichever phase implements the fixes.
```

Replace with:

```
verification: |
  Closed by Phase 17 (Core Decoder Calibration) on 2026-04-27. See `.planning/phases/17-core-decoder-calibration/17-VERIFICATION.md` — 4/4 must-haves verified, CORE-13 and CORE-14 closed, 23-path-hash diagnostic reproduced and documented.
```

**Change 4 — Append new `closure:` field** at the very end of the file, immediately after the existing `files_changed: []` line (currently the last non-blank line). Append (preserving any single trailing newline conventions of the file):

```
closure: |
  Phase 17 closed Defect A (CLI/MCP `detect` surfaces returning null `decodedPath`) and Defect B's main mixed-separator case (OneDrive corporate paths with ` - ` and `, `) on 2026-04-27.

  Residual: A single character at the trailing edge of intermediate path-hash components still fails decode under `buildCandidates`. Tracked as the **999.7 buildCandidates trailing-edge defect** backlog item (memory: `project_999_7_buildcandidates.md`). Not yet on `ROADMAP.md` `## Backlog`; surface for sequencing when v3.1.0 scope opens.
```

CRITICAL preservation requirement: After the edit, the file MUST still contain the original `## Current Focus`, `## Symptoms`, `## Eliminated`, `## Evidence` sections and the `root_cause:`/`fix:`/`files_changed: []` YAML fields byte-identical to the pre-edit version. The file ends up with exactly ONE `## Resolution` H2 heading (no duplicate).

Do NOT touch any other debug file. Do NOT add or remove blank lines anywhere except at the new `closure:` field's boundary at end of file.
  </action>
  <verify>
    <automated>node -e "const fs=require('fs');const t=fs.readFileSync('.planning/debug/decoder-defects.md','utf8');const checks={status_resolved:/^status: resolved$/m.test(t),updated_today:/^updated: 2026-04-28T00:00:00Z$/m.test(t),no_diagnosed:!/^status: diagnosed$/m.test(t),exactly_one_resolution:(t.match(/^## Resolution$/gm)||[]).length===1,verification_updated:t.includes('Closed by Phase 17')&&t.includes('17-core-decoder-calibration/17-VERIFICATION.md'),no_old_verification:!t.includes('N/A — diagnose-only mode'),closure_field_present:/^closure: \|/m.test(t),backlog_pointer:t.includes('999.7 buildCandidates')&&t.includes('project_999_7_buildcandidates'),current_focus_intact:t.includes('hypothesis: Both defects empirically confirmed.'),symptoms_intact:t.includes('TEST 3 (detect --json):'),evidence_intact:t.includes('packages/core/src/environment/decode.ts buildCandidates'),root_cause_intact:t.includes('TWO INDEPENDENT ROOT CAUSES.'),files_changed_intact:t.includes('files_changed: []')};const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);if(failed.length){console.error('FAIL:',failed.join(', '));process.exit(1);}console.log('OK: all 13 checks passed');"</automated>
  </verify>
  <done>
- Frontmatter shows `status: resolved` and `updated: 2026-04-28T00:00:00Z`
- File contains exactly ONE `## Resolution` H2 heading
- `verification:` field within the `## Resolution` block points to Phase 17 / `17-VERIFICATION.md`
- New `closure:` YAML field appears at end of file, naming Phase 17, what was closed, and the 999.7 backlog handoff with `project_999_7_buildcandidates` memory pointer
- All other sections (`## Current Focus`, `## Symptoms`, `## Eliminated`, `## Evidence`, `root_cause:`, `fix:`, `files_changed: []`) remain byte-identical to the pre-edit content
- Verification node script exits 0 with `OK: all 13 checks passed`
  </done>
</task>

</tasks>

<verification>
Single-task plan — task-level verification above is sufficient. No phase-level integration tests; this is a metadata-only edit on one tracking file with no downstream consumers in the build pipeline.

Manual sanity read after the edit: open `.planning/debug/decoder-defects.md` and confirm:

- Frontmatter top:
```
---
status: resolved
trigger: ...
created: 2026-04-26T00:00:00Z
updated: 2026-04-28T00:00:00Z
---
```

- File still flows through `## Current Focus` → `## Symptoms` → `## Eliminated` → `## Evidence` → `## Resolution` (single occurrence).

- `## Resolution` block reads:
```
## Resolution

root_cause: |
  TWO INDEPENDENT ROOT CAUSES.
  ...
fix: |
  ...
verification: |
  Closed by Phase 17 (Core Decoder Calibration) on 2026-04-27. See `.planning/phases/17-core-decoder-calibration/17-VERIFICATION.md` ...
files_changed: []
closure: |
  Phase 17 closed Defect A ... and Defect B's main mixed-separator case ...
  Residual: ... 999.7 buildCandidates trailing-edge defect ... project_999_7_buildcandidates.md ...
```
</verification>

<success_criteria>
- `.planning/debug/decoder-defects.md` opens with `status: resolved` and `updated: 2026-04-28T00:00:00Z` in the frontmatter
- The existing `## Resolution` block has its `verification:` field updated to point to Phase 17 / `17-VERIFICATION.md`
- A new `closure:` YAML field appears at end of file, naming Phase 17 and the 999.7 backlog handoff
- File contains exactly ONE `## Resolution` H2 heading (no duplicate)
- Every other section is byte-identical to its pre-edit content
- No other file in the repository is modified
- Automated verification script exits 0
</success_criteria>

<output>
After completion, no SUMMARY file is required for a quick single-task plan. The committed diff on `.planning/debug/decoder-defects.md` is the artifact of record.
</output>
