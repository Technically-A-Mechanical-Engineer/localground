---
phase: 21-supply-chain-bin-hardening
reviewed: 2026-06-29T20:14:49Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - .github/dependabot.yml
  - .github/workflows/ci.yml
  - .github/workflows/release.yml
  - packages/mcp/src/index.ts
  - packages/mcp/test/smoke.test.ts
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 21: Code Review Report

**Reviewed:** 2026-06-29T20:14:49Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Adversarial review of the SEC-01 / CLI-06 supply-chain and bin-hardening changes. I treated every security-critical claim in the phase brief as a hypothesis to disprove rather than confirm, and validated the load-bearing ones against live shell behavior (the `ge()` floor-assert) and against the actual file state (SHA byte-counts, predicate ordering, fail-closed gate scan).

The core hardening goals hold up under scrutiny:

- **SHA pins are correct.** Both pinned SHAs (`actions/checkout@9c091bb...3e0` and `actions/setup-node@48b55a0...41e`) are exactly 40 lowercase hex characters and carry version comments. All five `uses:` refs across both workflows use these two pins consistently. No mutable `@v4`/`@v6` tags remain.
- **The pinact gate is genuinely fail-closed.** A full scan of `.github/workflows/` found zero `continue-on-error`, zero `|| true`, and zero skipping `if:` guards. `pinact run --verify --check` runs as a hard gate; `--check` exits non-zero on any drift. The pinact binary itself is exact-pinned (`@v4.1.0`, a Go module semver tag), not `@latest`.
- **The runtime floor-assert is numeric, not lexical.** I executed the `ge()` helper against the lexical-trap cases that would break a string compare (`9.9.9 >= 11.5.1` → FALSE, `11.10.0 >= 11.5.1` → TRUE, `22.9.0 >= 22.14.0` → FALSE). All resolved correctly. `sort -V` is doing true version-aware comparison. This was the single highest-risk item in the brief and it passes.
- **OIDC posture is preserved.** `id-token: write` present, `--provenance` on both real publishes AND both dry-run publishes, `package-manager-cache: false` retained, single-job `release` structure intact.
- **`isVersionRequest` is exact and correctly ordered.** The predicate uses `startsWith('--version=')` (with the `=`), NOT the over-broad `startsWith('--version')`, so `--versions`/`--versioned` fall through. It is case-sensitive. The `process.stdout.write` + `process.exit(0)` pair (lines 854-855) executes before `new StdioServerTransport()` (line 858), so a version request never hangs on a stdio transport. No argument-parser dependency was added — the imports are unchanged and the predicate is hand-rolled.

No blockers found. Two warnings (one a real-but-improbable edge case in the floor-assert, one a robustness gap in `decodeCopyToken` that this phase touched the surrounding file but did not introduce — flagged because it is within a reviewed file and is a genuine defect). Two info items.

## Warnings

### WR-01: Floor-assert treats a prerelease runtime as satisfying the floor (`sort -V` semver mismatch)

**File:** `.github/workflows/release.yml:39-43`
**Issue:** The `ge()` helper relies on GNU `sort -V`, which does NOT order prerelease tags the way SemVer 2.0.0 §11 specifies. Under SemVer, `22.14.0-nightly` is *lower* than `22.14.0`. Under `sort -V`, it sorts *after* `22.14.0`. I verified this directly:

```
$ printf '%s\n%s\n' "22.14.0" "22.14.0-nightly" | sort -V
22.14.0
22.14.0-nightly
```

Because `ge VERSION FLOOR` checks that `FLOOR` is the first line after sorting, `ge("22.14.0-nightly", "22.14.0")` returns TRUE — a prerelease runtime would be accepted as meeting the OIDC floor even though SemVer says it is below it. This is a real correctness gap in the comparator, not a lexical-vs-numeric bug (the numeric path is correct).

The practical exposure is low: GitHub-hosted `ubuntu-latest` provisions exact released Node versions via `setup-node` pinned to `22.14.0`, and npm is installed at the exact pin `11.18.0`, so neither operand should ever carry a prerelease suffix in this workflow. This is why it is a WARNING, not a BLOCKER — the inputs are controlled. But the assert is advertised as a correctness guard ("Floor-assert below guards correctness so staleness never drops below the OIDC floor"), and it has a hole for exactly the kind of nonstandard runtime an unexpected toolchain bump could introduce.

**Fix:** Either document that the assert assumes released (non-prerelease) versions, or strip any prerelease suffix before comparison so the guard matches its stated semantics:

```bash
ge() { # ge VERSION FLOOR -> exit 0 if VERSION >= FLOOR (numeric, dotted; prerelease stripped)
  local v="${1%%-*}" f="${2%%-*}"
  [ "$(printf '%s\n%s\n' "$f" "$v" | sort -V | head -n1)" = "$f" ]
}
```

### WR-02: `decodeCopyToken` does not validate `plan.chunks` entry shape before indexing

**File:** `packages/mcp/src/index.ts:81-115` (consumed at `464`)
**Issue:** `decodeCopyToken` validates that `parsed.plan.chunks` is an array (line 92) but never validates the shape of the elements inside it. On a subsequent (token-bearing) copy call, `currentChunk.entries` is read at line 464–465 (`const currentChunk = state.plan.chunks[state.currentIndex]; ... copyChunkEntries(state.source, state.target, currentChunk.entries)`). If a token is crafted (or corrupted) so that `chunks` is `[]` or contains an element lacking `entries`, then `currentChunk` is `undefined` and `currentChunk.entries` throws `TypeError: Cannot read properties of undefined (reading 'entries')`. That throw is not inside the per-tool try/catch, so it surfaces as an unhandled rejection from the tool handler rather than the clean `isError` Result the rest of this function is careful to return.

The token is base64 of attacker-influenceable JSON (the whole point of the `decodeCopyToken` validation block is to defend against malformed tokens), so "the token is always well-formed because we produced it" is not a safe assumption — the function already rejects relative paths and type mismatches for this reason. The `chunks`-element shape is the one gap in an otherwise thorough validator.

Note: the bounds check at line 457 (`state.currentIndex >= state.plan.totalChunks`) does NOT protect against this, because `totalChunks` is validated as a number independently of the actual `chunks.length` — a token with `totalChunks: 5` and `chunks: []` passes validation and reaches the undefined index.

**Fix:** Validate chunk-element shape inside `decodeCopyToken`, and/or assert `currentIndex` is in range of the real array:

```typescript
Array.isArray(parsed.plan.chunks) &&
parsed.plan.chunks.every(
  (c: unknown) =>
    typeof c === 'object' && c !== null &&
    Array.isArray((c as { entries?: unknown }).entries) &&
    (c as { entries: unknown[] }).entries.every((e) => typeof e === 'string')
) &&
parsed.plan.chunks.length === parsed.plan.totalChunks &&
```

## Info

### IN-01: Floor-assert step uses default shell while the pinact step declares `shell: bash`

**File:** `.github/workflows/release.yml:34-44` vs `.github/workflows/ci.yml:58-64`
**Issue:** The release floor-assert `run:` block uses POSIX constructs (`printf`, `sort -V`, `head`, function definition) but does not declare `shell: bash`. On `ubuntu-latest` the default `run:` shell is `bash` (with `-e`), so this works today. The CI `verify-pins` step *does* explicitly declare `shell: bash` for its comparable block. The inconsistency is cosmetic on Linux runners but makes the release workflow's shell assumption implicit rather than stated.
**Fix:** Add `shell: bash` to the floor-assert step for parity with the CI gate and to make the POSIX dependency explicit.

### IN-02: Duplicated `trackedSpawnServer`/`afterEach` reaper across two describe blocks

**File:** `packages/mcp/test/smoke.test.ts:94-111` and `176-193`
**Issue:** The child-process tracking helper and the `afterEach` kill-and-reap loop are copy-pasted verbatim into both `describe` blocks. Not a defect — both copies are correct and the reaping discipline is sound (every spawn is tracked, including the deliberately-hung fall-through children). Flagged only as duplication that a shared module-scope helper would eliminate. Test-file scope, no reliability impact.
**Fix:** Hoist `children`, `trackedSpawnServer`, and the `afterEach` body to a single shared helper used by both blocks.

---

_Reviewed: 2026-06-29T20:14:49Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

---

## Post-Review Resolution (2026-06-29, cross-model hardening)

A cross-model stress test (Codex GPT-5.4 + a Claude adversarial panel) re-examined these findings before phase closure:

- **WR-01 — CLOSED** (commit `dd27475`). The originally-proposed `sort -V` suffix-strip was empirically a **no-op** (0/16 vectors changed; `22.14.0-rc.1` passed under both the old and stripped forms). It was replaced with a fail-closed guard in `ge()` — `case "$1" in *[!0-9.]*) return 1` — that rejects any non-release runtime version, so a prerelease/nightly/build-metadata toolchain can never pass the OIDC floor regardless of `sort -V` ordering. Re-verified against 17 vectors.
- **WR-02 — UNCHANGED.** Pre-existing `decodeCopyToken` validation gap, out of scope for Phase 21; recorded as a backlog candidate.
- **Cross-model addition (positional version-flag false-positive) — BOUNDED** (commit `23a8ef2`). `isVersionRequest` now stops scanning at the `--` end-of-options terminator. `--config --version` remains a documented residual that would require an argument-parser forbidden by D-14.
- **IN-01, IN-02 — acknowledged, not actioned.** INFO/cosmetic, no reliability impact; left as advisory.
