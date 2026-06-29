# Feature Research — v3.1.0 "Hardening and Hygiene"

**Domain:** Hardening / correctness milestone for a shipped Claude Code migration toolkit (no new user-facing capability)
**Researched:** 2026-06-29
**Confidence:** HIGH (all five items verified against current source; SEC-01 best practice verified against current GitHub docs)

> **Framing note.** This is a hardening milestone. The "features" below are *correct behaviors of fixes*, not new capabilities. The template's Table-Stakes / Differentiator / Anti-Feature axis is reframed as **table-stakes correctness (must-have)** vs **nice-to-have polish**. Every item carries a crisp correct-behavior statement plus 2–4 testable acceptance criteria (observable "this is done and correct" conditions). No user-facing features are invented.
>
> **Verified against source (files actually read):** `packages/core/src/operations/seed.ts`, `packages/core/src/environment/decode.ts`, `packages/core/src/environment/looksLikeProject.ts`, `packages/mcp/src/index.ts`, `packages/cli/src/index.ts`, `packages/core/package.json`, `packages/core/test/environment/decode.test.ts`, `.github/workflows/release.yml`, `.github/workflows/ci.yml`, `.planning/debug/decoder-defects.md`, `.planning/phases/17-core-decoder-calibration/17-VERIFICATION.md`.

---

## Correctness Landscape

### Table-Stakes Correctness (Must-Have)

These are integrity invariants. A user is penalized (drift, supply-chain exposure, silent wrong answers) if they are absent; they get no "credit" for their presence.

| Item | Correct Invariant | Complexity | Classification |
|------|-------------------|------------|----------------|
| **BUILD-01** | Seed manifest `toolkitVersion` ALWAYS equals the package version, in dev build and packaged tarball; zero hardcoded version literals remain | LOW | **Table-stakes** — drift bug already bit once (v3.0.1 `--version` misreport → bad publish) |
| **SEC-01** | The `id-token: write` release job (highest-privilege surface) runs functionally identically, with every third-party `uses:` pinned to a 40-char commit SHA + version comment, and runner npm exact-pinned | LOW–MEDIUM | **Table-stakes** — supply-chain hardening of the only write-capable workflow |
| **CLI-06** | The mcp bin prints the version and exits 0 (without booting the stdio transport) for the realistic family of version-flag inputs, not just the literal `--version` | LOW | **Table-stakes** — current `process.argv.includes('--version')` is brittle; tarball smoke-test depends on it |
| **CORE-16** | A special char at the trailing edge of an *intermediate* path component encodes→decodes losslessly, AND the 17/17 currently-passing path-hashes do not regress | MEDIUM–HIGH | **Table-stakes correctness, but highest risk** — touches the load-bearing `buildCandidates()` OneDrive fix |

### Nice-to-Have Polish

| Item | Correct Behavior | Complexity | Classification |
|------|------------------|------------|----------------|
| **CORE-15** | Audit auto-discovery stops scanning `C:\Users\…` home root / drive roots / shallow system dirs, WITHOUT regressing D-01 (plain folders with no `.git`/`package.json` stay discoverable) | LOW | **Nice-to-have polish** — `looksLikeProject` already implements the intended boundary (read of source confirms). CORE-15 is an *audit/verification* task: prove the existing predicate holds, close any gap, lock it with a test. See item detail for the honest caveat. |

> **Honest uncertainty on CORE-15 classification.** The milestone phrasing is "*Audit* project-fingerprint filter so auto-discovery stops scanning all of `C:\Users\…`." Reading `looksLikeProject.ts`, the home-root / drive-root / shallow-path exclusions the requirement asks for are *already implemented and documented* (lines 36–67), and both audit surfaces already pipe auto-discovery through `.filter(looksLikeProject)` (CLI `index.ts:513`, MCP `index.ts:721`). So either (a) CORE-15 is a verification/test-lock task on already-correct behavior (nice-to-have polish), or (b) there is a residual real-world leak the bug report `audit-includes-root-paths` observed that the current predicate does NOT catch. I could not find the originating bug repro in `.planning`. **The roadmapper should open CORE-15 by reproducing the actual `audit-includes-root-paths` symptom first** — if it reproduces against current `main`, CORE-15 is a real table-stakes fix; if it does not, it is a regression-lock test. Detail below specifies the boundary either way.

---

## Per-Item Correct-Behavior Specs + Acceptance Criteria

### BUILD-01 — Seed `toolkitVersion` derived from `package.json`

**Current state (verified).** `packages/core/src/operations/seed.ts:139` hardcodes `toolkitVersion: '3.0.2'` as a string literal inside the manifest object. `@localground/core/package.json` is `"private": true` and version `3.0.2`; core is bundled into mcp + cli via tsup `noExternal`, so **core's own `package.json` is NOT shipped in either tarball** (only mcp/cli `package.json` ship). This is the same drift class that already caused a bad publish: in v3.0.1 a manifest-only bump left a hardcoded `--version` literal emitting `3.0.0` from `3.0.1` binaries (PROJECT.md Key Decision, 2026-06-29). The fix pattern is established: the mcp and cli bins already derive version at runtime via `JSON.parse(readFileSync(new URL('../package.json', import.meta.url)))` (`mcp/src/index.ts:19-21`, `cli/src/index.ts:15-17`).

**Correct invariant.** The `toolkitVersion` field of every seed manifest equals the version of the package whose code produced it — at all times, with no hardcoded literal anywhere in `seed.ts`. Because `seed()` lives in core (which is bundled, not published as its own package), the derivation must resolve to the **consuming package's** version (mcp's `3.x` / cli's `3.x`), which is the version a user actually installed.

**Design constraint the roadmapper must resolve (flagged, not decided here).** `seed()` is in core, but the shipped version number lives in mcp/cli `package.json`. A naive `readFileSync('../package.json')` relative to `seed.ts` would, post-bundle, resolve relative to the *consumer's* `dist/` — which is exactly what the existing bin pattern relies on, but it must be validated for the bundled-core case. Two viable approaches:
- **(A) Inject at call site:** mcp/cli pass their already-derived version into `seed(projectPath, toolkitVersion)`; core stays pure and does no file I/O for versioning. *Recommended* — keeps core deterministic, mirrors the bin pattern, testable without filesystem.
- **(B) Derive inside core** via `import.meta.url` walk to the nearest shipped `package.json`. Fragile across the bundle boundary; harder to unit-test. *Not recommended.*

**Acceptance criteria (testable):**
1. **No literal remains.** `grep -n "toolkitVersion: '" packages/core/src/operations/seed.ts` returns 0 matches (no quoted version literal); the value is sourced from a derived variable.
2. **Manifest matches package version (dev build).** A unit test seeds a temp git repo and asserts `manifest.toolkitVersion === <version read from the consuming package.json>` — not a string compare against a baked-in constant.
3. **Manifest matches package version (packaged tarball).** The `scripts/verify-tarball.mjs` guard (or an equivalent CI step) runs the packaged bin's seed path and asserts the emitted `toolkitVersion` equals the tarball's `package.json` version — same shape as the existing v3.0.1 version-equality gate that would have caught the `--version` drift.
4. **Single source of truth.** A bump of mcp/cli `package.json` version (with no code edit) changes the emitted `toolkitVersion` accordingly — proven by a test that reads the manifest after a version bump, or by the CI equality gate failing on intentional mismatch.

**Dependency / constraint callouts:** Mirrors the v3.0.1 "Runtime `--version` derivation + CI version-equality gate" Key Decision — reuse that gate's shape. Interacts with the bundle boundary (core is `noExternal`-bundled); approach (A) sidesteps the boundary entirely.

---

### SEC-01 (MD-01) — SHA-pin GitHub Actions + exact-pin runner npm

**Current state (verified).** `release.yml` uses floating major-version tags: `actions/checkout@v4` (line 19), `actions/setup-node@v6` (line 22), and runs `npm install -g npm@^11.5.1` (line 29 — a *range*, not exact). `release.yml` is the repo's highest-privilege surface: `permissions: id-token: write` (line 10) for OIDC trusted publishing. `ci.yml` uses `actions/checkout@v4` (line 28) and `actions/setup-node@v4` (line 31) but only has `contents: read` — lower stakes, but pinning it too is the consistent posture.

**Correct behavior.** Every `uses:` reference points to a full-length 40-character commit SHA, with a trailing comment naming the human-readable version (`uses: actions/checkout@<40-char-sha> # v4.2.2`). The SHA must belong to the action's *own* repository, not a fork. The runner npm upgrade pins an exact version (`npm@11.5.1`, not `^11.5.1`). The workflow runs **functionally identically** — same jobs, same steps, same OIDC publish, same provenance, same green result on a tag push. Pinning is a supply-chain control, not a behavior change.

**Why this matters (current, not stale):** Pinning to a full-length SHA is the only way to consume an action as an immutable release; it mitigates tag-tampering supply-chain attacks (the `tj-actions/changed-files` March 2025 compromise tampered all tags to point at malicious revisions). A floating `@v4` or a `^11.5.1` range silently pulls whatever the upstream tag/range currently resolves to. ([GitHub Docs — Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use); [StepSecurity pinning guide](https://www.stepsecurity.io/blog/pinning-github-actions-for-enhanced-security-a-complete-guide))

**Acceptance criteria (testable):**
1. **Every third-party `uses:` is SHA-pinned.** `grep -E 'uses:\s+\S+@[0-9a-f]{40}' .github/workflows/release.yml` matches every `uses:` line in the file; `grep -E 'uses:\s+\S+@v?[0-9]' release.yml` (floating tag form) returns 0 matches. Same applied to `ci.yml` for posture consistency.
2. **Each pin carries a version comment.** Every pinned `uses:` line ends with a `# v<x.y.z>` (or `# v<major>`) comment so the pin stays human-auditable and updatable (maintenance expectation: a maintainer bumps the comment + SHA together).
3. **Runner npm exact-pinned.** `release.yml` runs `npm install -g npm@11.5.1` (exact), not a `^`/`~` range; the upgrade still satisfies npm's ≥11.5.1 OIDC floor (the documented v3.0.1 constraint).
4. **Functionally identical run.** A real tag push (or a dry-run/workflow re-run on a throwaway tag) produces the same job graph and a green publish-with-provenance result — the pinned SHAs resolve to the same action versions previously used (verify by matching the comment version to the prior floating tag).

**Maintenance expectation (explicit):** Pins must stay *updatable*, not frozen. The version comment is the mechanism — a maintainer (or Dependabot, which understands SHA-pin + comment format) updates SHA and comment in lockstep. The roadmapper should note whether Dependabot `version-updates` for `github-actions` is in scope; it is the standard way to keep SHA pins from rotting. (Out of scope unless the milestone wants it — flag, don't assume.)

**Dependency / constraint callouts:** Must preserve the v3.0.1 Key Decision constraints — OIDC trusted publishing (no stored token), Node 22 + npm ≥11.5.1 floor. Do NOT change `permissions:`, the publish steps, or `--provenance` flags. This is a pin-only change.

---

### CLI-06 (MD-02) — Robust `--version` parsing in the mcp bin

**Current state (verified).** `mcp/src/index.ts:836` is a hand-rolled `if (process.argv.includes('--version')) { process.stdout.write(...); process.exit(0); }` inside `main()`, gated to run BEFORE `StdioServerTransport` setup (correct — a stdio transport would block forever). It only matches the exact literal token `--version`. By contrast, the **cli** bin uses Commander's `.version(VERSION)` (`cli/src/index.ts:24`), which robustly handles `--version`, the default `-V` alias, prints to stdout, and exits 0. CLI-06's intent: bring the mcp bin's version handling up to the cli bin's robustness, without pulling Commander into the MCP server (it has no other commands).

**Correct behavior / contract.** When invoked with a version-flag intent, the mcp bin prints **only** the version string (plus newline) to **stdout**, exits **0**, and does **NOT** boot the MCP stdio transport. Any input that is clearly not a version request falls through to normal server startup (transport boots; the diagnostic line goes to **stderr** per the stdout-discipline invariant). The version check must remain ordered before transport setup.

**Input-case matrix (enumerated) — recommended behavior:**

| Input | Expected output | Exit | Boots transport? | Recommendation rationale |
|-------|-----------------|------|------------------|--------------------------|
| `--version` | version string to stdout | 0 | No | Baseline; already works |
| `--version=foo` | version string to stdout (value ignored) | 0 | No | A `--version=...` token still *is* a version request; the attached value is meaningless for a boolean flag. Match the flag, ignore the value. (Mirrors how Commander treats it.) |
| `-v` | version string to stdout | 0 | No | **Recommend aliasing.** `-v` is the conventional short form users will try. Commander's default is uppercase `-V`; recommend supporting **both** `-v` and `-V` for the mcp bin to avoid a surprising miss. (Low cost — string membership check.) |
| `-V` | version string to stdout | 0 | No | Conventional short alias (Commander default); support it. |
| `--Version` / `--VERSION` | **Recommend: NOT** a match → falls through to server startup | n/a | Yes | **Recommend case-sensitive matching.** Unix CLI conventions are case-sensitive; `--Version` is not a standard spelling. Treating it as a match invites ambiguity. *However*, since this bin is invoked by `verify-tarball.mjs` and humans, a defensible alternative is a case-insensitive match that prints version. **Recommended: case-sensitive** (reject `--Version`) for convention fidelity; document the choice. The roadmapper should pick one and lock it with a test either way. |
| `version` (bare subcommand) | **Recommend: NOT** a match → server startup | n/a | Yes | The MCP server has no subcommands; a bare `version` arg is not a recognized flag. Falling through is correct (no Commander-style subcommand surface here). |
| unknown flag (e.g. `--foo`) | no version output → server startup | n/a | Yes | Unknown args are ignored by the version check and the server boots normally (current behavior; preserve it). |
| `--version` combined with other args (e.g. `--version --debug`) | version string to stdout | 0 | No | Version intent wins and short-circuits — `--version` present anywhere in argv triggers print-and-exit before transport. Preserves the existing "check before transport" ordering. |

**Acceptance criteria (testable):**
1. **Positive matches print + exit 0 + no transport.** A smoke test spawns the built mcp bin with each of `--version`, `--version=foo`, `-v`, `-V` and asserts: stdout equals the package version (+newline), exit code 0, and the process exits promptly (does not hang waiting on stdio — proving the transport never booted).
2. **Negative cases fall through.** Spawning with `--Version` (per the locked case-sensitivity decision) and with no args boots the server: the process does NOT exit 0 immediately, and the `running on stdio` diagnostic appears on **stderr** (never stdout). Test must use a timeout + kill to assert "still running."
3. **Stdout discipline preserved.** In the server-startup (non-version) path, stdout receives zero non-JSON-RPC bytes — the existing `stdout-discipline.test.ts` invariant (CRIT-1) still holds; the version string only ever goes to stdout in the print-and-exit path.
4. **verify-tarball still green.** The packaged-tarball smoke check in `scripts/verify-tarball.mjs` (which invokes the bin's `--version` escape hatch) continues to pass against the refactored parser.

**Dependency / constraint callouts:** Must preserve the "version check before `StdioServerTransport`" ordering (`index.ts:831-844`) and the stderr-only logging invariant. Recommend a tiny pure helper (e.g. `isVersionRequest(argv: string[]): boolean`) so the matrix above is unit-testable in isolation without spawning a process. Do NOT introduce Commander into the mcp package for a single flag.

---

### CORE-15 — Audit project-fingerprint filter (stop scanning `C:\Users\…`)

**Current state (verified).** `packages/core/src/environment/looksLikeProject.ts` already implements a deliberately **path-shape-only** predicate (Key Decision D-01: NO `.git`/`package.json` marker check, to support plain-folder projects). It rejects: filesystem root (`C:\`, `/`), the literal home dir (`os.homedir()`), paths < 2 segments below home, and paths < 2 segments below root when home is not an ancestor. Both audit surfaces pipe auto-discovery through `.filter(looksLikeProject)` (CLI `index.ts:513`, MCP `index.ts:721`); user-supplied `--projects` paths are intentionally NOT filtered (explicit input respected).

**Correct boundary (precise) — what SHOULD qualify vs MUST be excluded:**

| Path | Qualifies as project? | Reason |
|------|----------------------|--------|
| `C:\Users\bob\Projects\my-app` | ✅ yes | ≥2 segments below home |
| `C:\Users\bob\Documents\Claude-Home\my-project` | ✅ yes | ≥2 segments below home |
| `C:\Projects\my-app` | ✅ yes | ≥2 segments below root (home not an ancestor) |
| `/home/bob/Projects/my-app` | ✅ yes | ≥2 segments below home |
| **`C:\Users\bob`** (home root) | ❌ excluded | literal home dir — **the core CORE-15 symptom** |
| `C:\Users\bob\Documents` | ❌ excluded | 1 segment below home (too shallow) |
| `C:\` / `/` (drive/fs root) | ❌ excluded | filesystem root |
| `C:\foo` | ❌ excluded | 1 segment below root, not under home |
| `C:\Windows`, `C:\Program Files` | ❌ excluded (by depth rule) | 1 segment below root → fails the ≥2-below-root rule |

**CRITICAL CONSTRAINT (must not regress D-01).** The predicate must remain **path-shape-only**. A plain folder with no `.git` and no `package.json` (e.g. `C:\Users\bob\Projects\plain-notes`) MUST still qualify as a project — the toolkit explicitly supports plain-folder projects. Any "fingerprint" the roadmapper adds must be a *path-shape/depth* fingerprint, NOT a marker-file fingerprint. Adding a `.git`/`package.json` existence check to "tighten" discovery would be a D-01 regression and is an **anti-feature** (see below).

**The honest gap (flagged for the roadmapper).** Per source, the home root `C:\Users\bob` is already excluded. So CORE-15's "stop scanning all of `C:\Users\…`" symptom should already be handled *unless* the originating `audit-includes-root-paths` bug observed a path the current rules let through. Candidate leak classes the roadmapper should reproduce/probe:
- A path-hash that decodes to `C:\Users\bob\Documents` (1-below-home) — *already excluded*, so not it.
- A path exactly 2 segments below home that is a system/junk dir (e.g. `C:\Users\bob\AppData\Local` → AppData is 1-below, Local is 2-below → **qualifies today**). If audit is scanning `AppData` subtrees, the fix is a *targeted denylist of known non-project home subdirs* (`AppData`, `.cache`, `node_modules`, etc.), which preserves D-01.
- Drive-root-adjacent system dirs that happen to be ≥2 below root.

**Acceptance criteria (testable):**
1. **Repro-or-refute first.** A diagnostic (re-run of the `audit-includes-root-paths` symptom against the user's `~/.claude/projects/`, or a synthetic fixture set) demonstrates whether any non-project path currently survives `looksLikeProject`. Result is documented (this is the gate that decides "real fix" vs "regression-lock").
2. **Home root and drive root excluded.** Unit tests assert `looksLikeProject('C:\\Users\\bob') === false`, `looksLikeProject('C:\\') === false`, `looksLikeProject('/') === false`, `looksLikeProject('/home/bob') === false` (these likely already pass — lock them).
3. **D-01 preserved (plain folder still discovers).** A unit test creates a real-fs temp dir ≥2 below a simulated home with **no** `.git` and **no** `package.json` and asserts `looksLikeProject(...) === true`. This is the regression guard against accidentally adding a marker-file check.
4. **Targeted exclusion of any identified leak.** If criterion 1 finds a leak (e.g. `AppData` subtrees), a unit test asserts the specific leaking shape is now excluded AND a legitimate sibling project at the same depth still qualifies — proving the exclusion is targeted, not a blanket depth increase that would drop real projects.

**Dependency / constraint callouts:** D-01 (path-shape-only predicate) is the hard constraint — flag it loudly to the executor. The fix surface is `looksLikeProject.ts` (core); both audit surfaces already consume it, so no changes needed in CLI/MCP unless the diagnostic finds the filter is bypassed somewhere. User-supplied `--projects` must remain unfiltered.

---

### CORE-16 — Path-hash decode trailing-edge special-character round-trip

**Current state (verified — this is backlog item 999.7).** Phase 17 widened the `encode()` regex to 7 special-char classes and added 6 leaf-position round-trip tests; 17/17 currently-extant path-hashes round-trip and all `no_candidates` failures are documented as deleted source folders. The **residual defect** lives in `decode.ts` `buildCandidates()` (lines 144–200), explicitly excluded from Phase 17's scope (it is the load-bearing v3.0.0 OneDrive fix). Verified root cause (17-VERIFICATION cross-check, lines 137–161): `encode()` strips the trailing hyphen via `.replace(/^-+|-+$/g, '')` (decode.ts:89), so when an intermediate component ends in a special char (e.g. `Trailing&`), its encoded form is indistinguishable from one ending in a non-special char. `buildCandidates()` then builds `prefix = encodedName + '-'` (decode.ts:187) and the single-hyphen prefix-match collapses two distinct path shapes into one → `no_candidates`.

**Empirically confirmed boundary (from 17-VERIFICATION):**
- **FAILS:** `tmpDir/Trailing&/sub` (and `'`, `[`, `]`, `+`, `=`, `%`, and pre-existing `(`, `)`, `.`) — special char at the **trailing edge of a parent component that has a deeper child**. Encoded tail collapses to `...-Trailing--sub`.
- **SUCCEEDS (must not regress):** `tmpDir/Acme & Co/sub` (interior `&`) → `...-Acme---Co-sub`; `tmpDir/Acme & Co` (leaf, no child); the canonical `OneDrive - ThermoTek, Inc/...` shape (interior occurrence).

**Correct round-trip contract.** For any folder name where a CORE-13 special char (`'` `&` `[` `]` `(` `)` `+` `=` `%`) sits at the **trailing edge of an intermediate (non-leaf) path component**, `encode()` followed by `decode()` resolves back to the original filesystem path (case-insensitive on Windows), provided the folder physically exists. AND: the 17/17 currently-passing path-hashes — including the canonical OneDrive corporate path with interior ` - ` / `, ` — continue to round-trip unchanged.

**Suggested fix direction (from 999.7 / 17-VERIFICATION, for the roadmapper — not a decision).** Teach `buildCandidates()` to try BOTH `prefix = encodedName + '-'` AND `prefix = encodedName + '--'` so the stripped-trailing-hyphen case is recoverable. This is a candidate-generation change bounded by the existing `maxCandidates = 20` ceiling. **High risk:** `buildCandidates()` is the load-bearing OneDrive fix; any change requires the full v3.0.0 OneDrive regression set to stay green.

**Acceptance criteria (testable):**
1. **Trailing-edge round-trips (the fix).** A real-fs test creates `tmpDir/Trailing&/sub` (one fixture per CORE-13 class at the trailing edge of a parent with a deeper child) and asserts `decode(encode(deepPath))` resolves to the original path (case-insensitive). All 7 newly-covered classes pass; the pre-existing `(`, `)`, `.` classes at the same shape also pass (parens precedent — they share the defect today).
2. **No regression — 17/17 baseline.** The existing decode test suite (the 6 leaf-position CORE-13 tests + the OneDrive/interior cases + the round-trip fixtures) stays green. Specifically `tmpDir/Acme & Co/sub` (interior) and the canonical `OneDrive - ThermoTek, Inc\...\Projects\...` decode continue to succeed.
3. **OneDrive load-bearing path proven.** A test reproducing the canonical corporate shape `…OneDrive - ThermoTek, Inc\Documents\Projects\<sub>` (interior ` - ` AND `, `) decodes correctly — the v3.0.0 fix that `buildCandidates()` was protected for is not broken by the trailing-edge change.
4. **Bounded — no runaway.** The `maxCandidates = 20` ceiling still holds; a pathological hash with many sibling matches returns within the cap (no combinatorial blow-up introduced by trying the extra `--` prefix). Assert via a fixture with many siblings that decode terminates and returns ≤20 candidates.

**Dependency / constraint callouts:** **No-regression on the v3.0.0 OneDrive fix is the hard constraint** — flag it to the executor as loudly as D-01 is flagged for CORE-15. The change is confined to `buildCandidates()` prefix-match logic in `decode.ts`; `encode()` is already correctly calibrated (Phase 17) and should NOT be touched. This is the highest-risk item in the milestone (touches load-bearing decode algorithm) and is a strong candidate for deeper phase-specific research before implementation.

---

## Anti-Features (Commonly Tempting, Avoid)

| Anti-Feature | Why Tempting | Why Problematic | Correct Approach |
|--------------|--------------|-----------------|------------------|
| Add `.git`/`package.json` marker check to "tighten" CORE-15 discovery | Feels like a more accurate "is this a project?" test | **Regresses D-01** — the toolkit explicitly supports plain-folder projects with no markers | Keep `looksLikeProject` path-shape-only; if a leak exists, add a *targeted denylist* of known non-project home subdirs (`AppData`, `.cache`, …) |
| Rewrite `buildCandidates()` algorithm wholesale for CORE-16 | A clean-sheet decoder feels safer than patching | High regression risk on the load-bearing v3.0.0 OneDrive fix; unbounded scope | Minimal, additive change (try `+'-'` AND `+'--'`); gate behind the full OneDrive regression set |
| Special-case `---`/`--` separators in the decoder | Looks like a quick win for the OneDrive shape | Won't generalize — breaks for future punctuation combos; the project already rejected this in the decoder-defects analysis | Stay with filesystem-listing reverse-encode; fix the prefix-match, not the separator guessing |
| Derive `toolkitVersion` inside core via `import.meta.url` filesystem walk (BUILD-01 approach B) | Keeps the change "inside" the seed function | Fragile across the tsup bundle boundary; hard to unit-test; reintroduces file I/O into a deterministic core fn | Inject version at the mcp/cli call site (approach A) — core stays pure |
| Freeze SHA pins permanently (SEC-01) | "Pinned = done, never touch" | Pins rot; security patches in actions never land | Pin + version comment + (recommended) Dependabot `github-actions` updates so pins stay updatable |
| Pull Commander into the mcp package for CLI-06 | The cli bin already uses it | Heavyweight for a single boolean flag; expands the MCP server's dependency surface | Small pure `isVersionRequest(argv)` helper, unit-tested in isolation |

---

## Item Dependencies & Sequencing

```
BUILD-01 ──(reuses)──> v3.0.1 "runtime version derivation + CI version-equality gate" pattern
CLI-06   ──(must preserve)──> stdout-discipline invariant (CRIT-1) + verify-tarball smoke check
CORE-16  ──(must not regress)──> v3.0.0 OneDrive buildCandidates fix  [HARD CONSTRAINT]
CORE-15  ──(must not regress)──> D-01 path-shape-only predicate       [HARD CONSTRAINT]
SEC-01   ──(must preserve)──> OIDC trusted publishing + npm ≥11.5.1 floor (v3.0.1 decisions)
```

### Dependency notes
- **No hard inter-item dependencies.** All five are independent fixes; any phase order works. BUILD-01, CLI-06, SEC-01 are low-risk and can batch. CORE-15 is low-risk but needs a repro-first diagnostic. CORE-16 is the high-risk outlier.
- **CORE-16 should be last or isolated.** It touches the load-bearing decode algorithm; isolate it so its regression surface doesn't entangle the cheaper fixes.
- **BUILD-01 + CLI-06 share the "runtime-derive, don't hardcode" theme** — natural to pair in one phase, reusing the v3.0.1 CI version-equality gate.

---

## Phase-Structure Recommendation (for the roadmapper)

| Suggested phase | Items | Risk | Research-flag |
|-----------------|-------|------|---------------|
| Versioning hygiene | BUILD-01 (+ optionally CLI-06) | LOW | No — established runtime-derive pattern |
| Supply-chain pin | SEC-01 | LOW–MED | No — mechanical pin + verify functionally identical |
| Arg-parse robustness | CLI-06 | LOW | No — small pure helper, matrix locked by tests |
| Audit filter audit | CORE-15 | LOW | **Light** — must repro `audit-includes-root-paths` first to know if it's a fix or a lock |
| Decoder trailing-edge | CORE-16 | **HIGH** | **Yes — deeper research recommended** before implementation; load-bearing algorithm, full OneDrive regression set required |

---

## Sources

- Source code (verified directly): `packages/core/src/operations/seed.ts`, `packages/core/src/environment/decode.ts`, `packages/core/src/environment/looksLikeProject.ts`, `packages/mcp/src/index.ts`, `packages/cli/src/index.ts`, `packages/core/package.json`, `packages/core/test/environment/decode.test.ts`, `.github/workflows/release.yml`, `.github/workflows/ci.yml`
- Project decision record: `.planning/PROJECT.md` (Key Decisions — D-01 path-shape-only predicate; v3.0.1 runtime-version-derivation + CI version-equality gate; OIDC + npm 11.5.1 floor)
- Decoder defect provenance: `.planning/debug/decoder-defects.md`; `.planning/phases/17-core-decoder-calibration/17-VERIFICATION.md` (999.7 trailing-edge cross-check, empirical fail/pass boundary)
- Acceptance-criteria style reference: `.planning/milestones/v3.0.1-REQUIREMENTS.md`
- SEC-01 best practice (current): [GitHub Docs — Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use); [StepSecurity — Pinning GitHub Actions guide](https://www.stepsecurity.io/blog/pinning-github-actions-for-enhanced-security-a-complete-guide); [GitHub Changelog — SHA pinning policy (2025-08-15)](https://github.blog/changelog/2025-08-15-github-actions-policy-now-supports-blocking-and-sha-pinning-actions/)

---
*Feature research for: v3.1.0 Hardening and Hygiene milestone (LocalGround Toolkit)*
*Researched: 2026-06-29*
