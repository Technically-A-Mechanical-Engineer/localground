# Phase 16: Test Infrastructure Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-26
**Phase:** 16-test-infrastructure-hardening
**Areas discussed:** Scope discipline, CI gate strategy, Test isolation level

---

## Scope discipline

**Question:** When work surfaces issues NOT documented in TEST-01..04 (e.g., fixing a tsc error reveals an unrelated unused-import warning, a shadowed variable), how should those be handled?

| Option | Description | Selected |
|--------|-------------|----------|
| Fix-if-cheap (Recommended) | Fix discovered issues if change is ≤5 lines and shares a root cause with documented work. Bigger ones logged as backlog (e.g., 999.7) with no fix attempt. Warm-context fix window for trivial issues, hard ceiling against scope drift. | ✓ |
| Strict-only | Only fix what's literally in REQUIREMENTS.md. Discovered issues become backlog items with no fix attempt. Maximum blast-radius discipline; minimum opportunistic cleanup. | |
| Sweep-all | Fix everything tsc/Vitest surfaces during the work, beyond just documented findings. Maximum cleanup; highest scope-creep risk on a patch release. | |

**User's choice:** Fix-if-cheap (Recommended)
**Notes:** Captured as D-01 and D-02 in CONTEXT.md. The 5-line ceiling is a hard cap — once exceeded, the discovery becomes a backlog item and the executor stops fixing.

---

## CI gate strategy

**Question:** Where should `tsc --build` live in CI?

| Option | Description | Selected |
|--------|-------------|----------|
| Fail-fast step in ci.yml (Recommended) | Add `npm run build:check` as a step in existing ci.yml job, before Vitest. On tsc failure, Vitest skipped (saves GHA minutes). localground is small; tsc errors usually mean tests won't compile anyway. | ✓ |
| Run-everything step in ci.yml | tsc step runs, then Vitest runs regardless of tsc exit code. Both reports visible in one CI run. Useful only if multi-error pushes are common. | |
| Parallel job in ci.yml | tsc as its own GHA job alongside the test job. Slower wall-clock; surfaces all failure classes in parallel. Overkill for a 47-file codebase. | |
| Local-only (pre-commit hook) | tsc as pre-commit gate via husky or similar; nothing in CI. Relies on developer discipline; CI doesn't catch regressions if pre-commit is bypassed. | |

**User's choice:** Fail-fast step in ci.yml (Recommended)
**Notes:** Captured as D-03 and D-04 in CONTEXT.md. Wires existing `npm run build:check` script into ci.yml as a step before Vitest within the same 3-OS matrix job.

---

## Test isolation level

**Question:** How should Vitest clean up spawned MCP server / CLI children?

| Option | Description | Selected |
|--------|-------------|----------|
| Per-test afterEach (Recommended) | Each smoke test that spawns a child explicitly kills it in `afterEach`. Idiomatic Vitest; mirrors existing per-test `mkdtemp`/`rm` real-fs pattern; fine-grained control. | ✓ |
| Global afterAll in shared setup file | Single afterAll in setup file kills tracked children. Less code per-test but loses fine-grained control if a test needs a long-lived child. | |
| Vitest pool isolation (`pool: 'forks'`) | Vitest config `pool: 'forks'` + `isolation: true`. Process-level isolation; child cleanup happens automatically when worker exits. Heaviest — doubles or triples test runtime. | |

**User's choice:** Per-test afterEach (Recommended)
**Notes:** Captured as D-05, D-06, D-07 in CONTEXT.md. Cleanup pattern extends the existing `afterEach` `fs.rm` idiom — same hook, broader cleanup target (children + tmpdir). No Vitest config changes per D-06.

---

## Claude's Discretion

These were not asked of the user — captured in CONTEXT.md `<decisions>` under "Claude's Discretion" for the planner's reference:

- **L-02 replacement assertion (TEST-04):** Replace the tautological assertion with a meaningful success-branch check (round-trip success case asserting on `result.data`). Existing failure-branch tests stay intact.
- **D-18 fix approach (TEST-01, ~30 implicit-any errors):** Add explicit type annotations at failing call-sites. No `as any`, no `// @ts-ignore`, no per-file `noImplicitAny: false`. If a shared util lacks a type def causing multiple errors, fix it once at source.
- **Sweep order:** Run `tsc --build` locally; group errors by file; fix file-by-file in dependency order (core → mcp → cli); commit per logical cluster.

---

## Deferred Ideas

These came up in the analysis but belong outside Phase 16. Captured in CONTEXT.md `<deferred>`:

- **Codebase maps refresh** — `.planning/codebase/STACK.md` and `STRUCTURE.md` describe the v1.2.0 era and predate v3.0.0. Refresh via `/gsd-map-codebase` before any future milestone whose planning needs accurate maps.
- **Vitest pool isolation upgrade** — Revisit if a future test class needs harder isolation (e.g., port-competing MCP servers, real npm-publish dry-runs that mutate `~/.npmrc`).
- **Pre-commit gate via husky** — Could supplement (not replace) the CI gate if cycle time becomes painful in future milestones.
- **Sweep-all approach to test smell** — Rejected for v3.0.1 patch scope. Could land in a future quality-consolidation milestone.

---

## Discussion summary

Three gray areas surfaced from analysis; user selected all three to drill into; user accepted the recommended option for each. No follow-up questions raised by the user. Total decision surface: **7 numbered decisions (D-01 through D-07)** plus 3 Claude's-discretion items captured for the planner. CONTEXT.md is the single source of truth for downstream agents (researcher, planner); this log is human-audit-only.
