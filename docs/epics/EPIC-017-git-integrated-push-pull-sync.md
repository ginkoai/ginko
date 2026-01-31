---
epic_id: EPIC-017
status: active
created: 2026-01-30
updated: 2026-01-30
roadmap_lane: now
roadmap_status: in_progress
tags: [sync, push, pull, graph, git, ADR-077]
---

# EPIC-017: Git-Integrated Push/Pull Sync

**Status:** Active
**Priority:** Critical
**Estimated Duration:** 5 sprints
**ADR:** ADR-077: Git-Integrated Push/Pull Sync Architecture

---

## Vision

Replace fragmented sync commands (`ginko sync`, `ginko graph load`, `--sync` flags) with a git-inspired `ginko push` / `ginko pull` model. Retire broken WriteDispatcher/EventQueue. Add auto-push via orchestrator/skill pattern. Fix 6 UAT bugs (BUG-005, 007, 010, 011, 018, 019).

---

## Problem Statement

### Current State

After EPIC-015 and UAT Round 2, sync between local git and the cloud graph is fragmented:

1. **Multiple sync commands** - `ginko sync`, `ginko graph load`, `--sync` flags on epic/charter — confusing
2. **Broken real-time sync** - WriteDispatcher adapters never initialize, EventQueue 404s on events endpoint
3. **No change detection** - `ginko graph load` pushes ALL files every time, creating duplicates (BUG-007)
4. **Status doesn't persist** - Task/sprint status changes via CLI don't auto-push (BUG-010)
5. **Misleading messages** - "No new content" when there are unpushed changes (BUG-019)

### User Stories

- As a developer, I want `ginko push` to push only my changes (like `git push`)
- As a developer, I want `ginko pull` to get dashboard edits (like `git pull`)
- As a developer, I want auto-push after task operations so status persists
- As an AI assistant, I want a single unified sync model I can learn and execute reliably

---

## Architecture

### Data Flow (ADR-060 alignment)
- **Content** (markdown files): Git-authoritative → `ginko push` → Graph
- **State** (status, assignments): Graph-authoritative → `ginko pull` → Local cache
- **Events** (session logs): Local → `ginko push` → Graph

### What Gets Retired
- WriteDispatcher + adapter pattern (broken)
- EventQueue + DLQ (broken)
- `ginko sync` (deprecated → delegates to `ginko pull`)
- `ginko graph load` (deprecated → delegates to `ginko push`)
- `--sync` flags on epic/charter (deprecated)

---

## Sprints

### Sprint 1: Core Push Command + Sync State
- Sync state module (`.ginko/sync-state.json`)
- Git change detection utility
- Entity type classifier
- `ginko push` command with subcommands
- Event push support
- **Fixes:** BUG-007 (duplicates), BUG-019 (misleading messages)

### Sprint 2: Pull Command + Status + Diff
- `ginko pull` wrapping existing sync logic
- Enhanced `ginko status` with sync state
- `ginko diff` for local vs graph comparison
- **Fixes:** BUG-018 (bidirectional sync)

### Sprint 3: Auto-Push via Orchestrator + Skills
- Auto-push utility (non-blocking)
- Auto-push hooks in task/sprint/epic/charter commands
- Push-all in handoff command
- **Fixes:** BUG-005 (entity creation sync), BUG-010 (status persistence), BUG-011 (event sync)

### Sprint 4: Deprecation + Documentation + Behavioral Enforcement
- Deprecation warnings on old commands
- AI instructions template updates (graph-first protocol)
- CLAUDE.md and skill updates
- Push/pull output formatting with reinforcement hints
- Optional git hooks

### Sprint 5: Cleanup + WriteDispatcher Retirement
- Deprecate WriteDispatcher, GraphAdapter, LocalAdapter, EventQueue, DLQ
- Remove EventQueue usage from handoff
- Update ADR-077 status: Proposed → Accepted
- Full regression test

---

## Success Criteria

- [ ] `ginko push` pushes only changed files (git diff-based)
- [ ] `ginko pull` pulls dashboard edits to local git
- [ ] Auto-push fires after task/sprint/epic status changes
- [ ] All 6 UAT bugs resolved (BUG-005, 007, 010, 011, 018, 019)
- [ ] Deprecated commands warn and delegate
- [ ] AI instructions enforce push/pull as canonical sync
- [ ] WriteDispatcher and EventQueue are deprecated

---

## Bug Resolution Map

| Bug | Fix | Sprint |
|-----|-----|--------|
| BUG-005 | Auto-push after entity creation | Sprint 3 |
| BUG-007 | Git-based change detection (push only changed files) | Sprint 1 |
| BUG-010 | Auto-push after status changes | Sprint 3 |
| BUG-011 | Retire broken EventQueue, use push via working API path | Sprint 3 + 5 |
| BUG-018 | Push + Pull replaces broken bidirectional sync | Sprint 1 + 2 |
| BUG-019 | Git diff shows exactly what changed | Sprint 1 |
