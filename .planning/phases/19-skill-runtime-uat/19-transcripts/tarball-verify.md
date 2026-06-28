# UAT-05 Tarball Replay: /localground:verify (environment audit)

**Captured (witness):** 2026-06-28T18:47:20Z (launch) · **Skill run:** pending
**Scope:** environment/dest audit — note: audit surface includes residual 19-01..03 + plugintest fixtures (expected, NOT a runtime delta, per SR-8)
**MCP runtime:** TARBALL-INSTALL — `<os.tmpdir>/lg-uat-19-tarball-install/node_modules/@localground/mcp/dist/index.js` (swap @ 2026-06-28T17:32:34Z; reaped + recovered ~18:38Z)
**Driver:** Claude drives model-invocable `/localground:verify` via the Skill tool
**Acceptance:** `summary` + `projects` keys present; recommendations mapped

## Tarball runtime witness

Captured at session **launch** (Relaunch B — the post-recovery "try 3" session) and stamped into all four Session-B transcripts before any skill ran, so the Phase-C restore cannot retroactively poison the proof (EH-02). Immutable.

- **Launch command:** `claude --plugin-dir "C:/Users/rlasalle/Projects/localground"`, cwd = `C:/Users/rlasalle/Projects/lg-uat-19-dest-tarball` (Phase B relaunches from the destination).
- **Live MCP server process:** PID **103716**, `CreationDate 2026-06-28 13:47:20 CDT = 18:47:20Z`, CommandLine = `node C:/Users/rlasalle/AppData/Local/Temp/lg-uat-19-tarball-install/node_modules/@localground/mcp/dist/index.js`.
  - ✅ tarball node alive.
  - ✅ NO `node.exe` serving `packages/mcp/dist/index.js` (other live `node.exe`: Adobe CC Experience + powerautomate-mcp — both unrelated).
  - ✅ launch **18:47:20Z > swap 17:32:34Z** **and > recovery ~18:38Z** → this node serves the RE-INSTALLED tarball, not a stale pre-reap process.
- **`claude mcp get localground`:** Scope: User config · **Status: √ Connected** (true-positive this session; Relaunch A's identical probe false-negatived) · Args = `…/lg-uat-19-tarball-install/node_modules/@localground/mcp/dist/index.js` · single entry.
- **5 `/localground:*` commands:** mounted via `--plugin-dir`; confirmed-on-use when `/localground:migrate` activates as genuine `plugin:localground:migrate` (ARGUMENTS-carrying, not prose reinterpretation).
- **Live-binding proof:** `localground_detect` executed against PID 103716, `isError:false`, returned valid environment JSON (windows/powershell; OneDrive synced; 19 projects; 26 path-hashes, 7 `decodedPath:null` residual per L-11). Live tarball binary confirmed serving.
- **SR-6 (load-bearing):** the tarball install dir was purged across the Phase A→B gap (`MODULE_NOT_FOUND`, zero live localground node, true-negative `claude mcp get`) and recovered ~18:38Z by reinstalling the **same byte-identical** `.tgz` (48,701 B; NOT re-packed). Registration unchanged. All six transcripts therefore exercise one artifact; this session's node post-dates the recovery (above).

---

## Skill invocation

`/localground:verify` is **model-invocable** — COORDINATOR drove it via the Skill tool (auto-discovery, no `projectPaths`) under maintainer observation. Skill body loaded from `skills/verify/SKILL.md` (plugin namespace `localground:verify`), then called `localground_audit` (skill step 1). Live tarball-binary call (PID 103716).

## Tool call: localground_audit (tarball runtime)

**Envelope:** `localground_audit` with no `projectPaths` (auto-discovery). `isError:false`.

**`summary` (verbatim):**
```json
{ "projectsAudited": 17, "totalChecks": 68, "pass": 32, "warn": 26, "fail": 10, "overallStatus": "FAIL" }
```

**`projects` (17 entries × 4 checks — compact, status + detail):**
```
[OneDrive — cloud-synced]
Claude-Home (OD)             FAIL git(not_a_git_repo) · PASS placeholder · WARN cloud(onedrive) · WARN stale(6/2)
OB1 (OD)                     WARN git(uncommitted)    · PASS placeholder · WARN cloud(onedrive) · WARN stale(54/2930)
Org-Open-Brain (OD)          FAIL git(not_a_git_repo) · PASS placeholder · WARN cloud(onedrive) · WARN stale(8/226)
QMS-Document-Processor (OD)  WARN git(uncommitted)    · PASS placeholder · WARN cloud(onedrive) · WARN stale(52/613)
R Drive NCM Playground1 (OD) WARN git(uncommitted)    · PASS placeholder · WARN cloud(onedrive) · WARN stale(11/71)

[Local storage]
Claude-Home                  FAIL git(not_a_git_repo) · PASS placeholder · PASS cloud(local) · WARN stale(38/471)
lg-uat-19-dest               FAIL git(not_a_git_repo) · PASS placeholder · PASS cloud(local) · WARN stale(2/19)
lg-uat-19-dest-tarball ★     FAIL git(not_a_git_repo) · PASS placeholder · PASS cloud(local) · WARN stale(4/20)
localground                  WARN git(uncommitted)    · PASS placeholder · PASS cloud(local) · WARN stale(442/152)
localground/packages/mcp ★   FAIL git(not_a_git_repo) · PASS placeholder · PASS cloud(local) · WARN stale(1/3)
mcp-sql                      FAIL git(not_a_git_repo) · PASS placeholder · PASS cloud(local) · PASS stale(clean,29)
OB1                          WARN git(uncommitted)    · PASS placeholder · PASS cloud(local) · WARN stale(93/3443)
open-engine                  FAIL git(not_a_git_repo) · PASS placeholder · PASS cloud(local) · PASS stale(clean,0)
open-skills                  FAIL git(not_a_git_repo) · PASS placeholder · PASS cloud(local) · PASS stale(clean,0)
Org-Open-Brain               FAIL git(not_a_git_repo) · PASS placeholder · PASS cloud(local) · WARN stale(15/231)
QMS-Document-Processor       WARN git(uncommitted)    · PASS placeholder · PASS cloud(local) · WARN stale(58/612)
R-Drive-NCM-Playground1      WARN git(uncommitted)    · PASS placeholder · PASS cloud(local) · WARN stale(14/91)

★ = NEW vs local-dist UAT-05 (residual/structural — expected per SR-8, NOT a runtime delta)
```

## Skill output to user — overall roll-up

```
Overall: RED (FAIL) — 68 checks across 17 projects: 32 PASS, 26 WARN, 10 FAIL
  10 FAIL — all git_integrity "not_a_git_repo"
  26 WARN — cloud_sync (5 OneDrive) + git uncommitted (7) + stale_references (14)
  32 PASS — placeholder_files clean ×17; cloud_sync local ×12; stale clean ×3 (mcp-sql, open-engine, open-skills)
```
(Counts reconcile: 32+26+10 = 68 = 17×4; FAIL=10 all not_a_git_repo; WARN 5+7+14=26.)

## Skill recommendations (each non-PASS class → actionable next step)

1. **Cloud-synced (5, WARN) → `/localground:seed` then `/localground:migrate`.** The 5 OneDrive copies under `…\Documents\Projects\` (Claude-Home, OB1, Org-Open-Brain, QMS, R Drive) — the toolkit's core use case. Most have a local twin under `~\Projects\`; verify and retire the OneDrive copies. Highest-value action.
2. **`not_a_git_repo` (10, FAIL) → `git init` if versioning wanted, else acknowledge intentional.** Several are legitimately non-git (Claude-Home workspace, the two `lg-uat-19-dest*` UAT throwaways, `mcp-sql`/`open-engine`/`open-skills` sandboxes, `packages/mcp` is a subdir of the git-tracked `localground`). Tool flags; maintainer judges intent.
3. **Uncommitted changes (7, WARN) → commit at a natural break.** Includes `localground` itself (this session's in-flight transcript writes) + OB1/QMS/R-Drive twins.
4. **Stale references (14, WARN) → `/localground:cleanup <project>` to review.** `localground` shows 442/152 — overwhelmingly intentional OneDrive path *examples* in the toolkit's own prompts/transcripts/tests (incl. the 6 new tarball transcripts), so optional/expected-noise. Real working projects (OB1, QMS) benefit from review.
5. **PASS → no action.** placeholder_files clean ×17; localground git-WARN-only-by-active-work + local.

## Delta-from-local-dist analysis (15 → 17 projects)

- **+`lg-uat-19-dest-tarball`** — this arc's migrate destination (created Relaunch A). Expected.
- **+`localground/packages/mcp`** — the mcp package subdir now surfaced as a discoverable project (the tarball was packed from here). Structural, expected.
- **`localground` git PASS→WARN** — uncommitted changes = this session's transcript writes + checklist edits. Expected during active work, not corruption.
- **`localground` stale 358/141 → 442/152** — the 6 new tarball transcripts add intentional OneDrive path examples. Expected toolkit noise.
- **Conclusion:** every delta is an expected residual / active-work artifact; the tarball binary produced the **same audit structure and behavior** as local-dist `verify.md`. No runtime delta.

## Auto-discovery filter check (L-11)

Filesystem root (`C:\`) + home dir (`C:\Users\rlasalle`) correctly excluded from the 17 audited projects (`looksLikeProject` filter). Null-decoding path-hash entries (deleted/renamed folders) do not appear as audited projects — `audit` only audits resolvable, existing dirs. All 10 FAILs are `not_a_git_repo` on real, existing directories — none stem from path-hash decode failures. Same calibration as local-dist UAT-05.

## Verdict (SC5, tarball runtime)

`/localground:verify` on the tarball runtime invoked `localground_audit` (auto-discovery), returned `summary` + `projects` keys, rendered a per-project traffic-light report + an overall RED roll-up, and mapped every WARN/FAIL class to a named actionable next step. RED overall is correct behavior — the toolkit detected real environment issues; the UAT criterion is findings→recommendations mapping, not all-pass. **SC5 satisfied — identical behavior to local-dist `verify.md`** (deltas are expected residuals, not runtime differences).
