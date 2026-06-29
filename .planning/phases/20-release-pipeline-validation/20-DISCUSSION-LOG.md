# Phase 20: Release Pipeline Validation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-28
**Phase:** 20-release-pipeline-validation
**Areas discussed:** npm publish authorization, Release sequencing, Windows CI (pre-empt vs react), End-user install scope
**Mode:** discuss (advisor mode active — USER-PROFILE.md present, `standard` calibration tier, non-technical-owner framing) + cross-model verification

---

## Process

Four gray areas were identified from the workflow files + requirements. Each was researched by a parallel advisor agent (research-backed comparison tables), and I led each with a recommendation. The user then requested a **cross-model stress-test** before deciding: an in-app Codex review (full repo access) wrote `.planning/notes/2026-06-28-phase-20-codex-review.md`, which I then **independently re-verified** via three parallel agents against official npm docs + a fresh repo audit. All four recommendations survived; the verification surfaced one previously-missed hard blocker (missing `repository` field → provenance E422) and tightened the auth + sequencing decisions.

---

## npm publish authorization (highest risk)

| Option | Description | Selected |
|--------|-------------|----------|
| Fix OIDC, token fallback | Bump release.yml Node 20.x→22.x (npm≥11.5.1) + configure npmjs.com trusted publisher both packages; no stored secret; token path as instant fallback | ✓ |
| Granular token | Add npm token as GitHub secret + keep --provenance; works on Node 20; long-lived secret | |
| Token now, OIDC next patch | Publish via token, migrate to OIDC later | |

**User's choice:** Fix OIDC (primary) — selected after the cross-model stress-test confirmed the path.
**Notes:** Verification confirmed (a) OIDC requires npm≥11.5.1 / Node≥22.14.0 (Node 20.x ships npm ~10.x, below floor); (b) `--provenance` + `repository` field is a HARD requirement — publish fails E422 without a case-matching `repository.url` (neither published manifest has one); (c) the two-package publish is non-atomic (partial-publish risk). OIDC chosen over token because write-enabled granular tokens now cap at ≤90 days (expiring-secret liability) and a failed OIDC auth publishes nothing and is retryable. Token+provenance kept as documented fallback. → D-01, D-02, D-03, D-04, D-05, D-07, D-08, D-09.

---

## Release sequencing

| Option | Description | Selected |
|--------|-------------|----------|
| Incremental | Push master as-is → CI green 3-OS → bump 3.0.0→3.0.1 → push v3.0.1 tag | ✓ |
| Big-bang | Bump + tag + push together | |
| Curate/squash history first | Squash local history into a clean public start, then push | |

**User's choice:** Incremental.
**Notes:** Cross-model review tightened this: tag only the EXACT commit carrying all pre-flight fixes + version 3.0.1, after it is CI-green; verify `git show v3.0.1:packages/mcp/package.json` before pushing the tag. Direct-to-master (branching_strategy: none); push history as-is (.planning/ gitignored; squash is aesthetic-only + high rebase risk). Big-bang rejected (collapses first push + first CI + first OIDC + first immutable publish into one failure surface). → D-06, D-10.

---

## Windows CI (pre-empt vs react)

| Option | Description | Selected |
|--------|-------------|----------|
| Targeted pre-audit | Grep + fix the 2 known Windows risks before pushing | ✓ (executed; found already-satisfied) |
| Push and react | Let the first CI run surface failures, fix iteratively | |
| Broad pre-hardening | Audit all Windows-sensitive patterns | |

**User's choice:** Targeted pre-audit — and the independent repo audit performed it and found both known risks already mitigated.
**Notes:** decode.test.ts already canonicalizes its tmpdir via fs.realpath() (the only path-hash round-trip; handles RUNNER~1 8.3 short-path); the only npm/npx spawn is scripts/verify-tarball.mjs (process.execPath + npm-cli.js workaround); all other spawns use process.execPath or git. No pre-emptive fixes needed; push-and-react is safe for any residual cross-OS surprise. → D-11.

---

## End-user install scope

| Option | Description | Selected |
|--------|-------------|----------|
| SC5 + documented MCP install | npx CLI smoke (SC5) + DOC-03 READMEs + validate `claude mcp add … npx` once; no .mcp.json | ✓ |
| SC5 only | Just the npx CLI smoke | |
| Ship bundled .mcp.json (full H-4) | Ship + validate auto-register | |

**User's choice:** SC5 + documented MCP install.
**Notes:** Confirmed both per-package READMEs already carry install commands incl. the Windows `cmd /c npx` workaround. Bundled .mcp.json rejected — reverses Phase 19 C-1, auto-starts a competing server on plugin load, adds product code to a validation phase; full H-4 deferred to its own plan / v3.1.0. PROJECT.md "two→three forms" doc update folded in. → D-12, D-13.

---

## Claude's Discretion

- Exact YAML for the preflight (D-07) and dry-run-both (D-08) release.yml steps.
- Whether to add `homepage`/`bugs` alongside the required `license` field (D-05).
- README copy-edits for DOC-03; the precise Node 22 pin (`22.x` vs `22.14.x`).

## Deferred Ideas

- Bundled `.mcp.json` + full npx auto-register (H-4) — own plan / v3.1.0.
- 999.5 / CLI-05 streaming refactor of `spawnTool` — v3.1.0.
- `homepage` / `bugs` manifest fields — optional polish.
- Codebase-maps refresh (`.planning/codebase/*.md` v1.2.0-era) — before v3.1.0.
- Phase 14 seed-marker cleanup in the real QMS-Document-Processor OneDrive project — separate housekeeping.
