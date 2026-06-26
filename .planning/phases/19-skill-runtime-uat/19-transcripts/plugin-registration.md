# 19-08 Task 4: Plugin registration + routing proof

**Captured:** 2026-06-26T02:21Z (2026-06-25 21:21 CDT)
**Session:** Claude Code relaunched with `claude --plugin-dir "C:/Users/rlasalle/Projects/localground"` (first plugin load requires a session start — `/reload-plugins` only picks up edits to an already-loaded plugin).
**MCP runtime:** local-dist (`packages/mcp/dist/index.js`), `--scope user` (D-04 inner loop). NO plugin `.mcp.json` shipped (C-1).
**Driver:** Claude (Opus 4.8) invoking the real `/localground:seed` plugin command; maintainer = pass/fail judge.

## Command registration

The `localground` plugin loaded from `.claude-plugin/plugin.json` (name=`localground`) + `skills/<verb>/SKILL.md`. Commands resolve as `/localground:<dir-name>` (the directory name is the command; plugin name is the namespace).

| Command | Registered | Evidence |
|---|---|---|
| `/localground:seed` | ✅ | Visible in the model-invocable skill list; **dispatched end-to-end below** |
| `/localground:reap` | ✅ | Visible in the model-invocable skill list |
| `/localground:verify` | ✅ | Visible in the model-invocable skill list |
| `/localground:migrate` | ✅ (model-hidden) | Correctly absent from the model-invocable list because `disable-model-invocation: true` (L-2); user-invocable via slash menu — maintainer-confirmed present (2026-06-26) |
| `/localground:cleanup` | ✅ (model-hidden) | Same as migrate — `disable-model-invocation: true` (L-2); user-invocable via slash menu — maintainer-confirmed present (2026-06-26) |

This is the fix for the root-cause defect: before 19-08 the five skills shipped as loose `.claude/skills/*.md` files (which Claude Code never registers — flat files only register under `.claude/commands/`, and that would yield `/localground-seed`, not the colon syntax). Packaging them as a plugin restores `/localground:<verb>`. The maintainer's earlier "Unknown command: /localground:migrate" no longer reproduces.

**Behavioral confirmation of L-2:** `seed`, `reap`, `verify` (no `disable-model-invocation`) are model-invocable; `migrate`, `cleanup` (`disable-model-invocation: true`) are hidden from model auto-invocation while remaining user-invocable — the deletion-capable `cleanup` skill is protected exactly as intended.

### C-1 pre-check (before any invocation)

`claude mcp list` in the relaunched session:

```
localground: node C:/Users/rlasalle/Projects/localground/packages/mcp/dist/index.js - ✔ Connected
```

Exactly ONE `localground` MCP server, pointing at the local-dist node path. No second/competing server (no npx `@localground/mcp`, no differently-named server). Confirms the plugin shipped no auto-starting `.mcp.json` (C-1 holds).

## Tool call (routing proof)

Invocation: `/localground:seed` (real plugin command) against a FRESH throwaway git repo `C:/Users/rlasalle/Projects/lg-uat-19-plugintest` (created for this proof — NOT `lg-uat-fixture-19` [already seeded, L-5 refuses re-seed], NOT `lg-uat-19-dest` [H-3 discard]). The plugin skill loaded its `SKILL.md` body and orchestrated the MCP tools:

**`localground_detect`** (`isError: false`): Windows/PowerShell; OneDrive sync root; 16 projects; 23 path-hash entries (7 decode to `null` — deleted/renamed folders + the `0159…CC-CLI` underscore case; tracked for UAT-05).

**`localground_seed`** (`isError: false`), `projectPath: C:/Users/rlasalle/Projects/lg-uat-19-plugintest`:

```json
{
  "version": 1,
  "toolkitVersion": "3.0.0",
  "created": "2026-06-26T02:20:39.207Z",
  "projectPath": "C:/Users/rlasalle/Projects/lg-uat-19-plugintest",
  "projectName": "lg-uat-19-plugintest",
  "markers": [
    { "type": "test-file", "path": "...\\.localground-seed-test", "checksum": "d51c375daae6b2b53173032c3443efe3609c58a8c87e0f4d5ffbee6433f1fc20" },
    { "type": "git-tag", "tag": "localground/seed/2026-06-26T02-20-39-032Z", "commitHash": "bef6ed525791efeb414f51e20ae55528392336f3" }
  ]
}
```

Routing chain proven end-to-end: **slash command (`/localground:seed`) → plugin skill (`skills/seed/SKILL.md`) → MCP tools (`localground_detect` + `localground_seed`, `isError:false`) → markers on disk.**

## On-disk evidence

```
$ cat .localground-seed-manifest.json   → valid JSON, 6 keys (version, toolkitVersion, created, projectPath, projectName, markers)
$ sha256sum .localground-seed-test      → d51c375daae6b2b53173032c3443efe3609c58a8c87e0f4d5ffbee6433f1fc20  (matches manifest)
$ git tag -l 'localground/seed/*'       → localground/seed/2026-06-26T02-20-39-032Z
$ git rev-list -n1 <tag>                → bef6ed525791efeb414f51e20ae55528392336f3  (matches manifest commitHash)
```

## Verdict

SC1 re-confirmed via a REAL `/localground:seed` command (not a manually-driven tool call as in 19-01): command registers, routes through the plugin skill to the MCP tools, and plants verified markers on disk. UAT-01 = PASS.

All five commands register: `seed`/`reap`/`verify` directly observed model-invocable (and `seed` routed end-to-end); `migrate`/`cleanup` are `disable-model-invocation` (model-hidden) and were maintainer-confirmed present in the slash menu on 2026-06-26 — so the earlier "Unknown command: /localground:migrate" is resolved. The `/localground:*` command layer is now functional; UAT-02..05 re-runs are unblocked.

**Cleanup note:** throwaway repo `C:/Users/rlasalle/Projects/lg-uat-19-plugintest` is disposable — delete after Phase 19 (post-UAT housekeeping).
