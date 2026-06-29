---
phase: 20
reviewers: [codex, codex-app]
reviewed_at: 2026-06-29T04:13:39Z
plans_reviewed: [20-01-PLAN.md, 20-02-PLAN.md, 20-03-PLAN.md, 20-04-PLAN.md, 20-05-PLAN.md, 20-06-PLAN.md]
review_models:
  - "codex-cli 0.130.0 (GPT, service_tier=fast) — repo-grounded CLI pass"
  - "Codex app (deep pass) — confirmed the HIGH 'Allowed actions' claim + 3 fresh findings; raw record in 20-REVIEWS-codex-app.md"
note: "Two independent Codex passes (CLI + app). gemini/opencode/qwen/cursor/coderabbit not installed; claude skipped (review-independence). All findings below independently re-verified by the orchestrator against the actual plan/workflow files."
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

---

## Codex App Review (deep pass — claim verification + fresh findings)

*Independent second Codex pass. Raw record: `20-REVIEWS-codex-app.md`. Orchestrator re-verified every file:line citation below — all accurate.*


### Claim Check: npm Trusted Publisher "Allowed actions"

Verdict: CONFIRM.

The exact current npm field name is `Allowed actions (required)`. In the GitHub Actions trusted-publisher setup, npm docs list it with the instruction to select which actions the trusted publisher can perform: `npm publish`, `npm stage publish`, or both, and at least one must be selected. The same page also says trusted publisher configurations created before May 20, 2026 are automatically set to allow `npm publish` only, while configurations created after May 20, 2026 require explicitly selecting at least one allowed action.

Doc link: https://docs.npmjs.com/trusted-publishers/ (see "Configuring trusted publishing" -> "For GitHub Actions", especially the `Allowed actions (required)` field and the note immediately after the provider field lists).

Repo impact: 20-03 / D-03 is incomplete as written. The plan lists owner, repo, workflow filename, and blank environment only (`20-03-PLAN.md:127-132`). The same omission exists in D-03 context (`20-CONTEXT.md:24-26`). For this release, both `@localground/mcp` and `@localground/cli` should be configured with `Allowed actions: npm publish`. If one package is configured correctly and the other is not, the release can still enter the exact partial-publish state the phase is trying to prevent.

Severity: HIGH.

### Fresh Findings (missed by the CLI pass)

### Finding 1 - HIGH - Partial-publish recovery is internally inconsistent

20-05 / D-08 and D-01 still contain a dangerous recovery path. The plan says that if one package publishes and the other does not, the maintainer should "recover via a follow-up patch (3.0.2) for the failed package only if needed" (`20-05-PLAN.md:139`). It also says that if an OIDC-auth failure occurs, "nothing was published" and the run is retryable (`20-05-PLAN.md:140`).

That is not generally true in this workflow. The release publishes MCP first, then CLI (`release.yml:37-41` today; 20-02 preserves the same real-publish order after gates at `20-02-PLAN.md:160-165`). If `@localground/mcp@3.0.1` publishes and `@localground/cli@3.0.1` fails due to CLI-side trusted-publisher configuration, the failure is auth-related but something was published. Re-running the same workflow will hit the already-published MCP version before reaching CLI.

The "3.0.2 for the failed package only" instruction is also incompatible with D-07. 20-02's preflight requires MCP and CLI versions to match (`20-02-PLAN.md:144-155`). A CLI-only 3.0.2 recovery cannot pass the planned release workflow without changing the workflow or bypassing the preflight, and it leaves package version skew in a toolkit that is otherwise planned as a paired release.

Correct recovery matrix before tag push:

- If neither package is live: fix npm trusted-publisher config and rerun the same tag workflow; token fallback can be used only after wiring `NODE_AUTH_TOKEN`.
- If MCP is live and CLI is not, and the CLI artifact is otherwise correct: publish the missing `@localground/cli@3.0.1` through a controlled one-package path after fixing auth/config; do not try to republish MCP.
- If the failed package needs content changes: bump both publishable packages to 3.0.2, publish both, and consider deprecating any orphaned 3.0.1 package version.

npm policy mechanism: registry data is immutable; once a package/version has been used, that version cannot be reused even if unpublished. Source: https://docs.npmjs.com/policies/unpublish/.

### Finding 2 - MEDIUM - No explicit registry-state preflight before the irreversible tag

20-02 adds a tag/version preflight, but it only checks local package versions against `GITHUB_REF_NAME` and each other (`20-02-PLAN.md:144-155`). 20-05 checks `npm view @localground/mcp@3.0.1 version` and `npm view @localground/cli@3.0.1 version` only after the release run (`20-05-PLAN.md:136-141`). There is no pre-tag or pre-publish registry-state matrix that asserts both 3.0.1 versions are absent before the first tag push.

Mechanism: if either package version already exists before the tag, or exists after a failed partial run, the planned workflow cannot reason safely about retry. With the current ordered publishes, an already-live MCP version blocks the workflow before the CLI publish is attempted (`release.yml:37-41`). This matters especially because 20-05 already acknowledges npm's non-transactional publish behavior (`20-05-PLAN.md:159-170`).

Add a required pre-tag check in 20-05 before `git push origin v3.0.1`:

```bash
npm view @localground/mcp@3.0.1 version
npm view @localground/cli@3.0.1 version
```

Expected before first tag: both commands fail with no such version. After any failed release run, repeat the same matrix and choose recovery based on which package versions are live.

### Finding 3 - MEDIUM - 20-04 does not verify CLI repository/license preservation

20-04 / D-06 says the version bump must preserve the repository/license fields added by 20-01 (`20-04-PLAN.md:18-20`, `20-04-PLAN.md:83-88`). But the automated verification only checks `packages/mcp/package.json` for preserved repository URL and license (`20-04-PLAN.md:101`), and the acceptance criteria only mention MCP preservation (`20-04-PLAN.md:110`).

This is too weak because D-04 is explicitly per-package. 20-01 requires repository/license on both MCP and CLI (`20-01-PLAN.md:15-18`, `20-01-PLAN.md:120-148`). The actual current CLI manifest lacks `repository` and `license` today (`packages/cli/package.json:1-34`), and the current MCP manifest does too (`packages/mcp/package.json:1-34`), so these fields are newly introduced and easy to clobber during the version edit.

Why this can become partial: if CLI repository metadata is lost in 20-04 and the manual tag-content check in 20-05 is missed or misread, MCP can publish first and CLI can fail on npm's repository-match requirement. npm's trusted-publishing docs state the package `repository.url` must exactly match the GitHub repository for GitHub publishes: https://docs.npmjs.com/trusted-publishers/.

Fix: extend the 20-04 verification to assert repository URL, `repository.directory`, and `license: "MIT"` for both `packages/mcp/package.json` and `packages/cli/package.json`.

### Bottom Line (Codex app)

The prior review's `Allowed actions` warning is correct and should be promoted from "verify at npm UI" to a hard 20-03 acceptance criterion: both packages need `Allowed actions: npm publish`. Beyond that, the main missed release-risk is not the happy path; it is recovery after a partial publish. Before pushing `v3.0.1`, tighten 20-05 with a registry-state matrix and a package-specific recovery path, and tighten 20-04 so both publishable manifests are automatically checked for repository/license preservation.

---

## Consensus Summary (reconciled across both Codex passes + orchestrator verification)

Two independent Codex passes. The CLI pass found the "Allowed actions" gap but could not verify it; the app pass **confirmed it** (exact npm field name + doc) and surfaced a deeper partial-publish-recovery landmine the CLI pass missed. Every finding below was re-verified by the orchestrator against the actual files (status: ✅ confirmed via file read · ⚠ external-doc claim, verify at point-of-use).

### Consolidated actionable findings (ranked)

| # | Sev | Finding | Source | Status | Fix |
|---|-----|---------|--------|--------|-----|
| H1 | **HIGH** | D-03/20-03 trusted-publisher config omits npm's `Allowed actions (required)` field; both packages need `Allowed actions: npm publish` | CLI flagged + **app confirmed** (exact field name, doc, May-20-2026 cutoff) | ✅ doc-confirmed by app pass | Add "Allowed actions: npm publish" to BOTH packages + make it a hard 20-03 acceptance criterion |
| H2 | **HIGH** | 20-05 partial-publish recovery is internally inconsistent: "3.0.2 for the failed package only" (line 139) conflicts with D-07's matched-version preflight; "auth failure = nothing published" (line 140) is false given MCP-then-CLI ordered publish | app pass | ✅ confirmed (release.yml:37-41 ordered; 20-05:139-140; 20-02 preflight requires mcp==cli) | Replace with the correct recovery matrix: (a) neither live → fix config/token + rerun same tag; (b) MCP live, CLI not → publish only the missing CLI after fixing auth, never republish MCP; (c) content change needed → bump BOTH to 3.0.2 |
| M1 | MED | `npm publish --dry-run` validates pack/manifest only — NOT OIDC/auth | CLI pass | ✅ valid | Reword 20-02/20-05 so a green dry-run is not treated as auth proof |
| M2 | MED | D-01 token fallback incomplete: release.yml has no `NODE_AUTH_TOKEN` wiring, so adding a secret alone won't rescue a failed OIDC run | CLI pass | ✅ confirmed (release.yml:37-41) | Document the workflow patch (`env: NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}`) + a written no-publish-confirmed runbook in 20-05 (ties to H2) |
| M3 | MED | No pre-TAG registry-state check; 20-05 only runs `npm view` AFTER the run, so a retry after a partial failure can't reason about state | app pass | ✅ confirmed (20-05:136-141) | Add a required pre-tag matrix before `git push origin v3.0.1`: `npm view @localground/mcp@3.0.1 version` + cli — both must report "no such version" |
| M4 | MED | 20-04 verify/acceptance checks only the MCP manifest's repository/license preservation, not the CLI manifest — D-04 is per-package, bump can clobber CLI silently | app pass | ✅ confirmed (20-04 `<automated>` + acceptance assert mcp only) | Extend 20-04 verify to assert repository.url + repository.directory + license:"MIT" for BOTH packages |
| O1 | MED (owner) | Catch-up push publishes the full `.planning/` history (7→95 files, 61 commits); D-10's "gitignored = private" is false for tracked files | CLI pass | ✅ confirmed via git | OWNER DECISION (not a plan mechanic): accept publishing process docs, or untrack `.planning/` + disable GSD commit_docs before 20-03 |
| L1 | LOW | Local `v3.0.0` tag exists (not on remote) — never `git push --tags`/`--follow-tags` before the deliberate v3.0.1 | CLI pass | ✅ confirmed (20-03 already uses plain push) | Make the no-`--tags` constraint explicit in 20-03 |

### Agreed strengths (both passes)
D-04 repository-field handling (20-01 adds case-exact URL + directory); D-02 scoping (release→Node22, CI stays 20); the core irreversible-publish sequence (push/CI → bump → CI-on-bump → tag-content `git show` → tag push); DOC-03 README readiness; lockfile-drift fix (20-04).

### Divergent / corrected views
- The CLI pass listed 20-04's field-preservation as a *strength* ("verifies the fields survive"). The app pass corrected this: 20-04 verifies **MCP only**, not CLI (M4). Treat M4 as the accurate read.
- No genuine disagreements between the two passes — the app pass strictly extends and tightens the CLI pass.

### Orchestrator recommendation
H1, H2, M1, M2, M3, M4, L1 are all surgical plan/wording fixes → fold into the plans with `/gsd-plan-phase 20 --reviews` (reads this file). The two HIGH findings (Allowed-actions + recovery matrix) are the must-fix items before the irreversible publish. O1 is a separate one-time owner disclosure decision to resolve before executing 20-03.
