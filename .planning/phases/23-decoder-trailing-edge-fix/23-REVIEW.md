---
phase: 23-decoder-trailing-edge-fix
reviewed: 2026-06-30T19:37:34Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - packages/core/src/environment/decode.ts
  - packages/core/test/environment/decode.test.ts
findings:
  critical: 0
  warning: 3
  info: 1
  total: 4
status: issues_found
---

# Phase 23: Code Review Report

**Reviewed:** 2026-06-30T19:37:34Z
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

CORE-16 fixes a path-hash decoder asymmetry by adding an additive `encodedName + '--'` recursion branch (Case 3) in `buildCandidates`, plus a case-insensitive verify-then-return filter in `decode()`. The change is correctly scoped and minimal.

Three hard checks pass cleanly:

- **`encode()` is byte-for-byte unchanged.** The regex at `decode.ts:106` is identical to the pre-phase commit (`8fbf208^:decode.ts:89`). The hard requirement holds — no Critical finding here.
- **Recursion terminates.** `nextRemaining` strictly shrinks on every recursive call (≥1 char consumed in Case 2, ≥2 in Case 3), so depth is bounded by `remainingHash.length` even under symlink cycles. No infinite-loop / DoS via combinatorial explosion: `maxCandidates=20` caps accepted results, and total `readdir` nodes are bounded by the real directory subtree.
- **Budget arithmetic is sound.** When `results.length >= maxCandidates` the loop breaks at line 182 *before* Case 2/3 execute, so the budget `maxCandidates - results.length` passed to recursive calls is always ≥1 — a zero budget is never propagated.

The substantive concern is **not** that the fix breaks anything — it is that the D-01 round-trip verification is presented (in its own comment) as a stronger correctness guarantee than it actually provides. `encode()` is lossy and many-to-one; "round-trips to the input hash" does not uniquely identify the intended path when an encode-colliding sibling exists on disk. The shipped D-01 test does not exercise that collision and therefore does not guard the documented risk. Details below.

The intentional `Foo&&` double-trailing-special `no_candidates` boundary (test at `decode.test.ts:356`) is out of CORE-16 scope per the review brief and is **not** flagged.

## Warnings

### WR-01: Round-trip verify can return a wrong-but-existing path on an encode-collision

**File:** `packages/core/src/environment/decode.ts:62-78`
**Issue:**
The D-01 filter returns the first candidate whose `encode(c).toLowerCase()` equals the input hash. The inline comment (lines 62-67) frames this as returning "ONLY a candidate that actually round-trips," implying uniqueness. But `encode()` is many-to-one: multiple distinct *real* on-disk paths can encode to the identical hash. For the hash `Foo--bar`, all of the following round-trip identically (verified empirically):

| Real path on disk | `encode()` |
|---|---|
| `Foo&\bar` (intended) | `Foo--bar` |
| `Foo&-bar` (single folder literally named `Foo&-bar`) | `Foo--bar` |
| `Foo-\bar` (folder `Foo-`, then `bar`) | `Foo--bar` |
| `Foo--bar` (single folder literally named `Foo--bar`) | `Foo--bar` |

When two or more of these coexist under the same parent, `candidates.find(...)` returns whichever the recursion/`readdir` ordering surfaces first — which is not guaranteed to be the intended one. The verify filter rejects encode-*mismatching* siblings (the genuine value of D-01), but it cannot disambiguate encode-*colliding* siblings. This is inherent to the lossy `encode()`; the new Case 3 branch surfaces the collision rather than causing it, which is why it warrants a Warning rather than a Blocker — but the comment's "ONLY a candidate that actually round-trips" wording overstates the guarantee and should be corrected so a future maintainer does not rely on uniqueness.

**Fix:**
Either (a) tighten the comment to state the real guarantee, or (b) when more than one candidate round-trips, prefer the one that also passes `fs.access` and/or signal the ambiguity rather than silently picking the first. Minimum acceptable fix is (a):

```typescript
// D-01: verify-then-return. encode() is LOSSY and many-to-one — multiple distinct on-disk
// paths can encode to the same hash (e.g. "Foo&\bar", "Foo&-bar", and "Foo--bar" all encode
// to "Foo--bar"). This filter rejects candidates whose re-encode does NOT match the input hash
// (the spurious siblings the additive '--' branch surfaces), but it does NOT disambiguate among
// multiple candidates that DO round-trip. When colliding siblings coexist on disk, the FIRST
// round-tripping candidate (by readdir/recursion order) is returned; this is acceptable because
// encode() cannot recover the intended separator, but callers must not assume uniqueness.
const verified = candidates.find(
  (c) => encode(c).toLowerCase() === hashDirName.toLowerCase(),
);
```

If stronger behavior is wanted, prefer an existing path among round-trippers:

```typescript
const roundTrippers = candidates.filter(
  (c) => encode(c).toLowerCase() === hashDirName.toLowerCase(),
);
let verified: string | undefined = roundTrippers[0];
for (const c of roundTrippers) {
  try { await fs.access(c); verified = c; break; } catch { /* keep looking */ }
}
```

### WR-02: D-01 test does not exercise an actual encode-collision — it is a weak guard

**File:** `packages/core/test/environment/decode.test.ts:235-258`
**Issue:**
The test named "verify-then-return picks the round-tripping sibling, not a spurious one" creates `Foo&/bar` (correct) and `Foo/bar` (spurious). But `encode('Foo/bar') === 'Foo-bar'`, which is a *different* hash from the input `Foo--bar`. The spurious sibling is therefore rejected by the trivial prefix logic, not by any disambiguation among colliding round-trippers. The test passes even if D-01's verify were materially weaker, because it never constructs a sibling that genuinely collides under `encode()` (e.g. a folder literally named `Foo&-bar`, or `Foo--bar`). It validates that an encode-*mismatching* sibling is excluded — which Case 2's prefix arithmetic already guarantees — not the harder property the comment claims.

**Fix:**
Add a sibling that encodes to the *same* hash and assert the documented behavior (or assert the ambiguity is surfaced, per whichever WR-01 resolution is chosen):

```typescript
it('CORE-16/D-01: encode-colliding siblings — documents the round-trip ambiguity', async () => {
  const intended = path.join(tmpDir, 'Foo&');          // encode("Foo&/bar") === "Foo--bar"
  await fs.mkdir(intended);
  await fs.mkdir(path.join(intended, 'bar'));

  const collider = path.join(tmpDir, 'Foo&-bar');       // encode("Foo&-bar") === "Foo--bar" (collides)
  await fs.mkdir(collider);

  const hash = encode(path.join(intended, 'bar'));      // "Foo--bar"
  const result = await decode(hash);
  expect(result.success).toBe(true);
  // Assert the behavior WR-01 settles on (e.g. an existing round-tripper is returned),
  // rather than leaving the collision untested.
});
```

### WR-03: Case-insensitive compare widens the wrong-path surface on case-sensitive filesystems

**File:** `packages/core/src/environment/decode.ts:68-70`
**Issue:**
The compare is lower-cased on both sides. This is correct and necessary on Windows (drive letter is upper-cased by `decode()` at line 131 while the input hash may carry a lowercase drive — a strict compare would false-reject and regress L-03). However, on a case-sensitive filesystem (Linux), `Foo/` and `foo/` are distinct directories, yet `encode('foo/bar').toLowerCase() === encode('Foo/bar').toLowerCase()`. A hash intended for `Foo/bar` can verify-match a real `foo/bar` sibling, returning the wrong path. This is a narrower instance of WR-01 specific to letter-case collisions and applies only where path components differ solely by case under a case-sensitive FS — uncommon for Claude Code project directories, hence Warning not Blocker.

**Fix:**
Gate the case-insensitive compare to Windows (or to the drive-letter prefix only), so case-sensitive platforms use a strict compare:

```typescript
const isWindows = process.platform === 'win32';
const verified = candidates.find((c) =>
  isWindows
    ? encode(c).toLowerCase() === hashDirName.toLowerCase()
    : encode(c) === hashDirName,
);
```

Note: `isWindows` is already computed at line 51 in `decode()` and can be reused.

## Info

### IN-01: Case 2 and Case 3 both fire for the same entry on a `--` boundary

**File:** `packages/core/src/environment/decode.ts:204-230`
**Issue:**
When `remainingHash` starts with `encodedName + '--'`, it also satisfies `startsWith(encodedName + '-')`, so both the Case 2 branch (lines 204-213) and the Case 3 branch (lines 221-230) recurse from the same entry — Case 2 consuming one hyphen, Case 3 consuming two. They descend into different remaining-hash continuations, so this is correct (both candidates are explored and the bad one is filtered by D-01), and the budget re-reads `results.length` between them so accounting stays correct. It is mild redundant traversal at `--` boundaries only. This is consistent with the documented additive design intent — recorded as Info for maintainer awareness, not as a defect.
**Fix:** No change required. If the redundancy ever matters, Case 2 and Case 3 could be made mutually exclusive at a confirmed `--` boundary, but doing so risks dropping a legitimately-named single folder containing a literal hyphen (e.g. `Foo-`) and should not be done without a regression test. Leave as-is.

---

_Reviewed: 2026-06-30T19:37:34Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
