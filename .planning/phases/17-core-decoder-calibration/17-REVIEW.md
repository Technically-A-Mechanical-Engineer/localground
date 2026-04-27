---
phase: 17-core-decoder-calibration
reviewed: 2026-04-27T05:35:12Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - packages/core/src/environment/decode.ts
  - packages/core/test/environment/decode.test.ts
findings:
  critical: 0
  warning: 1
  info: 3
  total: 4
status: issues_found
---

# Phase 17: Code Review Report

**Reviewed:** 2026-04-27T05:35:12Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

The phase ships exactly the artifact described in `17-01-PLAN.md`: a single-character-class widening of `encode()` on `decode.ts:89` and six per-class round-trip tests on `decode.test.ts:110-211`. Mechanical correctness against the stated D-01 scope is good — the regex compiles, the build succeeds, all 15 active tests pass, and each new fixture round-trips at the leaf position the test exercises.

There is one substantive finding. The new tests prove leaf-position survival only — every fixture is created as a subdirectory whose **name** contains the special char. They do not exercise the case where a CORE-13 char sits at the trailing edge of an **intermediate path component** with a deeper child. Empirical probe (run during this review) confirms that all seven newly-covered CORE-13 classes fail with `no_candidates` when arranged as `tmpDir/Trailing<char>/sub`. This is the same pre-existing algorithmic flaw that already affects `(`, `)`, and `.`; the regex widening expands its surface from three classes to ten without making it visible. The phase nevertheless declares CORE-13 closure on this basis — the test suite passes, but it does not actually verify the closure claim across realistic path shapes.

The remaining items are informational: a runtime-redundant null assertion that the plan instructed the executor to copy verbatim, six near-duplicate test bodies that could collapse into a `describe.each`, and one comment misalignment.

## Warnings

### WR-01: Round-trip tests cover leaf position only — trailing-char-at-component-boundary regression unverified for all seven new classes

**File:** `packages/core/test/environment/decode.test.ts:110-211`

**Issue:** Each of the six new tests creates a single subdirectory `tmpDir/<name-with-special-char>/` where the special char is in the leaf component, then encodes that leaf path and decodes the resulting hash. This shape always succeeds because the special char's hyphen-encoded form is at the end of the hash and gets stripped by `^-+|-+$/g`, so there is no trailing hyphen to confuse the prefix-match logic in `buildCandidates()`.

The realistic path shape — a CORE-13 char at the **end** of an intermediate folder name with a deeper child — is not exercised. Empirical probe during this review (with the widened regex active):

| Fixture parent | Child | Encoded hash tail | `decode()` result |
|---|---|---|---|
| `Foo[Bar]` | `sub` | `...-Foo-Bar--sub` | FAIL — `no_candidates` |
| `Trailing'` | `sub` | `...-Trailing--sub` | FAIL — `no_candidates` |
| `Trailing&` | `sub` | `...-Trailing--sub` | FAIL — `no_candidates` |
| `Trailing+` | `sub` | `...-Trailing--sub` | FAIL — `no_candidates` |
| `Trailing=` | `sub` | `...-Trailing--sub` | FAIL — `no_candidates` |
| `Trailing%` | `sub` | `...-Trailing--sub` | FAIL — `no_candidates` |
| `[Bracketed]` | `sub` | `...--Bracketed--sub` | FAIL — `no_candidates` |

Root cause: `encode("Foo[Bar]")` returns `Foo-Bar` (the trailing `]`'s hyphen is stripped by `.replace(/^-+|-+$/g, '')`). At decode time, `buildCandidates()` builds `prefix = encodedName + '-' = "Foo-Bar-"`, which matches the hash's `Foo-Bar-` (one hyphen for the path separator). That leaves `-sub` as `remainingHash`, but inside `Foo[Bar]/`, no entry's encoded form is `-sub` (the leading hyphen has nowhere to come from — there is no special char preceding `sub`). The decoder returns `no_candidates`.

This is a pre-existing flaw — the same shape fails for `(parens)/sub` and `ends./sub` against today's master and against pre-Phase-17 master. Phase 17 did not introduce it. But the phase advertises CORE-13 closure and adds seven new char classes that all share this defect, while the test suite verifies only the safe leaf-position shape. The closure claim in `17-01-PLAN.md` `<objective>` ("round-trip the seven CORE-13 character classes") is therefore unverified for any path component beyond the deepest leaf.

Operationally, this matters because the documented Claude Code path examples include `OneDrive - ThermoTek, Inc/Documents/...` — a corporate-folder shape where one of the new classes (apostrophe in possessive names, ampersand in `Lockheed & Martin`-style firm names, brackets in `[Archive]/...`) is plausible at exactly this position. The phase's "defensive/forward-looking" framing in `17-CONTEXT.md` `<domain>` does not hold against a folder of shape `Acme & Co/Projects/...`.

**Fix:**

Two options, in order of preference:

1. **Surface the limitation in the plan/closure doc.** Document in `17-VERIFICATION.md` that the regex widening covers leaf-position decoding and that trailing-special-char-at-component-boundary remains an open algorithmic gap (shared with pre-existing `(`, `)`, `.` classes). Open a follow-up phase to fix the algorithm — either by changing `buildCandidates()` to try `prefix = stripTrailingHyphens(encodedName) + '-'` and `prefix = encodedName + '--'`, or by removing the leading/trailing hyphen strip from `encode()` and handling root-prefix hyphens separately in `reconstructPath()`.

2. **Add a single confirming test that establishes the boundary explicitly.** Append one negative test that documents the current (broken) behavior at component boundaries:

```typescript
it('documents known limitation: special char at component boundary returns no_candidates (CORE-13)', async () => {
  // Pre-existing algorithmic gap shared by '(', ')', '.', and the seven CORE-13 classes
  // added in Phase 17. encode("Foo[Bar]") strips the trailing hyphen via /^-+|-+$/g,
  // breaking the prefix-match in buildCandidates() when a deeper child follows.
  // Tracked separately from CORE-13 regex calibration; see follow-up phase 999.x.
  const parent = path.join(tmpDir, 'Foo[Bar]');
  const child = path.join(parent, 'sub');
  await fs.mkdir(parent);
  await fs.mkdir(child);

  const result = await decode(encode(child));
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.reason).toBe('no_candidates');
  }
});
```

This converts an unknown unknown into a known limitation captured in the test suite, so the next refactor of `buildCandidates()` will know exactly what test to flip from `false` to `true`.

## Info

### IN-01: Runtime-redundant null assertion in success branch (pre-existing pattern propagated)

**File:** `packages/core/test/environment/decode.test.ts:120, 122-124, 138, 140-142, 155, 157-159, 172, 174-176, 189, 191-193, 206, 208-210`

**Issue:** Every new test contains:

```typescript
expect(result.data.decodedPath).not.toBeNull();
if (result.data.decodedPath !== null) {
  expect(result.data.decodedPath.toLowerCase()).toBe(subDir.toLowerCase());
}
```

`PathHashEntry.decodedPath` is typed `string | null` in `types.ts:64`, but inside `decode()` (line 76-77) it is assigned `candidates[0]` and the success branch only fires when `candidates.length > 0`. The runtime value in the success branch is therefore never null — `not.toBeNull()` cannot fail, and the inner `if` guard exists solely to satisfy TypeScript narrowing.

This is not a bug. The skeleton was instructed verbatim by the plan (`17-01-PLAN.md` `<action>`, lines 178-194 of the plan) and copied from the pre-existing template at `decode.test.ts:64-71`. The same redundancy already lives in the pre-existing round-trip test on line 64-70.

**Fix (optional, scope-creeping):** If the `string | null` type is preserved (deferred to a future phase), the cleanest cleanup is a single non-null helper applied across all round-trip tests:

```typescript
function expectDecodedTo(actual: string | null, expected: string) {
  expect(actual).not.toBeNull();
  expect(actual?.toLowerCase()).toBe(expected.toLowerCase());
}
```

Or, more directly, narrow the `PathHashEntry.decodedPath` type to `string` (since `decode()` never returns null in the success branch) and drop the guards. Out of scope for Phase 17 per the plan's "no algorithm changes" constraint.

### IN-02: Six near-duplicate test bodies could collapse into one parameterized test

**File:** `packages/core/test/environment/decode.test.ts:110-211`

**Issue:** The six new tests differ only in the fixture folder name and the test description string. The body shape is identical: `mkdir`, `encode`, `decode`, four assertions. A `describe.each` (Vitest supports `it.each`) would reduce the 102-line block to a ~25-line parameterized test:

```typescript
it.each([
  { className: 'apostrophe', folderName: "O'Brien" },
  { className: 'ampersand', folderName: 'Rock & Roll' },
  { className: 'brackets', folderName: 'Foo[Bar]' },
  { className: 'plus sign', folderName: '1+1' },
  { className: 'equals sign', folderName: 'key=val' },
  { className: 'percent sign', folderName: '100% Done' },
])('round-trips encode/decode for a folder name containing $className (CORE-13)', async ({ folderName }) => {
  const subDir = path.join(tmpDir, folderName);
  await fs.mkdir(subDir);
  const hash = encode(subDir);
  const result = await decode(hash);
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.hashDirName).toBe(hash);
    expect(result.data.decodedPath?.toLowerCase()).toBe(subDir.toLowerCase());
  }
});
```

**Fix:** Optional refactor. Note: the plan explicitly instructed the literal copy-paste shape (`17-01-PLAN.md` lines 195-204 — "Apply this skeleton six times — one per row of this table"), so the executor was correct to land it as-written. This is a stylistic improvement for a follow-up cleanup, not a defect.

### IN-03: Comment in `it.skipIf` test still references "lines 63-71 round-trip pattern" — drift after Phase 17 appended new tests

**File:** `packages/core/test/environment/decode.test.ts:102`

**Issue:** The comment reads `Success-branch contract: decoded path resolves through the symlink (mirrors lines 63-71 round-trip pattern).` After Phase 17 appended six new tests, the file is 244 lines and the original round-trip test still lives at lines 53-71, so the line reference happens to remain accurate — but the comment style of citing line numbers in a file under active modification is fragile. Any future edit before line 71 silently invalidates this comment.

**Fix:** Replace the line-number reference with a structural reference:

```typescript
// Success-branch contract: decoded path resolves through the symlink
// (mirrors the existing round-trip test in this file).
```

Single-line cleanup, no behavioral change.

---

_Reviewed: 2026-04-27T05:35:12Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
