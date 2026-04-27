# Phase 17: Core Decoder Calibration - Pattern Map

**Mapped:** 2026-04-27
**Files analyzed:** 3 (1 source, 1 test, 1 documentation) + 1 PROJECT.md update
**Analogs found:** 3 / 3 — all in-file (self-analog patterns)

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---------------|------|-----------|----------------|---------------|
| `packages/core/src/environment/decode.ts` | utility (pure-fn) | transform | self (line 89, `encode()`) | exact (1-line edit to existing function) |
| `packages/core/test/environment/decode.test.ts` | test (unit) | request-response | self (lines 53-71, round-trip test) | exact (append per-class tests using established pattern) |
| `.planning/phases/17-core-decoder-calibration/17-VERIFICATION.md` | documentation | n/a | `.planning/phases/16-test-infrastructure-hardening/16-VERIFICATION.md` | exact (same phase-verification template) |
| `.planning/PROJECT.md` (Key Decisions table append) | documentation | n/a | existing PROJECT.md Key Decisions rows | exact (same row schema) |

**Match-quality rationale:** Phase 17 is a calibration phase, not a feature phase. The closest analogs for the source and test edits are *the existing functions and tests in those exact files* — D-01 widens the regex inside `encode()`, D-05 appends new tests next to the existing 5 tests. No structural pattern transfer is needed; the existing patterns are already correct and load-bearing.

## Pattern Assignments

### `packages/core/src/environment/decode.ts` (utility, transform)

**Analog:** `packages/core/src/environment/decode.ts` itself — the existing `encode()` function on lines 87-90.

**Imports pattern** — UNCHANGED. The existing imports (lines 1-5) require no additions for D-01:
```typescript
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Result, PathHashEntry } from '../types.js';
```

**Core pattern** — single-line regex widening (lines 87-90):
```typescript
export function encode(filePath: string): string {
  // Replace each special character with a single hyphen
  return filePath.replace(/[\\/: ,().]/g, '-').replace(/^-+|-+$/g, '');
}
```

**Edit shape (D-01):** Change ONLY the character class on line 89. Replace `/[\\/: ,().]/g` with `/[\\/: ,().'&\[\]+=%]/g`. The second `replace()` call (`/^-+|-+$/g`) and the function signature stay byte-identical.

**What stays untouched:**
- The `decode()` function (lines 31-80) — Result type contract, segment splitting, candidate selection.
- `reconstructPath()` (lines 98-130) — Windows drive-letter handling, Unix root handling.
- `buildCandidates()` (lines 144-200) — the load-bearing filesystem-listing reverse-encode algorithm. CONTEXT.md `<canonical_refs>` and PROJECT.md "Key Decisions" both flag this as the v3.0.0 OneDrive corporate-path fix; do NOT refactor.

**Why no other pattern transfer:** The function is 4 lines. The existing implementation is the pattern. The widening is mechanical character-class extension.

**Regex character escaping reference (per "Claude's Discretion" in CONTEXT.md):**
- `\\` and `/` already escaped/literal — keep as-is
- `[` and `]` MUST be escaped inside the character class — write as `\[` and `\]`
- `'`, `&`, `+`, `=`, `%` are literal inside a character class — no escape needed
- Final form: `/[\\/: ,().'&\[\]+=%]/g`

---

### `packages/core/test/environment/decode.test.ts` (test, unit)

**Analog:** `packages/core/test/environment/decode.test.ts` itself — the existing round-trip test on lines 53-71.

**Imports pattern** — UNCHANGED. Existing imports (lines 1-5) cover all needs:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { decode, encode } from '@localground/core';
```

**Setup/teardown pattern** — UNCHANGED. Existing `beforeEach`/`afterEach` (lines 10-21) provide the canonicalized `tmpDir` that all new tests will reuse:
```typescript
beforeEach(async () => {
  // Canonicalize via fs.realpath to resolve 8.3 short-name paths on Windows CI
  // (e.g. C:\Users\RUNNER~1\... → C:\Users\runneradmin\...). The decoder walks the
  // filesystem comparing encode(readdir entry name) against the hash, and readdir
  // returns long names — so the encoded hash must come from a long-name path too.
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'localground-test-'));
  tmpDir = await fs.realpath(dir);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});
```

**Core round-trip pattern** — COPY EXACTLY (lines 53-71):
```typescript
it('round-trips encode then decode for a real fixture path', async () => {
  // Create a subdirectory inside tmpDir so we have a real path to encode/decode.
  const subDir = path.join(tmpDir, 'sub');
  await fs.mkdir(subDir);

  // Encode the parent (tmpDir) portion to get a hash that decode can reverse-lookup.
  // On Windows, tmpDir is like C:\Users\...\AppData\Local\Temp\localground-test-XXXXX
  // encode() replaces all separators with '-', which decode() reverses via fs listing.
  const hash = encode(tmpDir);

  const result = await decode(hash);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.hashDirName).toBe(hash);
    // decodedPath resolves to the real tmpDir (case-insensitive on Windows)
    expect(result.data.decodedPath).not.toBeNull();
    expect(typeof result.data.exists).toBe('boolean');
  }
});
```

**Pattern transfer for D-05 (one test per CORE-13 class):** Each new test follows the exact same skeleton, but creates a subdirectory whose NAME contains the target char, then encodes the subdirectory's path (not just `tmpDir`). The assertion shape is identical: `result.success === true`, `result.data.hashDirName === hash`, `result.data.decodedPath` defined.

**Concrete shape for one new test (apostrophe class):**
```typescript
it("round-trips encode/decode for a folder name containing an apostrophe (CORE-13)", async () => {
  const subDir = path.join(tmpDir, "O'Brien");
  await fs.mkdir(subDir);

  const hash = encode(subDir);
  const result = await decode(hash);

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.hashDirName).toBe(hash);
    expect(result.data.decodedPath).not.toBeNull();
    // The decoded path must resolve back to the actual fixture (case-insensitive on Windows)
    expect(result.data.decodedPath.toLowerCase()).toBe(subDir.toLowerCase());
  }
});
```

**Apply this skeleton 6 times** — one test per class:

| Class | Suggested fixture name (per CONTEXT.md "Claude's Discretion") |
|-------|---------------------------------------------------------------|
| apostrophe (`'`) | `O'Brien` |
| ampersand (`&`) | `Rock & Roll` |
| brackets (`[` `]`) | `Foo[Bar]` |
| plus (`+`) | `1+1` |
| equals (`=`) | `key=val` |
| percent (`%`) | `100% Done` |

CORE-13 lists 7 classes; brackets count as ONE class (open + close together) per CONTEXT.md `<decisions>` D-01 phrasing ("seven char classes" includes both bracket forms in one fixture). Result: 6 new test cases.

**Result type narrowing pattern** — applied verbatim:
```typescript
expect(result.success).toBe(true);
if (result.success) {
  expect(result.data.hashDirName).toBe(hash);
  expect(result.data.decodedPath).not.toBeNull();
}
```

This is the project-wide narrowing pattern (PROJECT.md "Key Decisions" → Result type pattern; CONTEXT.md `<code_context>` → "Established Patterns").

**What NOT to copy from the analog file:**
- The `it.skipIf` Windows-symlink test (lines 79-108) — D-05 explicitly says no admin elevation needed for char-class tests.
- The failing-side `'nonexistent-path-...'` test (lines 42-51) — D-07 marks failing-side coverage out of scope; existing test already covers it.
- The standalone `describe('encode', ...)` block (lines 111-140) — adding more `encode()`-only assertions is not required by D-05/D-06. The round-trip tests inside `describe('decode')` cover both functions in composition.

**Regression smoke check (D-06):** All 5 existing tests in `describe('encode')` (lines 112-139) plus the 5 existing tests in `describe('decode')` (lines 23-108) must continue to pass after the regex widening. No new assertions needed — this is a regression observation, not a new test.

---

### `.planning/phases/17-core-decoder-calibration/17-VERIFICATION.md` (documentation)

**Analog:** `.planning/phases/16-test-infrastructure-hardening/16-VERIFICATION.md` lines 1-78.

**Frontmatter pattern** (lines 1-8):
```yaml
---
phase: 16-test-infrastructure-hardening
verified: 2026-04-27T05:25:00Z
status: passed
score: 5/5 must-haves verified
overrides_applied: 0
requirements_verified: 4/4
---
```

**Apply for Phase 17** with field substitutions:
- `phase: 17-core-decoder-calibration`
- `verified: <ISO timestamp at verification time>`
- `status: passed`
- `score: <N>/<M> must-haves verified`
- `requirements_verified: 2/2` (CORE-13 + CORE-14)

**Header pattern** (lines 10-16):
```markdown
# Phase 16: Test Infrastructure Hardening Verification Report

**Phase Goal:** Restore the strict tsc quality gate and eliminate test-suite reliability defects so subsequent codebase changes (CORE-13/14, UAT validation) land under a hardened gate.

**Verified:** 2026-04-27T05:25:00Z
**Status:** passed
**Re-verification:** No — initial verification
```

**Section structure** to copy from 16-VERIFICATION.md:
1. `## Goal Achievement` → `### Observable Truths (Roadmap Success Criteria)` table — one row per ROADMAP.md success criterion (4 criteria for Phase 17 per CONTEXT.md `<canonical_refs>`)
2. `### Required Artifacts` table — list `decode.ts`, `decode.test.ts`, `17-VERIFICATION.md`, PROJECT.md row
3. `### Key Link Verification` table — wire-up between regex change and test coverage
4. `### Behavioral Spot-Checks` table — `npm test` pass, `npm run build:check` pass, regex grep verification
5. `### Requirements Coverage` table — CORE-13 and CORE-14 satisfaction evidence

**Phase 17-specific section to ADD (not in 16-VERIFICATION.md template):**

A new section under `## Goal Achievement` titled `### Path-Hash Diagnostic — CORE-14 Closure` that lists the 6 deleted-source path-hash entries individually. Per D-08, format:

```markdown
### Path-Hash Diagnostic — CORE-14 Closure

The 23-path-hash sample probed during the 2026-04-27 diagnostic (per CONTEXT.md `<domain>`)
resolved as follows: 17/23 decoded successfully against existing folders. The remaining 6
returned `no_candidates` because the source folder no longer exists on disk. Each is
documented below, satisfying CORE-14's "every `no_candidates` either resolves or has a
documented reason" criterion.

| # | Path-hash directory name | Decoded target (best inference) | Status |
|---|---------------------------|----------------------------------|--------|
| 1 | `<hash-1>` | `<decoded-path-1>` | Deleted source folder — verified absent on disk |
| 2 | `<hash-2>` | `<decoded-path-2>` | Deleted source folder — verified absent on disk |
| ... | ... | ... | ... |
| 6 | `<hash-6>` | `<decoded-path-6>` | Deleted source folder — verified absent on disk |

**Closure:** No regex undercoverage in the active environment. The Phase 17 regex widening
is defensive/forward-looking — preventing silent failure on FUTURE folders containing the
seven CORE-13 classes — not a fix for an active environment defect.
```

The 6 entries should be sourced from MEMORY.md `project_diagnostic_23_paths.md` (per the `<context>` reference) — the executor pulls the actual hashes during plan execution.

---

### `.planning/PROJECT.md` (documentation — Key Decisions table append)

**Analog:** existing `## Key Decisions` table rows in PROJECT.md (no need to read — schema is well-established and CONTEXT.md `<canonical_refs>` describes it).

**Pattern (D-09):** Add ONE new row to the Key Decisions table marking WR-01 closed. Schema follows existing rows (Result type pattern, real-fs test fixtures, filesystem-listing reverse-encode decoder). Suggested row content:

| Decision | Rationale | Outcome |
|----------|-----------|--------|
| WR-01 (encode regex calibration) closed via Phase 17 — regex widened to cover seven CORE-13 char classes (apostrophe, ampersand, brackets, plus, equals, percent) | Defensive/forward-looking widening; 17/17 currently-extant path-hashes already round-trip, 6/6 `no_candidates` documented as deleted source folders. Targeted, not catch-all (D-01). | ✓ Validated in v3.0.1 — see [`.planning/phases/17-core-decoder-calibration/17-VERIFICATION.md`](phases/17-core-decoder-calibration/17-VERIFICATION.md) |

**Annotation pattern (D-09 second clause):** Add a forward-pointer in the existing 14-REVIEW.md WR-01 entry (in milestone archive or current REVIEW) — single line: `**Resolved by Phase 17** — see `.planning/phases/17-core-decoder-calibration/17-VERIFICATION.md`.`

---

## Shared Patterns

### Result type narrowing
**Source:** `packages/core/src/types.ts` (Result discriminated union); applied at `packages/core/test/environment/decode.test.ts:64-70` and across all core test files.
**Apply to:** All new round-trip tests in Phase 17.
```typescript
const result = await decode(hash);
expect(result.success).toBe(true);
if (result.success) {
  // Access result.data here — narrowed to Success<T>
  expect(result.data.hashDirName).toBe(hash);
}
```

### Real-fs test fixtures (no mocked filesystem)
**Source:** `packages/core/test/environment/decode.test.ts:10-21` (beforeEach/afterEach pair); enforced project-wide per PROJECT.md "Conventions" and Phase 14/16 lessons.
**Apply to:** All new tests in Phase 17.
```typescript
beforeEach(async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'localground-test-'));
  tmpDir = await fs.realpath(dir); // 8.3 short-name canonicalization for Windows CI
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});
```

The Phase 16 reaper-before-rm ordering applies in `mcp/test/smoke.test.ts` and `cli/test/smoke.test.ts`, but `decode.test.ts` does NOT spawn child processes — only directory cleanup is needed. The existing single-line `afterEach` is correct as-is.

### Single-hyphen-per-char encoding contract
**Source:** `packages/core/src/environment/decode.ts:89` (existing `encode()`).
**Apply to:** Phase 17 regex widening.
```typescript
return filePath.replace(/[<char-class>]/g, '-').replace(/^-+|-+$/g, '');
```
The widening only changes `<char-class>`. The chained `.replace(/^-+|-+$/g, '')` preserves the strip-leading-trailing-hyphens contract. No collapsing of consecutive hyphens — each special char becomes exactly one hyphen.

---

## No Analog Found

None. All three Phase 17 deliverables map to existing in-file patterns or to the immediately-prior phase's verification template.

---

## Metadata

**Analog search scope:** `packages/core/src/environment/`, `packages/core/test/environment/`, `.planning/phases/16-test-infrastructure-hardening/`
**Files scanned:** 3 (decode.ts, decode.test.ts, 16-VERIFICATION.md)
**Pattern extraction date:** 2026-04-27
**Search strategy:** Self-analog dominant (calibration phase, not feature phase). External analog only for VERIFICATION.md template.
