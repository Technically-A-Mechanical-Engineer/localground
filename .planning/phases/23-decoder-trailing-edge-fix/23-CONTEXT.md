# Phase 23: Decoder Trailing-Edge Fix - Context

**Gathered:** 2026-06-30
**Status:** Ready for planning
**Source:** discuss-phase (advisor mode) — user reviewed the phase analysis and chose "proceed with Claude's recommendations; cross-model stress-test them at plan time" (mirrors the Phase 22 Codex pass).

<domain>
## Phase Boundary

A special character (`'`, `&`, `[`, `]`, `(`, `)`, `+`, `=`, `%`) at the **trailing edge of an intermediate path component** must round-trip through `encode()` / `decode()` losslessly — instead of silently failing with `no_candidates`. The fix lives in shared `@localground/core` (`decode.ts`), so the CLI `detect`/`audit` and the MCP `decode_path_hash`/`audit` tools inherit it identically. No new feature surface (v3.1.0 is a hardening minor). The governing v3.0.1 lesson applies: **assert the VALUE, not the shape.**

**The defect is confirmed, not theoretical.** The Phase 17 verifier cross-check (`17-VERIFICATION.md:135–161`) empirically reproduced it under a temporary probe: `tmpDir/Trailing&/sub` encodes to a hash ending `...-Trailing--sub`, and `decode()` returns `no_candidates`. Root cause: `encode()` strips the trailing hyphen via `.replace(/^-+|-+$/g, '')`, so an intermediate component ending in a special char is indistinguishable from one that does not, and `buildCandidates()` only tries `prefix = encodedName + '-'` (one separator) where the hash actually carries two (`--`: the special-char hyphen + the path-separator hyphen). Interior special chars — including the realistic `OneDrive - ThermoTek, Inc/...` shape — already round-trip correctly. The failure mode is *specifically* trailing-edge-of-a-parent-with-a-deeper-child.

This phase clarifies only HOW to land the locked fix — it does not reopen WHAT or WHETHER.

</domain>

<decisions>
## Implementation Decisions

### Locked by ROADMAP / REQUIREMENTS (carry-forward — do NOT reopen)
- **L-01 — Fix location & shape:** Fix the trailing-hyphen-strip asymmetry in `buildCandidates` at `packages/core/src/environment/decode.ts:~187` via an **additive second prefix branch** — try `encodedName + '--'` alongside the existing `encodedName + '-'`. Additive so every currently-passing shape is untouched. (ROADMAP §Phase 23 Constraints.)
- **L-02 — Do NOT touch the Phase-17 character class** at `decode.ts:89`. CORE-16 fixes `buildCandidates`, not the `encode()` regex. A catch-all/widened regex is explicitly Out-of-Scope (REQUIREMENTS.md Out-of-Scope table) — it would break the calibrated 17/17 round-trips.
- **L-03 — Non-regression is a hard gate:** the 17/17 currently-passing path-hashes and the load-bearing v3.0.0 OneDrive `buildCandidates` fix (canonical `OneDrive - ThermoTek, Inc/...` decode) must NOT regress. (ROADMAP SC2, SC3.)

### Decoder correctness
- **D-01 — Match certainty = verify-then-return (the one decision that changes the deliverable).** The additive `--` branch makes `buildCandidates` try a second interpretation, which can produce a **plausible-but-wrong** candidate when a component ending in a special char sits next to a similarly-named sibling. Concrete failure: for hash `Foo--bar`, if both `Foo&` and a plain `Foo` exist as siblings, the `--` branch matches BOTH → `Foo&/bar` (correct, round-trips) AND `Foo/bar` (spurious — `encode('Foo/bar') = 'Foo-bar'`, not `Foo--bar`). Because `decode()` today returns `candidates[0]`, directory-iteration order could surface the spurious one first, and if `Foo/bar` happens to exist on disk the `exists` check passes too — a silently wrong folder. **Decision: the decoder MUST verify each candidate actually round-trips (re-encoding the candidate reproduces the input hash) and return only a verified candidate; if none round-trip, return `no_candidates`.** This is "assert the value" applied to the fix itself. Best-guess-first (status quo) is explicitly rejected.
  - **Known subtlety the planner/cross-model pass MUST resolve (do not regress L-03):** a *strict* `encode(candidate) === hashDirName` check can falsely reject a CORRECT decode on case differences — `decode()` upper-cases the drive letter and `readdir` returns on-disk casing, which may differ from the casing Claude Code wrote into the hash. The existing tests assert **case-insensitive** equality (`.toLowerCase()`) for exactly this reason. The round-trip verification must be case-insensitive (or otherwise casing-tolerant) so the 17/17 do not regress. Candidate ordering alone (single-prefix before double-prefix) is **insufficient** — it does not reject a spurious on-disk double-prefix match when there is no single-prefix competitor — so verification is the primary mechanism; ordering is optional defense-in-depth.

### Verification rigor
- **D-02 — Regression-proof depth = EXHAUSTIVE matrix.** Beyond the 4 ROADMAP-mandated fixtures (trailing-edge + leading-edge + mid-component + an interior-occurrence guard), add a **systematic matrix covering all 9 special characters (`'`, `&`, `[`, `]`, `(`, `)`, `+`, `=`, `%`) at every position** — trailing edge of an intermediate component (must flip from `no_candidates` to SUCCESS), leading edge, mid-component, interior (guard — must stay SUCCESS), and leaf (guard — must stay SUCCESS). The full existing 85-test suite must stay green, and the canonical OneDrive decode must be re-asserted explicitly. Rationale: this is the highest-regression-risk fix in the milestone and lands last; the milestone thesis is value-assertion maximalism. (User's risk call — chose exhaustive over targeted.)

### Reproduction / confirmation
- **D-03 — Confirm against a SYNTHESIZED real-fs fixture.** The ROADMAP requires "confirm against a real failing path-hash BEFORE implementation." The Phase 17 23-path-hash diagnostic established the user's **live machine has ZERO path-hashes that hit this defect** (the 6 `no_candidates` failures were all deleted source folders, not the trailing-edge bug). Therefore "real failing path-hash" = a real folder created on disk in a temp dir (the established `decode.test.ts` pattern, and exactly how the Phase 17 cross-check reproduced it). Reproduce the `no_candidates` failure FIRST, then fix and watch it flip to SUCCESS. The planner should NOT hunt `~/.claude/projects/` for a real-world example — none exists.

### Claude's Discretion
- **Placement of the round-trip verification (D-01):** inside `buildCandidates` at the base case vs. a post-filter in `decode()` over the returned candidate list — planner's call, provided it is casing-tolerant and does not regress L-03.
- **Candidate ordering** as optional defense-in-depth alongside D-01 verification.
- **`maxCandidates` (currently 20) interaction:** the additive branch increases branching where an entry's encoded name is a prefix; the planner/researcher should confirm the cap cannot truncate before the correct candidate is generated for realistic path depths. If it can, raise or restructure — but keep the fix minimal.
- **Optional belt-and-suspenders:** re-running the live 23-path-hash scan to confirm zero active-environment regression is a nice-to-have, not required (D-03 synthesized fixtures satisfy the criterion). Planner's call on cost/benefit.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Authoritative diagnosis (read FIRST)
- `.planning/phases/17-core-decoder-calibration/17-VERIFICATION.md` §"Verifier Cross-Check" (lines 135–207) — empirical reproduction of the exact defect, the precise root-cause analysis, the interior-vs-trailing boundary (counter-evidence table), the active-environment zero-impact finding, and the recommended fix ("try both `prefix = encodedName + '-'` AND `prefix = encodedName + '--'`"). This is the single highest-value reference for this phase.

### Files this phase changes
- `packages/core/src/environment/decode.ts` — `buildCandidates()` (lines 144–200; the prefix-match logic at ~185–196 gets the additive `--` branch per L-01); `decode()` (lines 31–80; the likely home of the D-01 round-trip verification filter); `encode()` (lines 87–90; the trailing-strip that causes the asymmetry — READ for understanding, do NOT modify per L-02).
- `packages/core/test/environment/decode.test.ts` — existing real-fs round-trip fixtures (the pattern to extend for the D-02 matrix; see lines 110–211 for the per-class CORE-13 fixtures and lines 10–17 for the `mkdtemp` + `fs.realpath` canonicalization).

### Contracts that MUST stay green
- The Phase-17 17/17 decode round-trips and the canonical OneDrive `buildCandidates` decode (L-03).
- `decode.test.ts` existing 85-pass / 2-skip suite (Phase 17 baseline) — the matrix is additive.
- `encode()` strip-leading-trailing-hyphens contract (`decode.ts:89`, second `.replace`) — unchanged (L-02).

### Requirements & success criteria
- `.planning/REQUIREMENTS.md` — CORE-16 (line 34) + the Out-of-Scope table (line 53: "Catch-all decoder regex" is forbidden).
- `.planning/ROADMAP.md` §"Phase 23: Decoder Trailing-Edge Fix" — the 4 success criteria + the 2 constraints.

### Milestone research (HIGH confidence; CORE-16 cites these per REQUIREMENTS.md:31)
- `.planning/research/ARCHITECTURE.md`, `.planning/research/FEATURES.md`, `.planning/research/PITFALLS.md` — milestone synthesis; PITFALLS is most relevant to a decoder edge fix.

### Prior context (decision continuity)
- `.planning/phases/22-core-versioning-audit-filter/22-CONTEXT.md` — establishes the v3.1.0 working pattern: minimal honest surface + value-assertion + Codex adversarial cross-review before locking. The D-01/D-03 framing here mirrors it.
- `.planning/phases/17-core-decoder-calibration/17-CONTEXT.md` — Phase 17 decoder-calibration decisions (D-01 "targeted not catch-all" lineage).
- `.planning/PROJECT.md` Key Decisions — the "Runtime `--version` derivation + CI version-equality gate" row (the v3.0.1 SC5 near-miss) is the canonical precedent for "assert the value, not the shape," and the "Filesystem-listing reverse-encode decoder" row explains the decode strategy this fix extends.
- MEMORY.md `project_diagnostic_23_paths.md` / `project_999_7_buildcandidates.md` — the live-environment zero-impact evidence and the original 999.7 → CORE-16 promotion trail (basis for D-03).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/core/test/environment/decode.test.ts:10–17` — the `mkdtemp(os.tmpdir())` + `fs.realpath` canonicalization (resolves Windows 8.3 short-names so the encoded hash matches the long-name path `readdir` returns). REUSE verbatim for every D-02 matrix fixture and the D-03 reproduction.
- `packages/core/test/environment/decode.test.ts:110–211` — the six per-class CORE-13 round-trip fixtures (`O'Brien`, `Rock & Roll`, `Foo[Bar]`, `1+1`, `key=val`, `100% Done`). These are *leaf-position*; the matrix adds the same characters at *trailing-edge-of-intermediate* (the failing shape) plus the other positions.
- `encode()` (`decode.ts:87–90`) — the exact inverse used by the D-01 round-trip verification; the verification re-encodes a candidate path and compares (case-insensitively) to the input hash.

### Established Patterns
- **Result type** (`packages/core/src/types.ts:7–27`) — `decode()` returns `Result<PathHashEntry, DecodeFailureReason>`; the D-01 verification adds no new failure reason (a no-round-trip candidate collapses to the existing `no_candidates`). No throw.
- **No mocked fs** — real-`os.tmpdir()` fixtures only (Phase 14 found Windows reparse-point / OneDrive-path bugs that mocks cannot reproduce). The matrix and reproduction MUST use real directories.
- **`!isFile()` traversal** (`decode.ts:174`) — directories AND reparse points (symlinks/junctions) are traversed; OneDrive folders report `isDirectory()=false`. The fix must preserve this (it lives in the same loop).
- **Build via tsup; `tsc --build:check` is the strict src+test gate** — the matrix tests must satisfy the Phase-16 strict-mode gate (explicit `decodedPath !== null` narrowing in success branches, per the Phase 17 pattern).

### Integration Points
- The fix is pure `@localground/core` (`decode.ts`); both CLI (`detect`/`audit`) and MCP (`decode_path_hash`/`audit`) inherit it with zero per-consumer logic. No consumer-side change needed (D-07 pattern from Phase 22).
- `decode()` returns `candidates[0]` and then checks `fs.access` for `exists` — the D-01 verification slots in between candidate generation and this return.

</code_context>

<specifics>
## Specific Ideas

- **User-directed cross-model stress test (explicit instruction, 2026-06-30):** the user accepted all three recommendations on the condition that they be **cross-model stress-tested "when appropriate."** Appropriate point = plan-phase, mirroring Phase 22's Codex adversarial cross-review (codex-cli, 2026-06-30) of the research findings before locking. The stress test should specifically target: (1) the D-01 round-trip-verification mechanism and its casing subtlety (does it ever falsely reject a correct decode, or fail to reject a spurious one?); (2) the additive `--` branch's interaction with `maxCandidates` and directory-iteration order; (3) whether any of the 9 chars × 5 positions in the D-02 matrix has a shape the additive branch mishandles. This is consistent with the project's "Cross-Model Verification on High-Stakes Output" posture.
- **Preferred posture:** the minimal additive change that *honestly* satisfies the success criteria — additive `--` branch (L-01) + casing-tolerant round-trip verification (D-01), no regex widening (L-02), no new dependencies.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (CLI-05 streaming refactor remains deferred to v3.2.0 per REQUIREMENTS.md Future Requirements; not in play here.)

</deferred>

---

*Phase: 23-decoder-trailing-edge-fix*
*Context gathered: 2026-06-30 — discuss-phase advisor mode; user chose "proceed with recommendations, cross-model stress-test at plan time."*
