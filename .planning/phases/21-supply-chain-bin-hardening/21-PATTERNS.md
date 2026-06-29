# Phase 21: Supply-Chain & Bin Hardening - Pattern Map

**Mapped:** 2026-06-29
**Files analyzed:** 4 (3 modified, 1 new)
**Analogs found:** 3 with in-repo analog / 4 total (1 file — dependabot.yml — has no in-repo analog)

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `.github/workflows/ci.yml` | config (CI workflow) | event-driven (push/PR) | self (existing step structure) + `.github/workflows/release.yml` | exact (same file / sibling) |
| `.github/workflows/release.yml` | config (release workflow) | event-driven (tag push) | self (existing publish job) | exact (same file) |
| `.github/dependabot.yml` | config (repo plumbing) | event-driven (scheduled) | none in repo | no analog (use canonical schema, see below) |
| `packages/mcp/src/index.ts` | service entrypoint (`main()`) | request-response (CLI arg → stdout → exit) | self (existing pre-transport short-circuit `:831-839`) | exact (same spot, predicate widens) |

**Note on classification:** Three of four files are GitHub workflow / repo config, not application source. "Analog" for these means the existing YAML step/job structure in the same file or its sibling workflow — the planner copies the existing block's shape and changes only the locked fields. The one source-code change (`index.ts`) extends an existing block in place.

---

## Pattern Assignments

### `.github/workflows/ci.yml` (config, event-driven) — D-01, D-02

**Analog:** itself — the existing `test` job steps. Also `release.yml` for the SHA-pin format.

**Current unpinned `uses:` block** (`ci.yml:26-34`) — these are the two lines D-01 pins:
```yaml
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
```

**D-01 transform** — replace the two floating refs with the Codex-confirmed 40-char SHA + `# vX.Y.Z` comment (verbatim from CONTEXT D-01; do not paraphrase the SHA or tag):
```yaml
      - name: Checkout repository
        uses: actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0

      - name: Set up Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
```
**Constraint (CONTEXT D-01):** keep the test matrix on Node `20.x` (`ci.yml:24`) — setup-node v6.4.0 still supports it. The v4→v6 bump is incidental to pinning; do NOT change `node-version: ['20.x']`.

**D-02 new gate step** — pattern to copy: the existing `run:`-based steps in this file all follow `- name: … / run: <single command>` (e.g. `ci.yml:36-49`). The pinact gate is a new step of that exact shape. CONTEXT D-02 BLOCKER: must be `pinact run --verify --check` (check mode = non-mutating, fail-on-mismatch). Do NOT use raw `pinact run --verify` (pinact v4 auto-corrects comments → silent mutation instead of failing). Existing single-command step shape to mirror:
```yaml
      - name: Verify tarball shape (npm pack + clean install)
        run: npm run verify:tarball
```

**Permissions/triggers context (do not change):** `permissions: contents: read` (`ci.yml:9-10`), `on: push/pull_request → master` (`ci.yml:3-7`), `concurrency` group (`ci.yml:12-14`). The pinact step runs on push/PR alongside build/typecheck/verify-tarball/test (CONTEXT integration point).

---

### `.github/workflows/release.yml` (config, event-driven) — D-01, D-04..D-07, D-09, D-10

**Analog:** itself — the existing single `release` job. CONTEXT D-10 locks the single-job structure (job split deferred); do NOT refactor into separate build/publish jobs.

**D-01 — pin the two `uses:` refs** (`release.yml:18-25`). Current floating refs:
```yaml
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js 22.x
        uses: actions/setup-node@v6
        with:
          node-version: '22.x'
          package-manager-cache: false
```
Transform to the same SHAs as ci.yml (`actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0 # v7.0.0`, `actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6.4.0`).
**PRESERVE UNTOUCHED (CONTEXT D-09):** `package-manager-cache: false` stays on the setup-node step.

**D-05 — Node floor ≥ 22.14.0.** The `node-version: '22.x'` literal at `release.yml:24` is the floor to raise. CONTEXT D-05 requires a floor ≥ 22.14.0 in the publish job.

**D-04 — exact-pin npm.** Current range (`release.yml:27-30`) is the line that changes:
```yaml
      - name: Upgrade npm to an OIDC-capable version (>=11.5.1)
        run: |
          npm install -g npm@^11.5.1
          echo "npm version now: $(npm --version)"
```
Replace the range `npm@^11.5.1` with the exact literal `npm@11.18.0` (CONTEXT D-04: Codex-confirmed as `latest` and ≥ the 11.5.1 OIDC floor).
**D-07 manual-bump note (CONTEXT D-07, accepted gap):** the `npm@11.18.0` `run:` literal is NOT covered by Dependabot (it scans `uses:` refs, not `run:` literals) → it ages silently. Add a visible comment in this step noting the literal must be bumped manually. Placement/wording is Claude's Discretion (CONTEXT) provided the note is visible in `release.yml`.

**D-06 — runtime floor-assert step.** This is the VALUE-assert that closes the v3.0.1 "asserted shape, shipped a bad version" lesson. Copy the shape of the existing bash-guard step at `release.yml:41-51` (the `Preflight — assert tag matches package versions` step) — it is the canonical fail-closed `run:` guard already in this file:
```yaml
      - name: Preflight — assert tag matches package versions
        run: |
          MCP_VERSION=$(node -p "require('./packages/mcp/package.json').version")
          CLI_VERSION=$(node -p "require('./packages/cli/package.json').version")
          echo "Tag: $GITHUB_REF_NAME  mcp: $MCP_VERSION  cli: $CLI_VERSION"
          if [ "$GITHUB_REF_NAME" != "v$MCP_VERSION" ]; then
            echo "::error::Tag $GITHUB_REF_NAME does not match mcp version v$MCP_VERSION"; exit 1
          fi
          if [ "$MCP_VERSION" != "$CLI_VERSION" ]; then
            echo "::error::mcp ($MCP_VERSION) and cli ($CLI_VERSION) versions differ"; exit 1
          fi
```
Mirror this `echo "::error::…"; exit 1` fail-closed idiom for the new floor-assert: fail the release if `npm --version` < 11.5.1 OR Node < 22.14.0 (CONTEXT D-06). Place it after the npm-upgrade step so the asserted npm is the upgraded one. Wording/placement is Claude's Discretion (CONTEXT) provided it fails-closed below floor.

**PRESERVE UNTOUCHED (CONTEXT D-09):** OIDC posture — `permissions: id-token: write` (`release.yml:8-10`), `--provenance` on both dry-run and real publish (`release.yml:55-56`, `:59`, `:62`), `--access public`, no stored npm token. The dry-run step (`release.yml:53-56`) stays; CONTEXT D-11 notes the surviving SLSA-provenance attestation is verified on the next real tagged release (closure obligation, NOT a CI-on-push step).

---

### `.github/dependabot.yml` (config, scheduled) — D-08 — NEW, NO IN-REPO ANALOG

**Analog:** none. No `.github/dependabot.yml` exists in this repo. (The only `dependabot.yml` on disk is inside `node_modules/fast-uri/` — a vendored third-party file, NOT a usable project analog; do not copy it.) Planner should use the canonical Dependabot v2 `github-actions` schema, not a codebase pattern.

**Canonical shape to author** (matches CONTEXT D-08 — `package-ecosystem: github-actions`, `directory: "/"`, `schedule: weekly`, grouped into a single PR):
```yaml
version: 2
updates:
  - package-ecosystem: github-actions
    directory: "/"
    schedule:
      interval: weekly
    groups:
      actions:
        patterns:
          - "*"
```
**CONTEXT D-08 accepted gap (document, do not fix this phase):** grouped updates default to *version-updates*; repo-level Dependabot **security** alerts still fire independently — no separate `applies-to: security-updates` group is configured for Phase 21.
**Coupling:** none — Dependabot only proposes PRs, no code dependency (CONTEXT integration point).

---

### `packages/mcp/src/index.ts` (service entrypoint, request-response) — D-12..D-14

**Analog:** itself — the EXACT existing pre-transport short-circuit. The structural pattern (check → write stdout → exit, BEFORE transport) is already correct; only the predicate widens.

**Existing block to extend** (`packages/mcp/src/index.ts:831-844`, verbatim):
```typescript
async function main(): Promise<void> {
  // Smoke-check escape hatch: respond to --version without booting the MCP server.
  // Used by scripts/verify-tarball.mjs to confirm the published tarball's bin
  // entry executes end-to-end. Must run BEFORE StdioServerTransport setup —
  // a transport on stdio would block forever waiting for a JSON-RPC client.
  if (process.argv.includes('--version')) {
    process.stdout.write(`${SERVER_VERSION}\n`);
    process.exit(0);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${SERVER_NAME} MCP server v${SERVER_VERSION} running on stdio`);
}
```

**Version source (do not change how the value is derived)** — `SERVER_VERSION` (`packages/mcp/src/index.ts:18-21`):
```typescript
const SERVER_NAME = 'localground';
const SERVER_VERSION = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
).version as string;
```

**D-12..D-14 transform** — widen ONLY the predicate condition `process.argv.includes('--version')`. The body (`process.stdout.write(`${SERVER_VERSION}\n`); process.exit(0);`) and its position (before `new StdioServerTransport()`) stay exactly as-is. Predicate must now match (CONTEXT D-12/D-13):
- `--version`
- `--version=…` (prefix form)
- `-v` / `-V` aliases
- Case-sensitive long form: `--Version` / `--VERSION` are intentionally NOT matches → fall through to normal startup (CONTEXT D-13, testable behavior).
- No argument-parser dependency — hand-rolled predicate only (CONTEXT D-14, no commander/yargs).

**Claude's Discretion (CONTEXT):** inline check vs a small `isVersionRequest(argv: string[]): boolean` helper — planner's call, provided D-12..D-14 hold.

**Contract that MUST stay green (CONTEXT, see Shared Patterns):** `versionResult.stdout.trim() === expectedVersion` AND exit code 0. The widened predicate must keep printing `${SERVER_VERSION}\n` to stdout and exiting 0 for the bare `--version` case the contract exercises.

---

## Shared Patterns

### Fail-closed VALUE-assert (the v3.0.1 governing lesson)
**Source:** `.github/workflows/release.yml:41-51` (the `Preflight` step).
**Apply to:** the D-06 npm/Node floor-assert in `release.yml`, and conceptually to the D-02 pinact gate in `ci.yml`.
**Pattern:** assert the actual runtime VALUE (`npm --version`, `node --version`, live tag→SHA resolution), not a declared shape. A shape-only check shipped an immutable bad version in v3.0.1 (CONTEXT domain). The bash idiom is `echo "::error::<msg>"; exit 1` to fail the job.
```yaml
          if [ <value-below-floor> ]; then
            echo "::error::<reason>"; exit 1
          fi
```

### SHA-pin format for `uses:`
**Source:** Codex-confirmed pins in CONTEXT D-01 (no prior in-repo example — both workflows currently float).
**Apply to:** every external `uses:` in `ci.yml` and `release.yml`.
**Pattern:** `owner/action@<40-char-sha> # vX.Y.Z`. Both actions here are first-party GitHub (checkout, setup-node) — lowest impostor-commit risk, which is why `pinact --check` alone closes SC #1 and zizmor was rejected (CONTEXT D-03).

### Pre-transport short-circuit (check → stdout → exit)
**Source:** `packages/mcp/src/index.ts:831-839`.
**Apply to:** CLI-06 only (it extends this exact spot).
**Pattern:** any direct-CLI response in the MCP bin must resolve and `process.exit()` BEFORE `new StdioServerTransport()` — a stdio transport blocks forever waiting for a JSON-RPC client. Stdout is reserved for JSON-RPC; the version string is the one sanctioned stdout write (all other diagnostics use `console.error`, per project stderr-only logging discipline).

### Windows-safe spawn discipline (if any new verify step shells to npm)
**Source:** `scripts/verify-tarball.mjs:47-63` (`resolveNpmCliJs` / `NPM_CLI_JS`) and `:79-99` (`run` helper).
**Apply to:** any verification code that shells out to npm (not required by the current D-02..D-06 steps, which run inside GitHub-hosted Ubuntu where plain `npm` is fine — relevant only if a verify step is added that spawns npm from Node on Windows).
**Pattern:** spawn `[process.execPath, NPM_CLI_JS, ...args]` via `spawn(cmd, args, { stdio: ['ignore','pipe','pipe'] })` — never `spawnSync(['npm', ...])` (Node 20+ EINVAL on Windows without `shell: true`), never `execSync` with string concatenation, never `shell: true`. The `run` helper also carries a watchdog timeout that `child.kill()`s and rejects.
```javascript
function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    // ...accumulate stdout/stderr, watchdog timeout, resolve {exitCode, stdout, stderr}
  });
}
```

### The CLI-06 contract (must stay green)
**Source:** `scripts/verify-tarball.mjs:203-213`.
**Apply to:** `packages/mcp/src/index.ts` predicate change — this is the regression gate.
**Pattern:** the script runs the packed bin with `--version` and asserts exit 0 + exact-string match:
```javascript
    const versionResult = await run(process.execPath, [binEntry, '--version']);
    if (versionResult.exitCode !== 0) { /* throw */ }
    const actualVersion = versionResult.stdout.trim();
    if (actualVersion !== expectedVersion) { /* throw: version drift */ }
```
CLI-06 changes are additive — the bare `--version` path must keep printing exactly `${SERVER_VERSION}\n` and exiting 0. This script runs as the `verify:tarball` CI step (`ci.yml:45-46`).

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `.github/dependabot.yml` | config (scheduled) | event-driven | No project Dependabot config exists. Planner uses the canonical Dependabot v2 `github-actions` schema (shape provided above under its Pattern Assignment), not a codebase analog. The lone `node_modules/fast-uri/.github/dependabot.yml` is a vendored third-party file, not a usable analog. |

## Metadata

**Analog search scope:** `.github/workflows/` (2 files, both read in full), `.github/` (no dependabot.yml), `packages/mcp/src/index.ts` (version block + SERVER_VERSION source), `scripts/verify-tarball.mjs` (spawn helper + contract assertions).
**Files scanned:** 4 target files + 1 contract file fully covered; 2 globs confirmed no additional workflow/dependabot analogs in-repo.
**Pattern extraction date:** 2026-06-29
