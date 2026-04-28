# Phase 19: Skill Runtime UAT - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning

<domain>
## Phase Boundary

End-to-end UAT validating that all 5 `/localground:*` skills route correctly through the registered `@localground/mcp` server and execute against real filesystems. v3.0.0 verified static skill compliance; this phase validates runtime behavior — the full stack from Claude Code loading the skill, through MCP tool calls, to real-fs side effects, with results captured as durable evidence artifacts.

Maps to v3.0.1 requirements **UAT-01** (`/localground:seed`), **UAT-02** (`/localground:migrate` two-session continuation-token loop — the only test exercising this code path), **UAT-03** (`/localground:reap`), **UAT-04** (`/localground:cleanup`), and **UAT-05** (`/localground:verify`). Sequenced after Phase 17 and Phase 18 by design — UAT runs against the same tarball shape Phase 20 will publish.

**Runtime model.** UAT is manual — the human (project maintainer) executes each skill in Claude Code, observes the dialogue and tool calls, and records evidence. There is no automated assertion harness; pass/fail is determined against ROADMAP success criteria SC1-5 plus evidence captured per skill.

**Critical path.** UAT-02 is the load-bearing test — the two-session continuation-token loop and the state-file handoff across a Claude Code restart have zero other test coverage. The continuation-token mechanism itself (`chunk.ts` + `localground_copy`) is exercised by Vitest, but the **skill's session-detection branching** and the **state-file handoff across restart** are unique to UAT-02.

**Constraint from REQUIREMENTS.md:** All 5 UATs are pending; Phase 19 must close all 5. No partial close — milestone advances to Phase 20 only when every UAT lands `passed`.

</domain>

<decisions>
## Implementation Decisions

### UAT-02 migration scenarios (the load-bearing test)

- **D-01: Run scenario set C — Happy path + idempotency replay + missing-state-file fallback.** Three runs against the same fresh fixture. Run 1: full happy path (seed → migrate Session 1 → Claude Code restart → Session 2 → done). Run 2: re-invoke `/localground:migrate` from the destination, confirm it detects `session: 2` and exits cleanly without re-processing (idempotency). Run 3: delete `localground-migrate-state.json` from the destination, re-invoke the skill from there, confirm it correctly re-enters Session 1 logic (missing-state-file fallback). **Reasoning:** the migrate skill has exactly three documented session-entry branches (no file / `session: 1` / `session: 2`); scenario C is the smallest set that touches all three, and these are the branches in the skill's logic — not the token mechanism. The token mechanism is already covered by Vitest against `chunk()` + `copy()` directly.
- **D-02: Crash-resume mid-loop is OUT of scope for Phase 19.** Killing Claude Code mid-`localground_copy` is race-prone on small fixtures the maintainer can manage manually; a flaky UAT result is worse than no UAT result. If crash-resume needs coverage, it belongs in a deterministic Vitest fixture against `chunk()` + `copy()`, captured as a v3.1.0 backlog candidate. Phase 19 does not pursue this.
- **D-03: Multi-project batching is OUT of scope.** Roadmap success criterion #2 specifies a single state-file handoff; multi-project batching adds fixture overhead disproportionate to defect risk on a patch release where the documented happy path is one project.

### Runtime target (which MCP server registration UAT exercises)

- **D-04: Hybrid runtime — local `dist/` for iteration, tarball-install as the gating pass.** Inner loop registers the MCP server against `packages/mcp/dist/index.js` (already on disk after `npm run build`) for fast iteration when defects surface and require fixes. The final gating pass runs the full UAT suite once against an `npm pack`-and-installed tarball — registered via `claude mcp add localground -- node /tmp/<install-dir>/node_modules/@localground/mcp/dist/index.js` — to verify the published tarball shape works end-to-end. **Reasoning:** ROADMAP Phase 19 explicitly cites "Phase 18 (UAT runs against the same tarball shape that v3.0.1 will publish)" as its dependency rationale. `verify-tarball.mjs` (Phase 18) covers artifact-level integrity (`--version` works, `dist/index.js.map` ships); what's still unverified is the runtime path (stdio JSON-RPC handshake, tool routing, real-fs side effects). Local dist is safe for iteration because tsup output is deterministic — the same compiled bytes ship regardless of where they're loaded from.
- **D-05: Published `@localground/mcp@3.0.0` is NOT a UAT runtime target.** That tarball lacks Phase 17 decoder fixes and Phase 18 packaging — green UAT against 3.0.0 says nothing about whether v3.0.1 ships working.
- **D-06: `npx -y @localground/cli@3.0.1 detect` is covered by Phase 20 SC #5, not Phase 19.** The npm-distribution resolution path is a Phase 20 concern (post-publish smoke); Phase 19 stays focused on registered-MCP-server runtime.

### Evidence capture (what records pass/fail)

- **D-07: Hybrid evidence — structured `19-UAT.md` index + per-skill transcripts in `19-transcripts/`.** The index is the durable contract `/gsd-progress` reads (frontmatter `status: passed | partial | diagnosed`, score field, 5-row Observable Truths table mapped to ROADMAP SC1-5, evidence-pointer cell linking to transcripts). Transcripts are appendable detail: `19-transcripts/seed.md`, `19-transcripts/migrate-session-1.md`, `19-transcripts/migrate-session-2.md`, `19-transcripts/migrate-idempotency.md`, `19-transcripts/migrate-missing-state.md`, `19-transcripts/reap.md`, `19-transcripts/cleanup.md`, `19-transcripts/verify.md`. **Reasoning:** Phase 19 mixes interactive dialogue (cleanup yes/no, seed picker), slow operations (real `npm pack` + install for the tarball gate), and a Claude-Code-restart-bound state handoff — for these, "partial — see transcript L42-58" is materially more useful than either prose narrative or a bare checkbox alone. Matches the established `XX-VERIFICATION.md` pattern from Phases 16-18 plus the stored "augment, don't overwrite" rule for plan-authored verification artifacts.
- **D-08: Transcripts captured as plain markdown copy-paste.** No special tooling — the maintainer pastes the relevant portion of each Claude Code session into the corresponding transcript file, with line-range anchors readable from the index. Path redaction is at maintainer discretion (project paths under `C:/Users/rlasalle/Projects/` are non-sensitive; state-file content already inline in the skill spec).
- **D-09: Plan-authored `19-UAT.md` rule applies.** When `gsd-verifier` produces a verification artifact at the end of execution, it MUST augment (append cross-check section) rather than overwrite the plan-authored UAT index — same handling that worked for Phase 17's `17-VERIFICATION.md`.

### Cleanup destructive scope (UAT-04)

- **D-10: Synthetic tmp dir, mixed yes/no/skip-all in one run.** UAT-04 creates a fresh tmp dir under `os.tmpdir()` containing 3+ synthetic candidates of mixed type — at minimum: one orphan source-folder analog, one stale `CLAUDE.md` path reference, one abandoned path-hash directory. Within one UAT-04 run, the maintainer confirms one (`yes`), declines another (`no`), and triggers the `skip all` state transition on the third. **Reasoning:** scenario covers both directions of SC #4 ("zero deletions on declined items" + the inverse positive path) plus the `skip all` multi-candidate state transition (the most likely real defect site since it's the only multi-candidate control flow in the skill). Synthetic-only keeps zero risk to the maintainer's machine.
- **D-11: Real stale artifacts on the maintainer's machine are NOT cleaned via UAT.** The 3 diagnosed debug entries (`audit-includes-root-paths`, `cli-silent-long-operations`, `decoder-defects`) plus any orphan path-hash entries get cleaned via a separate, deliberate post-UAT operation. **Reasoning:** the test that validates "we don't accidentally delete stuff" should not itself be at risk of accidentally deleting stuff — the toolkit exists because the maintainer was once burned by destructive cloud-sync side effects (per CLAUDE.md). UAT must not become the kind of event the toolkit is designed to prevent.

### Test fixture strategy

- **D-12: Fresh disposable fixture for the seed → migrate → reap chain.** Create a new small project under a real cloud-synced path on the maintainer's machine (OneDrive default per existing setup) — `git init`, 2-3 commits, 10-50 files. UAT-01 seeds it, UAT-02 migrates it to a fresh tmp dir under `C:/Users/rlasalle/Projects/`, UAT-03 reaps the destination. **Reasoning:** Phase 14's preserved fixtures (OneDrive QMS folder + 2535-file local target) are pre-seeded — running `/localground:seed` against the QMS folder fails with "project already seeded" per the skill's own error handling. A fresh fixture avoids this and keeps the natural seed→migrate→reap chain on a single project. Fixture cost: ~10 min to set up.
- **D-13: Phase 14 fixture cleanup is a separate post-UAT step.** The OneDrive QMS folder + 2535-file local target stay untouched during Phase 19. After Phase 19 closes, the maintainer cleans them via a deliberate housekeeping operation (could be the post-UAT cleanup mentioned in D-11). **Reasoning:** stored memory note explicitly preserved them for Phase 19; post-UAT is the right window to remove them, not during UAT.
- **D-14: UAT-04 fixture is independent of the seed→migrate→reap chain.** UAT-04 builds its own synthetic tmp dir per D-10. Does not reuse the migrate destination or the seed source.

### Skill sequencing

- **D-15: Natural product flow on the chained fixture, then UAT-04, then UAT-05.** Order: UAT-01 (seed) → UAT-02 (migrate full scenario C: 3 runs) → UAT-03 (reap destination) → UAT-04 (cleanup, synthetic tmp dir) → UAT-05 (verify, environment-wide audit). **Reasoning:** this mirrors the actual user workflow the toolkit was designed for — testing skills in the order users invoke them surfaces integration defects (e.g., if reap can't read the manifest migrate left behind, UAT-03 catches it). UAT-04 and UAT-05 are intentionally independent of the chain — UAT-04 because of D-10's synthetic-only rule, UAT-05 because it's environment-wide rather than project-specific.
- **D-16: UAT-05 last gives a final clean-state environment audit.** Pre-UAT baseline is already visible via `/gsd-progress` and the existing diagnosed debug sessions; running UAT-05 first as a baseline adds bookkeeping with no diagnostic gain. Last-position run validates that the chain didn't leave the environment in an unexpected state.

### Scope discipline

- **D-17: No new MCP tools, no new skills, no skill behavior changes.** Phase 19 is observational — if a skill is observed to misbehave, the fix lands in a separate plan (or 19.x sub-plan) under Phase 19's scope, but the fix is a defect remediation, not a feature addition. The 5 skills + 9 MCP tools shipped in v3.0.0 are the surface under test.
- **D-18: Defects discovered during UAT close as UAT-status `diagnosed` with fix plans, not as silent skill changes.** Matches the `/gsd-verify-work` pattern: diagnosed → fix plan → execute → re-test → status passed. `/gsd-progress` routes correctly because the per-skill row carries an explicit status.

### Claude's Discretion

The following are implementation details delegated to the planner / executor. Decisions made here for the planner's reference, not for re-litigation:

- **Tarball install location:** the planner picks where the tarball-gate temp install dir lives (suggested: `os.tmpdir()` per project convention) and how the MCP server registration is swapped between local-dist mode and tarball-install mode (`claude mcp remove` + `claude mcp add` is the obvious approach).
- **Synthetic candidate count for UAT-04:** at minimum 3 (one orphan dir, one stale ref, one path-hash analog), but the planner may extend to 4-5 if more candidate types surface in the cleanup-scan code paths during planning.
- **Transcript line-range anchor format:** the planner picks anchor convention (line numbers `L42-58`, section headings `## Tool call: localground_seed`, or both). Suggested: section headings with line numbers as fallback.
- **`19-UAT.md` exact frontmatter shape:** match Phase 17/18 verification frontmatter conventions; planner reads the most recent `XX-VERIFICATION.md` to confirm the exact field set.
- **Idempotency fixture detail:** for D-01's idempotency replay (run 2), the planner picks whether to re-paste the skill verbatim or re-invoke from a fresh Claude Code session at the destination. Both validate the same `session: 2` branch; suggested: re-invoke from a fresh session to also validate skill-loading from the destination project's `.claude/skills/`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements lock
- `.planning/REQUIREMENTS.md` §"Skill Runtime Validation (UAT)" — UAT-01..05 with explicit per-skill end-to-end acceptance language; UAT-02 flagged as CRITICAL ("only test that exercises the continuation-token code path")
- `.planning/ROADMAP.md` §"Phase 19: Skill Runtime UAT" — phase goal, dependency lineage (Phase 17 + Phase 18), 5 success criteria the executor verifies against

### Skill specs (the surface under test)
- `.claude/skills/localground-seed.md` — `/localground:seed` skill behavior contract, error cases (project already seeded, not a git repo)
- `.claude/skills/localground-migrate.md` — `/localground:migrate` two-session contract, three session-entry branches (no file / `session: 1` / `session: 2`), state-file schema with example JSON
- `.claude/skills/localground-reap.md` — `/localground:reap` 6-check health assessment, traffic-light scoring rubric
- `.claude/skills/localground-cleanup.md` — `/localground:cleanup` per-item confirmation contract, platform-specific deletion commands, "skip all" state transition
- `.claude/skills/localground-verify.md` — `/localground:verify` environment-wide audit, traffic-light report format
- `.claude/skills/SKILL.md` — MCP server registration prerequisite (`claude mcp add localground -- node /path/to/packages/mcp/dist/index.js`)

### Project-level invariants
- `.planning/PROJECT.md` §"Key Decisions" — Result type pattern, real-fs test fixtures (no mocked fs), no-delete-without-confirm safety model (load-bearing for UAT-04 design), stderr-only logging in MCP server (CRIT-1; transcripts must not capture stdout JSON-RPC noise as user-facing output)
- Memory `feedback_plan_authored_verification.md` — gsd-verifier MUST augment, not overwrite, the plan-authored `19-UAT.md` (D-09)
- Memory `feedback_phase_completion.md` — manually check PROJECT.md and REQUIREMENTS.md after phase completion; STATE doesn't cascade

### Phase 18 boundary contract
- `.planning/phases/18-packaging-polish/18-CONTEXT.md` §"Verification surface" — `scripts/verify-tarball.mjs` covers artifact-level integrity. Phase 19 does NOT re-do `--version` or files-allowlist checks; UAT exercises the runtime path only.
- `scripts/verify-tarball.mjs` — reference implementation for `npm pack` → install → register pattern; D-04's tarball-gate pass mirrors this script's install-dir lifecycle

### Files Phase 19 will create
- `.planning/phases/19-skill-runtime-uat/19-PLAN.md` (and any wave-2/3 plans) — planner authors
- `.planning/phases/19-skill-runtime-uat/19-UAT.md` — durable evidence index, plan-authored, augmented by gsd-verifier (D-07, D-09)
- `.planning/phases/19-skill-runtime-uat/19-transcripts/<skill>.md` — per-skill captured transcripts (D-08)
- `.planning/phases/19-skill-runtime-uat/19-VERIFICATION.md` — gsd-verifier output, post-UAT cross-check
- `.planning/phases/19-skill-runtime-uat/19-SUMMARY.md` — phase summary written at execute close

### Files referenced read-only (do not modify in Phase 19)
- `packages/mcp/dist/index.js` — local-dist runtime target (D-04 inner loop); rebuilt fresh by `npm run build` between defect-fix iterations
- `packages/mcp/src/index.ts`, `packages/cli/src/index.ts` — read for transcript context if a defect requires fix-plan authoring
- `packages/core/src/operations/chunk.ts`, `packages/core/src/operations/copy.ts` — continuation-token implementation; NOT modified by Phase 19 (any defects here are crash-resume scope per D-02 → v3.1.0 backlog)

### Out-of-scope artifacts (Phase 20 will create)
- `.github/workflows/ci.yml` first green run on master — Phase 20 SC #1, not Phase 19
- `.github/workflows/release.yml` first OIDC publish — Phase 20 SC #2-3
- npmjs.com per-package READMEs rendering — Phase 20 SC #4 (DOC-03)
- `npx -y @localground/cli@3.0.1 detect` smoke — Phase 20 SC #5 (D-06)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`scripts/verify-tarball.mjs`** (Phase 18, root): reference for `npm pack` → install → smoke-check pattern. UAT-02's tarball-gate pass mirrors the install-dir lifecycle (`os.tmpdir()` + cleanup) plus the `node <path>/dist/index.js` invocation pattern.
- **Existing `mkdtemp` + `afterEach` real-fs pattern** (`packages/core/test/environment/decode.test.ts:9-21`, `packages/cli/test/smoke.test.ts`): UAT-04's synthetic candidate fixture follows the same pattern, but invoked manually as part of the UAT setup rather than inside Vitest.
- **Phase 17/18 verification artifact pattern** (`.planning/phases/17-core-decoder-calibration/17-VERIFICATION.md`, `.planning/phases/18-packaging-polish/18-VERIFICATION.md`): structured frontmatter + Observable Truths table + Behavioral Spot-Checks + cross-check section. `19-UAT.md` follows this same shape with per-skill rows mapped to SC1-5 and an evidence-pointer column.
- **`/gsd-verify-work` UAT format**: status states (`passed | partial | diagnosed | blocked`) and per-criterion checkbox rows; Phase 19's plan authors `19-UAT.md` directly in this format so `/gsd-progress` route logic works without modification.

### Established Patterns
- **No `shell: true` on spawn calls** (project-wide, CRIT-3/MOD-3): if UAT shells out (e.g., to register the MCP server, run `claude mcp add`), commands use array args. Transcripts capture commands verbatim — array-form commands are the auditable shape.
- **Stdio discipline (CRIT-1)**: stdout reserved for JSON-RPC in MCP server. Transcripts must distinguish between stdout JSON-RPC (frame boundaries) and stderr diagnostic output. The maintainer's transcript capture should preserve this distinction where it matters for diagnosing tool-routing defects.
- **Result type narrowing**: every MCP tool response carries `isError` boolean + `content` array; transcripts that capture an `isError: true` response are diagnostic gold and should be preserved verbatim with the `errorReason` payload.

### Integration Points
- **MCP server registration handoff**: `claude mcp add localground -- node /path/to/packages/mcp/dist/index.js` is the entry point. UAT must verify this works for both local-dist and tarball-install paths (D-04). Re-registration between paths is `claude mcp remove localground` + `claude mcp add` with the new path.
- **Skill loading**: skills load from project-level `.claude/skills/` first, then user-level `~/.claude/skills/`. UAT-02's idempotency replay benefits from a fresh Claude Code session at the destination so skill-loading from the destination project's `.claude/skills/` is also validated (per Claude's Discretion note).
- **Two-session restart boundary**: Session 1 writes `localground-migrate-state.json` to the destination base path; Session 2 is a fresh Claude Code launch from that directory. The transcript capture must span both sessions but each session goes in its own transcript file (D-07 lists `migrate-session-1.md` and `migrate-session-2.md` separately).

</code_context>

<specifics>
## Specific Ideas

- **"Test the skill's branches, not the token mechanism"** — D-01 reflects this principle. The continuation-token loop in `chunk.ts`/`copy.ts` is already exercised by Vitest with real-fs fixtures; what UAT-02 uniquely validates is the **skill's** session-detection branching and the state-file handoff across a Claude Code restart. Scenario C is the smallest set that touches every documented skill branch.
- **"Don't let the safety test become an unsafe event"** — D-10/D-11 reflects this principle. The cleanup skill's load-bearing claim is "we don't accidentally delete stuff." Running UAT-04 against real artifacts on the maintainer's machine reintroduces the exact class of risk the toolkit was built to eliminate. Synthetic-only is the only consistent design.
- **"Re-parseable evidence routes the next workflow step"** — D-07 reflects this principle. `/gsd-progress` reads UAT status frontmatter to route post-UAT work; freeform narrative breaks the routing contract. The hybrid (structured index + transcripts) preserves `/gsd-progress` routability without sacrificing diagnostic fidelity for fix-plan authoring.
- **"The roadmap already encoded the runtime constraint"** — D-04 reflects the ROADMAP's explicit "UAT runs against the same tarball shape that v3.0.1 will publish." Tarball-install is the gate; local-dist is the iteration loop. `verify-tarball.mjs` covers what it covers; UAT covers the runtime layer above it.

</specifics>

<deferred>
## Deferred Ideas

- **Crash-resume mid-loop test** (D-02) — race-prone in manual UAT; belongs in deterministic Vitest test against `chunk()` + `copy()` directly. v3.1.0 backlog candidate; not blocking v3.0.1 close.
- **Multi-project migration batching** (D-03) — fixture overhead disproportionate to defect risk on patch release scope; ROADMAP success criterion #2 specifies single-project handoff. Out of scope for v3.0.1 entirely.
- **Real stale-artifact cleanup on maintainer's machine** (D-11) — the 3 diagnosed debug entries plus orphan path-hash entries get cleaned via a separate, deliberate post-UAT operation. Not folded into Phase 19 to preserve the safety-test invariant.
- **Phase 14 fixture removal** (D-13) — OneDrive QMS folder + 2535-file local target stay untouched during Phase 19; cleaned via a deliberate housekeeping operation after Phase 19 closes. Could be combined with the D-11 post-UAT cleanup.
- **`npx -y @localground/cli@3.0.1 detect` smoke against published tarball** (D-06) — covered by Phase 20 SC #5, not Phase 19. Tested only after v3.0.1 actually publishes to npm.
- **Fix plans for any defects discovered during UAT** (D-18) — if a UAT lands `diagnosed`, a fix plan opens under Phase 19's scope (e.g., 19-02-PLAN.md), executes, then the UAT re-runs to confirm `passed`. Defects belong under Phase 19's roof; v3.0.1 milestone advances only when all 5 UATs are `passed`.
- **Codebase maps refresh** — `.planning/codebase/STACK.md` and `STRUCTURE.md` still describe the v1.2.0 era. Already deferred in Phase 16's CONTEXT.md and Phase 17's CONTEXT.md and Phase 18's CONTEXT.md. Same call here: not blocking Phase 19; refresh via `/gsd-map-codebase` before v3.1.0 if any future planning needs accurate maps.

</deferred>

---

*Phase: 19-skill-runtime-uat*
*Context gathered: 2026-04-27*
