---
work_unit: 20-release-pipeline-validation
drafted: 2026-06-29
drafted_by: Claude
reviewer: Robert LaSalle
status: AFFIRMED
affirmed: 2026-06-29
---

# Phase 20: Release Pipeline Validation — Comprehension Artifact

> **What this is:** A closure-gate review, not a code review. Phase 20 is finished and verified; this artifact exists so the person with authority to close it — and to close the v3.0.1 milestone behind it — can name, on paper, what it did and why, at the layer they actually defend. Your role here is *reviewer*, not author. You mark each section; I never mark it for you.
>
> **Review states:**
> - `AFFIRMED` — I understand this and can defend it at my layer
> - `REWRITE` — the content may be right but the framing misses the point; say it differently
> - `UNCERTAIN` — honestly uncertain; flag for follow-up
>
> **Layer calibration:** Read the `**At a high level:**` sentence first. If you can defend it in your own words, affirm — you do **not** have to drill the tables underneath; they're evidence if you want to challenge, not a reading requirement. Going deeper is not a better gate, just a slower one. The only failure is affirming something you couldn't restate under challenge. `UNCERTAIN` with a note is a valid place to land.

---

## 1. What is this?

**At a high level:** Phase 20 fired the two pieces of release automation for the first time ever and proved the toolkit actually reaches a stranger's machine in working order — and the act of proving it caught a real defect that would otherwise have shipped silently and permanently. Up to this point both workflows (the one that tests every change across three operating systems, and the one that publishes the packages to npm) were structurally correct on paper but had never once run end-to-end. v3.0.0 was published *by hand*; this is the first time the automated pipeline carried a release the whole way.

The worry it retires: *"we have two automation workflows that have never actually run — the first real attempt could fail to authenticate, fail on one platform, or publish a broken package, and because a published version can never be edited or replaced, we'd discover the breakage only after it was irreversibly live."*

| What was proven | Result |
|---|---|
| Both GitHub workflows ran end-to-end for the first time | CI green on Windows + macOS + Linux; release workflow published both packages |
| Published with **provenance** — npm's cryptographic record of which repo and which workflow built the package | SLSA-v1 attestation present on both `@localground/mcp` and `@localground/cli` |
| The pipeline caught a real, already-published defect | v3.0.1 binaries misreported their version as `3.0.0`; fixed-forward and re-shipped clean as **v3.0.2** |
| A stranger's clean machine can install and run it | `npx -y @localground/cli@3.0.2 detect` → exit 0, real output (17 projects, 26 path-hashes) |
| The npm package pages show real docs, not the empty placeholder | per-package READMEs render on both npmjs.com pages |
| Independent close gates | gsd-verifier **PASS** 5/5 machine truths; code-review **0 critical / 0 high** |

**Review:** `[X] AFFIRMED · [ ] REWRITE · [ ] UNCERTAIN`

---

## 2. Why this approach?

**At a high level:** Every significant choice in this phase optimized for one thing — making the single irreversible moment (the first permanent npm publish) as guarded and as retryable-up-to-that-line as possible — because a bad publish can never be undone, while a failed test or a rejected login attempt costs nothing and can be retried freely.

The filter, decision by decision (what got rejected and why):

| Decision | Rejected alternative | Why the chosen path |
|---|---|---|
| **One small step at a time**, tag the exact commit only after it's proven green | Big-bang: bump + tag + push all at once | Big-bang collapses four separate first-times — first push, first CI run, first passwordless publish, first permanent version — into a single failure surface where you can't tell which one broke. Incremental keeps each first-time isolated and retryable. |
| **Passwordless publish (OIDC) as primary; a stored-token path written down as an unused Plan B** | Store a long-lived npm token as a repo secret | Write-enabled npm tokens now expire in ≤90 days — an expiring secret is a recurring maintenance trap for a non-developer maintainer. **The release ran pure passwordless start to finish — no token was ever created or stored; the token path stayed a paper contingency.** A failed passwordless attempt publishes *nothing* and is freely retryable. |
| **Dry-run BOTH packages before publishing EITHER** | Publish them one after another | The two publishes are independent, non-reversible transactions — npm has no "publish both or neither." If the first succeeds and the second fails, you're stranded with a half-released version you can't repair. The dual dry-run shrinks that window to near-zero. |
| **Ship no auto-start config file** (`.mcp.json`) | Bundle one so the server auto-registers | It would reverse a Phase 19 decision, silently launch a competing server when the plugin loads, and inject brand-new product code into a phase whose only job is *validation*. Out of scope by design. |
| **Fix forward to 3.0.2** when the defect surfaced | Unpublish or overwrite 3.0.1 | Published npm versions are immutable — you cannot replace `3.0.1` or republish that number. Fixing forward to a new version is the *only* correct recovery, not a workaround. |

**Review:** `[X] AFFIRMED · [ ] REWRITE · [ ] UNCERTAIN`

---

## 3. What would break?

**At a high level:** The phase found zero blocking gaps and actually *hardened* the pipeline on its way out — but it leaves a short list of consciously-accepted risks, and the most pointed is that the highest-privilege job in the whole repo (the one holding the keys to publish to npm) trusts outside automation referenced by a movable label rather than a locked-down exact version.

**Consciously-accepted gaps (named in the review as deferred — these are decisions, not oversights):**

- **The publish job trusts third-party actions by movable label, not locked version (MD-01).** The release workflow pulls in two outside building-blocks (`actions/checkout`, `actions/setup-node`) by their major-version label — a label the owner can quietly repoint at new code. Because this job can mint a publish credential, a compromise of either upstream would run attacker code in the most valuable job in the repo. The same softness applies to the `npm@^11.5.1` upgrade step (a floating range pulls whatever the registry serves at run time). *Posture improvement, not a live hole — the upstreams are trusted today.* → v3.1.0.
- **The MCP server's `--version` is a hand-rolled check, not a real argument parser (MD-02).** It matches the exact word `--version`; a malformed variant (`--version=foo`, `--Version`) would silently boot the server instead of printing a version. Cosmetic-grade. → v3.1.0.
- **The seed marker's version is still a hardcoded literal (`3.0.2`).** This is the *exact same drift class* the phase just fixed for the `--version` strings — a number that must match the release but lives as a copy that the next version bump won't touch. Correct today; deferred to v3.1.0 to drift-proof the same way the binaries now are.
- **3.0.1 was never deprecated on npm.** Your sign-in security key (passkey) can't satisfy the one-time-code the deprecate command demands, so it was intentionally skipped. Low-impact: npm's `latest` correctly points at 3.0.2, so any normal install gets the good version — only someone *explicitly pinning* `3.0.1` would land on the version-misreporting binaries.

**The structural fragility (what could silently drift):** The new safety gate that caught the defect — a check that the built binary's reported version *equals* the manifest version — guards only the two `--version` strings. It does not sweep every version literal in the codebase, which is why `seed.ts` above is still a live drift candidate. And the two final web-visual confirmations (the provenance badge and the README render on npmjs.com) were machine-corroborated but ultimately *human-eye* confirmed by you — there is no automated check that the npm pages keep rendering correctly over time.

**Review:** `[X] AFFIRMED · [ ] REWRITE · [ ] UNCERTAIN`

---

## 4. What did I learn?

**At a high level:** The durable lesson is that a release pipeline's real job is not to *publish* — it's to *catch what you can't see by hand* — and a validation phase succeeds precisely when it surfaces a real defect before that defect becomes permanent. This phase earned that lesson the hard way twice: once fighting the publish-authentication floor, and once on a version-drift defect that had already shipped.

**Generalizable patterns (pull these forward):**

- **A green check is only as trustworthy as what it actually asserts.** The original safety gate confirmed the version output *looked like a version* (right shape) — not that it *was the right version*. A shape-check waves through correctly-formatted garbage. The fix asserts the actual value equals the expected one. Reusable everywhere: verify the value, not its pattern.
- **The "bump-the-manifest-doesn't-touch-the-code" trap.** Updating the version number in the package files does nothing to a version number *hardcoded inside the source*. Any value that must equal the version but lives as a hand-typed copy will silently drift apart. The cure is to *derive* the value from the single source of truth, never duplicate it — which is exactly what the fix did for the binaries.
- **A documented assumption is still an assumption until the machine proves it.** The plan stated as fact that the chosen runtime ships a new-enough publisher tool for passwordless publishing. It does not — it ships an older one. That single unverified "fact" cost four failed publish attempts. A cited source does not make an assumption true on *this* runner.
- **Guard the one moment you can't undo with cheap, repeatable pre-checks.** Everything before the irreversible publish — the dry-runs, confirming the version is absent from the registry, verifying the tag points at the right commit — is free to retry. Stack those guards densely around the single irreversible line.

**Where the first pass was confidently wrong (flagged honestly):**

- **The publish-authentication floor.** A locked decision asserted the runtime "ships a publisher tool new enough for passwordless publishing." It was false — the runtime bundles an older publisher that has *no* passwordless support at all. It took four release-workflow iterations to confirm the true cause (two attempts failed on a placeholder login token, one failed with no login at all, and only explicitly upgrading the publisher tool on the runner finally worked). The root cause was real and not obvious from the docs.
- **The 3.0.1 publish itself.** We shipped a permanent version whose binaries misreported their own version number, and the safety gate waved it through. The pipeline's value was proven *by its first-pass failure to catch it* — followed immediately by the hardening that guarantees the whole class of defect can't recur.

**Phase-specific facts (NOT generalizable — parked here so they're not mistaken for patterns):** the first CI red-run was a build-step collision (a type-checking step overwriting the bundled output) masked locally by incremental build caching, fixed by making that step non-emitting; the Git-Bash shell mangles colons in the `tag:path` syntax, so tag-content verification used lower-level git plumbing instead; the passkey/WebAuthn sign-in can't produce the one-time code the npm deprecate command requires.

**Review:** `[X] AFFIRMED · [ ] REWRITE · [ ] UNCERTAIN`

---

## Overall Sign-Off

- [X] **COMPREHENSION CONFIRMED** — I understand this, I can defend what it did and why at my layer, and I'd catch a material deviation if one were proposed.
- [ ] **COMPREHENSION GAP** — One or more sections marked REWRITE or UNCERTAIN above. Re-draft and re-review before closure.

**Reviewer notes / flags for follow-up:**

Clean affirmation across all four sections after one REWRITE cycle. Reviewer (Robert LaSalle) marked §2 UNCERTAIN on first pass — the draft's "stored token only as documented fallback" wording implied a stored npm token existed. Verified against evidence: `gh secret list` empty, release.yml carries only `id-token: write` (the passwordless-publish mechanism, not a stored credential) and bare `npm publish --provenance`, and v3.0.0 was published manually via the maintainer's interactive `npm login`. No token was ever created or stored — the token path stayed a paper Plan B that was never invoked. §2 row reworded to remove the implication; §2 re-marked AFFIRMED. §3's deferred items (MD-01 SHA-pinning, MD-02 arg-parser, seed.ts toolkitVersion drift-proofing, 3.0.1 deprecation) are acknowledged and carried to the v3.1.0 backlog.
