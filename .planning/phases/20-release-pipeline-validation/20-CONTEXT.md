# Phase 20: Release Pipeline Validation - Context

**Gathered:** 2026-06-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Fire both GitHub Actions workflows end-to-end for the first time and prove the v3.0.1 release actually ships. `ci.yml` must run green across the 3-OS matrix (Windows / macOS / Linux on Node 20.x) on the first-ever push to `master` (PIPE-01); `release.yml` must publish `@localground/mcp@3.0.1` and `@localground/cli@3.0.1` to npm with OIDC provenance on the `v3.0.1` tag (PIPE-02); both npmjs.com package pages must render their per-package READMEs (DOC-03); and a clean machine running `npx -y @localground/cli@3.0.1 detect` must succeed (SC5).

Maps to v3.0.1 requirements **PIPE-01**, **PIPE-02**, **DOC-03**. This is the milestone-closing phase — the first GitHub push and the first automated npm publish both happen here. `master` is currently LOCAL-ONLY (never pushed); v3.0.0 was published MANUALLY (npm/cli#8544), so this is the first time the automated pipeline runs.

**Scope note — fixing the pipeline is in scope.** Several manifest/workflow corrections (below) are prerequisites for the pipeline to pass at all. Validating a pipeline that is structurally guaranteed to fail auth is not validation; the corrections are part of Phase 20, not new feature work (D-17 of Phase 19's no-behavior-change rule does not apply — these are release-infra fixes, not product changes).

**Cross-model verified.** All decisions below were stress-tested by an in-app Codex review (repo-grounded) and then independently re-verified by three parallel agents against official npm docs + a fresh repo audit (2026-06-28). Verdicts and sources are inline.

</domain>

<decisions>
## Implementation Decisions

### Publish authorization (PIPE-02)

- **D-01: OIDC trusted publishing is PRIMARY; granular-token is the documented FALLBACK.** `release.yml` stays pure-OIDC (`permissions: id-token: write`, `npm publish --provenance`, no stored token). If the first `v3.0.1` tag's OIDC auth fails, the fallback is a granular automation token via `NODE_AUTH_TOKEN` + `--provenance` (verified to still yield the provenance badge). **Rationale:** the repo was built for OIDC; write-enabled granular tokens now cap at ≤90 days (an expiring-secret liability for a non-developer maintainer); a failed OIDC auth publishes nothing and is retryable. *Verified: docs.npmjs.com/trusted-publishers, docs.npmjs.com/generating-provenance-statements; token+provenance fallback valid; 2FA does not block OIDC.*
- **D-02: `release.yml` MUST run Node ≥22.14.0** (bump `node-version: '20.x'` → `'22.x'`) so the runner ships npm ≥11.5.1 — the OIDC trusted-publishing floor. Node 20.x ships npm ~10.x (below the floor → OIDC cannot work). **The `ci.yml` workflow stays Node 20.x** (that is the runtime floor; `engines` pins `node>=20`, tsup targets node20). Only the release job moves to 22. *Verified: npm trusted-publishing docs; GitHub changelog 2025-07-31.*
- **D-03: npmjs.com trusted-publisher config is a MANUAL prerequisite, set per-package BEFORE the tag.** For BOTH `@localground/mcp` and `@localground/cli`: owner `Technically-A-Mechanical-Engineer`, repo `localground`, workflow `release.yml` (filename, case-sensitive). Possible now that both packages exist on npm (post-first-publish per npm/cli#8544). Verify the config is saved on both packages before pushing the tag.

### Package manifest prerequisites (provenance hard requirements)

- **D-04: Add a `repository` field to BOTH published manifests — HARD BLOCKER.** npm provenance/OIDC publish **fails with E422** if `repository.url` is missing or does not (case-sensitively) match the building GitHub repo. Shape: `{"type":"git","url":"git+https://github.com/Technically-A-Mechanical-Engineer/localground.git","directory":"packages/mcp"}` (and `packages/cli`). Match the GitHub owner/repo casing EXACTLY (`Technically-A-Mechanical-Engineer/localground`) — npm normalizes to `git+https://….git` but compares the `OWNER/REPO` segment case-sensitively; mismatched case is a known foot-gun. *Verified: npm/cli#8036 (verbatim E422), npm provenance docs; independent repo read confirmed NEITHER published manifest currently has a `repository` field.*
- **D-05: Add `license: "MIT"` to both published manifests.** Both READMEs state MIT in prose but neither manifest has a `license` field → npm warns "no license field" on publish and the page quality suffers. `homepage` + `bugs` are optional polish (Claude's discretion). `repository` is covered by D-04.

### Version + lockfile alignment

- **D-06: The 3.0.0 → 3.0.1 version bump MUST align ALL manifests in ONE commit + regenerate the lockfile.** Currently root `package.json`, `packages/core`, `packages/mcp`, `packages/cli` are all 3.0.0, while `.claude-plugin/plugin.json` has already drifted to 3.0.1 — reconcile all five to 3.0.1. `package-lock.json` is uniformly 3.0.0 and MUST be regenerated in the same commit (a lagging lockfile makes `npm ci` the first CI/release failure point). Fold the lockfile regen after the D-04/D-05 manifest edits too. *Verified: independent repo audit confirmed the drift + lockfile state (file:line).*

### release.yml hardening

- **D-07: Add a tag↔version preflight step to `release.yml` before the publish steps.** Assert `GITHUB_REF_NAME == v$(node -p "require('./packages/mcp/package.json').version")` and that the cli version matches. Prevents the non-developer failure mode of tagging the wrong commit / a version mismatch.
- **D-08: Add a `npm publish --dry-run` of BOTH packages before EITHER real publish.** The two real publishes are independent, non-transactional, irreversible HTTP transactions — if mcp publishes and cli then fails, you get a partial, unrecoverable release (npm has no atomic multi-package publish; unpublish is restricted to 72h and the same version can't be republished). The dry-run-both gate catches per-package manifest/auth/pack errors before the first live publish, shrinking the partial-release window. *Verified: npm-publish docs, npm unpublish policy.*
- **D-09: Remove the npm package-manager cache from the RELEASE job** (`package-manager-cache: false`, or drop `cache: 'npm'` from the release `setup-node`). Privileged-workflow cache-poisoning hardening per actions/setup-node guidance (#1358) — a release job holds publish credentials. The `ci.yml` job keeps its cache. Hardening, not a functional blocker. *Verified: actions/setup-node README + #1358.*

### Sequencing (PIPE-01 → PIPE-02)

- **D-10: Incremental, exact-commit tag — never big-bang.** Sequence: land the pre-flight fixes (D-02, D-04, D-05, D-07, D-08, D-09) → push `master` (creates the first CI run) → CI green on all 3 OSes → version-bump commit (D-06) → CI green on THAT commit → annotated `v3.0.1` tag on that exact commit, verify `git show v3.0.1:packages/mcp/package.json` (version 3.0.1 + `repository` present) and the cli manifest before pushing → push tag → `release.yml` → OIDC publish. Direct-to-master (config `git.branching_strategy: none`); push existing history as-is (`.planning/` is gitignored so only source commits go public; squashing is aesthetic-only with high rebase risk for a first-timer). **Rationale:** a red CI run is free to retry; an irreversible bad publish is not. Big-bang rejected (collapses first push + first CI + first OIDC + first immutable publish into one failure surface).

### Windows CI readiness (PIPE-01)

- **D-11: No pre-emptive Windows fixes needed — the two known risks are already mitigated (independently confirmed).** `packages/core/test/environment/decode.test.ts:10-17` canonicalizes its tmpdir fixture via `fs.realpath()` (handles the hosted-Windows `RUNNER~1` 8.3 short-path vs long-name mismatch — the only test doing a path-hash round-trip), and the only npm/npx spawn in the repo is `scripts/verify-tarball.mjs` (via `process.execPath` + `npm-cli.js`, the Windows+Node20 EINVAL workaround); every other test spawn uses `process.execPath` or `git`. Push-and-react is safe for any residual cross-OS surprise (`fail-fast: false` → all 3 OSes report independently). *Verified: independent repo grep/audit, file:line.*

### End-user install scope (SC5 + DOC-03 + H-4)

- **D-12: Validation scope = SC5 + DOC-03 + one manual MCP-registration check. Do NOT ship a bundled `.mcp.json`.** Validate `npx -y @localground/cli@3.0.1 detect` on a clean machine (SC5); confirm both per-package READMEs render on npmjs.com (DOC-03 — both already carry install commands incl. the Windows `cmd /c npx` workaround); and validate the documented MCP-registration command ONCE post-publish (`claude mcp add --transport stdio localground -- cmd /c npx -y @localground/mcp@3.0.1`). A bundled `.mcp.json` is OUT — it reverses Phase 19 C-1, auto-starts a competing server on plugin load, and adds product code to a validation phase. Full H-4 npx auto-register deferred to its own plan / v3.1.0. *Verified: ROADMAP SC list, Phase 19 C-1; READMEs confirmed present with install commands.*
- **D-13: Update PROJECT.md to describe three distribution forms (DOC-03 sibling).** PROJECT.md (and user-facing docs as needed) should describe the toolkit's three forms — MCP server, CLI, paste-prompts — plus the plugin. The "two→three forms" doc update carried from Phase 19.

### Claude's Discretion

- Exact YAML for the preflight (D-07) and dry-run-both (D-08) steps; whether to add `homepage`/`bugs` alongside `license` (D-05); README copy-edits for DOC-03; the precise Node 22 pin (`22.x` vs an explicit `22.14.x`). Planner/executor decide within the decisions above.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap (locked)
- `.planning/REQUIREMENTS.md` §"Pipeline First-Run Validation" (PIPE-01, PIPE-02) + §"Documentation" (DOC-03)
- `.planning/ROADMAP.md` §"Phase 20: Release Pipeline Validation" — goal + 5 success criteria the executor verifies against

### Artifacts under test (the workflows)
- `.github/workflows/ci.yml` — 3-OS matrix, Node 20.x; push/PR to master
- `.github/workflows/release.yml` — `v*` tag trigger; pure-OIDC publish (the file D-02/D-07/D-08/D-09 modify)

### Manifests & lockfile (D-04, D-05, D-06 targets)
- `package.json` (root, `private:true`), `packages/core/package.json`, `packages/mcp/package.json`, `packages/cli/package.json`, `.claude-plugin/plugin.json`, `package-lock.json`

### Tarball / install / docs
- `scripts/verify-tarball.mjs` — npm pack + clean-install smoke (the Windows npm-spawn workaround pattern; D-08 dry-run can mirror it)
- `packages/mcp/README.md`, `packages/cli/README.md` — DOC-03 render targets (install commands present, incl. Windows `cmd /c npx`)

### Prior-phase boundary & decisions
- `.planning/phases/19-skill-runtime-uat/19-CONTEXT.md` — C-1 (ship no `.mcp.json`) + H-4 carryover (D-12 honors both)
- `.planning/PROJECT.md` §"Key Decisions" — manual-first-publish + OIDC for v3.0.1+ (D-01 context); D-13 update target

### Cross-model review (this phase)
- `.planning/notes/2026-06-28-phase-20-codex-review.md` — Codex cross-model review (verdicts A/B/C/D + cross-cutting gaps)

### External, verified 2026-06-28 (cite when implementing)
- npm trusted publishing: https://docs.npmjs.com/trusted-publishers/ (repository-match requirement; npm ≥11.5.1 / Node ≥22.14.0)
- npm provenance: https://docs.npmjs.com/generating-provenance-statements/ (repository must match; token+provenance path)
- npm/cli#8036: https://github.com/npm/cli/issues/8036 (verbatim E422 on repository mismatch; case-sensitivity foot-gun)
- GitHub changelog 2025-07-31: OIDC trusted publishing GA (npm CLI v11.5.1+)
- actions/setup-node#1358: https://github.com/actions/setup-node/issues/1358 (disable cache in privileged/release workflows)
- GitHub changelog 2025-09-29: write-enabled granular tokens cap at ≤90 days

### Memory (operational gotchas)
- `feedback_npm_first_publish` (manual-first done; OIDC now possible), `feedback_npm_package_readme` (per-package READMEs render only if in tarball), `feedback_monorepo_bundled_deps` (core in devDependencies — no phantom runtime dep), `feedback_windows_ci_short_paths` (D-11), `feedback_windows_npm_spawn` (D-11), `feedback_pr_branch_transient_conflicts` (N/A — direct push per D-10), `feedback_planning_gitignore` (`git add -f` for `.planning/`)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/verify-tarball.mjs` — the npm pack + clean-install smoke AND the canonical Windows npm-spawn workaround (`spawnSync(process.execPath, [npmCliJs, ...])`); D-08's dry-run gate can reuse this invocation shape.
- `packages/core/test/environment/decode.test.ts:10-17` — the `fs.realpath()` tmpdir-canonicalization pattern (already protects the only path-hash round-trip from the hosted-Windows 8.3 short-path bug).

### Established Patterns
- No `shell:true` on any spawn (CRIT-3/MOD-3); all spawns use array args via `process.execPath` or `git`.
- `files: ["dist"]` tarball shape (Phase 18); `npm pack --dry-run` includes README + package.json + dist (DOC-03 packaging confirmed).
- `@localground/core` is bundled into mcp/cli via tsup `noExternal` and kept in devDependencies → no phantom runtime dep; no core publish-order problem.

### Integration Points
- `ci.yml` fires on push/PR to master (first push = PIPE-01). `release.yml` fires on `v*` tag (PIPE-02). npmjs.com trusted-publisher config is the external integration (D-03), set per-package before the tag.

</code_context>

<specifics>
## Specific Ideas

- The load-bearing release constraints — `repository`-field E422 (D-04), the npm ≥11.5.1 / Node ≥22.14 OIDC floor (D-02), and the non-atomic partial-publish risk (D-08) — are all verified against official npm docs + the cross-model review, not inferred. Implement against the cited sources, and verify the `repository.url` casing exactly.
- The single highest-risk moment is the first `v3.0.1` tag push (first immutable publish). The preflight (D-07) + dry-run-both (D-08) + trusted-publisher pre-check (D-03) + tag-content verification (D-10) are the four guards around it.

</specifics>

<deferred>
## Deferred Ideas

- **Bundled `.mcp.json` + full npx auto-register (H-4)** — its own plan / v3.1.0 (reverses C-1, adds product code; out of validation scope per D-12).
- **999.5 / CLI-05 streaming refactor of `spawnTool`** — v3.1.0 (already in REQUIREMENTS.md `## v3.1.0 Requirements`).
- **`homepage` / `bugs` manifest fields** — optional polish beyond the `license` + `repository` must-haves (Claude's discretion under D-05).
- **Codebase-maps refresh** (`.planning/codebase/*.md` still v1.2.0-era; INTEGRATIONS.md is stale) — deferred since Phases 16-19; refresh via `/gsd-map-codebase` before v3.1.0, not blocking Phase 20.
- **Phase 14 seed-marker cleanup in the real QMS-Document-Processor OneDrive project** — separate careful housekeeping, not Phase 20.

</deferred>

---

*Phase: 20-release-pipeline-validation*
*Context gathered: 2026-06-28*
