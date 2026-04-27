---
phase: 12-discipline-codification
plan: "01"
subsystem: documentation
tags: [claude-md, testing-docs, pattern-enforcement, prisma-naming, integration-spec-mandate]
dependency_graph:
  requires: []
  provides: [PATTERN-01-docs, PATTERN-02-docs, PATTERN-03-docs]
  affects: [every-claude-code-session, docs/TESTING.md]
tech_stack:
  added: []
  patterns: [PATTERN-01, PATTERN-02, PATTERN-03]
key_files:
  created:
    - CLAUDE.md
  modified:
    - docs/TESTING.md
decisions:
  - "Rules go in CLAUDE.md (auto-loaded by AI tooling) and docs/TESTING.md (human reference) — no separate PATTERNS.md"
  - "PATTERN-02 is doc-only enforcement (semantic analysis too fragile for CI grep); PATTERN-03 is CI-enforced via check-integration-specs.ts"
metrics:
  duration: "~5 minutes"
  completed_date: "2026-04-27"
  tasks_completed: 2
  files_created: 1
  files_modified: 1
---

# Phase 12 Plan 01: Discipline Codification — Documentation Summary

## One-liner

CLAUDE.md created at repo root with PATTERN-01 Prisma naming rules and PATTERN-02/03 integration spec mandates; docs/TESTING.md updated with both sections and accurate CI Integration description replacing the stale "no CI pipeline" text.

## What Was Built

**Task 1 — CLAUDE.md at repo root**

Created `/CLAUDE.md` with two sections:
- `## Prisma Client Naming (PATTERN-01)` — mandates `rlsPrisma` for RLS-aware client and `rlsBypassPrisma: PublicPrismaService` for bypass. Traces rationale to v2.0 bug B1.
- `## Integration Spec Mandate (PATTERN-02, PATTERN-03)` — PATTERN-02 requires a real-DB integration spec when a nested `include` chain feeds a side effect (B3 rationale); PATTERN-03 mandates a sibling `*.integration.spec.ts` for any service injecting both clients, enforced by CI.

This file is auto-loaded by Claude Code on every session, making these rules ambient to all AI-assisted development.

**Task 2 — docs/TESTING.md updates**

Four changes applied:
1. Added `## Prisma Client Naming Convention (PATTERN-01)` section with naming table, rationale, and correct constructor example
2. Added `## Integration Spec Mandate (PATTERN-02, PATTERN-03)` section with both rules and local run command
3. Replaced stale `## CI Integration` section (claimed "no CI pipeline") with accurate description of `test.yml`: triggers, Node 24, Postgres 16 service container, all pipeline steps including skip-grep guard and PATTERN-03 check
4. Reviewed `## Next Steps` — no outdated items were present; kept existing doc cross-references

## Decisions Made

- Rules codified in two places: `CLAUDE.md` for AI tooling auto-load, `docs/TESTING.md` for human developer reference
- PATTERN-02 is documentation-only enforcement (semantic analysis of "nested include + side effect" too fragile for static grep/ts-morph)
- PATTERN-03 is CI-enforced via `backend/scripts/check-integration-specs.ts` (created by plan 12-02)

## Deviations from Plan

None — plan executed exactly as written.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced. Both files are documentation-only (plain Markdown). Threat model T-12-01 and T-12-02 dispositions: accept.

## Self-Check

### Files
- `CLAUDE.md` exists at repo root: PASS
- `docs/TESTING.md` updated with new sections: PASS

### Commits
- Task 1: 29b1a46 — CLAUDE.md creation
- Task 2: 13db7a9 — TESTING.md updates

### Acceptance Criteria
- `grep -c "rlsBypassPrisma" CLAUDE.md` = 2 (>= 2): PASS
- `grep -c "rlsPrisma" CLAUDE.md` = 1 (>= 1): PASS
- `grep -c "PublicPrismaService" CLAUDE.md` = 3 (>= 1): PASS
- `grep -c "PATTERN-01" CLAUDE.md` = 1: PASS
- `grep -c "PATTERN-02" CLAUDE.md` = 2 (>= 1): PASS
- `grep -c "PATTERN-03" CLAUDE.md` = 2 (>= 1): PASS
- `grep -c "integration spec" CLAUDE.md` = 3 (>= 1): PASS
- `grep -c "Prisma Client Naming Convention" docs/TESTING.md` = 1: PASS
- `grep -c "Integration Spec Mandate" docs/TESTING.md` = 1: PASS
- `grep "No CI/CD pipeline" docs/TESTING.md` = not found (0): PASS
- `grep -c "test.yml" docs/TESTING.md` = 1 (>= 1): PASS
- `grep -c "check-integration-specs" docs/TESTING.md` = 3 (>= 1): PASS

## Self-Check: PASSED
