---
phase: 20
reviewers: [codex]
reviewed_at: 2026-06-29T03:57:52Z
plans_reviewed: [20-01-PLAN.md, 20-02-PLAN.md, 20-03-PLAN.md, 20-04-PLAN.md, 20-05-PLAN.md, 20-06-PLAN.md]
review_model: "codex-cli 0.130.0 (GPT, service_tier=fast)"
note: "Only Codex was available as an independent reviewer. gemini/opencode/qwen/cursor/coderabbit not installed; claude skipped (running inside Claude Code, review-independence)."
---

# Cross-AI Plan Review — Phase 20 (Release Pipeline Validation)

## Codex Review

*Repo-grounded review by codex-cli 0.130.0 (GPT). Codex read the actual workflow/manifest/README/lockfile files and cited file:line.*

**Summary**  
These plans are structurally sound and, executed in order, should satisfy the phase goal and all 5 success criteria. The sequencing is the main strength: manifest hardening, release workflow hardening, CI-green before bump, CI-green again on the exact tag target, tag-content verification, then publish and post-publish checks. I see two real gaps to fix before execution: npm Trusted Publisher setup now has a required “Allowed actions” choice, and the plans overstate what `npm publish --dry-run` can prove about OIDC/auth.

**Strengths**

- D-04 is handled correctly. Current published manifests have no `repository` or `license` fields (`packages/mcp/package.json:2-17`, `packages/cli/package.json:2-17`), and 20-01 adds the exact case-sensitive repo URL plus per-package `directory`. 20-04 explicitly verifies the fields survive the version bump.
- D-02 is correctly scoped. Current `release.yml` is still Node 20 with npm cache (`.github/workflows/release.yml:21-26`); 20-02 moves only release to Node 22 and leaves CI on Node 20 (`.github/workflows/ci.yml:20-24`, `.github/workflows/ci.yml:33-34`). npm docs currently require npm CLI 11.5.1+ and Node 22.14.0+ for trusted publishing.
- The irreversible-publish sequence is well designed: 20-03 push/CI first, 20-04 bump, 20-05 CI-green on the bump commit, annotated tag, `git show v3.0.1:packages/{mcp,cli}/package.json`, then tag push.
- README/DOC-03 preparation matches reality. MCP README has install, Windows `cmd /c npx`, tools table, MIT (`packages/mcp/README.md:7-16`, `packages/mcp/README.md:23`, `packages/mcp/README.md:76-78`); CLI README has install/commands/MIT (`packages/cli/README.md:7-15`, `packages/cli/README.md:104-106`).
- Lockfile drift is real and 20-04 addresses it. Root/package workspaces are still 3.0.0 in `package-lock.json` (`package-lock.json:2-9`, `package-lock.json:3160-3193`) while `.claude-plugin/plugin.json` is already 3.0.1 (`.claude-plugin/plugin.json:4`).

**Concerns**

- **HIGH — 20-03 / D-03 misses the required Trusted Publisher “Allowed actions” field.** Current npm docs say GitHub trusted-publisher setup requires selecting allowed actions, and configs created after May 20, 2026 must explicitly allow at least one action. The plan lists owner/repo/workflow/environment only. If one package is accidentally stage-only or not allowed for `npm publish`, the release can fail at publish time; if MCP succeeds and CLI fails, that is the partial-publish state the plan is trying to avoid.
- **MEDIUM — 20-02 / D-08 overclaims dry-run coverage for auth/OIDC.** `npm publish --dry-run` is useful for pack/manifest/file-list validation, but npm docs describe it as “no changes” reporting, while Trusted Publisher docs say config errors appear when you attempt to publish and npm does not verify the config when saved. Treat dry-run-both as a pack/manifest guard, not an auth guard.
- **MEDIUM — D-01 fallback is operationally incomplete.** 20-05 says add a granular token as `NODE_AUTH_TOKEN` and re-run if OIDC fails. The workflow does not reference `NODE_AUTH_TOKEN` today (`.github/workflows/release.yml:37-41`), so merely adding a repo secret will not change the failed tag run. A token fallback requires a workflow patch/env wiring and a clear retag/retry strategy if nothing was published.
- **LOW — repo-state privacy/framing is partly wrong.** The catch-up framing is correct: local `master` is ahead of `origin/master` by 79, and `origin/master` is at `8b1eea2`. But `.planning/` is not purely private in history: recent local commits already include `.planning/STATE.md`, `.planning/ROADMAP.md`, and Phase 20 plans, despite `.gitignore` ignoring `.planning/` (`.gitignore:10`). A plain catch-up push will publish already-tracked planning commits.
- **LOW — local `v3.0.0` tag exists.** The plan uses `git push origin master`, so it will not push tags. Still, because local `v3.0.0` exists, execution instructions should explicitly avoid `--tags` or `--follow-tags` before `v3.0.1`.

**Suggestions**

- Update 20-03 D-03 instructions: for both packages, set Trusted Publisher allowed action to `npm publish`; acceptance criteria should explicitly verify `Allowed actions: npm publish`.
- Reword 20-02/20-05: dry-run-both catches tarball/manifest/package errors before real publish; it does not prove OIDC config or per-package publish authorization.
- Add a fallback runbook under 20-05: if OIDC fails before any package publishes, first fix npm trusted-publisher config and rerun the same tag workflow; only if using token fallback, patch `release.yml` with `env: NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` and retag/retry according to a written no-publish-confirmed procedure.
- Add an explicit pre-push check in 20-03: `git status --porcelain` must show only expected files, and do not use `git push --tags` or `git push --follow-tags`.
- Decide intentionally whether `.planning/` history is acceptable to publish. If not, D-10’s “push existing history as-is” decision needs revisiting before the catch-up push.

**Risk Assessment**  
Overall: **MEDIUM**. The core release path is well sequenced and likely to work once the manifest/workflow edits land. The remaining risk is concentrated in npm’s external trusted-publisher configuration and recovery behavior, not in the repo code. Fix the “Allowed actions” omission and stop treating dry-run as an auth proof; then the plan set drops close to LOW risk.

Sources checked: local repo files cited above; npm Trusted Publishing docs and npm publish docs at `docs.npmjs.com`.

---

## Consensus Summary

**Single independent reviewer this run (Codex / GPT).** No second external CLI was installed, so "consensus" = Codex's findings, triaged below by the orchestrator with a verification status on each (✅ independently confirmed via git/file read · ⚠ asserted by Codex, verify at point-of-use).

### Actionable Concerns (ranked)

1. **[HIGH · ⚠ verify at npm UI] Trusted Publisher "Allowed actions" field (20-03 / D-03).** Codex asserts npm's GitHub trusted-publisher setup now requires selecting allowed actions (and that configs created after ~2026-05-20 must explicitly allow ≥1 action). The plan's D-03 acceptance criteria list only owner/repo/workflow/environment. *Not independently verified — confirm against the live npmjs.com UI during 20-03 Task 3.* If real: add "Allowed actions: npm publish" to the per-package config AND to the acceptance criteria. A mis-set allowed-action is exactly the partial-publish failure mode the phase guards against.

2. **[MEDIUM · ✅ valid framing] `npm publish --dry-run` is NOT an auth/OIDC guard (20-02 / 20-05 / D-08).** Dry-run validates pack/manifest/file-list only; trusted-publisher config errors only surface at real publish time (npm does not verify the config when saved). Reword the dry-run-both rationale so the executor does not treat a green dry-run as proof OIDC will authenticate.

3. **[MEDIUM · ✅ valid] D-01 token fallback is operationally incomplete (20-05).** `release.yml` does not reference `NODE_AUTH_TOKEN` today (release.yml:37-41), so merely adding a repo secret will NOT rescue a failed OIDC tag run — it requires a workflow patch (`env: NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`) plus a written "if nothing published, fix-config-and-rerun-same-tag vs. token-path-and-retag" runbook. Add the runbook to 20-05.

4. **[MEDIUM-for-owner · ✅ CONFIRMED] The catch-up push publishes the entire `.planning/` history (D-10).** CONTEXT/D-10 says "`.planning/` is gitignored so only source commits go public" — that is FALSE for already-TRACKED files. Verified: 95 `.planning/` files are tracked; `origin/master` already exposes 7 (v3.0.0-era); **61 of the 78 unpushed commits touch `.planning/`**, so `git push origin master` grows the public `.planning/` footprint from 7 → 95 files (all v3.0.1 phase plans, contexts, debug sessions, notes incl. the Codex-review note, comprehension artifacts). This is IRREVERSIBLE once on public GitHub. **Owner decision required before 20-03:** accept publishing planning history, OR scrub/`git rm --cached` the `.planning/` paths (history-rewrite) before the push. Not a blocker for the pipeline mechanics; it is a disclosure-intent decision.

5. **[LOW · ✅ CONFIRMED] Local `v3.0.0` tag exists; do not push tags during the catch-up (20-03).** A local `v3.0.0` tag exists and is not on the remote. 20-03 already uses plain `git push origin master` (no `--tags`), which is correct — make it explicit: never `git push --tags` / `--follow-tags` before the deliberate `v3.0.1` tag push in 20-05.

### Agreed Strengths (Codex)
- D-04 repository-field handling correct (20-01 adds case-exact URL + `directory`; 20-04 verifies survival of the bump).
- D-02 correctly scoped (only release job → Node 22; CI stays Node 20).
- Irreversible-publish sequence well designed (push/CI → bump → CI-on-bump → tag-content `git show` → tag push).
- DOC-03 README readiness matches reality (install + Windows `cmd /c npx` + MIT present in both).
- Lockfile drift real and addressed by 20-04.

### Divergent Views
None — single reviewer. Codex's overall risk rating: **MEDIUM**, dropping toward LOW once concerns #1 and #2 are addressed.

### Orchestrator note
Concerns #1, #2, #3, #5 are surgical plan/wording fixes — fold them in via `/gsd-plan-phase 20 --reviews`. Concern #4 is a one-time owner disclosure decision that does not change the pipeline mechanics; resolve it before executing 20-03.
