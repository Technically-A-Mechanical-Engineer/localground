---
work_unit: 23-decoder-trailing-edge-fix
drafted: 2026-06-30
drafted_by: Claude
reviewer: Robert LaSalle
status: AFFIRMED
---

# Phase 23: Decoder Trailing-Edge Fix (CORE-16) — Comprehension Artifact

> **What this is:** A closure-gate review for Phase 23, the last requirement of the v3.1.0 milestone. Your role here is **reviewer, not author** — read each section's purpose sentence, decide whether you can defend it at your layer, and mark it. The evidence under each purpose sentence is there *if you want to challenge*, not as required reading.
>
> **Review states:**
> - `AFFIRMED` — I understand this and can defend it at my layer.
> - `REWRITE` — the content may be right but the framing misses the point; say it differently.
> - `UNCERTAIN` — honestly uncertain; flag for follow-up.
>
> **Layer calibration:** Default to the executive summary plus the evidence underneath. Going deeper is not better — only drill in if the summary doesn't give you enough to judge. Gaming the gate = affirming a section you couldn't restate in your own words under challenge. `UNCERTAIN` with a follow-up note is a valid terminal state, not a failure.

---

## 1. What is this?

**At a high level:** This phase closed the last known way the toolkit could *silently* fail to turn a Claude Code hash-directory name back into the real project folder it points to — the specific case where a folder whose name ends in a special character has a sub-folder beneath it.

- **The defect, in plain terms:** A parent folder like `Trailing&` with a child `sub` produced a hash the decoder couldn't reverse — it answered "no candidates found" instead of returning the real path. The same logic powers `detect`/`audit` in the CLI and `decode_path_hash`/`audit` in the MCP server (all four inherit it from the shared `@localground/core`), so the failure silently affected every surface at once.
- **Why it's worth a phase:** The toolkit's whole promise is *no silent failures*. A decoder that quietly says "can't find it" — or worse, hands back the wrong folder — for a real path you migrated is exactly the kind of quiet drift this milestone exists to stamp out. This was the last known decoder correctness hole.
- **What actually shipped (two changes + a test wall):**
  1. The decoder now tries a **second way to match a folder boundary** when a trailing special character left an extra separator behind. (A special char at a folder's trailing edge gets stripped by the encoder, which makes the boundary between that folder and its child carry *two* separators instead of one — so the matcher now tries the two-separator form alongside the one-separator form.)
  2. The decoder now **proves its answer** instead of guessing: it only returns a folder whose name, re-encoded, reproduces the exact input hash. Previously it returned its best-guess first candidate.
  3. A 45-case test matrix (all 9 special characters × 5 positions), an explicit re-check of the real `OneDrive - ThermoTek, Inc` decode, and a documented guard for the one case it deliberately doesn't handle.
- **Result:** CORE-16 closed, verified 6/6, threat-secured 5/5. It was the 5th and final v3.1.0 requirement — the milestone is now fully implemented.

**Review:** `[X] AFFIRMED · [ ] REWRITE · [ ] UNCERTAIN`

---

## 2. Why this approach?

**At a high level:** The fix had to be the **narrowest honest change that solved the problem**, because this is the highest-blast-radius file in the milestone — the same decoder also handles every real path you use, including the load-bearing OneDrive case, and a broad change here risks breaking what already works.

The alternatives that were on the table and why each was rejected:

| Tempting approach | Why it was rejected |
|---|---|
| Widen the encoder's character-matching rule (the "obvious" one-line fix) | That encoder was calibrated in Phase 17 to get 17 of 17 real path-hashes decoding. Touching it risks silently breaking those. Locked out-of-scope (L-02). |
| Keep decode's "return the first plausible candidate" behavior | The new second-match path can surface a *plausible-but-wrong* folder. Returning the first one could hand back the wrong folder silently. So decode was changed to **prove-then-return** (D-01) — re-encode each candidate, return only one that reproduces the exact hash. This is "assert the value, not the shape" applied to the decoder itself. |
| Also fix the general "two-or-more trailing special chars" case (e.g. `Foo&&`) | Out of CORE-16's stated scope ("a special character" — singular). A general fix needs the kind of broad change this milestone deliberately avoids. Documented, guarded with a test, and backlogged (999.8) instead. |

- **Additive, never replacement (L-01):** the new match path sits *alongside* the existing one, which is byte-for-byte unchanged — so nothing that already decoded correctly can regress.
- **One subtle correctness call worth surfacing:** the prove-then-return check compares **case-insensitively**. (Scenario: decode upper-cases the drive letter while the disk reports folders in their own casing. Mechanism: a strict, case-sensitive match would reject a correct answer because the casing differs. Consequence: a case-sensitive check would have *broken* real path-hashes — so the check is deliberately case-tolerant.)
- **It was pressure-tested before being locked:** per your standing instruction, the plan was cross-model stress-tested (Codex) at plan time, and an independent empirical probe re-ran the *old* decoder on real folders to confirm the defect was real before any fix was written.

**Review:** `[X] AFFIRMED · [ ] REWRITE · [ ] UNCERTAIN`

---

## 3. What would break?

**At a high level:** The assumptions whose decay would let this fix return a *wrong or missing* folder — with the one residual you consciously accepted kept separate from anything that would be an oversight.

- **The consciously-accepted residual (the one to actually know about) — tracked as backlog 999.9, accepted risk AR-23-04.** The encoder is *lossy*: many different real folder names collapse to the same hash. (Scenario: a real folder `Foo&\bar` sits on disk next to a folder literally named `Foo--bar`. Mechanism: both encode to the *same* hash, and the prove-then-return check can only confirm a candidate round-trips — it can't tell two round-trippers apart, so it returns whichever the filesystem lists first. Consequence: decode could hand back the wrong one of two colliding siblings.) **This is not a regression** — it's a pre-existing property of the lossy encoder that the new second-match path makes slightly more reachable. Both the phase verifier and the security audit reviewed it and explicitly declined to treat it as a phase gap. The shipped test for the sibling case doesn't actually construct such a true collision (finding WR-02), so the suite wouldn't catch a future regression of *this specific edge* — that test gap is part of 999.9.
- **The load-bearing assumption: the encoder stays byte-identical.** The fix re-uses the encoder as its source of truth for "did this answer round-trip?" If a future change widens the encoder (the exact thing L-02 forbids), both the Phase-17 calibration *and* this fix's verification shift underneath it at once. A test guards the boundary: the `Foo&&` case is pinned to stay "no candidates," so a regex-widening attempt would trip it and surface as a scope violation rather than passing silently.
- **By design, not covered: two-or-more trailing special chars (`Foo&&`) still returns "no candidates."** Conscious, documented, guarded, backlogged (999.8). An oversight would be if this failed *without* a guard — it has one.
- **Low-likelihood: the 20-candidate search cap.** The new branch adds at most one extra search per folder; for realistic path depths the cap isn't reached before the right answer is generated. Accepted (T-23-02); if a future fixture ever proves the cap truncates a correct answer, the plan says that escalates rather than being silently changed.

**Review:** `[X] AFFIRMED · [ ] REWRITE · [ ] UNCERTAIN`

---

## 4. What did I learn?

**At a high level:** The generalizable habits worth carrying into the next piece of work — kept separate from the facts that only matter to this phase.

- **Generalizable — "assert the value, not the shape" scales all the way down to a single bug fix.** The milestone thesis (born from the v3.0.1 near-miss where the binaries reported the wrong version while every *shape* check passed) showed up here three times over: decode now proves its answer actually round-trips rather than looking plausible; all 45 matrix cases assert the decoded *path equals the real folder*, not merely that decode "succeeded"; and the OneDrive case is re-asserted by its decoded value. When a check can assert the value instead of the shape, it should.
- **Generalizable — reproduce-first on a real fixture beats reasoning about a defect.** The bug was proven *failing* on a real on-disk folder before any fix existed, so "fixed" meant "watched the same test flip from fail to pass," not "argued it should now work."
- **Generalizable — an independent empirical check outranks a model's self-reported review on high-stakes logic.** The plan originally mislabeled the *leading-edge* case as a guard that "already passes." It doesn't — it's a *second* case the fix actually repairs. The planning model's own cross-review (Codex) did not catch the mislabel; a from-scratch probe that ran the *old* decoder on real folders did. Pull-forward: when the stakes are high, weight an independent reproduction over any model's assessment of its own work — including mine.
- **Phase-specific fact worth remembering (not a portable lesson) — the `dist/` staleness trap.** The package's tests run against the *built* output, not the TypeScript source, so editing source and running the package's own tests directly can test stale code (it briefly showed a false failure here). Running tests from the repo root rebuilds first. This is a repo-mechanics fact to keep, not a general principle.
- **AI-was-confidently-wrong flag:** a capable planning model confidently asserted the leading-edge mislabel above; only the independent probe corrected it. Logged so you calibrate how much to trust model self-assessment on this kind of logic.

**Review:** `[X] AFFIRMED · [ ] REWRITE · [ ] UNCERTAIN`

---

## Overall Sign-Off

- [X] **COMPREHENSION CONFIRMED** — I understand this, I can defend what it did and why at my layer, and I'd catch a material deviation if one were proposed.
- [ ] **COMPREHENSION GAP** — One or more sections marked REWRITE or UNCERTAIN above. Re-draft and re-review before closure.

**Reviewer notes / flags for follow-up:**

[any notes, UNCERTAIN follow-ups, open threads]
