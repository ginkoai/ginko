---
id: FEATURE-017
type: feature
title: Persistent Context Module System
parent: null
status: PROPOSED
priority: CRITICAL
created: 2025-08-27
updated: 2025-09-10
effort: 4
children: []
tags: [context, ai-memory, knowledge-management, git-tracked]
adr: ADR-022
---

# Persistent Context Module System

## Problem Statement
AI loses all context between sessions and must re-learn architecture, decisions, and patterns from scratch. This wastes valuable tokens and time on re-explanation. Current handoffs are monolithic and don't enable selective knowledge loading.

## Solution
Create persistent, modular context files that act as "memory cards" for AI sessions. Each learning, decision, or pattern becomes a separate markdown file that can be selectively loaded based on relevance.

## Success Criteria
- [ ] 80% reduction in context re-explanation
- [ ] New developers productive in first session
- [ ] Average token usage reduced by 50%
- [ ] Zero re-learning of documented patterns

## Architecture
```
.ginko/context/
├── modules/
│   ├── arch-authentication.md
│   ├── config-database.md
│   ├── decision-no-typescript.md
│   ├── pattern-error-handling.md
│   └── gotcha-async-hooks.md
├── index.json
└── usage-stats.json
```

## Implementation Features
1. **Modular Context**: Each learning as separate file
2. **Tagged & Indexed**: Frontmatter for discovery
3. **Progressive Loading**: Start minimal, expand as needed
4. **Organic Creation**: Capture during development
5. **Git-Tracked**: Evolves with codebase
6. **Auto-Pruning**: Remove stale context

## Commands
```bash
ginko context load auth              # Load auth modules
ginko context capture "Gotcha found" # Create from work
ginko context auto                   # Auto-suggest
ginko context prune                  # Remove outdated
```

## Technical Notes
- Markdown files with frontmatter metadata
- JSON index for fast searching
- Usage tracking for relevance scoring
- Integration with handoff workflow

## Dependencies
- Context command infrastructure
- Frontmatter parsing
- Git integration for tracking changes