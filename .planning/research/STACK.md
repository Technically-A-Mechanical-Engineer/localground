# Stack Research

**Domain:** Hardening/hygiene milestone (v3.1.0) for an existing TypeScript npm-workspace toolkit — no new feature surface
**Researched:** 2026-06-29
**Confidence:** HIGH (all SHAs/versions verified against live GitHub + npm registry on 2026-06-29; codebase patterns read directly)

## TL;DR for the Roadmapper

Of the five v3.1.0 items, **only SEC-01 requires a new tool/dependency decision.** The other four are pure internal changes against existing code using existing deps:

| Item | New tooling? | What it touches |
|------|-------------|-----------------|
| **SEC-01** | **YES — adopt Dependabot (`package-ecosystem: github-actions`)** + a one-time SHA-pin edit | `.github/workflows/*.yml`, new `.github/dependabot.yml` |
| **BUILD-01** | NO — mirror the existing v3.0.1 runtime-read pattern | `packages/core/src/operations/seed.ts:139` |
| **CLI-06** | NO — keep hand-rolled, fix the parse logic | `packages/mcp/src/index.ts:836` |
| **CORE-15** | NO — pure logic fix | `packages/core/src/environment/looksLikeProject.ts` |
| **CORE-16** | NO — pure algorithm fix | `packages/core/src/environment/decode.ts` (`buildCandidates`) |

---

## SEC-01 — SHA-pin GitHub Actions + pin runner npm

### Recommended approach: manual one-time SHA-pin + Dependabot for maintenance

**The pin (do this once, by hand or via `pinact`):** rewrite every `uses:` line to a full 40-char commit SHA with the human-readable tag preserved as a trailing comment. Bump both actions to their current latest majors while pinning (the repo is on mixed `@v4`/`@v6` today).

**The maintenance loop (the part that matters for a solo non-dev maintainer):** add `.github/dependabot.yml` with `package-ecosystem: "github-actions"`. Dependabot opens a PR when a pinned action ships a new release, rewrites the SHA, **and updates the `# vX.Y.Z` comment to match** (the comment-update fix merged into dependabot-core in 2022 via PR #5951 — VERIFIED, `merged: true`). The maintainer reviews and merges one PR; no manual SHA-hunting, ever.

This is the GitHub-native path. It needs zero new accounts, zero CI minutes for a separate scanner, and no extra third-party action in the release pipeline (which is the point — you don't want more moving parts in the `id-token: write` job).

### The exact pins to apply (VERIFIED 2026-06-29 against live GitHub API)

```yaml
# ci.yml and release.yml — checkout
- uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0

# ci.yml — setup-node (matrix job, Node 20.x)
- uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0

# release.yml — setup-node (publish job, Node 22.x) — same action, same SHA
- uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0
```

| Action | Pin to (commit SHA) | Tag | Verification |
|--------|--------------------|-----|--------------|
| `actions/checkout` | `9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0` | `v7.0.0` | `git/ref/tags/v7.0.0` → commit; mutable `v7` == `v7.0.0` == this SHA |
| `actions/setup-node` | `48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e` | `v6.4.0` | `git/ref/tags/v6.4.0` → commit; mutable `v6` == `v6.4.0` == this SHA |

Notes:
- The repo currently uses `actions/checkout@v4` (both files), `actions/setup-node@v4` (ci.yml) and `actions/setup-node@v6` (release.yml). Pinning is the right time to unify on the current major.
- Both tags resolve directly to commits (lightweight tags), so the SHA above **is** the commit SHA — no annotated-tag dereference needed.
- If the implementer prefers to stay on the major the repo already tested (`checkout@v4` = `34e114876b0b11c390a56381ad16ebd13914f8d5`, `setup-node@v4` = `49933ea5288caeca8642d1e84afbd3f7d6820020`), those SHAs are also verified and valid. Recommendation is to move to v7/v6 since Dependabot will push that bump anyway and v3.0.1's pipeline already runs `setup-node@v6` in release.yml without issue.

### `.github/dependabot.yml` to add

```yaml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    # Keeps both ci.yml and release.yml pins current; Dependabot rewrites the
    # SHA and the trailing "# vX.Y.Z" comment together.
```

(`directory: "/"` covers all workflows under `.github/workflows/`. No separate entry per file.)

### Runner npm pin (publish job)

Replace the floating `npm install -g npm@^11.5.1` with an exact pin:

```yaml
- name: Pin npm to an OIDC-capable version
  run: npm install -g npm@11.18.0
```

**Why `11.18.0`:** it is the current `latest` on the npm `dist-tag` (VERIFIED — `npm view npm@latest version` → `11.18.0`, published 2026-06-29), it is well above the 11.5.1 OIDC floor the project already established, and exact-pinning removes the `^` range that could silently pull a different patch on a future release run. The 11.x line is stable; `next-12` is `12.0.0-pre.2` (pre-release, not relevant). Pin the exact string, and let SEC-01's Dependabot loop is **not** responsible for this — npm-on-the-runner is a `run:` step, not a `uses:` action, so it won't be tracked. Bump it manually when you bump anything else, or accept it drifts (it's an exact, known-good version — drift here is benign and explicit, the opposite of the SHA-pin problem).

### SEC-01 alternatives considered (and why not for this maintainer)

| Tool | What it does | Why not the primary here |
|------|-------------|--------------------------|
| **pinact** (v4.1.0, 2026-06-09) | Go CLI; resolves every `uses:` tag to its SHA and rewrites with a comment. Excellent for the **initial** pin. | Great as a one-shot local helper, but it's a third-party Go binary the non-dev maintainer would have to install/run on Windows. Use it once if convenient, but it is **not** needed for ongoing maintenance — Dependabot covers that natively. Don't add `pinact-action` (v3.0.0) to CI; it's another action to trust in the pipeline. |
| **ratchet** | Similar pin/unpin/update CLI. | Same objection as pinact — extra local tooling; no maintenance advantage over Dependabot for a 2-action repo. |
| **StepSecurity Harden-Runner / step-security/secure-repo** | Runtime egress monitoring + an automated PR service that SHA-pins. | Overkill. Adds a network-egress agent to every job and an external service relationship. Wrong weight class for a 2-workflow toolkit; introduces exactly the kind of opaque moving part you don't want near `id-token: write`. |
| **Renovate** | Most powerful updater; pins and bumps actions, supports `helpers:pinGitHubActionDigests`. | More configuration surface than a solo non-dev maintainer needs. Dependabot is GitHub-native, zero-install, and sufficient for two actions. Renovate is the right call only if the repo later grows many ecosystems/policies. |

**Bottom line for SEC-01:** one manual SHA-pin commit (optionally assisted by `pinact` locally) + `.github/dependabot.yml` + exact npm pin. No new runtime/CI dependency, no external service.

---

## BUILD-01 — Seed `toolkitVersion` from `package.json`

### The defect

`packages/core/src/operations/seed.ts:139` hardcodes `toolkitVersion: '3.0.2'`. This is the same drift class that bit `--version` in v3.0.1 (binaries printed `3.0.0` after a manifest-only bump).

### The complication: `seed()` is bundled, not standalone

`seed.ts` lives in `@localground/core`, which is **inlined** into `mcp/dist/index.js` and `cli/dist/index.js` via tsup `noExternal: ['@localground/core']`. So at runtime, the seed code executes from *inside* the mcp or cli bundle, not from a `@localground/core` package directory. Any solution must produce the right version in all three contexts (mcp bundle, cli bundle, core's own `dist` when imported by tests).

### Recommended approach: build-time injection via tsup `define` (esbuild constant)

**Add a build-time constant injected by each package's `tsup.config.ts`**, read from that package's own `package.json`:

```ts
// packages/core/tsup.config.ts (and mcp, cli configs)
import { defineConfig } from 'tsup';
import { readFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  // ...existing config...
  define: { __TOOLKIT_VERSION__: JSON.stringify(pkg.version) },
});
```

```ts
// seed.ts
declare const __TOOLKIT_VERSION__: string;
// ...
toolkitVersion: __TOOLKIT_VERSION__,
```

esbuild replaces `__TOOLKIT_VERSION__` with the string literal at build time. Because all three package.json files are version-locked to the same value (`3.0.2` today, lockstep by the release.yml tag↔version preflight), the constant is correct in every bundle. This is the cleanest fit: zero runtime filesystem access, no path-resolution fragility, and it can't drift because tsup reads the live `package.json` on every build.

### Why NOT the runtime-readFileSync pattern the bins use

The v3.0.1 bins use:
```ts
JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version
```
That works *for the bins* because `dist/index.js` sits exactly one level under the package root, so `../package.json` lands on `mcp/package.json` / `cli/package.json`. **It does not transplant cleanly into `seed.ts`**: when core's code is bundled into mcp/cli, `import.meta.url` points at the mcp/cli `dist/index.js`, so `../package.json` would resolve to the *host* package's manifest — which happens to be correct only because versions are locked in lockstep. That's a coincidence, not a guarantee, and it adds a runtime `readFileSync` on the seed hot path. The bins can keep their runtime pattern (it's correct for their location); **`seed.ts` should not copy it** — use the build-time `define` instead, which is robust regardless of bundling target.

### BUILD-01 alternatives considered

| Approach | Verdict |
|----------|---------|
| tsup/esbuild `define` constant | **Recommended.** Build-time, bundling-agnostic, no runtime I/O. |
| Runtime `readFileSync(new URL('../package.json'...))` (mirror the bins) | Works only by version-lockstep coincidence when bundled; adds runtime I/O. Reject for `seed.ts`. |
| esbuild `banner` injection | Coarse (prepends raw text); `define` is the purpose-built mechanism. No. |
| Generated `version.ts` module (prebuild script writes the constant) | Adds a build step + a generated file to manage. `define` achieves the same with one config line. No. |
| Pass version in as a `seed(projectPath, version)` argument | Pushes the problem to every caller (mcp tool, cli command, tests). Worse ergonomics. No. |

**No new dependency** — `define` is native to tsup/esbuild (already the bundler). The only addition is one config line per package and a `declare const`.

---

## CLI-06 — Robust `--version` parsing in the mcp bin

### Recommendation: keep it hand-rolled; fix the logic. No dependency.

`packages/mcp/src/index.ts:836` currently does `if (process.argv.includes('--version'))`. The mcp bin is **not** a Commander program (unlike the cli bin, which gets robust `--version` for free via `program.version(VERSION)` at `packages/cli/src/index.ts:24`). The mcp bin is an MCP stdio server with a single smoke-test escape hatch.

Pulling in Commander (or any arg parser) for one flag on a server entry point is unjustified weight — it would add a runtime dependency to the mcp package solely to parse one argument, and the MCP server has no other CLI surface to justify it. The fix is a few lines of robust matching:

```ts
const argv = process.argv.slice(2);
const wantsVersion = argv.some(
  (a) => a.toLowerCase() === '--version' || a.toLowerCase().startsWith('--version='),
);
if (wantsVersion) {
  process.stdout.write(`${SERVER_VERSION}\n`);
  process.exit(0);
}
```

This handles `--version`, `--version=foo` (the `=foo` is ignored — correct for a boolean flag), and `--Version` (case-insensitive), which are exactly the cases the milestone calls out. Mirror the same handling for `-v`/`--help` only if the roadmap wants it — not required by CLI-06.

**No new dependency.** Lean to zero, as instructed — this is one bin flag, not a CLI.

---

## CORE-15 — Audit project-fingerprint filter

### Recommendation: pure logic fix in `looksLikeProject.ts`. No dependency.

The audit auto-discovery already routes through `looksLikeProject` (`packages/mcp/src/index.ts:721` filters decoded paths through it). The function uses only `node:os` and `node:path` built-ins. The bug — auto-discovery still surfacing broad `C:\Users\…` paths — is a heuristic gap in the existing "≥2 segments below home" rule, not a missing capability. Fix is tightening the predicate logic and/or its tests. **No new dependency.**

(Honest uncertainty: the exact corrected heuristic is a phase-implementation decision, not a tooling one — research can confirm only that no library is needed, which it isn't.)

---

## CORE-16 — Path-hash decode trailing-edge round-trip fix (999.7)

### Recommendation: pure algorithm fix in `decode.ts`. No dependency.

`packages/core/src/environment/decode.ts` (`buildCandidates`, lines 144-200) is the trailing-edge defect site — a CORE-13-class special character at the trailing edge of an intermediate component still fails to decode (documented in project memory `999.7`). It uses only `node:fs/promises` and `node:path`. The fix is in the prefix-match / exact-match branch logic. **No new dependency.**

---

## What NOT to Add (explicit)

| Do NOT add | Why |
|-----------|-----|
| `pinact-action` / `step-security/*` / Harden-Runner to CI | Extra third-party actions in the pipeline — especially bad near the `id-token: write` job. Dependabot is native and sufficient. |
| Renovate | More config than a 2-action solo-maintainer repo warrants; Dependabot covers it. |
| Commander (or any arg parser) to `@localground/mcp` | One bin flag does not justify a runtime dep on a server entry point. |
| A generated `version.ts` / prebuild script | tsup `define` does the same in one config line. |
| Runtime `readFileSync` inside `seed.ts` | Bundling-fragile; use build-time `define`. |
| Any new dep for CORE-15 / CORE-16 | Both are pure `node:`-builtin logic fixes. |
| `tsup` major upgrade | Repo is on `tsup ^8.5.1` (verified in root `package.json`) — the milestone context's "^9" is inaccurate; **do not bump tsup as part of this milestone**, `define` works on v8. |

---

## Version Compatibility / Notes

| Item | Current (verified) | Action |
|------|--------------------|--------|
| `actions/checkout` | repo `@v4`; latest `v7.0.0` = `9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0` | Pin to v7.0.0 SHA |
| `actions/setup-node` | repo `@v4`/`@v6`; latest `v6.4.0` = `48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e` | Pin to v6.4.0 SHA, unify both files |
| runner npm | release.yml `npm@^11.5.1` (range) | Exact-pin `npm@11.18.0` (latest, ≥ OIDC floor 11.5.1) |
| tsup | `^8.5.1` (root devDep) | No change; `define` supported on v8 |
| Dependabot comment-update | merged in dependabot-core PR #5951 (2022) | Native — relied upon for SHA-pin freshness |
| pinact (optional one-shot) | v4.1.0 (2026-06-09) | Optional local helper only; not a dependency |

---

## Sources

- GitHub API `repos/actions/checkout/git/ref/tags/v7.0.0` and `.../v7` — checkout SHA `9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0`, mutable==immutable confirmed — HIGH (live, 2026-06-29)
- GitHub API `repos/actions/setup-node/git/ref/tags/v6.4.0` and `.../v6` — setup-node SHA `48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e`, mutable==immutable confirmed — HIGH (live, 2026-06-29)
- `npm view npm@latest version` → `11.18.0` (published 2026-06-29); `npm@11.5.1` confirmed exists (OIDC floor) — HIGH (live registry)
- GitHub API `repos/dependabot/dependabot-core/pulls/5951` → `merged: true` (2022-10-31) — version-comment update on SHA bump is native — HIGH
- GitHub API `repos/suzuki-shunsuke/pinact/releases/latest` → `v4.1.0` (2026-06-09); `pinact-action` → `v3.0.0` — HIGH
- WebSearch: Dependabot SHA-pin + version-comment behavior, pinact capabilities — MEDIUM (corroborated by the API checks above)
- Repo files read directly: `release.yml`, `ci.yml`, `scripts/verify-tarball.mjs`, `packages/core/src/operations/seed.ts` (`toolkitVersion: '3.0.2'` @ L139), `packages/mcp/src/index.ts` (runtime version read @ L19-21, `process.argv.includes('--version')` @ L836), `packages/cli/src/index.ts` (Commander `.version()` @ L24), all `tsup.config.ts`, all `package.json` (tsup `^8.5.1`), `looksLikeProject.ts`, `decode.ts`, `scan.ts` — HIGH

---
*Stack research for: v3.1.0 Hardening and Hygiene milestone*
*Researched: 2026-06-29*
