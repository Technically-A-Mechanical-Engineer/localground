# Phase 19: Skill Runtime UAT - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-27
**Phase:** 19-skill-runtime-uat
**Areas discussed:** Migration scenarios (UAT-02), Tarball vs local-dist runtime, Evidence capture format, Cleanup destructive scope (UAT-04), Test fixture source, Skill sequencing
**Mode:** discuss (advisor mode active — USER-PROFILE.md present, parallel research agents spawned per area)

---

## Migration scenarios for UAT-02

| Option | Description | Selected |
|--------|-------------|----------|
| A. Happy path only | Single source → dest, no errors. ~15 min. Misses idempotency, missing-state-file, multi-project. | |
| B. Happy path + idempotency replay | Adds re-paste check from destination. ~20 min. Misses missing-state-file fallback. | |
| C. Happy + idempotency + missing-state | Hits all three documented session-entry branches. ~30 min. | ✓ |
| D. Full matrix (C + crash-resume + multi-project) | Race-prone, high fixture overhead, ~2 hr. | |

**User's choice:** Option C (Recommended) — happy path + idempotency replay + missing-state-file fallback
**Notes:** Crash-resume deferred to v3.1.0 backlog as a deterministic Vitest test against `chunk()`+`copy()` directly — manual crash-resume is race-prone and a flaky UAT result is worse than no UAT. Multi-project batching out of scope per ROADMAP single-project SC.

---

## Tarball vs local-dist runtime

| Option | Description | Selected |
|--------|-------------|----------|
| (a) Local `packages/mcp/dist/index.js` | Fastest iteration, misses files-allowlist + missing-dep bugs. | |
| (b) Tarball-install only | Highest fidelity standalone, friction per fix iteration. | |
| (c) Published `@localground/mcp@3.0.0` from npm | Wrong version — lacks Phase 17/18 fixes. Reject. | |
| (d) Hybrid: local dist + tarball gate | Fast iteration loop + publish-shape gate as final pass. | ✓ |

**User's choice:** Option (d) hybrid
**Notes:** ROADMAP Phase 19 explicitly cites "UAT runs against the same tarball shape that v3.0.1 will publish" as the dependency rationale. `verify-tarball.mjs` covers artifact-level integrity; UAT exercises the runtime layer above it. Local dist for iteration is safe because tsup output is deterministic.

---

## Evidence capture format

| Option | Description | Selected |
|--------|-------------|----------|
| (a) Freeform narrative in `19-VERIFICATION.md` | No structured status, breaks `/gsd-progress` routing. | |
| (b) Structured `19-UAT.md` checklist only | Re-parseable, lacks transcript context for fix plans. | |
| (c) Saved transcripts only in `19-transcripts/` | Maximum fidelity, invisible to tooling. | |
| (d) Hybrid: `19-UAT.md` index + `19-transcripts/` per-skill | Re-parseable AND high-fidelity, matches "augment, don't overwrite" rule. | ✓ |

**User's choice:** Option (d) hybrid
**Notes:** Phase 19 mixes interactive dialogue, slow operations, and a Claude-Code-restart-bound state handoff. For these conditions, "partial — see transcript L42-58" is materially more useful than narrative or bare checkbox alone.

---

## Cleanup destructive scope (UAT-04)

| Option | Description | Selected |
|--------|-------------|----------|
| (a) Synthetic tmp dir, decline/skip-all only | Tests SC #4 negative path, leaves yes-branch unverified. | |
| (b) Synthetic tmp dir, confirm-yes only | Tests positive path, doesn't validate the SC #4 literal claim. | |
| (c) Synthetic tmp dir, mixed yes/no/skip-all | Both SC #4 directions + skip-all state transition in one run. | ✓ |
| (d) Real stale artifacts on user machine | Highest fidelity but irreversible. Reject. | |

**User's choice:** Option (c) synthetic tmp dir, mixed yes/no/skip-all
**Notes:** The test that validates "we don't accidentally delete stuff" should not itself be at risk of deleting stuff. The 3 diagnosed debug-session entries on the maintainer's machine get cleaned via a separate post-UAT operation, not folded into Phase 19.

---

## Test fixture source (follow-up after locking 4 areas above)

| Option | Description | Selected |
|--------|-------------|----------|
| Fresh disposable for everything | New small OneDrive project; ~10 min setup; clean slate. | ✓ |
| Reuse Phase 14 OneDrive QMS for migrate, fresh source for seed | Two fixtures, breaks natural chain. | |
| Reuse Phase 14 fixtures end-to-end | Blocked: Phase 14 OneDrive QMS already pre-seeded — UAT-01 errors. | |

**User's choice:** Fresh disposable for everything (Recommended)
**Notes:** Initially considered reusing Phase 14 fixtures (memory note explicitly preserved them for Phase 19), but `/localground:seed` errors with "project already seeded" against the QMS folder. Fresh fixture avoids the conflict and keeps natural seed→migrate→reap on a single project. Phase 14 fixture cleanup deferred to a separate post-UAT housekeeping step.

---

## Skill sequencing (follow-up after locking 4 areas above)

| Option | Description | Selected |
|--------|-------------|----------|
| Natural flow on one project, UAT-04 + UAT-05 independent | seed→migrate→reap chained, then UAT-04 (synthetic), then UAT-05 (env audit). | ✓ |
| Independent: each skill against its own fixture | Easier per-skill re-runs but loses integration signal. | |
| UAT-05 first as baseline, then natural flow | Adds bookkeeping with no diagnostic gain. | |

**User's choice:** Natural flow on one project, UAT-04 independent (Recommended)
**Notes:** Order: UAT-01 (seed) → UAT-02 (3 runs of scenario C) → UAT-03 (reap destination) → UAT-04 (cleanup, synthetic) → UAT-05 (verify environment-wide). UAT-05 last gives a final clean-state audit; pre-UAT baseline already visible via `/gsd-progress`.

---

## Claude's Discretion

The following were delegated to the planner / executor in CONTEXT.md:

- Tarball install location and MCP server re-registration mechanics (suggested: `os.tmpdir()` + `claude mcp remove` + `claude mcp add` between local-dist and tarball-install modes)
- Synthetic candidate count for UAT-04 (minimum 3, planner may extend to 4-5)
- Transcript line-range anchor format (suggested: section headings + line numbers)
- `19-UAT.md` exact frontmatter shape (planner reads Phase 17/18 verification frontmatter for the convention)
- Idempotency fixture detail — re-paste skill verbatim vs re-invoke from fresh Claude Code session at destination (suggested: fresh session to also validate skill-loading from destination project's `.claude/skills/`)

## Deferred Ideas

- **Crash-resume mid-loop test** — race-prone in manual UAT; v3.1.0 Vitest backlog candidate
- **Multi-project migration batching** — out of scope per ROADMAP single-project SC
- **Real stale-artifact cleanup on maintainer's machine** — separate post-UAT housekeeping operation (3 diagnosed debug entries + orphan path-hash entries)
- **Phase 14 fixture removal** — separate post-UAT housekeeping; could combine with maintainer-machine cleanup
- **`npx -y @localground/cli@3.0.1 detect` smoke against published tarball** — Phase 20 SC #5
- **Fix plans for UAT-discovered defects** — open under Phase 19 scope (e.g., 19-02-PLAN.md), milestone advances only when all 5 UATs `passed`
- **Codebase maps refresh** — already deferred in Phases 16/17/18; carry forward to v3.1.0
