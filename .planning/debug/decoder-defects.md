---
status: resolved
trigger: "decoder-defects: detect() reports decodedPath: null spuriously (Defect A); decode() fails on OneDrive paths with ' - ' and ', ' (Defect B)"
created: 2026-04-26T00:00:00Z
updated: 2026-04-28T00:00:00Z
---

## Current Focus

hypothesis: Both defects empirically confirmed. Defect A is a contract gap between core's intentional "detect doesn't decode" design and the CLI/MCP detect surfaces, which present raw nulls without ever calling decode(). Defect B is a fundamental algorithmic limitation in decode()'s reconstructPath/buildCandidates: uniform-separator joining plus a 5-segment combine cap make it impossible to reconstruct folder names that contain MIXED special characters (e.g., space-dash-space AND comma-space in the same name).
test: Diagnosis complete (find_root_cause_only). No fixes applied.
expecting: Hand-off to plan-phase --gaps for fix planning.
next_action: Return ROOT CAUSE FOUND with both defects, files involved, and suggested fix direction.

## Symptoms

expected: |
  decode() must convert Windows Claude Code path-hash directory names back to absolute paths for the full input space, including paths originally containing ` - ` (encoded as `---`) and `, ` (encoded as `--`) — the canonical OneDrive corporate path pattern. The detect command's pathHashes array must accurately report decoded paths (no spurious nulls). The projects array must auto-populate from successful decodes.

actual: |
  TEST 3 (detect --json): All 23 pathHashes entries returned `decodedPath: null`, INCLUDING trivially-decodable simple paths.
  TEST 8 (audit): Same simple paths decode successfully (audit found 10 projects), proving decode() works. But all 8 OneDrive corporate entries (`...OneDrive---ThermoTek--Inc...`) silently dropped.

errors: None — failures are silent (null returns, no thrown errors).

reproduction: |
  cd C:\Users\rlasalle\Projects\localground
  node packages/cli/dist/index.js detect --json   # all decodedPath: null, projects: []
  node packages/cli/dist/index.js audit           # 10 simple projects found; 8 OneDrive entries silently excluded

started: Discovered during UAT on 2026-04-26 (Tests 3 and 8). All Phase 14 commits ship with these defects.

## Eliminated

- hypothesis: "decode() itself is broken for simple Windows paths"
  evidence: Direct invocation against `C--Users-rlasalle-Projects-localground` returns success with the correct Windows path. CLI audit auto-discovers and operates on these decoded paths in Test 8. Confirmed via direct script invocation.
  timestamp: 2026-04-26

- hypothesis: "decode() returns the path but detect() discards it via existence check"
  evidence: Reading detect.ts shows it never calls decode() at all. Lines 47-52 hardcode `decodedPath: null` for every entry. Lines 58-64 hardcode `projects: []` and contain a comment explicitly stating this is intentional ("downstream contract: projects[] is intentionally always empty").
  timestamp: 2026-04-26

## Evidence

- timestamp: 2026-04-26
  checked: packages/core/src/environment/detect.ts (the detect() function)
  found: |
    Lines 47-52: detect() explicitly assigns `decodedPath: null` to every PathHashEntry — it never calls decode(). The comment at line 50 says "Decoding is done by decode() — separate function".
    Lines 58-64: `projects: []` is a hardcoded empty array with a downstream contract comment: "detect() inventories path-hash directories but does NOT decode them. Callers must invoke decode() separately for each pathHashes[] entry to populate project details. This keeps detect() fast and avoids the combinatorial filesystem probing that decode() performs."
  implication: |
    detect() is doing exactly what it was designed to do. The defect is in CONSUMERS that present detect()'s raw output as if it were the decoded result — without honoring the contract by calling decode() for each entry. The CLI's `detect` command and the MCP server's `localground_detect` tool are both such consumers.

- timestamp: 2026-04-26
  checked: packages/cli/src/index.ts (the `detect` command, lines 23-73)
  found: |
    The CLI `detect` command renders `pathHashes[].decodedPath` directly (line 66: `const decoded = h.decodedPath ?? '(undecodable)'`) and `env.projects.length` directly (lines 50, 55-60), with no decode() invocation. JSON mode (line 40) emits `result.data` verbatim, which is why every `decodedPath` is null in `--json` output.
    Compare with the CLI `audit` command (lines 449-455): IT does call `await Promise.all(envResult.data.pathHashes.map((h) => decode(h.hashDirName)))` and filters by `r.success && r.data.decodedPath !== null && r.data.exists`. This is why audit "works" for simple paths.
  implication: |
    Defect A is a CLI/MCP consumer bug, not a core bug. The CLI `detect` command violates the documented downstream contract (callers must invoke decode() separately). Audit honors the contract; detect command does not.

- timestamp: 2026-04-26
  checked: packages/mcp/src/index.ts (the `localground_detect` tool, lines 180-192)
  found: |
    `localground_detect` (line 189-192) is a thin pass-through: `const result = await detect(); return resultToMcp(result);` — it inherits Defect A unchanged. Every MCP detect call also returns `decodedPath: null` for every entry and `projects: []`.
    `localground_audit` (lines 559+, 665+) DOES call decode() per entry, mirroring the CLI audit pattern. Comments at lines 559 and 665 acknowledge: "decode() each path-hash entry first — detect() returns decodedPath: null by design".
  implication: |
    Both defects ship via the MCP server too, with the same shape: detect tool reports nulls, audit tool silently drops decode failures.

- timestamp: 2026-04-26
  checked: packages/core/src/environment/decode.ts (the decode() function and helpers)
  found: |
    Encoding rule (line 85): `filePath.replace(/[\\/: ,().]/g, '-').replace(/^-+|-+$/g, '')`. Each backslash, forward slash, colon, space, comma, paren, or period becomes EXACTLY ONE hyphen. Consecutive hyphens are NOT collapsed.
    Round-trip verified: `C:\Users\rlasalle\OneDrive - ThermoTek, Inc\Documents\Projects\Claude-Home` encodes to `C--Users-rlasalle-OneDrive---ThermoTek--Inc-Documents-Projects-Claude-Home` — exact match for the failing UAT path-hashes.
    `OneDrive - ThermoTek, Inc` produces `OneDrive---ThermoTek--Inc` because:
      O-n-e-D-r-i-v-e + (space→-) + (literal hyphen, NOT in regex set, stays as -) + (space→-) + T-h-e-r-m-o-T-e-k + (comma→-) + (space→-) + I-n-c
      = OneDrive + --- + ThermoTek + -- + Inc
  implication: |
    Encoding is one-to-many (lossy): different special characters all become the same single hyphen. The decoder must guess which hyphen represents which original character, against the filesystem.

- timestamp: 2026-04-26
  checked: packages/core/src/environment/decode.ts buildCandidates (lines 133-176) — the segment-reconstruction algorithm
  found: |
    Two structural limits make `OneDrive - ThermoTek, Inc` impossible to reconstruct:

    LIMIT 1 — Combine cap of 5: `const maxCombine = Math.min(remainingSegments.length, 5)` (line 146).
    The folder `OneDrive - ThermoTek, Inc` requires combining 6 segments after split('-'): ['OneDrive', '', '', 'ThermoTek', '', 'Inc']. With cap of 5, the loop never tries combining all 6, so 'Inc' is never included in the candidate name.

    LIMIT 2 — Uniform separator: `const candidateName = candidateSegments.join(sep)` (line 160).
    Even if combine cap were raised, the algorithm joins ALL segments with ONE separator from `[' ', ', ', '-', '.', ' - ']`. To produce 'OneDrive - ThermoTek, Inc' you need DIFFERENT separators in different gaps:
      - between 'OneDrive' and 'ThermoTek': ' - '
      - between 'ThermoTek' and 'Inc': ', '
    No single uniform separator can do this. With sep=' - ' you get 'OneDrive -  -  - ThermoTek -  - Inc'. With sep=', ' you get 'OneDrive,  ,  , ThermoTek,  , Inc'. None match.

    Either limit alone breaks OneDrive corporate paths; both together make reconstruction structurally impossible without an algorithm change.
  implication: |
    Defect B is a fundamental algorithmic limitation, not a configuration bug. The decoder design assumes folder names contain only ONE kind of special character per name. Real Windows folder names with mixed punctuation (space, dash, comma combined) are out of scope for the current algorithm.

- timestamp: 2026-04-26
  checked: Direct empirical test of decode() against simple and OneDrive hashes (script invocation against built dist).
  found: |
    Simple hashes succeed:
      C--Users-rlasalle-Projects-localground -> { success: true, decodedPath: "C:\\Users\\rlasalle\\Projects\\localground", exists: true }
      C--Users-rlasalle-Projects-OB1          -> { success: true, decodedPath: "C:\\Users\\rlasalle\\Projects\\OB1", exists: true }
      C--Users-rlasalle-Projects-Claude-Home  -> { success: true, decodedPath: "C:\\Users\\rlasalle\\Projects\\Claude-Home", exists: true }
    OneDrive hashes fail:
      C--Users-rlasalle-OneDrive---ThermoTek--Inc-Documents-Projects-Claude-Home -> { success: false, reason: "no_candidates" }
      C--Users-rlasalle-OneDrive---ThermoTek--Inc-Documents-Projects-OB1         -> { success: false, reason: "no_candidates" }
  implication: |
    Confirms the two defects partition cleanly: simple decoding works; mixed-punctuation folders fail. The CLI detect command's all-null output (Defect A) was masking Defect B's existence.

- timestamp: 2026-04-26
  checked: CLI audit auto-discovery filter (packages/cli/src/index.ts line 454)
  found: |
    `(...).filter((r): r is Success<PathHashEntry> => r.success && r.data.decodedPath !== null && r.data.exists)`
    For every OneDrive hash, decode() returns `{ success: false, reason: 'no_candidates' }`. The filter drops them via `r.success` being false. There is no warning, log, or notification — the filter is purely additive.
  implication: |
    "Silent exclusion" symptom from Test 8 is explained: undecodable hashes are filtered out without notice. Same pattern appears in the MCP audit tool. Users don't see the cloud-synced projects that LocalGround was specifically built to migrate.

## Resolution

root_cause: |
  TWO INDEPENDENT ROOT CAUSES.

  ROOT CAUSE A (CLI/MCP detect surfaces):
  The CLI `detect` command (packages/cli/src/index.ts) and the MCP `localground_detect` tool (packages/mcp/src/index.ts) both expose `EnvironmentInfo` directly to users without honoring the documented downstream contract that requires callers to invoke decode() per entry to populate decodedPath and projects[]. The core `detect()` function intentionally returns `decodedPath: null` and `projects: []` (see comments in detect.ts lines 50, 58-64); the CLI/MCP detect commands fail to compensate. As a result, `decodedPath` always renders as `(undecodable)` in human mode and `null` in JSON, regardless of whether decode() would have succeeded.

  ROOT CAUSE B (core decoder algorithm):
  The decode() reconstruction algorithm in packages/core/src/environment/decode.ts (buildCandidates, lines 133-176) cannot reconstruct folder names that contain MIXED special characters within a single name segment. Two compounding limits cause this:
    1. `maxCombine = Math.min(remainingSegments.length, 5)` (line 146) caps the combine span at 5 segments; the OneDrive corporate folder name `OneDrive - ThermoTek, Inc` requires 6 segments after split('-').
    2. `candidateSegments.join(sep)` (line 160) applies ONE uniform separator across all gaps within a candidate name; the OneDrive folder requires different separators in different gaps (' - ' between 'OneDrive' and 'ThermoTek', ', ' between 'ThermoTek' and 'Inc').
  Either limit alone is sufficient to break OneDrive corporate paths; both together make reconstruction structurally impossible without algorithm redesign.

fix: |
  Find-root-cause-only mode. No fix applied. Suggested fix direction below.

  FIX DIRECTION FOR DEFECT A (CLI/MCP detect surfaces):
  Modify the CLI `detect` command and MCP `localground_detect` tool to invoke decode() per pathHashes entry and populate both decodedPath and projects[] before rendering/returning. This honors the documented downstream contract. Implementation pattern is already present in CLI audit (lines 449-455) and MCP audit (lines 665-671): map decode over pathHashes, filter successful results, populate the consumer-facing structure. Adding this in the CLI and MCP detect surfaces — not in core/detect.ts — preserves the architectural intent that core detect() stays fast and avoids combinatorial filesystem probing. Applies identically to both surfaces.

  FIX DIRECTION FOR DEFECT B (core decoder algorithm):
  Replace the uniform-separator candidate generator with one of:
    Option 1 (per-gap cartesian): For each combine span, enumerate all combinations of separators across each gap independently rather than uniformly across all gaps. This generalizes to any folder name with mixed punctuation. Cost: cartesian growth per combine count; mitigate with the existing maxCandidates=20 ceiling.
    Option 2 (filesystem-listing reverse encode): At each recursion level, list the actual filesystem entries in currentPath, encode each entry's name with the same encoding rule, and prefix-match against remainingSegments joined back with hyphens. This sidesteps separator guessing entirely — any folder that physically exists will decode correctly regardless of punctuation. This is the most robust approach and likely the cleanest fix.
  The hint to special-case `---`/`--` will not generalize — it would handle ' - ' and ', ' but break for any future combination (e.g., `' . '` parens, parens-space, etc.).
  Also raise or remove the `maxCombine = 5` cap; it only exists to bound search and a higher ceiling (or removal in favor of the filesystem-listing approach) is needed.

  CROSS-CUTTING SUGGESTION (regardless of fix path): When decode() fails for a hash, the CLI/MCP audit surfaces should report it as `undecodable` (using the existing `classify()` 'undecodable' classification) rather than silently filtering it out. Users need to see "8 entries could not be decoded" instead of having those entries vanish.

verification: |
  Closed by Phase 17 (Core Decoder Calibration) on 2026-04-27. See `.planning/phases/17-core-decoder-calibration/17-VERIFICATION.md` — 4/4 must-haves verified, CORE-13 and CORE-14 closed, 23-path-hash diagnostic reproduced and documented.

files_changed: []

closure: |
  Phase 17 closed Defect A (CLI/MCP `detect` surfaces returning null `decodedPath`) and Defect B's main mixed-separator case (OneDrive corporate paths with ` - ` and `, `) on 2026-04-27.

  Residual: A single character at the trailing edge of intermediate path-hash components still fails decode under `buildCandidates`. Tracked as the **999.7 buildCandidates trailing-edge defect** backlog item (memory: `project_999_7_buildcandidates.md`). Not yet on `ROADMAP.md` `## Backlog`; surface for sequencing when v3.1.0 scope opens.
