# Phase 20 — Release Pipeline Log

Operational evidence for the guarded release sequence (PIPE-01 / PIPE-02 / SC1–SC5).

## Task 1 — Pre-flight push (D-10 push gate, PIPE-01 trigger)

- **Pre-flight commits** (Wave 1, already atomic from executors): manifest repository+license (D-04/D-05) `4fe24e5`/`131ad32`, PROJECT.md three-forms (D-13) `064b821`, release.yml OIDC hardening (D-02/D-07/D-08/D-09) `e47ad02`/`f469174`.
- **Push 1:** `git push origin master` → `8b1eea2..39ff102` (plain branch push, no tags — L1 honored; `git ls-remote --tags origin` does NOT list v3.0.0).
- Versions still 3.0.0 at push gate (bump deferred to 20-04). ✓

## Task 2 — CI green across Windows / macOS / Linux (PIPE-01 / SC1)

### Red run (diagnosed + resolved per SC1)
- **Run [28350344033](https://github.com/Technically-A-Mechanical-Engineer/localground/actions/runs/28350344033)** on `39ff102` — **all 3 OS jobs FAILED** at step "Verify tarball shape (npm pack + clean install)".
- **Symptom:** `ERR_MODULE_NOT_FOUND: Cannot find package '@localground/core' imported from .../node_modules/@localground/mcp/dist/index.js`.
- **Root cause (systematic-debugging):** ci.yml order is `build` (tsup → bundled dist, core inlined) → `build:check` (`tsc --build tsconfig.json`, which EMITS an unbundled transpile into the same `dist/` because root tsconfig is `composite:true`+`declaration:true`+`outDir:./dist`) → `verify:tarball`. The tsc emit clobbered tsup's bundled `dist/index.js` (1876 lines → 755 lines, re-introducing the bare `import from '@localground/core'`), so the packed tarball failed on clean install. Masked locally by `.tsbuildinfo` incremental caching (tsc skips emit when outputs look current); surfaced on CI's clean checkout — the **first** CI run since `build:check` (Phase 16) and `verify:tarball` (Phase 18) were both wired into ci.yml. release.yml has no `build:check` step, so the actual publish path was never affected.
- **Fix:** commit `d531c2b` — `build:check` switched from emitting `tsc --build tsconfig.json` to flat non-emitting per-package `tsc --noEmit -p packages/{core,mcp,cli}/tsconfig.json` + `tsconfig.test.json`. Same strict type coverage (verified: still catches type errors), zero emit → can never clobber the bundled dist again (robust to CI step reordering). Proven end-to-end locally against the exact CI sequence before push.

### Green run (SC1 satisfied)
- **Run [28351195225](https://github.com/Technically-A-Mechanical-Engineer/localground/actions/runs/28351195225)** on `d531c2b` — **all 3 OS jobs SUCCESS**: Test (windows-latest) ✓, Test (macos-latest) ✓, Test (ubuntu-latest) ✓. Node 20.x. PIPE-01 / SC1 satisfied.

## Task 3 — npm trusted-publisher config (D-03 / H1)

**VERIFIED (not recreated) — both packages already had a trusted publisher configured during the v3.0.0 release era.** Owner confirmed via Settings → Trusted Publisher → Edit on each package page (2026-06-29):

- [x] **@localground/mcp** — Organization/user `Technically-A-Mechanical-Engineer`, repo `localground`, workflow filename `release.yml`, environment blank, **Allowed actions: `npm publish`** (shown explicitly). ✓
- [x] **@localground/cli** — same values; **Allowed actions: `npm publish`**. ✓

D-03 satisfied. Review H1 (the must-fix-before-tag "Allowed actions: npm publish" criterion) confirmed present on BOTH packages. No web-UI changes were required — the existing config matched the exact OIDC-match values release.yml will present on the v3.0.1 tag.

---

# Plan 20-05 — Tag + OIDC Publish (irreversible)

## Task 1 — push the 3.0.1 bump commit (D-10 CI-on-tag-target)

- Bump commit `4818cfb` (+ GSD docs `acb4939`/`ac5c153` on top — docs don't touch manifests, and `.planning/` is excluded from the npm tarball via `files:["dist"]`, so the tag target is HEAD `ac5c153` carrying identical 3.0.1 manifests).
- **Push:** `git push origin master` → `d531c2b..ac5c153` (plain, no tags). HEAD == origin/master ✓.

## Task 2 — CI-green-on-exact-commit → tag → verify → pre-tag registry matrix (D-10 / M3)

- **STEP A — CI green on exact tag target:** run [28352283712](https://github.com/Technically-A-Mechanical-Engineer/localground/actions/runs/28352283712), headSha `ac5c153` (== HEAD), all 3 OS jobs `success`. ✓
- **STEP B — annotated tag:** `git tag -a v3.0.1 -m "v3.0.1 — Validation and Hardening"` on `ac5c153`. `git cat-file -t v3.0.1` == `tag` (annotated). ✓
- **STEP C — tag-content verification** (MSYS-safe via `git ls-tree`/`cat-file`, avoiding the Git-Bash `ref:path` colon mangling):
  - `mcp@tag`: version `3.0.1`, repository.url `git+https://github.com/Technically-A-Mechanical-Engineer/localground.git`, license `MIT` ✓
  - `cli@tag`: version `3.0.1`, repository present, license `MIT` ✓
- **STEP D — pre-tag registry-state matrix (review M3), run BEFORE the tag push:**
  - `npm view @localground/mcp@3.0.1 version` → **E404, "No match found for version 3.0.1"** (ABSENT) ✓
  - `npm view @localground/cli@3.0.1 version` → **E404, "No match found for version 3.0.1"** (ABSENT) ✓
  - Both absent → safe to push (no live/partial state). H2 recovery NOT needed.
- **STEP E — `git push origin v3.0.1` (IRREVERSIBLE):** PUSHED 2026-06-29 (owner confirmed `publish`). `v3.0.1` on remote ✓. Fired release.yml run [28352503029](https://github.com/Technically-A-Mechanical-Engineer/localground/actions/runs/28352503029) — IN FLIGHT (npm ci → build → test → preflight → dry-run-both → publish mcp → publish cli, OIDC+provenance).

## Task 3 — release.yml publish result (PIPE-02 / SC2)

### Attempt 1 — FAILED (auth), nothing published → H2 branch (a)
- Release run [28352503029](https://github.com/Technically-A-Mechanical-Engineer/localground/actions/runs/28352503029): **failure**. Steps npm ci → build → test → Preflight → Dry-run-both all ✓; **Publish @localground/mcp → FAILURE**; Publish @localground/cli → skipped.
- Error: `npm error code E404 / 404 Not Found - PUT https://registry.npmjs.org/@localground%2fmcp` — npm's code for an AUTH failure (provenance was signed first; the registry PUT was rejected).
- **Registry-state matrix (H2):** `npm view @localground/mcp@3.0.1` → E404 ABSENT; `npm view @localground/cli@3.0.1` → E404 ABSENT; dist-tags both still `latest: 3.0.0`. → **NEITHER live = H2 branch (a), freely retryable, no immutable version burned.**
- **Root cause:** runner had node v22.23.0 / npm ≥11.5.2 (OIDC floor met), id-token:write present, trusted-publisher config correct — but `actions/setup-node@v4` + `registry-url` injected a placeholder `NODE_AUTH_TOKEN` (`XXXXX-XXXXX-XXXXX-XXXXX`) and wrote an `.npmrc` `_authToken`, so npm used (invalid) token auth instead of OIDC → E404. npm's current docs use `actions/setup-node@v6` (no token; OIDC auto-detected).
- **Fix (commit 8fe734e):** release.yml `setup-node@v4`→`@v6` + `package-manager-cache: false`. Owner approved Path 1 (OIDC fix). OIDC stays primary (D-01); token fallback (M2) reserved as Plan B.

### Attempt 2 — OIDC fix (setup-node v6)
- **D-10 STEP A:** ci.yml run [28352947185](https://github.com/Technically-A-Mechanical-Engineer/localground/actions/runs/28352947185) on `8fe734e` — GREEN on all 3 OSes. ✓
- **Re-tag:** deleted v3.0.1 (local + remote), re-created annotated on `8fe734e` (the v6-fix commit; safe — nothing published). Tag content re-verified: mcp+cli both `3.0.1` + repository + MIT. `release.yml` at the tag confirmed `setup-node@v6` (line 22). ✓
- **Pre-tag registry matrix (M3):** both `@3.0.1` still ABSENT (E404). ✓
- **STEP E (re-push):** fired release.yml run [28353065072](https://github.com/Technically-A-Mechanical-Engineer/localground/actions/runs/28353065072) (v6) — **FAILED, same cause.** Publish step env STILL showed `NODE_AUTH_TOKEN: XXXXX-XXXXX-XXXXX-XXXXX` → setup-node@v6 + registry-url ALSO injects the placeholder token. Action version was a red herring; `registry-url` is the lever. Nothing published (both @3.0.1 still absent, latest 3.0.0).

### Attempt 3 — drop registry-url (true OIDC fix)
- **Fix (commit de99207):** removed `registry-url` from release.yml setup-node entirely → no `.npmrc` `_authToken` written → npm should detect the OIDC env (id-token:write + trusted publisher) and authenticate. Pure OIDC (D-01), no secrets; Node 22 (D-02) + package-manager-cache:false (D-09) retained. Owner approved Path 1b.
- **D-10 STEP A:** ci.yml run [28353299673](https://github.com/Technically-A-Mechanical-Engineer/localground/actions/runs/28353299673) on `de99207` — confirming green before re-tag. PENDING.
- Re-tagged v3.0.1 → `de99207`, re-pushed → release.yml run [28353437862](https://github.com/Technically-A-Mechanical-Engineer/localground/actions/runs/28353437862) — **FAILED with `ENEEDAUTH` ("need auth ... requires you to be logged in")**. Publish step env was now EMPTY (no NODE_AUTH_TOKEN — registry-url removal worked), and npm went straight to ENEEDAUTH with NO OIDC attempt. Nothing published (both @3.0.1 absent, latest 3.0.0).

### CONFIRMED ROOT CAUSE (all 3 failures)
**The runner's bundled npm is 10.9.x — BELOW npm's OIDC trusted-publishing floor of 11.5.1.** Verified directly: `C:\Program Files\nodejs/node_modules/npm` (Node 22.18) bundles npm **10.9.3**; the local `npm 11.5.2` was a manual global upgrade, not the bundled version. The runner (Node 22.23, fresh) runs bundled npm ~10.9.x. npm 10.9 has no OIDC support, so it never attempts OIDC → attempts 1-2 fell to the setup-node placeholder token (E404), attempt 3 had no auth at all (ENEEDAUTH). **D-02's assumption that "Node 22.x ships npm >=11.5.1" was wrong** — Node 22.x ships npm 10.9; it must be explicitly upgraded.

### Attempt 4 — upgrade runner npm to >=11.5.1 (true fix)
- **Fix (commit 2a9034e):** added `npm install -g npm@^11.5.1` step to release.yml after setup-node (+ echoes the upgraded version). Now the publish runs on OIDC-capable npm; id-token:write + verified trusted-publisher config are already correct, so OIDC should engage. Pure OIDC (D-01), no secrets. Owner approved Path 1c.
- **D-10 STEP A:** ci.yml run [28354502971](https://github.com/Technically-A-Mechanical-Engineer/localground/actions/runs/28354502971) on `2a9034e` — confirming green before re-tag. PENDING.
- Re-tagged v3.0.1 → `2a9034e` (annotated obj `e3efe8e`); tag content + registry guards green; tagged release.yml confirmed to carry `npm install -g npm@^11.5.1`.
- **Re-push → release.yml run [28354644986](https://github.com/Technically-A-Mechanical-Engineer/localground/actions/runs/28354644986) — SUCCESS.** All steps green incl. "Upgrade npm (>=11.5.1)", "Publish @localground/mcp with provenance", "Publish @localground/cli with provenance". OIDC engaged once npm was on the floor.

### Task 3 — RESULT: PUBLISHED (PIPE-02 / SC2 satisfied)
- `npm view @localground/mcp@3.0.1 version` → **3.0.1** ✓
- `npm view @localground/cli@3.0.1 version` → **3.0.1** ✓
- dist-tags `latest`: both **3.0.1** ✓. Both published via pure OIDC + provenance (D-01). No token, no partial state — H2 recovery never needed (branch (a) throughout: nothing was live until the successful run).
- **4 release.yml iterations to reach success:** (1) base v4 → E404; (2) setup-node v6 → E404 (placeholder token persisted); (3) drop registry-url → ENEEDAUTH (no token, no OIDC); (4) `npm install -g npm@^11.5.1` → SUCCESS. **Confirmed root cause: Node 22.x bundles npm 10.9.x, below npm's 11.5.1 OIDC floor — the D-02 "Node 22.x ships npm >=11.5.1" assumption was false.**
