# Roadmap: LocalGround Toolkit

## Milestones

- ✅ **v1.2.0 Cloud-Sync Toolkit** -- Phases 1-4 (shipped 2026-04-11) -- [archive](milestones/v1.2.0-ROADMAP.md)
- ✅ **v2.0.0 Five-Prompt Toolkit with Unified Versioning** -- Phases 5-11 (shipped 2026-04-12) -- [archive](milestones/v2.0.0-ROADMAP.md)
- ✅ **v3.0.0 MCP Server + CLI Tooling** -- Phases 12-15 (shipped 2026-04-26) -- [archive](milestones/v3.0.0-ROADMAP.md)
- ✅ **v3.0.1 Validation and Hardening** -- Phases 16-20 (shipped 2026-06-29 as v3.0.2) -- [archive](milestones/v3.0.1-ROADMAP.md)
- **v3.1.0 Hardening and Hygiene** -- Phases 21-23 (active) -- 5 carry-forward correctness/supply-chain fixes, no new feature surface

## Phases (v3.1.0 -- Active)

**Milestone goal:** Close the v3.0.1 carry-forward loop — drift-proof versioning, harden the release supply chain, and fix two decoder/audit correctness gaps — with no new feature surface. The cross-cutting v3.0.1 lesson governs every phase: **assert the VALUE, not the shape** (a shape-only CI check shipped an immutable bad version in v3.0.1). Every requirement carries a value assertion.

**Sequencing rationale:** Ordered by risk isolation, not data dependency — no item hard-blocks another. Build order preserved: SEC-01 → CLI-06 → BUILD-01 → CORE-15 → CORE-16. SEC-01 (pure YAML) hardens the pipeline that validates everything else, so it lands first; CORE-16 (the load-bearing OneDrive `buildCandidates` fix, highest regression risk) lands last with the full hardened suite as its safety net.

- [x] **Phase 21: Supply-Chain & Bin Hardening** -- SHA-pin both GitHub Actions workflows + exact-pin runner npm in the OIDC publish job, and robustify the mcp bin `--version` parser (SEC-01, CLI-06)
- [x] **Phase 22: Core Versioning & Audit Filter** -- Derive the seed manifest version from package.json (no hardcoded literal) and stop audit from surfacing system/home roots while keeping plain-folder projects discoverable (BUILD-01, CORE-15)
- [ ] **Phase 23: Decoder Trailing-Edge Fix** -- Fix the `buildCandidates` trailing-hyphen-strip asymmetry so a special char at the trailing edge of an intermediate path component round-trips losslessly, with no regression to the 17/17 path-hashes or the load-bearing OneDrive fix (CORE-16)

### Phase 21: Supply-Chain & Bin Hardening
**Goal**: The release supply chain is pinned and verifiable, and the mcp bin reports its version robustly without ever booting the transport.
**Depends on**: Nothing (first v3.1.0 phase; pure config + isolated bin predicate)
**Requirements**: SEC-01, CLI-06
**Success Criteria** (what must be TRUE):
  1. Every third-party Actions `uses:` in BOTH `.github/workflows/ci.yml` and `.github/workflows/release.yml` is pinned to a full 40-character commit SHA carrying a `# vX.Y.Z` version comment, and each pinned SHA is verified to actually resolve to its commented tag (e.g. via `pinact`/`zizmor` or a CI check — a SHA can point at a fork/wrong commit, so verify the VALUE).
  2. The publish job exact-pins the runner npm to a specific version ≥ 11.5.1 AND runs on Node ≥ 22.14.0 (the paired OIDC floors), and asserts both at runtime (a runtime floor-assert, not a shape-only declaration).
  3. A Dependabot `github-actions` ecosystem config is present so the pins stay updatable.
  4. The release still publishes via OIDC with no stored npm token, retains `id-token: write`, and produces a surviving SLSA-provenance attestation (none of these are trimmed by the pinning work).
  5. The mcp bin robustly recognizes a `--version` request — `--version`, `--version=…`, and the `-v`/`-V` alias — prints the version string to stdout, exits 0, and NEVER boots the stdio transport; `--Version`/`--VERSION` are case-sensitively NOT version requests and fall through to normal startup; the pre-transport short-circuit + `process.exit(0)` + exact-string contract that `verify-tarball.mjs` depends on is preserved; no argument-parser dependency is added to the mcp package.
**Plans**: 2 plans
Plans:
- [x] 21-01-PLAN.md — SHA-pin both workflows + pinact --verify --check gate, exact-pin npm@11.18.0 + Node floor + runtime floor-assert + manual-bump note, add github-actions Dependabot config, preserve OIDC/provenance (SEC-01)
- [x] 21-02-PLAN.md — Robustify the mcp bin --version predicate (--version/--version=/-v/-V; --Version falls through), no parser dependency, preserve the verify-tarball contract (CLI-06)

### Phase 22: Core Versioning & Audit Filter
**Goal**: The seed manifest version can no longer drift from the package version, and audit auto-discovery excludes system/home/drive roots while still finding marker-less plain-folder projects.
**Depends on**: Phase 21 (sequenced after to keep the supply chain hardened before core edits land; no hard data dependency)
**Requirements**: BUILD-01, CORE-15
**Success Criteria** (what must be TRUE):
  1. The seed manifest's `toolkitVersion` always EQUALS the consuming package's version (`@localground/mcp` or `@localground/cli`) on BOTH the dev build AND the packaged tarball (assert the value, not merely that the literal was removed).
  2. No hardcoded version literal remains in `packages/core/src/operations/seed.ts` (currently `toolkitVersion: '3.0.2'` at line 139).
  3. `scripts/verify-tarball.mjs` is extended to assert the seed-path version VALUE (today it gates only the bin `--version`).
  4. Audit auto-discovery no longer surfaces home/drive/system roots (e.g. `C:\Users\…`) as candidate projects, while plain-folder projects with NO `.git`/`package.json` marker stay discoverable (decision D-01 preserved — NO marker-file check).
  5. The CORE-15 fix lives in shared `@localground/core` so the CLI `audit`/`detect` and the MCP `audit` tool inherit it identically, and a regression test locks BOTH invariants (root-rejection AND D-01 plain-folder-discovery).
**Constraints**:
  - CORE-15: Reproduce the `audit-includes-root-paths` symptom against current `master` FIRST — this may resolve to a regression-lock test rather than a logic change.
  - BUILD-01: Do NOT copy the bins' runtime `readFileSync(new URL('../package.json', import.meta.url))` into the bundled `seed.ts` — after `noExternal` inlining, `import.meta.url` resolves to the consumer's `dist/`, giving the wrong semantics. Build-time `define` injection is the recommended mechanism (A-vs-B HOW decision settles at plan-phase).
**Plans**: 2 plans
Plans:
**Wave 1**
- [x] 22-01-PLAN.md — Parameterize seed() with toolkitVersion (Option A), wire both bins, 2-arg + value-equality tests, verify-tarball seed-value gate (BUILD-01)

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 22-02-PLAN.md — Path-shape-only tighten looksLikeProject (other-user home + AppData denylist) + NEW regression-lock test (root-rejection + plain-folder discovery) (CORE-15)

### Phase 23: Decoder Trailing-Edge Fix
**Goal**: A special character at the trailing edge of an intermediate path component round-trips losslessly through `encode()`/`decode()`, with the calibrated 17/17 path-hashes and the load-bearing OneDrive fix fully intact.
**Depends on**: Phase 22 (sequenced last by blast radius; no hard data dependency, but lands with the full hardened suite as the safety net)
**Requirements**: CORE-16
**Success Criteria** (what must be TRUE):
  1. A special char (`'`, `&`, `[`, `]`, `(`, `)`, `+`, `=`, `%`) at the trailing edge of an INTERMEDIATE path component round-trips through `encode()`/`decode()` losslessly.
  2. The 17/17 currently-passing path-hashes do NOT regress.
  3. The load-bearing v3.0.0 OneDrive `buildCandidates` fix does NOT regress (the canonical `OneDrive - ThermoTek, Inc/...` decode still passes).
  4. Trailing-edge, leading-edge, and mid-component fixtures are added (the trailing-edge probes flip from the documented `no_candidates` failure to SUCCESS; an interior-occurrence guard proves no regression).
**Constraints**:
  - Fix the trailing-hyphen-strip asymmetry in `buildCandidates` (`packages/core/src/environment/decode.ts:~187-196`), NOT the Phase-17 character class (`decode.ts:89`). The recommended shape is an additive second prefix branch (`encodedName + '--'` alongside the existing `encodedName + '-'`) — additive so every currently-passing shape is untouched.
  - Confirm against a real failing path-hash BEFORE implementation.
**Plans**: 2 plans
- [x] 23-01-PLAN.md — RED reproduce CORE-16 trailing-edge no_candidates (D-03), then additive `--` branch (L-01) + case-insensitive verify-then-return (D-01)
- [ ] 23-02-PLAN.md — exhaustive 9×5 special-char position matrix (D-02) + explicit canonical OneDrive value re-assertion (L-03) + documented Foo&& boundary guard

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)
- 999.x: Backlog parking lot (unsequenced — see Backlog section)

## Phases (v3.0.1 -- Completed)

<details>
<summary>✅ v3.0.1 Validation and Hardening (Phases 16-20) -- SHIPPED 2026-06-29 (published to npm as v3.0.2)</summary>

- [x] Phase 16: Test Infrastructure Hardening (3/3 plans) -- completed 2026-04-27 — restored `tsc --build` strict gate over src+test, eliminated Vitest cleanup hang, closed two test-hygiene findings (TEST-01..04)
- [x] Phase 17: Core Decoder Calibration (2/2 plans) -- completed 2026-04-27 — `encode()` regex widened to seven special-char classes; WR-01 closed with deleted-source diagnostic traceability (CORE-13, CORE-14)
- [x] Phase 18: Packaging Polish (2/2 plans) -- completed 2026-04-27 — `files: ["dist"]` on both publishable packages + CI-wired `npm pack` regression guard (PKG-01, PKG-02)
- [x] Phase 19: Skill Runtime UAT (7/7 plans) -- completed 2026-06-28 — all 5 `/localground:*` skills validated end-to-end vs the registered MCP server (incl. two-session migrate continuation loop across a restart), on both dev build and packaged tarball (UAT-01..05); comprehension AFFIRMED
- [x] Phase 20: Release Pipeline Validation (7/7 plans) -- completed 2026-06-29 — first-ever `ci.yml` (3-OS green) + `release.yml` (OIDC + provenance) runs; validation caught an SC5 defect in 3.0.1 (binaries printed 3.0.0) → fix-forward shipped v3.0.2 (PIPE-01, PIPE-02, DOC-03); comprehension AFFIRMED

Full archive: [milestones/v3.0.1-ROADMAP.md](milestones/v3.0.1-ROADMAP.md)

</details>

## Phases (v1.2.0 -- Completed)

<details>
<summary>v1.2.0 Cloud-Sync Toolkit (Phases 1-4) -- SHIPPED 2026-04-11</summary>

- [x] Phase 1: Migration v1.2.0 (2/2 plans) -- completed 2026-04-10
- [x] Phase 2: Cleanup v1.0.0 (4/4 plans) -- completed 2026-04-10
- [x] Phase 3: Verification v1.0.0 (3/3 plans) -- completed 2026-04-11
- [x] Phase 4: Documentation Updates (4/4 plans) -- completed 2026-04-11

</details>

## Phases (v2.0.0 -- Completed)

<details>
<summary>v2.0.0 Five-Prompt Toolkit (Phases 5-11) -- SHIPPED 2026-04-12</summary>

- [x] Phase 5: Housekeeping -- File Rename and Docs Restructuring (3/3 plans) -- completed 2026-04-11
- [x] Phase 6: Existing Prompt Fixes (4/4 plans) -- completed 2026-04-11
- [x] Phase 7: Sow Prompt Build (1/1 plans) -- completed 2026-04-11
- [x] Phase 8: Sow NEC Evaluation (2/2 plans) -- completed 2026-04-12
- [x] Phase 9: Seed Prompt Build (1/1 plans) -- completed 2026-04-12
- [x] Phase 10: Seed NEC Evaluation (2/2 plans) -- completed 2026-04-12
- [x] Phase 11: Documentation, Unified Versioning, and Sow-to-Reap Rename (3/3 plans) -- completed 2026-04-12

</details>

## Phases (v3.0.0 -- Completed)

<details>
<summary>v3.0.0 MCP Server + CLI Tooling (Phases 12-15) -- SHIPPED 2026-04-26</summary>

- [x] Phase 12: Monorepo Foundation and Core Library (7/7 plans) -- completed 2026-04-13
- [x] Phase 13: MCP Server (6/6 plans) -- completed 2026-04-13
- [x] Phase 14: Standalone CLI and Claude Code Skills (11/11 plans) -- completed 2026-04-26
- [x] Phase 15: Testing, CI, Publishing, and Documentation (6/6 plans) -- completed 2026-04-26

Full archive: [milestones/v3.0.0-ROADMAP.md](milestones/v3.0.0-ROADMAP.md)

</details>

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Migration v1.2.0 | v1.2.0 | 2/2 | Complete | 2026-04-10 |
| 2. Cleanup v1.0.0 | v1.2.0 | 4/4 | Complete | 2026-04-10 |
| 3. Verification v1.0.0 | v1.2.0 | 3/3 | Complete | 2026-04-11 |
| 4. Documentation Updates | v1.2.0 | 4/4 | Complete | 2026-04-11 |
| 5. Housekeeping | v2.0.0 | 3/3 | Complete | 2026-04-11 |
| 6. Existing Prompt Fixes | v2.0.0 | 4/4 | Complete | 2026-04-11 |
| 7. Sow Prompt Build | v2.0.0 | 1/1 | Complete | 2026-04-11 |
| 8. Sow NEC Evaluation | v2.0.0 | 2/2 | Complete | 2026-04-12 |
| 9. Seed Prompt Build | v2.0.0 | 1/1 | Complete | 2026-04-12 |
| 10. Seed NEC Evaluation | v2.0.0 | 2/2 | Complete | 2026-04-12 |
| 11. Documentation, Unified Versioning, and Sow-to-Reap Rename | v2.0.0 | 3/3 | Complete | 2026-04-12 |
| 12. Monorepo Foundation and Core Library | v3.0.0 | 7/7 | Complete | 2026-04-13 |
| 13. MCP Server | v3.0.0 | 6/6 | Complete | 2026-04-13 |
| 14. Standalone CLI and Claude Code Skills | v3.0.0 | 11/11 | Complete | 2026-04-26 |
| 15. Testing, CI, Publishing, and Documentation | v3.0.0 | 6/6 | Complete | 2026-04-26 |
| 16. Test Infrastructure Hardening | v3.0.1 | 3/3 | Complete | 2026-04-27 |
| 17. Core Decoder Calibration | v3.0.1 | 2/2 | Complete | 2026-04-27 |
| 18. Packaging Polish | v3.0.1 | 2/2 | Complete | 2026-04-27 |
| 19. Skill Runtime UAT | v3.0.1 | 7/7 | Complete | 2026-06-28 |
| 20. Release Pipeline Validation | v3.0.1→3.0.2 | 7/7 | Complete | 2026-06-29 |
| 21. Supply-Chain & Bin Hardening | v3.1.0 | 2/2 | Complete    | 2026-06-29 |
| 22. Core Versioning & Audit Filter | v3.1.0 | 2/2 | Complete    | 2026-06-30 |
| 23. Decoder Trailing-Edge Fix | v3.1.0 | 1/2 | In Progress|  |

## Backlog

Unsequenced items remaining after v3.0.1 promotion. Promote with `/gsd-review-backlog` when ready.

### Phase 999.5: TIER 2 streaming refactor of spawnTool — real-time MCP-driven copy progress (BACKLOG)

**Goal:** Phase 14-11 closed CLI silent operations at TIER 1 (three pre-operation stderr status lines). TIER 2 changes `spawnTool` from `spawnSync` with `stdio=['ignore','pipe','pipe']` to either inherited stdio (Option A) or async `spawn()` with line-streaming via `child.stdout('data')` (Option B). Surfaces robocopy/rsync per-line progress to the user during MCP-driven copy operations through the `/localground:migrate` skill.
**Source:** `.planning/phases/14-standalone-cli-and-claude-code-skills/14-11-SUMMARY.md`; full diagnosis at `.planning/debug/cli-silent-long-operations.md` lines 148-158
**Requirements:** CLI-05 (deferred to v3.2.0; see REQUIREMENTS.md `## Future Requirements`)
**Plans:** 0 plans
**Deferral note:** Architectural change with real risk surface; TIER 1 mitigation already shipped in Phase 14-11. Deferred from v3.1.0 to v3.2.0 on 2026-06-29.

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

### Phase 999.7: path-hash decode trailing-edge defect — PROMOTED to v3.1.0 (CORE-16, Phase 23)

**Status:** PROMOTED into v3.1.0 scope on 2026-06-29 as **CORE-16 → Phase 23: Decoder Trailing-Edge Fix**. No longer a backlog item; tracked under `## Phases (v3.1.0 -- Active)` above. Original diagnosis: CORE-13 special char at the trailing edge of an intermediate component still fails decode due to the trailing-hyphen-strip asymmetry in `buildCandidates`.

### Phase 999.8: multi-trailing-special-character decode — out of CORE-16 scope (BACKLOG)

**Goal:** Phase 23 (CORE-16) makes a SINGLE special char at the trailing edge of an intermediate path component round-trip, via the additive `encodedName + '--'` branch in `buildCandidates`. A component ending in TWO OR MORE special chars (e.g. `Foo&&/sub` → `...-Foo---sub`, three hyphens) is matched by neither the single-hyphen nor the double-hyphen prefix branch and still returns `no_candidates`. A general fix would try N consecutive separators (`encodedName + '-'.repeat(k)`, k ≥ 1), relying on the Phase-23 D-01 verify-then-return filter to reject the spurious interpretations the extra branching surfaces — explicitly beyond CORE-16's "a special character" (singular) scope and the locked L-01 `+ '--'` shape.
**Source:** Surfaced at Phase 23 plan time (cross-model stress test + orchestrator verbatim-port empirical probe, 2026-06-30); pinned as a passing documented boundary guard in `.planning/phases/23-decoder-trailing-edge-fix/23-02-PLAN.md` (Task 2 — asserts it stays `no_candidates`). Promotion lineage mirrors 999.7 → CORE-16.
**Requirements:** none yet (a new CORE-NN would be assigned on promotion).
**Active-environment impact:** Zero — same as the original CORE-16 defect; the user's live `~/.claude/projects/` contains no path-hashes of this shape (Phase 17 23-path-hash diagnostic). Decode of every real path the user touches is unaffected.
**Deferral note:** Document-and-guard chosen over a fix to preserve L-01/L-02 and CORE-16's single-char scope. Low priority; promote only if a real multi-trailing-special path-hash is observed in the wild.

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)

---
*Roadmap created: 2026-04-11*
*v3.0.0 phases added: 2026-04-12*
*v3.0.0 milestone closed: 2026-04-26*
*Backlog seeded at v3.0.0 close: 2026-04-26*
*v3.0.1 phases added: 2026-04-27 (promoted backlog 999.1, 999.2, 999.3, 999.4, 999.6 into Phases 16-20; 999.5 retained as backlog with deferral note)*
*v3.0.1 amendment: 2026-04-27 — added DOC-03 (per-package READMEs visible on npmjs.com) mapped to Phase 20*
*v3.0.1 milestone closed: 2026-06-29 — Phases 16-20 collapsed to archive; shipped to npm as v3.0.2 (SC5 fix-forward). Carry-forward to v3.1.0: seed toolkitVersion drift-proofing, MD-01 (SHA-pin actions), MD-02 (mcp --version parsing), CLI-05 (999.5).*
*v3.1.0 phases added: 2026-06-29 — Phases 21-23 (SEC-01 + CLI-06 → 21; BUILD-01 + CORE-15 → 22; CORE-16 → 23). 5/5 requirements mapped. Backlog 999.7 PROMOTED to CORE-16 (Phase 23); 999.5 retained as backlog with its requirement pointer corrected to CLI-05 → v3.2.0.*
*Backlog 999.8 added: 2026-06-30 — multi-trailing-special-character decode (out of CORE-16 scope); surfaced at Phase 23 plan time, guarded in 23-02-PLAN.md.*
