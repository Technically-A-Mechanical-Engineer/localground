# Phase 18: Packaging Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-27
**Phase:** 18-packaging-polish
**Areas discussed:** None — recommendations locked in single-question gate

---

## Single gate: lock recommendations vs. dig in

Three gray areas were identified and presented to the user with embedded recommendations. The user selected the "lock my recommendations" path, accepting all three as-is without per-area discussion.

| Option | Description | Selected |
|--------|-------------|----------|
| Tarball install smoke check | SC-4 verification surface — manual command, scripted artifact, or ci.yml step. Affects Phase 20 regression coverage. | |
| Source maps in tarball | Both tsup configs have sourcemap: true; .map files ship under files: ["dist"]. Keep (debug fidelity) vs. strip (smaller tarball). | |
| Core package scope | Apply files: ["dist"] to core/package.json for symmetry, vs. leave untouched because core is bundled and never published. | |
| None — lock my recommendations | Accept all three: scripted smoke check wired into ci.yml; keep source maps; leave core/package.json untouched. | ✓ |

**User's choice:** Lock all recommendations, skip per-area discussion.
**Notes:** Phase scope is narrow (PKG-01 + PKG-02 explicitly defined in REQUIREMENTS.md and ROADMAP.md). The three gray areas are genuine implementation choices but each has a clear default per the recommendations embedded in the option descriptions. The user accepted the package.

## Claude's Discretion

Per the locked recommendations and CONTEXT.md `<decisions>`:

- Smoke-check implementation form (standalone script vs. Vitest spec vs. shared helper) — planner picks; suggested standalone script.
- Smoke-check position in ci.yml — planner confirms by reading current ci.yml.
- Smoke-check assertion depth — at minimum `localground-mcp --version` plus `localground detect --json`; no real migration paths exercised here.
- Commit granularity — planner's call (one combined commit or two: package.json edits + smoke-check infrastructure).

## Deferred Ideas

- Strip source maps from production tarballs (D-03 keeps them; revisit if tarball weight becomes a real friction).
- Per-package CHANGELOG.md files (already in PROJECT.md Out of Scope; re-confirmed).
- Publish `@localground/core` as a standalone package (v3.1.0+ candidate, signal-driven).
- `.npmignore` parallel to `files` array (D-05 rejects; single source of truth).
- Codebase maps refresh (carried from Phase 16's deferred list; not blocking Phase 18).
