---
phase: 19-skill-runtime-uat
plan: 08
subsystem: plugin
tags: [plugin, skill-registration, gap-closure, uat, mcp, adversarial-review]

# Dependency graph
requires:
  - phase: 19-skill-runtime-uat
    plan: 01
    provides: "loose-skill registration defect discovered (root cause); seeded fixture + MCP --scope user registration"
  - phase: 19-skill-runtime-uat
    plan: 02
    provides: "defect confirmed at the command layer ('Unknown command: /localground:migrate') — the symptom this plan fixes"
provides:
  - "working `localground` Claude Code PLUGIN at repo root (.claude-plugin/plugin.json + skills/<verb>/SKILL.md ×5) — /localground:seed|migrate|reap|cleanup|verify register and route"
  - "UAT-01 re-confirmed via a REAL /localground:seed command (not a manually-driven tool call) — 19-transcripts/plugin-registration.md"
  - "UAT-02..05 re-runs unblocked (skill-invocation layer now functional)"
  - "NO plugin .mcp.json shipped (C-1) — bundled .mcp.json + end-user auto-register deferred to Phase 20"
affects: [phase-19-02-migrate, phase-19-03-reap, phase-19-04-cleanup, phase-19-05-verify, phase-19-06-tarball-replay, phase-19-07-finalize, phase-20-release-pipeline]

# Tech tracking
tech-stack:
  added:
    - "Claude Code plugin packaging: .claude-plugin/plugin.json (name=localground) + skills/<verb>/SKILL.md directory-per-skill"
  patterns:
    - "Plugin skill command name derives from the DIRECTORY name (skills/seed -> /localground:seed); frontmatter `name:` is display-only for this layout (omitted)"
    - "disable-model-invocation: true protects deletion-capable skills (migrate, cleanup) from model auto-invocation while keeping them user-invocable (L-2)"
    - "No bundled .mcp.json during UAT (C-1): a plugin .mcp.json auto-starts on load and would spawn a 2nd competing MCP server; UAT relies on the existing --scope user local-dist server"
    - "Guarded deletion outside the repo: list -> self-contained identity verify -> timestamped backup -> maintainer approval (Codex needs-attention mitigation)"

key-files:
  created:
    - .claude-plugin/plugin.json
    - skills/seed/SKILL.md
    - skills/migrate/SKILL.md
    - skills/reap/SKILL.md
    - skills/cleanup/SKILL.md
    - skills/verify/SKILL.md
    - .planning/phases/19-skill-runtime-uat/19-transcripts/plugin-registration.md
    - .planning/phases/19-skill-runtime-uat/19-08-SUMMARY.md
  modified:
    - .planning/phases/19-skill-runtime-uat/19-UAT.md
    - README.md
    - scripts/verify-tarball.mjs
  deleted:
    - .claude/skills/localground-seed.md
    - .claude/skills/localground-migrate.md
    - .claude/skills/localground-reap.md
    - .claude/skills/localground-cleanup.md
    - .claude/skills/localground-verify.md
    - .claude/skills/SKILL.md
    - "~/.claude/skills/localground-*.md ×5 + ~/.claude/skills/SKILL.md (outside repo; guarded; backed up to ~/.claude/_localground-backup-20260625-210050)"

key-decisions:
  - "D-A: plugin at REPO ROOT (loads via `claude --plugin-dir <repo>`; coexists with packages/)"
  - "D-B / C-1: ship NO plugin .mcp.json in 19-08 — a bundled .mcp.json auto-starts on plugin load and would spawn a 2nd `localground` server competing with the --scope user local-dist one; UAT uses local-dist only"
  - "D-C / H-4: distribution channel + bundled .mcp.json + end-user auto-register validation deferred to Phase 20 (maintainer decision 2026-06-25)"
  - "H-1 + Task 1 doc delta: SKILL.md `name:` is display-only (NOT command-deriving) for the skills/<dir>/ layout; the earlier /localground:localground-seed risk was overstated. `name:` omitted anyway (clean label + gate passes)"
  - "L-2: disable-model-invocation preserved on BOTH migrate AND cleanup (verified present in both loose sources); identity gate (present in migrate+cleanup, absent in seed/reap/verify) not just count==2"
  - "Codex needs-attention: guarded ~/.claude deletion (list -> self-contained name-frontmatter identity -> backup -> approval); orphan ~/.claude/skills/SKILL.md covered by exact path, glob never widened"
  - "Deviation: backup relocated from ~/.claude/skills/_localground-backup-<ts> to ~/.claude/_localground-backup-<ts> — a backup containing SKILL.md under skills/ registers as a PHANTOM skill (recursive scan); the 4 verification lenses missed this"

requirements-completed: [UAT-01]

# Metrics
duration: ~1 session (Tasks 1-3 pre-restart + Task 4 post --plugin-dir restart)
completed: 2026-06-25
---

# Phase 19 Plan 08: Plugin Restructure (D-18 gap-closure) — Summary

**The five `/localground:*` skills are now invocable. Root cause: they shipped as loose `.claude/skills/*.md` files, which Claude Code never registers. Fix: packaged them as a repo-root plugin (`.claude-plugin/plugin.json` + `skills/<verb>/SKILL.md`), shipping no `.mcp.json` (C-1). After a `--plugin-dir` restart, all five commands register and a REAL `/localground:seed` routed end-to-end to its MCP tools — UAT-01 re-confirmed; UAT-02..05 unblocked.**

## How this plan ran

Interactive execution (solo COORDINATOR arc, not a gsd-executor subagent). The plan itself was revised before execution: 8 review findings (1 cross-model Codex `needs-attention` + 7 from a 4-lens adversarial workflow) were applied, then re-verified (3 lenses PASS, the safety lens caught two guarded-deletion defects which were fixed, then a focused safety re-check PASSed). Tasks 1-3 ran pre-restart; **Task 4 required a Claude Code restart** (`claude --plugin-dir "C:/Users/rlasalle/Projects/localground"`) because a newly-created plugin only loads at session start.

## Accomplishments (by task)

- **Task 1 — schema verified from official docs.** plugin.json: only `name` effectively required (namespace + identifier); `description` recommended; `version`/`author` optional. Command = skill DIRECTORY name, namespaced by plugin. Load = `claude --plugin-dir`; reload (edits only) = `/reload-plugins`; validator = `claude plugin validate`. **Doc delta:** SKILL.md `name:` is a display label and does NOT change the command for the `skills/<dir>/` layout (only the plugin-root single-skill layout uses it for invocation) — so the earlier claude-code-guide claim that a verbatim `name: localground-seed` would yield `/localground:localground-seed` was **overstated**. `name:` omitted anyway for a clean label.
- **Task 2 — plugin structure created.** `.claude-plugin/plugin.json` (name=localground, v3.0.1) + 5 `skills/<verb>/SKILL.md` with bodies lifted **verbatim** (D-17 observational scope), `name:` omitted, `disable-model-invocation: true` preserved on migrate + cleanup only. **No `.mcp.json`** (C-1). `claude plugin validate .` → **passed** (one benign warning: root `CLAUDE.md` isn't loaded as plugin context — correct, it's the project's own file).
- **Task 3 — dead artifacts removed + docs corrected.** Repo loose `.claude/skills/localground-*.md` (×5) + the dead `.claude/skills/SKILL.md` "index" removed (git-recoverable; committed as renames into `skills/<verb>/`). User-level `~/.claude/skills/localground-*.md` + `SKILL.md` removed under the **guarded** procedure (listed, self-contained identity-verified via frontmatter `name:`/header, md5-backed-up, maintainer-approved). 19-UAT.md downgraded to honest 0/5 (SC1 PENDING) pre-restart. `scripts/verify-tarball.mjs` FORBIDDEN_PREFIX += `skills/`, `.claude-plugin/`. README given a minimal plugin-invocation note (install docs deferred to Phase 20).
- **Task 4 — re-test gate (post-restart).** C-1 pre-check: `claude mcp list` showed exactly one `localground` → `packages/mcp/dist/index.js`, ✔ Connected (no competing server). All five commands register: `seed`/`reap`/`verify` directly model-invocable; `migrate`/`cleanup` model-hidden (disable-model-invocation) yet maintainer-confirmed present in the slash menu. **Routing proof:** a real `/localground:seed` on a fresh throwaway repo (`lg-uat-19-plugintest`) → `localground_detect` + `localground_seed` (both `isError:false`) → manifest + test-file (sha256 `d51c375d…fc20`) + git tag (`localground/seed/2026-06-26T02-20-39-032Z`, commit `bef6ed52`) on disk, all matching. 19-UAT.md flipped to 1/5, SC1 VERIFIED.

## C-1 held

No `.mcp.json` was shipped; `claude mcp list` post-restart showed a single `localground` server (local-dist). The doc confirms the risk was real: `/reload-plugins` "reloads plugins, skills, agents, hooks, **plugin MCP servers** …" — a bundled `.mcp.json` is activated on plugin load. Deferring it to Phase 20 (validated there as the end-user auto-register path) was correct.

## Deviations

1. **Backup location (not caught by the 4 verification lenses).** The plan's step 2c put the guarded backup under `~/.claude/skills/_localground-backup-<ts>/`. Because `~/.claude/skills/` is scanned recursively for skills, a backup dir containing a `SKILL.md` **registered as a phantom skill** (`_localground-backup-20260625-210050`). Relocated the backup to `~/.claude/_localground-backup-20260625-210050/` (outside the scan path). If 19-08 is ever re-run, fix step 2c's backup location.
2. **Task 1 doc delta** (above): `name:` is display-only for the directory-skill layout; the verbatim-lift command-break risk was overstated. Action unchanged (omit `name:`).

## Hand-off

- **UAT-02 (19-02) — discard then re-run.** The stale `C:/Users/rlasalle/Projects/lg-uat-19-dest` (session:1 state + completed copy from the broken tool-path Session 1) must be **discarded** before re-running 19-02 — otherwise it launders an invalid UAT-02 (H-3). Re-run the FULL two-session loop via the real `/localground:migrate` command (migrate is `disable-model-invocation`, so the maintainer invokes it).
- **Then** UAT-03 (reap) → UAT-04 (cleanup, synthetic tmpdir fixture) → UAT-05 (verify, env audit) → 19-06 tarball-gate replay → 19-07 finalize.
- **Throwaway cleanup (post-UAT housekeeping):** delete `C:/Users/rlasalle/Projects/lg-uat-19-plugintest` and the `~/.claude/_localground-backup-20260625-210050/` backup once Phase 19 closes.

## Flag for Phase 20 (H-4 — distribution)

The plugin's end-user path (install → bundled `.mcp.json` auto-registers → routes) is validated by neither Phase 19 (which uses the manual `--scope user` registration) nor the current Phase 20 plan. Phase 20 must add:
1. A **bundled `.mcp.json`** (release form, e.g. `npx -y @localground/mcp`) + validation of its auto-register + npx path (PIPE).
2. A new **end-user-install validation SC**.
3. **PROJECT.md** update: "two forms" → "three forms" (README counts MCP/CLI/prompts as three → "four" there).
4. **DOC-03**: plugin install/usage docs (marketplace vs `--plugin-dir`).

## Self-Check: PASSED

- `.claude-plugin/plugin.json` valid (name=localground, v3.0.1); `claude plugin validate .` passes.
- 5 `skills/<verb>/SKILL.md` exist; bodies verbatim; no `name: localground-` leak; `disable-model-invocation: true` present in migrate + cleanup, absent in seed/reap/verify.
- No `.mcp.json` at repo root (C-1); `claude mcp list` = one `localground` (local-dist).
- Loose `.claude/skills/localground-*.md` + `.claude/skills/SKILL.md` gone (repo); user-level copies removed (backup at `~/.claude/_localground-backup-20260625-210050`).
- `19-transcripts/plugin-registration.md` has anchors `## Command registration`, `## Tool call (routing proof)`, `## On-disk evidence`; routing chain `isError:false`.
- `19-UAT.md`: `score: 1/5`, `requirements_verified: 1/5`; SC1 VERIFIED; UAT-01 SATISFIED; plugin spot-check rows PASS.
- `scripts/verify-tarball.mjs` FORBIDDEN_PREFIX includes `skills/` + `.claude-plugin/`.

---
*Phase: 19-skill-runtime-uat — Plan 08 (D-18 gap-closure)*
*UAT-01: re-confirmed PASS via real /localground:seed (maintainer-confirmed 2026-06-25). UAT-02..05: unblocked, pending.*
