# Phase 21: Supply-Chain & Bin Hardening - Context

**Gathered:** 2026-06-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Make the release supply chain pinned and verifiable, and make the MCP server's `--version` request robust without ever booting the stdio transport. Two requirements batched by risk isolation (no hard data dependency):

- **SEC-01** — SHA-pin every third-party `uses:` in both `.github/workflows/ci.yml` and `release.yml`, verify each pin resolves to its tag, exact-pin + runtime-floor-assert the publish job's npm/Node, add a Dependabot `github-actions` config, and preserve OIDC + provenance.
- **CLI-06** — robustify the mcp bin `--version` predicate (`packages/mcp/src/index.ts:836`) without adding an argument-parser dependency.

This phase clarifies HOW to implement the locked success criteria. No new feature surface (v3.1.0 is a hardening minor). The cross-cutting v3.0.1 lesson governs: **assert the VALUE, not the shape** — a shape-only CI check shipped an immutable bad version in v3.0.1.

</domain>

<decisions>
## Implementation Decisions

### SHA pinning (SEC-01 SC #1)
- **D-01:** Pin every external action in **both** `ci.yml` and `release.yml` to a full 40-char commit SHA with a `# vX.Y.Z` comment. Use these Codex-confirmed pins (live-verified 2026-06-29 that each SHA resolves to its tag):
  - `actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0`
  - `actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0`
  - (`ci.yml` currently floats `@v4`/`@v4`; `release.yml` floats `@v4`/`@v6`. The Node bump from setup-node v4→v6 in ci.yml is incidental to pinning — keep ci.yml's test matrix on Node `20.x`; setup-node v6.4.0 supports it.)

### SHA↔tag verification (SEC-01 SC #1 — "verify the VALUE")
- **D-02:** Add a **recurring** CI step that runs **`pinact run --verify --check`** (non-mutating check mode) and fails the build on any unpinned, mismatched, or wrong-tag pin. **Do NOT use raw `pinact run --verify`** — Codex BLOCKER: pinact v4 can *auto-correct* comments unless `--check` (or `--fix=false`) is set, which would silently mutate instead of failing. pinact performs real **live tag→SHA resolution via the GitHub API** (not just inline-comment consistency), which is what satisfies SC #1's "resolves to its commented tag."
- **D-03:** **zizmor is NOT added.** Considered for impostor-commit detection + broader workflow-security audit, but rejected for this phase: the only two actions are `actions/checkout` and `actions/setup-node` (both first-party GitHub — lowest impostor-commit risk), so `pinact --check` alone closes SC #1 with minimal surface. zizmor's `impostor-commit` audit is recorded as a deferred defense-in-depth idea (see Deferred Ideas).

### npm / Node floor pinning (SEC-01 SC #2)
- **D-04:** In `release.yml`'s publish flow, replace the **range** `npm install -g npm@^11.5.1` with an **exact** pin: `npm@11.18.0` (Codex-confirmed as `latest` and ≥ the 11.5.1 OIDC floor, 2026-06-29).
- **D-05:** Pin Node to a **floor ≥ 22.14.0** in the publish job (currently `22.x`).
- **D-06:** Add a **runtime floor-assert** step that fails the release if `npm --version` < 11.5.1 **or** Node < 22.14.0. This is the value-assert (a shape-only declaration is exactly the v3.0.1 mistake).
- **D-07:** Known maintenance gap (Codex GAP, accept + document): the exact `npm@11.18.0` `run:` literal is **NOT** covered by Dependabot's `github-actions` ecosystem (Dependabot scans `uses:` refs, not arbitrary `run:` literals), so it will silently age. The floor-assert guards *correctness* (never drops below floor); staleness is handled by a documented manual-bump note in the workflow — no automation owns it.

### Dependabot maintenance (SEC-01 SC #3)
- **D-08:** Add `.github/dependabot.yml` with `package-ecosystem: github-actions`, `directory: "/"`, `schedule: weekly`, updates **grouped into a single PR**. Quiet/predictable for a solo-maintained, low-velocity repo. Note (Codex GAP): grouped updates default to **version-updates**; repo-level Dependabot security alerts still fire independently — no separate `applies-to: security-updates` group is configured for this phase.

### OIDC / provenance preservation (SEC-01 SC #4)
- **D-09:** Preserve the existing OIDC trusted-publishing posture **untouched**: no stored npm token, `id-token: write` retained, `--provenance` retained, `package-manager-cache: false` retained. The pinning work must not trim any of these.
- **D-10:** Keep the **single-job** release structure. The least-privilege per-job split (separate publish job) was explicitly **deferred** (see Deferred Ideas) — a release.yml refactor risks the exact OIDC/provenance flow SC #4 requires stay intact, and Phase 21 is the foundation the later phases build on.
- **D-11:** Verification obligation (Codex GAP — closure, not config): SC #4's "surviving SLSA-provenance attestation" cannot be proven by the dry-run publish step (it is not an auth/provenance proof). The surviving attestation must be **read back on the next actual tagged release**. Flag this for the phase verifier / release closure, not as a CI-on-push step.

### CLI-06 — mcp bin `--version` (locked by success criteria)
- **D-12:** Replace the brittle one-flag predicate `process.argv.includes('--version')` at `packages/mcp/src/index.ts:836` with a robust version-request check that recognizes: **`--version`**, **`--version=…`**, and the **`-v` / `-V`** aliases. On a match: write `${SERVER_VERSION}\n` to **stdout**, `process.exit(0)`, **before** `StdioServerTransport` boot (a stdio transport hangs forever waiting for a JSON-RPC client otherwise).
- **D-13:** **Case-sensitive** long form: `--Version` / `--VERSION` are intentionally **NOT** version requests and fall through to normal startup. This is the defined, testable behavior the bug report flagged — not an oversight.
- **D-14:** **No argument-parser dependency** (no commander/yargs) — hand-rolled predicate only. Preserve the exact-string contract `scripts/verify-tarball.mjs` depends on: `versionResult.stdout.trim() === expectedVersion` **and** exit code 0. (This is fully specified by the success criteria — captured here so the planner does not re-derive it; no gray area remained.)

### Claude's Discretion
- The internal **shape** of the version-request predicate (inline check vs a small `isVersionRequest(argv)` helper) is the planner's call, provided D-12..D-14 hold.
- The exact wording/placement of the runtime floor-assert and the manual-bump note (D-06, D-07), provided they fail-closed below floor and the note is visible in `release.yml`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Files changed by this phase
- `.github/workflows/ci.yml` — pin actions (D-01) + add the `pinact run --verify --check` gate (D-02).
- `.github/workflows/release.yml` — pin actions (D-01); exact-pin npm + Node floor + runtime floor-assert (D-04..D-06); preserve OIDC/provenance untouched (D-09, D-10); add manual-bump note (D-07).
- `.github/dependabot.yml` — **NEW**, github-actions weekly grouped (D-08).
- `packages/mcp/src/index.ts` — version predicate at `:836` inside `main()`, just before `new StdioServerTransport()` (D-12..D-14). `SERVER_VERSION` is the version source.

### Contract that MUST stay green
- `scripts/verify-tarball.mjs` — packs each tarball, installs clean, runs the bin with `--version`, asserts exit 0 + `stdout.trim() === package.json version` (lines ~203–213). CLI-06 changes are additive; this contract must not break. Also documents the `process.execPath` + `npm-cli.js` spawn discipline (D-02 / Windows EINVAL avoidance) — reuse if any verify step shells out to npm.

### Requirements & success criteria
- `.planning/REQUIREMENTS.md` — SEC-01, CLI-06 (and the Out-of-Scope table that bounds this phase).
- `.planning/ROADMAP.md` §"Phase 21" — the 5 SEC-01 success criteria + the CLI-06 criterion.

### Milestone research (HIGH confidence, 2026-06-29; cross-model reviewed)
- `.planning/research/SUMMARY.md` — synthesis; the "assert VALUES not shapes" framing + the BUILD-01/SEC-01/CLI-06 pitfall list.
- `.planning/research/STACK.md` — verified action SHAs, npm/Node OIDC floors, pinact/zizmor/Dependabot tooling notes.
- `.planning/research/PITFALLS.md` — codebase-specific traps (npm-below-floor, SHA-without-verify, transport-boot-before-version-check).
- `.planning/research/FEATURES.md` — correctness-behavior definitions for CLI-06 and the audit/decoder items.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/verify-tarball.mjs` — already exercises the bin `--version` path end-to-end on the packed tarball; the CLI-06 contract test already exists here. The spawn-via-`process.execPath`+`npm-cli.js` helper (lines 47–63) is the canonical Windows-safe pattern.
- `release.yml` already carries `package-manager-cache: false` and `--provenance` — D-09 keeps both; no need to add them.

### Established Patterns
- **Pre-transport short-circuit** (`packages/mcp/src/index.ts:831–839`): `main()` already checks `--version` and `process.exit(0)`s before `StdioServerTransport`. CLI-06 extends this exact spot — the structural pattern (check → write stdout → exit, before transport) is already correct; only the predicate widens.
- **`SERVER_VERSION` constant** is the single version source the bin prints; the predicate change does not touch how the value is derived.
- **Stderr-only logging discipline** in the mcp server (stdout reserved for JSON-RPC / the version string) — the version write to stdout is the one sanctioned stdout use.

### Integration Points
- CI (`ci.yml`) gains a new `pinact` verify step — it runs on push/PR alongside the existing build/typecheck/verify-tarball/test steps.
- Dependabot (`.github/dependabot.yml`) is net-new repo plumbing; it only proposes PRs, no code coupling.

</code_context>

<specifics>
## Specific Ideas

- The user explicitly requested a **Codex adversarial cross-review** of the supply-chain recommendations before locking — completed 2026-06-29 (Codex job `task-mqzjdb2l-5s0bti`, session `019f1496-1465-7c20-a8c9-48ecb8b01e7c`). Both recommendations returned `AGREE-WITH-MODIFICATION`; the `--check` flag (D-02) is the one correctness change adopted from it. Full verdict preserved in `21-DISCUSSION-LOG.md`.
- Preferred posture throughout: **minimal surface that satisfies the locked success criteria** (the user chose `pinact --check` only and deferred the job split) — consistent with the "simple scales" / no-new-surface stance of v3.1.0.

</specifics>

<deferred>
## Deferred Ideas

Surfaced by the Codex Q5 review as stronger-2026-posture options. All are **hardening refinements beyond SEC-01's locked criteria** — recorded for a future hardening pass, explicitly out of scope for v3.1.0 (no-new-surface milestone):

- **Least-privilege publish-job split** — refactor `release.yml` so build/test run with no OIDC and a separate publish job holds job-level `contents: read` + `id-token: write`. Deferred (D-10): the refactor risks the OIDC/provenance flow SC #4 must preserve, and Phase 21 is the foundation phase.
- **GitHub deployment environment** tied to the npm trusted publisher (environment protection rules on the publish job).
- **zizmor scheduled workflow-security scan** — `impostor-commit` audit + broader checks (over-broad permissions, injection). Defense-in-depth beyond `pinact --check`; low marginal value while only first-party actions are used.
- **harden-runner** — egress control on the runner; adds another third-party action, so only worth it if pinned and intentionally accepted (Codex caveat).

None of these block Phase 21; they would each be their own scoped item.

</deferred>

---

*Phase: 21-supply-chain-bin-hardening*
*Context gathered: 2026-06-29*
