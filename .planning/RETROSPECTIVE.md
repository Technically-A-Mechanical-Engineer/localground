# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.2.0 — Cloud-Sync Toolkit

**Shipped:** 2026-04-11
**Phases:** 4 | **Plans:** 13 | **Commits:** 57

### What Was Built
- Migration prompt v1.2.0 (666 lines) — three-way shell detection, four-signal prior migration cascade, subdirectory scoping, pre-copy placeholder verification
- Cleanup prompt v1.0.0 (946 lines) — dual-mode detection, verification-gated source folder deletion, cloud-propagation warning, soak-period check
- Verification prompt v1.0.0 (658 lines) — project health audit, path-hash integrity, reference scan, traffic light report with 12-entry recommendation mapping
- All three prompts evaluated against eight NEC prompt frameworks with zero findings
- Documentation suite: README, CLAUDE.md, three dev-status reports, three evaluation files

### What Worked
- **Design spec first, then GSD phases** — the approved design spec (`docs/superpowers/specs/2026-04-10-cloud-sync-toolkit-design.md`) front-loaded all architecture decisions, so phases executed cleanly with minimal rework
- **Consistency passes as final plan tasks** — every prompt-building phase ended with a full internal consistency check, catching zero issues because the build was disciplined
- **Three independent prompts, not a chain** — each prompt self-contained with its own detection logic; no runtime dependencies between prompts simplified both building and testing
- **NEC framework evaluation as a phase gate** — evaluating each prompt before release caught issues early and built confidence in the final artifact

### What Was Inefficient
- **STATE.md cascade bug** — the complete-phase tool doesn't cascade progress numbers correctly; required manual fixes at milestone completion. Known GSD issue, not project-specific.
- **Missing SUMMARY.md files for mid-phase plans** — only final plans in multi-plan phases generated summaries (02-01, 02-02, 03-01, 03-02, 04-01, 04-03 had no summaries). The milestone completion workflow expects summaries per plan, causing false readiness failures.
- **Plan 04-04 (state audit) partially executed across sessions** — work was split across worktree merges, leaving bookkeeping incomplete until milestone completion cleaned it up inline

### Patterns Established
- **Three-way shell detection** as a reusable pattern: PowerShell / bash-on-Windows / native bash, applied consistently across all three prompts
- **Five-dimension constraint model** (Must / Must-not / Prefer / Escalate / Recover) tuned per prompt type
- **Graceful cross-prompt state** — missing artifacts interpreted as cleanup, not corruption
- **Per-prompt dev-status and evaluation files** — `dev-status-{prompt}.md` and `prompt-evaluation-{prompt}.md` naming convention
- **One file, one paste** distribution model for prompt-based tools

### Key Lessons
1. Front-loading decisions in a design spec makes GSD phases predictable — 2-day execution for a 3-prompt toolkit because all architecture was settled before Phase 1
2. Prompt engineering at this scale (2,270 lines across 3 files) benefits from the same phased approach as code — scaffold first, fill phases sequentially, consistency pass last
3. The NEC evaluation frameworks are most valuable when applied per-prompt, not per-milestone — each prompt has different risk profiles

### Cost Observations
- Model mix: quality profile (opus-heavy) throughout
- Timeline: 2 days (April 10-11, 2026)
- Notable: 13 plans across 4 phases in 2 days — high throughput because the design spec eliminated ambiguity

---

## Milestone: v3.0.1 — Validation and Hardening

**Shipped:** 2026-06-29 (published to npm as v3.0.2)
**Phases:** 5 (16-20) | **Plans:** 21

### What Was Built
- Test infrastructure hardened — restored `tsc --build` strict gate over src+test, eliminated the Vitest cleanup hang, closed two test-hygiene findings (Phase 16)
- Path-hash decoder calibrated — `encode()` regex widened to seven special-char classes; WR-01 closed with deleted-source traceability (Phase 17)
- npm tarballs trimmed to `files: ["dist"]` + a CI-wired `npm pack`/clean-install regression guard (Phase 18)
- All 5 `/localground:*` skills runtime-UAT'd against the registered MCP server, including the two-session `migrate` loop across a real Claude Code restart; proven on dev build *and* packaged tarball (Phase 19)
- First-ever runs of both GitHub Actions workflows: `ci.yml` 3-OS green + `release.yml` OIDC publish with SLSA-v1 provenance; the project's first provenance-carrying release (Phase 20)
- Version-drift hardening: bins derive `--version` from `package.json` at runtime + a CI version-equality gate; shipped clean as v3.0.2 after the validation caught the 3.0.1 misreport (Phase 20)

### What Worked
- **Cross-model stress-test before the irreversible publish** — an in-app Codex review plus 3-agent re-verification against official npm docs surfaced the E422 `repository`-field blocker *before* the tag, not after a failed publish
- **Incremental exact-commit tagging** kept each first-time (push / CI / OIDC / publish) isolated; the 4-attempt OIDC recovery never burned an immutable version because a registry-absence matrix confirmed nothing was live before each retry
- **Adversarial post-publish verification (4-lens)** caught the SC5 version-misreport that CI's shape-only check let through — the validation phase did exactly what it exists to do
- **Comprehension gates (Phases 19 + 20)** produced reviewer-affirmed understanding at close, not just passing tests
- **Process-identity honesty gate in UAT** — when dev and tarball builds are byte-identical, no config read proves which one ran; catching the live process did

### What Was Inefficient
- **The npm-OIDC-floor assumption was false and cost 4 release iterations.** D-02 stated "Node 22.x ships npm ≥11.5.1"; Node 22 actually bundles npm 10.9.x (below the floor). A one-line `npm --version` echo on the runner would have caught it on attempt 1
- **The version-drift defect shipped immutably as 3.0.1** because CI asserted version *shape*, not version *value* — forcing a fix-forward to 3.0.2 (3.0.1 can never be reused)
- **GSD cascade-drift recurred** — Phase 16-18 checkboxes and several REQUIREMENTS/PIPE markers were stale at close and needed manual correction (a known cross-milestone GSD issue)
- **~2-month calendar gap** between Phases 16-18 (Apr 27) and Phases 19-20 (Jun 28-29) — context had to be reloaded via snapshot/resume

### Patterns Established
- **Derive, don't duplicate** any value that must equal the package version (runtime read from `package.json`), and assert value-equality in CI — not just format
- **Stack cheap, repeatable guards around the one irreversible action**: dry-run-both, registry-absence matrix, tag-content verify, exact-commit tag
- **Cross-model verification before high-stakes irreversible infra changes** (publish, tag)
- **A comprehension-gate artifact per closure-worthy phase** — reviewer affirms each section at their layer before the phase closes

### Key Lessons
1. A green CI check is only as trustworthy as what it asserts — a shape-check waves through correctly-formatted garbage; assert the value
2. A documented or cited assumption is still an assumption until the actual runner proves it (the npm-version floor)
3. A validation phase succeeds precisely when it surfaces a real defect before that defect becomes permanent

### Cost Observations
- Model mix: quality profile (opus-heavy main loop; `gsd-executor` on sonnet per config override); Phases 19-20 leaned on multi-agent (Workflow) adversarial verification
- Sessions: multiple across April + June, with `/compact` cycles through the Phase 19-20 arc (snapshot/resume bridged the gaps)
- Notable: the 4-attempt OIDC recovery + the fix-forward added real wall-clock, but the pipeline caught an immutable-publish defect that would otherwise be live on npm

---

## Milestone: v3.1.0 — Hardening and Hygiene

**Shipped:** 2026-06-30 (milestone close; release tag `v3.1.0` pending push → OIDC + provenance publish of `@localground/mcp@3.1.0` + `@localground/cli@3.1.0`)
**Phases:** 3 (21-23) | **Plans:** 6

### What Was Built
- Supply chain hardened — both GitHub Actions workflows SHA-pinned (40-char SHA + `# vX.Y.Z`) with a `pinact` verify-pins CI gate that resolves each SHA to its tag against the live API; publish job exact-pins runner npm (≥11.5.1) on Node ≥22.14.0 (paired OIDC floors, runtime-asserted); Dependabot `github-actions` config keeps pins fresh (Phase 21, SEC-01)
- mcp bin `--version` predicate hardened — recognizes `--version`/`--version=…`/`-v`/`-V`, prints + exits 0 before booting the transport, case-sensitive fall-through, no parser dependency added (Phase 21, CLI-06)
- Last hardcoded version literal eliminated — seed `toolkitVersion` derives from each package's runtime version; `verify-tarball.mjs` asserts the seed-path version *value* through both real consumer surfaces (cli `seed --json` bin, mcp `localground_seed` JSON-RPC) on the packaged tarball (Phase 22, BUILD-01)
- `looksLikeProject` path-shape filter wired to audit AND detect — rejects system/home/drive/AppData/other-user roots while keeping marker-less plain folders discoverable (D-01); 12-test regression-lock on both invariants (Phase 22, CORE-15)
- Decoder trailing-edge round-trip fixed — additive `encodedName + '--'` `buildCandidates` branch + case-insensitive verify-then-return (`candidates[0]` best-guess removed); `encode()` byte-unchanged; locked by a 9×5 special-char×position matrix and a canonical-OneDrive value re-assertion (Phase 23, CORE-16)

### What Worked
- **"Assert the VALUE, not the shape" carried forward as a per-requirement success criterion** — BUILD-01's tarball value gate, SEC-01's SHA→tag resolution (not merely "is it pinned"), and CORE-16's value-asserted matrix each tested the outcome, not the format. The v3.0.1 lesson became a milestone-wide discipline.
- **Additive-over-rewrite for the highest-risk change** — the CORE-16 `+ '--'` branch can only ADD decode candidates, so every previously-passing shape (incl. the load-bearing OneDrive fix) was structurally safe from regression; the verify-then-return filter rejected the spurious extras.
- **Sequencing by blast radius** — SEC-01 (pure YAML) hardened the pipeline first; CORE-16 (highest regression risk) landed last with the full hardened suite as its safety net.
- **Staged release with explicit stop points** — validate pinact CI green (Stage 1) → version bump (Stage 2) → milestone close → gated tag/publish (Stage 3) kept the human in the loop at every CI-firing push and before the irreversible npm publish.
- **Pre-edit grep before the mechanical version bump** caught a 5th version-of-record (`.claude-plugin/plugin.json`) that the remembered "four manifests" scope missed.

### What Was Inefficient
- **GSD cascade-drift recurred** — `phase.complete` didn't flip the ROADMAP phase checkbox (manual fix, again), and `milestone.complete` rewrote STATE.md's body with stale pre-close fields (`Current focus: Phase 23`, `Last shipped: v3.0.1`) needing manual `update_state` cleanup.
- **`.planning/` gitignored-but-tracked friction** — `gsd-sdk query commit` fails on those paths; every planning commit needs a `git add -f` fallback.
- **Two Phase 21 human-UAT items sat "pending" through close** — the pinact live run and the SLSA-provenance read-back are release-gated; they show up in every pre-close audit until the actual release runs (the pinact one was in fact satisfied by the Stage 1/2 validation pushes).

### Patterns Established
- **Release-as-stages with a stop before the irreversible tag** — validate → bump → close → (gated) tag/publish → post-publish read-back. The tag push is the single point of no return (npm versions are immutable).
- **Pre-bump grep sweep for every version-of-record** (workspace manifests + plugin manifest + lockfile) before editing — never trust a remembered file count.
- **Derived-version verification end-to-end** — a value asserted equal to `package.json` must be tested through the real consumer surface (bin / JSON-RPC tool), not just the source constant.
- **Additive recovery branches over regex/character-class widening** for calibrated decoders — preserve every passing shape by construction.

### Key Lessons
1. "Assert the value, not the shape" generalizes past CI to every requirement — make each requirement carry a value assertion and the whole milestone inherits the discipline.
2. For a calibrated or load-bearing algorithm, fix *additively* — a branch that can only add candidates cannot regress existing passing inputs; widening a shared regex can.
3. Release-gated validations (provenance attestation, live pin resolution) are deferred read-backs, not gaps — distinguish "unverifiable until the environment exists" from "untested."
4. A remembered scope ("the four manifests") is an assumption — grep the repo for the actual surface before any mechanical sweep.

### Cost Observations
- Model mix: quality profile (opus main loop; `gsd-executor` on sonnet per config override). Phase 23 ran ultracode/sequential (worktrees disabled on Windows).
- Sessions: the v3.1.0 implementation (Phases 21-23) plus this release arc, with a `/compact` + `post-compact-resume` bridging into the release.
- Notable: a hardening minor with zero new feature surface — value was in closing drift/supply-chain/correctness gaps, evidenced by CI staying green (3-OS + pinact) straight through the version bump.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Commits | Phases | Key Change |
|-----------|---------|--------|------------|
| v1.2.0 | 57 | 4 | First milestone — design spec + GSD phases for prompt engineering |
| v3.0.1 | — | 5 | First automated release (OIDC + provenance); cross-model + adversarial verification around the irreversible publish; comprehension gates per phase |
| v3.1.0 | — | 3 | Hardening minor (no new features); staged release with an explicit stop before the irreversible tag; a value-assertion per requirement; additive decoder fix |

*(v2.0.0 and v3.0.0 predate this living retrospective and were not back-filled.)*

### Top Lessons (Verified Across Milestones)

1. Design specs / locked decisions before GSD phases eliminate mid-build architectural debates
2. Prompt engineering benefits from the same rigor as software engineering — phased builds, consistency checks, framework evaluations
3. Around irreversible actions (immutable publishes), assert *values* not *shapes*, and stack cheap retryable pre-checks — the cost of a caught defect is a retry; the cost of a missed one is permanent
