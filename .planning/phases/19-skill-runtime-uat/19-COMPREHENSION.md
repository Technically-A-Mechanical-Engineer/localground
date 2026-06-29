---
work_unit: 19-skill-runtime-uat
drafted: 2026-06-28
drafted_by: Claude
reviewer: Robert LaSalle
status: AFFIRMED
affirmed: 2026-06-28
---

# Phase 19: Skill Runtime UAT — Comprehension Artifact

> **What this is:** A closure-gate review, not a code review. Phase 19 is finished and verified; this artifact exists so the person with authority to close it can name — on paper — what it did and why, at the layer they actually defend. Your role here is *reviewer*, not author. You mark each section; I never mark it for you.
>
> **Review states:**
> - `AFFIRMED` — I understand this and can defend it at my layer
> - `REWRITE` — the content may be right but the framing misses the point; say it differently
> - `UNCERTAIN` — honestly uncertain; flag for follow-up
>
> **Layer calibration:** Read the `**At a high level:**` sentence first. If you can defend it in your own words, affirm — you do **not** have to drill the tables underneath; they're evidence if you want to challenge, not a reading requirement. Going deeper is not a better gate, just a slower one. The only failure is affirming something you couldn't restate under challenge. `UNCERTAIN` with a note is a valid place to land.

---

## 1. What is this?

**At a high level:** Phase 19 proved that the five commands a real user types — `/localground:seed`, `:migrate`, `:reap`, `:cleanup`, `:verify` — actually *work* end to end, not just that they *look* correct on paper. v3.0.0 checked the skills for static compliance (do they say the right things). Phase 19 closes the gap that check leaves open: does a keystroke actually load the skill, call the real MCP tool, and produce the right effect on a real filesystem — and does it still do that on the *packaged form that ships to strangers*, not just the working copy on your machine.

The worry it retires: "we published something that passed unit tests but could still be broken the instant a stranger types the command, because nothing had ever exercised the full path — keystroke → skill → tool → disk — on the actual shippable artifact."

| What was proven | Result |
|---|---|
| All 5 skills route correctly and execute against real files | 5/5 success criteria VERIFIED |
| Proven twice — on the dev working copy **and** on the packaged tarball | local-dist (plans 19-01..05/08) + tarball replay (19-06) |
| The one test no other test covers — the two-session migrate handoff across a Claude Code restart | UAT-02, exercised; state file survives the restart, Session 2 resumes without re-doing work |
| Durable evidence captured, not just "looked fine" | 15 transcripts + structured index; status `passed`; independent verifier verdict **VERIFIED** |
| Honesty proof that the *tarball* binary (not the dev copy) actually served the calls | 6/6 transcripts carry a live process-identity witness |

**Review:** `[X] AFFIRMED · [ ] REWRITE · [ ] UNCERTAIN`

---

## 2. Why this approach?

**At a high level:** Every major design choice in this phase resolved the same tension — UAT could be *fast-but-fake* or *thorough-but-risky* — by picking the option that produced the most trustworthy evidence while refusing to let the test itself become the kind of accident the toolkit exists to prevent. The phase tested the things that genuinely had no other coverage, and deliberately did **not** re-test things already covered or things that couldn't be tested safely.

The filter, decision by decision (what got rejected and why):

| Decision | Rejected alternative | Why the chosen path |
|---|---|---|
| Test the **skill's branches**, not the copy engine | Re-test the continuation-token loop | The token engine is already covered by automated Vitest tests. What had *zero* coverage was the skill's session-detection logic and the state handoff across a restart. Test where the risk actually is. |
| **Synthetic** disposable fixtures for cleanup | Run cleanup against real stale folders on your machine | The cleanup skill's whole claim is "we never delete things you didn't confirm." Testing that against real assets would reintroduce the exact destructive risk the toolkit was built to eliminate. The safety test must not become an unsafe event. |
| **Hybrid runtime** — iterate on dev copy, *gate* on tarball | dev-copy-only (misses packaging bugs) or tarball-only (slow per fix) | Fast iteration when defects surface, plus a final pass on the exact published shape. The roadmap itself demanded "UAT runs against the same tarball that v3.0.1 will publish." |
| **Manual** UAT, human judges the dialogue | Build an automated assertion harness | The skills are interactive — confirmation prompts, traffic-light reports, yes/no/skip dialogues. A human reading the dialogue *is* the correct instrument; an assertion harness for v3.0.1 patch scope is overhead, not signal. |
| **Process-identity witness** as the honesty proof | Trust `claude mcp list` / the version string | The dev copy and the tarball are byte-identical `3.0.0` — no config read or version string can prove *which one* served a call. Only a live snapshot of the running process can. This caught a real false-pass risk during review. |

**Review:** `[X] AFFIRMED · [ ] REWRITE · [ ] UNCERTAIN`

---

## 3. What would break?

**At a high level:** The phase found zero product defects — but "passed" is a point-in-time photograph of manually-run skills, and there are specific things it deliberately did *not* prove. The one most likely to bite at release: every test session loaded the plugin the *maintainer's* way (`--plugin-dir`), so "it works" is proven for how **you** load it, not yet for how a **stranger** installs it. That end-user path is Phase 20's job, and it's the real exposure between here and shipping.

**Consciously-accepted gaps (named in the plan as deferred — these are decisions, not oversights):**

- **End-user install path is unproven (H-4).** UAT loaded the plugin ad-hoc; the npx / bundled-config path a new user hits is validated in Phase 20. *This is the highest-leverage open item before release.*
- **Crash-resume mid-migration was never tested (D-02).** Killing Claude Code mid-copy is too race-prone to test reliably by hand; it's deferred to a deterministic automated test in v3.1.0.
- **Multi-project batch migration was never tested (D-03).** The documented happy path is one project; batching is out of scope for a patch release.
- **The tarball migrate replay was happy-path only (Run 1).** Idempotency and missing-state-file recovery were proven on the dev copy, not re-run on the tarball — defensible because those branches are on-disk reads that don't depend on which binary is running, so the dev-copy proof carries over.
- **Cleanup only ever sees file-references, not whole directories.** The scan tool emits file-level matches today; the skill's directory-candidate language is forward-looking spec that isn't exercised yet. Not a defect — a known boundary.
- **One decode edge defect persists (999.7).** A path-hash with a special character at the trailing edge fails to decode. Confirmed zero impact on your actual environment; deferred to v3.1.0.

**The structural fragility (what could silently drift):** Because this is manual UAT with no automated assertion harness, nothing *re-runs* on its own. If a skill file or an MCP tool changes after today, these transcripts won't catch the regression — they're a snapshot, not a guard. The protection against that is the Phase 18 tarball-shape test (which *is* wired into CI) plus re-running the relevant UAT when a skill changes.

**Review:** `[X] AFFIRMED · [ ] REWRITE · [ ] UNCERTAIN`

---

## 4. What did I learn?

**At a high level:** The durable lesson is an evidence-integrity one: when you're verifying that a *new build* actually ran, and that build is indistinguishable from the old one by configuration, you cannot trust what the config *says* — you have to catch the live process in the act. That pattern, plus a hard fact about how Claude Code binds to its tools, is what carries forward to every future "did the thing we shipped actually run?" validation.

**Generalizable patterns (pull these forward):**

- **The byte-identical-artifact honesty trap.** When two builds are interchangeable on disk, no config/version read proves which one did the work. The honest proof is a live process-identity witness + a launch timestamp that post-dates the swap. Reusable for any runtime-swap validation.
- **MCP connections pin at session start — there is no hot-reload.** Swapping the registration mid-session is a no-op; only a fresh relaunch repoints the running session. This was an assumption coming in; it's now a confirmed, load-bearing fact.
- **Don't let the safety test become an unsafe event.** When the tool under test can delete, the fixtures must be synthetic and disposable — never real assets.
- **Evidence has to be machine-routable.** A structured status index (not freeform narrative) is what lets the next workflow step route correctly; transcripts hang off it for human depth.

**Where the first pass was confidently wrong (flagged honestly):**

- **The cleanup fixture was mis-modeled.** The plan assumed the scan tool emits *directory* candidates; it actually emits *file-references*. Caught and reframed during execution (Correction 1) — the test was rebuilt to match the real code path.
- **`claude mcp list` was nearly accepted as runtime proof.** Adversarial review caught that it reads on-disk config, not the live binding — the same false-pass that had previously mis-graded a result. That catch is what forced the process-identity witness into the protocol.

**Phase-specific facts (NOT generalizable — Windows/env notes, parked here so they're not mistaken for patterns):** `jq` is absent in this Git Bash env (used `python`/`md5sum` instead); `cygpath` is needed to resolve the temp dir; Windows reaps loose `%TEMP%` files across session gaps; the `claude mcp add` path must be native `C:/…` form, not the MSYS `/c/…` form.

**Review:** `[X] AFFIRMED · [ ] REWRITE · [ ] UNCERTAIN`

---

## Overall Sign-Off

- [X] **COMPREHENSION CONFIRMED** — I understand this, I can defend what it did and why at my layer, and I'd catch a material deviation if one were proposed.
- [ ] **COMPREHENSION GAP** — One or more sections marked REWRITE or UNCERTAIN above. Re-draft and re-review before closure.

**Reviewer notes / flags for follow-up:**

None — clean affirmation across all four sections. Reviewer (Robert LaSalle) confirmed comprehension at the executive layer; §3's H-4 end-user-install exposure is acknowledged and carried into Phase 20 as the highest-leverage open item before release.
