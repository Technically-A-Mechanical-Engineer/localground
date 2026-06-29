# Phase 20 Codex App Review

## Claim Check: npm Trusted Publisher "Allowed actions"

Verdict: CONFIRM.

The exact current npm field name is `Allowed actions (required)`. In the GitHub Actions trusted-publisher setup, npm docs list it with the instruction to select which actions the trusted publisher can perform: `npm publish`, `npm stage publish`, or both, and at least one must be selected. The same page also says trusted publisher configurations created before May 20, 2026 are automatically set to allow `npm publish` only, while configurations created after May 20, 2026 require explicitly selecting at least one allowed action.

Doc link: https://docs.npmjs.com/trusted-publishers/ (see "Configuring trusted publishing" -> "For GitHub Actions", especially the `Allowed actions (required)` field and the note immediately after the provider field lists).

Repo impact: 20-03 / D-03 is incomplete as written. The plan lists owner, repo, workflow filename, and blank environment only (`20-03-PLAN.md:127-132`). The same omission exists in D-03 context (`20-CONTEXT.md:24-26`). For this release, both `@localground/mcp` and `@localground/cli` should be configured with `Allowed actions: npm publish`. If one package is configured correctly and the other is not, the release can still enter the exact partial-publish state the phase is trying to prevent.

Severity: HIGH.

## Fresh Findings Missed By 20-REVIEWS.md

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

## Bottom Line

The prior review's `Allowed actions` warning is correct and should be promoted from "verify at npm UI" to a hard 20-03 acceptance criterion: both packages need `Allowed actions: npm publish`. Beyond that, the main missed release-risk is not the happy path; it is recovery after a partial publish. Before pushing `v3.0.1`, tighten 20-05 with a registry-state matrix and a package-specific recovery path, and tighten 20-04 so both publishable manifests are automatically checked for repository/license preservation.
