# PRD-009: Configuration and Reference System

## Problem Statement

Current context loading suffers from critical structural issues:

- **Progressive Searching**: AI searches from CWD up, wasting time and context budget
- **Orphaned Events**: Session log entries lack links to strategic context (sprints, PRDs, ADRs)
- **Low-Quality Logs**: Session entries often miss WHY (rationale), alternatives considered, and contextual insights
- **Memory Fragmentation**: Short-term (session logs) and long-term (sprint/PRD/ADR) memory systems are disconnected
- **Path Ambiguity**: No canonical way to locate project resources across team members
- **Context Inefficiency**: AI can't quickly bootstrap from sprint → PRD → ADR hierarchy
- **Team Collaboration Gaps**: No visibility into what teammates are working on

The result is wasted tokens on file discovery, orphaned tactical work without strategic context, and inability to achieve 80% context from core documents.

## Solution Overview

Implement a two-tier configuration system that:
1. **Defines canonical project structure** via git-tracked `ginko.json`
2. **Stores user-specific paths** in git-ignored `.ginko/local.json`
3. **Creates reference links** between session logs, sprints, PRDs, and ADRs
4. **Enables progressive context loading** following the reference graph
5. **Enhances session log quality** with rich context capture (WHY, alternatives, insights)
6. **Supports team collaboration** through user-namespaced session logs

## User Stories

### As an AI Assistant
- I want to find project resources instantly without progressive searching
- I want to link session events to sprint tasks/PRDs/ADRs for strategic context
- I want to bootstrap from session log → sprint → PRDs/ADRs in priority order
- I want to load 80% of needed context from core documents, then expand as needed
- I want to see what teammates are working on to avoid duplication

### As a Developer
- I want my local paths resolved automatically without git conflicts
- I want session logs to show "why" by linking to sprint goals
- I want new team members to get full project context instantly
- I want to see team activity through shared session logs
- I want work mode to control documentation depth (hack-ship vs full-planning)

## Success Criteria

### Quantitative Metrics
- **Bootstrap Speed**: AI finds all core resources in <1 second (no progressive searching)
- **Context Coverage**: 80% of needed context from 3 documents (session + sprint + PRD/ADR)
- **Reference Density**: >90% of session log entries link to sprint tasks or higher-level docs
- **Team Awareness**: 100% visibility into active teammate work through session logs
- **Path Resolution**: Zero git conflicts on file paths across team members

### Qualitative Metrics
- AI naturally explains work in terms of strategic goals ("per TASK-006 in current sprint")
- Fresh AI understands both tactical details (session log) and strategic context (sprint/PRD)
- Team members can see collaboration opportunities from session logs
- New developers get comprehensive onboarding from config + sprint + PRDs

## Core Features

### 1. Two-Tier Configuration

**`ginko.json`** (git-tracked, team-shared):
```json
{
  "project": {
    "name": "Ginko",
    "type": "monorepo"
  },
  "paths": {
    "sprints": "docs/sprints",
    "currentSprint": "docs/sprints/CURRENT-SPRINT.md",
    "prds": "docs/PRD",
    "adrs": "docs/adr",
    "sessions": ".ginko/sessions"
  },
  "workMode": {
    "default": "think-build",
    "documentationDepth": {
      "hack-ship": ["currentSprint", "sessions"],
      "think-build": ["currentSprint", "sessions", "adrs", "prds"],
      "full-planning": ["all"]
    }
  }
}
```

**`.ginko/local.json`** (git-ignored, user-specific):
```json
{
  "projectRoot": "/Users/cnorton/Development/ginko",
  "userEmail": "xtophr@gmail.com",
  "workMode": "think-build"
}
```

### 2. Reference Link System

**Session Log Entries**:
```markdown
### 17:13 - [fix]
Fixed session log archival timing (TASK-006, SPRINT-2025-10-22)
Files: packages/cli/src/commands/start/start-reflection.ts:60-82
```

**Sprint Tasks**:
```markdown
## TASK-006: Fix session log timing
**PRD**: PRD-009
**ADR**: ADR-033
**Status**: Complete
```

**Bidirectional Navigation**:
- Session log → Sprint task → PRD → ADR
- ADR → Related PRDs → Sprint tasks → Session logs

### 3. Progressive Context Loading

**Priority Order** (configurable per work mode):
1. `.ginko/sessions/{user}/current-session-log.md` (short-term memory)
2. `docs/sprints/CURRENT-SPRINT.md` (long-term bootstrap)
3. Follow references: PRD-XXX, ADR-YYY, TASK-ZZZ
4. Load referenced docs up to maxDepth
5. Pull in context modules as needed

**Result**: 80% context from 3-5 documents, not 50+ files

### 4. Team Collaboration via User-Namespaced Sessions

**Structure**:
```
.ginko/sessions/
├── xtophr-at-gmail-com/
│   ├── current-session-log.md  (tracked, no conflicts)
│   └── archive/
├── alice-at-company-com/
│   ├── current-session-log.md
│   └── archive/
```

**Benefits**:
- See what teammates are actively working on
- Avoid duplicate work
- Learn from teammates' defensive logging patterns
- Full team context for fresh AI helping any member

### 5. Session Log Quality Enhancement

**Current State** (8.5/10):
- Root causes present in fixes
- Decision rationale documented
- File paths with line numbers included

**Gaps to Address** (target: 9.5/10):
- WHY missing on features (problem solved)
- Decision alternatives not captured
- Insights section underutilized
- Auto-detection opportunities missed

**Enhancements**:

```bash
# Interactive quality prompts
$ ginko log "Implemented feature X" --category=feature
? What problem does this solve? (WHY): _____
? Files affected: (auto-detected from git status)
✓ Logged with rich context

# Quality validation
$ ginko log --validate
Entry Quality Report:
✓ 5 entries with root causes
✗ 3 features missing WHY
! 0 insights captured

Overall Quality: 8.2/10
Suggestions:
  • Add WHY for features at lines 25, 38
  • Document alternatives for decisions at line 30
```

**Implementation Approach**:
1. **Enhanced Prompts**: Guide users to include WHY, alternatives, and context
2. **Smart Detection**: Auto-detect git operations, files affected, repeated patterns
3. **Quality Scoring**: Validate entries and provide improvement suggestions
4. **Template Improvements**: Add inline examples and sub-templates

**Result**: Higher quality defensive logging → Better handoffs → Stronger context continuity

### 6. Work Mode Adaptive Loading

- **Hack & Ship**: Load session + sprint only (fast iteration)
- **Think & Build**: Add PRDs + ADRs (balanced understanding)
- **Full Planning**: Load full hierarchy (comprehensive context)

Configurable per user, adaptable per task.

## Technical Architecture

### Path Resolution
```typescript
async function resolveProjectPath(relativePath: string): Promise<string> {
  const local = await loadLocalConfig();  // .ginko/local.json
  const config = await loadProjectConfig();  // ginko.json
  return path.join(local.projectRoot, relativePath);
}
```

### Reference Parsing
```typescript
// Extract references from text
const references = extractReferences(text);
// → { tasks: ['TASK-006'], prds: ['PRD-009'], adrs: ['ADR-033'] }

// Resolve and load
for (const ref of references.prds) {
  const prdPath = await resolveProjectPath(`${config.paths.prds}/${ref}.md`);
  const content = await loadDocument(prdPath);
}
```

### Bootstrap Sequence
```typescript
1. Load ginko.json + local.json
2. Resolve projectRoot + user
3. Load session log (short-term memory)
4. Load current sprint (long-term bootstrap)
5. Extract references from sprint
6. Load referenced PRDs/ADRs (depth-limited)
7. Synthesize context hierarchy
8. Report readiness to user
```

## Implementation Phases

### Phase 1: Configuration Foundation
- Implement two-tier config loading
- Create path resolution helpers
- Update ginko init to create local.json
- Add config validation

### Phase 2: Reference Link System
- Define reference syntax (TASK-XXX, PRD-YYY, ADR-ZZZ)
- Implement reference extraction
- Add reference validation (does target exist?)
- Update session logging to support references

### Phase 3: Progressive Loading
- Implement priority-ordered loading
- Add reference following with depth limits
- Create work mode adaptive filters
- Optimize for token efficiency

### Phase 4: Team Collaboration
- Ensure user-namespaced session logs work team-wide
- Add teammate activity visibility
- Create team context analysis tools
- Document collaboration patterns

### Phase 5: Session Log Quality Enhancement
- Enhance CLI prompts to capture WHY and alternatives
- Implement auto-detection for git operations and files
- Add quality validation and scoring
- Update templates with inline examples

## Success Validation

**Before**:
- AI searches 10+ directories to find sprint file
- Session log: "Fixed bug" (no strategic context)
- Fresh AI: "Where were we? What's the goal?"
- Token usage: 5000 tokens to bootstrap

**After**:
- AI loads sprint in <1 second via config
- Session log: "Fixed bug (TASK-006, PRD-009)"
- Fresh AI: "Continuing TASK-006 per PRD-009, next step is..."
- Token usage: 1500 tokens to bootstrap (70% reduction)

## Open Questions

1. Should references be validated at log-time or load-time?
2. How deep should reference following go? (maxDepth: 3 reasonable?)
3. Should we support multi-project configs in `~/.ginko/projects.json`?
4. How to handle reference link rot (target deleted)?
5. Should work mode be per-project or per-session?

## Related Documents

- **ADR-033**: Context Pressure Mitigation Strategy (session logging)
- **ADR-037**: Two-Tier Configuration Architecture
- **PRD-004**: AI-Actively-Managed Context
- **FEATURE-024**: Configuration and Reference System (task breakdown)
- **TASK-009**: Two-Tier Configuration Foundation
- **TASK-010**: Reference Link System
- **TASK-011**: Progressive Context Loading
- **TASK-012**: Team Collaboration Features
- **TASK-013**: Session Log Quality Enhancements
