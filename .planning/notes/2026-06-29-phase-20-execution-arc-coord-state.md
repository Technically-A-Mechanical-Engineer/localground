# v3.0.1 Phase 20 (execution arc) COORDINATOR State Snapshot

**Date:** 2026-06-29
**Branch:** master (HEAD `ed596c4`, 1 ahead of origin/master `2a9034e`; published tag v3.0.1 → `2a9034e` is on remote)
**Context threshold reached at:** ~84% (Tier 2: >70% + natural break + substantial work remaining)
**Strategic natural break:** Wave 4 (the irreversible OIDC publish) closed SUCCESSFULLY — v3.0.1 live on npm; 20-05 SUMMARY/STATE/PIPELINE-LOG committed. Wave 5 + phase close remain.

## §1 Current arc state
- **Workflow position:** Phase 20 (Release Pipeline Validation), `/gsd-execute-phase 20`. **5 of 6 plans complete.** Wave 4 (20-05) just published v3.0.1. Next: Wave 5 (20-06 post-publish verification) → phase-close steps.
- **Branch state:** master. HEAD `ed596c4` (docs(20-05)) — local-only, 1 ahead of origin. The PUBLISHED tag `v3.0.1` (annotated obj `e3efe8e`) → commit `2a9034e`, already on remote. origin/master = `2a9034e`.
- **Last commit SHA:** `ed596c4`. Key SHAs: tag target `2a9034e` (npm-upgrade fix); recovery chain `d531c2b` (build:check fix) → `8fe734e` (setup-node v6) → `de99207` (drop registry-url) → `2a9034e` (npm@^11.5.1 — the fix). Final release run `28354644986`. Wave-1/3 executor commits: 20-01 `4fe24e5`/`131ad32`/`064b821`, 20-02 `e47ad02`/`f469174`, 20-04 `4818cfb`.

## §2 Locked decisions / ratifications summary
- **v3.0.1 PUBLISHED (PIPE-02 / SC2 DONE):** `npm view @localground/mcp@3.0.1` = 3.0.1, `@localground/cli@3.0.1` = 3.0.1, dist-tags `latest` = 3.0.1 for both. Published via PURE OIDC + provenance (D-01; no token fallback used).
- **Waves 1-4 complete:** 20-01 (manifests repository+license, E422 fix) ✓, 20-02 (release.yml OIDC hardening) ✓, 20-03 (push + 3-OS CI green PIPE-01/SC1 + trusted-publisher verified D-03/H1) ✓, 20-04 (5 manifests→3.0.1 + lockfile D-06) ✓, 20-05 (tag + OIDC publish) ✓.
- All 13 CONTEXT decisions (D-01..D-13) + 7 cross-AI review findings (H1/H2/M1-M4/L1) honored. Canonical record: `.planning/phases/20-release-pipeline-validation/20-PIPELINE-LOG.md` (full Task 1/2/3 + 4-attempt publish story).
- Trusted publisher was PRE-CONFIGURED from v3.0.0 (verified, not created): both packages release.yml + Allowed actions: npm publish.

## §3 EXECUTOR paste-block (verbatim — sent via user-relay)
N/A — COORDINATOR-driven GSD execution. Wave 1 (20-01) + Wave 1 (20-02) + Wave 3 (20-04) ran via `gsd-executor` subagents (model sonnet, sequential — worktrees disabled on Windows). Waves 2 (20-03) and 4 (20-05) ran INLINE (orchestrator) because they are operational/human-gated (push, npm web-UI, irreversible publish). No relayed paste-block.

## §4 REVIEWER state + invocation calibration
- **Planning arc (closed):** gsd-plan-checker PASSED ×2; cross-AI Codex review (2 passes) → 7 findings folded in. (See `2026-06-29-phase-20-plan-review-arc-coord-state.md`.)
- **Execution "reviewers" still PENDING (run during phase close):** `gsd-code-review` (code_review_gate — advisory, non-blocking) + `gsd-verifier` (verify_phase_goal → 20-VERIFICATION.md). Neither invoked yet. config: code_review=true, security_enforcement=true (no SECURITY.md yet → will surface a "run /gsd-secure-phase" advisory at aggregate).

## §5 Carry-forward calibration (error patterns + lessons from THIS execution arc)
- **build:check dist-clobber (d531c2b):** ci.yml ran build (tsup→bundled dist) → build:check (`tsc --build`, EMITS unbundled JS into the same dist because root tsconfig is composite+declaration+outDir:./dist) → verify-tarball packed the clobbered dist → ERR_MODULE_NOT_FOUND @localground/core. Masked locally by .tsbuildinfo incremental caching; first surfaced on CI's clean checkout. Fix: build:check → flat non-emit `tsc --noEmit -p packages/{core,mcp,cli}/tsconfig.json` (+ tsconfig.test.json). release.yml has no build:check so the published artifact path was never affected.
- **npm OIDC version floor (2a9034e) — the big one:** Node 22.x bundles **npm 10.9.x** (verified: node 22.18 bundled npm = 10.9.3), BELOW npm's OIDC trusted-publishing floor of **11.5.1**. npm 10.9 never attempts OIDC. **D-02's premise "Node 22.x ships npm ≥11.5.1" is FALSE.** 4-attempt recovery: v4→E404, v6→E404 (placeholder token persists), drop registry-url→ENEEDAUTH (no token, still no OIDC), `npm install -g npm@^11.5.1`→SUCCESS. The ENEEDAUTH (attempt 3) was the decisive diagnostic (no token + no OIDC attempt = version floor).
- **setup-node registry-url placeholder token:** registry-url (v4 AND v6) makes setup-node write `.npmrc` `_authToken=${NODE_AUTH_TOKEN}` + inject placeholder `XXXXX-XXXXX-XXXXX-XXXXX` → npm uses bad token auth. Removed registry-url; npmjs.org is npm's default.
- **Git-Bash colon-mangling:** `git show <ref>:<path>` mangles on Windows Git Bash — use `git ls-tree <ref> <path>` → blob → `git cat-file -p <blob>` for tag-content verification.
- **Re-tagging is safe when nothing published (branch a):** moved v3.0.1 across 4 commits with zero registry risk because `npm view` confirmed both absent before each push (M3 pre-tag matrix held).
- **.planning gitignored-but-tracked:** new files need `git add -f`; modifications plain `git add`. Local doc commits ride with future pushes.

## §6 Resumption flow + forward work

### Resumption checklist (post-compaction)
1. Read this snapshot.
2. Read `.planning/STATE.md` (Current Position = Plan 5 of 6, v3.0.1 published).
3. Read `.planning/phases/20-release-pipeline-validation/20-PIPELINE-LOG.md` (full publish story — needed if any Wave-5 check surprises).
4. Read `.planning/phases/20-release-pipeline-validation/20-06-PLAN.md` (the only remaining plan).
5. Re-read the execute-phase close steps in `~/.claude/get-shit-done/workflows/execute-phase.md` (lines ~1116-1674): code_review_gate → regression_gate → verify_phase_goal → update_roadmap → update_project_md → offer_next.

### Open task stubs
- [ ] **Wave 5 — 20-06 (NON-autonomous, post-publish verification, no code changes):** provenance badge on both npm pages (SC3), README renders on both npm pages (SC4/DOC-03), `npx -y @localground/cli@3.0.1 --version` smoke (SC5), single documented `claude mcp add` check (D-12). Most are owner-side (look at npmjs.com pages); npx is a command. Write 20-06-SUMMARY.md, update STATE/ROADMAP.
- [ ] **Phase close:** code_review_gate (`gsd-code-review 20`, advisory) → regression_gate (`npm test`) → verify_phase_goal (`gsd-verifier` → 20-VERIFICATION.md; D-09 augment-not-overwrite if VERIFICATION pre-exists) → update_roadmap (`gsd-sdk query phase.complete 20`) → update_project_md → offer_next. Security gate: no SECURITY.md → expect advisory to run /gsd-secure-phase (optional).
- [ ] Consider: push local doc commits to origin at some point (HEAD ed596c4 is 1 ahead; published tag already on remote so not urgent).
- [ ] Capture-candidate (per CLAUDE.md): the npm-OIDC-floor lesson + build:check-clobber lesson are reusable — propose as memory/Open-Brain captures at phase close (N=1 each; don't over-generalize per advisor rule).

### Forward work map (order)
1. Wave 5 (20-06) — verification only; v3.0.1 already live so all checks should pass. Present human-side checks to user (npm pages), run npx smoke + mcp-add myself or guide user.
2. Phase-close steps in sequence (above). Milestone v3.0.1 CLOSE after verify passes.
3. Task tracker: #1-5 complete, #6 (Wave 5) pending, #7 (close) pending.

### Compaction trigger guidance for future-coord-self
- Next natural break: after Wave 5 verification closes (before phase-close subagents), or after verify_phase_goal returns. Phase close is mostly subagent spawns (fresh context) + light edits, so it should fit without another compact.

---

### Recovery-checklist coverage (post-compact-resume's 6 dimensions)
1. **Commit SHAs:** ✓ §1 (HEAD ed596c4, tag→2a9034e, recovery d531c2b/8fe734e/de99207/2a9034e, run 28354644986, origin 2a9034e).
2. **REVIEWER verdicts:** ✓ §4 (plan-checker ×2 done; code-review + verifier PENDING in close).
3. **Drift + corrections:** ✓ §5 (build:check clobber, npm OIDC floor, registry-url placeholder, colon-mangling, re-tag safety).
4. **Task tracker mid-state:** ✓ §6 (tasks 1-5 done; 6 Wave-5 + 7 close pending).
5. **Files to re-read:** ✓ §6 checklist (STATE, PIPELINE-LOG, 20-06-PLAN, execute-phase close steps).
6. **Next-action sequence:** ✓ §6 forward work map (Wave 5 → close steps in order).
