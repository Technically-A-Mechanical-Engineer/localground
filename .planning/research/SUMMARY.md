# Research Summary — v3.1.0 Hardening and Hygiene

**Synthesized:** 2026-06-29
**Sources:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md (4 parallel researchers, opus)
**Overall confidence:** HIGH

---

## Executive Summary

This is a **pure hardening milestone** — five targeted correctness fixes on a shipped, stable three-package TypeScript monorepo. No new features. The work splits into two tracks:

- **Supply-chain** — SEC-01: SHA-pin GitHub Actions + exact-pin runner npm
- **Code correctness** — BUILD-01 (eliminate a hardcoded version literal in `seed.ts`), CLI-06 (robustify the mcp bin `--version` parser), CORE-15 (audit project-fingerprint filter), CORE-16 (fix a trailing-edge path-hash decode defect)

All four researchers converged strongly; confidence is HIGH across all items.

**The overarching v3.0.1 lesson — assert VALUES, not shapes — applies to every item.** A shape-only CI check shipped a bad version immutably in v3.0.1; that must not repeat. Concretely:
- BUILD-01 → seed manifest **value-equality** gate (not just removal of the literal)
- CORE-16 → the 17/17 round-trip regression guard **plus** new trailing-edge fixtures
- SEC-01 → SHA↔tag verification **and** an `npm --version` floor-assert
- CLI-06 → `verify-tarball.mjs` stays green (exit 0 + exact version string)
- CORE-15 → plain-folder **still discovered** AND roots **rejected**

---

## Key Findings

### Stack (no new runtime deps; one Dependabot config for SEC-01 maintenance)
- **Installed bundler is `tsup ^8.5.1`** (NOT ^9 — do not bump). The `define` constant mechanism for BUILD-01 is supported on v8.
- **Verified action SHAs (live 2026-06-29):**
  - `actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0`
  - `actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0`
- **npm OIDC floor = npm ≥11.5.1 + Node ≥22.14.0.** Node 22.x ships npm 10.9.x (below floor) — the explicit `npm install -g npm@<exact>` upgrade step is **mandatory and must not be dropped**.
- `npm@latest` verified as `11.18.0` (2026-06-29) — the natural exact-pin candidate (≥ floor).
- **Tooling for SEC-01:** `pinact` (pin + annotate with `# vX.Y.Z`) + `zizmor` / `pinact --verify-comment` (SHA↔tag check) + **Dependabot** (`package-ecosystem: github-actions`) for ongoing pin maintenance. Never trim `id-token: write`. Pin BOTH `ci.yml` and `release.yml`.

### Features (correctness behaviors, not new capabilities)
- **Table-stakes:** BUILD-01, SEC-01, CLI-06, CORE-16
- **Reproduce-first / nice-to-have:** CORE-15 — `looksLikeProject` already rejects home/root/shallow paths per source read; the `audit-includes-root-paths` symptom must be reproduced against current `master` before writing code (may be a regression-lock test, not a logic change)
- **Anti-features to avoid:** marker-file check in `looksLikeProject` (regresses D-01), catch-all `encode()` regex (breaks the 17/17 round-trips), Commander in the mcp package (unjustified dep), `readFileSync` in bundled `seed.ts` (bundle-fragile)

### Architecture (file-level change map)

| Item | Files | Class | Risk |
|------|-------|-------|------|
| SEC-01 | `.github/workflows/ci.yml`, `release.yml`, `dependabot.yml` (NEW) | Workflow-only (no code) | Low |
| CLI-06 | `packages/mcp/src/index.ts:836` | mcp bin only (1 predicate) | Low |
| BUILD-01 | `packages/core/tsup.config.ts`, `core/src/operations/seed.ts:139`, opt. NEW `core/src/util/version.ts` | Core + build config | Low (additive) |
| CORE-15 | `packages/core/src/environment/looksLikeProject.ts` + NEW test | Pure-core (shared by cli+mcp audit) | Low (additive) |
| CORE-16 | `packages/core/src/environment/decode.ts:187-196` (`buildCandidates`) + tests | Pure-core | **High** — load-bearing OneDrive fix |

**Shared-core win:** CORE-15 and CORE-16 land in `@localground/core`; both published packages inherit the fixes through the tsup bundle — no cli/mcp edits needed.

### Top Pitfalls (specific to this codebase)
1. **BUILD-01:** Copying the bins' `readFileSync(new URL('../package.json', import.meta.url))` into bundled `seed.ts` — `import.meta.url` resolves to the *consumer's* `dist/` post-bundle, so the seed version would differ by caller. Use build-time `define` instead.
2. **CORE-15:** Adding a `.git`/`package.json` marker check to `looksLikeProject` — regresses D-01 and silently drops plain-folder projects. Fix the depth/shape logic in shared core, never a call-site inline filter (diverges cli from mcp).
3. **CORE-16:** Widening `encode()`'s character class (`decode.ts:89`) to catch-all — breaks the calibrated 17/17 round-trips. The bug is the **trailing-hyphen-strip asymmetry** in `buildCandidates` prefix matching (~187-196), not the character class.
4. **SEC-01:** Runner npm pinned below 11.5.1 — the exact class that cost v3.0.1 four release iterations. Add an `npm --version` floor-assert; keep `package-manager-cache: false`.
5. **SEC-01:** SHA-pinning without `pinact --verify`/`zizmor` — a SHA looks immutable but can point at a fork; carry the `# vX.Y.Z` comment on every pin.
6. **CLI-06:** The `--version` check **must stay before `StdioServerTransport`** boot (stdio transport hangs forever otherwise) and **must keep `process.exit(0)` after `<version>\n`** — `verify-tarball.mjs` depends on exit 0 + exact-string equality. Don't add commander/yargs.

---

## Roadmap Implications

**Recommended structure: 3 phases** (continuing numbering → Phases 21–23), ordered by risk isolation (no item hard-blocks another):

**Phase 21 — Supply-Chain & Bin Hardening (SEC-01 + CLI-06)**
SEC-01 is pure YAML; landing it first hardens the pipeline that validates everything else. CLI-06 is a single predicate in the mcp bin with no core surface. Batching them is zero-cost. *Research flag: standard patterns — no phase research needed.*

**Phase 22 — Core Versioning + Audit Filter (BUILD-01 + CORE-15)**
BUILD-01 is the first `core/tsup.config.ts` edit; settling it before CORE-15/16 avoids mid-milestone build-config churn. CORE-15 is low-risk additive (or a regression lock if the symptom doesn't reproduce). *Research flag: BUILD-01 standard; CORE-15 needs a ~15-minute diagnostic run first.*

**Phase 23 — Decoder Trailing-Edge Fix (CORE-16)**
Highest-risk item; touches the load-bearing v3.0.0 OneDrive `buildCandidates()` fix. Land last so the full hardened suite is the safety net. *Research flag: deeper phase research recommended before implementation.*

> The roadmapper may instead choose one phase per requirement (5 phases) for finer-grained verification. Either structure respects the build order: SEC-01 → CLI-06 → BUILD-01 → CORE-15 → CORE-16.

---

## Unresolved Decisions (settle at roadmap / plan-phase — NOT scope-level)

**1. BUILD-01 mechanism** (both reject the bins' runtime `readFileSync` copy):
- **(A) Pass the version into `seed()` as a parameter** — bins already derive it; pass at the call site. Core stays pure, no I/O. Caveat: changes the `seed()` public signature — verify no other caller breaks.
- **(B) Build-time `define` constant in `core/tsup.config.ts`** — esbuild inlines the literal at compile time; survives the `noExternal` boundary; no signature change. Caveat: one-line `declare const __TOOLKIT_VERSION__: string` ambient.
- **Synthesis recommendation: Option B** — no signature change, correct in all three bundle contexts (mcp, cli, core tests); the value-equality test guards against drift either way.

**2. SEC-01 exact npm version** — pin to a specific version ≥11.5.1; `11.18.0` (verified `latest` 2026-06-29) is the natural pick. The floor-assert step is added regardless.

These are HOW decisions; the requirement success criteria are behavior-based (value equality, round-trip integrity, floor compliance), so scope is unaffected.

---

## Confidence

| Area | Confidence | Basis |
|------|------------|-------|
| Stack | HIGH | SHAs/versions verified live 2026-06-29; source files read directly |
| Features | HIGH | All five items verified against current source; acceptance criteria from code read |
| Architecture | HIGH | File paths, line numbers, bundling behavior confirmed from source; Phase 17 record read |
| Pitfalls | HIGH | Grounded in the v3.0.1 retrospective + direct codebase read |

**Open gaps (deferred to plan-phase, by design):** BUILD-01 A vs B (roadmap/plan picks); SEC-01 exact npm version (plan picks, ≥11.5.1); CORE-15 symptom reproduction (executor confirms before Phase 22 code); CORE-16 live failing-hash confirmation (executor confirms before Phase 23 code).
