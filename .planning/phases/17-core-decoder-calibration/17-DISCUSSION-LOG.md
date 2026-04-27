# Phase 17: Core Decoder Calibration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-27
**Phase:** 17-core-decoder-calibration
**Areas discussed:** Regex shape (targeted vs catch-all), Stale-entry classification scope, Test coverage breadth

---

## Pre-discussion Diagnostic

Before presenting gray areas, ran a 30-second decode probe against all 23 entries in `~/.claude/projects/` using the v3.0.0 built core (`packages/core/dist/index.js`). Result:

- 17/23 decode successfully against existing folders.
- 6/23 fail with `no_candidates`. Verified each on disk: ALL 6 are deleted source folders, not regex undercoverage.

Failing entries (all confirmed deleted via `test -d`):
1. `C--Users-rlasalle-Documents-Claude-Projects` → `C:\Users\rlasalle\Documents\Claude Projects` (gone)
2. `C--Users-rlasalle-OneDrive---ThermoTek--Inc-Desktop-ATP-NTS-Test-DATA` (gone)
3. `C--Users-rlasalle-OneDrive---ThermoTek--Inc-Desktop-Cowork-Test1` (gone)
4. `C--Users-rlasalle-OneDrive---ThermoTek--Inc-Documents-Projects-Training-With-Amit-2026-03-29` (gone)
5. `C--Users-rlasalle-OneDrive---ThermoTek--Inc-General-Current-Hotness-0246-2026-Management-Review-RL-Claude-Sandbox` (gone)
6. `C--Users-rlasalle-Projects-claude-code-cloud-sync-migration` (renamed to localground 2026-04-12)

**Why this matters:** The "root cause undetermined" note in PROJECT.md is now resolved. None of the 6 failures are regex bugs in the active environment. Phase 17 calibration is defensive/forward-looking — preventing silent failure on FUTURE folders containing CORE-13 chars — not a fix for an active defect.

This diagnostic reshaped the gray-area framing. Original framing (per advisor pre-call) anticipated regex calibration scope, verification-case selection, and test breadth. Post-diagnostic framing focuses on regex shape, scope discipline (whether to also fix consumer-side surfacing), and test breadth.

---

## Area 1 — Regex shape: targeted vs catch-all

| Option | Description | Selected |
|--------|-------------|----------|
| Targeted | Extend regex to exactly CORE-13's listed chars: `/[\\/: ,().'&\[\]+=%]/g`. Adds apostrophe, ampersand, brackets, plus, equals, percent. Parens and period already covered. | ✓ |
| Catch-all | `/[^A-Za-z0-9-]/g` — replace anything that isn't alphanumeric or hyphen. Matches 14-REVIEW.md WR-01 reviewer suggestion. | |

**User's choice:** Targeted (D-01).
**Notes:** Catch-all assumes Claude Code encodes ALL non-alphanumerics, which we have no empirical evidence for — apostrophes and ampersands are legal Windows path chars and CC could pass them through. Targeted closes the documented requirement, is reversible, and carries zero risk to the current 17/17 round-trip success rate. Empirical CC probe also rejected (D-02) — adds ~30 minutes of plan work for a 1-line change with no current symptom.

---

## Area 2 — Stale-entry classification scope

| Option | Description | Selected |
|--------|-------------|----------|
| Defer to backlog | Phase 17 closes CORE-14 by writing up the diagnostic (all 6 failures = deleted sources). Audit/cleanup consumer changes deferred. | ✓ |
| Fold into Phase 17 | Phase 17 also adds an `undecodable` classification surfacing path so audit reports tell users about deleted sources. Doubles scope. | |

**User's choice:** Defer to backlog (D-03).
**Notes:** v3.0.1 is patch-release scope. The classification surfacing is a real UX improvement (users would see "6 entries reference deleted source folders — candidates for cleanup" instead of silent omission), but it's a feature touching CLI audit, MCP audit, and cleanup-scan. That's a v3.1.0 candidate, not a v3.0.1 calibration. Decoder-defects.md line 146 flagged this exact split as cross-cutting.

---

## Area 3 — Test coverage breadth

| Option | Description | Selected |
|--------|-------------|----------|
| Per-class round-trip | One round-trip test per CORE-13 listed char (apostrophe, ampersand, brackets, plus, equals, percent). Real-fs fixtures with deliberate special-char folder names. | ✓ |
| Add Unicode / unlisted | Per-class plus generic Unicode/accented-char test plus tilde/semicolon/at-sign coverage. | |
| Trim further | Skip per-class; just one composite test exercising multiple chars at once. | |

**User's choice:** Per-class round-trip (D-05, D-06).
**Notes:** Per-class catches both encode-side undercoverage AND decode-side regression in one assertion each. Real-fs fixtures match the load-bearing v3.0.0 testing pattern. Skipping Unicode/unlisted keeps the suite focused on the documented requirement; re-open if a real folder ever surfaces with non-ASCII chars. Existing line-43 test already covers the failure-side `no_candidates` path — no need for a new "deleted folder" failure test.

---

## Claude's Discretion

- Test fixture folder naming (e.g., `O'Brien`, `Rock & Roll`, `Foo[Bar]`, `1+1`, `key=val`, `100% Done`) — implementation detail for the test author.
- Regex character ordering inside the bracket class — semantically equivalent.
- Commit granularity (one combined commit vs three) — planner's call.

## Deferred Ideas

- **Stale-entry classification (`undecodable` reason surfacing in audit/cleanup)** — new 999.x backlog item. v3.1.0 candidate.
- **Empirical Claude Code encoder probe** — only run reactively if a future char surprises us. Out of v3.0.1 scope.
- **Unicode / non-ASCII coverage** — out of CORE-13 scope; reactive widening only.
- **Tilde / semicolon / at-sign / unlisted ASCII** — same as Unicode.
- **`decode()` algorithm refinement** — the filesystem-listing reverse-encode algorithm is load-bearing and not modified by Phase 17.
