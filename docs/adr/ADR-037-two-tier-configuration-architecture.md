---
type: decision
status: accepted
updated: 2025-10-22
tags: [configuration, team-collaboration, path-resolution, progressive-loading]
related: [ADR-033-context-pressure-mitigation-strategy.md, PRD-009-configuration-and-reference-system.md]
priority: critical
audience: [developer, ai-agent]
estimated-read: 8-min
dependencies: [ADR-033, PRD-009]
---

# ADR-037: Two-Tier Configuration Architecture

**Status:** Accepted
**Date:** 2025-10-22
**Authors:** Chris Norton, Claude (AI)
**Reviewers:** TBD

## Context

### Problem Statement

The current context loading system has critical structural inefficiencies:

1. **Progressive Searching**: AI searches from CWD upward to find project resources, wasting tokens and time
2. **Path Conflicts**: Absolute paths in shared config files break for every team member
3. **Orphaned Events**: Session log entries lack strategic context links (sprint→PRD→ADR)
4. **Memory Fragmentation**: Short-term memory (session logs) disconnected from long-term memory (sprints/PRDs/ADRs)
5. **Team Isolation**: No visibility into teammate work, leading to duplication

### Business Context

Efficient context loading is critical for AI-assisted development velocity:
- **Token Budget**: Progressive searching wastes 30-40% of available context
- **Collaboration**: Teams need visibility into member activity to coordinate work
- **Onboarding**: New developers need instant access to project structure
- **Quality**: Linking tactical work to strategic goals prevents misalignment

### Technical Context

Current state:
- No canonical project root definition
- Context loading searches filesystem progressively
- Session logs stored in user directories but structure not fully leveraged
- No reference link system between documents
- Work mode affects behavior but not document loading

Constraints:
- Must work across different OS (macOS, Linux, Windows)
- Must support team collaboration without git conflicts
- Must maintain backward compatibility with existing .ginko structure
- Must optimize for token efficiency (200k limit)

### Key Requirements

1. **Instant Path Resolution**: Find any project resource in <1 second without searching
2. **Team Portability**: Configuration works for all team members without modification
3. **Reference Navigation**: Link session logs → sprints → PRDs → ADRs bidirectionally
4. **Progressive Loading**: Load 80% of needed context from 3-5 core documents
5. **Team Awareness**: Enable visibility into teammate activity through session logs

## Decision

Implement a two-tier configuration system separating team-shared structure from user-specific paths, combined with a reference link system for semantic navigation across the documentation hierarchy.

### Chosen Solution

**Tier 1: `ginko.json`** (git-tracked, team-shared)
- Defines canonical project structure using **relative paths only**
- Specifies documentation locations (sprints, PRDs, ADRs)
- Configures work modes and loading strategies
- Shared across all team members

**Tier 2: `.ginko/local.json`** (git-ignored, user-specific)
- Stores absolute `projectRoot` path for local machine
- Contains user email and preferences
- Generated during `ginko init`
- Never committed to git

**Reference Link System:**
- Standardized syntax: `TASK-XXX`, `PRD-YYY`, `ADR-ZZZ`, `SPRINT-YYYY-MM-DD`
- Extracted from documents and followed during context loading
- Creates semantic navigation: session → sprint → PRD → ADR

### Implementation Approach

```typescript
// Path resolution combines both configs
async function resolveProjectPath(relativePath: string): Promise<string> {
  const local = await loadLocalConfig();     // .ginko/local.json
  const project = await loadProjectConfig(); // ginko.json

  return path.join(local.projectRoot, relativePath);
}

// Usage
const sprintPath = await resolveProjectPath(project.paths.currentSprint);
// → /path/to/your/project/docs/sprints/CURRENT-SPRINT.md
```

## Architecture

### System Design

```
Project Root
├── ginko.json (team-shared)           ← Structure definition
├── .ginko/
│   ├── local.json (git-ignored)       ← User-specific paths
│   ├── context/modules/               ← Team knowledge
│   └── sessions/                      ← User-namespaced
│       ├── dev-at-example-com/        ← User 1 (tracked)
│       │   ├── current-session-log.md
│       │   └── archive/
│       └── alice-at-company-com/      ← User 2 (tracked)
│           ├── current-session-log.md
│           └── archive/
└── docs/
    ├── sprints/CURRENT-SPRINT.md      ← Long-term memory bootstrap
    ├── PRD/                           ← Strategic context
    └── adr/                           ← Architectural decisions
```

### ginko.json Schema

```json
{
  "$schema": "https://ginko.ai/schemas/ginko-config.json",
  "version": "1.0",

  "project": {
    "name": "Ginko",
    "type": "monorepo"
  },

  "paths": {
    "docs": "docs",
    "sprints": "docs/sprints",
    "currentSprint": "docs/sprints/CURRENT-SPRINT.md",
    "prds": "docs/PRD",
    "adrs": "docs/adr",
    "architecture": "docs/architecture",
    "backlog": "docs/backlog",
    "context": ".ginko/context/modules",
    "sessions": ".ginko/sessions",
    "bestPractices": ".ginko/best-practices"
  },

  "workMode": {
    "default": "think-build",
    "documentationDepth": {
      "hack-ship": ["currentSprint", "sessions"],
      "think-build": ["currentSprint", "sessions", "adrs", "prds"],
      "full-planning": ["currentSprint", "sessions", "adrs", "prds", "architecture", "bestPractices"]
    }
  },

  "contextLoading": {
    "progressive": true,
    "maxDepth": 3,
    "followReferences": true,
    "priorityOrder": ["sessions", "currentSprint", "prds", "adrs", "context"]
  }
}
```

### local.json Schema

```json
{
  "projectRoot": "/path/to/your/project",
  "userEmail": "dev@example.com",
  "userSlug": "dev-at-example-com",
  "workMode": "think-build",
  "lastSession": "2025-10-22T08-00-00-000Z"
}
```

### Reference Link Syntax

**In Session Logs:**
```markdown
### 17:13 - [fix]
Fixed session log archival timing (TASK-006, SPRINT-2025-10-22)
Root cause: session log archived before fresh AI could read it...
Files: packages/cli/src/commands/start/start-reflection.ts:60-82
Impact: high
```

**In Sprint Files:**
```markdown
## TASK-006: Fix Session Log Archival Timing
**PRD**: PRD-009
**ADR**: ADR-033, ADR-037
**Status**: Complete
**Assignee**: dev@example.com

Description: Session log was being reset before fresh AI could synthesize...
```

**In PRD Files:**
```markdown
# PRD-009: Configuration and Reference System

**Related ADRs**: ADR-037, ADR-033
**Current Sprint**: SPRINT-2025-10-22-configuration-system
**Status**: In Progress
```

### Integration Points

**ginko start Integration:**
```typescript
async function startCommand() {
  // 1. Load configuration
  const config = await loadConfiguration();

  // 2. Load session log (short-term memory)
  const sessionLog = await loadDocument(
    await resolveProjectPath(config.paths.sessions + `/${userSlug}/current-session-log.md`)
  );

  // 3. Load current sprint (long-term memory bootstrap)
  const sprint = await loadDocument(
    await resolveProjectPath(config.paths.currentSprint)
  );

  // 4. Extract and follow references
  const refs = extractReferences([sessionLog, sprint]);
  const referencedDocs = await loadReferencedDocuments(refs, config);

  // 5. Synthesize context from hierarchy
  const context = await synthesizeContext({
    sessionLog,
    sprint,
    ...referencedDocs
  });

  // 6. Report readiness
  displaySessionStart(context);
}
```

**ginko log Integration:**
```bash
# User logs with references
ginko log "Fixed bug (TASK-006)" --category=fix --impact=high

# System extracts and validates references
# → Links entry to TASK-006 in current sprint
# → AI can now trace: session event → sprint task → PRD → ADR
```

### Data Model Changes

**Configuration Loading Order:**
```
1. Check for ginko.json in CWD
2. If not found, search parent directories (one-time)
3. Once found, cache project root
4. Load .ginko/local.json (create if missing)
5. Merge configs for path resolution
```

**.gitignore Updates:**
```gitignore
# User-specific configuration (never commit)
.ginko/local.json

# Everything else in .ginko/ is team-shared:
# - Session logs (user-namespaced, no conflicts)
# - Context modules (team knowledge)
# - Best practices (team standards)
```

## Alternatives Considered

### Option 1: Single Configuration File
**Description:** Use only `ginko.json` with placeholder tokens like `${HOME}` or `${USER}`
**Pros:**
- Simpler mental model (one config file)
- Less file management

**Cons:**
- Placeholder resolution fragile across platforms
- Can't store user-specific preferences cleanly
- Still requires environment variable setup

**Decision:** Rejected. Two-tier separation is cleaner and more explicit.

### Option 2: Global User Config Only
**Description:** Store all project configs in `~/.ginko/projects.json` mapping names to roots
**Pros:**
- Centralized user configuration
- Supports multi-project workflows

**Cons:**
- Team structure not version-controlled
- New team members don't get project structure automatically
- Harder to enforce team standards

**Decision:** Rejected. Team-shared structure is critical for collaboration.

### Option 3: Environment Variables Only
**Description:** Use `GINKO_PROJECT_ROOT` and other env vars for all configuration
**Pros:**
- No config files to manage
- Standard approach in many ecosystems

**Cons:**
- Requires shell setup for every developer
- Team structure not documented in repo
- Error-prone (forgot to set variable)

**Decision:** Rejected. Config files are more discoverable and self-documenting.

### Option 4: Symlinks for Path Resolution
**Description:** Use symlinks to create canonical paths (already attempted, per user comment)
**Pros:**
- Works at filesystem level
- No custom path resolution needed

**Cons:**
- Symlink handling differs across OS (Windows especially problematic)
- Breaks in many development tools
- Not portable across environments

**Decision:** Rejected. Already proven problematic.

## Consequences

### Positive Impacts

1. **Instant Resource Location**: AI finds any project file in <1 second (vs 10-30 seconds progressive search)
2. **Team Collaboration**: Full visibility into teammate work through user-namespaced session logs
3. **Strategic Context**: Session events linked to sprint goals via references
4. **Token Efficiency**: 70% reduction in context loading tokens (bootstrap from 3 docs instead of 50+)
5. **Onboarding**: New developers get full project structure instantly via `ginko init`
6. **No Git Conflicts**: User-specific paths never committed, user-namespaced logs don't conflict

### Negative Impacts

1. **Configuration Complexity**: Two config files instead of one (mitigated by clear separation of concerns)
2. **Reference Maintenance**: Must keep references valid when renaming/moving documents
3. **Migration Overhead**: Existing projects need to create `ginko.json` and regenerate `local.json`

### Neutral Impacts

1. **`.ginko/` Directory Structure**: Sessions become explicitly team-shared (formalization of existing intent)
2. **Work Mode Semantics**: Work mode now explicitly controls doc loading depth (makes implicit behavior explicit)

### Migration Strategy

**For Existing Projects:**
```bash
# 1. Generate ginko.json from existing structure
ginko init --migrate

# 2. Creates ginko.json with detected paths
# 3. Updates .gitignore
# 4. Regenerates .ginko/local.json

# 5. Commit team config
git add ginko.json .gitignore
git commit -m "Add ginko.json configuration (ADR-037)"
```

**For New Projects:**
```bash
ginko init

# Interactive prompts:
# - Project name?
# - Docs location? (default: docs)
# - Work mode? (default: think-build)

# Generates both ginko.json and local.json
```

## Implementation Details

### Technical Requirements

1. **TypeScript Types:**
```typescript
interface GinkoConfig {
  project: {
    name: string;
    type: 'monorepo' | 'single' | 'library';
  };
  paths: Record<string, string>;  // All relative
  workMode: WorkModeConfig;
  contextLoading: LoadingConfig;
}

interface LocalConfig {
  projectRoot: string;  // Absolute
  userEmail: string;
  userSlug: string;
  workMode?: WorkMode;
  lastSession?: string;
}
```

2. **Configuration Validation:**
- Schema validation on load
- Path existence checks (warn if referenced path doesn't exist)
- Reference validation (warn if TASK-XXX doesn't exist in sprint)

3. **Backward Compatibility:**
- If `ginko.json` missing, fall back to progressive search (warn user)
- If `local.json` missing, generate from defaults + user detection

### Performance Implications

**Before (Progressive Search):**
- 10-30 filesystem operations to find project root
- 50-100ms latency per file lookup
- ~5000 tokens to load context (searching + loading)

**After (Configuration-Based):**
- 2 filesystem operations (load 2 config files)
- <10ms total latency for all path resolutions
- ~1500 tokens to load context (70% reduction)

**Result:** 10-20x faster context loading

### Operational Impact

**Development:**
- `ginko init` becomes required for new projects (was optional)
- Reference validation adds ~100ms to logging commands (acceptable)

**Deployment:**
- CI/CD environments need `GINKO_PROJECT_ROOT` env var OR run `ginko init` in setup

**Maintenance:**
- Document structure changes require updating `ginko.json` paths
- Reference rot detection needed (automated or manual review)

## Monitoring and Success Metrics

### Key Performance Indicators

1. **Bootstrap Speed**: <1 second to load core context (vs 10-30 seconds)
2. **Reference Density**: >90% of session log entries include task/PRD/ADR references
3. **Context Coverage**: 80% of needed context from ≤5 documents
4. **Team Awareness**: 100% visibility into active teammate work

### Success Criteria

- AI stops progressive searching (observable in logs)
- Fresh AI can explain work in strategic terms ("per TASK-006 in current sprint...")
- New team members onboard in <5 minutes (run `ginko init`, ready to work)
- Zero git conflicts on configuration or session logs

### Failure Criteria

- Reference validation becomes performance bottleneck (>500ms)
- Reference links rot and become misleading
- Configuration maintenance overhead exceeds benefits

## Risks and Mitigations

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|---------|-------------|------------|
| Reference rot (renamed/deleted docs) | Medium | Medium | Automated validation tooling, CI checks |
| Configuration drift across team | Low | Low | Git tracks team config, onboarding docs |
| Path resolution bugs (Windows) | High | Low | Comprehensive cross-platform testing |
| Performance degradation on large projects | Medium | Low | Lazy loading, depth limits, caching |

### Business Risks

| Risk | Impact | Probability | Mitigation |
|------|---------|-------------|------------|
| Team adoption resistance | High | Low | Clear migration docs, automated tools |
| Over-documentation burden | Medium | Medium | Work mode adapts depth, not required in hack-ship |

## Timeline and Milestones

### Implementation Phases

- **Phase 1** (Week 1): Configuration foundation
  - Implement two-tier config loading
  - Create path resolution helpers
  - Update `ginko init` to generate both configs

- **Phase 2** (Week 2): Reference link system
  - Define reference syntax and patterns
  - Implement extraction and validation
  - Update session logging commands

- **Phase 3** (Week 3): Progressive loading
  - Implement priority-ordered loading
  - Add reference following with depth limits
  - Integrate with `ginko start`

- **Phase 4** (Week 4): Team collaboration
  - Verify user-namespaced logs work team-wide
  - Add teammate activity visibility
  - Documentation and examples

### Key Milestones

- **M1** (Week 1): `ginko init` generates `ginko.json` + `local.json`
- **M2** (Week 2): Session logs support reference links
- **M3** (Week 3): `ginko start` bootstraps from config in <1 second
- **M4** (Week 4): Full team using system, no git conflicts

## References

### Documentation
- [PRD-009: Configuration and Reference System](../PRD/PRD-009-configuration-and-reference-system.md)
- [ADR-033: Context Pressure Mitigation Strategy](ADR-033-context-pressure-mitigation-strategy.md)
- [ADR-034: Event-Based Defensive Logging](ADR-034-event-based-defensive-logging-architecture.md)
- [ADR-036: Session Synthesis Architecture](ADR-036-session-synthesis-architecture.md)

### Code References
- Configuration loader: `packages/cli/src/utils/config-loader.ts` (to be created)
- Path resolution: `packages/cli/src/utils/helpers.ts` (to be updated)
- Reference extraction: `packages/cli/src/utils/reference-parser.ts` (to be created)
- Integration: `packages/cli/src/commands/start/index.ts` (to be updated)

---

**Implementation Status:** Accepted, ready for implementation
**Next Steps:** Create Feature backlog item and sprint
