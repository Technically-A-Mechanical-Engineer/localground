---
phase: 17-core-decoder-calibration
verified: 2026-04-27T05:18:54Z
status: passed
score: 4/4 must-haves verified
overrides_applied: 0
requirements_verified: 2/2
---

# Phase 17: Core Decoder Calibration Verification Report

**Phase Goal:** Path-hash decoding round-trips correctly for the full set of special characters Claude Code actually encodes, eliminating silent `no_candidates` failures.

**Verified:** 2026-04-27T05:18:54Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| #   | Truth                                                                                                                                                                                                                                          | Status     | Evidence                                                                                                                                                                                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SC1 | `encode()` followed by `decode()` round-trips folder names containing apostrophes, ampersands, brackets, parentheses, plus signs, equals signs, and percent signs without data loss                                                            | ✓ VERIFIED | `grep -F '/[\\\\/: ,().'\''&\[\]+=%]/g' packages/core/src/environment/decode.ts` returns 1 match (line 89, post-Wave 1 widening). Six new per-class round-trip tests appended in `packages/core/test/environment/decode.test.ts` covering apostrophe, ampersand, brackets, plus, equals, percent — parens already covered pre-Wave 1. Each test creates a real-fs fixture, encodes the subdir path, decodes the resulting hash, and asserts case-insensitive equality. |
| SC2 | Re-running the user's original 23-path-hash reproduction case (or an equivalent reproduction case with documented coverage of the same encoding classes) returns zero unexplained `no_candidates` results — every `no_candidates` either resolves to an existing folder or has a documented reason (e.g., source folder deleted) | ✓ VERIFIED | See the closure section below (**§ Path-Hash Diagnostic / CORE-14**). The 2026-04-27 diagnostic against `~/.claude/projects/` resolved 17/23 successfully and documents all 6 `no_candidates` failures as deleted source folders verified absent on disk. Zero unexplained results remain. |
| SC3 | Decoder unit tests cover at least one case per newly-supported special character class and pass on Windows, macOS, and Linux                                                                                                                  | ✓ VERIFIED | `npm test` exits 0 with 85 passed / 2 skipped (was 79/2 pre-Wave 1 — exactly +6 per-class round-trip tests). Tests use real `os.tmpdir()` + `fs.mkdtemp` + `fs.realpath` (8.3 short-name canonicalization for Windows CI) per the established pattern. Phase 20 / PIPE-01 will validate the first cross-OS green CI run on master push.        |
| SC4 | WR-01 entry in CONTEXT.md (or equivalent) is marked closed with a link to the verifying test cases                                                                                                                                            | ✓ VERIFIED | WR-01 closure row appended to `.planning/PROJECT.md` Key Decisions table linking to this verification report (Plan 17-02 Task 2). Forward-pointer `Resolved by Phase 17` annotated at `.planning/milestones/v3.0.0-ROADMAP.md:144` (the `**999.6**` backlog provenance entry where WR-01 was promoted into v3.0.1 scope). Both pointers resolve back to this file. |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact                                                                                          | Expected                                                                                  | Status     | Details                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/core/src/environment/decode.ts`                                                         | Line 89 regex widened to cover seven CORE-13 char classes (apostrophe, ampersand, brackets, plus, equals, percent — parens/period already covered) | ✓ VERIFIED | Wave 1 commit `729e8ff` (feat). Pre-widening: `/[\\\/: ,().]/g`. Post-widening: `/[\\\/: ,().'&\[\]+=%]/g`. Strip-leading-trailing-hyphens contract on second `replace()` byte-identical. `decode()`/`reconstructPath()`/`buildCandidates()` algorithm unchanged.                                |
| `packages/core/test/environment/decode.test.ts`                                                   | Six per-class round-trip tests appended inside existing `describe('decode')` block       | ✓ VERIFIED | Wave 1 commit `88eee40` (test). `grep -c "round-trips encode/decode for a folder name containing"` returns 6. Fixture names: `O'Brien`, `Rock & Roll`, `Foo[Bar]`, `1+1`, `key=val`, `100% Done`. Existing 5+5 tests untouched. No new imports.       |
| `.planning/phases/17-core-decoder-calibration/17-VERIFICATION.md`                                 | Verification report with CORE-14 closure trail (this file)                                | ✓ VERIFIED | This document — 16-VERIFICATION.md template followed; 6-entry Path-Hash Diagnostic table present; CORE-13 + CORE-14 cited under Requirements Coverage.                                                                                          |
| `.planning/PROJECT.md` — Key Decisions row                                                        | New row marking WR-01 closed with markdown link back to this file                         | ✓ VERIFIED | Wave 2 Task 2 — single-row append to Key Decisions table; footer line updated to cite Phase 17 completion. Linked from row's Outcome cell to `phases/17-core-decoder-calibration/17-VERIFICATION.md`.                                            |
| `.planning/milestones/v3.0.0-ROADMAP.md` — line 144                                               | Forward-pointer `Resolved by Phase 17` on the `**999.6**` backlog provenance entry        | ✓ VERIFIED | Wave 2 Task 2 — line 144 replacement. Same line as `**999.6**` retains the original WR-01 reference and appends the forward-pointer plus a relative markdown link to this file.                                                                |

### Path-Hash Diagnostic — CORE-14 Closure

The 23-path-hash sample probed during the 2026-04-27 diagnostic (per 17-CONTEXT.md `<domain>`)
resolved as follows: 17/23 decoded successfully against existing folders. The remaining 6
returned `no_candidates` because the source folder no longer exists on disk. Each is
documented below, satisfying CORE-14's "every `no_candidates` either resolves or has a
documented reason" criterion.

| # | Path-hash directory name | Decoded target (best inference) | Status |
|---|---------------------------|----------------------------------|--------|
| 1 | `C--Users-rlasalle-Documents-Claude-Projects` | `C:\Users\rlasalle\Documents\Claude Projects` | Deleted source folder — verified absent on disk |
| 2 | `C--Users-rlasalle-OneDrive---ThermoTek--Inc-Desktop-ATP-NTS-Test-DATA` | `C:\Users\rlasalle\OneDrive - ThermoTek, Inc\Desktop\ATP-NTS-Test-DATA` | Deleted source folder — verified absent on disk |
| 3 | `C--Users-rlasalle-OneDrive---ThermoTek--Inc-Desktop-Cowork-Test1` | `C:\Users\rlasalle\OneDrive - ThermoTek, Inc\Desktop\Cowork-Test1` | Deleted source folder — verified absent on disk |
| 4 | `C--Users-rlasalle-OneDrive---ThermoTek--Inc-Documents-Projects-Training-With-Amit-2026-03-29` | `C:\Users\rlasalle\OneDrive - ThermoTek, Inc\Documents\Projects\Training With Amit 2026-03-29` | Deleted source folder — verified absent on disk |
| 5 | `C--Users-rlasalle-OneDrive---ThermoTek--Inc-General-Current-Hotness-0246-2026-Management-Review-RL-Claude-Sandbox` | `C:\Users\rlasalle\OneDrive - ThermoTek, Inc\General\Current Hotness\0246-2026-Management-Review-RL-Claude-Sandbox` | Deleted source folder — verified absent on disk |
| 6 | `C--Users-rlasalle-Projects-claude-code-cloud-sync-migration` | `C:\Users\rlasalle\Projects\claude-code-cloud-sync-migration` | Deleted source folder — renamed to `localground` 2026-04-12 |

**Closure:** No regex undercoverage in the active environment. The Phase 17 regex widening
is defensive/forward-looking — preventing silent failure on FUTURE folders containing the
seven CORE-13 classes — not a fix for an active environment defect.

### Key Link Verification

| From                                                                                            | To                                                                              | Via                                                                                                          | Status   | Details                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `decode.test.ts` six new round-trip tests                                                       | `decode.ts` `encode()` / `decode()`                                             | `encode(subDir)` → `decode(hash)` round-trip with case-insensitive equality assertion                        | ✓ WIRED  | Per-class fixture subdirectory (e.g., `O'Brien`) → `encode()` produces hash → `decode(hash)` reverse-lookups via filesystem listing → `result.data.decodedPath` equals `subDir` (case-insensitive). All six tests follow the same skeleton. |
| `17-VERIFICATION.md` (this file) Path-Hash Diagnostic table                                     | Original 23-path-hash sample (project_diagnostic_23_paths.md, run 2026-04-27)   | Six rows listing the deleted-source path-hashes verbatim from the diagnostic memory file                     | ✓ WIRED  | 6 entries match the diagnostic's "The 6 failures" section exactly; 17 successful entries summarized as a count (not enumerated, per D-08 plan scope).                    |
| `.planning/PROJECT.md` Key Decisions WR-01 row                                                  | `17-VERIFICATION.md` (this file)                                                | Markdown link in the row's Outcome cell pointing to `phases/17-core-decoder-calibration/17-VERIFICATION.md`  | ✓ WIRED  | Confirmed by Plan 17-02 Task 2 acceptance criteria. PROJECT.md grew by exactly 1 Key Decisions row.                                                                       |
| `.planning/milestones/v3.0.0-ROADMAP.md` line 144 (`**999.6**` backlog provenance)              | `17-VERIFICATION.md` (this file)                                                | Forward-pointer annotation `**Resolved by Phase 17** — see [...]` appended to the same line as `**999.6**` | ✓ WIRED  | Single-line replacement; relative markdown link `../phases/17-core-decoder-calibration/17-VERIFICATION.md` resolves to a real file.                                       |

### Behavioral Spot-Checks

| Behavior                                                                                  | Command                                                                                              | Result                                                                                                       | Status   |
| ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------- |
| Widened regex form present in source                                                      | `grep -F '/[\\\\/: ,().'\''&\[\]+=%]/g' packages/core/src/environment/decode.ts`                     | 1 match                                                                                                      | ✓ PASS   |
| Old regex absent from source                                                              | `grep -F '/[\\\\/: ,().]/g' packages/core/src/environment/decode.ts`                                 | 0 matches                                                                                                    | ✓ PASS   |
| Per-class round-trip test count                                                           | `grep -c "round-trips encode/decode for a folder name containing" packages/core/test/environment/decode.test.ts` | 6                                                                                                            | ✓ PASS   |
| Strict gate (covers src + test under inherited strict mode)                               | `npm run build:check`                                                                                | exit 0 (Phase 16's `tsc --build tsconfig.json && tsc --noEmit -p tsconfig.test.json`)                         | ✓ PASS   |
| Full Vitest suite                                                                         | `npm test`                                                                                           | exit 0; 85 passed / 2 skipped (was 79/2 pre-Wave 1 — exactly +6 tests)                                       | ✓ PASS   |
| TEST-04 invariant preserved (no resurrected discriminated-union tautology)                | `grep -E "expect\(typeof.*success\)\.toBe\(['\"]boolean['\"]\)" packages/core/test/environment/decode.test.ts` | 0 matches                                                                                                    | ✓ PASS   |

### Requirements Coverage

| Requirement | Source Plan | Description                                                                                                       | Status       | Evidence                                                                                                                                                                                                                                       |
| ----------- | ----------- | ----------------------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CORE-13     | 17-01       | encode() regex calibrated against the seven listed char classes (apostrophe, ampersand, brackets, plus, equals, percent — parens/period already covered) | ✓ SATISFIED  | `decode.ts:89` widened regex (Wave 1 commit `729e8ff`) plus six per-class round-trip tests in `decode.test.ts` (Wave 1 commit `88eee40`). All pass under the Phase 16 strict tsc gate. The widening is targeted, not catch-all (D-01 honored).  |
| CORE-14     | 17-02       | WR-01 closed; every `no_candidates` from the original sample either resolves or has a documented reason          | ✓ SATISFIED  | This document's closure section above (heading **Path-Hash Diagnostic / CORE-14**) lists all 6 `no_candidates` failures with decoded targets and "deleted source folder" notation. PROJECT.md Key Decisions WR-01 row closes the project-level thread; v3.0.0-ROADMAP.md:144 forward-pointer closes the milestone-level thread. |

**Coverage:** 2/2 requirement IDs satisfied.

### Anti-Patterns Found

None. Phase 17 is a calibration phase touching one regex line (1-character-class extension) and adding six isomorphic real-fs round-trip tests. The Wave 1 SUMMARY documented one Rule 3 deviation (explicit `decodedPath !== null` narrowing inside each new test to satisfy the Phase 16 strict tsc gate without losing the loud-failure property of the preceding `not.toBeNull()` assertion) — that is a strict-gate accommodation, not an anti-pattern. No new anti-pattern surface.

### Human Verification Required

None. All criteria are shell-verifiable via the greps in the **Behavioral Spot-Checks** table. Cross-platform execution of the new tests will be validated by Phase 20 / PIPE-01's first end-to-end green CI run on master push (the Windows / macOS / Linux leg of SC3) — that is Phase 20's responsibility per ROADMAP.md, not a Phase 17 verification item.

### Gaps Summary

No gaps. CORE-13 and CORE-14 satisfied; WR-01 closed. The remaining v3.0.1 work covers:
- **Phase 18** (PKG-01, PKG-02) — packaging polish (`files: ["dist"]` for tarball size reduction)
- **Phase 19** (UAT-01..UAT-05) — skill runtime UAT against the registered `@localground/mcp` server
- **Phase 20** (PIPE-01, PIPE-02, DOC-03) — release pipeline validation on the v3.0.1 tag push

These are independent of the decoder calibration thread and do not retroactively re-open Phase 17.

---

*Verified: 2026-04-27T05:18:54Z*
*Verifier: Claude (gsd-verifier)*
