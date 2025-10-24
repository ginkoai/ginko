---
module: architecture-overview
type: core-knowledge
status: active
updated: 2025-10-23
tags: [architecture, design, patterns, overview]
priority: high
audience: [ai-agent, developer]
estimated-tokens: 1000
---

# Architecture Overview

## Core Philosophy

Ginko solves AI-human pair programming friction through three principles:

1. **Git-Native** - All context stored in `.ginko/` directory, version controlled
2. **Universal Reflection Pattern** - Structured AI output via templates
3. **Session Continuity** - Handoff → Start cycle preserves context across sessions

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   CLI Interface                      │
│  (ginko start, handoff, backlog, log, reflect)      │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│              Core Patterns                           │
│  • ReflectionCommand (universal pattern base)       │
│  • SessionLogManager (continuous logging)           │
│  • ContextLoader (strategic loading)                │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│           Storage Layer (Git-Native)                 │
│  • .ginko/sessions/ - Session logs and handoffs    │
│  • .ginko/context/  - Context modules               │
│  • backlog/items/   - Backlog items                 │
│  • docs/            - Documentation (PRDs, ADRs)    │
└─────────────────────────────────────────────────────┘
```

## Key Patterns

### 1. Universal Reflection Pattern

**Purpose**: Transform natural language intent into structured, deterministic output

**Location**: `packages/cli/src/core/reflection-pattern.ts`

**How it works:**
```typescript
class MyReflection extends ReflectionCommand {
  async gatherContext(intent) { }    // Collect relevant data
  async loadTemplate() { }            // Define output structure
  async generatePrompt() { }          // Create AI-optimized prompt
  async execute(intent, options) { }  // Orchestrate workflow
}
```

**Examples:**
- `StartReflectionCommand` - Session initialization
- `HandoffReflectionCommand` - Session handoff
- `BacklogReflectionCommand` - Backlog item creation

**Benefits:**
- Consistent output structure
- Reusable pattern across domains
- Quality gates prevent drift
- Deterministic despite AI non-determinism

### 2. Session Logging (ADR-033)

**Purpose**: Capture insights at low context pressure, synthesize at high pressure

**Location**: `packages/cli/src/core/session-log-manager.ts`

**Workflow:**
```
Session Start (5% pressure)
    ↓
Work + Log Events (20-80% pressure) ← High quality capture
    ↓
More Work (80-90% pressure)
    ↓
Handoff Synthesis (90% pressure)    ← Synthesize from logs
    ↓
New Session (5% pressure)
```

**Log Categories:**
- `fix` - Bug fixes and error resolution
- `feature` - New functionality
- `decision` - Architectural/design decisions
- `insight` - Patterns, gotchas, learnings
- `git` - Version control operations
- `achievement` - Milestones reached

**Commands:**
```bash
ginko log "message" --category=fix --impact=high
ginko start  # Synthesizes previous session
ginko handoff  # Creates handoff from logs
```

### 3. Strategic Context Loading

**Purpose**: Load minimal, relevant context based on work mode and task status

**Location**: `packages/cli/src/utils/context-loader.ts`

**Loading Strategy:**
```
Priority Order:
1. Always-load core modules (this file + 6 others)
2. Session log (current work)
3. Active backlog items (in-progress + critical)
4. Referenced documents (PRDs, ADRs, Tasks)
5. Nested references (depth-limited to 3)
```

**Work Mode Filtering:**
- **hack-ship**: Minimal (session + 3 core modules)
- **think-build**: Balanced (session + 5 core modules + PRDs/ADRs)
- **full-planning**: Comprehensive (all core + architecture docs)

**Optimizations:**
- Skip completed tasks (backlog status check)
- Cache loaded documents
- Circular reference detection
- Token estimation and limits

### 4. Two-Tier Configuration (ADR-037)

**Purpose**: Separate team-shared config from user-specific settings

**Files:**
- `ginko.json` - Team config (git-tracked)
  - Project paths
  - Work mode defaults
  - Context loading rules
  - Always-load modules

- `.ginko/local.json` - User config (gitignored)
  - User email
  - Project root
  - Local preferences

**Benefits:**
- No git conflicts on paths
- Team consistency
- User customization
- Cross-platform compatibility

## Data Flow Examples

### Session Start Flow
```
User runs: ginko start
    ↓
1. Load previous session log
2. Synthesize session context (4-tier fallback)
3. Archive previous log
4. Load strategic context:
   - Always-load core modules
   - Active backlog items
   - Referenced documents
5. Calculate flow state (1-10)
6. Display resume point
7. Create fresh session log
```

### Session Logging Flow
```
User runs: ginko log "Fixed auth bug"
    ↓
1. Detect affected files (git diff)
2. Estimate context pressure
3. Append to Timeline section
4. Append to category section (Fixes)
5. Auto-detect impact level
6. Continue working...
```

### Backlog Integration Flow
```
Context loader encounters TASK-007
    ↓
1. Check backlog status
2. If status === 'done', skip (completed)
3. If status === 'in-progress', prioritize
4. If status === 'todo' + priority === 'critical', load
5. Follow references from task
6. Apply work mode filtering
```

## Extension Points

**Add new CLI command:**
```typescript
// packages/cli/src/commands/mycommand/index.ts
export async function myCommand(options: any) {
  // Implementation
}

// Register in CLI router
```

**Add new reflector domain:**
```typescript
// packages/cli/src/commands/mydomain/mydomain-reflection.ts
export class MyDomainReflection extends ReflectionCommand {
  constructor() { super('mydomain'); }
  // Implement required methods
}
```

**Add new context module:**
```markdown
---
module: my-module
type: pattern|gotcha|architecture
status: active
priority: high|medium|low
---

# Content here
```

## Key Technologies

- **TypeScript** - Type-safe JavaScript
- **Commander.js** - CLI framework
- **Simple-git** - Git operations
- **fs-extra** - File system utilities
- **Gray-matter** - Frontmatter parsing
- **Chalk** - Terminal coloring
- **Ora** - Terminal spinners
- **Inquirer** - Interactive prompts (when needed)

## Related Documentation

- Full architecture: `docs/architecture/ARCHITECTURE.md` (36k words)
- ADR Index: `docs/adr/ADR-INDEX.md`
- Testing guide: `docs/testing/TESTING.md`
- Context system: `docs/architecture/CONTEXT-SYSTEM-OVERVIEW.md`
