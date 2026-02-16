# EPIC-022: Health Check & Process Adherence

## Vision

Give human partners a supervision tool for the AI-accelerated workflow. As AI agents move faster than humans can review in real-time, the human's role shifts from **real-time reviewer** to **checkpoint auditor**. `ginko health` provides the dashboard for that role.

## Framing

**What won't work:** Expecting ginko to absolve the human of all supervisory responsibilities through code or CLAUDE.md rules.

**What can work:** Giving the human a health check tool so they can successfully carry out their supervisory responsibilities.

**For humans:** AI partners can make mistakes and skip important steps just like humans. Your responsibility is to review work product and process adherence carefully at natural breakpoints. Use `ginko health` to view health status and `ginko health --fix` for guided remediation.

## Problem Statement

AI partners skip process steps (session logging, task status updates, file creation, graph sync) under cognitive load — especially when detailed plans create the illusion that "planning is done." Humans can't catch these gaps in real-time as AI speed increases. There is no tool to audit process adherence at natural breakpoints.

## Success Criteria

- `ginko health` shows a clear, actionable adherence report covering tracking, completion, artifacts, sync, and session logs
- `ginko health --fix` provides interactive guided remediation for each gap
- Adherence summary is surfaced automatically at work completion moments (task complete, handoff)
- Command works in local-only mode (no cloud dependency required — ADR-078)
- Shipped in OSS staging repo alongside EPIC-021

## Sprints

### Sprint 1: Core Health Command (e022_s01)
Build `ginko health` — aggregate data from local files, git, and session state into an adherence report.

### Sprint 2: Fix Mode & Integration (e022_s02)
Add `--fix` guided remediation and integrate health nudges into existing commands (task complete, handoff).

## Architecture Notes

- All data sources are local (sync-state.json, session files, sprint files, git) — no cloud dependency
- Follows output formatting patterns from existing commands (chalk, box drawing, GINKO_BRAND)
- Registered via Commander.js in index.ts
- Health check categories: Tracking, Completion, Artifacts, Graph Sync, Session Logs

## Status: Active
## Created: 2026-02-16
