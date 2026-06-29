# Milestone v3.0.1 — Project Summary

**Generated:** 2026-06-29
**Milestone name:** Validation and Hardening
**Status:** ✅ Shipped — published to npm as **v3.0.2** (after the SC5 fix-forward)
**Purpose:** Team onboarding and project review

> Read this document end-to-end to understand what LocalGround is, what the v3.0.1 milestone delivered, and why it was built the way it was. Then ask follow-up questions — the build artifacts are fully loaded.

---

## 1. Project Overview

**LocalGround** is a toolkit that helps Claude Code CLI users migrate project folders **off cloud-synced storage** (OneDrive, Dropbox, Google Drive, iCloud), verify migration integrity, clean up stale artifacts, and audit environment health. The target user is a Claude Code user hitting git errors, file-lock failures, or sync conflicts because their repo lives inside a sync folder.

**Core value:** Get Claude Code users off cloud-synced storage safely — no data loss, no silent failures, every action verified before and after.

The toolkit ships in **three forms** (established in v3.0.0):

| Form | Package | What it is |
|---|---|---|
| MCP server | `@localground/mcp` | 9 operations exposed as native Claude Code tool calls (stdio transport) |
| Standalone CLI | `@localground/cli` | 7 commands for terminal / scripted use via `npx` |
| Paste-and-run prompts | `prompts/` | The original v2.0.0 no-install fallback (5 markdown prompts) |

A Claude Code **plugin** packages the five workflow skills (`/localground:seed`, `/localground:migrate`, `/localground:reap`, `/localground:cleanup`, `/localground:verify`) for one-command installation.

### What v3.0.1 was about

v3.0.0 (shipped 2026-04-26) **built** the three-layer architecture. **v3.0.1 did not add features** — it **validated and hardened** what v3.0.0 produced. All five phases (16–20) are complete and verified. The milestone closed by running both GitHub Actions workflows end-to-end for the first time and publishing the project's first provenance-carrying release.

This is why the milestone's footprint is lopsided: **252 commits but only ~588 net lines of product code** (see Stats). The work was in test gates, decoder calibration, packaging discipline, runtime UAT, and the release pipeline — not new surface area.

---

## 2. Architecture & Technical Decisions

The three-layer architecture is inherited from v3.0.0; v3.0.1 stress-tested it. The decisions below are the ones that **shaped this milestone** (the full v3.0.0-era architectural decision log lives in `.planning/PROJECT.md › Key Decisions`).

- **Derive, don't duplicate — version strings read from `package.json` at runtime**
  - **Why:** A manifest-only version bump (3.0.0 → 3.0.1) left hardcoded `--version` literals in the bins still printing `3.0.0`. The fix: both `cli` and `mcp` bins derive their version from `package.json` at runtime, and a CI gate asserts built-version == manifest-version.
  - **Phase:** 20 (the gate that would have blocked 3.0.1; shipped clean as 3.0.2)

- **Assert *values*, not *shapes*, around irreversible actions**
  - **Why:** CI's tarball check verified version *format*, not version *value* — so it waved through a binary that printed the wrong (but well-formed) version. The version-misreport shipped immutably as 3.0.1 before adversarial post-publish verification caught it.
  - **Phase:** 20

- **OIDC trusted publishing (no stored token) + Node 22 / npm ≥ 11.5.1 on the release job**
  - **Why:** Write-enabled npm tokens now expire ≤ 90 days — a maintenance trap for a non-developer maintainer. OIDC stores no secret, and a failed attempt publishes nothing and is retryable. (Caveat learned the hard way: Node 22 bundles npm 10.9.x, *below* the 11.5.1 OIDC floor, so the job must `npm install -g npm@^11.5.1`.)
  - **Phase:** 20

- **`encode()` regex widened to seven special-character classes (targeted, not catch-all)**
  - **Why:** Path-hash decoding silently returned `no_candidates` for folder names containing apostrophes, ampersands, brackets, parentheses, plus, equals, and percent. The regex was widened to cover exactly those classes Claude Code actually encodes — not a greedy catch-all (D-01). 17/17 currently-extant path-hashes round-trip; the 6 remaining `no_candidates` are documented as deleted source folders.
  - **Phase:** 17 (closed WR-01)

- **`tsconfig.test.json` escape hatch to restore the strict `tsc` gate over test files**
  - **Why:** `tsup` tolerates implicit-any that `tsc` rejects, so test files weren't strictly gated. A root-level `tsconfig.test.json` (`composite:false`, `noEmit:true`, inherits the strict family) widens the strict gate to `test/**/*` across all workspace packages without breaking per-package `rootDir`.
  - **Phase:** 16

- **`files: ["dist"]` over `.npmignore` for tarball trimming**
  - **Why:** An allowlist (`files`) is safer than a denylist (`.npmignore`) — it ships compiled output only and can't accidentally leak `src/`, configs, or tests. The `@localground/core` bundle invariant is preserved (it stays in `devDependencies` because `tsup noExternal` inlines it).
  - **Phase:** 18

- **Process-identity honesty gate for UAT**
  - **Why:** When the dev build and the packaged tarball are byte-identical, no config read can prove *which* binary actually ran. UAT caught the live process to prove the tarball was exercised, not the dev build.
  - **Phase:** 19

---

## 3. Phases Delivered

| Phase | Name | Status | One-Liner |
|-------|------|--------|-----------|
| 16 | Test Infrastructure Hardening | ✅ Complete (2026-04-27) | Restored the strict `tsc` gate over src+test, killed the Vitest cleanup hang, closed two test-hygiene findings |
| 17 | Core Decoder Calibration | ✅ Complete (2026-04-27) | Widened `encode()` regex to 7 special-char classes; eliminated silent decode failures (closed WR-01) |
| 18 | Packaging Polish | ✅ Complete (2026-04-27) | Trimmed npm tarballs to `dist/` only + CI-wired `npm pack` / clean-install regression guard |
| 19 | Skill Runtime UAT | ✅ Complete (2026-06-28) | All 5 `/localground:*` skills UAT'd end-to-end against the registered MCP server — dev build *and* packaged tarball |
| 20 | Release Pipeline Validation | ✅ Complete (2026-06-29) | First end-to-end runs of both CI + release workflows; OIDC + provenance publish; caught the SC5 defect → shipped v3.0.2 |

**Total:** 5 phases, 21 plans, all complete and verified.

---

## 4. Requirements Coverage

All **16 v3.0.1 requirements** met (16/16 mapped to phases, 0 unmapped). Source: `.planning/milestones/v3.0.1-REQUIREMENTS.md`.

**Skill Runtime Validation (UAT) — Phase 19**
- ✅ **UAT-01** — `/localground:seed` executes end-to-end, presents a valid manifest
- ✅ **UAT-02** — `/localground:migrate` two-session continuation-token loop validated across a real Claude Code restart *(critical — the only test exercising this code path)*
- ✅ **UAT-03** — `/localground:reap` calls `verify` + `health_check`, generates a natural-language report
- ✅ **UAT-04** — `/localground:cleanup` collects per-item confirmation, deletes only confirmed items
- ✅ **UAT-05** — `/localground:verify` calls `audit`, generates a traffic-light report

**Pipeline First-Run Validation — Phase 20**
- ✅ **PIPE-01** — `ci.yml` green on the 3-OS matrix (run 28357130168 on commit 26659c8)
- ✅ **PIPE-02** — `release.yml` OIDC-published both packages with provenance (run 28370544899; re-published 3.0.2 after fix-forward)

**Test Infrastructure — Phase 16**
- ✅ **TEST-01** — `tsc --build` restored as a CI gate; D-18 implicit-any errors resolved without weakening strict mode
- ✅ **TEST-02** — Vitest cleanup hang eliminated via `afterEach` child-process reapers
- ✅ **TEST-03** — `placeholder.test.ts` precondition guard added (can no longer silently no-op)
- ✅ **TEST-04** — `decode.test.ts` tautological assertion replaced with a meaningful contract

**Packaging — Phase 18**
- ✅ **PKG-01** — both `mcp` + `cli` package.json declare `"files": ["dist"]`
- ✅ **PKG-02** — `npm pack --dry-run` regression guard scripted (`scripts/verify-tarball.mjs`) and CI-wired

**Core Correctness — Phase 17**
- ✅ **CORE-13** — `encode()` regex calibrated against actual Claude Code CLI behavior
- ✅ **CORE-14** — WR-01 closed; all `no_candidates` either fixed or documented as deleted source folders

**Documentation — Phase 20**
- ✅ **DOC-03** — per-package READMEs render on both npmjs.com pages (replacing the v3.0.0 empty-state placeholder)

> **Milestone audit:** A pre-close `gsd-audit-milestone` surfaced 9 items; all were assessed **non-blocking** and acknowledged-deferred (see Section 6). No separate `MILESTONE-AUDIT.md` artifact was written — the dispositions live in `.planning/STATE.md › Deferred Items`.

---

## 5. Key Decisions Log

Aggregated from the per-phase decision records in `.planning/STATE.md › Accumulated Context` and `.planning/PROJECT.md › Key Decisions`. Each entry: decision → phase.

**Phase 16 — Test Infrastructure**
- decode.test.ts replacement asserts `data.decodedPath`/`hashDirName` on the *success branch only* — preserves the "must NOT throw" invariant (D-Claude-1)
- TEST-02 closed via describe-scoped `afterEach` reaper — no Vitest pool isolation, no `vitest.config.ts` changes; existing CLI fixture `afterEach` extended rather than duplicated (D-05/06/07)
- `tsconfig.test.json` escape hatch (`composite:false` + `noEmit:true`) chosen over per-package include changes — preserves per-package `rootDir`
- D-18 forecast (~30 implicit-any errors) did **not** materialize — 0 surfaced after the gate landed; Task 2 was vacuous (no manufactured no-op commit)

**Phase 17 — Core Decoder Calibration**
- `encode()` regex widened from `/[\/: ,().]/g` to cover apostrophe, ampersand, brackets, plus, equals, percent — targeted, not catch-all (D-01)
- WR-01 closed via regex calibration; 6/6 `no_candidates` documented as deleted sources in `17-VERIFICATION.md` (CORE-14 closure)

**Phase 18 — Packaging Polish**
- PKG-01 closed via 1-line `"files": ["dist"]` additions; bundle invariant preserved (core stays in `devDependencies`); no `.npmignore` created (D-05)
- PKG-02 closed under automated regression test — `verify-tarball.mjs` CI-wired; `mcp --version` short-circuit added before transport boot for a deterministic non-server exit
- Windows + Node 20+ spawn fix: replaced literal `npm.cmd` spawn with `process.execPath` + `npm-cli.js` resolution (avoids EINVAL/CVE-2024-27980; `shell:true` forbidden by D-02)

**Phase 20 — Release Pipeline Validation**
- release.yml: Node 20.x → 22.x for the npm ≥ 11.5.1 OIDC floor (D-02); `cache: npm` removed from release setup-node (cache-poisoning hardening, D-09)
- Preflight asserts `GITHUB_REF_NAME == v<mcp version>` and `mcp == cli` version before any publish (D-07); dry-run-both gate precedes both real publishes (D-08)
- Version bump 3.0.0 → 3.0.1 across all 5 manifests + lockfile in a single post-CI-green, pre-tag commit (D-06/D-10)
- **Fix-forward over unpublish** on the bad 3.0.1 — npm versions are immutable; 3.0.2 is the only correct recovery

---

## 6. Tech Debt & Deferred Items

### Carry-forward to v3.1.0 (from `20-REVIEW.md` / 20-07)

1. **Seed `toolkitVersion` drift** — `toolkitVersion` is still a hardcoded literal in `seed.ts`. This is the *same drift class* fixed for the `--version` strings this milestone; apply host-injection to close it.
2. **MD-01 — SHA-pin GitHub Actions + exact-pin runner npm** in the publish job (the `id-token: write` job is the highest-privilege surface in the repo).
3. **MD-02 — robust `--version` arg parsing** in the mcp bin (the hand-rolled `process.argv.includes('--version')` mishandles `--version=foo` / `--Version`).
4. **CLI-05 (999.5) — TIER 2 streaming refactor of `spawnTool`** for live MCP-driven copy progress (architectural change with real risk; TIER 1 stderr-status mitigation already shipped in Phase 14-11).
5. **`audit-includes-root-paths`** — audit auto-discovery scans all of `C:\Users\…`; fix = project-fingerprint filter in core, shared by CLI + MCP audit (diagnosis-only, no fix applied).
6. **999.7 — path-hash decode trailing-edge defect** — a CORE-13 special character at the trailing edge of an intermediate path component still fails to decode (verifier-recommended backlog from Phase 17).

### Deferred at milestone close (the 9 audit-open items, all non-blocking)

- `cli-silent-long-operations` → this **is** CLI-05 / 999.5 (already tracked above)
- `audit-includes-root-paths` → v3.1.0 candidate (above)
- 6 stale quick-task references → either v1.2.0/v2.0-era orphans or already-completed tasks (commits 9ae8881, 087ff05)
- 1 UAT "gap" → status was `passed`, not actually open

### Optional housekeeping (low value)

- `npm deprecate @localground/{cli,mcp}@3.0.1` — blocked on passkey 2FA (needs an npm automation token). Low value since `latest` already = 3.0.2.

### Process lessons that cost time (from the retrospective)

- **The npm-OIDC-floor assumption was false and cost 4 release iterations.** D-02 claimed "Node 22.x ships npm ≥ 11.5.1"; Node 22 actually bundles npm 10.9.x. A one-line `npm --version` echo on the runner would have caught it on attempt 1. → *Lesson: a cited assumption is still an assumption until the actual runner proves it.*
- **The version-drift defect shipped immutably as 3.0.1** because CI asserted version shape, not value. → *Lesson: a green CI check is only as trustworthy as what it asserts.*
- **GSD cascade-drift recurred** — Phase 16–18 checkboxes and several REQUIREMENTS/PIPE markers were stale at close and needed manual correction (a known cross-milestone GSD issue, not project-specific).
- **~2-month calendar gap** between Phases 16–18 (Apr 27) and 19–20 (Jun 28–29) — context was reloaded via snapshot/resume.

---

## 7. Getting Started

**Run the toolkit (three entry points):**
```bash
# MCP server — register with Claude Code
claude mcp add localground -- npx -y @localground/mcp

# CLI — direct terminal use (every command supports --json)
npx -y @localground/cli detect
npx -y @localground/cli audit

# Legacy fallback — paste any file from prompts/ into Claude Code
```

**Build & test (from repo root):**
```bash
npm install            # npm workspaces — installs all three packages
npm run build          # tsup bundles all three packages (clean output)
npm run typecheck      # tsc --build strict gate (src + test via tsconfig.test.json)
npm test               # Vitest — 79 tests, real-fs fixtures, no mocks
```

**Key directories:**
| Path | What's there |
|---|---|
| `packages/core/src/` | The 12 deterministic operations + all public types. **Start here.** |
| `packages/core/src/index.ts` | Flat public API barrel (`import { detect, decode, copy, verify } from '@localground/core'`) |
| `packages/core/src/environment/decode.ts` | Path-hash encode/decode — the Phase 17 calibration lives here |
| `packages/mcp/` | MCP server — 9 tools, stdio transport, stderr-only logging |
| `packages/cli/` | Commander CLI — 7 commands, `--json` on every one |
| `scripts/verify-tarball.mjs` | The Phase 18 packaging guard + Phase 20 version-equality gate |
| `.github/workflows/` | `ci.yml` (3-OS matrix) + `release.yml` (OIDC publish) |
| `prompts/` | v2.0.0 paste-and-run fallback (5 prompts) |
| `.planning/` | GSD planning artifacts (gitignored but tracked — modify with `git add -f`) |

**Where to look first as a new contributor:**
1. `packages/core/src/types.ts` — the `Result<T, R>` discriminated-union pattern that every core function returns (no exceptions are ever thrown from core).
2. `packages/core/src/index.ts` — the full public surface, one flat import.
3. `.planning/PROJECT.md` — the living source of truth for what's built, why, and what's next.
4. `CLAUDE.md` — conventions (Result type, stderr-only MCP logging, real-fs fixtures, spawn discipline, build-via-tsup).

**Conventions that will trip you up if you don't know them:**
- Core never throws — it returns `Result<T, R>`; narrow via `if (result.success)` before touching `result.data` / `result.reason`.
- MCP server: **all** diagnostics go to `console.error`; stdout is reserved for JSON-RPC.
- Tests use real `os.tmpdir()` fixtures, not mocked fs — mocks couldn't reproduce the Windows reparse-point / OneDrive bugs that motivated this rule.
- CI gates on `tsup` (not bare `tsc`); `tsc --build` is the IDE-feedback + CI strict-type gate via `tsconfig.test.json`.

---

## Stats

- **Timeline:** 2026-04-26 (v3.0.0 tag) → 2026-06-29 (v3.0.1 tag) — **64 calendar days**, but only ~3 active build days (Phases 16–18 on Apr 27; Phases 19–20 on Jun 28–29, bridged by snapshot/resume across a ~2-month gap)
- **Phases:** 5 / 5 complete (16–20)
- **Plans:** 21 / 21 complete
- **Requirements:** 16 / 16 met
- **Commits (full milestone, `v3.0.0..v3.0.1`):** 252 — dominated by `.planning/` artifact churn
- **Commits touching product code (`packages/`):** 99 · touching `.github/`: 9
- **Total diff:** 193 files changed (+18,357 / −12,411) — mostly planning artifacts
- **Product-code diff** (`packages` + `.github` + `scripts`, excl. `.md`): **13 files, +588 / −64** — the true footprint of a validation/hardening milestone
- **Current TypeScript source:** ~6,053 LOC across `packages/`
- **Contributors:** Robert LaSalle (two git identities: `Robert LaSalle` + `Technically-A-Mechanical-Engineer`)
- **Shipped artifacts:** `@localground/mcp@3.0.2` + `@localground/cli@3.0.2` on npm as `latest`, with **SLSA-v1 provenance** — the first provenance-carrying release in the project's history

---

*Generated by `/gsd-milestone-summary` from milestone artifacts. Source files: `PROJECT.md`, `STATE.md`, `RETROSPECTIVE.md`, `milestones/v3.0.1-{ROADMAP,REQUIREMENTS}.md`, and Phase 16–20 records under `.planning/phases/`.*
