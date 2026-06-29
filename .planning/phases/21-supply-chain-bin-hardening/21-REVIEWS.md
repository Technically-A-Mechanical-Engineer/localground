# Phase 21 — Cross-Review Feedback (Pre-Execution Stress Test)

**Produced:** 2026-06-29
**Source:** Adversarial multi-lens stress test (4 reviewers + adjudicator) run on the verified plans before execution.
**Adjudicated decision:** **GO_WITH_FIXES** — no replanning/re-scoping needed; every item below is a targeted edit to acceptance criteria or example text. The decisions (D-01..D-14) remain locked and correct; the defects are in how the *plans translate them into executable gates*.

**Reviewer coverage:** 4/4 returned. fail-closed:21-01 (Opus), preservation:21-01 (Opus), cli06-edges:21-02 (Opus), cross-model lane (Claude Sonnet 4.6 — diverse tier/agent, **not** a non-Claude vendor). 17 raw findings → 5 real (2 BLOCKER, 3 WARNING), 7 dismissed.

**Governing theme:** The executable gates in 21-01 certify SHAPE, not VALUE — the precise failure mode this phase exists to prevent (the v3.0.1 lesson). Both BLOCKERs were verified by reproduction.

---

## MUST-FIX

### BLOCKER 1 — D-06 floor-assert does not force a correct comparison (21-01 Task 2)
**Source:** fail-closed:21-01 + cross-model lane (both, independently).

**Issue:** The acceptance criterion (PLAN:225) only requires reading the live value and emitting `::error::`/`exit 1`; the automated gate (PLAN:220) greps for `::error::` only and never executes a comparison. The "comparison mechanics are your discretion" grant (PLAN:215) lets an executor ship a lexical/string compare. Verified by reproduction: bash `[ "22.9.0" \< "22.14.0" ]` returns FALSE (sub-floor Node 22.9.0 wrongly treated as ≥ floor → would publish), and `[ "11.18.0" \< "11.5.1" ]` returns TRUE (in-floor npm wrongly fails). The example's first branch is also dead/broken: it passes `NPM_VERSION` as argv[1] so `process.env.NPM_VERSION` is undefined, `semver.gte` throws, `2>/dev/null` swallows it — and no `semver` dependency exists in root or `packages/mcp/package.json`, so even a corrected env-passing form throws `Cannot find module 'semver'`. The release would "work" only by accident via the bash fallback, while teaching the trap pattern.

**Remediation (verbatim):** Edit 21-01 Task 2: (a) DELETE the `require('semver')` branch from the D-06 example and lead with the numeric field-split (already correct) or a `sort -V` min-check as the canonical idiom; (b) add an acceptance criterion that the comparison is numeric/semver-correct, verified by EXECUTION not grep — the executor must run and paste output proving exit 1 for {Node 22.9.0, npm 11.4.0} and exit 0 for {Node 22.20.0, npm 11.18.0}, plus the lexical-rejection case (Node 22.9.0 FAILS, Node 22.100.0 PASSES); (c) explicitly forbid `[ "$V" \< "$FLOOR" ]`, the `<`/`>` string operators, and naive `==` on dotted strings.

### BLOCKER 2 — D-02 pinact gate not forced fail-closed; verifier tool unpinned (21-01 Task 1)
**Source:** fail-closed:21-01 + cross-model lane (both, independently).

**Issue:** The only binding checks are presence of `pinact run --verify --check` (PLAN:160) and absence of `@v4`/zizmor. Nothing forbids neutering the gate while keeping the literal string: a trailing `|| true`, `continue-on-error: true`, `set +e`, or a false `if:` on push/PR all pass the grep and ship a gate that never fails the build — recreating v3.0.1's shape-only class exactly. Separately, the example fetches the verifier itself via `go install ...pinact@latest` (PLAN:150) — an unpinned floating ref controlling the tool that is supposed to detect unpinned refs, self-contradictory with D-01/D-02; D-03's clause "any install method is fine" explicitly permits it.

**Remediation (verbatim):** Edit 21-01 Task 1 acceptance criteria: (a) the pinact step has NO `continue-on-error: true`; (b) its `run:` block does not append `|| true` / `|| :` / `; true` and is not preceded by `set +e`; (c) the step has no `if:` that skips it on push/PR; (d) prove fail-closed by running pinact against a deliberately-broken pin (flip one SHA hex digit) in a scratch copy and pasting the non-zero exit. Also pin the pinact install to an exact release tag (e.g. `pinact@v4.x.y` — look up current stable v4) instead of `@latest`, and add an acceptance criterion forbidding `@latest` for the verifier tool.

---

## SHOULD-FIX

### WARNING 1 — D-05 Node floor satisfiable while floating `22.x` survives (21-01 Task 2)
**Source:** preservation:21-01.

**Issue:** The automated gate uses `grep -q "22.14.0"` (positive only, no negative for the old value) — unlike the npm pin which has both `grep -q "npm@11.18.0"` AND `! grep -q "npm@^11.5.1"`. Reproduced: a release.yml keeping `node-version: '22.x'` with a comment containing `22.14.0` passes `grep -q "22.14.0"`. The D-06 floor-assert does NOT backstop this because `22.x` resolves to current Node 22 (≥ 22.14.0 today), so the floating-ref defect D-05 forbids ships silently.

**Remediation (verbatim):** Edit 21-01 Task 2 automated verify to mirror the npm belt-and-suspenders: add `! grep -q "node-version: '22.x'" .github/workflows/release.yml` AND tighten the positive to anchor the key: `grep -q "node-version: '22.14.0'" .github/workflows/release.yml`. Add the matching negative acceptance criterion.

### WARNING 2 — `--provenance` preservation gate weaker than its prose (21-01 Task 2)
**Source:** preservation:21-01.

**Issue:** The automated chain uses `grep -c -- "--provenance"` (PLAN:220), which is shell-truthy for ANY nonzero count. Reproduced: a file with only 2 provenance lines passes the chain link (count=2, exit 0). Since the two real publish lines (release.yml:59,62) are adjacent to the npm/Node lines Task 2 edits, accidental removal during that edit would not be caught by the automated PASS an autonomous executor relies on. The "at least 4" threshold lives only in prose (PLAN:227).

**Remediation (verbatim):** Replace the chain link with a hard threshold: `[ "$(grep -c -- "--provenance" .github/workflows/release.yml)" -ge 4 ]`. Makes the executable gate enforce the same "at least 4" the prose states.

### WARNING 3 — hung `--Version` test child reaping not in acceptance criteria (21-02 Task 2)
**Source:** cli06-edges:21-02.

**Issue:** Reaping the deliberately-hung `--Version`/`--VERSION` child is required by Task 2's `<action>` (PLAN:170) and `<done>` (PLAN:192) but ABSENT from its `<acceptance_criteria>` (PLAN:185-191). The `afterEach` reaper (smoke.test.ts:99-110) only iterates the tracked `children[]` array, and the existing helpers `spawnServer()`/`trackedSpawnServer()` (smoke.test.ts:17-21,93-97) hardcode `[DIST_PATH]` with no flag arg — so the executor must write a NEW spawn for the version flags. A fresh untracked `spawn(process.execPath, [DIST_PATH, '--Version'])` that blocks on the stdio transport satisfies all five listed acceptance criteria yet leaks a hung node process surviving afterEach. This passes the gate and ships the defect.

**Remediation (verbatim):** Add a sixth acceptance criterion to 21-02 Task 2: "The fall-through (`--Version`/`--VERSION`) child is pushed into the tracked `children[]` array (or explicitly killed in afterEach) — assert no leaked process survives." Optionally direct the executor to parameterize `spawnServer(args: string[] = [])` and route ALL version-flag spawns through `trackedSpawnServer` so tracking is automatic. Also tighten AC #2 to require the positive handshake proof and drop the weaker bounded-window alternative (the window variant is the most likely concrete leak).

---

## DISMISSED (do not re-litigate — adjudicated as not-blocking)

1. **D-09 "no stored npm token" has zero catchability** — aspirational-only; nothing in the plan instructs adding a token and pin/floor edits don't introduce auth. survives_execution=false. Optionally fold `! grep -qiE 'NODE_AUTH_TOKEN|NPM_TOKEN'` into the D-09 verify only if already editing that block.
2. **D-10 single-job preservation has no automated check** — NIT; the "Do NOT split" instruction (PLAN:217) is unambiguous and a job split is a deliberate refactor, not an accidental side-effect.
3. **D-08 "visible comment documenting accepted gaps" unchecked by verify** — NIT; the Dependabot schema itself is complete and schema-valid, so the file won't be ignored. Optional one-line grep.
4. **setup-node v4→v6 silent behavioral change** — locked by CONTEXT D-01 ("incidental to pinning; keep Node 20.x matrix; v6.4.0 supports it"). "Confirm green CI post-merge" is a closure note, not a pre-execution defect.
5. **pinact `--verify` needs GITHUB_TOKEN restricted on forks/Dependabot-PR** — solo repo, no external-contributor PRs; `github.token` injection (PLAN:153) is correct for same-repo push/PR. Documentation-only, contingent on a future trigger.
6. **`--version=anything` not exercised by verify-tarball.mjs** — NIT; covered by smoke.test.ts (all four forms tested against dist/); only the bare `--version` tarball contract is the published contract by design.
7. **D-06 example's dead npm-comparison branch** — real but subsumed by BLOCKER 1's remediation (delete the broken semver branch).

---

## RECOMMENDED NEXT (adjudicator, verbatim)

> Write the five must_fix items into `.planning/phases/21-supply-chain-bin-hardening/21-REVIEWS.md`, then run `/gsd-plan-phase 21 --reviews` to fold them into `21-01-PLAN.md` (Task 1 + Task 2 acceptance criteria and the D-06 example) and `21-02-PLAN.md` (Task 2 AC). All five are targeted criteria/example edits — no re-discussion or re-scoping needed. After replanning, execute via `/gsd-execute-phase 21`.

---

*Phase: 21-supply-chain-bin-hardening*
*Stress test: 4 reviewers + adjudicator, 2026-06-29; cross-model lane was Claude Sonnet 4.6 (cross-tier, not cross-vendor).*
