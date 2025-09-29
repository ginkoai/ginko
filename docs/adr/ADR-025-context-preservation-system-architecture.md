# ADR-025: Context Preservation System Architecture

## Status
Accepted

## Date
2025-08-27

## Context
As documented in PRD-2025-08-27, developers lose 23% of productive time to context switching, with each interruption requiring 15-25 minutes to recover deep focus. Our analysis identified that modern development requires tracking dozens of pieces of information that exceed human working memory limits (~7 items). When interrupted, mental models evaporate with no backup mechanism.

The business needs a solution that:
- Reduces context recovery time from 15-25 minutes to <2 minutes
- Works with existing development tools without requiring replacement
- Maintains complete privacy (no code leaves developer machines)
- Scales from individual developers to team knowledge sharing

Technical forces at play:
- Must integrate with diverse IDEs, browsers, and terminals
- Cannot introduce noticeable performance overhead
- Must handle sensitive information appropriately
- Should leverage existing git workflows

## Decision
We will implement a **Hybrid Progressive Context Preservation System** that combines:
1. Explicit lightweight captures via CLI commands
2. Git-native storage in `.ginko/` directory
3. AI-enhanced context enrichment running locally
4. Progressive context loading based on work location

The system will use a three-tier architecture:
- **Capture Layer**: CLI commands for instant context snapshots
- **Storage Layer**: Structured markdown files in git
- **Intelligence Layer**: Local AI processing for enrichment

## Considered Alternatives

### Option 1: Full Automation with Background Service
**Description**: Daemon process continuously captures all developer activity
**Pros**: Zero friction, comprehensive capture, no missed context
**Cons**: Privacy concerns, resource overhead (5-10% CPU), complex filtering needed, enterprise security issues

### Option 2: IDE Plugin Ecosystem
**Description**: Deep integration plugins for each major IDE
**Pros**: Rich IDE-specific features, perfect fidelity, native UX
**Cons**: Massive maintenance burden, fragmented experience, 6-12 month development per IDE

### Option 3: Browser-Based Solution
**Description**: Web app that aggregates context from various sources
**Pros**: Universal access, easy deployment, rich UI possibilities
**Cons**: Requires constant internet, security concerns, adds another tool to manage

## Consequences

### Positive
- **2-second context captures** preserve flow state (ADR-023)
- **Git-native storage** enables team knowledge sharing without additional infrastructure
- **Local AI processing** maintains complete privacy while adding intelligence
- **Progressive loading** keeps context manageable (<100KB active)
- **Tool agnostic** works with any development environment
- **Graceful degradation** - works without AI, works offline, works without git

### Negative
- **Manual triggers required** - developers must remember to capture (mitigated by habit formation)
- **AI dependency for full value** - best features require local AI available
- **Storage growth** - context accumulates over time (mitigated by pruning commands)
- **Learning curve** - new commands to learn (mitigated by similarity to git)

### Neutral
- Changes git repository size (typically +2-5MB for active project)
- Introduces `.ginko/` directory to projects
- Requires Node.js runtime for CLI

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1)
- [x] Basic CLI framework with commander.js
- [x] Capture command with template generation
- [x] Git-native storage structure
- [x] AI enhancement protocol (exit codes 42-45)

### Phase 2: Context Commands (Week 2)
- [x] `ginko capture` - 2-second snapshots
- [ ] `ginko load` - Progressive context loading
- [ ] `ginko prune` - Context maintenance
- [ ] Auto-discovery based on directory

### Phase 3: Workflow Integration (Week 3)
- [x] `ginko explore` - Problem exploration mode
- [x] `ginko architecture` - ADR generation
- [x] `ginko plan` - Sprint planning
- [ ] `ginko handoff` with context extraction

### Phase 4: Intelligence Layer (Week 4)
- [ ] Pattern detection in captures
- [ ] Automatic tagging and categorization
- [ ] Context relevance scoring
- [ ] Team pattern aggregation

### Key Milestones
- Week 1: CLI available for testing
- Week 2: Context system operational
- Week 3: Full workflow integrated
- Week 4: Intelligence features active

## Technical Specifications

### File Structure
```
.ginko/
├── context/
│   ├── modules/       # Persistent context modules
│   ├── index.json     # Searchable catalog
│   └── usage.json     # Relevance tracking
├── sessions/          # Session handoffs
└── .temp/            # Temporary storage for two-phase operations
```

### Context Module Format
```yaml
---
type: architecture|config|decision|pattern|gotcha|module
tags: [searchable, keywords]
area: /src/path/**
relevance: critical|high|medium|low
dependencies: [other-modules]
---
# Markdown content with AI-enriched details
```

### Performance Requirements
- Capture command: <500ms execution
- Context loading: <2s for full load
- Storage: <10MB for typical project
- AI enhancement: <5s for enrichment

## References
- PRD-2025-08-27: Context Preservation System Requirements
- ADR-023: Flow State Design Philosophy  
- ADR-024: AI-Enhanced Local Tooling Pattern
- Related implementations: git stash, tmux resurrect, VSCode workspaces
- Research: "The Cost of Interrupted Work" (Czerwinski et al., 2004)

## Migration Strategy
For existing Ginko users:
1. Existing captures remain compatible
2. New intelligence features are additive
3. No breaking changes to CLI interface
4. Gradual adoption path provided

## Rollback Plan
If the system fails to meet objectives:
1. CLI commands can be simplified to basic file creation
2. AI enhancement can be disabled with --quick flag
3. Context modules can be treated as simple markdown notes
4. Git history preserves all context for recovery