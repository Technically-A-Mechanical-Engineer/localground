# Architecture Research

**Domain:** v3.1.0 "Hardening and Hygiene" — integration-point mapping for 5 correctness/supply-chain fixes onto the existing npm-workspaces monorepo
**Researched:** 2026-06-29
**Confidence:** HIGH (all findings grounded in the actual codebase — file paths, line numbers, build configs, and the Phase-17 verification record all read directly)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  CONSUMERS (published to npm)                                        │
│  ┌──────────────────────────┐    ┌──────────────────────────┐       │
│  │ @localground/mcp         │    │ @localground/cli         │       │
│  │ bin: localground-mcp     │    │ bin: localground         │       │
│  │ packages/mcp/src/index.ts│    │ packages/cli/src/index.ts│       │
│  │ - 9 MCP tools            │    │ - 7 Commander commands   │       │
│  │ - --version short-circuit│    │ - .version(VERSION)      │       │
│  │   (line 836)             │    │   (line 24)              │       │
│  └────────────┬─────────────┘    └────────────┬─────────────┘       │
│               │  tsup noExternal: ['@localground/core']             │
│               │  → core source is INLINED into each dist/index.js   │
├───────────────┴───────────────────────────────┴────────────────────┤
│  @localground/core  (private, bundled — never published standalone) │
│  packages/core/src/index.ts  (flat barrel, D-07)                    │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────────┐     │
│  │environment/│  │integrity/  │  │operations/                 │     │
│  │ detect     │  │ checksum   │  │ copy   seed   verify       │     │
│  │ decode ◄───┼──┼─ CORE-16   │  │ scan   chunk               │     │
│  │ encode     │  │ compare    │  │   ▲                        │     │
│  │ classify   │  │ placeholder│  │   └─ seed ◄── BUILD-01     │     │
│  │ looksLike  │  │ gitCheck   │  │                            │     │
│  │ Project◄───┼──┼─ CORE-15   │  └────────────────────────────┘     │
│  └────────────┘  └────────────┘                                     │
├─────────────────────────────────────────────────────────────────────┤
│  SUPPLY CHAIN (no app code — YAML + one verification script)        │
│  .github/workflows/ci.yml      ◄── SEC-01 (pin checkout/setup-node) │
│  .github/workflows/release.yml ◄── SEC-01 (pin actions + runner npm)│
│  scripts/verify-tarball.mjs    (version-equality gate; touched only │
│                                 if BUILD-01 needs a manifest assert) │
└─────────────────────────────────────────────────────────────────────┘
```

### The one architectural fact that drives BUILD-01

`tsup` in both mcp and cli is configured with `noExternal: ['@localground/core']`
(`packages/mcp/tsup.config.ts:16`, `packages/cli/tsup.config.ts:16`). This **inlines
core's source** into each consuming package's `dist/index.js`. There is no separate
`@localground/core` on disk at runtime in a published tarball — which is why core is
declared in `devDependencies`, not `dependencies` (Key Decision "Bundle Option A").

Consequence: any code that lives in core and tries to read its OWN `package.json` via
`new URL('../package.json', import.meta.url)` will, after bundling, resolve relative to
the **consumer's** `dist/` directory — not core's. That path lookup is the load-bearing
constraint for BUILD-01 and is analyzed per-item below.

## Per-Item Integration Analysis

### BUILD-01 — Seed `toolkitVersion` derived from package.json

**Status:** MODIFIED (core) + MODIFIED (core build config) — touches a bin only indirectly.

**Current defect site:** `packages/core/src/operations/seed.ts:139` — `toolkitVersion: '3.0.2'`
is a hardcoded string literal inside the manifest object. This is the exact same drift
class that v3.0.1 fixed for `--version` (the 3.0.1 binaries misreported 3.0.0).

**The pattern the bins already use — and why seed CANNOT copy it verbatim:**

Both bins derive their version at runtime:
- `packages/mcp/src/index.ts:19-21` — `JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version`
- `packages/cli/src/index.ts:15-17` — identical pattern

This works for the bins because `dist/index.js` sits one level below the package root, so
`../package.json` resolves to the mcp/cli manifest. **Seed cannot reuse this** because
seed.ts is bundled INTO the consumer. At runtime `import.meta.url` inside the inlined seed
code points into `packages/{mcp,cli}/dist/`, so `../package.json` would resolve to the
mcp/cli manifest — coincidentally the right *value* (versions are kept in lockstep, see
`release.yml:49-51` equality gate) but the wrong *semantics*: it couples core's manifest
version to whichever consumer bundled it, and breaks if a test imports `seed` from core's
own `dist/` (where `../package.json` = core's private manifest, currently also 3.0.2 but
conceptually a different thing). The runtime-readFileSync approach is fragile across the
bundle boundary.

**Recommendation: build-time injection via tsup `define`, sourced from core's package.json.**

This is the bundle-survival-safe option and it is opinionated for a reason: a compile-time
constant has no filesystem dependency, so it survives inlining into mcp+cli unchanged, and
it is identical whether seed runs from core's own dist (tests) or from a consumer bundle.

Concrete shape:
- `packages/core/tsup.config.ts` (MODIFIED) — add a `define` that injects the version:
  ```ts
  import pkg from './package.json' with { type: 'json' };
  export default defineConfig({
    // ...existing...
    define: { __TOOLKIT_VERSION__: JSON.stringify(pkg.version) },
  });
  ```
  Because mcp/cli inline core's *compiled* output (the `define` is already substituted by
  the time core builds), the constant is frozen into core's `dist` and carried verbatim
  into the consumer bundles. tsup runs core's build first (`package.json:13` build script
  is core → mcp → cli in order), so the substitution is already baked when mcp/cli bundle.
- `packages/core/src/operations/seed.ts:139` (MODIFIED) — replace the literal with the
  injected constant, plus a `declare const __TOOLKIT_VERSION__: string;` ambient at top of
  the file (or a small `version.ts` shim) so `tsc --build:check` is satisfied.

  Note: a per-package `tsconfig` will need the ambient declaration visible. The minimal
  path is a one-line `declare` block at the top of seed.ts; the slightly cleaner path is a
  new `packages/core/src/util/version.ts` that exports the constant and is imported by
  seed. Recommend the `util/version.ts` shim (NEW file) — it gives a single typed surface
  if any future core function also needs the version, and keeps the `declare` out of the
  operation file. Do NOT export it from the public barrel unless a consumer needs it.

**Why not a third option (read core/package.json at runtime via createRequire):** that
reintroduces a filesystem dependency that the bundle would have to resolve, defeating the
whole point. The `verify-tarball.mjs` `--version` gate (line 210-213) does not check the
seed manifest, so BUILD-01 does not require a new assertion there — but a roadmap may
choose to add a seed-manifest version assertion to the core test suite
(`packages/core/test/operations/seed.test.ts`, currently no `toolkitVersion` assertion at
line 41-51) to guard the drift the same way verify-tarball guards the bin.

**Files:**
- MODIFIED `packages/core/tsup.config.ts` (add `define`)
- NEW `packages/core/src/util/version.ts` (export injected constant) — or inline `declare`
- MODIFIED `packages/core/src/operations/seed.ts:139`
- OPTIONAL MODIFIED `packages/core/test/operations/seed.test.ts` (drift-guard assertion)

---

### SEC-01 (MD-01) — SHA-pin GitHub Actions + exact-pin runner npm

**Status:** WORKFLOW-ONLY (no application code, no TypeScript, no rebuild).

**Files and the exact `uses:` lines to pin to a full commit SHA:**

`.github/workflows/ci.yml`:
- line 28 — `actions/checkout@v4` → `actions/checkout@<40-char-sha>  # v4.x.x`
- line 31 — `actions/setup-node@v4` → `actions/setup-node@<sha>  # v4.x.x`

`.github/workflows/release.yml` (the highest-privilege surface — `id-token: write` at line 10):
- line 19 — `actions/checkout@v4` → `actions/checkout@<sha>  # v4.x.x`
- line 23 — `actions/setup-node@v6` → `actions/setup-node@<sha>  # v6.x.x`

  (Note the version skew: ci.yml uses setup-node v4, release.yml uses v6. SEC-01 should
  pin each to a SHA matching the major it already references — do not silently bump majors.)

Convention: pin to the full 40-char commit SHA with a trailing `# vX.Y.Z` comment so
Dependabot/Renovate can still surface updates. This is the standard hardening pattern
(GitHub's own "Using third-party actions" security guidance recommends SHA pinning for
exactly the `id-token: write` threat model present here).

**Runner-npm exact-pin location:** `release.yml:27-30` currently runs
`npm install -g npm@^11.5.1` (a caret range). SEC-01 changes the caret to an **exact pin**
in place — same step, same position:
```yaml
- name: Upgrade npm to an OIDC-capable version
  run: |
    npm install -g npm@11.5.1   # exact pin (was ^11.5.1)
    echo "npm version now: $(npm --version)"
```
This is the right and only home for the npm pin: it sits AFTER `setup-node` (line 22-25,
which deliberately ships Node 22 / npm 10.9.x — below the 11.5.1 OIDC floor per the Key
Decision) and BEFORE `npm ci` (line 32). The Node-version floor rationale is unchanged;
SEC-01 only removes the caret's drift surface.

**Interaction with OIDC / provenance / verify-tarball:**
- The exact npm pin must stay **at or above 11.5.1** — that is npm's OIDC trusted-publishing
  floor (Key Decision, validated by the 4-attempt v3.0.1 recovery). Pinning to exactly
  `11.5.1` is safe; pinning below it would break the `--provenance` publish at lines 58-62.
- `verify-tarball.mjs` runs in **ci.yml only** (`package.json:17` `verify:tarball`,
  wired at ci.yml:45). It resolves npm via `process.env.npm_execpath` / `require.resolve`
  (lines 47-61) — it does NOT pin or install npm, so SEC-01 does not touch it. No
  interaction.
- The dry-run guard (release.yml:53-56) and the two `--provenance` publish steps
  (58-62) are downstream of the npm pin and unaffected except that they now run under a
  deterministic npm version.

**No build/test re-run is required to validate SEC-01** beyond the workflows executing on
the next tag/push. This is the only pure-config item in the milestone.

**Files:**
- MODIFIED `.github/workflows/ci.yml` (2 `uses:` SHAs)
- MODIFIED `.github/workflows/release.yml` (2 `uses:` SHAs + caret→exact npm pin)

---

### CLI-06 (MD-02) — Robust `--version` arg parsing in the mcp bin

**Status:** MODIFIED (mcp bin only). Does NOT touch core, the CLI, or any MCP tool.

**Exact change site:** `packages/mcp/src/index.ts:836` — inside `main()`, before
`StdioServerTransport` is constructed:
```ts
if (process.argv.includes('--version')) {
  process.stdout.write(`${SERVER_VERSION}\n`);
  process.exit(0);
}
```
The defect: `process.argv.includes('--version')` is an exact-string membership test. It
misses `--version=anything`, `--Version`, `-v`, or a `--version` that arrives glued to
another token. The minimal fix replaces the `.includes()` predicate with a small parser
that case-insensitively matches `--version` (and optionally `-v`) with or without an
`=value` suffix — e.g. `process.argv.slice(2).some(a => /^--version(=.*)?$/i.test(a))`.

**Confirmation it does NOT touch the MCP tool surface:** the short-circuit lives in the
startup `main()` function (lines 831-844), strictly *before* `server.connect(transport)`
(line 842). All nine `server.registerTool(...)` calls (lines 183-827) are module-level and
unaffected. The change is a single predicate swap inside the pre-boot guard. The cli's
version handling is separate (Commander's `.version()` at `cli/src/index.ts:24`) and is
NOT in scope for MD-02 — Commander already parses `--version` robustly.

**Note on the `--version` regression guard:** `verify-tarball.mjs:203` invokes the bin
with a bare `--version` and asserts the output equals the manifest version (line 211-213).
The CLI-06 change keeps the bare-`--version` path working, so the existing gate continues
to pass without modification. If the roadmap wants to lock in the new robustness, it could
add a `--version=x` smoke case to the mcp smoke test
(`packages/mcp/test/smoke.test.ts`) — optional, not required.

**Files:**
- MODIFIED `packages/mcp/src/index.ts:836`
- OPTIONAL MODIFIED `packages/mcp/test/smoke.test.ts` (robustness assertion)

---

### CORE-15 — Audit project-fingerprint filter

**Status:** MODIFIED (core, `looksLikeProject`). Both cli + mcp audit inherit the fix for free.

**Where the scan and predicate live:**
- The predicate: `packages/core/src/environment/looksLikeProject.ts:36` — exported from the
  barrel at `packages/core/src/index.ts:9`.
- Consumed identically by BOTH audit surfaces:
  - cli audit: `packages/cli/src/index.ts:513` — `.filter(looksLikeProject)` on the
    auto-discovered decode results.
  - mcp audit tool: `packages/mcp/src/index.ts:721` — same `.filter(looksLikeProject)`.

Because both call the shared core export, **landing the fix in `looksLikeProject.ts`
automatically corrects both audit paths** — this is the shared-core constraint working in
the milestone's favor. No change to cli/index.ts or mcp/index.ts is needed for CORE-15.

**The integration without regressing D-01 (path-shape-only):** the current predicate
already rejects filesystem root and the home directory, and requires ≥2 segments below
home/root (lines 47-66). The `audit-includes-root-paths` debug shows it still admits
top-level user-tree paths that are not projects (the "stop scanning all of `C:\Users\…`"
complaint). D-01 forbids a `.git`/`package.json` *marker-file* requirement — the toolkit
must support plain-folder projects.

So the fix is an **extension of the existing path-shape predicate, not a new fingerprint
function and not a marker-file check.** The right shape is to tighten the depth/exclusion
logic: exclude well-known non-project ancestors that sit at the standard user-tree depth
(e.g., the OS profile/system folders and the Claude config tree itself) while keeping the
no-marker-file guarantee. A new private helper inside `looksLikeProject.ts` (e.g. an
exclusion set of known-non-project basenames/ancestors) is acceptable since it stays
path-shape-only; do NOT add a new public barrel export unless a second caller needs it.

**Caution flag for the roadmap:** "fingerprint" in the requirement name could be
misread as "detect a project by its contents." That would violate D-01. The verified
intent is *exclusion of known-non-project paths by shape/location*, keeping the predicate
content-agnostic. The roadmap should state this explicitly so the executor does not
reintroduce a marker-file check.

**Files:**
- MODIFIED `packages/core/src/environment/looksLikeProject.ts` (extend predicate + private exclusion helper)
- MODIFIED `packages/core/test/environment/` (add/extend `looksLikeProject` coverage — note: there is currently no dedicated `looksLikeProject.test.ts`; one should be created)

---

### CORE-16 — Decode trailing-edge special-character round-trip fix (999.7)

**Status:** MODIFIED (core, `decode.ts` — specifically `buildCandidates`). Highest-risk
of the five; touches the load-bearing v3.0.0 OneDrive fix.

**Exact location of the round-trip logic and the Phase-17 regex:**
- The encode regex (Phase 17 widening): `packages/core/src/environment/decode.ts:89` —
  `filePath.replace(/[\\/: ,().'&\[\]+=%]/g, '-').replace(/^-+|-+$/g, '')`. **Do not touch
  this for CORE-16** — Phase 17 calibrated it and 17/17 active path-hashes round-trip.
- The defect lives in `buildCandidates()` — `packages/core/src/environment/decode.ts:144-200`,
  specifically the prefix-match block at **lines 187-196**:
  ```ts
  const prefix = encodedName + '-';
  if (remainingHash.startsWith(prefix)) { ... }
  ```

**Root cause (reproduced verbatim in Phase-17 verification, 17-VERIFICATION.md:137-161):**
`encode()` strips the trailing hyphen via `.replace(/^-+|-+$/g, '')`. When an intermediate
path component *ends* in a CORE-13 special char (e.g. `OneDrive - Acme &/Projects/sub`),
`encode("Acme &")` = `Acme--` → stripped to `Acme-`... and the decoder's
`prefix = encodedName + '-'` collapses two distinct path shapes (a parent ending in a
special char vs. one that does not) into one. The remaining hash then carries a leading
hyphen that no real child entry can produce, so decode returns `no_candidates`.

The failure is **narrow and specific**: only the *trailing edge of an intermediate
component with a deeper child*. Interior special chars (the realistic
`OneDrive - ThermoTek, Inc/...` shape) already round-trip — confirmed by the
`Acme & Co/sub` SUCCESS counter-case. Leaf-position special chars also already pass
(that is what the seven Phase-17 tests at `decode.test.ts:110-211` cover).

**Minimal change locus without disturbing the 17/17 passing round-trips:** the verifier
already scoped the fix (17-REVIEW.md:62). Inside `buildCandidates()` Case 2, try BOTH
prefix forms when matching a directory entry:
- `prefix = encodedName + '-'` (current — covers parent-not-ending-in-special-char)
- `prefix = encodedName + '--'` (NEW — covers parent-ending-in-special-char, where the
  stripped trailing hyphen plus the separator hyphen produce a double)

This is additive: it only *adds* a second candidate branch, so every currently-passing
shape (which matches the first prefix) is untouched. The alternative the verifier names —
removing the leading/trailing strip from `encode()` and handling root-prefix hyphens in
`reconstructPath()` — is **higher-blast-radius** (it would change line 89, which Phase 17
locked) and is NOT recommended.

**Regression-protection requirement:** `buildCandidates()` is the load-bearing v3.0.0
OneDrive corporate-path fix (Key Decision; flagged in 17-PATTERNS.md:44). The canonical
`OneDrive - ThermoTek, Inc/...` decode MUST still pass. The change is bounded to the
prefix-match branch and the executor must:
- Keep the existing 7 leaf-position tests (`decode.test.ts:110-211`) green.
- Add 7 trailing-edge fixtures (`tmpDir/Trailing<char>/sub` for `' & [ ] + = %`) — these
  are the exact probes the verifier ran; flip them from the documented `no_candidates`
  failure to SUCCESS. 17-REVIEW.md:69-85 anticipates these as the named tests to add.
- Add an interior-occurrence guard test (`Acme & Co/sub`) to prove no regression.

**Files:**
- MODIFIED `packages/core/src/environment/decode.ts:187-196` (add second prefix branch in `buildCandidates`)
- MODIFIED `packages/core/test/environment/decode.test.ts` (7 trailing-edge fixtures + 1 interior guard)

## Build / Sequencing Order

```
Independent track A (workflow-only, zero code):
  [1] SEC-01  ──────────────────────────────────────────► land anytime

Independent track B (single-bin, isolated):
  [2] CLI-06  ──────────────────────────────────────────► land anytime

Core track C (shared library — sequence by blast radius, low→high):
  [3] BUILD-01 (seed + tsup define)   ── low risk, additive
        ↓
  [4] CORE-15 (looksLikeProject)      ── low risk, additive
        ↓
  [5] CORE-16 (buildCandidates)       ── HIGH risk, load-bearing; land LAST
```

**Recommended order and rationale:**

1. **SEC-01 first (or fully parallel).** Pure workflow config, no rebuild, no code
   dependency. Landing it first means every subsequent CI/release run for the milestone
   already executes under SHA-pinned actions and the exact npm pin — you harden the
   pipeline that validates everything else. Zero coupling to the other four.

2. **CLI-06 second (independent).** Touches only `packages/mcp/src/index.ts:836`, one
   predicate. No shared-core surface, no interaction with BUILD-01/CORE-15/CORE-16. Can
   run concurrently with SEC-01; sequenced second only because it is trivially small.

3. **BUILD-01 third.** First of the core changes. It modifies `core/tsup.config.ts` (the
   `define` injection) — doing this before CORE-15/CORE-16 means those later core edits are
   built under the finalized core build config, avoiding a mid-milestone config churn.
   Low risk: additive constant, no algorithm change.

4. **CORE-15 fourth.** Pure `looksLikeProject` extension, additive predicate logic. No
   dependency on BUILD-01, but grouping it after BUILD-01 keeps all the "easy core" work
   together and leaves the risky decode change isolated at the end.

5. **CORE-16 last.** It is the only change to a load-bearing, explicitly-protected
   algorithm (`buildCandidates`, the v3.0.0 OneDrive fix). Landing it last means the full
   test suite — already hardened by the other four items being in place — is the safety net
   for the highest-regression-risk edit. If CORE-16 needs a revision cycle, nothing else is
   blocked behind it.

**Classification summary:**

| Item | Class | Files touched | Risk | Both consumers benefit? |
|------|-------|---------------|------|-------------------------|
| SEC-01 | Workflow-only | ci.yml, release.yml | Low | N/A (CI infra) |
| CLI-06 | Bin (mcp only) | mcp/src/index.ts | Low | No — mcp only |
| BUILD-01 | Core + build config | core/tsup.config.ts, seed.ts, (util/version.ts) | Low | Yes — seed bundled into both |
| CORE-15 | Pure-core | core/looksLikeProject.ts | Low | Yes — shared audit predicate |
| CORE-16 | Pure-core | core/decode.ts buildCandidates | **High** | Yes — shared decode |

**Dependency notes:**
- No item *hard-blocks* another; all five are independently shippable. The ordering is by
  risk isolation, not by data dependency.
- The only soft coupling: BUILD-01 edits `core/tsup.config.ts`. If CORE-15/CORE-16 land
  before it, you risk a rebuild/config-merge churn. Sequencing BUILD-01 ahead of the other
  two core items avoids that. (Honest uncertainty: this is a tidiness concern, not a
  correctness one — they could be reordered without breaking anything.)
- Three of the five are pure-core (BUILD-01, CORE-15, CORE-16) and therefore flow into
  both published packages through the tsup bundle. Two are isolated (SEC-01 = infra,
  CLI-06 = mcp bin). This split could map cleanly to two or three phases: a
  supply-chain/bin phase (SEC-01 + CLI-06) and a core-correctness phase (BUILD-01 +
  CORE-15 + CORE-16), or three phases isolating CORE-16 for its risk.

## Anti-Patterns (specific to this milestone)

### Anti-Pattern 1: Reading core's own package.json at runtime for BUILD-01

**What people do:** copy the bins' `new URL('../package.json', import.meta.url)` pattern
into seed.ts.
**Why it's wrong:** after tsup `noExternal` inlines core into mcp/cli, `import.meta.url`
resolves into the *consumer's* dist, not core's — the path semantics are wrong and the
lookup is fragile across the bundle boundary.
**Do this instead:** compile-time `define` injection sourced from core's package.json; a
frozen constant has no filesystem dependency and survives bundling unchanged.

### Anti-Pattern 2: Adding a marker-file check to fix CORE-15

**What people do:** make `looksLikeProject` require `.git/` or `package.json` to exclude
non-project paths.
**Why it's wrong:** violates Key Decision D-01 (path-shape-only); breaks support for
plain-folder projects that the toolkit explicitly serves.
**Do this instead:** extend the existing shape/location exclusion (depth + known-non-project
ancestors), keeping the predicate content-agnostic.

### Anti-Pattern 3: Refactoring `encode()` or the whole `buildCandidates` algorithm for CORE-16

**What people do:** remove the `/^-+|-+$/g` strip from encode (line 89) or rewrite the
reconstruction.
**Why it's wrong:** line 89 was Phase-17-calibrated (17/17 active path-hashes pass);
`buildCandidates` is the load-bearing v3.0.0 OneDrive fix. Broad changes risk the canonical
`OneDrive - ThermoTek, Inc` decode.
**Do this instead:** add a second `encodedName + '--'` prefix branch in the Case-2
prefix-match (lines 187-196) — additive, leaves every passing shape untouched.

### Anti-Pattern 4: Pinning runner npm below the OIDC floor in SEC-01

**What people do:** pin to a "round" older npm to be conservative.
**Why it's wrong:** npm's OIDC trusted-publishing floor is 11.5.1; below it the
`--provenance` publish fails (validated by the v3.0.1 4-attempt recovery).
**Do this instead:** exact-pin to `11.5.1` (or a known-good ≥11.5.1), keeping Node 22 as-is.

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| core ↔ mcp | tsup `noExternal` inline (build-time) | BUILD-01 constant must survive this inline; CLI-06 is mcp-local and never crosses into core |
| core ↔ cli | tsup `noExternal` inline (build-time) | CORE-15 + CORE-16 fixes propagate to cli automatically via the shared barrel |
| core build → consumer build | `package.json:13` order (core→mcp→cli) | BUILD-01 `define` is substituted during core build, frozen before consumers bundle |
| ci.yml ↔ verify-tarball.mjs | `npm run verify:tarball` step | SEC-01 npm pin does NOT touch verify-tarball; it resolves npm independently (no interaction) |
| release.yml ↔ OIDC/provenance | `id-token: write` + `--provenance` | SEC-01 npm exact-pin must stay ≥11.5.1 or provenance publish breaks |

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| GitHub Actions marketplace | `uses: <action>@<sha>` | SEC-01 pins checkout + setup-node to full commit SHAs in both workflows |
| npm registry (OIDC) | trusted publishing, no stored token | runner npm exact-pin (≥11.5.1) is the only npm-version surface |

## Sources

- `packages/core/src/operations/seed.ts:139` (BUILD-01 defect site) — read directly, HIGH
- `packages/core/tsup.config.ts`, `packages/mcp/tsup.config.ts:16`, `packages/cli/tsup.config.ts:16` (noExternal bundle) — read directly, HIGH
- `packages/mcp/src/index.ts:19-21,721,836`; `packages/cli/src/index.ts:15-17,513` (bin version pattern, audit predicate use, --version short-circuit) — read directly, HIGH
- `packages/core/src/environment/looksLikeProject.ts:36-66` (CORE-15 predicate) — read directly, HIGH
- `packages/core/src/environment/decode.ts:89,144-200` (CORE-16 encode regex + buildCandidates) — read directly, HIGH
- `.github/workflows/ci.yml:28,31,45`; `.github/workflows/release.yml:10,19,23,27-30,58-62` (SEC-01 surfaces) — read directly, HIGH
- `scripts/verify-tarball.mjs:203,210-213` (version-equality gate) — read directly, HIGH
- `.planning/phases/17-core-decoder-calibration/17-VERIFICATION.md:137-184`, `17-REVIEW.md:52-85`, and memory `project_999_7_buildcandidates.md` (CORE-16 root cause + scoped fix) — read directly, HIGH
- `.planning/PROJECT.md` Key Decisions (Bundle Option A, OIDC floor, runtime version derivation, D-01 path-shape-only) — read directly, HIGH

---
*Architecture research for: LocalGround v3.1.0 Hardening and Hygiene — integration-point mapping*
*Researched: 2026-06-29*
