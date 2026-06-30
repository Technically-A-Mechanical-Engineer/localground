# Phase 22: Core Versioning & Audit Filter - Pattern Map

**Mapped:** 2026-06-30
**Files analyzed:** 7 (6 modify + 1 create)
**Analogs found:** 7 / 7 (every change has an in-repo analog; no RESEARCH-only fallback needed)

All file:line references below were verified against live code at HEAD `e92c82a` during this mapping pass.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `packages/core/src/operations/seed.ts` | core operation | file-I/O (writes manifest) | self (in-place signature + manifest edit) | exact (same file) |
| `packages/core/src/environment/looksLikeProject.ts` | core predicate | transform (pure string→bool) | self (in-place guard-clause additions) | exact (same file) |
| `packages/mcp/src/index.ts` | consumer call site | request-response (MCP tool handler) | `packages/cli/src/index.ts:136` (sibling call site) | exact |
| `packages/cli/src/index.ts` | consumer call site | request-response (CLI command) | `packages/mcp/src/index.ts:294` (sibling call site) | exact |
| `packages/core/test/operations/seed.test.ts` | unit test | file-I/O + git (real-fs fixture) | self (in-place 2-arg + new assertion) | exact (same file) |
| `packages/core/test/environment/looksLikeProject.test.ts` | unit test (NEW) | transform (pure predicate, homedir-aware) | `packages/core/test/environment/classify.test.ts` + `seed.test.ts:12-22` (initGitRepo) | role-match (real-fs env test) |
| `scripts/verify-tarball.mjs` | CI verification script | file-I/O + spawn (pack/install/seed) | self (`:203-213` `--version` value-assert → extend) | exact (same file) |

## Pattern Assignments

### `packages/core/src/operations/seed.ts` (core operation, file-I/O) — MODIFY (D-01)

**Analog:** self — a 2-token edit inside the existing function. No new branch, no throw, Result type unchanged.

**Current signature** (`seed.ts:48-50`) — add the second param here:
```typescript
export async function seed(
  projectPath: string,
): Promise<Result<SeedManifest, SeedFailureReason>> {
```
→ becomes `seed(projectPath: string, toolkitVersion: string): Promise<Result<SeedManifest, SeedFailureReason>>` (Option A, D-01).

**Current manifest literal** (`seed.ts:137-144`) — the defect site; line 139 is the last hardcoded version:
```typescript
const manifest: SeedManifest = {
  version: 1,
  toolkitVersion: '3.0.2',          // ◄ line 139 — replace with `toolkitVersion,` shorthand
  created: new Date().toISOString(),
  projectPath,
  projectName: path.basename(projectPath),
  markers,
};
```
→ line 139 becomes `toolkitVersion,` (shorthand consuming the param). `SeedManifest.toolkitVersion` is typed `string` (`types.ts:146`), so no type change.

**Result-type discipline** (`packages/core/src/types.ts:7-27`): `seed()` already returns `{ success: true, data }` / `{ success: false, reason, detail }` at every exit (e.g. `seed.ts:55,66,158`). D-01 adds **no** new exit and **no** throw — the param is consumed, nothing else. Keep it that way.

---

### `packages/core/src/environment/looksLikeProject.ts` (core predicate, transform) — MODIFY (D-06, preserve D-05)

**Analog:** self — the existing predicate body is the pattern to extend with additional **path-shape-only** guard clauses. NO `.git`/`package.json` marker check (D-05; the doc comment at `:22-24` already states this prohibition — keep it true).

**Existing predicate body** (`looksLikeProject.ts:36-67`) — the structure new guards slot into (after the two existing root/home rejections at `:47-54`, before or within the segment-count branches at `:56-66`):
```typescript
export function looksLikeProject(absolutePath: string): boolean {
  if (!absolutePath || typeof absolutePath !== 'string') {
    return false;
  }
  const resolved = path.resolve(absolutePath);
  const root = path.parse(resolved).root; // "C:\\" on Windows, "/" on Unix
  const home = os.homedir();

  if (resolved === root) return false;          // reject filesystem root
  if (caseEqual(resolved, home)) return false;  // reject literal home

  // If under home: require at least 2 segments below home
  if (isUnder(resolved, home)) {
    const relativeFromHome = path.relative(home, resolved);
    const segments = relativeFromHome.split(path.sep).filter((s) => s.length > 0);
    return segments.length >= 2;
  }

  // Not under home: require at least 2 segments below filesystem root
  const relativeFromRoot = path.relative(root, resolved);
  const segments = relativeFromRoot.split(path.sep).filter((s) => s.length > 0);
  return segments.length >= 2;
}
```

**Helper pattern to reuse** (`looksLikeProject.ts:73-91`) — `caseEqual` (win32-insensitive) and `isUnder` (strict-descendant via `path.relative`) are the existing primitives for any new guard; reuse them rather than hand-rolling regex (RESEARCH "Don't Hand-Roll": use `path.parse().root`, `os.homedir()`, `path.relative()` segment counting):
```typescript
function caseEqual(a: string, b: string): boolean {
  if (process.platform === 'win32') return a.toLowerCase() === b.toLowerCase();
  return a === b;
}
function isUnder(child: string, parent: string): boolean {
  const rel = path.relative(parent, child);
  if (!rel) return false;
  if (rel.startsWith('..')) return false;
  if (path.isAbsolute(rel)) return false;
  return true;
}
```

**D-06 tightenings to add** (path-shape-only — each paired with a same-depth legitimate-sibling test in the new test file):
- **(a)** Reject direct children of the OS users-container — other-user home roots (`C:\Users\someoneelse` on win32; `/home/<x>`, `/Users/<x>` on posix). The "not under home" branch currently lets these through as 2-below-root. Prefer the cross-platform formulation (reject when the parent segment is the users-container) per CONTEXT deferred note.
- **(b)** Basename denylist of system/cache dirs — at minimum `AppData` (closes the `…\AppData\Local` leak). Discretionary additions (`node_modules`, `.cache`) are the planner's call per D-06, each path-shape-only and each with a paired sibling test.

**Doc-comment maintenance:** the `:25-34` examples block enumerates expected input→output pairs and maps 1:1 to test cases — update it to add the new rejection examples when the guards land.

**Purity invariant:** no I/O, no throw, no async. Pure `string → boolean`. Holds today; must hold after D-06.

---

### `packages/mcp/src/index.ts` (consumer call site, request-response) — MODIFY (D-01)

**Analog:** the sibling CLI call site (`cli/src/index.ts:136`) — same one-token change.

**Version already derived in scope** (`mcp/src/index.ts:19-21`) — no new derivation needed:
```typescript
const SERVER_VERSION = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
).version as string;
```

**Seed call site** (`mcp/src/index.ts:293-296`) — pass `SERVER_VERSION` as the new second arg:
```typescript
}, async ({ projectPath }, _extra) => {
  const result = await seed(projectPath);          // ◄ line 294 → await seed(projectPath, SERVER_VERSION)
  return resultToMcp(result);
});
```

**Audit filter wiring — DO NOT TOUCH** (`mcp/src/index.ts:715-721`, D-04 reference only): the D-06 `looksLikeProject` tightening propagates here automatically via the existing `.filter(looksLikeProject)`; no edit at this site.
```typescript
  ).filter((r): r is Success<PathHashEntry> => r.success && r.data.decodedPath !== null && r.data.exists)
   .map((r) => r.data.decodedPath as string)
   .filter(looksLikeProject);   // ◄ line 721 — unchanged; inherits the tightening
```

---

### `packages/cli/src/index.ts` (consumer call site, request-response) — MODIFY (D-01)

**Analog:** the sibling MCP call site (`mcp/src/index.ts:294`) — same one-token change.

**Version already derived in scope** (`cli/src/index.ts:15-17`):
```typescript
const VERSION = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
).version as string;
```

**Seed call site** (`cli/src/index.ts:136`) — pass `VERSION` as the new second arg:
```typescript
    const result = await seed(projectPath);          // ◄ line 136 → await seed(projectPath, VERSION)
```

**Audit filter wiring — DO NOT TOUCH** (`cli/src/index.ts:507-513`, D-04 reference only): identical `.filter(looksLikeProject)`; inherits the D-06 tightening with zero edit (D-07).

---

### `packages/core/test/operations/seed.test.ts` (unit test, file-I/O + git) — MODIFY (D-02)

**Analog:** self — update existing calls + add one assertion. The `initGitRepo` + `mkdtemp`/`afterEach` real-fs+git pattern is already established here and is the verbatim template for the new predicate test below.

**Real-fs + git-init fixture** (`seed.test.ts:12-33`) — the pattern to keep and to copy into the new test:
```typescript
function initGitRepo(dir: string): void {
  const initResult = spawnSync('git', ['init'], { cwd: dir, encoding: 'utf8' });   // array args, no shell
  if (initResult.status !== 0) throw new Error(`git init failed: ${initResult.stderr}`);
  spawnSync('git',
    ['-c', 'user.email=test@example.com', '-c', 'user.name=Test', 'commit', '--allow-empty', '-m', 'init'],
    { cwd: dir, encoding: 'utf8' });
}

describe('seed', () => {
  let tmpDir: string;
  beforeEach(async () => { tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'localground-test-')); });
  afterEach(async () => { await fs.rm(tmpDir, { recursive: true, force: true }); });
```

**Calls to update to the 2-arg form** — there are **7** `seed()` calls in this file, not 6. Six pass `tmpDir`; one passes `missing`. All seven must take the new second arg once `seed()`'s signature changes (TypeScript will fail `build:check` otherwise):

| Line | Current | After |
|------|---------|-------|
| 38 | `await seed(tmpDir)` | `await seed(tmpDir, '<v>')` |
| 56 | `await seed(tmpDir)` | `await seed(tmpDir, '<v>')` |
| 67 | `await seed(tmpDir)` | `await seed(tmpDir, '<v>')` |
| 80 | `await seed(tmpDir)` (`first`) | `await seed(tmpDir, '<v>')` |
| 83 | `await seed(tmpDir)` (`second`) | `await seed(tmpDir, '<v>')` |
| 92 | `await seed(tmpDir)` (not_a_git_repo) | `await seed(tmpDir, '<v>')` |
| 101 | `await seed(missing)` (not_a_directory) | `await seed(missing, '<v>')` |

(D-02 says "6 existing `seed(tmpDir)` calls" — that count is correct for the `tmpDir` calls; the 7th at `:101` uses the `missing` variable and also requires the second arg. Flagging so the planner does not leave a type error.)

**New value-equality assertion (D-02)** — add to the success test (model after `seed.test.ts:40-51`, which already narrows `if (result.success)` before reading `result.data`). Define a fixed version literal (e.g. `const TOOLKIT_VERSION = '9.9.9-test';`), pass it in, and assert the manifest echoes it. This is the unit-level proof BUILD-01 fixed the drift:
```typescript
it('writes the toolkitVersion passed to seed() into the manifest', async () => {
  initGitRepo(tmpDir);
  const result = await seed(tmpDir, '9.9.9-test');
  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.toolkitVersion).toBe('9.9.9-test');   // value-equality, not shape
  }
});
```

---

### `packages/core/test/environment/looksLikeProject.test.ts` (unit test, transform) — CREATE (D-04, D-05, D-06)

**Analog:** `packages/core/test/environment/classify.test.ts` (real-fs env-test skeleton) + `seed.test.ts:12-22` (initGitRepo, only if a real git repo is wanted for a discovery fixture — usually unnecessary since `looksLikeProject` does no I/O). No `*looks*` test exists today (verified: `Glob packages/core/test/**/*looks*` → empty).

**Skeleton to copy** (`classify.test.ts:1-17`) — imports, `mkdtemp`/`afterEach` real-fs cleanup. Add `import { looksLikeProject } from '@localground/core';`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { looksLikeProject } from '@localground/core';

describe('looksLikeProject', () => {
  let tmpDir: string;
  beforeEach(async () => { tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'localground-test-')); });
  afterEach(async () => { await fs.rm(tmpDir, { recursive: true, force: true }); });
  // ...
});
```

**Mandatory invariants to lock** (from RESEARCH "Required test (SC-5)" + the predicate's own `:26-34` example table):

1. **Root-rejection (SC-4):** `looksLikeProject('C:\\') === false`; `looksLikeProject(os.homedir()) === false`; `looksLikeProject('/') === false`. Use `os.homedir()` (not a hardcoded home) so the test is portable across the 3-OS CI matrix.
2. **D-01 plain-folder discovery (SC-5, the D-05 guard):** a real temp dir **≥2 segments below home** with **no `.git` and no `package.json`** asserts `=== true`. This is the assertion that fails loudly if anyone later adds a marker check (D-05). Cross-platform caveat: derive home-relative paths from `os.homedir()`; absolute literals like `'C:\\'` exercise `path.parse().root` logic on the string and behave on any platform.
3. **D-06 tightenings (paired):** for each rejection added — `(a)` other-user home (`<usersContainer>/someoneelse`), `(b)` `AppData` basename — add a rejection test **and** a same-depth legitimate-sibling test proving a real project at the same depth still qualifies (e.g. reject `C:\Users\someoneelse`, but `C:\Users\me\Projects\app` and a 2-below-root sibling stay `true`).

**Cross-platform note** (RESEARCH `:251`): `looksLikeProject` branches on `process.platform` and uses `os.homedir()`. Home-relative assertions must derive from `os.homedir()` to stay green on Linux/macOS runners. The CI matrix is 3-OS — portable assertions are mandatory, not optional.

---

### `scripts/verify-tarball.mjs` (CI verification script, file-I/O + spawn) — MODIFY (D-03)

**Analog:** self — the existing `--version` value-assert (`:203-213`) is the exact template; D-03 adds a parallel seed-path version-VALUE assert in the same installed-tarball tmp dir, after the `--version` check, inside `verifyOne(pkg)` before the `finally` cleanup. Changes are **additive** — the existing exact-string `--version` contract MUST stay green (CONTEXT "Contracts that MUST stay green").

**Windows-safe spawn helpers to reuse verbatim** (`verify-tarball.mjs:47-63`, `:79-115`):
```javascript
function resolveNpmCliJs() {
  if (process.env.npm_execpath && process.env.npm_execpath.endsWith('.js')) return process.env.npm_execpath;
  const requireFn = createRequire(import.meta.url);
  try { return requireFn.resolve('npm/bin/npm-cli.js'); }
  catch {
    const nodeDir = path.dirname(process.execPath);
    return process.platform === 'win32'
      ? path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js')
      : path.join(nodeDir, '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js');
  }
}
const NPM_CLI_JS = resolveNpmCliJs();
// run(cmd, args, opts) — spawn with array args, stdio pipe, watchdog timeout; never shell:true (:79-115)
```

**Existing `--version` value-assert** (`verify-tarball.mjs:203-213`) — the template for the new seed assert (note `expectedVersion` is already read at `:163` from the tarball's `package.json`; the bin entry is already resolved at `:197`):
```javascript
const versionResult = await run(process.execPath, [binEntry, '--version']);
if (versionResult.exitCode !== 0) { throw new Error(/* ... */); }
const actualVersion = versionResult.stdout.trim();
if (actualVersion !== expectedVersion) {
  throw new Error(`${pkg.name}: --version printed "${actualVersion}" but manifest declares "${expectedVersion}" — version drift; ...`);
}
```

**D-03 extension to add** (after `:215`, before the `finally` at `:216`): in the same `tmpDir`, create a sub-directory, `git init` it (array args via `run`/`spawnSync` — never `shell:true`; mirror `seed.test.ts:12-22` `initGitRepo`), drive the package's seed path against it, read `.localground-seed-manifest.json`, and assert `JSON.parse(manifest).toolkitVersion === expectedVersion`. Throw a drift error string in the same style as `:212` on mismatch.

**Invocation mechanism (Claude's Discretion / A2):** bin-driven (run the cli `seed` command, which validates `path.isAbsolute` and calls `seed(projectPath)`) vs a small direct-import driver importing the installed package. Either satisfies SC-3; the bin path more faithfully exercises the shipped artifact. Note: the **mcp** package has no `seed` bin command (seed is an MCP tool over stdio), so for the mcp tarball a direct-import driver (`process.execPath` against an inline `.mjs` that `import`s the installed package and calls `seed`) is the simpler path; the **cli** tarball can use either. Planner's call.

---

## Shared Patterns

### Result type — never throw from core
**Source:** `packages/core/src/types.ts:7-27`; exemplified across `seed.ts` (every exit returns `{ success, data }` / `{ success: false, reason, detail }`).
**Apply to:** `seed.ts` (D-01 — param consumed, no new exit), `looksLikeProject.ts` (already pure `string→boolean`, returns `false` not throw — keep it).
**Rule:** No `throw` in core. Narrow with `if (result.success)` before reading `.data` (see `seed.test.ts:40`, `classify.test.ts:27`).

### Real-fs test fixtures (`os.tmpdir()` + `fs.mkdtemp` + `afterEach`)
**Source:** `packages/core/test/operations/seed.test.ts:25-33`; `packages/core/test/environment/classify.test.ts:9-17`.
**Apply to:** `seed.test.ts` (keep), the NEW `looksLikeProject.test.ts`, and the `verify-tarball.mjs` seed-assert temp dir.
**Rule:** No mocked fs (`vi.mock('node:fs')`, `memfs`). Real temp dirs, `afterEach` cleanup with `{ recursive: true, force: true }`.
```typescript
beforeEach(async () => { tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'localground-test-')); });
afterEach(async () => { await fs.rm(tmpDir, { recursive: true, force: true }); });
```

### Spawn discipline (array args, never `shell:true`)
**Source:** `packages/core/test/operations/seed.test.ts:13-21` (git via `spawnSync('git', [...])`); `scripts/verify-tarball.mjs:47-63` (npm via `[process.execPath, NPM_CLI_JS, ...]`), `:79-115` (`run`).
**Apply to:** `verify-tarball.mjs` D-03 git-init + seed invocation; any spawn in the new test.
**Rule:** Always array args. Never `execSync` string-concat, never `shell:true`. On Windows + Node 20+, spawn npm/git via `[process.execPath, <cli.js>, ...]` to dodge the `.cmd`-shim EINVAL (CVE-2024-27980). Add a watchdog timeout for long spawns (see `run` at `:91-98`).

### Build/type gate
**Source:** CONTEXT `<code_context>`; root `package.json` build/`build:check` scripts.
**Apply to:** all 7 files.
**Rule:** Build via tsup (installed `^8.5.1` / `8.5.1` live — **do NOT bump**). `tsc --build:check` is the strict gate over **src + test**, so every `seed()` call in `seed.test.ts` (all 7) must take the new 2nd arg or `build:check` fails. Option A needs **no** ambient `declare const` (that was an Option-B-only concern, not in scope).

## No Analog Found

None. Every file in scope has a verified in-repo analog (4 are same-file in-place edits; the new `looksLikeProject.test.ts` reuses the `classify.test.ts` + `seed.test.ts` patterns; the two call sites are mirror images of each other). The planner does not need to fall back to RESEARCH.md code examples for pattern shape — though RESEARCH.md remains the authoritative source for the BUILD-01 Option-A vs Option-B decision and the CORE-15 reproduction truth table.

## Metadata

**Analog search scope:** `packages/core/src/`, `packages/core/test/`, `packages/mcp/src/`, `packages/cli/src/`, `scripts/`.
**Files scanned (read this pass):** `seed.ts`, `looksLikeProject.ts`, `seed.test.ts`, `classify.test.ts`, `verify-tarball.mjs`, `mcp/src/index.ts` (3 ranges), `cli/src/index.ts` (3 ranges).
**Verification:** all file:line refs confirmed against live code at HEAD `e92c82a`. The RESEARCH-named line numbers all matched live except where this map states the corrected count (7 `seed()` calls in `seed.test.ts`, not 6).
**Pattern extraction date:** 2026-06-30

## PATTERN MAPPING COMPLETE

**Phase:** 22 - Core Versioning & Audit Filter
**Files classified:** 7 (6 modify + 1 create)
**Analogs found:** 7 / 7

### Coverage
- Files with exact analog (same-file in-place edit): 4 — `seed.ts`, `looksLikeProject.ts`, `seed.test.ts`, `verify-tarball.mjs`
- Files with exact analog (mirror sibling): 2 — `mcp/src/index.ts`, `cli/src/index.ts`
- Files with role-match analog: 1 — NEW `looksLikeProject.test.ts` (← `classify.test.ts` + `seed.test.ts` fixture)
- Files with no analog: 0

### Key Patterns Identified
- BUILD-01 (D-01) is a 4-token change: `seed()` gains a `toolkitVersion` param consumed at `seed.ts:139`; the two bins pass their already-in-scope derived version (`SERVER_VERSION` mcp:294, `VERSION` cli:136). No build-config change.
- Core never throws — `seed()` keeps its Result-type exits; `looksLikeProject` stays pure `string→boolean`. D-06 adds only path-shape guard clauses (reuse `caseEqual`/`isUnder`), never a marker check (D-05).
- All tests use real-fs `mkdtemp`/`afterEach` fixtures and array-arg spawn discipline (no mocked fs, no `shell:true`). The `verify-tarball.mjs` D-03 extension reuses `resolveNpmCliJs()` + `[process.execPath, ...]` verbatim and is additive to the existing `--version` value-assert.

### Correction surfaced for the planner
- `seed.test.ts` has **7** `seed()` calls needing the 2nd arg (six on `tmpDir`, one on `missing` at `:101`), not 6 — leaving `:101` un-updated will fail `tsc --build:check`.
- The **mcp** tarball has no `seed` bin command (seed is an MCP stdio tool), so the D-03 seed-value assert for mcp needs a direct-import driver, not a bin invocation; the cli tarball can use either.

### File Created
`C:\Users\rlasalle\Projects\localground\.planning\phases\22-core-versioning-audit-filter\22-PATTERNS.md`

### Ready for Planning
Pattern mapping complete. Every change has a concrete in-repo analog with verified file:line excerpts. Planner can reference these directly in PLAN.md action sections.
