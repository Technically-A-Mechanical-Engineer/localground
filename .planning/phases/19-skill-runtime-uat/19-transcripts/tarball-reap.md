# UAT-03 Tarball Replay: /localground:reap (post-migration 6-check health)

**Captured (witness):** 2026-06-28T18:47:20Z (launch) · **Skill run:** pending
**Target project:** C:/Users/rlasalle/Projects/lg-uat-19-dest-tarball/lg-uat-fixture-19-tarball
**MCP runtime:** TARBALL-INSTALL — `<os.tmpdir>/lg-uat-19-tarball-install/node_modules/@localground/mcp/dist/index.js` (swap @ 2026-06-28T17:32:34Z; reaped + recovered ~18:38Z)
**Driver:** Claude drives model-invocable `/localground:reap` via the Skill tool
**Acceptance:** 6-check array returned; seed manifest survived the migration

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

`/localground:reap` is **model-invocable** — COORDINATOR drove it via the Skill tool (ARGUMENTS = destination project path) under maintainer observation. Skill body loaded from `skills/reap/SKILL.md` (plugin namespace `localground:reap`), confirming command → plugin skill routing. This run **does** exercise the tarball MCP binary (unlike migrate Session 2): both tool calls below executed against PID 103716 (tarball — per the witness block above).

## Tool call: localground_detect (tarball runtime)

Reused the per-session witness `localground_detect` (this session, PID 103716, `isError:false`) — Windows/PowerShell, OneDrive present; the reap target's parent (`lg-uat-19-dest-tarball`) confirmed on **local** (non-cloud-synced) storage. Project under reap confirmed before proceeding (target unambiguous per checklist line 96).

## Tool call: localground_health_check (tarball runtime)

**Envelope:**
```json
{
  "projectPath": "C:/Users/rlasalle/Projects/lg-uat-19-dest-tarball/lg-uat-fixture-19-tarball",
  "sourcePath": "C:/Users/rlasalle/OneDrive - ThermoTek, Inc/Documents/lg-uat-fixture-19-tarball"
}
```
(`sourcePath` supplied so check #6 runs; `manifestPath` omitted → defaults to `.localground-seed-manifest.json` in `projectPath`.)

**Response — full `checks` array, all 6 entries verbatim:**
```json
{
  "checks": [
    { "check": "git_integrity",           "status": "WARN", "detail": "Uncommitted changes: ?? .localground-seed-manifest.json\n?? .localground-seed-test\n" },
    { "check": "placeholder_files",        "status": "PASS", "detail": "No placeholder files detected in 20 files" },
    { "check": "cloud_sync",               "status": "PASS", "detail": "Project is on local (non-cloud-synced) storage" },
    { "check": "path_hash_validity",       "status": "PASS", "detail": "No path-hash entries found for this project path" },
    { "check": "seed_markers",             "status": "PASS", "detail": "All 2 markers verified" },
    { "check": "source_target_alignment",  "status": "PASS", "detail": "Source and target match: 72 files, 31650 bytes" }
  ]
}
```
`isError:false`. 6 checks returned.

**SC3 note ("invokes both"):** the skill did not need a separate `localground_verify` call because `seed_markers` returned PASS (skill step 3 only calls `verify` when seed_markers is N/A or FAIL). The `seed_markers` check is itself the `verify()` code path invoked internally by `health_check` — `"All 2 markers verified"` is the verify result surfaced through health_check. SC3 satisfied by the single `health_check` call, exactly as on local-dist.

## Skill output to user — traffic-light table

```
Post-Migration Health Check: lg-uat-fixture-19-tarball

WARN  Git integrity         Uncommitted: ?? .localground-seed-manifest.json, ?? .localground-seed-test
PASS  Placeholder files     No placeholder files detected in 20 files
PASS  Cloud sync status     Project is on local (non-cloud-synced) storage
PASS  Path-hash validity    No path-hash entries found for this project path
PASS  Seed markers          All 2 markers verified
PASS  Source/target align   Source and target match: 72 files, 31650 bytes

Overall: YELLOW (6 checks: 5 PASS, 1 WARN, 0 FAIL)
```

## Skill interpretation

**Overall: YELLOW — one item to review; migration integrity itself is clean.**

- **WARN — Git integrity** → the two seed markers (`.localground-seed-manifest.json`, `.localground-seed-test`) show as untracked (`??`). **Expected:** `/localground:seed` plants these as pre-migration verification artifacts and intentionally does not commit them; reap correctly flags working-tree state, not corruption. *Recommendation:* remove via `/localground:cleanup` once health is confirmed (or `.gitignore`). No corrective action for migration correctness.
- **PASS — Seed markers** → both markers checksum-verified at the destination → seed manifest + test file survived the migrate intact (L-6).
- **PASS — Source/target alignment** → byte-exact match (72 files, 31650 bytes) between the OneDrive source and the local destination — no truncation or placeholder substitution.
- **PASS — Cloud sync / Placeholder / Path-hash** → local storage, no OneDrive placeholders, no stale path-hash session dir for this fresh fixture.

**Verdict:** Migration verified. The lone YELLOW is normal post-migration housekeeping (seed-marker cleanup), not a data-integrity problem. SC3 satisfied: the report maps its one non-PASS finding to an actionable recommendation. **Identical outcome to the local-dist reap** (`reap.md`).

## Manifest cross-check (post-run)

```
marker count = 2
marker types = ['test-file', 'git-tag']
manifest survived migration = True
```
(`jq` absent → `python`.) Marker count = **2** (test-file + git-tag) — confirms the seed manifest survived migration with both markers intact (L-6).

## Cross-run honesty note (byte total)

Source/target alignment reports **31650 bytes** here vs **31508 bytes** on local-dist `reap.md`. This is a *cross-fixture* difference between two independently-built fresh L-5 fixtures (different file contents), NOT a within-run mismatch — within THIS run, source and target both = 72 files / 31650 bytes, which is exactly what check #6 validates (PASS). File count (72) matches local-dist.
