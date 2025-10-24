---
module: common-commands
type: core-knowledge
status: active
updated: 2025-10-23
tags: [cli, commands, workflow, quick-reference]
priority: critical
audience: [ai-agent, developer]
estimated-tokens: 500
---

# Common Commands

## Development Workflow

**Build and test:**
```bash
# Build all packages
npm run build

# Build specific package
npm run build --workspace=@ginkoai/cli

# Type check without building
npx tsc --noEmit

# Run tests
npm test

# Run tests for specific file
npm test -- context-loader.test.ts

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage
```

## Session Management

**Start and resume:**
```bash
# Start new session or resume existing
ginko start

# Start with specific work mode
ginko start --mode hack-ship
ginko start --mode think-build
ginko start --mode full-planning

# Disable session logging
ginko start --no-log
```

**Session handoff:**
```bash
# Save progress and context for next session
ginko handoff

# Optional: Add summary note
ginko handoff "completed TASK-007 tests, blocked on deployment"
```

## Backlog Management

**List and view:**
```bash
# List all items
ginko backlog list

# Filter by status
ginko backlog list --status=in-progress
ginko backlog list --status=todo
ginko backlog list --status=done

# Filter by priority
ginko backlog list --priority=critical
ginko backlog list --priority=high

# View specific item
ginko backlog show TASK-007
```

**Create and update:**
```bash
# Create new task
ginko backlog create --type task --priority high --size M "task description"

# Create feature
ginko backlog create --type feature --priority critical --size L "feature description"

# Update item
ginko backlog update TASK-007 --status in-progress
ginko backlog update TASK-007 --priority critical

# Complete item
ginko backlog complete TASK-007
```

## Session Logging

**Log events:**
```bash
# Log a session event
ginko log "Fixed authentication bug in login flow"

# Log with category
ginko log "Implemented session logging" --category=feature
ginko log "Fixed timeout issue" --category=fix
ginko log "Chose JWT over sessions" --category=decision

# Log with impact level
ginko log "Critical fix for production" --impact=high
ginko log "Minor refactoring" --impact=low

# Log with affected files
ginko log "Updated context loader" --files="src/utils/context-loader.ts:273-281"
```

## Context Management

**View and load context:**
```bash
# List available context modules
ginko context

# Add specific module to current session
ginko context --add architecture-overview

# View current work mode
ginko status

# Check context pressure (if implemented)
ginko status --pressure
```

## Git Workflow

**Commit conventions:**
```bash
# Always include co-authors
git commit -m "feat: Add always-load module system

Implements TASK-015 with 7 core modules for instant AI productivity.

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Chris Norton <chris@watchhill.ai>"

# Commit types:
# feat: New feature
# fix: Bug fix
# docs: Documentation
# refactor: Code restructuring
# test: Test changes
# chore: Maintenance
```

## Useful Aliases

**File discovery:**
```bash
# Find files by pattern
find . -name "*.ts" -type f

# Search for content
grep -r "pattern" --include="*.ts"

# Check file metadata (AI-optimized)
head -12 packages/cli/src/utils/context-loader.ts
```

**Quick checks:**
```bash
# Git status
git status --short

# Recent commits
git log --oneline -10

# Uncommitted changes
git diff

# Modified files
git diff --name-only
```

## Environment

**Check setup:**
```bash
# Node version
node --version  # Should be v18+

# NPM version
npm --version

# Installed packages
npm list --depth=0

# Ginko version
ginko --version
```

## Troubleshooting

**Common fixes:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run clean
npm run build

# Reset TypeScript
rm -rf packages/*/dist
npx tsc --build --clean
npm run build
```

**Debug mode:**
```bash
# Verbose output
ginko start --verbose
ginko backlog list --verbose

# Check configuration
cat ginko.json
cat .ginko/local.json
```
