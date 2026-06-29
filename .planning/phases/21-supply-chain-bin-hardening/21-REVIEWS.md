# Phase 21 — Cross-Review Feedback (Pre-Execution Stress Test)

**Produced:** 2026-06-29
**Source:** Adversarial multi-lens stress test (4 reviewers + adjudicator) run on the verified plans before execution.
**Adjudicated decision:** **GO_WITH_FIXES** — no replanning/re-scoping needed; every item below is a targeted edit to acceptance criteria or example text. The decisions (D-01..D-14) remain locked and correct; the defects are in how the *plans translate them into executable gates*.

**Reviewer coverage:** 4/4 returned. fail-closed:21-01 (Opus), preservation:21-01 (Opus), cli06-edges:21-02 (Opus), cross-model lane (Claude Sonnet 4.6 — diverse tier/agent, **not** a non-Claude vendor). 17 raw findings → 5 real (2 BLOCKER, 3 WARNING), 7 dismissed.

**Governing theme:** The executable gates in 21-01 certify SHAPE, not VALUE — the precise failure mode this phase exists to prevent (the v3.0.1 lesson). Both BLOCKERs were verified by reproduction.

**Cross-vendor confirmation (Codex / OpenAI, codex-cli 0.130.0, 2026-06-29):** A genuine non-Claude review independently re-derived 4 of the 5 findings in its own pass, then CONFIRMED all 5 (reproducing the lexical-vs-numeric comparison, the `--provenance` count=2, the floating-ref grep, and the missing `semver` module). It surfaced **2 additional defects the all-Claude pipeline AND the Claude stress test both missed** — a CI-matrix portability BLOCKER (now **BLOCKER 3**) and an over-broad long-form match WARNING (now **WARNING 4**). It independently verified the action SHAs are correct (checkout v7.0.0, setup-node v6.4.0, both compatible with Node 20.x + 22.14.0) and that pinact's current latest is **v4.1.0**. Codex verdict: GO_WITH_FIXES, HIGH confidence. Full review verbatim at end of this file.

**Consolidated tally: 7 findings — 3 BLOCKER, 4 WARNING.**

---

## MUST-FIX

### BLOCKER 1 — D-06 floor-assert does not force a correct comparison (21-01 Task 2)
**Source:** fail-closed:21-01 + cross-model lane (both, independently).

**Issue:** The acceptance criterion (PLAN:225) only requires reading the live value and emitting `::error::`/`exit 1`; the automated gate (PLAN:220) greps for `::error::` only and never executes a comparison. The "comparison mechanics are your discretion" grant (PLAN:215) lets an executor ship a lexical/string compare. Verified by reproduction: bash `[ "22.9.0" \< "22.14.0" ]` returns FALSE (sub-floor Node 22.9.0 wrongly treated as ≥ floor → would publish), and `[ "11.18.0" \< "11.5.1" ]` returns TRUE (in-floor npm wrongly fails). The example's first branch is also dead/broken: it passes `NPM_VERSION` as argv[1] so `process.env.NPM_VERSION` is undefined, `semver.gte` throws, `2>/dev/null` swallows it — and no `semver` dependency exists in root or `packages/mcp/package.json`, so even a corrected env-passing form throws `Cannot find module 'semver'`. The release would "work" only by accident via the bash fallback, while teaching the trap pattern.

**Remediation (verbatim):** Edit 21-01 Task 2: (a) DELETE the `require('semver')` branch from the D-06 example and lead with the numeric field-split (already correct) or a `sort -V` min-check as the canonical idiom; (b) add an acceptance criterion that the comparison is numeric/semver-correct, verified by EXECUTION not grep — the executor must run and paste output proving exit 1 for {Node 22.9.0, npm 11.4.0} and exit 0 for {Node 22.20.0, npm 11.18.0}, plus the lexical-rejection case (Node 22.9.0 FAILS, Node 22.100.0 PASSES); (c) explicitly forbid `[ "$V" \< "$FLOOR" ]`, the `<`/`>` string operators, and naive `==` on dotted strings.

### BLOCKER 2 — D-02 pinact gate not forced fail-closed; verifier tool unpinned (21-01 Task 1)
**Source:** fail-closed:21-01 + cross-model lane (both, independently).

**Issue:** The only binding checks are presence of `pinact run --verify --check` (PLAN:160) and absence of `@v4`/zizmor. Nothing forbids neutering the gate while keeping the literal string: a trailing `|| true`, `continue-on-error: true`, `set +e`, or a false `if:` on push/PR all pass the grep and ship a gate that never fails the build — recreating v3.0.1's shape-only class exactly. Separately, the example fetches the verifier itself via `go install ...pinact@latest` (PLAN:150) — an unpinned floating ref controlling the tool that is supposed to detect unpinned refs, self-contradictory with D-01/D-02; D-03's clause "any install method is fine" explicitly permits it.

**Remediation (verbatim):** Edit 21-01 Task 1 acceptance criteria: (a) the pinact step has NO `continue-on-error: true`; (b) its `run:` block does not append `|| true` / `|| :` / `; true` and is not preceded by `set +e`; (c) the step has no `if:` that skips it on push/PR; (d) prove fail-closed by running pinact against a deliberately-broken pin (flip one SHA hex digit) in a scratch copy and pasting the non-zero exit. Also pin the pinact install to an exact release tag (**`pinact@v4.1.0`** — current latest, independently verified by Codex 2026-06-29) instead of `@latest`, and add an acceptance criterion forbidding `@latest` for the verifier tool.

### BLOCKER 3 — pinact step is not portable across the CI matrix (21-01 Task 1) [NEW — Codex cross-vendor]
**Source:** Codex (OpenAI) independent Part 3 finding — missed by both the Claude planner+checker pipeline and the Claude stress test.

**Issue:** `ci.yml` runs a 3-OS matrix — windows-latest, macos-latest, ubuntu-latest (ci.yml:23). The planned pinact step (21-01 Task 1, ~PLAN:146) is POSIX-shaped with a Go-based install and NO `shell:` override. On the Windows leg the default Actions shell is PowerShell, where the quoted-path-plus-args command block is a parse error — Codex reproduced it locally: `The '--' operator works only on variables or on properties`. As specified, the gate would either error on the Windows/macOS legs (breaking CI) or silently fail to run the verification — a non-functional gate on 2 of 3 legs. This is the kind of cross-platform gotcha a different-vendor model with GitHub Actions knowledge caught and the Claude pipeline did not.

**Remediation:** Either (a) move pin verification into a dedicated `ubuntu-latest`-only job (cleanest — pin verification is OS-independent and only needs to run once per push), or (b) constrain the pinact step to the Ubuntu matrix leg via `if: runner.os == 'Linux'` with an explicit `shell: bash`. Do NOT run the POSIX/Go command block unmodified across the full matrix. Add an acceptance criterion that the pinact step runs in exactly one Ubuntu context and does NOT execute on the Windows/macOS legs.

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

### WARNING 4 — CLI-06 long-form match not guarded against over-broad near-misses (21-02 Task 2) [NEW — Codex cross-vendor]
**Source:** Codex (OpenAI) independent Part 1 finding.

**Issue:** The action text says the predicate should match the version forms "only," but the acceptance criteria only test `--Version`/`--VERSION` fall-through — they do not assert that near-misses like `--versions` or `--versioned` are NOT treated as version requests. An executor could implement a loose `startsWith('--version')` predicate that wrongly matches `--versions`/`--versioned` and still pass every listed AC.

**Remediation:** Add negative test cases to 21-02 Task 2 acceptance criteria: `--versions` and `--versioned` MUST fall through to normal startup (NOT be treated as version requests). The match must be exact for the bare `--version` / `-v` / `-V` forms and prefix-only for `--version=`. Pairs naturally with the existing `--version=` positive test.

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

**Updated after cross-vendor pass (2026-06-29):** now **7 findings — 3 BLOCKER, 4 WARNING**. BLOCKER 3 (CI-matrix portability) is a small *structural* change to 21-01 Task 1 (Ubuntu-only job or matrix-constrained step), not just a criteria edit — still no re-scoping or decision change. Same path: `/gsd-plan-phase 21 --reviews` to fold all 7 into 21-01/21-02, re-verify with the checker, then `/gsd-execute-phase 21`.

---

*Phase: 21-supply-chain-bin-hardening*
*Stress test: 4 reviewers + adjudicator, 2026-06-29; cross-model lane was Claude Sonnet 4.6 (cross-tier, not cross-vendor).*


---

## Codex Cross-Vendor Review (verbatim — Codex / OpenAI, codex-cli 0.130.0, 2026-06-29)

OVERALL VERDICT: GO_WITH_FIXES, confidence HIGH.

**Part 1**
My independent concern list:

| Severity | Concern | Evidence | Would survive plan gate? |
|---|---|---|---|
| BLOCKER | The pinact gate is presence-checked, not fail-closed. `|| true`, `continue-on-error: true`, or a skipped step can keep the literal while disabling the gate. The verifier is also installed as `@latest`. | [21-01-PLAN.md](C:/Users/rlasalle/Projects/localground/.planning/phases/21-supply-chain-bin-hardening/21-01-PLAN.md:150), [21-01-PLAN.md](C:/Users/rlasalle/Projects/localground/.planning/phases/21-supply-chain-bin-hardening/21-01-PLAN.md:160), [21-01-PLAN.md](C:/Users/rlasalle/Projects/localground/.planning/phases/21-supply-chain-bin-hardening/21-01-PLAN.md:166) | Yes. Grep passes. |
| BLOCKER | D-06 does not force a numeric/semver-correct comparison and the example starts with an undeclared `semver` dependency. | [21-01-PLAN.md](C:/Users/rlasalle/Projects/localground/.planning/phases/21-supply-chain-bin-hardening/21-01-PLAN.md:207), [21-01-PLAN.md](C:/Users/rlasalle/Projects/localground/.planning/phases/21-supply-chain-bin-hardening/21-01-PLAN.md:215), [21-01-PLAN.md](C:/Users/rlasalle/Projects/localground/.planning/phases/21-supply-chain-bin-hardening/21-01-PLAN.md:220) | Yes. Grep only checks `::error::`. |
| WARNING | `node-version: '22.x'` can remain while a comment/string contains `22.14.0`. | [21-01-PLAN.md](C:/Users/rlasalle/Projects/localground/.planning/phases/21-supply-chain-bin-hardening/21-01-PLAN.md:220), [21-01-PLAN.md](C:/Users/rlasalle/Projects/localground/.planning/phases/21-supply-chain-bin-hardening/21-01-PLAN.md:224) | Yes. Positive grep passes. |
| WARNING | `grep -c -- "--provenance"` is not an at-least-4 assertion. Any nonzero count passes. | [21-01-PLAN.md](C:/Users/rlasalle/Projects/localground/.planning/phases/21-supply-chain-bin-hardening/21-01-PLAN.md:220), [release.yml](C:/Users/rlasalle/Projects/localground/.github/workflows/release.yml:55) | Yes. Count 1 or 2 still exits 0. |
| WARNING | CLI-06 tests do not forbid over-broad long-form matching such as `--versions` / `--versioned`. The action text says “match only,” but AC only tests `--Version` / `--VERSION`. | [21-02-PLAN.md](C:/Users/rlasalle/Projects/localground/.planning/phases/21-supply-chain-bin-hardening/21-02-PLAN.md:124), [21-02-PLAN.md](C:/Users/rlasalle/Projects/localground/.planning/phases/21-supply-chain-bin-hardening/21-02-PLAN.md:146) | Yes, unless tests add negative cases. |

**Part 2**
1. **BLOCKER 1: CONFIRM.** Overlaps my Part 1 D-06 blocker.

Git Bash itself is broken in this sandbox, so I could not get a successful bash `[ ... \< ... ]` run. Real output:

```text
bash -lc 'printf "bash_works\n"'
0 [main] bash (...) C:\Users\rlasalle\AppData\Local\Programs\Git\usr\bin\bash.exe: *** fatal error - CreateFileMapping ..., Win32 error 5.  Terminating.
```

Equivalent lexical comparison behavior was reproduced:

```text
js_lex_22_9_lt_22_14=false
js_lex_11_18_lt_11_5=true
js_lex_22_100_lt_22_14=true
```

Numeric comparator behaved correctly:

```text
numeric_npm_11_4_exit=1
numeric_npm_11_18_exit=0
numeric_node_22_9_exit=1
numeric_node_22_100_exit=0
```

The `semver` branch is also bad in this repo:

```text
Cannot find module 'semver'
Require stack:
- C:\Users\rlasalle\Projects\localground\[eval]
```

2. **BLOCKER 2: CONFIRM.** Overlaps my Part 1 pinact blocker.

Reproduction that the literal can coexist with a neutered gate:

```text
literal_pinact_grep_pass=True
neutering_present=True
```

The `@latest` concern is real. The plan’s example installs `pinact@latest`; current pinact latest is `v4.1.0`, so the plan should pin that or another exact vetted release. Pinact docs also confirm `-check` / `-fix=false` is validation-only, and exit codes distinguish clean vs needs pinning vs verification errors.  ([github.com](https://github.com/suzuki-shunsuke/pinact/releases))

3. **WARNING 1: CONFIRM.** Overlaps my Part 1 Node-floor warning.

```text
positive_22_14_gate_pass=True
old_float_still_present=True
```

4. **WARNING 2: CONFIRM.** Overlaps my Part 1 provenance warning.

```text
provenance_count=2
grep_c_style_status=0_when_count_nonzero
```

The executable gate must be `[ "$(grep -c -- "--provenance" .github/workflows/release.yml)" -ge 4 ]`.

5. **WARNING 3: CONFIRM.** I did not include this in my top Part 1 list, but the repo evidence supports it. Current `trackedSpawnServer()` accepts no args and only tracks child processes created through that helper; a new raw spawn with `--Version` can satisfy the listed AC and leak. Evidence: [smoke.test.ts](C:/Users/rlasalle/Projects/localground/packages/mcp/test/smoke.test.ts:90), [smoke.test.ts](C:/Users/rlasalle/Projects/localground/packages/mcp/test/smoke.test.ts:99), [21-02-PLAN.md](C:/Users/rlasalle/Projects/localground/.planning/phases/21-supply-chain-bin-hardening/21-02-PLAN.md:185).

**Part 3**
Additional defect I found: **the planned pinact step is not portable in the current CI matrix.** `ci.yml` runs on Windows, macOS, and Ubuntu ([ci.yml](C:/Users/rlasalle/Projects/localground/.github/workflows/ci.yml:23)). The planned step is POSIX-shaped and has no `shell:` override ([21-01-PLAN.md](C:/Users/rlasalle/Projects/localground/.planning/phases/21-supply-chain-bin-hardening/21-01-PLAN.md:146)). On Windows Actions, the default shell is PowerShell, and a quoted path plus args is not command invocation syntax. Local reproduction:

```text
$cmd = (Get-Command node).Source; "$cmd" --version

Unexpected token 'version' in expression or statement.
The '--' operator works only on variables or on properties.
```

Fix it by making pin verification a separate `ubuntu-latest` CI job, or explicitly constrain that step to the Ubuntu matrix leg. Do not run this POSIX command block unmodified across the whole matrix.

Live sanity checks:

- The action SHAs appear correct. `actions/checkout` release `v7.0.0` points to commit `9c091bb...`, matching `9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0`; `actions/setup-node` release `v6.4.0` points to `48b55a0...`, matching `48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e`.    
- `setup-node@v6.4.0` supports exact and range `node-version` specs and its README shows v6 matrix use with Node 20/22/24, so Node 20.x CI and Node 22.14.0 publish are compatible. It does use `node24`, so self-hosted runners would need runner v2.327.1+, but GitHub-hosted `*-latest` is fine.  
- `ubuntu-latest` has Go available/cached, so a Go-based pinact install is realistic on Ubuntu. It is not realistic as written across the Windows matrix leg. 
- npm’s docs confirm trusted publishing requires npm CLI `11.5.1+` and Node `22.14.0+`; npm registry currently reports `npm@11.18.0` as latest.  
- Dependabot can update GitHub Actions pinned by commit and same-line version comments, so the planned `github-actions` ecosystem is directionally correct. 

Single most important fix before execution: make the pinact gate an actually executable, pinned, fail-closed gate: exact-pin pinact, run it in a shell/OS where the command is valid, forbid fail-open syntax, and prove a deliberately broken SHA exits nonzero.
