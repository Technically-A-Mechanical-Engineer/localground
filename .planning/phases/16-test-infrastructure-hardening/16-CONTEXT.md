# Phase 16: Test Infrastructure Hardening — Context

**Gathered:** 2026-04-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Restore strict `tsc --build` as a CI quality gate, eliminate the Vitest cleanup hang on `npm test` exit, and close two LOW-severity test hygiene findings (L-01 placeholder.test.ts precondition guard, L-02 decode.test.ts tautological assertion). Code-quality changes only — no user-facing feature surface area.

Maps to v3.0.1 requirements **TEST-01, TEST-02, TEST-03, TEST-04**. First phase of v3.0.1 by design — landing the strict gate before subsequent codebase changes (Phases 17 CORE work, Phase 18 packaging) means those phases land under hardened typing.

**Constraint from REQUIREMENTS.md:** TEST-01 says explicitly "without weakening strict mode" — the fix is in the code, not in `tsconfig.json` flag changes. No `noImplicitAny: false`, no per-file overrides that loosen strictness.

</domain>

<decisions>
## Implementation Decisions

### Scope discipline
- **D-01:** Fix-if-cheap policy for discovered issues. When the work surfaces issues NOT documented in TEST-01..04 (e.g., fixing a tsc error reveals an unrelated unused-import warning, a shadowed variable, a missing type def in a related file), fix the discovered issue if the change is ≤5 lines AND shares a root cause with documented work. Anything bigger — log as a backlog item (next available 999.x slot) and stop.
- **D-02:** Hard ceiling on opportunistic cleanup. Once a discovered fix exceeds the 5-line ceiling, it does not get fixed in this phase — it gets logged. This protects the patch-release scope while still letting trivially-cheap cleanup ride the warm-context window.

### CI gate strategy
- **D-03:** `tsc --build` lives as a fail-fast step in the existing `ci.yml` job, before Vitest. Use the existing `npm run build:check` script (which calls `tsc --build tsconfig.json`).
- **D-04:** On `tsc` failure, Vitest is skipped. No separate parallel job, no run-everything pattern. Reasoning: localground is small (47 `.ts` files in `packages/`), GHA minutes matter more than seeing all failure classes simultaneously, and tsc errors usually mean Vitest will fail to compile downstream anyway.

### Test isolation level
- **D-05:** Per-test `afterEach` cleanup in MCP and CLI smoke tests that spawn child processes. Each smoke test that spawns a child (e.g., `packages/mcp/test/smoke.test.ts` lines 16-20 `spawnServer()`) explicitly kills it in `afterEach` — `child.kill()` followed by an awaited exit/timeout.
- **D-06:** No Vitest pool isolation (`pool: 'forks'`, `isolation: true`). Heaviest option, biggest config blast radius, would multiply test runtime — overkill for the actual problem (a finite set of smoke tests that spawn children).
- **D-07:** Cleanup pattern mirrors the existing real-fs idiom — same files already use per-test `mkdtemp` + `afterEach` `fs.rm`. Extend the same `afterEach` to also kill spawned children. One pattern, one place per test.

### Claude's Discretion

The following are implementation details delegated to the planner / executor. Decisions made here for the planner's reference, not for re-litigation:

- **L-02 replacement assertion (TEST-04):** Replace the tautological `expect(typeof result.success).toBe('boolean')` (which can never fail given the discriminated union return type) with a meaningful **success-branch assertion** — i.e., assert that the `data` field of a successful round-trip equals the expected decoded path. The existing tests already cover failure branches (lines 23-50 of `decode.test.ts` assert specific failure reasons); the missing coverage is the success branch's actual decoded value, which is what the tautology was trying-and-failing to test.
- **D-18 fix approach (TEST-01, ~30 implicit-any errors):** Add **explicit type annotations** at the failing call-sites. No `as any` casts, no `// @ts-ignore`, no per-file `noImplicitAny: false` overrides. If a shared utility lacks a type definition that's the root cause of multiple errors, fix it once at the source.
- **Sweep order:** Start with `tsc --build` running locally; group errors by file; fix file-by-file in dependency order (core → mcp → cli). Commit per logical cluster, not one giant commit.

</decisions>

<specifics>
## Specific Ideas

- "Without weakening strict mode" (REQUIREMENTS.md TEST-01) — the user is explicit that strict mode is non-negotiable. Resolve errors with type annotations, never with strictness flags.
- Real-fs test fixtures are a load-bearing v3.0.0 decision (caught Windows reparse-point + OneDrive bugs that mocked filesystems missed). Phase 16 must not migrate any tests away from real-fs — only add child-process cleanup alongside the existing pattern.
- The Vitest cleanup hang is a workflow papercut today (devs `Ctrl+C` after `npm test` completes). The fix is real-world quality-of-life, not just a hygiene checkbox.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements lock
- `.planning/REQUIREMENTS.md` §"Test Infrastructure" (TEST-01..04) — the four requirements this phase delivers, with explicit "without weakening strict mode" constraint
- `.planning/ROADMAP.md` §"Phase 16: Test Infrastructure Hardening" — phase goal, dependency lineage (no upstream deps; first v3.0.1 phase by design), 5 success criteria the executor will verify against

### Project-level invariants
- `.planning/PROJECT.md` §"Key Decisions" — Result type pattern (discriminated union, narrow before access), stderr-only logging in MCP server (CRIT-1 invariant — smoke tests must not break this), real-fs test fixtures (no mocked fs permitted)

### Configuration entry points
- `tsconfig.json` (root) — composite project with `strict: true`, references `packages/core`, `packages/mcp`, `packages/cli`. Source of truth for `tsc --build` behavior.
- `package.json` (root) — `"build:check": "tsc --build tsconfig.json"` script is the existing entry point for the strict gate
- `vitest.config.ts` (root) and `packages/*/vitest.config.ts` — Vitest configs to inspect for cleanup hooks; no pool changes per D-06
- `.github/workflows/ci.yml` — where the new tsc step lands per D-03; preserve existing 3-OS matrix structure

### Files with documented findings
- `packages/core/test/integrity/placeholder.test.ts` — L-01 target (TEST-03); sweep all `it()` blocks, not just the first two; the `.skipIf` macOS test (line 52+) needs the same guard pattern
- `packages/core/test/environment/decode.test.ts` — L-02 target (TEST-04); tautological assertion to replace; existing tests cover failure branches (lines 23-50), success branch needs meaningful coverage
- `packages/mcp/test/smoke.test.ts` and `packages/cli/test/smoke.test.ts` — TEST-02 cleanup target; both spawn child processes that need `afterEach` cleanup

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Per-test real-fs pattern** (`packages/core/test/integrity/placeholder.test.ts:9-16`, `packages/core/test/environment/decode.test.ts:9-21`): `beforeEach` creates `mkdtemp` dir, `afterEach` does `fs.rm`. Phase 16 extends this same `afterEach` to also kill spawned children in MCP/CLI smoke tests — same pattern, broader cleanup target.
- **`spawnServer()` helper** (`packages/mcp/test/smoke.test.ts:16-20`): existing helper that spawns the MCP server child process via `process.execPath` + array args (never shell mode). Cleanup needs to track the returned `ChildProcess` reference per test invocation.
- **`build:check` npm script** (root `package.json`): existing entry point for `tsc --build`. CI gate addition (D-03) wires this script into ci.yml — no new script needed.

### Established Patterns
- **`Result<T, R>` narrowing**: `if (result.success) { ... result.data ... } else { ... result.reason ... }`. The L-02 fix (D-Claude-1) follows this — assert in the success branch of a round-trip, not on a tautological field.
- **Stdio discipline (CRIT-1)**: stdout reserved for JSON-RPC; logging goes to stderr. `packages/mcp/test/stdout-discipline.test.ts` enforces this. Phase 16 cleanup work must NOT break this — child kill behavior must not emit anything to the spawned child's stdout that the parent test would see as JSON-RPC noise.
- **No `shell: true` on spawn calls**: per CRIT-3/MOD-3 mitigations and the security_reminder_hook expectation. Cleanup additions follow the same rule.

### Integration Points
- **`tsconfig.json` references**: composite project with three references. `tsc --build` walks them in dependency order (core → mcp → cli). Errors surface at the leaf packages but root causes can be in core.
- **`ci.yml` job structure**: existing job runs on Win/Mac/Linux matrix at Node 20.x. Phase 16 adds a step (`npm run build:check`) before the Vitest step within the same job — does not add a new job.
- **`vitest.config.ts` files**: per-package configs can extend a root config or stand alone. Phase 16's cleanup additions are in test files (not config), so config files stay untouched per D-06.

</code_context>

<deferred>
## Deferred Ideas

- **Codebase maps refresh** — `.planning/codebase/STACK.md` and `STRUCTURE.md` describe the v1.2.0 era ("No programming language is used in this project itself") and predate the v3.0.0 TypeScript implementation. Stale, but not blocking Phase 16. Refresh via `/gsd-map-codebase` as a backlog item before the v3.1.0 milestone if any future planning needs accurate maps.
- **Vitest pool isolation upgrade** — D-06 explicitly defers `pool: 'forks'` + `isolation: true`. If a future test class needs harder isolation (e.g., MCP servers competing on a shared port, real npm-publish dry-runs that mutate `~/.npmrc`), revisit then. Not for this milestone.
- **Pre-commit gate via husky** — local-only tsc gate option was rejected for D-03/D-04. If CI cycle time becomes painful in future milestones, a local pre-commit gate could supplement (not replace) the CI gate.
- **Sweep-all approach to test smell** — D-01 rejects this for v3.0.1 patch scope. If a v3.1.x or v3.2.0 milestone targets quality consolidation, a deliberate "sweep all test files for L-class hygiene findings" phase could land then.

</deferred>

---

*Phase: 16-test-infrastructure-hardening*
*Context gathered: 2026-04-26*
