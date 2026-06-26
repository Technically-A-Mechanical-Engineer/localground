# UAT-05 Transcript: /localground:verify

**Captured:** 2026-06-26T21:45:19Z
**Mode:** auto-discovery (no projectPaths argument)
**MCP runtime:** local-dist (D-04 inner loop)
**Invocation mode:** `/localground:verify` is model-invocable — COORDINATOR drove the command under maintainer observation (maintainer typed "start UAT-05").

## Skill invocation prompt

The `localground:verify` plugin skill was invoked with:

```
Run /localground:verify to audit my entire Claude Code environment. Auto-discovery mode (no projectPaths argument).
```

The skill body loaded from `skills/verify/SKILL.md` (plugin namespace `localground:verify`), then called `localground_audit` with no arguments (auto-discovery), per skill step 1.

## Tool call: localground_audit

**Envelope:** `localground_audit` with no `projectPaths` argument (auto-discovery mode).

**Response — `summary` + full `projects` array verbatim:**

```json
{
  "summary": {
    "projectsAudited": 15,
    "totalChecks": 60,
    "pass": 29,
    "warn": 23,
    "fail": 8,
    "overallStatus": "FAIL"
  },
  "projects": [
    { "projectPath": "C:\\Users\\rlasalle\\OneDrive - ThermoTek, Inc\\Documents\\Projects\\Claude-Home", "checks": [
      { "check": "git_integrity", "status": "FAIL", "detail": "not_a_git_repo" },
      { "check": "placeholder_files", "status": "PASS", "detail": "None" },
      { "check": "cloud_sync", "status": "WARN", "detail": "Cloud-synced (onedrive)" },
      { "check": "stale_references", "status": "WARN", "detail": "6 stale references in 2 files" } ] },
    { "projectPath": "C:\\Users\\rlasalle\\OneDrive - ThermoTek, Inc\\Documents\\Projects\\OB1", "checks": [
      { "check": "git_integrity", "status": "WARN", "detail": "Uncommitted changes" },
      { "check": "placeholder_files", "status": "PASS", "detail": "None" },
      { "check": "cloud_sync", "status": "WARN", "detail": "Cloud-synced (onedrive)" },
      { "check": "stale_references", "status": "WARN", "detail": "54 stale references in 2930 files" } ] },
    { "projectPath": "C:\\Users\\rlasalle\\OneDrive - ThermoTek, Inc\\Documents\\Projects\\Org-Open-Brain", "checks": [
      { "check": "git_integrity", "status": "FAIL", "detail": "not_a_git_repo" },
      { "check": "placeholder_files", "status": "PASS", "detail": "None" },
      { "check": "cloud_sync", "status": "WARN", "detail": "Cloud-synced (onedrive)" },
      { "check": "stale_references", "status": "WARN", "detail": "8 stale references in 226 files" } ] },
    { "projectPath": "C:\\Users\\rlasalle\\OneDrive - ThermoTek, Inc\\Documents\\Projects\\QMS-Document-Processor", "checks": [
      { "check": "git_integrity", "status": "WARN", "detail": "Uncommitted changes" },
      { "check": "placeholder_files", "status": "PASS", "detail": "None" },
      { "check": "cloud_sync", "status": "WARN", "detail": "Cloud-synced (onedrive)" },
      { "check": "stale_references", "status": "WARN", "detail": "52 stale references in 613 files" } ] },
    { "projectPath": "C:\\Users\\rlasalle\\OneDrive - ThermoTek, Inc\\Documents\\Projects\\R Drive NCM Playground1", "checks": [
      { "check": "git_integrity", "status": "WARN", "detail": "Uncommitted changes" },
      { "check": "placeholder_files", "status": "PASS", "detail": "None" },
      { "check": "cloud_sync", "status": "WARN", "detail": "Cloud-synced (onedrive)" },
      { "check": "stale_references", "status": "WARN", "detail": "11 stale references in 71 files" } ] },
    { "projectPath": "C:\\Users\\rlasalle\\Projects\\Claude-Home", "checks": [
      { "check": "git_integrity", "status": "FAIL", "detail": "not_a_git_repo" },
      { "check": "placeholder_files", "status": "PASS", "detail": "None" },
      { "check": "cloud_sync", "status": "PASS", "detail": "Local storage" },
      { "check": "stale_references", "status": "WARN", "detail": "38 stale references in 471 files" } ] },
    { "projectPath": "C:\\Users\\rlasalle\\Projects\\lg-uat-19-dest", "checks": [
      { "check": "git_integrity", "status": "FAIL", "detail": "not_a_git_repo" },
      { "check": "placeholder_files", "status": "PASS", "detail": "None" },
      { "check": "cloud_sync", "status": "PASS", "detail": "Local storage" },
      { "check": "stale_references", "status": "WARN", "detail": "2 stale references in 19 files" } ] },
    { "projectPath": "C:\\Users\\rlasalle\\Projects\\localground", "checks": [
      { "check": "git_integrity", "status": "PASS", "detail": "OK" },
      { "check": "placeholder_files", "status": "PASS", "detail": "None" },
      { "check": "cloud_sync", "status": "PASS", "detail": "Local storage" },
      { "check": "stale_references", "status": "WARN", "detail": "358 stale references in 141 files" } ] },
    { "projectPath": "C:\\Users\\rlasalle\\Projects\\mcp-sql", "checks": [
      { "check": "git_integrity", "status": "FAIL", "detail": "not_a_git_repo" },
      { "check": "placeholder_files", "status": "PASS", "detail": "None" },
      { "check": "cloud_sync", "status": "PASS", "detail": "Local storage" },
      { "check": "stale_references", "status": "PASS", "detail": "Clean (29 files scanned)" } ] },
    { "projectPath": "C:\\Users\\rlasalle\\Projects\\OB1", "checks": [
      { "check": "git_integrity", "status": "WARN", "detail": "Uncommitted changes" },
      { "check": "placeholder_files", "status": "PASS", "detail": "None" },
      { "check": "cloud_sync", "status": "PASS", "detail": "Local storage" },
      { "check": "stale_references", "status": "WARN", "detail": "93 stale references in 3443 files" } ] },
    { "projectPath": "C:\\Users\\rlasalle\\Projects\\open-engine", "checks": [
      { "check": "git_integrity", "status": "FAIL", "detail": "not_a_git_repo" },
      { "check": "placeholder_files", "status": "PASS", "detail": "None" },
      { "check": "cloud_sync", "status": "PASS", "detail": "Local storage" },
      { "check": "stale_references", "status": "PASS", "detail": "Clean (0 files scanned)" } ] },
    { "projectPath": "C:\\Users\\rlasalle\\Projects\\open-skills", "checks": [
      { "check": "git_integrity", "status": "FAIL", "detail": "not_a_git_repo" },
      { "check": "placeholder_files", "status": "PASS", "detail": "None" },
      { "check": "cloud_sync", "status": "PASS", "detail": "Local storage" },
      { "check": "stale_references", "status": "PASS", "detail": "Clean (0 files scanned)" } ] },
    { "projectPath": "C:\\Users\\rlasalle\\Projects\\Org-Open-Brain", "checks": [
      { "check": "git_integrity", "status": "FAIL", "detail": "not_a_git_repo" },
      { "check": "placeholder_files", "status": "PASS", "detail": "None" },
      { "check": "cloud_sync", "status": "PASS", "detail": "Local storage" },
      { "check": "stale_references", "status": "WARN", "detail": "15 stale references in 231 files" } ] },
    { "projectPath": "C:\\Users\\rlasalle\\Projects\\QMS-Document-Processor", "checks": [
      { "check": "git_integrity", "status": "WARN", "detail": "Uncommitted changes" },
      { "check": "placeholder_files", "status": "PASS", "detail": "None" },
      { "check": "cloud_sync", "status": "PASS", "detail": "Local storage" },
      { "check": "stale_references", "status": "WARN", "detail": "58 stale references in 612 files" } ] },
    { "projectPath": "C:\\Users\\rlasalle\\Projects\\R-Drive-NCM-Playground1", "checks": [
      { "check": "git_integrity", "status": "WARN", "detail": "Uncommitted changes" },
      { "check": "placeholder_files", "status": "PASS", "detail": "None" },
      { "check": "cloud_sync", "status": "PASS", "detail": "Local storage" },
      { "check": "stale_references", "status": "WARN", "detail": "14 stale references in 91 files" } ] }
  ]
}
```

`isError: false`. Response carries `summary` (projectsAudited 15, totalChecks 60, pass 29, warn 23, fail 8, overallStatus FAIL) + a `projects` array of 15 per-project results, each with a 4-entry `checks` array. Audit is read-only (composes detect + per-project health checks).

## Skill output to user — traffic-light table per project

```
Environment Audit  (15 projects)

[OneDrive — cloud-synced copies]
C:/…/OneDrive…/Documents/Projects/Claude-Home
  FAIL  git integrity     not a git repo
  PASS  placeholder files None
  WARN  cloud sync        Cloud-synced (onedrive)
  WARN  stale references  6 in 2 files
C:/…/OneDrive…/Documents/Projects/OB1
  WARN  git integrity     Uncommitted changes
  PASS  placeholder files None
  WARN  cloud sync        Cloud-synced (onedrive)
  WARN  stale references  54 in 2930 files
C:/…/OneDrive…/Documents/Projects/Org-Open-Brain
  FAIL  git integrity     not a git repo
  PASS  placeholder files None
  WARN  cloud sync        Cloud-synced (onedrive)
  WARN  stale references  8 in 226 files
C:/…/OneDrive…/Documents/Projects/QMS-Document-Processor
  WARN  git integrity     Uncommitted changes
  PASS  placeholder files None
  WARN  cloud sync        Cloud-synced (onedrive)
  WARN  stale references  52 in 613 files
C:/…/OneDrive…/Documents/Projects/R Drive NCM Playground1
  WARN  git integrity     Uncommitted changes
  PASS  placeholder files None
  WARN  cloud sync        Cloud-synced (onedrive)
  WARN  stale references  11 in 71 files

[Local storage]
C:/Users/rlasalle/Projects/Claude-Home
  FAIL  git integrity     not a git repo
  PASS  placeholder files None
  PASS  cloud sync        Local storage
  WARN  stale references  38 in 471 files
C:/Users/rlasalle/Projects/lg-uat-19-dest
  FAIL  git integrity     not a git repo
  PASS  placeholder files None
  PASS  cloud sync        Local storage
  WARN  stale references  2 in 19 files
C:/Users/rlasalle/Projects/localground
  PASS  git integrity     OK
  PASS  placeholder files None
  PASS  cloud sync        Local storage
  WARN  stale references  358 in 141 files
C:/Users/rlasalle/Projects/mcp-sql
  FAIL  git integrity     not a git repo
  PASS  placeholder files None
  PASS  cloud sync        Local storage
  PASS  stale references  Clean (29 files scanned)
C:/Users/rlasalle/Projects/OB1
  WARN  git integrity     Uncommitted changes
  PASS  placeholder files None
  PASS  cloud sync        Local storage
  WARN  stale references  93 in 3443 files
C:/Users/rlasalle/Projects/open-engine
  FAIL  git integrity     not a git repo
  PASS  placeholder files None
  PASS  cloud sync        Local storage
  PASS  stale references  Clean (0 files scanned)
C:/Users/rlasalle/Projects/open-skills
  FAIL  git integrity     not a git repo
  PASS  placeholder files None
  PASS  cloud sync        Local storage
  PASS  stale references  Clean (0 files scanned)
C:/Users/rlasalle/Projects/Org-Open-Brain
  FAIL  git integrity     not a git repo
  PASS  placeholder files None
  PASS  cloud sync        Local storage
  WARN  stale references  15 in 231 files
C:/Users/rlasalle/Projects/QMS-Document-Processor
  WARN  git integrity     Uncommitted changes
  PASS  placeholder files None
  PASS  cloud sync        Local storage
  WARN  stale references  58 in 612 files
C:/Users/rlasalle/Projects/R-Drive-NCM-Playground1
  WARN  git integrity     Uncommitted changes
  PASS  placeholder files None
  PASS  cloud sync        Local storage
  WARN  stale references  14 in 91 files
```

## Skill output to user — overall summary

```
Overall: RED (FAIL) — 60 checks across 15 projects: 29 PASS, 23 WARN, 8 FAIL
  8 FAIL  — all git_integrity "not a git repo"
  23 WARN — cloud_sync (5 OneDrive copies) + uncommitted changes (6) + stale references (12)
  29 PASS — placeholder_files clean everywhere; localground itself git-clean + local
```

## Skill recommendations

Each non-PASS finding mapped to an actionable next step:

1. **Cloud-synced projects (5, WARN) → run `/localground:seed` then `/localground:migrate`.** The 5 copies under `OneDrive - ThermoTek, Inc\Documents\Projects\` (Claude-Home, OB1, Org-Open-Brain, QMS-Document-Processor, R Drive NCM Playground1) are on cloud-synced storage — exactly what LocalGround exists to fix. Seed markers, then migrate each to a local path (most already have a local twin under `C:\Users\rlasalle\Projects\`, so the migration may already be largely done — verify and retire the OneDrive copies). This is the single highest-value action.

2. **`not_a_git_repo` (8, FAIL) → `git init` if version control is wanted, else acknowledge as intentional.** FAIL here means "no `.git` directory." Several are legitimately non-git workspaces (e.g., `Claude-Home` general workspace, `lg-uat-19-dest` is a UAT throwaway, `mcp-sql`/`open-engine`/`open-skills` are sandboxes). Recommendation: `git init` + initial commit for any you want versioned; for the rest this FAIL is expected and can be ignored. (The toolkit cannot know intent — it flags, the maintainer judges.)

3. **Uncommitted changes (6, WARN) → commit when ready.** OB1, QMS-Document-Processor, R-Drive-NCM-Playground1 (both OneDrive and local twins) have dirty working trees. Normal in-flight work; commit at a natural break.

4. **Stale references (12, WARN) → run `/localground:cleanup <project>` to review.** Most projects carry stale cloud-path references in config/docs. Note `localground` itself shows 358 in 141 files — these are overwhelmingly intentional OneDrive path *examples* in the toolkit's own prompts, transcripts, and tests (the project is a migration toolkit), so cleanup there is optional/expected-noise. For the real working projects (OB1, QMS-Document-Processor, etc.), `/localground:cleanup` lets you review and update references left over from cloud→local moves.

5. **PASS items → no action.** `placeholder_files` is clean across all 15 (no OneDrive Files-On-Demand stubs). `localground` is the only fully-green-except-stale-refs project (git OK + local + no placeholders).

## Auto-discovery filter check (L-11 known reading)

- **Filesystem root + home dir excluded (correct, per `looksLikeProject`, index.ts:712-718).** `detect()` enumerates `C:\` (filesystem root) and `C:\Users\rlasalle` (home dir) as raw entries, but `localground_audit`'s auto-discovery applies `.filter(looksLikeProject)`, so neither appears among the 15 audited projects. This is intended behavior, NOT a missing-project defect.
- **6/23 null path-hash decodes (carried from UAT-01) assessed here — not errors.** `detect()` reports 23 `~/.claude/projects/` path-hash entries, 6 of which decode to `null` (deleted/renamed folders: `--claude-skills`, `Documents-Claude-Projects`, `Training-With-Amit-2026-03-29`, `claude-code-cloud-sync-migration`, and the `0159…CC_CLI` underscore-collision case + one more). These null-decoding hashes correctly do NOT appear as audited projects — `audit` only audits resolvable, existing project directories. So the null decodes are surfaced as non-fatal detect observations, never as audit FAILs. Confirmed: the audit's 8 FAILs are all `not_a_git_repo` on real, existing directories — none stem from path-hash decode failures. (Decode-calibration backlog item 999.7 tracks the trailing-edge prefix-match defect separately; UAT-05 confirms it has zero impact on the audit path.)
- **Count note:** `audit` returned 15 projects; this includes `open-engine` (a local sandbox) which post-dates the UAT-03 detect snapshot. No root/home/null-hash entries leaked in.

**SC5 satisfied:** `/localground:verify` invoked `localground_audit` (auto-discovery), rendered a per-project traffic-light report + an overall RED roll-up, and mapped every WARN/FAIL class to a named, actionable next step (`/localground:seed`+`/localground:migrate`, `git init`, commit, `/localground:cleanup`). RED overall is correct behavior — the toolkit detected real environment issues; the UAT criterion is findings→recommendations mapping, not all-pass.
