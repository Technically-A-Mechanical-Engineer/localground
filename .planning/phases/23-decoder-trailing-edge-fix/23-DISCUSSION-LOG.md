# Phase 23: Decoder Trailing-Edge Fix - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-30
**Phase:** 23-decoder-trailing-edge-fix
**Mode:** advisor (USER-PROFILE.md present; NON_TECHNICAL_OWNER framing, standard calibration tier)
**Areas presented:** Match certainty, Regression depth, Confirm method

---

## Framing

Phase 23 was presented as ~90% pre-decided: the ROADMAP locks the fix location (`buildCandidates`, `decode.ts:~187`), the fix shape (additive `encodedName + '--'` branch), and the non-goal (do not touch the Phase-17 char class at `decode.ts:89`); the Phase 17 verifier cross-check (`17-VERIFICATION.md:135–161`) already empirically reproduced the defect and recommended the exact fix. Three genuinely open decisions were surfaced. No research fan-out was run because the defect was already empirically grounded — recommendations were presented directly, with a cross-model stress test offered at plan time.

## Match certainty

| Option | Description | Selected |
|--------|-------------|----------|
| Verify-then-return | Re-encode each candidate; return only one that round-trips to the hash, else `no_candidates`. "Assert the value" applied to the fix. | ✓ (via recommendation) |
| Best-guess-first (status quo) | Return `candidates[0]` as today; risks a silently-wrong folder when a special-char component sits next to a similarly-named sibling. | |

**User's choice:** Accepted Claude's recommendation (verify-then-return) → **D-01**.
**Notes:** Concrete failure motivating the choice: hash `Foo--bar` with both `Foo&` and plain `Foo` present → the additive branch matches both, and the spurious `Foo/bar` (which does not round-trip) could surface first. Known casing subtlety flagged for the planner/cross-model pass (strict `encode===hash` can falsely reject correct decodes; verification must be case-insensitive to protect the 17/17).

## Regression depth

| Option | Description | Selected |
|--------|-------------|----------|
| Targeted | The 4 ROADMAP fixtures + full existing suite green + OneDrive re-asserted. | |
| Exhaustive matrix | Targeted PLUS all 9 special chars × every position (trailing/leading/mid/interior/leaf). | ✓ (via recommendation) |

**User's choice:** Accepted Claude's recommendation (exhaustive) → **D-02**.
**Notes:** Highest-regression-risk fix in the milestone, lands last; milestone thesis is value-assertion maximalism.

## Confirm method

| Option | Description | Selected |
|--------|-------------|----------|
| Synthesized real-fs fixture | Create the failing folder in a temp dir, reproduce `no_candidates`, then fix. | ✓ (via recommendation) |
| Also re-run live 23-path-hash scan | Belt-and-suspenders against the user's real path-hashes. | (optional — Claude's discretion) |

**User's choice:** Accepted Claude's recommendation (synthesized fixture) → **D-03**.
**Notes:** Phase 17 diagnostic proved the live machine has zero path-hashes that hit this defect (the 6 failures were deleted source folders), so a synthesized fixture is the only viable "real failing path-hash." Live re-run left as optional.

---

## Selection turn (verbatim)

- **Question:** "Phase 23 is mostly locked. Which of these still-open decisions do you want to dig into?" (multiSelect: Match certainty / Regression depth / Confirm method)
- **User response:** "Other — proceed with your recommendations; we will cross-model stress test them when appropriate."

This is an execution signal: lock all three recommendations as decisions; defer adversarial verification to plan-phase (mirroring the Phase 22 Codex cross-review).

## Claude's Discretion

- Placement of the round-trip verification (inside `buildCandidates` base case vs. post-filter in `decode()`).
- Candidate ordering as optional defense-in-depth alongside D-01.
- `maxCandidates` (20) interaction with the wider branching from the additive branch.
- Whether to also re-run the live 23-path-hash scan (optional).

## Deferred Ideas

None — discussion stayed within phase scope. (CLI-05 streaming refactor remains deferred to v3.2.0; not in play here.)
