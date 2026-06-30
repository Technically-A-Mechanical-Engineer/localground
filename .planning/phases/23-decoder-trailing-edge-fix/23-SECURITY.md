---
phase: 23
slug: decoder-trailing-edge-fix
status: verified
threats_open: 0
asvs_level: 1
created: 2026-06-30
---

# Phase 23 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail. CORE-16 decoder trailing-edge fix.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| local filesystem → `decode()` | `decode()` reads directory listings (`fs.readdir`) under `~/.claude/projects/` (or a temp dir in tests). The hash string originates from a directory name on the local disk — not from network or untrusted remote input. | Local directory names the user (or Claude Code) already created. No network, no remote input. |
| test harness → real filesystem (`os.tmpdir`) | Test-only (Plan 23-02). The test process creates and removes real directories under `os.tmpdir()` (per-test `mkdtemp` + `afterEach` `fs.rm`). | Local temp directory names. No production code path, no network. |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-23-01 | Tampering / Information disclosure (path confusion) | `decode()` returning a silently-WRONG folder for an ambiguous hash | mitigate | D-01 verify-then-return — `decode.ts:68-78`: `candidates.find((c) => encode(c).toLowerCase() === hashDirName.toLowerCase())`; `candidates[0]` best-guess removed (0 matches); `no_candidates` returned when none verify. Spurious-sibling test `decode.test.ts:235-258`. See **residual note** below (WR-01 / 999.9). | closed |
| T-23-02 | Denial of service (unbounded recursion) | additive `--` branch in `buildCandidates` | accept | Cap and budget intact — `decode.ts:119` (`maxCandidates = 20`), `:182` (`results.length >= maxCandidates` break before recursion), `:210` & `:227` (`maxCandidates - results.length` budget on both Case 2 and Case 3). `nextRemaining` strictly shrinks → depth bounded by hash length. Independently confirmed terminating/bounded by code review (23-REVIEW.md). | closed |
| T-23-03 | Information disclosure (traversal outside intended root) | `fs.readdir`/`fs.access` on entry names | accept | No new input surface vs v3.0.0 — `decode.ts:193-230`: `path.join(currentPath, entry.name)` joins only real `readdir` entry names; no externally-supplied path segment is introduced; cannot escape the walked root. | closed |
| T-23-04 | Tampering (regression hiding a path-confusion bug) | the matrix failing to catch a future silently-wrong decode | mitigate | Value-assertion maximalism — `decode.test.ts:280-297` (`assertRoundTrip` asserts `decodedPath.toLowerCase()` equality, not just `success`) applied across all 45 matrix cases (`:301-330`); explicit canonical OneDrive value test (`:332-354`, value assertion `:351`) pins the load-bearing decode. | closed |
| T-23-05 | Denial of service (temp-dir fixture leak) | `afterEach` not removing `os.tmpdir()` fixtures | accept | `fs.rm(tmpDir, { recursive: true, force: true })` in `afterEach` for both describe blocks — `decode.test.ts:20` and `:274`; `force:true` tolerates Windows handle races. Same posture as the pre-existing decode tests. | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-23-01 | T-23-02 | The additive `--` branch adds at most one extra recursion per matching entry; the `maxCandidates=20` cap and per-recursion budget are preserved unchanged and `nextRemaining` strictly shrinks, so no unbounded loop is introduced. Realistic Claude Code path depth ≤ ~12. | R. LaSalle (`/gsd-secure-phase 23`) | 2026-06-30 |
| AR-23-02 | T-23-03 | No new untrusted/network input surface: the hash is a local directory name, all reads are listings of already-existing local directories, and `path.join` on real `readdir` entry names cannot escape the walked root. Unchanged from v3.0.0. | R. LaSalle (`/gsd-secure-phase 23`) | 2026-06-30 |
| AR-23-03 | T-23-05 | Test-only cleanup posture; `fs.rm(..., { force: true })` tolerates Windows handle races. Identical to the pre-existing 15 decode tests. | R. LaSalle (`/gsd-secure-phase 23`) | 2026-06-30 |
| AR-23-04 | T-23-01 (residual) | **WR-01 (code review 23-REVIEW.md):** D-01's verify-then-return rejects *non*-round-tripping spurious siblings (its stated scope) but cannot *uniquely* disambiguate two on-disk siblings that BOTH round-trip to the same lossy `encode()` hash; `candidates.find()` returns whichever `readdir` order surfaces first. WR-03: the case-insensitive compare (required for Windows drive-letter upcasing) widens the wrong-path surface on case-sensitive filesystems. The T-23-01 mitigation IS present and correct for its scope; this collision edge is out of CORE-16's single-char scope and tracked as **ROADMAP backlog 999.9** (with the WR-02 true-collision test gap). Phase verifier (23-VERIFICATION.md, passed 6/6) reviewed and did not treat it as a phase gap. | R. LaSalle (`/gsd-secure-phase 23`) | 2026-06-30 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-06-30 | 5 | 5 | 0 | gsd-security-auditor (ASVS L1) via `/gsd-secure-phase 23` |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-06-30
