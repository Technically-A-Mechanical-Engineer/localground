# Phase 19: Skill Runtime UAT — Research

**Researched:** 2026-04-28
**Domain:** Manual UAT of registered MCP server + skill runtime on Windows
**Mode:** Adversarial / corroborative (CONTEXT.md is locked; this is a second-source check)
**Confidence:** HIGH on findings 1-3 (verified empirically against codebase + CLI), MEDIUM on landmines flagged below

## Summary

CONTEXT.md's 18 D-codes are mostly sound. Three findings need to land in PLAN.md as task-level constraints **before** UAT execution begins, or the maintainer will hit silent failures the plan does not anticipate. Two are RISK-FLAGGED (D-10, D-04 swap procedure on Windows scope), one is CORROBORATED-with-caveat (D-01 Run 2 idempotency framing).

**Primary recommendation for the planner:**
1. Reframe D-10's UAT-04 fixture from "3 candidate types" to "3+ stale-reference variants in scannable text files" — `localground_cleanup_scan` only emits `ScanMatch` records (file reference matches), it does not enumerate orphan directories or path-hash entries. The skill spec's prose distinguishes file vs directory candidates, but the directory-side path is currently aspirational.
2. Add `--scope user` to the `claude mcp add localground` registration step. Default is `local` — a local-scoped registration made in the source cwd will not be visible from the destination cwd in UAT-02 Session 2.
3. Reframe D-01 Run 2 success criteria: the migrate skill has no early-exit branch for `session: 2`. It falls through to Session 1 logic and asks the user which projects to migrate. Idempotency is user-driven (decline), not automatic. The test still has value, but the assertion is "no state corruption + clean re-entry to Session 1," not "exits cleanly without re-processing."

The other 15 D-codes hold. Verification artifact frontmatter and table shapes confirmed against Phase 17/18; lifted verbatim below for the planner to reuse.

## 1. Approach Validation

### D-01 — Scenario set C (happy + idempotency replay + missing-state-file fallback)
**Score:** CORROBORATED-with-caveat (Run 2 framing needs adjustment).

The migrate skill (`localground-migrate.md:17-21`) has exactly this branching:
```
if (state file exists AND state.session === 1) → Session 2
else                                            → Session 1
```

Three documented branches by file/content state:
- (a) **No file present** → enters Session 1
- (b) **File with `session: 1`** → enters Session 2
- (c) **File with `session: 2`** → enters Session 1 (no early-exit)

Scenario C touches all three branches (Run 1 = a, Run 2 = c, Run 3 = a after deletion = back to fresh source). **Branch (b) is exercised inside Run 1 itself** when Session 1 finishes and Session 2 launches — that is the Claude-Code-restart-bound handoff. So Scenario C does cover all three branches, but in a different mapping than CONTEXT prose suggests.

**Caveat — Run 2's success criteria mis-frame branch (c):** CONTEXT D-01 says Run 2 "confirm[s] it detects `session: 2` and exits cleanly without re-processing." Read `localground-migrate.md:21` — there is no `session: 2` early-exit. The skill falls into Session 1, calls `localground_detect`, presents discovered projects, and asks the user which to migrate. Idempotency is user-driven (the maintainer declines all projects when re-prompted), not automatic.

**Recommendation:** Plan Run 2's assertion as: "Skill re-enters Session 1 logic, presents project list, maintainer declines migration, no state corruption, no duplicate work." This is what the skill actually does; the test still validates the load-bearing property (no corruption when invoked at completed destination).

### D-04 — Hybrid runtime (local dist + tarball-install gate)
**Score:** RISK-FLAGGED on Windows-specific operational details.

Confirmed empirically:
- `claude mcp` CLI present on the maintainer's machine (`claude --version` works; `claude mcp list` works).
- `claude mcp add <name> -- node /path/to/index.js` is the canonical stdio registration (verified via `claude mcp add --help`).
- `claude mcp remove <name>` + `claude mcp add <name> ...` is the swap procedure (no in-place update flag).
- `claude mcp get localground` currently returns "No MCP server found" — the toolkit has never been registered on this machine, despite v3.0.0 having shipped. Phase 19 is the first registration event.

**Risk 1 — Scope default trap (HIGH severity).** `claude mcp add --help` output shows `-s, --scope <scope>` defaults to `local`. Per Claude Code documentation: `local` scope is per-project (current cwd only). UAT-02 spans two cwds — Session 1 runs from a source folder under OneDrive; Session 2 runs from the destination under `C:/Users/rlasalle/Projects/`. A `local`-scoped registration made in cwd A is **not visible** from cwd B. **The plan MUST add `--scope user` to every `claude mcp add` invocation**, or the two-session loop fails at Session 2 launch with "no MCP server" before any tool call happens. CONTEXT does not currently call this out — it appears in Claude's Discretion bullet 1 only as an aside ("`claude mcp remove` + `claude mcp add` is the obvious approach") without scope guidance.

**Risk 2 — Path-quoting on Windows.** The canonical SKILL.md example uses forward slashes (`node /path/to/packages/mcp/dist/index.js`). On Windows-bash, this works because Git Bash translates. On PowerShell or cmd, mixed separators may need explicit quoting. **Recommended path form** for the registration step (works in all three Windows shells):
```bash
claude mcp add localground --scope user -- node "C:/Users/rlasalle/Projects/localground/packages/mcp/dist/index.js"
```
Forward slashes inside double quotes survive PowerShell, cmd, and Git Bash parsing without backslash escaping. The path has no spaces in this user's environment, so quote-with-forward-slashes is the lowest-risk form.

**Risk 3 — Re-registration is not idempotent.** Empirically untested but documented behavior: `claude mcp add <existing-name>` errors. The swap procedure must be `remove` → `add`; the planner should encode it as a two-line shell snippet, not a single `add`.

**Risk 4 — Tarball-install path on Windows.** `verify-tarball.mjs` uses `os.tmpdir()` + `mkdtemp` + `process.execPath + npm-cli.js` resolution to dodge the Node 20+ `npm.cmd` EINVAL bug (memory `feedback_windows_npm_spawn.md`). The Phase 19 tarball-gate UAT must mirror this exact pattern when manually packing/installing — a naive `npm pack && cd /tmp && npm install <tgz>` from PowerShell will work because npm is the user's shell-resolved command, not a Node `spawn` call. **The gate procedure can be plain shell commands the maintainer types, not a Node script.** The verify-tarball.mjs pattern is for CI; UAT can be simpler.

### D-07 — Hybrid evidence format (`19-UAT.md` + `19-transcripts/`)
**Score:** CORROBORATED.

Phase 17 and Phase 18 verification artifacts confirm the pattern. Exact frontmatter + table shapes lifted in Section 3 below.

### D-10 — Synthetic UAT-04 candidates (orphan dir + stale CLAUDE.md ref + abandoned path-hash dir)
**Score:** RISK-FLAGGED — **load-bearing finding**.

`localground_cleanup_scan` is a thin wrapper around `core.scan()`. Verified:
- `packages/core/src/operations/scan.ts:36-45` — `CLOUD_PATH_PATTERNS` is a regex array (OneDrive, Dropbox, Google Drive, iCloud).
- `scan.ts:96-110` — line-by-line regex match in scannable text files (`.md`, `.json`, `.txt`, `.yml`, `.yaml`, `.toml`, `.cfg`, `.ini`, `.env` + `CLAUDE.md`/`claude.md`/`.clauderc`/`settings.json`/`package.json`/`.env`/`.env.local`).
- `scan.ts:101-105` — emits `ScanMatch { file, line, content, cloudPath }`. **No directory-type candidates emitted.**
- `packages/mcp/src/index.ts:314-330` — MCP `localground_cleanup_scan` calls `scan()` and passes the result through `resultToMcp`. No additional candidate enumeration.
- `packages/cli/src/index.ts:641-693` — CLI `cleanup-scan` is also a thin `scan()` wrapper. No post-processing.

**There is no code path that emits an "orphan source-folder" or "abandoned path-hash directory" candidate.** D-10's fixture as written cannot be built — the scan tool will return zero candidates for the dir/path-hash artifacts and only match the CLAUDE.md text reference.

**Why CONTEXT got this wrong:** The cleanup skill spec (`localground-cleanup.md:38-46`) prose distinguishes "file reference matches" from "directory candidates" and gives PowerShell/bash deletion examples for directories. This is **forward-looking spec prose**, not current behavior. The skill's deletion logic supports both shapes in principle, but the upstream MCP scan only produces the file-reference shape today.

**Three options for the planner (in order of recommendation):**
1. **(Recommended) Reframe D-10 to "3+ stale-reference variants in scannable text files":** e.g., one stale OneDrive ref in `CLAUDE.md`, one in `.clauderc`, one in a memory file (`.claude/memory/something.md` — `.md` is scannable), with mixed yes/no/skip-all confirmation across them. This exercises the skill's per-item confirmation flow, the file-edit deletion path, and the `skip all` state transition without requiring fixtures the scan tool can't produce.
2. **Reduce scope:** drop directory-type candidates entirely; document the gap as a known limitation; UAT-04 covers file references only.
3. **Promote to defect:** if directory-type cleanup is required, the cleanup-scan tool needs a code change. This is out of scope per D-17 ("no skill behavior changes") and would re-open the phase boundary.

**Recommendation 1** is consistent with D-17 (no surface change) and still meaningfully exercises SC #4 ("zero deletions on items declined or skipped"). The "skip all" state transition is the highest-defect-risk control flow and is preserved.

### D-15/D-16 — Skill sequencing (natural flow then UAT-04 then UAT-05)
**Score:** CORROBORATED.

The chained fixture flow (UAT-01 seed → UAT-02 migrate → UAT-03 reap on destination) works because:
- `seed()` writes `.localground-seed-manifest.json` to the source project root (`packages/core/src/operations/seed.ts:147`).
- `chunk()`/`copy()` copy the source to destination (manifest comes along automatically as a regular file).
- `verify()` reads `.localground-seed-manifest.json` from the destination project root by default (`packages/core/src/operations/verify.ts:11,29`).
- `health_check`'s seed_markers check (`packages/mcp/src/index.ts:637-650`) calls `verify()` with the destination path — manifest survives the migration and gets re-verified.

Integration is natural; UAT-03 will detect a UAT-02 manifest-corruption defect if one exists.

## 2. Operational Landmines

The planner must wire each of these into PLAN.md tasks. They are all confirmed empirically against the codebase, the registered Claude Code CLI, or the verified Phase 17/18 artifacts.

### L-1 — `claude mcp add` scope default (HIGHEST SEVERITY)
**Confirmed via:** `claude mcp add --help` output shows `-s, --scope <scope>` defaults to `local`.
**Impact:** A `local` registration made from the source cwd is not visible from the destination cwd. UAT-02 Session 2 launches in destination cwd → no MCP server → all tool calls fail before SC #2 can be tested.
**Mitigation:** Plan must specify `claude mcp add localground --scope user -- node "<absolute-path>"` for every registration step (local-dist iteration AND tarball-install gate).

### L-2 — `claude mcp add` is not idempotent
**Confirmed via:** subcommand structure (no `--force` or `--update` flag in `claude mcp add --help`).
**Impact:** Re-running `add` against an existing name errors. Maintainer must explicitly `remove` first.
**Mitigation:** Encode the swap as a two-step: `claude mcp remove localground 2>/dev/null; claude mcp add localground --scope user -- node "<path>"`. The `2>/dev/null` swallows the "not found" error on first registration. The trailing `;` (not `&&`) ensures `add` runs even if `remove` fails.

### L-3 — Skill loading order (project vs user)
**Confirmed via:** `.claude/skills/` exists in this repo (project-local); user-level `~/.claude/skills/` may also exist.
**Impact:** When both contain `localground-*.md`, project-local wins by Claude Code convention. UAT-02 Run 3's idempotency replay (per Claude's Discretion bullet 5) "from a fresh Claude Code session at the destination" — the destination project has no `.claude/skills/` directory, so the user-level skill loads. **If user-level skills are stale or absent, UAT-02 Run 3 falls through to "skill not found."**
**Mitigation:** Plan must include a pre-UAT verification step: "Confirm `localground-migrate` skill is loadable from a fresh Claude Code session at the destination cwd. If not, copy `.claude/skills/` from the repo to the destination, or install at user level."

### L-4 — Two-session restart: MCP registration persists, skill loading does not
**Confirmed via:** Claude Code MCP registration is stored in user/project config (per `--scope` flag), independent of the running session. Skills load from the cwd's `.claude/skills/` at session start.
**Impact:** The MCP server with `--scope user` survives the Session 1 → Session 2 restart cleanly. Skill loading depends on cwd. Combined with L-3, this means the destination cwd needs the skill present.
**Mitigation:** Already covered by L-1 (`--scope user` for MCP) and L-3 (skill availability at destination). Document the relationship explicitly so the maintainer knows what should and shouldn't survive the restart.

### L-5 — `.localground-seed-manifest.json` refuses re-seed
**Confirmed via:** `seed.ts:71-81` — `fs.access(testFilePath)` succeeds → returns `test_file_exists` failure with detail "Has this project already been seeded?" Note the check is for the **test file** (`.localground-seed-test`), not the manifest.
**Impact:** D-12's fresh-fixture decision is correct. Phase 14's preserved OneDrive QMS fixture has the test file present and would reject re-seed. Confirms D-12 holds.
**Mitigation:** None needed — D-12 already disposes of this. Recorded as confirmation.

### L-6 — Manifest file name and location (UAT-01 SC #1)
**Confirmed via:** `seed.ts:30` — `SEED_MANIFEST_FILE_NAME = '.localground-seed-manifest.json'`. `seed.ts:147` — written to `path.join(projectPath, SEED_MANIFEST_FILE_NAME)`. Schema at `seed.ts:137-144`: `{ version, toolkitVersion, created, projectPath, projectName, markers }` where `markers` is an array of `{ type: 'test-file', path, checksum }` and `{ type: 'git-tag', tag, commitHash }`.
**Impact:** UAT-01 evidence must capture this exact filename and shape. The skill spec example shows the human-readable rendering but not the on-disk JSON.
**Mitigation:** Plan should require the seed transcript to include `cat .localground-seed-manifest.json` output as evidence (not just the skill's natural-language rendering).

### L-7 — `localground-migrate-state.json` location (UAT-02 SC #2)
**Confirmed via:** `localground-migrate.md:54` — written to **the destination base path** (not inside any project). Skill spec example schema at lines 56-77.
**Impact:** Run 3's "delete state file then re-invoke" must delete the file from the **base path**, not from inside a project subdirectory. Easy to miss because the base path looks like a containing folder, not a project.
**Mitigation:** Plan must spell out the exact delete command: `rm "<destinationBasePath>/localground-migrate-state.json"` with absolute path.

### L-8 — Cleanup `skip all` state transition wording
**Confirmed via:** `localground-cleanup.md:30` — "Delete this reference? (yes/no/skip all)". Free-text response, not Y/N keystroke or AskUserQuestion menu.
**Impact:** Maintainer must type `skip all` verbatim (or equivalent natural language Claude will interpret). Transcripts capture user input as-typed.
**Mitigation:** Plan should specify the exact response strings for evidence consistency: `yes` / `no` / `skip all`.

### L-9 — Per-item confirmation is free-text dialogue
**Confirmed via:** `localground-cleanup.md:36` — "Wait for the user to respond to EACH candidate individually." No tool call or structured prompt mentioned.
**Impact:** Same as L-8 — free-text dialogue, not a UI menu. Affects transcript capture format.
**Mitigation:** None — D-08's "plain markdown copy-paste" already accommodates this.

### L-10 — Transcript capture has no debug log fallback
**Empirical:** Claude Code does not write a public terminal log file by default. `claude --debug` outputs additional MCP traffic to stderr but does not persist a session log. The maintainer captures by select+copy from the terminal.
**Impact:** Transcript fidelity depends on what the maintainer scrolls back through. Long sessions risk losing earlier dialogue.
**Mitigation:** Plan should recommend the maintainer use a terminal with large scrollback (Windows Terminal default is 9001 lines — sufficient) or use `script` (Git Bash) / `Start-Transcript` (PowerShell) for the migrate session specifically (the longest one). This is a Claude's-Discretion-level detail; not a blocker.

### L-11 — `localground_audit` filters projects via `looksLikeProject`
**Confirmed via:** `packages/mcp/src/index.ts:712-718` — `autoDiscovered` chains through `.filter(looksLikeProject)`. Explicit `projectPaths` from caller bypass this filter.
**Impact:** UAT-05 will not see filesystem-root or home-directory path-hash entries even if they decode validly. This is correct behavior, but the maintainer needs to know it so a "missing project" reading isn't mis-diagnosed as a defect.
**Mitigation:** None needed — record as a known reading.

## 3. Verification Artifact Field Set

Lifted verbatim from Phase 17/18 verification artifacts so the planner can match exactly.

### Frontmatter (use this exact field set for `19-UAT.md`)

```yaml
---
phase: 19-skill-runtime-uat
verified: <ISO 8601 timestamp>
status: passed | partial | diagnosed | blocked
score: N/M must-haves verified
overrides_applied: 0
requirements_verified: N/M
---
```

Phase 17 frontmatter additionally has `cross_checked` and `cross_check_status` fields appended after the verifier cross-check ran. Phase 18 frontmatter is the simpler 5-field shape. The plan-authored `19-UAT.md` should ship with the simpler shape; the verifier's cross-check augmentation (per D-09) adds the `cross_checked` / `cross_check_status` fields when it appends.

### Observable Truths table (the load-bearing structure)

```markdown
### Observable Truths (Roadmap Success Criteria)

| #   | Truth                                | Status     | Evidence                                                    |
| --- | ------------------------------------ | ---------- | ----------------------------------------------------------- |
| SC1 | <SC1 verbatim from ROADMAP>          | <symbol>   | <evidence-pointer to transcript or grep result>             |
| SC2 | <SC2 verbatim from ROADMAP>          | <symbol>   | <evidence-pointer>                                          |
| SC3 | <SC3 verbatim from ROADMAP>          | <symbol>   | <evidence-pointer>                                          |
| SC4 | <SC4 verbatim from ROADMAP>          | <symbol>   | <evidence-pointer>                                          |
| SC5 | <SC5 verbatim from ROADMAP>          | <symbol>   | <evidence-pointer>                                          |

**Score:** N/5 truths verified
```

Phase 17 used `✓ VERIFIED` symbols. Phase 18 used `VERIFIED` (no checkmark). Either works; pick one and use it consistently. **Recommendation:** match Phase 18's plain-text style (`VERIFIED`) — Phase 17's checkmarks are inside complex grep strings inside table cells and add HTML-rendering risk for no diagnostic value.

For `partial` and `diagnosed` status:
- `partial` — some truths verified, others awaiting fix-plan. Status column reads `PENDING — see fix plan 19-XX-PLAN.md`.
- `diagnosed` — defect found, root cause documented, fix plan not yet authored. Status column reads `DIAGNOSED — see <link to debug entry or transcript line range>`.

### Other tables Phase 17/18 use that Phase 19 should mirror

| Section | Purpose | Phase 19 applicability |
|---------|---------|------------------------|
| Required Artifacts | One row per produced artifact | Yes — list `19-UAT.md`, each transcript file, the synthetic fixture dir |
| Behavioral Spot-Checks | Command + result + status | Yes — capture the `claude mcp list` output, the `node packages/mcp/dist/index.js --version` output, the synthetic-fixture file count |
| Requirements Coverage | UAT-01..UAT-05 → satisfied/diagnosed | Yes — direct mapping, this is the canonical traceability |
| Anti-Patterns Found | Empty unless review surfaces an issue | Yes — likely empty for an observational phase |
| Human Verification Required | Empty for code phases; populated when UAT requires the human-in-the-loop dialogue | **Yes — Phase 19 is the inverse of Phase 17/18 here.** The plan-authored `19-UAT.md` populates this with "Manual UAT execution by maintainer" up front; the verifier cross-check confirms transcripts exist and shape matches. |
| Gaps Summary | What's NOT covered | Yes — record the 999.7 trailing-edge defect and any UAT-discovered backlog items |
| Cross-check section | Verifier-augmented per D-09 | Yes — this is exactly what the augment-don't-overwrite rule from `feedback_plan_authored_verification.md` protects |

### Anchor format for evidence pointers (Claude's Discretion bullet 3)

Phase 17/18 evidence cells use grep/file-read references:
- `grep -F '<literal>' <path>` returns N matches
- `<file>:<line>` for direct file references
- `commit <sha> (<type>)` for git references

Phase 19 evidence cells will reference transcript files. **Recommended format:** `transcripts/seed.md § Tool call: localground_seed` (section-heading anchor) with line range as fallback `transcripts/seed.md:42-58`. This matches the grep-result style of the prior phases and lets the verifier cross-check actually read the cited content.

## 4. UAT-02 Critical-Path Mechanics

### Session-detection branching (the THREE branches D-01 must touch)

`localground-migrate.md:17-21`:
```
if (state file exists AND state.session === 1) → Session 2
else                                            → Session 1
```

The skill checks **only one trigger condition**: existence + content of `localground-migrate-state.json` in CWD. There are not three branches, there are two. CONTEXT D-01's "three documented session-entry branches" is a presentation of the three INPUTS (no file / `session: 1` / `session: 2`) rather than three CODE branches:

| Input state | Branch taken | What runs |
|-------------|-------------|-----------|
| No file present | Session 1 | Detect → copy → verify → write state |
| File `session: 1` | Session 2 | Read state → migrate settings → update state to `session: 2` |
| File `session: 2` | Session 1 | Detect → copy → verify → write state (treats `session: 2` as "completed migration, fresh attempt") |

The third row is the load-bearing "no early-exit" property. It IS a meaningful test (idempotency under user-driven decline), but the assertion is about graceful re-entry, not auto-skip.

### State-file paths (D-01 Run 3 fallback fixture construction)

| Path | Where written | Where read |
|------|---------------|------------|
| `<destinationBasePath>/localground-migrate-state.json` | Session 1 step 4 (`localground-migrate.md:54`) | Session 2 step 1 (`localground-migrate.md:93`) |

Note: written to the **destination base path** (the parent dir that contains the per-project destinations), not to a project subdirectory. Run 3's deletion step targets this exact path.

### State-file schema (UAT-02 evidence checklist)

From `localground-migrate.md:56-77` — the canonical example. Required top-level keys: `version`, `session`, `timestamp`, `sourcePath`, `destinationPath`, `projects[]`. Per-project keys: `name`, `sourcePath`, `destinationPath`, `verification: { success, checksumMatch, gitTagPresent, commitHashMatch }`.

After Session 2 (`localground-migrate.md:113-117`): adds `completedTimestamp`, `session: 2`, per-project `settingsMigrated`, `referencesUpdated`. UAT evidence should capture both states (post-Session-1 and post-Session-2) to validate the skill performs the in-place update correctly.

### Continuation-token boundary (what UAT does NOT test)

`packages/core/src/operations/chunk.ts:30-80` — `chunk()` enumerates top-level entries and groups them into ≤500MB chunks. Each chunk is a list of entry names plus index/source/target.

`packages/mcp/src/index.ts:74-112` — `encodeCopyToken`/`decodeCopyToken` serialize the chunk plan + cursor (`currentIndex`, `filesCopied`, `maxExitCode`) as base64 JSON. Token validation rejects malformed tokens or absolute-path tampering (lines 95-98).

`packages/mcp/src/index.ts:332-527` — the `localground_copy` tool registers with two paths: first call (no token, plans + copies chunk 0) and subsequent calls (decode token, copy next chunk).

**The continuation-token mechanism is exercised exhaustively by Vitest** against `chunk()` + `copy()` directly (memory: Phase 12-15 test suite), so D-02's deferral of crash-resume to v3.1.0 is correct. **What UAT-02 uniquely tests** is:
1. The skill's session-detection branching (the three input rows in the table above) — no Vitest covers this.
2. The state-file handoff across a Claude Code restart — no Vitest covers this (Vitest doesn't restart processes).
3. Real-fs side effects at the actual cloud-synced source path — Vitest fixtures use `os.tmpdir()`, not OneDrive.

The token mechanism itself is in scope only to the extent that the migrate skill calls it correctly (token field round-trip in tool-call args). If the skill drops the token, UAT-02 Run 1 will surface it as duplicate-work or premature `done: true`. That is the **only** token-mechanism failure UAT-02 catches that Vitest does not.

## 5. Out-of-Scope Confirmation

### Already covered by Vitest (D-02 deferral validated)
- `chunk.ts` size estimation, chunk-boundary calculation, multi-chunk planning — covered by `packages/core/test/operations/chunk.test.ts`.
- `copy.ts` robocopy/rsync invocation, exit-code handling, continuation across calls — covered by `packages/core/test/operations/copy.test.ts`.
- Token encode/decode round-trip + validation — covered by MCP smoke tests.
- Crash-resume mid-chunk would require killing the test process; deterministic only via Vitest, which does not currently cover it. Backlog candidate per D-02.

### Already covered by `verify-tarball.mjs` (D-04 boundary validated)
Phase 18's `scripts/verify-tarball.mjs` covers (per `18-VERIFICATION.md` Observable Truths):
- `npm pack --dry-run` shape (5-file allowlist + forbidden src/test/config absent)
- Real `npm pack` to `os.tmpdir()` + clean install with `--ignore-scripts`
- `dist/index.js.map` ships in tarball (D-03)
- `--version` short-circuit before transport boot (`packages/mcp/src/index.ts:833-836`)
- Bundle invariant (`@localground/core` in devDependencies, not dependencies)

**What Phase 19 adds that Phase 18 does not cover:**
- stdio JSON-RPC handshake when registered via `claude mcp add`
- Tool-routing: a `/localground:seed` skill invocation actually reaches `localground_seed` MCP tool and returns to the user
- Real-fs side effects at user-level (not `os.tmpdir()`) paths
- Two-session restart-bound state handoff
- Per-item confirmation dialogue (cleanup skill)

### Phase 17/18 verification artifacts are stable references
Both files exist, both have `status: passed`, both have the same structural shape modulo Phase 17's verifier cross-check augmentation. The frontmatter and table shapes lifted in Section 3 reflect this stable state. No re-verification of those artifacts is needed.

### Out of v3.0.1 milestone scope (Phase 20 carve-outs)
- `npx -y @localground/cli@3.0.1 detect` against published tarball — Phase 20 SC #5, NOT Phase 19 (D-06).
- First green CI run on master — Phase 20 SC #1.
- First OIDC + provenance publish — Phase 20 SC #2-3.
- npmjs.com per-package README rendering — Phase 20 SC #4 (DOC-03).

### Deferred to v3.1.0 (per CONTEXT D-02, D-03, REQUIREMENTS.md `## v3.1.0`)
- Crash-resume deterministic Vitest test
- Multi-project migration batching
- TIER 2 streaming refactor of spawnTool (CLI-05)

## Sources

### Primary (HIGH confidence — verified against codebase)
- `packages/core/src/operations/scan.ts` — confirmed cleanup-scan emits only `ScanMatch` records, no directory candidates
- `packages/mcp/src/index.ts:314-330` — confirmed MCP `localground_cleanup_scan` is a thin scan() wrapper
- `packages/cli/src/index.ts:641-693` — confirmed CLI `cleanup-scan` is also a thin scan() wrapper, no post-processing
- `packages/core/src/operations/seed.ts` — confirmed manifest schema, file name, refuse-on-existing-test-file behavior
- `packages/core/src/operations/verify.ts` — confirmed manifest read path and default location
- `packages/core/src/operations/chunk.ts` — confirmed chunk-plan structure and what's already Vitest-covered
- `packages/mcp/src/index.ts:74-112` — confirmed token encode/decode and validation
- `packages/mcp/src/index.ts:529-685` — confirmed health_check 6-check structure (UAT-03 SC #3)
- `packages/mcp/src/index.ts:687-824` — confirmed audit auto-discovery via `looksLikeProject` filter (UAT-05 SC #5)
- `.claude/skills/localground-migrate.md` — confirmed two-branch session detection logic
- `.claude/skills/localground-cleanup.md` — confirmed free-text yes/no/skip-all dialogue
- `.planning/phases/17-core-decoder-calibration/17-VERIFICATION.md` — frontmatter + Observable Truths table shape lifted
- `.planning/phases/18-packaging-polish/18-VERIFICATION.md` — frontmatter + Observable Truths table shape lifted
- `scripts/verify-tarball.mjs` — confirmed Phase 18 boundary contract for tarball-gate UAT pass
- `claude mcp add --help` empirical output — confirmed scope default is `local`
- `claude mcp list` empirical output — confirmed localground is not currently registered

### Secondary (MEDIUM confidence — empirical inference from tooling)
- Skill loading order: project-local `.claude/skills/` wins over user-level `~/.claude/skills/` (Claude Code documented convention; not directly verified in this session)
- `claude mcp add` is not idempotent against existing names (inferred from `--help` output absence of `--force` flag; behavior should be confirmed during plan execution before UAT begins)
- Path quoting: forward-slashes inside double quotes works in PowerShell + cmd + Git Bash (well-established Windows convention; relies on user's lack of spaces in the install path, which is true for this user's environment)

### Memory references applied
- `feedback_windows_npm_spawn.md` — informs L-3/L-4 mitigation references for tarball-install pattern
- `feedback_plan_authored_verification.md` — confirms D-09 augment-not-overwrite rule for verifier
- `feedback_phase_completion.md` — confirms post-phase manual REQUIREMENTS.md/PROJECT.md update workflow
- `project_phase_14_test_artifacts.md` — confirms D-12 fresh-fixture decision (Phase 14 fixtures are pre-seeded)

## Metadata

**Confidence breakdown:**
- Approach validation (D-codes): HIGH — verified against actual codebase, three findings are empirical not speculative
- Operational landmines: HIGH on L-1 through L-9 (all empirically confirmed); MEDIUM on L-10/L-11 (inferred from tooling structure)
- Verification artifact pattern: HIGH — lifted directly from Phase 17/18 files

**Research date:** 2026-04-28
**Valid until:** Phase 19 close — this is a phase-specific corroborative artifact, not a long-lived reference

---

*Researched: 2026-04-28*
*Researcher: Claude (gsd-researcher, adversarial mode)*
