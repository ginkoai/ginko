---
module: git-workflow
type: core-knowledge
status: active
updated: 2025-10-23
tags: [git, workflow, conventions, collaboration]
priority: medium
audience: [ai-agent, developer]
estimated-tokens: 500
---

# Git Workflow

## Branch Strategy

**Main branch:**
- `main` - Production-ready code, always deployable
- Protected: requires review (when team grows)
- Direct commits allowed for solo development

**Feature branches:**
```bash
feature/<descriptive-name>   # New features
fix/<bug-description>        # Bug fixes
refactor/<area>              # Code restructuring
docs/<topic>                 # Documentation updates
```

**Examples:**
```bash
git checkout -b feature/always-load-modules
git checkout -b fix/context-loading-stale-sprint
git checkout -b docs/adr-037-configuration
```

## Commit Message Format

**Structure:**
```
<type>: <short summary (50 chars max)>

<optional detailed description>

<optional footer with references and co-authors>
```

**Types:**
- `feat` - New feature or functionality
- `fix` - Bug fix
- `docs` - Documentation changes
- `refactor` - Code restructuring without behavior change
- `test` - Test additions or modifications
- `chore` - Maintenance, dependencies, tooling
- `perf` - Performance improvements

**Examples:**
```bash
git commit -m "feat: Add always-load core module system

Implements TASK-015 with 7 core modules loaded automatically
based on work mode. Provides instant AI productivity without
manual context loading.

- Created .ginko/context/core/ with 7 modules
- Updated ginko.json with alwaysLoad configuration
- Modified context-loader to load core modules first
- Archived stale business/product modules

Token impact: 3-5k (hack-ship), 8-12k (think-build), 12-15k (full)

References: TASK-015, ADR-037

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Chris Norton <chris@watchhill.ai>"
```

## Co-Authoring (REQUIRED)

**Always include co-authors when working with AI:**

```bash
# Template
git commit -m "type: summary

Description

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Chris Norton <chris@watchhill.ai>"
```

**Why:**
- Acknowledges AI contributions
- Tracks collaboration patterns
- Preserves authorship context
- Git analytics show true collaboration

## Reference Linking

**Link commits to backlog items and documentation:**

```bash
# Reference tasks
git commit -m "fix: Remove stale sprint symlink

Fixes token waste identified in TASK-015 analysis.
Removes CURRENT-SPRINT.md pointing to completed sprint.

References: TASK-015"

# Reference PRDs
git commit -m "feat: Implement two-tier configuration

Implements PRD-009 configuration system with team-shared
ginko.json and user-specific .ginko/local.json.

References: PRD-009, ADR-037"

# Reference ADRs
git commit -m "refactor: Apply flow-state design philosophy

Refactors command output following ADR-023 principles:
silent success, minimal output, <5s operations.

References: ADR-023"
```

**Format:**
- Tasks: `TASK-XXX`
- Features: `FEATURE-XXX`
- PRDs: `PRD-XXX`
- ADRs: `ADR-XXX`
- Sprints: `SPRINT-YYYY-MM-DD-name`

## Commit Workflow

**1. Stage changes:**
```bash
# Stage specific files
git add packages/cli/src/utils/context-loader.ts
git add .ginko/context/core/

# Stage all changes
git add -A

# Interactive staging
git add -p
```

**2. Review changes:**
```bash
# Check status
git status

# View diff
git diff --staged

# Review file-by-file
git diff --staged -- path/to/file.ts
```

**3. Commit with message:**
```bash
# Simple commit
git commit -m "feat: Add feature"

# Multi-line commit
git commit -m "feat: Add feature

Detailed description here.

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Chris Norton <chris@watchhill.ai>"

# Open editor for commit message
git commit
```

**4. Push to remote:**
```bash
# First push (set upstream)
git push -u origin feature/branch-name

# Subsequent pushes
git push

# Force push (use with caution)
git push --force-with-lease
```

## Best Practices

**Commit frequency:**
- Commit often (every logical change)
- Each commit should be buildable
- Atomic commits (one logical change per commit)
- Don't commit broken code

**Commit size:**
- Small commits preferred (<300 lines changed)
- Large refactors: break into logical steps
- Mixed changes: separate into multiple commits

**Before committing:**
```bash
# Run build
npm run build

# Run tests
npm test

# Type check
npx tsc --noEmit

# Check lint (if configured)
npm run lint
```

## Working with Remote

**Keep in sync:**
```bash
# Fetch latest changes
git fetch origin

# Pull latest main
git checkout main
git pull origin main

# Rebase feature branch
git checkout feature/branch
git rebase main
```

**Resolve conflicts:**
```bash
# During rebase
git rebase main
# Fix conflicts in files
git add <resolved-files>
git rebase --continue

# Abort if needed
git rebase --abort
```

## Useful Aliases

Add to `~/.gitconfig`:
```ini
[alias]
  st = status --short
  co = checkout
  br = branch
  cm = commit -m
  ca = commit --amend
  lg = log --oneline --graph --decorate
  df = diff
  dfs = diff --staged
```

## Git History

**View history:**
```bash
# Recent commits
git log --oneline -10

# With details
git log -10

# Graphical view
git log --oneline --graph --all

# Search commits
git log --grep="TASK-015"

# By author
git log --author="Chris Norton"

# By date
git log --since="2025-10-01"
```

**View specific commit:**
```bash
# Show commit details
git show <commit-hash>

# Files changed
git show --name-only <commit-hash>

# Specific file in commit
git show <commit-hash>:path/to/file.ts
```
