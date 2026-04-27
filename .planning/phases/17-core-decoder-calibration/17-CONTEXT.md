# Phase 17: Core Decoder Calibration - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Calibrate the `encode()` regex in `packages/core/src/environment/decode.ts` so path-hash decoding round-trips correctly for the seven special-character classes Claude Code may encode (apostrophe, ampersand, brackets, plus, equals, percent — parens already covered). Close WR-01 by widening the regex, adding round-trip tests for each new class, and documenting the pre-existing 23-path-hash sample's resolution status.

Maps to v3.0.1 requirements **CORE-13** (regex calibration) and **CORE-14** (WR-01 closure with documented resolution of every `no_candidates` in the original sample). Sequenced after Phase 16 by design — the regex change and new tests land under the restored strict `tsc` gate (TEST-01) and the hardened test infrastructure (TEST-02..04).

**Diagnostic anchor (run 2026-04-27):** All 23 path-hash entries in `~/.claude/projects/` were probed. 17 decode successfully against existing folders. The 6 known `no_candidates` failures from the v3.0.0 close-out are ALL deleted source folders (verified on disk). None are regex undercoverage in the current environment. The regex calibration is therefore **defensive/forward-looking** — preventing silent failure on future folders containing the listed chars — not a fix for an active environment defect.

**Constraint from REQUIREMENTS.md:** CORE-13 lists the seven char classes explicitly. Phase 17 covers exactly that set; broader Unicode/non-ASCII coverage is out of scope.

</domain>

<decisions>
## Implementation Decisions

### Regex shape
- **D-01: Targeted widening, not catch-all.** Extend the regex from `/[\\/: ,().]/g` to `/[\\/: ,().'&\[\]+=%]/g` — adds the seven CORE-13 classes (apostrophe, ampersand, open/close bracket, plus, equals, percent). Parens and period already covered. Reasoning: the 14-REVIEW.md catch-all suggestion `[^A-Za-z0-9-]/g` assumes Claude Code encodes ALL non-alphanumerics. We have no empirical evidence for that — apostrophes and ampersands are legal Windows path chars and CC could pass them through. Targeted matches the documented requirement, is reversible, and carries zero risk to the current 17/17 round-trip success rate.
- **D-02: No empirical CC encoder probe.** Trust CORE-13's documented char list rather than running an mkdir-and-launch-CC probe. If a future char surprises us, widen the regex reactively under a follow-up phase. Probe adds ~30 minutes for a 1-line change with no current symptom.

### Phase scope discipline
- **D-03: Stale-entry classification deferred to backlog.** Phase 17 closes CORE-14 by documenting the diagnostic results — explicitly listing the 6 deleted-source path-hashes as the "documented reason" satisfying CORE-14's success criterion. Adding an `undecodable` classification surfacing path so audit/cleanup tell users "X entries reference deleted source folders" is a separate UX feature touching CLI audit, MCP audit, and cleanup-scan. Capture as a new 999.x backlog item.
- **D-04: Phase 17 file scope is narrow.** Three files change: (1) `packages/core/src/environment/decode.ts` — regex widening; (2) `packages/core/test/environment/decode.test.ts` — per-class round-trip tests; (3) `17-VERIFICATION.md` — diagnostic documentation. Plus PROJECT.md update marking WR-01 closed under Key Decisions. No consumer-side touches (CLI/MCP/audit/cleanup are unchanged).

### Test coverage shape
- **D-05: One round-trip test per CORE-13 class.** New tests in `decode.test.ts` create a real fixture folder containing the target char (e.g., `O'Brien`, `Rock & Roll`, `Foo[Bar]`, `100% Done`), call `encode()` then `decode()`, assert the decoded path equals the fixture path. Real-fs fixtures match the load-bearing v3.0.0 testing pattern. Skip Unicode/non-ASCII and unlisted ASCII chars (tilde, semicolon, at-sign) per scope.
- **D-06: Regression smoke check.** Confirm the existing 5 simple-path tests in `decode.test.ts` still pass with the wider regex. No new assertions needed — the existing assertions already cover the regression risk.
- **D-07: Failing-side coverage out of scope for this phase.** No need for a "decode returns no_candidates for genuinely-deleted folder" test — that path is already covered by the existing line-43 test (`'nonexistent-path-that-has-never-existed-XYZZY-abc'`).

### CORE-14 closure trail
- **D-08: 17-VERIFICATION.md documents all 6 stale entries.** Each of the 6 path-hashes that returns `no_candidates` is listed with its decoded target and a "deleted source folder" notation. This satisfies CORE-14's "every `no_candidates` either resolves or has a documented reason" criterion without requiring code-level classification.
- **D-09: WR-01 marked closed in PROJECT.md Key Decisions.** Add a row noting the regex calibration shipped in Phase 17 with a back-pointer to `17-VERIFICATION.md` for the test trail. Also annotate the 14-REVIEW.md WR-01 entry as resolved by a forward-pointer to Phase 17.

### Claude's Discretion

The following are implementation details delegated to the planner / executor. Decisions made here for the planner's reference, not for re-litigation:

- **Test fixture folder naming:** the test author picks concrete names containing each char. Suggested: `O'Brien` (apostrophe), `Rock & Roll` (ampersand), `Foo[Bar]` (brackets), `1+1` (plus), `key=val` (equals), `100% Done` (percent). Keep them recognizable and deliberately mixed with chars already covered (space, comma) where natural to confirm composition.
- **Regex character ordering inside the bracket class:** semantically equivalent across orderings; pick whichever passes the strictest TS lint clean. Escape brackets per JS regex grammar (`\[` and `\]`).
- **Commit granularity:** one commit for regex widening, one for tests, one for diagnostic write-up + PROJECT.md update. Or one combined commit. Planner's call.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements lock
- `.planning/REQUIREMENTS.md` §"Core Correctness" — CORE-13 (encode regex calibrated against the seven listed char classes) and CORE-14 (WR-01 closed with every `no_candidates` either resolved or documented)
- `.planning/ROADMAP.md` §"Phase 17: Core Decoder Calibration" — phase goal, dependency on Phase 16 (regex change lands under restored tsc gate), 4 success criteria the executor will verify against

### Project-level invariants
- `.planning/PROJECT.md` §"Key Decisions" — Result type pattern (no thrown exceptions), real-fs test fixtures (no mocked fs permitted, caught Phase 14 reparse-point + OneDrive bugs), filesystem-listing reverse-encode decoder (load-bearing for the v3.0.0 OneDrive corporate-path fix; do NOT alter the algorithm — only the regex)

### Diagnostic source-of-truth
- `.planning/debug/decoder-defects.md` — Phase 14 UAT diagnosis. Two relevant pieces: (1) the encode rule documentation at lines 70-77 (`/[\\/: ,().]/g`, single hyphen per char, no collapsing); (2) the cross-cutting suggestion at line 146 about surfacing undecodable entries — captured as deferred backlog per D-03, NOT implemented in Phase 17

### Files modified by Phase 17
- `packages/core/src/environment/decode.ts` — line 89 regex widening (D-01); the surrounding algorithm (filesystem-listing reverse-encode, lines 144-200) is NOT modified
- `packages/core/test/environment/decode.test.ts` — new round-trip tests appended per D-05; existing tests verify regression per D-06

### Files referenced for closure trail (read-only)
- `.planning/milestones/v3.0.0-ROADMAP.md` line 144 — `999.6` backlog promotion provenance for WR-01
- 14-REVIEW.md WR-01 entry (in v3.0.0 milestone archive if extracted, otherwise PROJECT.md "Last shipped" pointer) — original reviewer recommendation that Phase 17 evaluates and partially adopts (targeted, not catch-all)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Existing real-fs round-trip pattern** (`packages/core/test/environment/decode.test.ts:53-71`): `mkdtemp` fixture + `encode(tmpDir)` → `decode(hash)` → assert `decodedPath` equals fixture. Phase 17 extends this exact pattern — create a subdirectory containing the target char, encode the subdirectory's path, decode, assert equality.
- **8.3 short-name canonicalization** (`packages/core/test/environment/decode.test.ts:13-17`): `fs.mkdtemp` then `fs.realpath` to resolve Windows CI's `RUNNER~1` short names to long names. Phase 17 tests inherit this pattern automatically by reusing the existing `beforeEach`.
- **The `it.skipIf` Windows-symlink test** (`packages/core/test/environment/decode.test.ts:79-108`): existing pattern for tests that require Windows admin elevation. Phase 17 does NOT need this — char-class round-trip tests work without admin (no symlink needed; just regular subdirectory with the special-char name).

### Established Patterns
- **`Result<T, R>` narrowing**: `if (result.success) { ... result.data ... } else { ... result.reason ... }`. New round-trip tests assert on the success branch; failure branch is already covered by the existing `'nonexistent-path-...'` test.
- **No mocked filesystem**: real `os.tmpdir()` + `mkdtemp` + `fs.rm` in `afterEach`. Reaper ordering (children before fs.rm) is enforced project-wide per Phase 16's WR-01-style fix in 16-VERIFICATION.md — test files use real fs, no shortcuts.
- **Single-hyphen-per-char encoding rule (no collapsing)**: `replace(/.../g, '-').replace(/^-+|-+$/g, '')`. The regex widening (D-01) only changes the character class; the rest of `encode()`'s contract — single hyphen per match, leading/trailing strip — is preserved.

### Integration Points
- **Decoder is consumed by**: `packages/cli/src/index.ts` (`audit` command, line 449-455), `packages/mcp/src/index.ts` (`localground_audit` tool, lines 665-671). Both call `decode()` per pathHashes entry and filter by `r.success`. Phase 17 does NOT touch these consumer sites — D-03 defers the consumer-side classification to backlog.
- **Tests run via**: `npm test` from the repo root. Phase 17 tests live in `packages/core/test/environment/decode.test.ts` and inherit the existing Vitest config + Phase 16's strict `tsc` gate via `tsconfig.test.json`.

</code_context>

<specifics>
## Specific Ideas

- "Targeted, not catch-all" — D-01 reflects the user's preference to make the smallest change that satisfies the documented requirement. Catch-all is rejected not because it's wrong in theory but because it imports an unverified assumption about CC's encoder rule.
- "Defer the consumer-side feature" — D-03 reflects the v3.0.1 patch-release scope discipline. Stale-entry classification is a real UX improvement but it's a feature, not a calibration. v3.1.0 candidate.
- The diagnostic anchor in `<domain>` is the actual closure of CORE-14's verification side. Without it, Phase 17 would either need to re-run a fragile reproduction case or hand-wave "we trust the new tests cover the gap." With it, the verification trail is concrete: 17/17 currently work, 6/6 documented as deleted sources, new tests cover the seven CORE-13 classes — every category accounted for.

</specifics>

<deferred>
## Deferred Ideas

- **Stale-entry classification (`undecodable` reason surfacing in audit/cleanup)** — promote as new 999.x backlog item. Touches CLI audit + MCP audit + cleanup-scan consumer paths. Real UX improvement: users would see "6 path-hash entries reference deleted source folders — candidates for cleanup" instead of silent omission. Decoder-defects.md line 146 flagged this as cross-cutting. v3.1.0 candidate.
- **Empirical Claude Code encoder probe** — D-02 rejected for Phase 17. If a future bug report surfaces a char outside the targeted CORE-13 set, run an mkdir-test-launch-CC probe at that point to characterize CC's actual rule before deciding scope. Out of scope for v3.0.1 entirely.
- **Unicode / non-ASCII character coverage** — D-05 explicitly limits Phase 17 to the seven CORE-13 classes. If a real folder ever surfaces with accented chars, em-dashes, or full-width punctuation that breaks decoding, re-open under a follow-up phase. No current evidence anyone needs this.
- **Tilde / semicolon / at-sign / unlisted ASCII** — same as Unicode: out of scope per D-05; reactive widening only.
- **`decode()` algorithm refinement** — the filesystem-listing reverse-encode algorithm itself is load-bearing and validated. Phase 17 does NOT touch it. If future correctness issues arise, those belong to a separate algorithmic phase, not a calibration phase.

</deferred>

---

*Phase: 17-core-decoder-calibration*
*Context gathered: 2026-04-27*
