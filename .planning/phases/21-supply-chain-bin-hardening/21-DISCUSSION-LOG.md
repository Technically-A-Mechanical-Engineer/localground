# Phase 21: Supply-Chain & Bin Hardening - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-29
**Phase:** 21-supply-chain-bin-hardening
**Areas discussed:** Pin-verification posture, Dependabot cadence, Publish-job hardening scope
**Mode:** Advisor (USER-PROFILE.md present; non-technical-owner framing for CI/supply-chain domain), with a user-requested Codex adversarial cross-review before locking.

---

## Pin-verification posture (SEC-01 SC #1)

| Option | Description | Selected |
|--------|-------------|----------|
| Re-check every CI run | Recurring CI step verifies each pinned action resolves to its tag on every push; fails the build on a bad/floating pin | ✓ |
| Broader security scan | zizmor full workflow-security scan every push (pinning gaps + other CI risks) | |
| Verify once at pin time | Verify only when pinning, then rely on Dependabot | |

**First-round answer:** "stress test your recommendation with a codex review" (user deferred the pick pending cross-model review).

**Codex verdict (job `task-mqzjdb2l-5s0bti`):** AGREE-WITH-MODIFICATION. Recurring verify is the right SEC-01 gate. **BLOCKER:** use `pinact run --verify --check` (or `--fix=false`), not raw `pinact run --verify` — pinact v4 can auto-correct comments unless check mode is set, which would mutate instead of fail. pinact does real live tag→SHA resolution via the GitHub API (satisfies "SHA resolves to commented tag"). zizmor is better as a broader/scheduled scan with an explicit `impostor-commit` audit, not the primary every-push gate.

**Second-round answer (post-review):** **pinact --check only** — `pinact run --verify --check` on every push; zizmor not added (only two first-party GitHub actions → lowest impostor-commit risk). zizmor recorded as a deferred defense-in-depth idea.

---

## Dependabot cadence (SEC-01 SC #3)

| Option | Description | Selected |
|--------|-------------|----------|
| Weekly, one batched PR | github-actions ecosystem, weekly, grouped into a single PR | ✓ |
| Monthly, batched | Same grouping, monthly | |
| Immediate, per-action PRs | Separate PR per action update | |

**First-round answer:** "stress test your recommendation with a codex review" (deferred pending review).

**Codex verdict:** AGREE-WITH-MODIFICATION. Weekly+grouped is right for two actions, but it covers `uses:` refs only — **not** the `npm install -g npm@11.18.0` `run:` literal (needs a manual/scheduled maintenance control). Groups default to version-updates unless `applies-to: security-updates` is separately configured.

**Resolution:** weekly + grouped retained. Accept + document the npm-literal gap (runtime floor-assert guards correctness; a manual-bump note owns staleness). No separate security-updates group for this phase (repo-level security alerts fire independently).

---

## Publish-job hardening scope (Codex Q5 gap)

| Option | Description | Selected |
|--------|-------------|----------|
| Keep SEC-01 as scoped; defer split | Implement locked SEC-01; defer per-job least-privilege split, deployment environment, harden-runner | ✓ |
| Also split the publish job now | Refactor release.yml into build/test (no OIDC) + separate publish job (contents:read + id-token:write) | |

**User's choice:** Keep SEC-01 as scoped; defer the split. Rationale: a release.yml refactor risks the OIDC/provenance flow SC #4 requires stay intact, and Phase 21 is the foundation the later phases build on. No-new-surface milestone.

---

## Claude's Discretion

- Internal shape of the version-request predicate (inline vs `isVersionRequest(argv)` helper) — planner's call, given the CLI-06 contract holds.
- Exact wording/placement of the runtime floor-assert and the npm manual-bump note.

## Deferred Ideas

- Least-privilege publish-job split (separate OIDC-scoped publish job).
- GitHub deployment environment tied to the npm trusted publisher.
- zizmor scheduled workflow-security scan (`impostor-commit` + broader audit).
- harden-runner (egress control; adds a pinned third-party action).

All four: future hardening pass, out of scope for v3.1.0.

---

## CLI-06 note (no gray area)

CLI-06's `--version` behavior is fully specified by the Phase 21 success criteria (recognize `--version`/`--version=…`/`-v`/`-V`; stdout + exit 0; never boot transport; case-sensitive long form; no arg-parser; preserve the verify-tarball.mjs contract). No alternatives were discussed — captured directly as locked decisions D-12..D-14 in CONTEXT.md so the planner does not re-derive them.
