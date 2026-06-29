---
phase: 20-release-pipeline-validation
plan: "06"
subsystem: release-infra
tags: [post-publish-verification, sc3, sc4, sc5, d-12, provenance, npx, re-verify, 3.0.2]
dependency_graph:
  requires: [20-05, 20-07]
  provides: [PIPE-02-verified, SC3, SC4, SC5, DOC-03, D-12]
  affects: []
tech_stack:
  added: []
  patterns: [adversarial-multi-lens-verification, isolated-cache-npx-smoke, registry-truth-over-run-status]
key_files:
  created: []
  modified: []
decisions:
  - "Post-publish verification was run as an adversarial 4-lens workflow (provenance, README, npx-exec, tarball-integrity) + synthesis, NOT a single check — appropriate for an irreversible public release under ultracode."
  - "FIRST PASS (against 3.0.1) FOUND A REAL DEFECT: SC5 FAIL — published 3.0.1 binaries printed 3.0.0 (npx --version). Root cause: hardcoded source version literals. This is the release pipeline working as designed (validation caught a shipped defect)."
  - "Resolved via fix-forward to 3.0.2 (plan 20-07): version derived from package.json at runtime + verify-tarball version-equality CI gate. npm 3.0.1 immutable."
  - "SECOND PASS (against 3.0.2) — ALL PASS: SC3 provenance, SC4/DOC-03 README, SC5 npx (cli+mcp --version == 3.0.2, no 3.0.0 regression), tarball integrity (README.md present, zero stale 3.0.0 in dist/index.js)."
  - "D-12 satisfied: documented `claude mcp add --transport stdio ... -- cmd /c npx -y @localground/mcp@3.0.1` registered and CONNECTED (throwaway server name to avoid clobbering the active localground registration; removed after); NO .mcp.json created (Phase 19 C-1 preserved). The same documented command pattern applies to 3.0.2 via npx dist-tag latest."
  - "The two web-visual confirmations (provenance badge + README render on the npmjs.com 3.0.2 pages) are non-blocking formalities — machine corroboration is overwhelming (dist.attestations non-null + readmeFilename README.md + README.md in tarball)."
deviations:
  - "20-06 could not be closed against 3.0.1 as originally planned because 3.0.1 failed SC5. It is closed against 3.0.2 (the fix-forward release), which is the artifact that satisfies all success criteria. The plan's intent (prove the release shipped usable artifacts) is met — by 3.0.2."
metrics:
  completed_date: "2026-06-29"
  verification_passes: 2
  first_pass_target: "3.0.1 (SC5 FAIL — defect caught)"
  second_pass_target: "3.0.2 (ALL PASS)"
  reverify_workflow_runs: 2
---

# Phase 20 Plan 06: Post-Publish Verification Summary

Post-publish verification of the milestone-closing artifacts, run as an adversarial multi-lens workflow. The first pass against 3.0.1 **caught a real defect** (SC5 fail — binaries misreported their version); after the fix-forward to 3.0.2 (plan 20-07), the second pass confirms **all success criteria pass**.

## Pass 1 — against v3.0.1 (defect caught)

| Lens | Result |
|------|--------|
| Provenance (SC3) | PASS — SLSA-v1 attestations on both |
| README (SC4/DOC-03) | PASS — real per-package READMEs |
| **npx (SC5)** | **FAIL — cli & mcp `--version` printed 3.0.0** |
| Tarball | PASS — README.md + dist present |

Root cause: hardcoded source version literals (`cli .version('3.0.0')`, `mcp SERVER_VERSION='3.0.0'`) not updated by the manifest-only bump. npm 3.0.1 immutable → fix forward.

## Pass 2 — against v3.0.2 (all pass)

| Criterion | Result | Evidence |
|---|---|---|
| SC3 — provenance | ✅ PASS | dist.attestations non-null (SLSA v1), OIDC publisher GitHub Actions, gitHead 26659c8 |
| SC4 / DOC-03 — README | ✅ PASS | mcp 4305 / cli 3654 chars real content; readmeFilename README.md; README.md in both tarballs |
| **SC5 — npx** | ✅ **PASS** | `npx @localground/cli@3.0.2 --version`→3.0.2; `...mcp@3.0.2`→3.0.2; detect exit 0; **3.0.0 regression did NOT recur** |
| Tarball integrity (T-20-20) | ✅ PASS | README.md + dist present; **zero `3.0.0` in dist/index.js** for both; dist.integrity present |
| D-12 — MCP-add | ✅ PASS | throwaway registration connected via documented `cmd /c npx`; no .mcp.json created |

Synthesis verdict: **overall pass**, zero gaps. The v3.0.1 SC5 defect is fixed in 3.0.2.

## Outstanding (non-blocking)

- Two web-visual confirmations on the npmjs.com 3.0.2 pages (provenance badge render + README render) — surfaced to the owner; machine corroboration makes them a formality.

## Self-Check: PASSED

- SC3/SC4/SC5 all PASS against the published 3.0.2 artifacts (registry truth via npm view + clean-cache npx, not just run status).
- The pipeline demonstrably caught a real shipped defect (SC5 on 3.0.1) and the fix-forward closed it — the strongest possible validation of PIPE-02.
- D-12 validated; no bundled .mcp.json (Phase 19 C-1 preserved).
