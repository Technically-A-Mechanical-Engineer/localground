---
work_unit: 22-core-versioning-audit-filter
drafted: 2026-06-30
drafted_by: Claude
reviewer: Robert LaSalle
status: AFFIRMED
---

# Phase 22: Core Versioning & Audit Filter — Comprehension Artifact

> **What this is:** A closure-gate review for Phase 22. Your role here is *reviewer*, not author — read each section's purpose, decide whether you can defend it at your layer, and mark it. The artifact lives next to the work forever as the record that you understood what shipped and would catch it if it silently drifted.
>
> **Review states:**
> - `AFFIRMED` — I understand this and can defend it at my layer
> - `REWRITE` — the content may be right but the framing misses the point; say it differently
> - `UNCERTAIN` — honestly uncertain; flag for follow-up
>
> **Layer calibration:** Read the `**At a high level:**` sentence first. If you can defend it in your own words, affirm — you do not have to drill into the tables and bullets underneath; those are evidence if you want to challenge, not a reading requirement. Going deeper is not better. Affirming without being able to restate what a section is *for* is the one failure mode this gate exists to prevent. `UNCERTAIN` with a follow-up note is a valid, honest end-state.

---

## 1. What is this?

**At a high level:** Phase 22 closed two ways the toolkit could quietly mislead a user about itself — the version it reports, and the list of "projects" it claims to have found — so that both are provably honest rather than merely plausible-looking.

The whole milestone runs on one rule carried forward from v3.0.1: **assert the VALUE, not the shape** — prove the thing is actually right, not just that it looks right. (That rule exists because v3.0.1 caught a published build that *printed* `3.0.0` while *declaring* `3.0.2`.) Phase 22 applied that rule to two more places, both fixed once in the shared core library so the CLI and the MCP tool inherit the fix identically:

| Fix | What was wrong | What it does now |
|-----|----------------|------------------|
| **BUILD-01** (version) | The seed manifest stamped a frozen, hand-typed version (`'3.0.2'`) that could silently fall out of step with the real package version | The seed manifest now takes its version from the package's own real version at run time, and a test proves — on the actual packaged product — that the stamped value *equals* the package version |
| **CORE-15** (project-finder) | Auto-discovery could surface whole home/drive/system folders — even another person's home, or the Windows `AppData` junk tree — as if they were projects | The finder now refuses those locations by the *shape* of the path alone, while still finding plain project folders that carry no special marker file; a new test locks both behaviors; and the same filter was extended to the `detect` view, which had been leaking unfiltered roots |

**Verification result:** an independent verifier re-ran the build, the full test suite (107 passed), and the packaged-product check, and confirmed all five of the phase's success criteria by execution — not just by reading the code. The packaged check logged `seedManifest=3.0.2` equal to `version=3.0.2` on both shipped packages.

**Review:** `[X] AFFIRMED · [ ] REWRITE · [ ] UNCERTAIN`

---

## 2. Why this approach?

**At a high level:** Both fixes deliberately chose the least-clever option that is *actually* correct, and rejected the tempting alternatives that only *look* correct — including the approach the roadmap itself originally suggested.

**The version fix rejected the "obvious" build-time trick.** The roadmap's first instinct was to have the build tool inject the version automatically. Research disproved it: the build step copies core's *already-compiled* code into each package, and the version literal is frozen into that copy *before* the injection could ever reach it (scenario: you inject at the consumer's build → mechanism: core was already baked in as a fixed string a step earlier → consequence: the injected value never lands). A second variant (bake core's *own* private version in) would only be right as long as all three package versions stayed in lockstep — fragile. So the chosen fix is the boring one: **hand the version to the seed function as an argument**, where each package passes its own real version. It's the only mechanism with true per-package correctness, and it adds no new build configuration and no new dependency.

**The project-finder fix was forbidden from looking inside folders, and forbidden from doing too little.** Two rejections shaped it:

- **No marker check.** It would have been easy to decide "a folder is a project if it contains a `.git` or `package.json` file." That was explicitly off-limits — a deliberate earlier decision (D-01/D-05) is that plain folders with *no* such marker must still count as projects. The fix therefore judges only by the **shape of the path** (how far below your home folder it sits, and which folder names appear), never by reading the folder's contents.
- **No test-only shortcut.** The cheaper option was to just write a test locking today's behavior and call it done. A second AI's adversarial review of the plan refuted that as under-delivering — the success criterion explicitly names `C:\Users\…` roots, and the finder was *still accepting* other-user home roots. So the scope was extended to actually reject those shapes (other-user homes; the `AppData` tree), each paired with a test proving a real project at the same depth still passes.

**A third thing was deliberately *not* done:** the code review surfaced a pre-existing bug in an unrelated part of the seed code. It was left alone on purpose — see Section 3.

**Review:** `[X] AFFIRMED · [ ] REWRITE · [ ] UNCERTAIN`

---

## 3. What would break?

**At a high level:** The phase's protections hold only while a few assumptions stay true; the one place it knowingly under-delivers was a deliberate scope choice, not a miss.

**Assumptions whose decay would let a regression slip back in:**

- **The version-drift protection only works as long as the packaged-product check keeps running in CI.** The strong part is that the check runs against the *real built package*, exercised the *real way each tool is used* (the CLI's `seed` command; the MCP tool's actual machine-to-machine call to Claude) — so if drift ever returns, the release pipeline fails loudly instead of shipping a lying version. The fragile assumption: if someone deletes or skips that check from CI, the alarm goes silent and drift could return unnoticed.
- **The folder-rejection rules are tuned to how today's operating systems lay out home folders.** They reject by path shape (e.g. "the first folder right under your home directory is `AppData`"). If an OS changed its home-folder layout, or if project records from a *different* OS showed up on this machine, a rule could mis-judge. Low risk for the Windows target you actually run on; the rules were written cross-platform to cover the common Mac/Linux cases too.

**Consciously accepted (by design, documented — not an oversight):**

- A real project placed *directly* inside the Users container (e.g. `C:\Users\SharedProjects`) is rejected. This is intentional: that's a pathological place to put a project — a legitimate one lives at least two folders below your home — so the rule rejects *all* direct children of that container rather than guess. It's documented in the code and locked by a test.
- **The code review's one BLOCKER was deliberately left unfixed.** A read-back step elsewhere in the seed code can crash instead of returning a clean success/failure object the way core is supposed to (scenario: the just-written test file can't be read back → mechanism: that read isn't wrapped to catch the error → consequence: the function throws instead of reporting a tidy failure). It is **pre-existing code this phase never touched** (the phase's change to that file was four lines added, one removed — all in the version signature, none in the read-back path; both the verifier and I confirmed this against the actual change history). Fixing it here would be unauthorized scope on an already-verified phase, so it was **backlogged** rather than folded in. This is a chosen deferral, and it's logged.

**Review:** `[X] AFFIRMED · [ ] REWRITE · [ ] UNCERTAIN`

---

## 4. What did I learn?

**At a high level:** The durable lessons are about how to tell "looks done" from "is done," and about where to trust — and distrust — confident-sounding guidance, including from the tooling itself.

**Generalizable patterns to carry into Phase 23 and beyond:**

- **"Assert the value, not the shape" paid off a third time.** Removing the hardcoded version *looked* finished after a one-line edit. Only proving — on the real packaged product — that the stamped value *equals* the package version is the actual proof. The same discipline that caught the earlier `3.0.0`-vs-`3.0.2` misreport is now wired into the release gate.
- **Cross-AI review on load-bearing *plans* earns its cost.** The same-family plan-checker passed both plans clean, yet a second model (Codex) found three genuinely serious defects in those plans — all three real, all three would have shipped broken if executed as first written. Reviewing the *plan* with a different model before building caught what same-model review missed.
- **"Mark phase complete" does not fully cascade — reconcile the tracking by hand.** The automated completion left the roadmap's top checkbox unchecked and left the project-state document stale by *two* phases. This is a recurring pattern, not a one-off; checking and fixing those documents after every phase is now a standing step, not an exception.
- **In a world where producing code is nearly free, scope discipline is the scarce thing.** Noticing an unrelated pre-existing bug is not a license to fix it inside a verified phase. Capture it; don't fold it in.

**Where confident-sounding guidance was flatly wrong (worth distrusting next time):**

- The **roadmap's own recommended mechanism** for the version fix (the build-time injection) was confidently wrong — only running the experiment disproved it.
- A **planning helper's correction** about how to test the packaged product ("just import it directly") was *itself* wrong — the packaged product can't be imported that way; the second-model review caught it, and the fix had to drive the real shipped command instead.
- Both reinforce the carry-forward rule: **run the load-bearing logic yourself; don't trust the consensus of confident sources.**

**Review:** `[X] AFFIRMED · [ ] REWRITE · [ ] UNCERTAIN`

---

## Overall Sign-Off

- [X] **COMPREHENSION CONFIRMED** — I understand this, I can defend what it did and why at my layer, and I'd catch a material deviation if one were proposed.
- [ ] **COMPREHENSION GAP** — One or more sections marked REWRITE or UNCERTAIN above. Re-draft and re-review before closure.

**Reviewer notes / flags for follow-up:**

- Reviewer confirmed COMPREHENSION CONFIRMED — all four sections AFFIRMED (2026-06-30).
- Follow-up tracked: CR-01 pre-existing `seed.ts` read-back throw → backlog candidate (with WR-02/WR-03). First-push/`pinact` gate timing is a deliberate release-cadence decision, still open.
