---
phase: 21
slug: supply-chain-bin-hardening
status: verified
threats_total: 14
threats_closed: 14
threats_open: 0
asvs_level: 2
created: 2026-06-29
updated: 2026-06-29
---

# Security Audit — Phase 21: Supply Chain & Bin Hardening

**Audit date:** 2026-06-29
**ASVS Level:** 2
**Phase:** 21 — supply-chain-bin-hardening
**Plans audited:** 21-01 (SEC-01 workflows), 21-02 (CLI-06 mcp bin)
**Threats closed:** 14/14
**Threats open:** 0

---

## Threat Verification

### SEC-01 Threats (21-01-PLAN.md)

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-21-01 | Tampering | mitigate | CLOSED | `.github/workflows/ci.yml:28,31` — `actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0` and `actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0`; same pins at `release.yml:19,22`. Both workflows: zero floating `@v4`/`@v6` refs remain. |
| T-21-02 | Spoofing/Tampering | mitigate | CLOSED | `ci.yml:58-64` — dedicated `verify-pins:` job (`runs-on: ubuntu-latest`, `shell: bash`) runs `pinact run --verify --check`. The verifier install is exact-pinned `pinact/v4/cmd/pinact@v4.1.0` (line 61). No `continue-on-error`, no `|| true`, no skipping `if:`. Live fail-closed execution is a CI-on-push obligation documented in 21-HUMAN-UAT.md per the verified environment constraint. |
| T-21-03 | EoP | accept | CLOSED | Acceptance rationale documented in `21-01-PLAN.md:338` (D-03 — only first-party actions, lowest impostor-commit risk, zizmor deferred as defense-in-depth). No implementation required. |
| T-21-04 | Tampering/Repudiation | mitigate | CLOSED | `release.yml:31` — `npm install -g npm@11.18.0` (exact pin, `npm@^11.5.1` absent). `release.yml:24` — `node-version: '22.14.0'` (anchored; `'22.x'` absent). `release.yml:34-44` — `ge()` function using `sort -V` numeric floor-assert; `::error::` + `exit 1` on sub-floor values. Lexical-trap vectors proven correct in 21-01-SUMMARY.md. |
| T-21-05 | InfoDisclosure/EoP | mitigate | CLOSED | `release.yml:10` — `id-token: write` present. `release.yml:25` — `package-manager-cache: false` present. `release.yml:69-76` — `--provenance` on all 4 publish invocations (2 dry-run + 2 real). Single `release:` job structure — no publish-job split introduced. |
| T-21-06 | Tampering | mitigate | CLOSED | `.github/dependabot.yml` — `version: 2`, `package-ecosystem: "github-actions"`, `directory: "/"`, `schedule.interval: "weekly"`, `groups.actions.patterns: ["*"]`. Both accepted gaps (run: literal not tracked, security-updates not grouped) documented in file header comments. |
| T-21-07 | Repudiation | accept | CLOSED | Acceptance rationale documented in `21-01-PLAN.md:342` (D-07). `release.yml:29-30` — visible `# MANUAL-BUMP: Dependabot does NOT track this run: literal...` comment present in the npm-upgrade step. Floor-assert (T-21-04) guards correctness against staleness. |
| T-21-12 | Tampering/EoP | mitigate | CLOSED | `ci.yml:61` — `pinact/v4/cmd/pinact@v4.1.0` (exact; not `@latest`). `ci.yml` — full file scan: no `continue-on-error`, no `|| true`, no `|| :`, no skipping `if:` on the verify step. Gate is fail-closed by construction. |
| T-21-13 | DoS (CI breakage) | mitigate | CLOSED | `ci.yml:51-64` — `verify-pins:` is a top-level sibling job (`runs-on: ubuntu-latest`), NOT inside the 3-OS `test` matrix (`os: [windows-latest, macos-latest, ubuntu-latest]`). Step declares `shell: bash`. The POSIX/Go pinact block runs in exactly one Ubuntu context. |

### CLI-06 Threats (21-02-PLAN.md)

| Threat ID | Category | Disposition | Status | Evidence |
|-----------|----------|-------------|--------|----------|
| T-21-08 | DoS | mitigate | CLOSED | `packages/mcp/src/index.ts:837-855` — `isVersionRequest()` helper matches `--version`, `--version=…`, `-v`, `-V`; `process.exit(0)` at line 855 before `new StdioServerTransport()` at line 858. |
| T-21-09 | Tampering (control-flow) | mitigate | CLOSED | `index.ts:840-843` — long-form uses `arg === '--version'` (byte-exact) and `arg.startsWith('--version=')` (with `=`), NOT bare `startsWith('--version')`. `--Version`/`--VERSION`/`--versions`/`--versioned` are not matched. Locked by `smoke.test.ts:217-226` — positive JSON-RPC handshake proof for all four fall-through flags. |
| T-21-10 | Supply-chain | mitigate | CLOSED | `index.ts` — grep confirms no `commander` or `yargs` import. Predicate is hand-rolled `argv.some(...)` at lines 838-844. Zero new parser dependencies added to the mcp package. |
| T-21-11 | Repudiation/Integrity | mitigate | CLOSED | `index.ts:854` — `process.stdout.write(\`${SERVER_VERSION}\n\`)` unchanged. `smoke.test.ts:196-211` — exit 0 + `stdout.trim() === expectedVersion` asserted for `--version`. `scripts/verify-tarball.mjs` was not modified (21-02-SUMMARY.md confirms `npm run verify:tarball` exits 0). |
| T-21-14 | Resource leak (test hygiene) | mitigate | CLOSED | `smoke.test.ts:176-193` — second `describe` block has its own `children: ChildProcess[]` + `afterEach` reaper. `smoke.test.ts:196-226` — ALL version-flag spawns (both match and fall-through) route through `trackedSpawnServer([flag])`, pushing into `children[]`. No untracked raw `spawn()` calls in the predicate block. |

---

## Unregistered Flags

**21-01-SUMMARY.md `## Threat Flags`:** No new security-relevant surface introduced beyond what the plan's threat model covers. The `verify-pins` job's GitHub API call is the intended behavior of T-21-02's mitigation. Maps to T-21-02 — informational.

**21-02-SUMMARY.md `## Threat Flags`:** None — no new network endpoints, auth paths, file access patterns, or schema changes introduced.

No unregistered flags require escalation.

---

## Accepted Risks Log

| Threat ID | Rationale | Documentation Location |
|-----------|-----------|------------------------|
| T-21-03 | Only first-party GitHub actions (checkout, setup-node) in play — lowest impostor-commit risk; zizmor deferred as defense-in-depth for a future phase. | `21-01-PLAN.md` threat register, D-03 decision |
| T-21-07 | `npm@11.18.0` run: literal not tracked by Dependabot (scans `uses:` refs only); manual-bump note in `release.yml` documents the obligation; numeric floor-assert guards against staleness crossing the OIDC floor. | `release.yml:29-30` MANUAL-BUMP comment; `21-01-PLAN.md` D-07 |

*Accepted risks do not resurface in future audit runs.*

---

## Forward Obligations (not open threats)

| Item | Obligation | Tracking |
|------|-----------|---------|
| D-11 / T-21-05 live attestation | SLSA-provenance attestation must be read back on the next actual tagged release via `gh attestation verify` — cannot be proven by dry-run. | 21-01-SUMMARY.md `## D-11 Closure Obligation`; 21-HUMAN-UAT.md |
| T-21-02 live fail-closed run | `pinact run --verify --check` execution against live GitHub API is a CI-on-push obligation; local Go/pinact not installed. | 21-01-SUMMARY.md `## Deviations from Plan`; 21-HUMAN-UAT.md |

---

## Review Cross-Reference

The code review in `21-REVIEW.md` (2026-06-29) independently confirmed: all 5 SHA pins are 40-char hex, the pinact gate is fail-closed (zero `continue-on-error`/`|| true`/skipping `if:`), the `ge()` floor-assert is numeric (`sort -V`) and passes lexical-trap vectors, OIDC posture is intact, and `isVersionRequest` is exact/case-sensitive with `process.exit(0)` before transport. The review found 0 BLOCKER findings. WR-02 (`decodeCopyToken` chunk-element shape gap) is a pre-existing defect not introduced by Phase 21 and is out of scope for this audit.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-29 | 14 | 14 | 0 | gsd-security-auditor (verify-all, State B from artifacts) |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-29
