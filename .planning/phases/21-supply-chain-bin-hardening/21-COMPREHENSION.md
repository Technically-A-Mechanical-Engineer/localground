---
work_unit: 21
drafted: 2026-06-29
drafted_by: Claude
reviewer: Robert LaSalle
status: AFFIRMED
---

# Phase 21: Supply-Chain & Bin Hardening — Comprehension Artifact

> **What this is:** A closure-gate review. It exists so that *you*, signing this phase off, can name what shipped and why in your own words — not so that the work gets a rubber stamp. Your role here is reviewer, not author. The four sections below are drafts; you mark each one.
>
> **Review states:**
> - `AFFIRMED` — I understand this and can defend it at my layer.
> - `REWRITE` — the content may be right but the framing misses the point; say it differently.
> - `UNCERTAIN` — honestly uncertain; flag for follow-up.
>
> **Layer calibration:** Read the **At a high level** sentence in each section. If you can defend *that* in your own words, affirm — you don't have to drill into the tables underneath, which are there as evidence if you want to challenge. Deeper is not better; a slower gate isn't a stronger one. The one thing that defeats the gate is affirming a section you couldn't restate under challenge. `UNCERTAIN` with a note is a valid, honest end-state, not a failure.

---

## 1. What is this?

**At a high level:** This phase hardened the two places where the toolkit is most exposed to silent failure — the automated pipeline that publishes it to the public registry, and the way its server answers the question "what version are you?" — so the pipeline can't be quietly tampered with or ship a release it can't prove is genuine, and the server can never hang instead of answering.

| What shipped | Plain-language what & why |
|---|---|
| **Locked building blocks** | Each third-party tool the pipeline borrows is now pinned to one exact, immutable snapshot (a 40-character fingerprint) instead of a movable label like "v7" that its owner could later repoint at different — possibly malicious — code. |
| **A gate that catches a wrong lock** | A CI step that fails the build if any fingerprint doesn't actually match the version label it claims. It is *fail-closed*: there is no quiet "continue anyway" path, so a fingerprint pointing at the wrong code stops the build rather than slipping through. |
| **A publish floor-check** | Right before publishing, the pipeline refuses to proceed unless the machine is new enough (Node + npm) to produce the keyless authenticity stamp the public registry expects. It checks the *actual running version*, not a declared one. |
| **A weekly update robot** | A Dependabot config that proposes fresh versions of those locked building blocks on a schedule, so the locks don't silently rot. |
| **A reliable version answer** | The server's "what version are you?" handling now recognizes every reasonable form of the question and prints-and-exits, instead of (on a missed form) sliding into its normal wait-for-a-client mode and hanging forever. |
| **A cross-model stress test + 2 fixes** | An independent second AI vendor (Codex) plus a panel of Claude skeptics adversarially attacked all of the above; two genuine hardenings came out of it (see §2). |

**Review:** `[X] AFFIRMED · [ ] REWRITE · [ ] UNCERTAIN`

---

## 2. Why this approach?

**At a high level:** Every choice here passed through one rule the last release taught us painfully — *verify that a thing actually works, not just that it looks right* — paired with a discipline of touching the high-trust publishing flow as little as possible.

The "verify the value, not the shape" rule is the direct inheritance from v3.0.1, where a declaration that merely *looked* correct shipped a genuinely bad version. So this phase asserts the live, running truth at every step (the pin actually resolving to its label; the actual machine version; the real printed output) rather than a declaration that something is fine.

What was deliberately **rejected**, and why:

| Considered | Rejected because |
|---|---|
| Add a second supply-chain scanner (zizmor) | Only first-party, well-known building blocks are in play here — the lowest-risk case. Deferred to avoid scope creep on a phase that's already security-sensitive (D-03). |
| Split the publish into separate build + publish jobs | That restructuring risks breaking the keyless authenticity flow we are specifically trying to protect. Deferred — preserving the flow beats a tidier structure (D-10). |
| Pull in an off-the-shelf command-line-argument library for one flag | More dependencies means a bigger attack surface on the exact package we're hardening. A hand-written six-line check does the job (D-14). |
| Compare version numbers as plain text | Text comparison thinks "9" is greater than "14" — it would have let a *too-old* machine publish. We used a real numeric comparison and proved it against the traps. |
| The first proposed fix for the prerelease gap (a "strip the suffix" tweak) | When actually executed, it changed **zero** outcomes — a no-op. It was replaced with a guard that genuinely rejects any non-final version (see §3, §4). |

**Review:** `[X] AFFIRMED · [ ] REWRITE · [ ] UNCERTAIN`

---

## 3. What would break?

**At a high level:** What's most likely to bite later isn't anything visible in today's code — it's the safety checks that haven't yet run in the one place they actually run, and the version locks that only stay safe while nobody loosens them.

| Failure mode / open risk | Honest status |
|---|---|
| The pin-verification gate has **never run live** | It needs the real registry (and a tool absent from this Windows box), so it only fires on the next push. Confidence is high — both fingerprints were already confirmed to resolve to their labels upstream — but the live green is still owed. **Tracked** in the phase's human-checklist. |
| The authenticity stamp can't be confirmed until the **next real release** | A dry run can't produce it; it's a read-back obligation on the next tagged publish. **Tracked** (this was a known, conscious deferral from the start, D-11). |
| The prerelease guard depends on the floor versions staying clean numbers | The new guard rejects any non-final version (a beta/nightly) from publishing. It works because the two floor values are clean numbers today. If someone later wrote a floor with a suffix, the guard's assumption would shift — low risk, but it's the load-bearing assumption. |
| `--config --version` still answers with the version instead of starting the server | Harmless today — the server defines no such option, so nobody passes it. Correctly distinguishing it would require the very argument-parser library we deliberately refused (D-14). Consciously left as a documented edge, not an oversight. |
| Consciously accepted, not bugs | The exact npm version is bumped by hand (a visible note says so, and the floor-check guards against it going too stale); impostor-commit scanning was deferred (D-03). |

**Review:** `[X] AFFIRMED · [ ] REWRITE · [ ] UNCERTAIN`

---

## 4. What did I learn?

**At a high level:** The lesson worth carrying forward is that a fix three separate reviews all endorse can still do absolutely nothing — and the only way to find out is to run it, not review it.

Generalizable patterns (these travel to the next piece of work):

- **A unanimously-endorsed fix can be a no-op.** ⚠️ *AI-was-confidently-wrong event:* the original code review **and both** cross-model passes (Codex + the Claude panel) endorsed the "strip the suffix" fix for the prerelease gap. It was only when I *executed* it against 16 version cases that it proved to change nothing. The durable rule: for load-bearing logic, run it — don't trust review consensus, however broad.
- **Cross-model review has real value *and* real limits.** A genuine second vendor caught a framing the Claude side had dismissed (the positional version-flag edge), which was worth fixing. But that vendor's sandbox couldn't run the floor-check or the test suite locally — so trustworthy coverage came from the *union* of (second-vendor static read + Claude's executed vectors + the local test gates), not from any single reviewer. Don't assume the second opinion can execute everything.
- **"Assert the value, not the shape"** is the throughline from v3.0.1's bad release straight through every success criterion in this phase. It is now a habit worth keeping: when a check could be satisfied by a declaration, make it test the live truth instead.

Phase-specific facts (useful, but *not* portable lessons): the exact pinned fingerprints and versions (checkout v7.0.0, setup-node v6.4.0, npm 11.18.0, Node 22.14.0) and the specific D-code decisions — these live in the phase artifacts, not in your head.

**Review:** `[X] AFFIRMED · [ ] REWRITE · [ ] UNCERTAIN`

---

## Overall Sign-Off

- [X] **COMPREHENSION CONFIRMED** — I understand this, I can defend what it did and why at my layer, and I'd catch a material deviation if one were proposed.
- [ ] **COMPREHENSION GAP** — One or more sections marked REWRITE or UNCERTAIN above. Re-draft and re-review before closure.

**Reviewer notes / flags for follow-up:**

None — all four sections affirmed on first pass.
