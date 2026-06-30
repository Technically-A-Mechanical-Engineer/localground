---
phase: 22
reviewers: [codex]
reviewed_at: 2026-06-30
plans_reviewed: [22-01-PLAN.md, 22-02-PLAN.md]
reviewer_availability: "claude skipped (self — running inside Claude Code CLI); gemini/coderabbit/opencode/qwen/cursor + ollama/lm_studio/llama_cpp not installed. Codex (codex-cli 0.130.0) was the only available independent reviewer."
---

# Cross-AI Plan Review — Phase 22

> Single external reviewer available this run (Codex). This reviews the concrete PLAN.md files and is distinct from the earlier Codex review of the RESEARCH findings/recommendations.

## Codex Review

## Summary

The plans are directionally right, but I would not execute them unchanged. Plan 22-01's core Option A change is solid, but its tarball verification mechanism is materially wrong: `@localground/mcp` / `@localground/cli` do not export `seed`, and importing their package entry points would hit executable startup code. Plan 22-02 captures the right invariants, but the proposed `AppData` denylist implementation does not actually reject `...\AppData\Local`, and the detect-surface requirement is not covered.

## Strengths

- Option A for BUILD-01 is the right mechanism: `seed(projectPath, toolkitVersion)` gives true per-consumer semantics without tsup/global indirection.
- Updating all current seed call sites is well-scoped: live repo has exactly two production calls plus seven seed tests.
- The plans correctly preserve the no-marker-check invariant for plain-folder projects.
- Adding a dedicated `looksLikeProject.test.ts` is the right regression-lock move.
- Both plans keep changes in shared core, which is the right architectural boundary.

## Concerns

- **HIGH — Plan 22-01 Task 3 direct-import driver is not viable.** `@localground/mcp` and `@localground/cli` export `./dist/index.js`, but that file is the executable entry point, not a library export. MCP calls `main().catch(...)` at packages/mcp/src/index.ts:870; CLI top-level awaits `program.parseAsync(process.argv)` at packages/cli/src/index.ts:700. Neither package exports `seed`. The proposed `import { seed } from '@localground/mcp'` will fail or trigger startup behavior, and it would not test the actual consumer call site anyway.

- **HIGH — Plan 22-02 Task 1's `AppData` basename denylist misses the target path.** For `C:\Users\...\AppData\Local`, `path.basename(resolved)` is `Local`, not `AppData`. The planned test expects that path to return false, but the proposed implementation would still return true.

- **HIGH — CORE-15 may not satisfy the stated detect inheritance criterion.** Current CLI/MCP `audit` paths use `.filter(looksLikeProject)` at packages/cli/src/index.ts:513 and packages/mcp/src/index.ts:721, but the `detect` enriched project lists do not filter through `looksLikeProject` at packages/cli/src/index.ts:63 and packages/mcp/src/index.ts:212. If "CLI audit/detect" is a real success criterion, 22-02 is incomplete.

- **MEDIUM — Other-user-home rejection can over-reject same-depth plain folders.** Rejecting every direct child of the users container means `C:\Users\SharedProjects` or `/Users/SharedProjects` can never be a plain-folder project, even though it is two segments below root. The plan's "same-depth sibling" test is not actually same-depth; `home/Projects/app` is deeper than `usersContainer/someoneelse`.

- **MEDIUM — The denylist expands beyond the locked minimum without evidence.** `node_modules`, `.cache`, and especially `Library` may be reasonable, but this is scope creep for a hardening minor unless backed by a reproduced leak. A legitimate plain-folder project named `Library` would be rejected.

- **MEDIUM — One acceptance criterion is self-contradictory.** Plan 22-02 says preserve the doc comment mentioning `package.json`, but also says `grep -c "package.json" packages/core/src/environment/looksLikeProject.ts` must return 0. Current file already contains that doc-comment mention at looksLikeProject.ts:22.

- **LOW — Several verification snippets are shell-fragile.** The plans use `grep`, `test $? -ne 0`, and bash-style assumptions in a PowerShell repo context. They are acceptable as intent, but not reliable exact commands.

## Suggestions

- Replace Plan 22-01 Task 3 with consumer-surface verification:
  - For `@localground/cli`, run the packaged CLI bin against `seed <absoluteSeedDir> --json` or `--json seed <absoluteSeedDir>`, then assert the manifest value.
  - For `@localground/mcp`, start the packaged MCP bin and make a minimal JSON-RPC `localground_seed` tool call over stdio, then assert the manifest value.
  - Do not use direct package import unless you first add an intentional library export, which would be new public surface and should be avoided here.

- Change the system-dir guard from basename-only to path-segment / ancestor logic. For example, reject if the first segment below home is `AppData`, and if adding macOS/Linux entries, reject `Library` / `.cache` as first-segment-below-home rather than any final basename.

- Resolve the detect-scope question before execution. If detect is in scope, add `looksLikeProject` filtering to CLI/MCP detect project enrichment and add tests or smoke checks for both detect and audit.

- Tighten the other-user-home test language. Either explicitly accept "all direct children of users container are non-project roots" as an intentional exception, or add a real same-depth test such as `usersContainer/SharedProjects` and narrow the implementation accordingly.

- Keep the CORE-15 denylist to `AppData` unless there is current evidence for `node_modules`, `.cache`, or `Library` leaks.

- Fix acceptance checks to use `rg` and comment-stripped checks where needed, especially for the `package.json` doc-comment case.

## Risk Assessment

**Overall risk: MEDIUM-HIGH if executed unchanged.** The main seed implementation is low risk, but the packaged-tarball verification plan is invalid as written, and the CORE-15 implementation recipe would fail its own `AppData\Local` requirement. After replacing the tarball check with real CLI/MCP surface calls and correcting the path-segment denylist, the phase risk drops to **LOW-MEDIUM**.

---

## Consensus Summary

Only one external reviewer was available (Codex), so this is a single-reviewer assessment rather than multi-AI consensus. Concerns are listed by Codex's severity; the orchestrator independently verified the HIGH/self-contradiction items against live code (see the verification verdict appended below the divider).

### Agreed Strengths
- Option A is the right BUILD-01 mechanism (confirms the earlier research + cross-review).
- No-marker-check invariant (D-05) correctly preserved.
- Shared-core architectural boundary (D-07) correct.
- A dedicated regression-lock test is the right move.

### Priority Concerns (single reviewer)
1. **HIGH — 22-01 Task 3 direct-import driver not viable** (mcp/cli don't export `seed`; their entry points run startup code). Replace with consumer-surface verification (cli bin `seed --json`; mcp JSON-RPC `localground_seed` tool call).
2. **HIGH — 22-02 `AppData` basename denylist is a logic bug** (`basename('…\AppData\Local')` is `Local`, not `AppData`). Use first-segment-below-home logic, not basename.
3. **HIGH — detect-surface scope gap** — `detect` does not route through `looksLikeProject`; SC-5 names "CLI audit/detect," so resolve whether detect is in scope.
4. **MEDIUM — other-user-home rule over-rejects** any project directly under the users container (e.g. `C:\Users\SharedProjects`); the "same-depth sibling" test isn't actually same-depth.
5. **MEDIUM — denylist scope creep** (`node_modules`/`.cache`/`Library` beyond the locked `AppData`) without a reproduced leak.
6. **MEDIUM — self-contradictory acceptance criterion** (preserve the `package.json` doc-comment vs. `grep -c "package.json"` must be 0).
7. **LOW — shell-fragile verification snippets** in a PowerShell repo.

### Divergent Views
N/A — single reviewer.

---

## Orchestrator Verification Verdict (independent code check, 2026-06-30)

Each Codex concern was checked against live code at HEAD before accepting (per the Phase-21 WR-01 lesson: verify load-bearing claims, don't trust review consensus). Findings:

| # | Concern | Sev | Verdict | Evidence |
|---|---------|-----|---------|----------|
| 1 | 22-01 Task 3 direct-import driver not viable | HIGH | **CONFIRMED — real defect** | `packages/{mcp,cli}/package.json` export only `"." → ./dist/index.js`; `grep` for any `export`/`seed` in both `index.ts` → none (neither exports `seed`). Entry points self-execute: mcp `main().catch()` (:870), cli `await program.parseAsync(process.argv)` (:700). Core is `private:true`+bundled, not separately installable in the tarball tmpdir. D-03's direct-import driver cannot work. |
| 2 | 22-02 `AppData` basename denylist misses `…\AppData\Local` | HIGH | **CONFIRMED — real defect** | Task 1 (plan :169-175) denylists `path.basename(resolved)`; `basename('…\AppData\Local')` = `Local` ≠ `AppData`, so the path is NOT rejected — yet Task 2 (:271) asserts it returns `false`. The plan's test fails against the plan's implementation. |
| 3 | `detect` does not inherit the filter | HIGH | **CONFIRMED — real gap** | cli `detect` (:63) and mcp `detect` (:212) build `enrichedProjects` filtering only `decode-success + exists` — no `.filter(looksLikeProject)`. SC-5 names "CLI audit/**detect**"; detect auto-populates `projects[]`, so it surfaces unfiltered roots. The plan's D-07 truth falsely claims detect inherits "via the existing `.filter(looksLikeProject)`". |
| 4 | other-user-home rule over-rejects same-depth plain folders | MED | **CONFIRMED** | The guard rejects ALL direct children of the users-container (e.g. `C:\Users\SharedProjects`), and the plan's "same-depth sibling" test (`home/Projects/app`, 2-below-home) is actually deeper than `usersContainer/someoneelse` — so no test proves the genuinely same-depth shape, which the guard always rejects. |
| 5 | denylist scope creep (`node_modules`/`.cache`/`Library`) | MED | **VALID judgment** | Beyond the locked `AppData` minimum without a reproduced leak; a real project named `Library` would be rejected. (Orchestrator had flagged the same uncertainty.) |
| 6 | self-contradictory `package.json` grep criterion | MED | **CONFIRMED** | Acceptance (:192) requires `grep -c "package.json" … = 0`, but the plan also preserves the doc comment at :22 that contains "package.json" (D-05). Impossible as written; needs a comment-stripped check. |
| 7 | shell-fragile verification snippets | LOW | **VALID (partly mitigated)** | bash `grep`/`test $?` in a PowerShell repo; executor runs via the Bash tool so they work, but `rg` / robust forms are safer. |

**Verdict: do NOT execute the plans as-is.** Three HIGH defects are real (two would cause execution failures, one fails SC-5). Recommended action: `/gsd-plan-phase 22 --reviews` to incorporate these findings. Required fixes:
- **#1:** replace the direct-import driver with consumer-surface verification — cli packaged bin `seed <dir> --json` + assert manifest value; mcp packaged bin via JSON-RPC `localground_seed` tool over stdio + assert. (Updates D-03's HOW.)
- **#2:** change the `AppData` guard from final-basename to first-segment-below-home / segment-membership logic so `…\AppData\Local` is rejected.
- **#3:** add `.filter(looksLikeProject)` to detect's `enrichedProjects` at cli:63 and mcp:212 (touches `cli/index.ts` + `mcp/index.ts` — expands 22-02's file set), OR get an explicit scope ruling that detect is out of scope (contradicts SC-5 wording).
- **#4:** accept "all direct children of the users-container are non-project roots" as an intentional, documented exception, and fix the mislabeled same-depth test.
- **#5:** decide denylist membership — trim to `AppData` (+ arguably `node_modules`) unless there's evidence for `.cache`/`Library`.
- **#6:** make the `package.json` acceptance check comment-stripped (as the `AppData` check already is).
