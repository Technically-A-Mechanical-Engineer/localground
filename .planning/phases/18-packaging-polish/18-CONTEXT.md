# Phase 18: Packaging Polish - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Add `"files": ["dist"]` to `packages/mcp/package.json` and `packages/cli/package.json` so published npm tarballs ship only compiled output (`dist/index.js`, `dist/index.d.ts`, `dist/index.js.map`) plus the npm-mandatory `package.json` and `README.md`. Verify the new tarball shape via `npm pack --dry-run` and a clean-directory install smoke test.

Maps to v3.0.1 requirements **PKG-01** (declare `files: ["dist"]` in both published package.jsons) and **PKG-02** (verify exclusion of `src/`, `test/`, `tsconfig.json`, `tsup.config.ts`, `vitest.config.ts` via `npm pack --dry-run`). Sequenced before Phase 19 by design — Phase 19 UAT must run against the same tarball shape that Phase 20 will publish.

**Constraint from REQUIREMENTS.md:** SC-3 explicitly verifies that `README.md` and `package.json` remain present after the change (npm preserves both regardless of `files` config — confirms the cleanup did not over-strip). Per-package READMEs already exist on master (`packages/mcp/README.md`, `packages/cli/README.md`) from PR #11, supporting DOC-03 in Phase 20.

**Bundle invariant (carries from v3.0.0):** `@localground/core` is bundled into `mcp` and `cli` via `noExternal: ['@localground/core']` in each `tsup.config.ts`. Core is in `devDependencies` (not `dependencies`) per `feedback_monorepo_bundled_deps.md` — Phase 18 must not invert this. The tarball's `dist/index.js` already inlines core's source; no consumer-side `npm install @localground/core` is needed.

</domain>

<decisions>
## Implementation Decisions

### Verification surface

- **D-01: Tarball install smoke check is scripted, not manual.** A new npm script (e.g., `verify:tarball` at the root or per-package) runs the full pack-and-install loop: `npm pack` in each package → install the resulting `.tgz` into a clean temp directory via `npm install <path-to-tgz>` → execute the documented entry point (`localground-mcp` for mcp; `localground detect --json` for cli) → assert non-zero exit code = failure. Wired into `ci.yml` as a step after `tsup` build and before/after Vitest (planner picks position). Reasoning: SC-4 demands the check exists; a scripted artifact provides automated regression coverage for Phase 20 release pipeline and any future packaging changes. A one-shot manual command in the plan would satisfy SC-4 once but leave no guard.
- **D-02: Smoke check uses `os.tmpdir()` + `fs.mkdtemp` real-fs pattern, no shell mode.** Matches the load-bearing v3.0.0 testing convention (real-fs fixtures caught Windows reparse-point + OneDrive bugs). All `child_process` invocations use `spawnSync`/`spawn` with array args, never `execSync` with string concatenation, never `shell: true`. Cleanup via `afterEach` reaper or equivalent if implemented as a Vitest test; via try/finally + `fs.rm` if implemented as a standalone Node script.

### Build output composition

- **D-03: Source maps stay in the tarball.** Both `tsup.config.ts` files retain `sourcemap: true`, so `dist/index.js.map` ships with the published package. Reasoning: tools this size benefit more from end-user debug fidelity (stack traces map back to TypeScript) than from the few-KB tarball weight saved by stripping. No production-vs-dev build split is introduced.

### Scope boundary

- **D-04: `packages/core/package.json` is NOT modified.** Core is workspace-internal, bundled via `noExternal`, and never published to npm. Adding `files: ["dist"]` there is dead config — it would falsely signal "we publish core" when we don't. If core is ever promoted to a published package in a future milestone, that's the phase that adds `files`. Leave it untouched.
- **D-05: No `.npmignore` belt-and-suspenders.** `files` array is canonical in modern npm. Adding `.npmignore` alongside creates two sources of truth that can drift. Single mechanism per package.

### Claude's Discretion

The following are implementation details delegated to the planner / executor. Decisions made here for the planner's reference, not for re-litigation:

- **Smoke-check implementation form:** standalone Node script under `scripts/verify-tarball.mjs`, dedicated Vitest spec under `packages/mcp/test/pack-install.test.ts` and `packages/cli/test/pack-install.test.ts`, or a single shared helper that loops over both packages — planner's call. Suggested: standalone script for simplicity; tests pull in vitest infra that adds nothing here.
- **Where in `ci.yml` the smoke check sits:** after `tsup` build (so `dist/` exists to pack) and before the existing Vitest step (so a packaging regression fails fast before tests). Planner confirms exact step ordering when reading current `ci.yml`.
- **Smoke-check assertion depth:** at minimum, `localground-mcp --version` (or equivalent that exits 0 without launching the MCP server) and `localground detect --json` (which already returns structured output on success). No need to invoke real migration paths from the smoke check — that's Phase 19 UAT scope.
- **Commit granularity:** one commit for the two `package.json` edits, one for the smoke-check script + ci.yml wiring. Or one combined commit. Planner's call.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements lock
- `.planning/REQUIREMENTS.md` §"Packaging" — PKG-01 (declare `files: ["dist"]`) and PKG-02 (verify via `npm pack --dry-run` that source/test/config files are excluded)
- `.planning/ROADMAP.md` §"Phase 18: Packaging Polish" — phase goal, no upstream phase deps, 4 success criteria including SC-3 README preservation and SC-4 clean-install smoke check

### Project-level invariants
- `.planning/PROJECT.md` §"Key Decisions" — Bundle Option A (`noExternal` core in mcp/cli), real-fs test fixtures (no mocked fs), stderr-only logging in MCP server (CRIT-1), `--json` flag on every CLI command (stdout = JSON in JSON mode), no `shell: true` on spawn calls (CRIT-3/MOD-3)
- Memory `feedback_monorepo_bundled_deps.md` — `@localground/core` belongs in `devDependencies` because it's bundled via tsup `noExternal`. Phase 18 must preserve this.
- Memory `feedback_npm_package_readme.md` — per-package READMEs ship from `packages/<pkg>/README.md`, not the repo-root README. SC-3 verifies this still works after `files: ["dist"]`.

### Files modified by Phase 18
- `packages/mcp/package.json` — add `"files": ["dist"]` field
- `packages/cli/package.json` — add `"files": ["dist"]` field
- New: smoke-check script (location/name per planner's call — see Claude's Discretion)
- `.github/workflows/ci.yml` — add smoke-check step in the existing job (no new job)
- `package.json` (root) — add `verify:tarball` npm script if smoke check is invoked via root, or omit if invoked directly from the script's path

### Files referenced read-only (do not modify)
- `packages/mcp/tsup.config.ts` and `packages/cli/tsup.config.ts` — `sourcemap: true` confirmed, retained per D-03; both `noExternal: ['@localground/core']` retained per bundle invariant
- `packages/mcp/README.md` and `packages/cli/README.md` — exist from PR #11; SC-3 verifies they remain in the tarball
- `packages/core/package.json` — NOT modified per D-04
- Existing `tsconfig.test.json` (root) and per-package `vitest.config.ts` — Phase 16's strict tsc gate applies to any new test files added under `packages/*/test/`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`tsup` clean+build pipeline** (`packages/mcp/tsup.config.ts`, `packages/cli/tsup.config.ts`): both already have `clean: true` so `dist/` is rebuilt fresh on every `npm run build`. Smoke check can rely on a pre-step `npm run build -w @localground/mcp -w @localground/cli` to ensure `dist/` is current before packing.
- **Real-fs test fixture pattern** (`packages/core/test/environment/decode.test.ts:9-21`, `packages/core/test/integrity/placeholder.test.ts:9-16`): `mkdtemp` + `afterEach` `fs.rm`. If smoke check is implemented as a Vitest spec, this pattern carries over directly. If as a standalone script, the same `os.tmpdir()` + `fs.rm` discipline applies via try/finally.
- **`spawnTool`-style child-process discipline** (project-wide): `spawnSync`/`spawn` with array args, never `shell: true`. Smoke-check `npm pack` and `npm install <tgz>` invocations follow the same rule.
- **Phase 16 `afterEach` reaper pattern** (`packages/mcp/test/smoke.test.ts`, `packages/cli/test/smoke.test.ts`): if smoke check spawns the binary to verify it runs, the same reaper pattern (track child, kill in afterEach) applies — no new isolation infrastructure needed.

### Established Patterns
- **`Result<T, R>` narrowing**: not directly relevant — smoke check is process-level (exit codes), not core-API-level. But if any helper functions are added, they follow the Result pattern.
- **Stdout/stderr discipline**: smoke-check status messages go to stderr (or the planner's chosen logging channel). Stdout reserved for JSON-RPC in MCP and JSON-mode output in CLI. Smoke check verifying `localground detect --json` consumes stdout JSON; verifying `localground-mcp` does NOT consume stdout (would conflict with JSON-RPC framing).
- **Composite tsconfig + tsconfig.test.json**: any new test file under `packages/*/test/` is automatically covered by the strict `tsc --build` gate (Phase 16 / TEST-01). New standalone scripts under `scripts/` are NOT auto-covered — planner decides whether to extend the gate or rely on tsup's looser typing.

### Integration Points
- **`ci.yml` job structure**: existing 3-OS matrix at Node 20.x runs Build → Strict type check → Test in order (per PROJECT.md "Quality gates"). Phase 18 inserts smoke-check as an additional step within the same job. Does NOT add a new job (matches Phase 16's approach to ci.yml additions).
- **`release.yml` pipeline (Phase 20)**: pushes the same tarballs whose shape Phase 18 locks. Phase 18's smoke check is the regression guard that prevents a future commit from un-doing `files: ["dist"]` and silently re-bloating the published package.
- **`npm pack --dry-run` output format**: emits a file list to stdout. Phase 18 verification consumes this listing to assert presence/absence of specific paths. Planner chooses whether to parse the human format or use `npm pack --dry-run --json` for structured output.

</code_context>

<specifics>
## Specific Ideas

- "Targeted, not catch-all" carries from Phase 17's D-01 — Phase 18 follows the same discipline. `files: ["dist"]` is the smallest change that satisfies the documented requirement. No `.npmignore`, no per-file overrides, no production-vs-dev build split for source maps.
- The smoke check exists primarily as a Phase 20 regression guard. Phase 18's own verification is the `npm pack --dry-run` listing per PKG-02. The clean-install smoke check covers SC-4 and protects future commits from silently breaking the tarball — that's where its long-term value lives.
- `packages/core` is deliberately out-of-scope per D-04. If a future phase ever publishes core as a standalone library (it's not on the v3.0.x or v3.1.0 roadmap), that phase adds `files: ["dist"]` to `packages/core/package.json` at the same time it removes core from mcp/cli's `devDependencies` and adds it to `dependencies`. Coupling those two changes prevents a half-published state.

</specifics>

<deferred>
## Deferred Ideas

- **Strip source maps from production tarballs** — D-03 keeps source maps. If a future user reports tarball weight as a real friction (currently `dist/index.js.map` is small relative to bundled core), revisit. No current evidence anyone needs this.
- **Per-package CHANGELOG.md files** — already in PROJECT.md "Out of Scope" for v3.0.1 (single repo-level changelog suffices for two packages on synchronized versions). Re-confirmed not in Phase 18 scope.
- **Publish `@localground/core` as a standalone package** — out of scope for v3.0.x. If ever pursued, it's a multi-step phase (move from `devDependencies` to `dependencies` in mcp/cli, remove `noExternal` from tsup, add `files: ["dist"]` to core, publish). v3.1.0+ candidate, signal-driven only.
- **`.npmignore` parallel to `files` array** — D-05 rejects this. Single-source-of-truth mechanism. If npm adds a feature that requires `.npmignore` (none on the horizon), revisit then.
- **Codebase maps refresh** — `.planning/codebase/STACK.md` and `STRUCTURE.md` still describe the v1.2.0 era. Already deferred in Phase 16's CONTEXT.md. Same call here: not blocking Phase 18; refresh via `/gsd-map-codebase` before v3.1.0 if any future planning needs accurate maps.

</deferred>

---

*Phase: 18-packaging-polish*
*Context gathered: 2026-04-27*
