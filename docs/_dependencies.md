---
type: project
status: current
updated: 2025-01-31
tags: [dependencies, document-relationships, ai-navigation]
related: [_context.md, _index.json]
priority: high
audience: [ai-agent]
estimated-read: 5-min
dependencies: [none]
---

# Document Dependencies & Relationships

## 🎯 Critical Path for AI Agents

### Starting Points (Read These First)
1. **`_context.md`** - Current project state and active decisions
2. **`BACKLOG-MVP.md`** - Active tasks and sprint progress
3. **`architecture/ADR-001-infrastructure-stack-selection.md`** - Approved technical foundation

### Implementation Chain
```
UX-001 (user research) 
    ↓
ADR-001 (infrastructure decision)
    ↓
setup/supabase-setup-guide.md + setup/vercel-deployment-guide.md
    ↓
BACKLOG-MVP.md (current tasks)
```

## 📊 Document Relationships Map

### Architecture Decisions → Implementation
- **ADR-001** → `setup/supabase-setup-guide.md`, `setup/vercel-deployment-guide.md`
- **ARCHITECTURE.md** → All setup guides reference this
- **PRODUCTION_ARCHITECTURE.md** → Future scaling (not MVP critical)

### User Experience → Features  
- **UX-001** → `BACKLOG-MVP.md` (task prioritization)
- **UX-001** → `SPRINT-001-dependencies-analysis.md` (implementation plan)

### Project Management Chain
- **BACKLOG-MVP.md** → `SPRINT-001-dependencies-analysis.md` → Individual setup guides
- **Sprint docs** → Current active work
- **Analysis docs** → Background context (read for deeper understanding)

### Setup Dependencies (Linear Order)
1. `setup/parallel-setup-commands.md` - Overview of all setup tasks
2. `setup/supabase-setup-guide.md` - Database foundation  
3. `setup/vercel-deployment-guide.md` - Deployment platform
4. `MCP_CLIENT_INTEGRATION.md` - Client integration
5. `setup/team-claude-setup.md` - Team onboarding

### Testing Dependencies
- **setup/** docs → `testing/TESTING.md` (how to verify setup)
- **MCP_CLIENT_INTEGRATION.md** → `testing/test-session-resume.md`

## 🔍 AI Agent Search Strategies

### By Priority Level
```bash
# Critical MVP-blocking documents
grep -l "priority: critical" docs/**/*.md

# Current active work
grep -l "status: current" docs/**/*.md

# Implementation guides ready to use
grep -l "status: implemented" docs/**/*.md
```

### By Task Type
```bash
# Architecture and decisions
find docs/ -name "*.md" | xargs grep -l "type: architecture\|type: decision"

# Setup and implementation guides  
find docs/ -name "*.md" | xargs grep -l "type: setup"

# Project management and planning
find docs/ -name "*.md" | xargs grep -l "type: project"
```

### By Dependencies
```bash
# Documents that depend on ADR-001
find docs/ -name "*.md" | xargs grep -l "dependencies:.*ADR-001"

# Documents that reference infrastructure
find docs/ -name "*.md" | xargs grep -l "tags:.*infrastructure"
```

## 🚀 Quick Context Commands

```bash
# Get current project state
head -20 docs/_context.md

# Get all active tasks
head -50 docs/BACKLOG-MVP.md

# Get approved architecture decision
head -30 docs/architecture/ADR-001-infrastructure-stack-selection.md

# Find all setup guides
find docs/setup/ -name "*.md" -exec basename {} \;
```

## 📝 Orphaned Documents (Low Priority)

These provide background but aren't critical for current development:
- `analysis/COMPREHENSIVE_ANALYSIS.md` - Market research
- `analysis/MARKET_ANALYSIS.md` - Competitive analysis  
- `analysis/OPEN_SOURCE_STRATEGY.md` - Open source planning
- `analysis/IMPLEMENTATION_JOURNEY.md` - Development history

## 🎯 For Maximum AI Effectiveness

**Start with**: `_context.md` + `BACKLOG-MVP.md`  
**Then dive into**: Specific files mentioned in dependencies field  
**Use**: `head -12` for instant frontmatter context on any document