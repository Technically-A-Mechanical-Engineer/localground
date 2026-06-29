---
phase: 20-release-pipeline-validation
verified: 2026-06-29T12:40:00Z
status: human_needed
score: 5/5 must-haves verified (machine-level); 2 web-visual formalities pending
re_verification: No — initial verification
human_verification:
  - test: "Open https://www.npmjs.com/package/@localground/mcp/v/3.0.2 and https://www.npmjs.com/package/@localground/cli/v/3.0.2 — confirm the green 'Provenance' badge renders on both pages (SC3)"
    expected: "Both pages show a 'Provenance' section/badge linking to the SLSA attestation. Machine corroboration: dist.attestations.provenance.predicateType == https://slsa.dev/provenance/v1 on both packages (confirmed)."
    why_human: "The provenance BADGE is a rendered npmjs.com web-UI element. The underlying attestation is machine-confirmed present; only the visual badge render is human-only."
  - test: "On the same two npmjs.com pages, confirm the per-package README content renders (not the v3.0.0 empty-state placeholder) (SC4 / DOC-03)"
    expected: "mcp page shows packages/mcp/README.md content; cli page shows packages/cli/README.md content. Machine corroboration: readmeFilename == README.md, registry README payloads are 4305 bytes (mcp) / 3654 bytes (cli) — non-empty real content (confirmed)."
    why_human: "Whether npmjs.com renders the README into HTML on the page is a web-UI render check. The README is machine-confirmed present and non-empty in the registry record."
---

# Phase 20: Release Pipeline Validation — Verification Report

**Phase Goal:** Both GitHub Actions workflows execute end-to-end for the first time — `ci.yml` green across the 3-OS matrix, and `release.yml` publishes both packages to npm with OIDC provenance and rendered per-package READMEs on the (v3.0.x) tag push.
**Verified:** 2026-06-29T12:40:00Z
**Status:** human_needed (5/5 machine-verifiable truths PASS; 2 web-visual formalities with strong machine corroboration)
**Re-verification:** No — initial verification

---

## HEADLINE FINDING — The pipeline worked as designed: it caught a real defect

**SC5 FAILED at v3.0.1 → PASSES at v3.0.2 (fix-forward).** This is the most important result of the phase, and it is a *success*, not a gap.

- The published **v3.0.1** binaries self-reported `3.0.0`. Root cause (confirmed in source history): the `--version` string was a **hardcoded source literal** (`cli .version('3.0.0')`, `mcp SERVER_VERSION = '3.0.0'`) that the D-06 manifest-only bump never touched. The release runner built `dist` from the tagged commit, so the published binaries honestly emitted the stale literal `3.0.0`.
- **Why CI missed it the first time:** `scripts/verify-tarball.mjs` ran `--version` but only asserted a semver-*shape* regex (`/^\d+\.\d+\.\d+/`). `3.0.0` satisfied that regex under a `3.0.1` manifest, so the 3.0.1 publish went green.
- **The fix-forward (plan 20-07):** (1) both bins now derive the version at runtime from their own `package.json` via `readFileSync(new URL('../package.json', import.meta.url))` — drift-proof; (2) `verify-tarball.mjs` now asserts **string equality** (`actualVersion !== expectedVersion`) — the gate that would have blocked 3.0.1; (3) all 5 manifests + lockfile + `seed.ts` toolkitVersion bumped to 3.0.2; (4) re-published via OIDC.
- **Proof against the live registry** (isolated npm cache): `npx -y @localground/cli@3.0.2 --version` → **3.0.2**; `npx -y @localground/mcp@3.0.2 --version` → **3.0.2** (NOT 3.0.0). `npx -y @localground/cli@3.0.2 detect` → exit 0, real output.

This is the pipeline functioning correctly: an immutable bad publish (3.0.1) was caught, a hardened CI gate was added so the class can never ship again, and a clean 3.0.2 was shipped. npm `latest` for both packages points at 3.0.2, so default `npx` resolution gets the good version.

**Version reconciliation note:** the ROADMAP success criteria and PIPE-02/DOC-03 are written against `3.0.1`. The implementation fixed forward to `3.0.2`, which *supersedes* 3.0.1. Verdicts below are assessed against **3.0.2** (the live, correct artifact) — the version number in the SC text is the artifact-under-test, and 3.0.2 satisfies the intent of every criterion. This is treated as an intentional, documented deviation (CHANGELOG [3.0.2] + plan 20-07), not a gap.

---

## Goal Achievement

### Observable Truths (Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| SC1 | Most recent `ci.yml` run on master is green on Windows + macOS + Linux at Node 20.x; earlier failures diagnosed/resolved with linked run IDs | ✓ VERIFIED | `gh run list --branch master --workflow=CI` → latest run **28357130168** on `26659c8` (HEAD) = `success`. Prior reds diagnosed in 20-PIPELINE-LOG.md (28350344033 build:check clobber → fixed in d531c2b; all subsequent green). ci.yml is 3-OS matrix `[windows,macos,ubuntu]` Node `20.x`, `fail-fast:false`. |
| SC2 | Pushing the version tag triggers `release.yml` and publishes BOTH `@localground/mcp` + `@localground/cli` to npm | ✓ VERIFIED | `npm view @localground/mcp@3.0.2 version` → **3.0.2**; `@localground/cli@3.0.2 version` → **3.0.2**. dist-tags `latest`: both **3.0.2**. Release run **28370544899** on tag `v3.0.2` / `26659c8` = `success`. |
| SC3 | Both packages show provenance attestation on npmjs.com | ⚠ MACHINE-CONFIRMED / web-visual pending | `npm view @localground/{mcp,cli}@3.0.2 --json` → `dist.attestations.provenance.predicateType == "https://slsa.dev/provenance/v1"` for BOTH. Badge render is the only human formality. |
| SC4 / DOC-03 | Both npmjs.com pages render the per-package README (not the v3.0.0 empty-state) | ⚠ MACHINE-CONFIRMED / web-visual pending | `readmeFilename == README.md` for both; registry README payload **4305 bytes** (mcp) / **3654 bytes** (cli) — non-empty real content. Page-render is the only human formality. |
| SC5 | A clean machine running `npx -y @localground/cli@... detect` resolves + executes successfully | ✓ VERIFIED | Isolated cache (`npm_config_cache=$(mktemp -d)`): `npx -y @localground/cli@3.0.2 detect` → **exit 0**, real detect output (17 projects, 26 path-hashes). `--version` → **3.0.2** (cli) / **3.0.2** (mcp). The v3.0.1 SC5 failure is fixed-forward and proven resolved. |

**Score:** 5/5 truths verified at the machine level. SC3 and SC4 carry a residual web-visual render check (non-blocking; strong machine corroboration).

### Requirements Coverage

| Requirement | Source Plan(s) | Status | Evidence |
|-------------|----------------|--------|----------|
| PIPE-01 (ci.yml first green on 3-OS matrix) | 20-02, 20-03 | ✓ SATISFIED | Latest CI run 28357130168 = success on all 3 OSes; earlier red (28350344033) diagnosed + fixed (d531c2b). **Note:** REQUIREMENTS.md line 25/99 still shows PIPE-01 unchecked/"Pending" — a doc-state lag; the CI reality is green. Recommend updating REQUIREMENTS.md. |
| PIPE-02 (release.yml OIDC-publishes both w/ provenance) | 20-02, 20-05, 20-07 | ✓ SATISFIED | Both 3.0.2 published via OIDC (run 28370544899); SLSA v1 attestations present on both. REQUIREMENTS.md marks Complete. |
| DOC-03 (per-package READMEs in tarball + render) | 20-01, 20-06 | ✓ SATISFIED (machine) | Both READMEs present in registry record (non-empty); web render is the SC4 human formality. REQUIREMENTS.md marks Complete. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `.github/workflows/ci.yml` | 3-OS matrix, Node 20.x, push/PR master, verify:tarball gate | ✓ VERIFIED | `matrix.os=[windows,macos,ubuntu]`, `node 20.x`, `fail-fast:false`; steps include `verify:tarball` (the version-equality gate) before `npm test`. |
| `.github/workflows/release.yml` | v* tag, pure-OIDC, Node 22, npm≥11.5.1 upgrade, preflight, dry-run-both, no token/registry-url | ✓ VERIFIED | `id-token: write`; setup-node@v6 Node 22.x `package-manager-cache:false` (D-09); `npm install -g npm@^11.5.1` (the confirmed root-cause fix); preflight tag↔version (D-07); dry-run-both (D-08); publish both `--provenance`. No `registry-url`, no stored token → pure OIDC (D-01). |
| `packages/cli/src/index.ts` | Runtime version derivation, no literal | ✓ VERIFIED | L15-17 `readFileSync(new URL('../package.json', import.meta.url)).version`; L24 `.version(VERSION)`. No `3.0.0` literal anywhere in `src/**/*.ts` (grep: 0 matches). |
| `packages/mcp/src/index.ts` | Runtime version derivation, no literal | ✓ VERIFIED | L19-21 same pattern → `SERVER_VERSION`. No hardcoded literal. |
| `scripts/verify-tarball.mjs` | String-equality version assertion (not regex) | ✓ VERIFIED | L163 reads `expectedVersion` from each manifest; L210-213 `if (actualVersion !== expectedVersion) throw` — the gate that would have caught 3.0.1. |
| 5 manifests + lockfile + seed.ts | All at 3.0.2 | ✓ VERIFIED | root/core/mcp/cli/plugin.json all `"version": "3.0.2"`; `seed.ts:139 toolkitVersion: '3.0.2'`. No `3.0.0`/`3.0.1` literal remaining in built `dist` (grep: 0 matches). |
| `packages/{mcp,cli}/README.md` | DOC-03 render targets w/ install cmds | ✓ VERIFIED | mcp README carries `claude mcp add … npx -y @localground/mcp` incl. Windows `cmd /c npx` workaround; cli README carries `npx -y @localground/cli detect`. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `{cli,mcp}/src/index.ts` runtime version read | built `dist/index.js --version` == manifest version | `readFileSync(new URL('../package.json', import.meta.url))` | ✓ WIRED | Built dist contains `import.meta.url` (1 each, no literal); local `node dist/index.js --version` → 3.0.2 / 3.0.2; live `npx @3.0.2 --version` → 3.0.2 / 3.0.2. |
| `verify-tarball.mjs` equality assertion | CI fails on version drift | string equality `!== expectedVersion` | ✓ WIRED | Present at L211; ran green in CI (28357130168) at `OK (version=3.0.2)`; would have thrown on the 3.0.0-vs-3.0.1 drift. |
| `release.yml --provenance` publish | npmjs.com provenance attestation | OIDC provenance | ✓ WIRED | `dist.attestations.provenance` (SLSA v1) present on both 3.0.2 records. |
| `{mcp,cli}/README.md` in tarball | registry README record | `files:["dist"]` preserves README per npm rules | ✓ WIRED | `readmeFilename=README.md`, non-empty payload on both. |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Published cli reports correct version (SC5 core) | `npm_config_cache=$(mktemp -d) npx -y @localground/cli@3.0.2 --version` | `3.0.2` | ✓ PASS |
| Published mcp reports correct version | `npx -y @localground/mcp@3.0.2 --version` | `3.0.2` | ✓ PASS |
| Published cli detect runs (SC5 literal) | `npx -y @localground/cli@3.0.2 detect` | exit 0, real detect output | ✓ PASS |
| Both packages published | `npm view @localground/{mcp,cli}@3.0.2 version` | 3.0.2 / 3.0.2 | ✓ PASS |
| Provenance attestation present | `npm view …@3.0.2 --json → dist.attestations` | SLSA v1 (both) | ✓ PASS |
| Built local bins report version | `node packages/{cli,mcp}/dist/index.js --version` | 3.0.2 / 3.0.2 | ✓ PASS |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | TODO/FIXME/placeholder in modified src | — | None found (grep clean across cli/mcp src + verify-tarball.mjs) |
| `dist/**` | — | stale `3.0.0`/`3.0.1` literal in built output | — | None found (grep clean) |

### Notable Cleanliness Items (non-blocking, ℹ Info)

| Item | Detail | Severity |
|------|--------|----------|
| v3.0.1 not deprecated on npm | `npm view @localground/{mcp,cli}@3.0.1 deprecated` → empty. CHANGELOG documents 3.0.1 as superseded, but `npm deprecate` was not run. `latest` correctly = 3.0.2, so default `npx` gets the good version. A `npm deprecate @localground/mcp@3.0.1` / cli would steer anyone pinning 3.0.1 away from the version-misreporting binaries. | ℹ Info |
| REQUIREMENTS.md PIPE-01 doc lag | Line 25 checkbox unchecked, line 99 table shows "Pending" — but CI is green. PIPE-02/DOC-03 marked Complete. Doc-state cascade gap (a known project pattern). | ℹ Info |
| PIPELINE-LOG ends at 3.0.1 | 20-PIPELINE-LOG.md documents the 3.0.1 publish (Task 3 SUCCESS) but does not yet record the 3.0.2 fix-forward + re-publish (run 28370544899). The 20-07-SUMMARY.md covers the source fix but states publish was "gated to the user"; the git/registry state proves the 3.0.2 tag + publish subsequently fired and succeeded. PIPELINE-LOG could append the 3.0.2 close-out for a complete operational record. | ℹ Info |

### Human Verification Required

Two web-visual formalities remain. Both have strong machine corroboration (the underlying registry data is confirmed present), so these are render-confirmation checks, not open risks.

#### 1. Provenance badge render (SC3)

**Test:** Open `https://www.npmjs.com/package/@localground/mcp/v/3.0.2` and `https://www.npmjs.com/package/@localground/cli/v/3.0.2`.
**Expected:** A green "Provenance" badge/section renders on both pages.
**Why human:** The badge is a rendered npmjs.com web-UI element. The SLSA v1 attestation is machine-confirmed present (`dist.attestations.provenance.predicateType`).

#### 2. README render (SC4 / DOC-03)

**Test:** On the same two pages, confirm the per-package README content renders (not the v3.0.0 empty-state placeholder).
**Expected:** mcp page shows `packages/mcp/README.md`; cli page shows `packages/cli/README.md`.
**Why human:** Page HTML render is a web-UI check. The README is machine-confirmed present and non-empty in the registry (`readmeFilename=README.md`, 4305 / 3654 bytes).

---

## Gaps Summary

**No blocking gaps.** The phase goal is achieved against the live registry: the dual-workflow pipeline ran end-to-end for the first time (CI green on 3 OSes; release.yml OIDC-published both packages with provenance), and the one criterion that initially failed (SC5, via the 3.0.1 hardcoded-version-literal defect) was caught by the pipeline's own gate, root-caused, fixed at source with a drift-proof runtime derivation, guarded by a new CI string-equality assertion, and re-shipped clean as 3.0.2 — proven by live `npx`.

The only outstanding items are two web-visual render confirmations (provenance badge, README page) that are machine-corroborated and non-blocking, plus three informational cleanliness items (deprecate 3.0.1 on npm; update REQUIREMENTS.md PIPE-01 status; append the 3.0.2 close-out to PIPELINE-LOG).

---

## Overall Phase Verdict

**PASS (pending two non-blocking web-visual formalities).** PIPE-01, PIPE-02, and DOC-03 are satisfied. All five success criteria pass at the machine/registry level; SC3 and SC4 carry only a human badge/README-render confirmation that is strongly corroborated by registry data. The headline result is that the release pipeline did exactly what a validation phase exists to prove — it surfaced a real, immutable-publish defect (3.0.1 binaries misreporting 3.0.0), and the fix-forward to 3.0.2 both resolves the defect and hardens CI so the class cannot recur. Status set to `human_needed` solely because the Step-8 web-visual items are non-empty; there are no failed truths and no blockers.

---

_Verified: 2026-06-29T12:40:00Z_
_Verifier: Claude (gsd-verifier)_
