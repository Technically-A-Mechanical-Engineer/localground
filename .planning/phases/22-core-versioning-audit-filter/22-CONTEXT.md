# Phase 22: Core Versioning & Audit Filter - Context

**Gathered:** 2026-06-30
**Status:** Ready for planning
**Source:** Research-driven (discuss-phase skipped by design) + Codex adversarial cross-review, user-confirmed

<domain>
## Phase Boundary

Two pure-`@localground/core` fixes, batched because both land in the shared library so the CLI `audit`/`detect` and the MCP `audit`/`decode_path_hash` tools inherit them identically (zero per-consumer logic). No new feature surface (v3.1.0 is a hardening minor). The cross-cutting v3.0.1 lesson governs: **assert the VALUE, not the shape.**

- **BUILD-01** — eliminate the last hardcoded version literal (`toolkitVersion: '3.0.2'` at `packages/core/src/operations/seed.ts:139`) so the seed manifest can never drift from the consuming package's version; extend `scripts/verify-tarball.mjs` to assert the seed-path version *value*.
- **CORE-15** — audit auto-discovery must not surface home/drive/system roots while keeping marker-less plain-folder projects discoverable; lock both invariants with a regression test.

This phase clarifies HOW to implement the locked success criteria. The BUILD-01 A-vs-B mechanism (which the ROADMAP left to plan-phase) and the CORE-15 scope were both settled this session via phase research + a Codex cross-model stress-test (2026-06-30); the research overturned the ROADMAP's tentative "consumer-side define" steer with an empirical reproduction.

</domain>

<decisions>
## Implementation Decisions

### BUILD-01 — version injection mechanism
- **D-01:** **Mechanism = Option A (parameterize `seed()`).** Change the signature to `seed(projectPath: string, toolkitVersion: string)` at `packages/core/src/operations/seed.ts:48`; consume the param at `:139` (`toolkitVersion,` shorthand — removing the `'3.0.2'` literal). The two call sites pass their already-derived runtime version: mcp `packages/mcp/src/index.ts:294` passes `SERVER_VERSION` (derived `:19-21`); cli `packages/cli/src/index.ts:136` passes `VERSION` (derived `:15-17`). **NO build-config change.** Rationale: only mechanism with true per-consumer semantics. A `define` in a *consumer's* tsup config is proven impossible (core is inlined as a frozen string literal *before* mcp/cli bundle it via `noExternal` — empirically reproduced). A `define` in *core's own* config (Option B) bakes core's *private* version — correct only while all three versions stay lockstep. **Cross-model CONFIRMED (Codex, 2026-06-30); exactly 2 call sites verified, no superior third mechanism.**
- **D-02:** **Update the seed tests.** The 6 existing `seed(tmpDir)` calls in `packages/core/test/operations/seed.test.ts` become the 2-arg form, and add a **value-equality assertion** proving `manifest.toolkitVersion` === the version passed in (this is the unit-level guard that BUILD-01 actually fixed the drift).
- **D-03:** **Verification = extend `scripts/verify-tarball.mjs` to assert the seed-path version VALUE** (today it gates only the bin `--version`, ~`:203-213`). After the existing `--version` check, in the installed-tarball tmp dir, drive the package's seed path against a real git repo, read the written `.localground-seed-manifest.json`, and assert `manifest.toolkitVersion === expectedVersion` (the value already read from the tarball's `package.json` at ~`:163`). **Reuse the Windows-safe spawn discipline** — `resolveNpmCliJs()` + `[process.execPath, NPM_CLI_JS, ...]` (`:47-115`); for git use array args, never `shell:true`.

### CORE-15 — audit root filter
- **D-04:** **Disposition = the original symptom is already fixed; the regression-lock test is the mandatory deliverable.** `looksLikeProject` (added Phase 14-10, commit `6ac6d71`) already rejects `C:\`, `C:\Users\<thisuser>`, containers, and 1-below-root system dirs, and is already wired into both audit auto-discovery paths (`packages/cli/src/index.ts:513`, `packages/mcp/src/index.ts:721` via `.filter(looksLikeProject)`; user-supplied `--projects` are intentionally NOT filtered). Create `packages/core/test/environment/looksLikeProject.test.ts` (none exists) locking BOTH **root-rejection** AND the **D-01 plain-folder-discovery** invariant (SC-5). Use the real-fs + `os.homedir()`-aware pattern.
- **D-05:** **Preserve the plain-folder-discovery invariant (Phase 14 D-01) — binds every CORE-15 change.** `looksLikeProject` MUST NOT add a `.git`/`package.json` marker check; marker-less plain folders ≥2 below home/root stay discoverable. (REQUIREMENTS Out-of-Scope table + SC-4/SC-5.)
- **D-06:** **Scope = EXTENDED (path-shape-only tightening).** Tighten `looksLikeProject` to additionally reject: **(a)** direct children of the OS users-container — other-user home roots (`C:\Users\someoneelse` on win32; `/home/<x>`, `/Users/<x>` on posix), which SC-4's example `C:\Users\…` covers and which the predicate currently **ACCEPTS** (live-confirmed PROJECT, 2026-06-30); and **(b)** a path-shape **basename denylist** of system/cache dirs — at minimum `AppData` (the `…\AppData\Local` leak, the original "stale-reference noise" class). The tightening MUST remain **path-shape-only — NO marker check** (honors D-05). Each tightening is paired with a **same-depth legitimate-sibling test** proving a real project at the same depth still qualifies. Rationale: the Codex cross-model review (2026-06-30) **REFUTED** a test-only "Minimal" scope as under-delivering against SC-4 as written ("excludes … roots (e.g. `C:\Users\…`)").
- **D-07:** **Both fixes land in shared `@localground/core`** (`seed.ts` / `looksLikeProject.ts`) so the CLI and MCP surfaces inherit them with **zero per-consumer logic** (SC-5 + CORE-15 requirement text). Both audit surfaces already call `.filter(looksLikeProject)`, so the tightening propagates automatically.

### Claude's Discretion
- **verify-tarball seed invocation (D-03):** bin-driven (the cli `seed` command, which validates `path.isAbsolute` and calls `seed(projectPath)`) vs a small direct-import driver against the installed package — either satisfies SC-3 (RESEARCH assumption A2). Planner's call; the bin path more faithfully exercises the shipped artifact.
- **System-dir denylist membership beyond `AppData` (D-06):** whether to also reject `node_modules`, `.cache`, etc. — planner's call, provided each addition is path-shape-only and gets a paired same-depth sibling test.
- **Internal structure of the `looksLikeProject` tightening** (extra guard clauses vs a small helper), provided D-05/D-06 hold and the predicate stays pure (no I/O, no throw).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Authoritative implementation guide
- `.planning/phases/22-core-versioning-audit-filter/22-RESEARCH.md` — HIGH-confidence, empirically grounded. Contains the Option A/B layout with exact diffs, the CORE-15 reproduction truth table, and exact file paths/line numbers/current excerpts for every change. **Read this first.**

### Files changed by this phase
- `packages/core/src/operations/seed.ts` — signature `:48` + manifest `:139` (D-01).
- `packages/mcp/src/index.ts` — seed call site `:294` passes `SERVER_VERSION` (D-01); audit filter wiring `:721` (D-04 reference, unchanged).
- `packages/cli/src/index.ts` — seed call site `:136` passes `VERSION` (D-01); audit filter wiring `:513` (D-04 reference, unchanged).
- `packages/core/src/environment/looksLikeProject.ts` — path-shape tightening (D-06), preserving D-05.
- `packages/core/test/operations/seed.test.ts` — 2-arg calls + value-equality assertion (D-02).
- `packages/core/test/environment/looksLikeProject.test.ts` — **NEW** regression-lock test (D-04, D-05, D-06).
- `scripts/verify-tarball.mjs` — seed-path version-VALUE assertion (D-03).

### Contracts that MUST stay green
- `scripts/verify-tarball.mjs` bin `--version` path (~`:203-213`) — D-03 changes are additive; do not break the existing exact-string contract.
- The calibrated `looksLikeProject` 14-10 behavior — D-06 only *adds* rejections; the existing root-rejection + D-01 discovery must stay intact (D-05).
- The Phase-17 17/17 decode round-trips — unaffected by this phase, but must not regress.

### Requirements & success criteria
- `.planning/REQUIREMENTS.md` — BUILD-01, CORE-15, and the Out-of-Scope table (no marker-file detection, no tsup bump, no arg-parser).
- `.planning/ROADMAP.md` §"Phase 22" — the 5 success criteria + the BUILD-01/CORE-15 constraints.

### Milestone research (HIGH confidence, 2026-06-29; cross-model reviewed)
- `.planning/research/{SUMMARY,ARCHITECTURE,FEATURES,PITFALLS}.md` — milestone synthesis; corroborated against live code (the CORE-15 "already-handled" claim CONFIRMED + extended with this session's reproduction).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/verify-tarball.mjs:47-115` — the `resolveNpmCliJs()` + `run()` Windows-safe spawn helpers (the canonical `[process.execPath, NPM_CLI_JS, ...]` pattern). Reuse verbatim for D-03.
- `packages/core/test/operations/seed.test.ts:12-33` — the `initGitRepo` + `mkdtemp`/`afterEach rm` real-fs + git-init pattern. Copy for both the BUILD-01 value test and the CORE-15 predicate test.
- `packages/core/test/environment/classify.test.ts` / `decode.test.ts` — the real-fs `mkdtemp`/`afterEach` environment-test pattern (closest analog for `looksLikeProject.test.ts`).
- `packages/core/src/environment/looksLikeProject.ts:26-34` — the doc comment enumerates expected input→output pairs; they map 1:1 to test cases.

### Established Patterns
- **Result type** (`packages/core/src/types.ts:7-27`) — `seed()` already returns `Result<T,R>`; D-01's param is just consumed, no new branch, no throw.
- **Spawn discipline** — array args, never `execSync` string-concat, never `shell:true`; on Windows + Node 20+ spawn npm/git via `[process.execPath, <cli.js>, ...]`.
- **Build via tsup; `tsc --build:check` is the strict type gate over src+test.** No tsup bump (installed `^8.5.1`). Option A needs no ambient declaration (that was an Option-B-only concern).

### Integration Points
- Both audit surfaces already `.filter(looksLikeProject)` — the D-06 tightening propagates to CLI and MCP automatically (D-07).
- `SERVER_VERSION`/`VERSION` are already in scope at the two seed call sites — D-01 is a one-token change at each.

</code_context>

<specifics>
## Specific Ideas

- The user explicitly requested a **Codex adversarial cross-review** of the research findings and recommendations before locking — completed 2026-06-30 (codex-cli 0.130.0). Verdict: Claims 1–3 CONFIRMED-with-notes, Recommendation A (Option A) **CONFIRMED**, Recommendation B (Minimal CORE-15) **REFUTED** → drove the EXTENDED scope decision (D-06). Codex's only gap was a sandbox that blocked live Node; the orchestrator closed it by executing the `looksLikeProject` predicate directly — a **third independent confirmation** of the truth table (both residual leaks return PROJECT).
- Preferred posture: the minimal surface that **honestly** satisfies the locked success criteria — Option A (no build-config change, no new deps) + path-shape-only tightening (no marker check, honoring D-01/D-05).

</specifics>

<deferred>
## Deferred Ideas

- **CORE-16** (decoder trailing-edge `buildCandidates` fix) — Phase 23, not here. Out of scope.
- **CLI-05** (streaming refactor of `spawnTool`) — deferred to v3.2.0.
- **Posix-home leak when running on win32** (`/home/<x>`, `/Users/<x>` recognized as home only on posix) — if D-06's users-container rule is written cross-platform it is covered for free; otherwise it is a non-issue for the win32 target (only bites if a win32 box holds posix-style path-hashes — unlikely). Planner should prefer the cross-platform formulation but need not chase posix coverage as a hard requirement.

</deferred>

---

*Phase: 22-core-versioning-audit-filter*
*Context gathered: 2026-06-30 — research + Codex cross-review, user-confirmed (Option A + Extended)*
