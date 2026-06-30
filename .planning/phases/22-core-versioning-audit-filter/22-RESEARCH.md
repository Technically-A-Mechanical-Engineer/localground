# Phase 22: Core Versioning & Audit Filter - Research

**Researched:** 2026-06-30
**Domain:** TypeScript monorepo build-config + version derivation (BUILD-01); cross-platform path-shape predicate (CORE-15) in `@localground/core`, bundled into `@localground/mcp` + `@localground/cli` via tsup `noExternal`
**Confidence:** HIGH (every claim grounded in direct codebase read at HEAD `e92c82a` + empirical tsup/predicate reproduction on this Windows machine)

## Summary

Phase 22 lands two pure-`@localground/core` fixes. Both inherit identically into the CLI and MCP tools because core is inlined into each consumer's `dist/` via tsup `noExternal: ['@localground/core']` — there is no separately-installed core at runtime, which is the single fact that drives the BUILD-01 mechanism choice.

**BUILD-01** removes the last hardcoded version literal (`toolkitVersion: '3.0.2'` at `seed.ts:139`) so the seed manifest can never drift from the package version. The crux — core/seed.ts is bundled into BOTH mcp and cli which can have different versions — was resolved empirically this session: a tsup `define` placed in a *consumer's* config **cannot** reach core's already-compiled `dist` (proven below), so the only two viable mechanisms are (A) pass the version as a `seed()` parameter from each bin's already-derived runtime version, or (B) a `define` in **core's own** tsup config that bakes core's private version. Option A is the recommendation — it is the only mechanism that delivers true per-consumer semantics, needs no build-config change, and is trivially unit-testable. Option B is correct-by-coincidence today (all three versions are lockstep `3.0.2`) but couples seed to core's private version.

**CORE-15** reproduced as directed against current `master`. The two literal symptom paths from the original `audit-includes-root-paths` debug report — `C:\` and `C:\Users\rlasalle` — are **already rejected** by `looksLikeProject`, which was added in Phase 14-10 (commit `6ac6d71`) *after* the debug report was written, and is already wired into both audit auto-discovery paths. **The original symptom does not reproduce → CORE-15 is primarily a regression-lock test, not a logic change.** However, the reproduction surfaced residual non-project leaks the original symptom never named (`C:\Users\<otheruser>`, `C:\Users\rlasalle\AppData\Local`). Whether to additionally close those is a scope decision for the planner; the success criteria only require root-rejection + D-01 discovery, both of which already hold.

**Primary recommendation:** BUILD-01 → Option A (`seed(projectPath, toolkitVersion)` param, bins pass their derived version); extend `verify-tarball.mjs` to seed a temp git repo via the installed tarball's core and assert the emitted `toolkitVersion` value. CORE-15 → create `looksLikeProject.test.ts` that locks root-rejection AND D-01 plain-folder discovery; treat any `AppData`/other-user-home tightening as an explicit, separately-tested scope addition.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Seed manifest version derivation (BUILD-01) | `@localground/core` (`seed()`) | mcp/cli bins (supply the value) | Manifest is written by core's `seed()`; the authoritative version number lives in each consumer's `package.json`, which only the bin can read at runtime |
| Audit auto-discovery filtering (CORE-15) | `@localground/core` (`looksLikeProject`) | mcp/cli audit (consume the predicate) | Single shared predicate; both audit surfaces already `.filter(looksLikeProject)` — fix in core propagates to both with zero per-consumer logic |
| Version assertion gate (BUILD-01) | `scripts/verify-tarball.mjs` (CI, Node tier) | — | Build-time/packaging verification; runs against the packed tarball, not app runtime |

## Standard Stack

No new runtime dependencies. This phase touches only existing tooling and source.

### Core (already installed — verified this session)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| tsup | 8.5.1 | Bundler for all three packages; `noExternal` inlines core; `define` for compile-time constants | `[VERIFIED: node -p require('tsup/package.json').version]` — already the project bundler |
| esbuild | 0.27.7 | tsup's underlying engine; performs `define` substitution | `[VERIFIED: node -p require('esbuild/package.json').version]` |
| vitest | 3.2.6 | Test runner; real-fs fixtures | `[VERIFIED: root package.json devDependencies]` |
| typescript | ~5.7 | `tsc --build:check` strict gate over src+test | `[VERIFIED: root package.json]` |
| Node.js | v22.18.0 (local) / >=20 (engines) | Runtime | `[VERIFIED: node --version]` |

### Alternatives Considered (BUILD-01 mechanism — see crux analysis below)
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Option A (`seed()` param) | Option B (`define` in core's tsup) | B needs no signature change but bakes core's *private* version, not the consuming package's; correct only while versions are lockstep |
| Build-time injection | Runtime `readFileSync(new URL('../package.json', import.meta.url))` | FORBIDDEN by ROADMAP — `import.meta.url` resolves to the consumer's `dist/` post-bundle; fragile, wrong semantics (see Pitfall 1) |

**Version verification:** All package versions confirmed live this session — root `3.0.2`, `@localground/core` `3.0.2` (`private: true`), `@localground/mcp` `3.0.2`, `@localground/cli` `3.0.2`. `[VERIFIED: node -p require('./packages/*/package.json').version]`. They are kept in lockstep by `release.yml`'s preflight equality gate (D-07, Phase 20).

## Architecture Patterns

### System Architecture (build topology — the load-bearing fact)

```
                       BUILD ORDER (root package.json:13)
                       core  →  mcp  →  cli   (sequential, each via tsup)

  ┌─ packages/core/ ──────────────────────────────────────────────┐
  │  src/operations/seed.ts  ──writes──►  SeedManifest.toolkitVersion │
  │  src/environment/looksLikeProject.ts ─exported─► barrel (index.ts:9)│
  │                                                                  │
  │  tsup build  ──►  packages/core/dist/index.js                    │
  │    (a `define` here is SUBSTITUTED INTO dist AS A FROZEN LITERAL) │
  └──────────────────────────────┬───────────────────────────────────┘
                                  │  consumers declare core in devDependencies
                                  │  tsup noExternal:['@localground/core']
                                  │  → INLINES core's COMPILED dist into:
            ┌─────────────────────┴─────────────────────┐
            ▼                                             ▼
  packages/mcp/dist/index.js                  packages/cli/dist/index.js
   bin: localground-mcp                         bin: localground
   SERVER_VERSION = readFileSync(               VERSION = readFileSync(
     ../package.json).version                     ../package.json).version
   seed(projectPath) @ index.ts:294             seed(projectPath) @ index.ts:136
   .filter(looksLikeProject) @ :721             .filter(looksLikeProject) @ :513
            │                                             │
            ▼                                             ▼
   published tarball (NO core/package.json on disk — core is inlined)
```

Two consequences flow from this diagram and govern the whole phase:

1. **A consumer's `define` cannot change core's inlined code.** By the time mcp/cli bundle core, core's `dist` is already a `.js` file with all `define` identifiers already replaced by literals. The identifier no longer exists for the consumer's esbuild pass to substitute. (Proven empirically — see BUILD-01 crux.)
2. **There is no core `package.json` at runtime in a tarball.** Core is bundled, declared in `devDependencies`, `private: true`. Any runtime file-read of "core's own package.json" is meaningless in production.

### Pattern 1: Result type — never throw from core
**What:** Every core function returns `Result<T, R>` = `Success<T> | Failure<R>`. `seed()` already does. BUILD-01 must not introduce a throw.
**When to use:** Any new branch in `seed()` (none needed for Option A — the param is just consumed).
**Source:** `packages/core/src/types.ts:7-27`; `seed.ts` returns `{ success, data }` / `{ success: false, reason }`.

### Pattern 2: Real-fs test fixtures (`os.tmpdir()` + `fs.mkdtemp` + `afterEach`)
**What:** Tests use real temp dirs, never mocked fs. The seed test already initializes a real git repo via `spawnSync('git', [...])` with array args.
**When to use:** Both the BUILD-01 value-equality test and the CORE-15 predicate test.
**Source:** `packages/core/test/operations/seed.test.ts:12-33` (the `initGitRepo` + `mkdtemp`/`rm` pattern to copy verbatim).

### Pattern 3: Spawn discipline (array args, never `shell: true`)
**What:** All `child_process` calls use array args. `verify-tarball.mjs` spawns npm via `[process.execPath, NPM_CLI_JS, ...args]` to dodge Windows Node-20+ EINVAL on `.cmd` shims.
**When to use:** Extending `verify-tarball.mjs` for the BUILD-01 seed-value assertion — preserve the existing `resolveNpmCliJs()` + `run()` helpers exactly.
**Source:** `scripts/verify-tarball.mjs:47-115`.

### Anti-Patterns to Avoid
- **Copying the bins' `readFileSync(new URL('../package.json', import.meta.url))` into bundled `seed.ts`** — resolves to the consumer's `dist/`, fragile across the bundle boundary (ROADMAP hard constraint; Pitfall 1).
- **A `define` in mcp's/cli's tsup config to set core's version** — impossible; core is pre-compiled before the consumer bundles it (proven below).
- **Adding a `.git`/`package.json` marker check to `looksLikeProject`** — regresses D-01 (Out-of-Scope table forbids it; Pitfall 2).
- **Inline `.filter(p => ...)` at an audit call site** — diverges CLI from MCP; the fix must stay in `looksLikeProject` (Pitfall 3).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Reading core's version at runtime | A `createRequire`/`import.meta.url` walk inside `seed.ts` | Pass it in as a param (Option A) OR a build-time `define` in core's tsup (Option B) | The bundle boundary makes any runtime file-read resolve to the wrong package's manifest |
| Identifying a drive/home/system root | A regex over path strings | `path.parse(p).root`, `os.homedir()`, `path.relative()` segment counting (the existing `looksLikeProject` body) | Node's `path` already handles win32 drive roots, UNC, and posix `/` correctly and cross-platform |
| npm invocation in the verify script | `spawnSync(['npm', ...])` | `[process.execPath, NPM_CLI_JS, ...]` (existing helper) | Node 20+ refuses to spawn `.cmd` shims without `shell:true` on Windows (CVE-2024-27980); `shell:true` is forbidden by D-02 |

**Key insight:** Both fixes are "use what's already there correctly," not "build new machinery." BUILD-01 reuses the version each bin already derives. CORE-15 reuses the predicate that already exists and is already wired in — the only genuinely new artifact is a test.

## Runtime State Inventory

Not applicable — Phase 22 is code/config-only (no rename, no stored data, no live-service config, no OS-registered state). The seed manifest's `toolkitVersion` is written fresh on each `seed()` call; there is no pre-existing stored state to migrate. **None — verified: BUILD-01 changes how new manifests are written, not any persisted record; CORE-15 changes a pure in-memory predicate.**

## BUILD-01 — Deep Analysis

### Current defect (verified)
`packages/core/src/operations/seed.ts:137-144`:
```typescript
const manifest: SeedManifest = {
  version: 1,
  toolkitVersion: '3.0.2',          // ◄── line 139: the last hardcoded version literal
  created: new Date().toISOString(),
  projectPath,
  projectName: path.basename(projectPath),
  markers,
};
```
`SeedManifest.toolkitVersion` is typed `string` (`types.ts:146`). `seed()`'s current signature is `seed(projectPath: string)` (`seed.ts:48`). It is called in exactly two places, both with one argument:
- `packages/mcp/src/index.ts:294` — `const result = await seed(projectPath);`
- `packages/cli/src/index.ts:136` — `const result = await seed(projectPath);`

Each bin already derives its version into a module constant in scope at the call site:
- `packages/mcp/src/index.ts:19-21` — `const SERVER_VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url),'utf8')).version as string;`
- `packages/cli/src/index.ts:15-17` — identical pattern, `const VERSION = ...`.

### The crux, resolved empirically this session

> *Question from the objective: where must a `define` live, and can a per-consumer `define` substitute the consuming package's version into the inlined core code?*

I built a minimal tsup reproduction with the repo's installed tsup 8.5.1 / esbuild 0.27.7. `[VERIFIED: empirical build, scratchpad/tsup-define-test]`

**Finding 1 — a `define` in core's config bakes a frozen literal into core's `dist`:**
Source `coredep/src/index.ts` referencing `declare const __TOOLKIT_VERSION__` compiled with `define: { __TOOLKIT_VERSION__: JSON.stringify('CORE-DEFINE-9.9.9') }` produced:
```javascript
function getVersion() { return false ? "FALLBACK" : "CORE-DEFINE-9.9.9"; }
```
The identifier is gone — replaced by the string literal — and the `typeof ... === 'undefined'` guard collapsed to `false`.

**Finding 2 — a consumer's `define` does NOT override core's baked literal:**
Bundling the *built* core dist into a consumer with `--define.__TOOLKIT_VERSION__="CONSUMER-DEFINE-1.1.1"` produced:
```javascript
// coredep/dist/index.js (inlined)
function getVersion() { return false ? "FALLBACK" : "CORE-DEFINE-9.9.9"; }  // ◄── core's value WON
// consumer/src/index.ts
console.log("consumer sees core version:", getVersion());
```
The consumer's define had **no effect** on core's inlined code, because that code was already compiled to a literal. **This proves Option "define in each consumer's tsup config" is impossible for the seed case** — exactly the topology the objective asked to confirm.

**Finding 3 — the no-define dev path is safe IF a `typeof` guard with fallback is used:**
Building the same source with NO define left the runtime guard intact in dist: `typeof __TOOLKIT_VERSION__ === "undefined" ? "FALLBACK" : __TOOLKIT_VERSION__`. At runtime the global is genuinely undefined, so it returns the fallback — **no `ReferenceError`**. Without the `typeof` guard (a bare `__TOOLKIT_VERSION__` reference), an un-substituted build would throw at runtime.

**Finding 4 — vitest sees the substituted value:** Core's test imports `seed` from `@localground/core`, which resolves via the package `exports` map to `packages/core/dist/index.js` (`[VERIFIED: core package.json exports + node_modules/@localground/core symlink]`). The root `pretest` script runs `npm run build` (full tsup build) before `vitest run` (`[VERIFIED: root package.json:15-16]`), so under `npm test` the define is already substituted in `dist`. There is **no vitest alias to `src`** (`[VERIFIED: packages/core/vitest.config.ts has no resolve.alias]`). Caveat: running `vitest` directly without the `pretest` build would test stale dist — acceptable, matches current behavior for all core tests.

### Option A vs Option B — concrete layout for the planner

**OPTION A — pass the version into `seed()` (RECOMMENDED)**

| Aspect | Detail |
|--------|--------|
| Signature change | `seed(projectPath: string, toolkitVersion: string)` in `seed.ts:48` |
| seed.ts:139 | `toolkitVersion,` (shorthand — consume the param) |
| Call site mcp:294 | `await seed(projectPath, SERVER_VERSION)` |
| Call site cli:136 | `await seed(projectPath, VERSION)` |
| Build config | **No change** to any tsup config |
| Test impact | `seed.test.ts` — 6 existing `seed(tmpDir)` calls become `seed(tmpDir, '<v>')`; add value-equality assertion |
| Semantics | TRUE per-consumer version (mcp passes mcp's, cli passes cli's) — the only mechanism that does this |
| Purity | Core stays pure, no I/O, no global, deterministic, unit-testable without a build |
| Risk | Public-signature change — but only 2 internal callers + tests; no external consumer (core is `private:true`, never published standalone) |

**OPTION B — `define` in core's own tsup config**

| Aspect | Detail |
|--------|--------|
| Signature change | None |
| `packages/core/tsup.config.ts` | Add `import pkg from './package.json' with { type: 'json' };` and `define: { __TOOLKIT_VERSION__: JSON.stringify(pkg.version) }` |
| Ambient declaration | `declare const __TOOLKIT_VERSION__: string;` so `tsc --build:check` over `src` passes (a `packages/core/src/util/version.ts` shim with a `typeof` fallback is cleaner than inlining in seed.ts) |
| seed.ts:139 | `toolkitVersion: TOOLKIT_VERSION,` (or the raw constant) |
| Semantics | Bakes CORE's private version (`3.0.2`). Right *value* today (lockstep), wrong *semantics* — if mcp/cli ever diverge from core, seed reports core's number |
| Dev/test path | Safe ONLY with a `typeof` fallback (Finding 3); otherwise a non-tsup execution throws `ReferenceError` |
| Risk | Quietly wrong if version lockstep ever breaks; the value-equality gate (below) would catch it at release time, not at author time |

**Recommendation: Option A.** It is the only option whose semantics match the requirement ("equals the *consuming package's* version") rather than relying on the lockstep invariant. It needs no build-config change, no ambient global, and is the easiest to test. Option B is defensible only if the planner wants zero signature change and accepts that core's private version stands in for the consumer's (acceptable today, fragile tomorrow). The objective's "Option A vs B, planner picks" framing is preserved — both are laid out fully; A is the stated preference with reasoning.

### verify-tarball.mjs extension (required by SC-3, both options)

Today `verify-tarball.mjs` asserts only the bin `--version` value (`:203-213`). It must additionally assert the **seed-path** version VALUE. Concrete approach that fits the existing script:
- After the existing `--version` check in `verifyOne(pkg)`, in the same installed-tarball tmp dir: create a sub-directory, `git init` it (via the spawn-discipline helper — array args, resolve git like the script resolves npm; or spawn `process.execPath` against a tiny inline driver that imports the installed package and calls `seed`), invoke the package's seed path, read the written `.localground-seed-manifest.json`, and assert `manifest.toolkitVersion === expectedVersion` (the value already read from the tarball's `package.json` at `:163`).
- **Preserve the Windows-safe spawn:** reuse `resolveNpmCliJs()` / `[process.execPath, ...]` for any npm call; for git, use array args and `spawn`/`spawnSync` (never `shell:true`) — matches the `seed.test.ts` `initGitRepo` precedent.
- **Honest uncertainty:** the cleanest invocation of "the packaged seed path" depends on whether the planner exposes seed through the installed bin (the mcp tool / cli `seed` command need a real git repo and a writable target) or drives core directly from the installed package. Either works; the bin path more faithfully exercises the shipped artifact. The planner should pick based on how much the bin's seed command requires (the cli `seed` command validates `path.isAbsolute` and calls `seed(projectPath)` — drivable). This is a HOW detail, not a scope question.

### Closest existing analog
The v3.0.1 `--version` drift fix is the exact template: the bins moved from a hardcoded literal to `readFileSync(../package.json)` derivation, and `verify-tarball.mjs:203-213` was added as the value-equality gate that would have caught the 3.0.1→`3.0.0` misreport. BUILD-01 applies the same "derive + assert value" discipline to the seed manifest. `[CITED: STATE.md Phase 20-04 D-06; verify-tarball.mjs:211-213]`

## CORE-15 — Deep Analysis (reproduce-first, per directive)

### Reproduction result — the original symptom does NOT reproduce

`looksLikeProject` was introduced in **commit `6ac6d71` "feat(14-10): add looksLikeProject predicate to core"** `[VERIFIED: git log -- packages/core/src/environment/looksLikeProject.ts]`. The `audit-includes-root-paths` debug report is dated **2026-04-26** and explicitly recommends *creating* `looksLikeProject` — it predates the fix. The predicate is now wired into **both** audit auto-discovery paths on current `master` (`e92c82a`):
- CLI: `packages/cli/src/index.ts:507-513` — `...filter(looksLikeProject)` on decoded auto-discovered paths (user-supplied `--projects` are NOT filtered).
- MCP: `packages/mcp/src/index.ts:715-721` — identical `.filter(looksLikeProject)`.

I ran the predicate (verbatim copy) against the exact failing inputs on this Windows box (`os.homedir() = C:\Users\rlasalle`). `[VERIFIED: empirical run, scratchpad/repro-core15.mjs]`

| Path | Result | Was it the original symptom? |
|------|--------|------------------------------|
| `C:\` | **rejected** | YES — original symptom path #1, now fixed |
| `C:\Users\rlasalle` | **rejected** | YES — original symptom path #2, now fixed |
| `C:\Users` | rejected | container dir |
| `C:\Users\rlasalle\Documents` | rejected | 1-below-home (too shallow) |
| `C:\Windows`, `C:\Program Files` | rejected | 1-below-root |
| `C:\foo` | rejected | 1-below-root, not under home |
| `/`, `/home`, `/Users`, `/root` | rejected | roots/containers |
| `C:\Users\rlasalle\Projects\localground` | PROJECT | correct (≥2 below home) |
| `C:\Users\rlasalle\Projects\plain-notes` | **PROJECT** | correct — D-01 plain folder, no markers, stays discoverable |
| `C:\Projects\my-app` | PROJECT | correct (≥2 below root) |

**Conclusion: CORE-15 resolves to a regression-lock test.** Both literal symptom paths are already excluded; the D-01 plain-folder invariant already holds. SC-4 (no home/drive/system root surfaced) and SC-5 (regression test locks both invariants) are satisfiable by a test alone — no logic change is required to meet the stated success criteria.

### Residual leaks the reproduction surfaced (planner scope decision)

The reproduction also caught paths that pass `looksLikeProject` today but are not projects. These were NOT part of the original symptom and are NOT named in the success criteria:

| Path | Result | Why it leaks | Real-world impact |
|------|--------|--------------|-------------------|
| `C:\Users\someoneelse` | **PROJECT** | Another user's home root: home is `C:\Users\rlasalle`, so this path is *not under* this home → falls to the not-under-home branch → 2-below-root (`Users`, `someoneelse`) → qualifies | A path-hash for a second OS user's home would be audited |
| `C:\Users\rlasalle\AppData\Local` | **PROJECT** | 2-below-home, but a system/cache dir | If a path-hash decodes into AppData, it audits a non-project (the original report's "20975 stale references" class of noise) |
| `/home/bob`, `/Users/bob` (on win32) | PROJECT | Cross-platform artifact: on win32 `os.homedir()` is a `C:\...` path so posix homes aren't recognized as home | Only matters if a Windows machine holds posix-style path-hashes — unlikely |

**Recommendation:** Lock the satisfied invariants (the regression test is mandatory for SC-5). Treat the `AppData` / other-user-home tightening as an **optional, explicitly-scoped addition** the planner may include — but only as a *path-shape* denylist (e.g. reject a known-non-project basename set like `AppData`, `node_modules`, `.cache`; reject paths whose parent is the `Users`/`/home`/`/Users` container so other-user homes don't qualify). It must NOT become a marker check (D-01). If the planner adds it, each tightening needs a paired test proving a legitimate sibling at the same depth still qualifies. **Honest uncertainty:** the success criteria do not require closing these leaks; including them is a judgment call about how literally to read "system/home/drive roots" vs the documented symptom. I flag it rather than silently expanding scope.

### Required test (SC-5 — both invariants)

Create `packages/core/test/environment/looksLikeProject.test.ts` (none exists today — `[VERIFIED: find packages/core/test -iname '*looks*' → empty]`). Use the real-fs + homedir-aware pattern. Lock at minimum:
1. **Root-rejection:** `looksLikeProject('C:\\') === false`, `looksLikeProject(os.homedir()) === false`, `looksLikeProject('/') === false`. (Use `os.homedir()` rather than a hardcoded home so the test is portable across CI runners.)
2. **D-01 plain-folder discovery:** create a real temp dir ≥2 below a simulated/real home with NO `.git` and NO `package.json`, assert `=== true`. This is the guard that fails loudly if anyone later adds a marker check.
3. (If the planner closes the residual leaks) targeted exclusion tests + a same-depth legitimate-sibling-still-qualifies test.

**Cross-platform note for the test:** `looksLikeProject` branches on `process.platform` (case-insensitive on win32) and uses `os.homedir()`. Tests asserting absolute literals like `'C:\\'` behave on any platform because `path.parse('C:\\').root` logic is being exercised on the string — but home-relative assertions should derive paths from `os.homedir()` to stay green on Linux/macOS CI runners. The CI matrix is 3-OS (`[CITED: ROADMAP Phase 20 — ci.yml 3-OS green]`), so portable assertions matter.

### Closest existing analog
`packages/core/test/environment/classify.test.ts` and `decode.test.ts` (the real-fs `mkdtemp`/`afterEach` environment-test pattern). For the homedir-aware predicate specifically, the `looksLikeProject.ts` doc comment (lines 26-34) already enumerates the exact expected input→output pairs — those map 1:1 to test cases.

## Code Examples

### Option A — seed signature + call sites (verified locations)
```typescript
// packages/core/src/operations/seed.ts:48 (signature)
export async function seed(
  projectPath: string,
  toolkitVersion: string,                       // NEW param
): Promise<Result<SeedManifest, SeedFailureReason>> { ... }

// packages/core/src/operations/seed.ts:139 (manifest)
const manifest: SeedManifest = {
  version: 1,
  toolkitVersion,                               // was: '3.0.2'
  created: new Date().toISOString(),
  ...
};

// packages/mcp/src/index.ts:294   await seed(projectPath, SERVER_VERSION);
// packages/cli/src/index.ts:136   await seed(projectPath, VERSION);
```
Source: read directly at HEAD `e92c82a`.

### Option B — core tsup define + ambient (alternative)
```typescript
// packages/core/tsup.config.ts
import { defineConfig } from 'tsup';
import pkg from './package.json' with { type: 'json' };
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: { tsconfig: './tsconfig.json', compilerOptions: { composite: false } },
  sourcemap: true, clean: true, target: 'node20', splitting: false,
  define: { __TOOLKIT_VERSION__: JSON.stringify(pkg.version) },   // NEW
});

// packages/core/src/util/version.ts (NEW — keeps the ambient out of seed.ts)
declare const __TOOLKIT_VERSION__: string;
// typeof guard prevents ReferenceError on a non-tsup execution (proven Finding 3)
export const TOOLKIT_VERSION: string =
  typeof __TOOLKIT_VERSION__ === 'undefined' ? '0.0.0-dev' : __TOOLKIT_VERSION__;
```
Source: `define` substitution + bundle-survival + fallback behavior all `[VERIFIED: empirical tsup build this session]`.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded `toolkitVersion: '3.0.2'` literal | Derive from package version (param or define) | This phase (BUILD-01) | Seed manifest can no longer drift |
| Audit accepts any decoded+existing path | `.filter(looksLikeProject)` path-shape gate | Phase 14-10 (`6ac6d71`) — already landed | Original `audit-includes-root-paths` symptom already fixed; CORE-15 locks it |

**Deprecated/outdated:**
- The `audit-includes-root-paths` debug report's "Suggested direction" item 2 mentions an *optional* `.git`/`package.json` marker check with a `--strict-project-detect` flag. That suggestion is **superseded** — D-01 and the v3.1.0 Out-of-Scope table now forbid any marker-file detection. Do not implement it.

## Project Constraints (from CLAUDE.md + REQUIREMENTS Out-of-Scope)

These have locked-decision authority for the planner:

- **Result type pattern:** core functions never throw; return `Result<T,R>`. `seed()` already complies; do not add a throw. (`CLAUDE.md` Conventions; `types.ts:7-27`)
- **Real-fs test fixtures:** `os.tmpdir()` + `fs.mkdtemp` + `afterEach` cleanup; NO mocked fs (`vi.mock('node:fs')`/`memfs`). (`CLAUDE.md` Conventions)
- **Spawn discipline:** array args, never `execSync` string-concat, never `shell:true`. On Windows + Node 20+, spawn npm/git via `[process.execPath, <cli.js>, ...]` not `.cmd`. (`CLAUDE.md` Conventions; `verify-tarball.mjs:47-61`)
- **No deletions in core/MCP tools:** unchanged by this phase. (`CLAUDE.md`)
- **Build via tsup; `tsc --build:check` is the strict type gate over src+test** (root `package.json:14`). Any ambient `declare const` (Option B) must satisfy `build:check`.
- **Do NOT bump tsup** — installed `^8.5.1`; `define` works on v8. (REQUIREMENTS Out-of-Scope)
- **Do NOT add an argument-parser / marker-file detection / catch-all regex** (REQUIREMENTS Out-of-Scope — CLI-06/CORE-15/CORE-16 respectively; CORE-15's clause is the binding one here).
- **GSD workflow enforcement:** edits go through a GSD command (this is planning research, not edits).
- **`.planning/` is gitignored-but-tracked:** any `.planning/` write needs `git add -f`. (MEMORY)
- **`commit_docs: true`** — RESEARCH.md should be committed. (`.planning/config.json`)

No `security_enforcement` key in config and no auth/crypto/network/input-trust surface in these two pure-core fixes → no standalone Security Domain section applies. The relevant security control (spawn discipline / no `shell:true`) is captured above and already enforced by `verify-tarball.mjs` and the test convention.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The planner will keep all three package versions in lockstep (release.yml preflight enforces this). If true, Option B's "core's private version" coincides with the consuming version. | BUILD-01 | If versions ever diverge, Option B reports core's version in the manifest — caught by the value-equality gate at release, not at author time. Option A is immune. |
| A2 | `verify-tarball.mjs` can drive the seed path from the installed tarball (either via the bin's seed command or a small driver importing the installed package). | BUILD-01 verify ext | If the bin's seed command has an un-anticipated dependency, the assertion may need the direct-import driver instead — a HOW adjustment, not a scope change. |

(Only two assumptions — both build-config HOW details deliberately left to plan-phase per ROADMAP. Every factual claim about current code, versions, and tsup behavior is `[VERIFIED]` this session.)

## Open Questions (RESOLVED at plan-phase 2026-06-30 — see 22-CONTEXT.md D-01..D-07)

> **RESOLVED 2026-06-30** via Codex adversarial cross-review + user confirmation. All three questions below are now binding decisions in `22-CONTEXT.md`: Q1 → **D-01 (Option A)**; Q2 → **D-06 (EXTENDED scope)**; Q3 → **D-03 (direct-import driver)**. Retained here as the pre-decision record.

1. **BUILD-01 mechanism (A vs B)** — *[RESOLVED → D-01: Option A].* *Settled to a recommendation, not a hard decision (per ROADMAP "A-vs-B HOW decision settles at plan-phase").*
   - What we know: Option A gives correct per-consumer semantics with no build change; Option B is correct-by-lockstep and needs an ambient + fallback. A consumer-side define is impossible (proven).
   - Recommendation: Option A. Lay both out for the planner; A is preferred.

2. **CORE-15 residual-leak scope** — *[RESOLVED → D-06: EXTENDED — close other-user home roots + AppData/system-dir denylist, path-shape-only].* *Judgment call for the planner.*
   - What we know: success criteria are met by a regression-lock test alone (symptom already fixed). Residual leaks (`AppData`, other-user homes) exist but are unnamed in the criteria.
   - Recommendation: ship the mandatory test; treat leak-tightening as an optional, separately-tested, path-shape-only addition — never a marker check.

3. **verify-tarball seed-invocation mechanism** — *[RESOLVED → D-03: direct-import driver — the mcp tarball has no `seed` bin].* bin-driven vs direct-import (A2). HOW detail; either satisfies SC-3.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | all build/test | ✓ | v22.18.0 | — |
| npm | verify-tarball, build | ✓ | (bundled w/ Node 22) | — |
| tsup | build, define injection | ✓ | 8.5.1 | — |
| esbuild | tsup engine (define) | ✓ | 0.27.7 | — |
| vitest | tests | ✓ | 3.2.6 | — |
| git | seed test repo, verify-tarball seed assert | ✓ (repo present) | system git | — |
| TypeScript | build:check | ✓ | ~5.7 | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

## Sources

### Primary (HIGH confidence — read/run directly this session)
- `packages/core/src/operations/seed.ts:48,137-144` — BUILD-01 defect site + signature
- `packages/core/src/environment/looksLikeProject.ts:36-91` — CORE-15 predicate (full body)
- `packages/core/tsup.config.ts`, `packages/mcp/tsup.config.ts:16`, `packages/cli/tsup.config.ts:16` — bundle topology (`noExternal`)
- `packages/mcp/src/index.ts:19-21,294,715-721,839-852`; `packages/cli/src/index.ts:15-17,136,507-513` — bin version derivation, seed call sites, audit filter wiring, isVersionRequest
- `packages/core/src/index.ts:9,21` — barrel exports (looksLikeProject, seed)
- `packages/core/src/types.ts:144-151` — SeedManifest (`toolkitVersion: string`)
- `packages/core/test/operations/seed.test.ts` — real-fs + git-init test pattern
- `packages/core/vitest.config.ts`, root `vitest.config.ts`, `tsconfig.test.json` — test resolution (no src alias)
- `scripts/verify-tarball.mjs:47-115,163,203-213` — version gate + Windows-safe npm spawn
- root `package.json:13-17` — build order, pretest, verify:tarball
- `.planning/debug/audit-includes-root-paths.md` — original symptom (predates the fix)
- `git log` / `git rev-parse` — `looksLikeProject` added in `6ac6d71` (14-10); HEAD `e92c82a`
- Empirical: `scratchpad/tsup-define-test/*` (define substitution + consumer-override impossibility + fallback) and `scratchpad/repro-core15.mjs` (predicate against exact symptom inputs) — run this session
- `node -p require('*/package.json').version` — all versions `3.0.2`, core `private:true`, core in consumers' devDependencies

### Secondary (MEDIUM)
- ROADMAP.md Phase 22 (success criteria + constraints), REQUIREMENTS.md (BUILD-01, CORE-15, Out-of-Scope), STATE.md (Phase 21 close, deferred items)
- `.planning/research/{SUMMARY,ARCHITECTURE,FEATURES,PITFALLS}.md` — milestone research (corroborated against live code; the CORE-15 "already-handled" claim CONFIRMED + extended with reproduction)

### Tertiary (LOW)
- WebSearch on tsup `define` — inconclusive on `noExternal` interaction; superseded by the direct empirical build above (do not rely on the web result).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified live; no new deps
- BUILD-01 mechanism: HIGH — bundle behavior, define substitution, consumer-override impossibility, and dev-build path all proven empirically this session
- CORE-15 disposition: HIGH — symptom reproduced (does not recur) against exact inputs on the original-report machine; predicate wiring confirmed in both consumers at HEAD
- Pitfalls/constraints: HIGH — grounded in direct code read + CLAUDE.md + Out-of-Scope table

**Research date:** 2026-06-30
**Valid until:** ~2026-07-30 (stable monorepo; re-verify versions if a release lands first)

## RESEARCH COMPLETE

**Phase:** 22 - Core Versioning & Audit Filter
**Confidence:** HIGH

### Key Findings
- **BUILD-01 crux resolved empirically:** a `define` in a *consumer's* tsup config CANNOT change core's inlined version (core is pre-compiled to a literal before the consumer bundles it — proven). The only two viable mechanisms are Option A (`seed(projectPath, toolkitVersion)` param — RECOMMENDED, true per-consumer semantics, no build change) and Option B (`define` in *core's* config — bakes core's private version, correct only while versions are lockstep, needs a `typeof` fallback to avoid `ReferenceError` on non-tsup runs).
- **CORE-15 reproduced → it's a regression-lock test, not a logic change.** The two literal symptom paths (`C:\`, `C:\Users\rlasalle`) are already rejected; `looksLikeProject` (added Phase 14-10, `6ac6d71`) is already wired into both audit paths. Success criteria are met by a test alone.
- **Residual CORE-15 leaks surfaced but unnamed in the criteria:** `C:\Users\<otheruser>` and `C:\Users\rlasalle\AppData\Local` pass the predicate today. Optional path-shape-only tightening — planner's scope call; never a marker check (D-01).
- **verify-tarball.mjs** must gain a seed-path version-VALUE assertion (today gates only the bin `--version`); reuse its Windows-safe `[process.execPath, NPM_CLI_JS, ...]` spawn pattern.
- **No `looksLikeProject.test.ts` exists** — creating it (root-rejection + D-01 discovery) is the mandatory CORE-15 deliverable.

### File Created
`C:\Users\rlasalle\Projects\localground\.planning\phases\22-core-versioning-audit-filter\22-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | Versions verified live; no new deps |
| BUILD-01 mechanism | HIGH | Bundle/define behavior proven empirically this session |
| CORE-15 disposition | HIGH | Symptom reproduced against exact inputs; wiring confirmed at HEAD |
| Pitfalls/constraints | HIGH | Direct code read + CLAUDE.md + Out-of-Scope table |

### Open Questions
- BUILD-01 A vs B: recommendation given (A), final pick is plan-phase per ROADMAP.
- CORE-15 residual-leak scope: planner judgment; mandatory test satisfies the criteria regardless.
- verify-tarball seed-invocation mechanism (bin vs direct import): HOW detail, either satisfies SC-3.

### Ready for Planning
Research complete. The planner can choose BUILD-01's mechanism from two fully-specified options (A recommended), knows CORE-15 is a regression-lock test (with an explicit optional scope extension), and has exact file paths, line numbers, current excerpts, and existing analogs for every change.
