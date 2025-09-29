# ADR-022: Persistent Context Modules

## Status
Proposed

## Date
2025-08-27

## Context

Every AI session starts from zero, forcing developers to re-explain architecture, decisions, and patterns. This violates our Progressive Context Loading principle and wastes valuable context tokens on re-learning what was already discovered.

## Decision

Implement a **Persistent Context Module System** where learnings are captured as tagged, indexed context files that can be intelligently loaded based on work focus.

## Architecture

### Context Module Structure
```
.ginko/context/
├── modules/
│   ├── arch-authentication.md      # Architecture context
│   ├── config-database.md          # Configuration context
│   ├── decision-no-typescript.md   # Decision context
│   ├── pattern-error-handling.md   # Pattern context
│   ├── gotcha-async-hooks.md       # Gotcha/learning context
│   └── module-user-service.md      # Module-specific context
├── index.json                       # Searchable catalog
└── usage-stats.json                # Track what's frequently needed

```

### Context Module Format
```markdown
---
type: architecture|config|decision|pattern|gotcha|module
tags: [authentication, security, jwt]
area: /src/auth/**
created: 2025-08-27
updated: 2025-08-27
relevance: high
dependencies: [config-database, pattern-error-handling]
---

# Authentication Architecture

## Quick Summary
JWT-based authentication with refresh tokens stored in httpOnly cookies.

## Key Points
- Tokens expire in 15 minutes
- Refresh tokens last 7 days
- All auth endpoints under /api/auth/*

## Code Locations
- Token generation: /src/auth/tokens.ts
- Middleware: /src/middleware/auth.ts
- Routes: /src/routes/auth.ts

## Important Context
The team decided against OAuth to maintain simplicity. See decision-no-oauth.md.
```

### Intelligent Loading Strategy

#### 1. Automatic Context Discovery
```bash
ginko start
# Detects you're in /src/auth/login.ts
# Auto-suggests: "Load authentication context? (arch-authentication, config-database)"
```

#### 2. Manual Context Loading
```bash
ginko context load auth         # Loads all auth-tagged modules
ginko context load arch-*        # Loads all architecture modules
ginko context deep payment       # Loads everything about payments
ginko context core              # Loads only essential project context
```

#### 3. Context Creation Workflow
```bash
# During development, when you learn something important:
ginko context capture "JWT tokens must be refreshed before expiry"
# Creates: gotcha-jwt-refresh.md with current file context

# During handoff:
ginko handoff --extract-context
# Extracts reusable learnings into context modules
```

#### 4. Context Maintenance
```bash
# After significant changes:
git commit -m "Refactor auth to use Passport"
# Ginko detects auth files changed, prompts:
# "Update context modules? [arch-authentication, config-database]"

# Periodic pruning:
ginko context prune
# Removes outdated or unused context modules
```

### Implementation Phases

#### Phase 1: Basic Module System
- Create/read context modules
- Manual loading with `ginko context load`
- Simple tagging system

#### Phase 2: Intelligent Discovery
- Auto-suggest based on working directory
- Dependency resolution
- Usage tracking

#### Phase 3: Organic Integration
- Extract context during handoffs
- Git-hook based updates
- AI-assisted context generation

## Benefits

1. **No More Re-learning**: Architecture decisions persist across sessions
2. **Progressive Loading**: Start minimal, load as needed
3. **Team Knowledge Sharing**: Context modules are git-tracked
4. **Prevents Regressions**: Important gotchas stay visible
5. **Reduces Token Usage**: Load only relevant context

## Example Workflow

```bash
# Monday: Discover authentication bug
$ ginko start
> Loading core context...
> Working in /src/auth. Load authentication context? [Y/n] y
> Loaded: arch-authentication, config-database, gotcha-async-hooks

# Fix bug, learn something new
$ ginko context capture "Bcrypt rounds must be 10+ for production"
> Created: gotcha-bcrypt-rounds.md

# Create handoff
$ ginko handoff "Fixed auth timing attack"
> Extracted context: security-timing-attack.md

# Friday: New developer joins
$ ginko start
> Found 23 context modules. Load recommendations? [Y/n] y
> Suggested for new developers:
>   - arch-overview
>   - pattern-error-handling
>   - config-database
>   - gotcha-common-issues
```

## Key Insight

This transforms Ginko from a session management tool into a **knowledge management system** for AI-assisted development. Each context module is like a "memory card" that gives AI instant understanding of specific areas without re-explanation.

## Success Metrics

- 80% reduction in "re-explanation" during session starts
- Context loads in <2 seconds
- Average session uses 50% less tokens for same productivity
- New team members productive in first session