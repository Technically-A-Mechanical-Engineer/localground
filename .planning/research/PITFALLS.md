# Pitfalls Research

**Domain:** v3.1.0 "Hardening and Hygiene" — drift-proof versioning, supply-chain hardening, two decoder/audit correctness fixes on the LocalGround monorepo (`@localground/core` bundled into `@localground/mcp` + `@localground/cli`)
**Researched:** 2026-06-29
**Confidence:** HIGH (codebase read directly; supply-chain guidance verified against current sources)

> Scope note: these are pitfalls of making **these five specific changes to this specific codebase**, not generic hardening advice. Each carries the **owning item/phase** that should hold the guard. The four named regression risks the synthesizer asked me to flag — **D-01 (CORE-15)**, **targeted-not-catch-all regex (CORE-16)**, **version-drift recurrence (BUILD-01)**, **OIDC-floor (SEC-01)** — are each called out explicitly below.

---

## Critical Pitfalls

### Pitfall 1: BUILD-01 — Seed `toolkitVersion` reintroduces the exact drift class v3.0.1 just fixed

**What goes wrong:**
`packages/core/src/operations/seed.ts:139` hardcodes `toolkitVersion: '3.0.2'`. The naive "fix" copies the bin pattern — `JSON.parse(readFileSync(new URL('../package.json', import.meta.url)))` — into `seed.ts`. **This breaks in a way the bins do not**, because `seed.ts` lives in `@localground/core`, and core is bundled (`noExternal: ['@localground/core']`, both tsup configs) **into two different consuming packages**. After tsup inlines core's source into `packages/mcp/dist/index.js` and `packages/cli/dist/index.js`, `import.meta.url` resolves to the **consumer's** `dist/index.js`, so `../package.json` reads **mcp's or cli's** manifest — not core's. Worse, `@localground/core` is workspace-internal with **no published version of its own that matters** and **no bin**, so there is no single correct `package.json` for it to read.

**Why it happens:**
The bins (`mcp/src/index.ts:19`, `cli/src/index.ts:15`) read `../package.json` correctly **only because they are the bundle entry point** — `import.meta.url` for the entry file resolves next to the shipped `package.json`. Copying that idiom into a *library* file that gets inlined into someone else's bundle silently changes what `../` means. The author sees "I derived it from package.json, same as the bins" and assumes parity.

**How to avoid:**
Do **not** read a file from inside bundled core. Use tsup's build-time `define` (or `env`) to inject the version as a compile-time constant in **each consuming package's** tsup config, and have core read it from a parameter or a small injected constant — i.e., make `toolkitVersion` a value the **caller** (mcp/cli, who know their own version) passes into `seed()`, OR a build-time-replaced literal. The cleanest, lowest-regression option for this codebase: **pass `toolkitVersion` into `seed()` as an argument**, sourced by each bin from the version it already derives at `mcp/src/index.ts:19` / `cli/src/index.ts:17`. Core stays pure and bundle-agnostic; the value originates where the manifest actually lives.

If `define` is used instead, wire it in **both** `packages/mcp/tsup.config.ts` and `packages/cli/tsup.config.ts` (a stale `define` value bakes a wrong literal that no test catches unless asserted).

**Warning signs:**
- `seed.ts` contains `import.meta.url` or `readFileSync(... package.json ...)`.
- The seed manifest's `toolkitVersion` equals mcp's version when invoked via mcp but cli's version when invoked via cli (or vice versa) — same input, two answers.
- `verify-tarball.mjs` passes (it only checks `--version`, never the seed manifest) while the seeded manifest carries a stale or wrong version.

**Phase to address:** **BUILD-01.** Add a test asserting `seed()`'s emitted `toolkitVersion` equals the package version — and extend `verify-tarball.mjs` (or a new core test) so the **seed path** gets the same value-equality gate the bins got in v3.0.1. The v3.0.1 lesson ("derive, don't duplicate; assert value not shape") applies verbatim; the gate that caught the 3.0.1 misreport does **not** currently cover seed.

---

### Pitfall 2: CORE-15 — Reintroducing a marker requirement and regressing D-01

**What goes wrong:**
The instinctive fix to "stop scanning all of `C:\Users\…`" is to require `.git/` or `package.json` to exist before treating a decoded path as a project. **This directly regresses D-01** ("Path-shape-only `looksLikeProject` predicate — No `.git`/`package.json` marker check. Supports plain-folder projects"). A plain-folder project (the toolkit's own originating use case — a OneDrive folder with no git) would silently drop out of audit auto-discovery.

**Why it happens:**
"Filter out non-projects" reads as "detect real projects," and the obvious signal for "real project" is a marker file. The current predicate (`looksLikeProject.ts`) is *already* shape-only and *already* rejects root + home + shallow paths (≥2 segments below home or root). The temptation under CORE-15 is to make it "smarter" by adding markers — exactly the wrong direction.

**How to avoid:**
CORE-15 is a **depth/shape tightening**, not a content check. Keep `looksLikeProject` marker-free. If `C:\Users\…` roots are still surfacing, the bug is **upstream of the predicate**, not in it: the predicate already rejects home and 1-below-home. Re-read the symptom — the live defect (`audit-includes-root-paths`) likely means decoded **home/Users-level path-hashes** are reaching the scan because the predicate's `isUnder(home)` branch or the segment count isn't catching a specific shape (e.g. `C:\Users` itself, or `C:\Users\<otheruser>` which is 1-below the `Users` dir but not under *this* home). Fix the **shape logic** (add an explicit reject for the `Users`/`/home` container dir and for paths that are siblings of home), and add fixtures for those exact shapes. Never add `fs.existsSync('.git')`.

**Warning signs:**
- A diff to `looksLikeProject.ts` (or the audit handler) that adds `fs.access`, `existsSync`, `.git`, or `package.json`.
- A plain-folder fixture (no `.git`, no `package.json`, e.g. `C:\Users\bob\Projects\plain-notes`) stops being auto-discovered.
- The fix lands in `packages/mcp/src/index.ts:721` (`.filter(looksLikeProject)`) or `packages/cli` audit **only**, not in the shared `looksLikeProject.ts`.

**Phase to address:** **CORE-15.** The fix MUST land in `packages/core/src/environment/looksLikeProject.ts` so both surfaces inherit it. Add a regression test that asserts a marker-less plain folder ≥2 below home still returns `true`, AND that `C:\Users`, `C:\Users\<other>`, and home itself return `false`.

---

### Pitfall 3: CORE-15 — cli/mcp audit divergence if the fix doesn't land in shared core

**What goes wrong:**
Both `packages/mcp/src/index.ts:721` and the cli audit command call `.filter(looksLikeProject)` from `@localground/core`. If a contributor "fixes" the filter by adding an extra `.filter(...)` inline in only the mcp audit handler (the easiest place to edit, since that's where the symptom shows up via the MCP tool), the CLI's `audit` command keeps scanning roots. The two surfaces drift — the MCP tool reports clean, the CLI still spews `C:\Users\…`.

**Why it happens:**
The symptom (`audit-includes-root-paths`) was observed through one surface. Patching at the call site is faster than editing shared core and rebuilding. Because core is bundled at build time, a core edit feels "heavier" than an inline filter.

**How to avoid:**
Treat `looksLikeProject` as the single source of truth. Any tightening goes **in the function**, never at a call site. Add a core unit test (not just an mcp/cli smoke test) so the contract is asserted once, at the shared layer.

**Warning signs:** an inline `.filter(p => …)` appearing in either audit handler; the CLI `audit --json` output containing a home/root path that the MCP `localground_audit` output does not.

**Phase to address:** **CORE-15** (shared-core landing is part of the same fix as Pitfall 2).

---

### Pitfall 4: CORE-16 — "Fixing" the trailing-edge defect with a catch-all regex

**What goes wrong:**
The trailing-edge defect (999.7) is: a folder whose name **ends in a special char** (e.g. `MyProject!`, `Foo&`, `data%`) is encoded by Claude Code with a trailing hyphen, but `encode()` (`decode.ts:89`) strips trailing special chars via `.replace(/^-+|-+$/g, '')`. During decode, `buildCandidates` compares `encode(entry.name)` (no trailing hyphen) against `remainingHash` (which carries the trailing hyphen) — exact match at `decode.ts:180` fails, prefix match at `:187` (`encodedName + '-'`) may or may not save it depending on whether more path follows. The tempting fix is to widen the `encode()` character class to `[^A-Za-z0-9-]` (catch-all) so *every* non-alphanumeric maps to a hyphen. **This violates the deliberate D-01-style targeted-not-catch-all decision** (Phase 17 WR-01: "Targeted, not catch-all") and risks re-mapping characters Claude Code does **not** actually replace, breaking the 17/17 currently-extant round-trips.

**Why it happens:**
A catch-all regex makes the failing trailing case pass instantly and "feels more robust." But the decoder's correctness rests on `encode()` being the *exact inverse* of Claude Code's real encoding — a broader regex than Claude Code uses will encode a char Claude Code left alone, and the filesystem-listing reverse-encode will then mismatch a real folder.

**How to avoid:**
The bug is **not** in the character class — the seven classes are calibrated and verified. The bug is the **trailing-hyphen-strip asymmetry**. Fix it at the comparison layer in `buildCandidates`, not in the regex: when matching the **final** segment, also try `encodedName` against `remainingHash` with a trailing hyphen tolerated (i.e. accept `remainingHash === encodedName + '-'` and `remainingHash === encodedName` for the terminal case), OR stop stripping the trailing hyphen inside the decode path's internal comparison while keeping the public `encode()` contract for round-trip symmetry. Keep the character class **exactly as Phase 17 calibrated it**. This is a leading/trailing-asymmetry fix, not a greediness fix.

**Warning signs:**
- A diff to `decode.ts:89` that changes `/[\\/: ,().'&\[\]+=%]/g` to `/[^A-Za-z0-9-]/g` or similar catch-all.
- Any of the 7 existing CORE-13 round-trip tests (`decode.test.ts:110-211`) start failing.
- A new test for a trailing-special-char folder is **not** added (the defect shipped precisely because no fixture covered the terminal position).

**Phase to address:** **CORE-16.** Add fixtures for trailing-edge (`Foo&`, `data%`, `proj!`), leading-edge, and mid-component — the asymmetry must be tested at all three positions. Run the full existing decode suite as a regression gate before merge; the 7 CORE-13 round-trips + the round-trip-fixture test are the 17/17 guard.

---

### Pitfall 5: SEC-01 — Pinning to a SHA that isn't the tag you think (incl. fork-SHA risk)

**What goes wrong:**
SHA-pinning `actions/checkout` and `actions/setup-node` requires copying a 40-char SHA. The pitfalls: (a) pinning to a SHA from a **fork** or an arbitrary commit that isn't the release tag's commit — a SHA *looks* immutable and trustworthy but can point at malicious code; (b) hand-copying the wrong SHA (off-by-one release, or the SHA of the tag *object* vs the *commit*); (c) pinning with no record of which version it is, so nobody can audit or update it later.

**Why it happens:**
The threat the user is hardening against (tj-actions/changed-files Q1 2026 — 23,000+ repos compromised via a mutable tag silently repointed) is real, but the mitigation has its own correctness trap: a SHA is only safe if it's the **right** SHA. GitHub's UI gives you the SHA visually; there's no built-in check that it corresponds to `v4` of `actions/checkout`.

**How to avoid:**
Use **`pinact`** (suzuki-shunsuke/pinact) to do the pinning, not hand-copy. It pins to the full-length commit SHA **and** writes a `# vX.Y.Z` version comment, and `pinact run --verify` / `--verify-comment` confirms the SHA actually matches the annotated tag — this is the specific defense against fork-SHA and wrong-SHA pins. Add a `zizmor` audit (or GitHub's `unpinned-uses` policy / the org SHA-pin policy shipped Aug 2025) to fail CI if any `uses:` is unpinned. Always keep the `# v4.x.x` comment next to the SHA.

**Warning signs:**
- A `uses: actions/checkout@<sha>` with no trailing `# vX.Y.Z` comment.
- The SHA was copied from a browser without `pinact --verify` confirming it.
- `actions/checkout@v4` (mutable tag) still present anywhere in `ci.yml` or `release.yml` after SEC-01.

**Phase to address:** **SEC-01.** Pin in **both** `release.yml` (the `id-token: write` job — highest privilege) **and** `ci.yml` (a poisoned CI action can exfiltrate or tamper with the build that release later publishes). Add `pinact --verify` (or `zizmor`) as a CI step so future PRs can't introduce unpinned `uses:`.

---

### Pitfall 6: SEC-01 — Over-restricting permissions breaks OIDC / provenance

**What goes wrong:**
Hardening permissions can go too far. The `release.yml` job needs **exactly** `id-token: write` + `contents: read` (currently present at lines 8-11). Removing or tightening `id-token: write` (e.g. setting `permissions: contents: read` only, or a blanket `permissions: {}` at job level without re-granting `id-token`) **silently disables OIDC trusted publishing** — npm falls back to looking for a token, finds none, and the publish fails. Provenance also breaks if the `repository` field is touched, or if the job loses `id-token: write`.

**Why it happens:**
"Least privilege" pressure during a hardening pass invites trimming permissions. `id-token: write` *reads* like a write grant that a security review would flag and remove — but it is the **required** mechanism for tokenless publishing and is the safer posture (no long-lived npm token to leak/expire).

**How to avoid:**
Treat `id-token: write` + `contents: read` as **load-bearing and frozen** for the release job. Document inline why `id-token: write` is required (OIDC, not a code-write grant). Do not add a job-level `permissions: {}` without re-granting both. Confirm `package.json` `repository.url` stays exactly matching the GitHub repo (provenance precondition — already validated in v3.0.1; don't regress it).

**Warning signs:** a permissions diff removing/narrowing `id-token: write`; the dry-run publish step (`release.yml:53`) passing but the real publish failing auth; provenance attestation missing on the published package.

**Phase to address:** **SEC-01.** Verify the OIDC publish still works end-to-end (or at minimum the `--dry-run --provenance` step) after pinning. Note: a real OIDC publish only exercises on a tag push, so SEC-01 closure should include re-confirming the next tagged release publishes with provenance.

---

### Pitfall 7: SEC-01 — Pinning the runner npm below the OIDC floor / conflicting with `npm@^11.5.1`

**What goes wrong:**
SEC-01 calls for "exact-pin runner npm in the publish job." The current job runs `npm install -g npm@^11.5.1` (`release.yml:27-30`) — a **caret range**, which is intentionally NOT exact-pinned. The pitfall: "exact-pinning" this to a version **below 11.5.1** (npm's OIDC trusted-publishing floor), or pinning to a specific patch that later gets unpublished/yanked, **breaks the only publish path**. This is the **same OIDC-floor class** that cost v3.0.1 four release iterations: the documented assumption "Node 22 ships npm ≥11.5.1" was FALSE — **Node 22.x bundles npm 10.9.x**, below the floor — which is *why* the explicit `npm install -g npm@^11.5.1` exists.

**Why it happens:**
"Exact-pin everything" is a reasonable supply-chain instinct, but npm's trusted-publishing requirement is a **floor** (≥11.5.1), not a fixed version. Pinning `npm@11.5.0` or reverting to the bundled `10.9.x` reintroduces the v3.0.1 failure. Confirmed current floor (2026): **npm CLI ≥11.5.1 AND Node ≥22.14.0**. The job's `node-version: '22.x'` resolves above 22.14.0, so the Node side is satisfied **but the npm upgrade is still mandatory** because 22.x's bundled npm is 10.9.x.

**How to avoid:**
If exact-pinning npm, pin to a **specific version ≥11.5.1** that is known-good and currently published (e.g. `npm@11.5.1` exactly), and add a `npm --version` echo step that **asserts** the installed version meets the floor — the v3.0.1 retrospective's literal recommendation ("a one-line `npm --version` echo on the runner would have caught it on attempt 1"). Do **not** drop the upgrade step. Do **not** assume `node-version: '22.x'` brings an OIDC-capable npm — it does not. Keep `package-manager-cache: false` (already set at `release.yml:25`) — caching the toolchain in a release/publish job is an attack surface and the release job already correctly dropped `cache: npm`.

**Warning signs:**
- A diff pinning npm to `< 11.5.1` or removing the `npm install -g` step in favor of the bundled npm.
- No `npm --version` assertion after the install.
- `package-manager-cache: true` or `cache: npm` reappearing in the release job.

**Phase to address:** **SEC-01.** Add an explicit floor-assertion step (`npm --version` → fail if `< 11.5.1`). This is cheap and directly prevents the v3.0.1 recurrence.

---

### Pitfall 8: CLI-06 — Breaking the pre-transport `--version` short-circuit or consuming a downstream flag

**What goes wrong:**
`mcp/src/index.ts:836` has a hand-rolled `process.argv.includes('--version')` that **must run before `StdioServerTransport` connects** — the comment at `:831-835` is explicit: a transport on stdio "would block forever waiting for a JSON-RPC client." `verify-tarball.mjs:203` depends on this exact behavior (spawns the bin with `--version`, expects exit 0 + version on stdout). CLI-06's "robust parser" (handle `--version=foo`, `--Version`) can regress this three ways: (a) moving the check *after* transport setup → hangs forever, breaking the tarball gate; (b) changing the exit path (currently `process.exit(0)` after `process.stdout.write(...)`) → exit-code regression that fails `verify-tarball.mjs:204`; (c) over-engineering a full arg-parser (commander, yargs) into the MCP bin for **one flag**, adding surface and a dependency where `includes()` + two extra cases suffice.

**Why it happens:**
"Robust parsing" invites reaching for a parser library or restructuring `main()`. But the MCP bin is not a CLI — it's a stdio JSON-RPC server with **one** escape hatch. The cli package already has commander (`cli/src/index.ts:5,24`); the mcp bin deliberately does not.

**How to avoid:**
Keep the short-circuit **first in `main()`, before transport**. Extend the existing check minimally: match `--version`, `--version=...`, and case-insensitive variants with a tiny helper, still ending in `process.stdout.write(version + '\n')` + `process.exit(0)`. Do **not** add a parser dependency. Do **not** let the parser swallow args intended for anything downstream (the MCP bin takes no other args, so the only real risk is over-greedy matching — match the flag exactly, don't prefix-match `--ver`). Run `verify-tarball.mjs` as the regression gate — it already asserts exit 0 + exact version for this bin.

**Warning signs:**
- The `--version` check moved below `new StdioServerTransport()`.
- A new `commander`/`yargs`/`minimist` import in `packages/mcp`.
- `verify-tarball.mjs` hangs (timeout at `:92`) or reports a non-zero exit for mcp.
- Stdout emits anything other than `<version>\n` for the version path (would break the `versionResult.stdout.trim()` equality at `verify-tarball.mjs:210-213`).

**Phase to address:** **CLI-06.** The existing `verify-tarball.mjs` is the guard — confirm it still passes for `@localground/mcp` after the parser change. Add a unit/smoke assertion for `--version=` and `--Version` if those forms are now claimed to be supported (otherwise the "robustness" is untested marketing).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Copy the bin's `readFileSync(../package.json)` idiom into bundled `seed.ts` | Looks like parity with the v3.0.1 bin fix | Reads the wrong/consumer package.json post-bundle; silent version drift in seed manifests | **Never** — core is bundled into 2 packages; pass the version in or use build-time `define` |
| Inline `.filter()` in the mcp audit handler instead of editing core | One-file change, no core rebuild mental overhead | cli/mcp audit diverge; D-01 plain-folder support quietly varies by surface | **Never** — single source of truth is `looksLikeProject` |
| Catch-all `[^A-Za-z0-9-]` regex for CORE-16 | Trailing case passes instantly | Re-encodes chars Claude Code leaves alone; breaks the calibrated 17/17 round-trips | **Never** — violates the Phase 17 targeted decision |
| Caret range `npm@^11.5.1` left as-is when SEC-01 says "exact-pin" | Always gets latest OIDC-capable npm | Slightly less reproducible runner; floats with npm releases | Acceptable **if** a `--version` floor-assert step is added; caret≥floor is safer than a wrong exact pin |
| Add `commander` to the mcp bin for `--version` | "Real" arg parsing | Dependency + restructured `main()` that can break the pre-transport short-circuit | **Never** — extend the existing `includes()` check |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| npm trusted publishing (OIDC) | Removing/narrowing `id-token: write` during a "least privilege" pass; assuming `node-version: '22.x'` supplies OIDC-capable npm | Freeze `id-token: write` + `contents: read`; keep `npm install -g npm@^11.5.1`; assert `npm --version ≥ 11.5.1`; keep `repository.url` matching the repo |
| GitHub Actions SHA pins | Hand-copying a SHA (possibly a fork/wrong-release SHA) with no version comment | `pinact` to pin + annotate; `pinact --verify-comment` / `zizmor` to confirm SHA↔tag; keep `# vX.Y.Z` comment |
| tsup `noExternal` bundling of core | Assuming `import.meta.url` in a core file resolves next to core's package.json | Build-time `define` in each consumer's tsup config, or pass the version in from the bin |
| `verify-tarball.mjs` as the version gate | Believing it covers all version sources | It covers **only** bin `--version`; seed `toolkitVersion` is **not** gated — add coverage under BUILD-01 |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Audit auto-discovery scanning huge home trees | `localground_audit` / `cli audit` runs for minutes, walks `C:\Users\…` | CORE-15 depth/shape filter (NOT marker-based); rely on `looksLikeProject` rejecting home/root/shallow | Already breaking — this is the `audit-includes-root-paths` defect CORE-15 targets |
| `decode()` recursion over wide sibling trees | Slow decode when a hash prefix-matches many siblings | `maxCandidates=20` bound already in place (`decode.ts:102`); don't remove it while fixing CORE-16 | If CORE-16 fix accidentally loosens or removes the bound |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Mutable tag refs (`@v4`) on the `id-token: write` job | Tag silently repointed to malicious code (tj-actions Q1 2026, 23k+ repos) → exfiltrate npm OIDC token / tamper published bytes | SHA-pin via `pinact` in **both** workflows; CI policy (`zizmor`/GitHub unpinned-uses) to enforce |
| Pinning to a fork or wrong-release SHA | Immutable-looking ref points at attacker code | `pinact --verify-comment` confirms SHA matches the annotated upstream tag |
| Stale SHA pins with no update path (security debt) | Pinned actions never get security patches | Dependabot or Renovate `github-actions` ecosystem opens bump PRs; review + re-verify |
| Re-enabling toolchain cache in the publish job | Cache poisoning influences the bytes that get published with provenance | Keep `package-manager-cache: false` (release.yml:25); do not add `cache: npm` |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| CORE-15 over-filters legitimate plain-folder projects | A user's real (git-less) project vanishes from `audit` — silent under-report | Marker-free shape filter only; test a plain folder stays discovered |
| CORE-16 fix changes `encode()` public contract | Any caller relying on `encode()`'s current output (round-trip tests, future tooling) breaks | Fix in the decode comparison layer; leave `encode()`'s public output stable |
| `--version` change emits extra text to stdout | Breaks scripts/tools parsing `localground-mcp --version` | Emit `<version>\n` only; keep exit 0 |

## "Looks Done But Isn't" Checklist

- [ ] **BUILD-01:** Often missing — a **value-equality test on the seed manifest's `toolkitVersion`**. Verify `seed()`'s output equals the package version, and confirm it's correct when invoked via **both** mcp and cli (not just that the literal was removed).
- [ ] **CORE-15:** Often missing — a **plain-folder (no `.git`/`package.json`) discovery test**. Verify a marker-less project ≥2 below home is still found AND `C:\Users`, `C:\Users\<other>`, home itself are rejected.
- [ ] **CORE-15:** Often missing — fix landed in **shared core**, not an inline call-site filter. Verify cli `audit --json` and mcp `localground_audit` produce the **same** discovered set.
- [ ] **CORE-16:** Often missing — **trailing-edge fixture** (`Foo&`, `data%`, `proj!`) AND re-run of all 7 CORE-13 round-trips + the existing round-trip test (the 17/17 guard). Verify the character class at `decode.ts:89` is **unchanged**.
- [ ] **SEC-01:** Often missing — **`# vX.Y.Z` comments** on every pin, a **SHA↔tag verification** (`pinact --verify`), and an **`npm --version ≥ 11.5.1` assertion**. Verify both `ci.yml` and `release.yml` are pinned and `id-token: write` is intact.
- [ ] **SEC-01:** Often missing — confirmation that the next **tagged** release still OIDC-publishes with provenance (the dry-run step is not an auth check, per `release.yml:53`).
- [ ] **CLI-06:** Often missing — the `--version` short-circuit still runs **before** transport, and `verify-tarball.mjs` still passes (exit 0, exact version, no hang).

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Version drift shipped in seed manifest | **HIGH** (immutable npm version) | npm versions are immutable — cannot republish. Fix-forward to next patch + add the value-equality gate (the v3.0.1 3.0.1→3.0.2 playbook) |
| Wrong/fork SHA pin merged | LOW-MEDIUM | `pinact --verify` flags it; re-pin to the verified upstream SHA; rotate any exposed OIDC-derived artifact if the bad action ran on the release job |
| OIDC broken by permission trim | LOW | Restore `id-token: write` + `contents: read`; re-run the tagged release (OIDC failures publish nothing and are retryable, per the v3.0.1 4-attempt recovery) |
| Catch-all regex regressed the 17 round-trips | LOW (caught pre-merge if suite runs) | Revert `decode.ts:89` to the calibrated class; move the fix to the comparison layer | 
| CORE-15 dropped a plain-folder project | LOW | Revert the marker check; re-implement as shape-only depth tightening |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Seed version-drift recurrence (BUILD-01) | **BUILD-01** | Test: `seed()` `toolkitVersion` == package version via both mcp & cli; extend the verify-tarball/value-equality gate to the seed path |
| D-01 regression via marker requirement (CORE-15) | **CORE-15** | Test: marker-less plain folder still discovered; no `existsSync`/`.git`/`package.json` in the diff |
| cli/mcp audit divergence (CORE-15) | **CORE-15** | Fix in `looksLikeProject.ts`; cli and mcp audit return identical discovered sets |
| Catch-all regex / 17-round-trip regression (CORE-16) | **CORE-16** | All 7 CORE-13 tests + round-trip test green; `decode.ts:89` class unchanged; new trailing-edge fixtures pass |
| Wrong/fork SHA pin (SEC-01) | **SEC-01** | `pinact --verify-comment` / `zizmor` clean; `# vX.Y.Z` comments present; both workflows pinned |
| OIDC/provenance broken by permission trim (SEC-01) | **SEC-01** | `id-token: write` + `contents: read` intact; next tagged release publishes with provenance |
| Runner-npm below OIDC floor (SEC-01) | **SEC-01** | `npm --version ≥ 11.5.1` asserted on the runner; upgrade step retained; `package-manager-cache: false` |
| `--version` short-circuit / exit-code regression (CLI-06) | **CLI-06** | `verify-tarball.mjs` passes (exit 0, exact version, no hang); short-circuit before transport; no parser dependency added |

## Sources

- LocalGround codebase (read directly): `packages/core/src/environment/decode.ts`, `looksLikeProject.ts`; `packages/core/src/operations/seed.ts`; `packages/mcp/src/index.ts`; `packages/cli/src/index.ts`; `packages/{mcp,cli}/tsup.config.ts`; `scripts/verify-tarball.mjs`; `.github/workflows/release.yml`; `packages/core/test/environment/decode.test.ts` — HIGH
- `.planning/PROJECT.md` Key Decisions (D-01 path-shape predicate; WR-01 targeted-not-catch-all; runtime version-derivation + CI equality gate; OIDC Node22/npm≥11.5.1 floor; immutable fix-forward) — HIGH
- `.planning/RETROSPECTIVE.md` v3.0.1 "What Was Inefficient" (false npm-OIDC-floor cost 4 iterations; shape-not-value gate shipped 3.0.1 misreport) — HIGH
- npm Docs, *Trusted publishing for npm packages* — npm CLI **≥11.5.1**, Node **≥22.14.0**, `id-token: write` + `contents: read`, `repository.url` must match repo, `package-manager-cache: false` — HIGH (https://docs.npmjs.com/trusted-publishers/)
- StepSecurity, *Pinning GitHub Actions for Enhanced Security* — SHA-pin process, `# vX.Y.Z` comment pattern, Dependabot/Renovate `github-actions` ecosystem for fresh pins — MEDIUM (https://www.stepsecurity.io/blog/pinning-github-actions-for-enhanced-security-a-complete-guide)
- suzuki-shunsuke/pinact (GitHub) — pins to full SHA + version comment; `--verify-comment` confirms SHA↔tag, defends against fork-SHA — MEDIUM (https://github.com/suzuki-shunsuke/pinact)
- GitHub Changelog, *Actions policy now supports blocking and SHA pinning* (Aug 2025) — org-level enforcement of full-SHA pins — MEDIUM (https://github.blog/changelog/2025-08-15-github-actions-policy-now-supports-blocking-and-sha-pinning-actions/)
- Wiz Blog / StepSecurity — tj-actions/changed-files Q1 2026 compromise (23,000+ repos via mutable tag) as the threat SEC-01 mitigates — MEDIUM

---
*Pitfalls research for: v3.1.0 Hardening and Hygiene (LocalGround)*
*Researched: 2026-06-29*
