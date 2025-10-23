---
id: FEATURE-024
type: feature
title: Configuration and Reference System
parent: null
status: complete
priority: CRITICAL
created: 2025-10-22
updated: 2025-10-23
completed: '2025-10-23T00:00:00.000Z'
effort: 16
children: [TASK-009, TASK-010, TASK-011, TASK-012]
tags: [configuration, team-collaboration, path-resolution, progressive-loading, references]
prd: PRD-009
adr: ADR-037
---

# Configuration and Reference System

## Problem Statement

Current context loading suffers from structural inefficiencies:
- AI progressively searches filesystem for project resources (wastes tokens and time)
- Session log entries lack strategic context links (sprint→PRD→ADR)
- Short-term memory (session logs) disconnected from long-term memory (sprints/PRDs/ADRs)
- No team visibility into member activity
- Absolute paths in config files break for each team member

## Solution

Implement two-tier configuration system (team-shared `ginko.json` + user-specific `.ginko/local.json`) with reference link system enabling semantic navigation across documentation hierarchy.

## Success Criteria

- [ ] AI finds all project resources in <1 second (no progressive searching)
- [ ] 80% of context loaded from 3-5 documents (session + sprint + refs)
- [ ] >90% of session log entries include references (TASK-XXX, PRD-YYY, ADR-ZZZ)
- [ ] Zero git conflicts on paths across team members
- [ ] 100% team visibility into active work through session logs
- [ ] Work mode controls documentation depth (hack-ship vs full-planning)

## Tasks

- [ ] TASK-009: Two-Tier Configuration Foundation
- [ ] TASK-010: Reference Link System
- [ ] TASK-011: Progressive Context Loading
- [ ] TASK-012: Team Collaboration Features

## Architecture

**Two-Tier Config:**
```
ginko.json (git-tracked) → Relative paths, team structure
  +
.ginko/local.json (git-ignored) → Absolute projectRoot, user prefs
  =
Instant path resolution for all team members
```

**Reference Navigation:**
```
Session Log Entry → TASK-006 → SPRINT-2025-10-22 → PRD-009 → ADR-037
                     ↑              ↑                 ↑          ↑
                  tactical      strategic         why        how
```

**Progressive Loading:**
```
1. Load session log (short-term memory)
2. Load current sprint (long-term bootstrap)
3. Extract references (TASK-XXX, PRD-YYY, ADR-ZZZ)
4. Load referenced docs up to maxDepth: 3
5. Synthesize context hierarchy
   → 80% context from 3-5 docs instead of 50+
```

## Technical Notes

- TypeScript implementation in `packages/cli/src/utils/`
- Config schema validation using Zod or similar
- Reference extraction via regex patterns
- Path resolution helper: `resolveProjectPath(relativePath)`
- Integration with `ginko start`, `ginko log`, `ginko init`

## Dependencies

- ADR-033: Session logging foundation (defensive logging)
- ADR-036: Session synthesis architecture
- Existing CLI infrastructure

## Related Documents

- **PRD**: [PRD-009: Configuration and Reference System](../docs/PRD/PRD-009-configuration-and-reference-system.md)
- **ADR**: [ADR-037: Two-Tier Configuration Architecture](../docs/adr/ADR-037-two-tier-configuration-architecture.md)
