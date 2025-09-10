---
id: FEATURE-020
type: feature
title: Git-Native Backlog Management
parent: null
status: IN_PROGRESS
priority: CRITICAL
created: 2025-09-10
updated: 2025-09-10
effort: 5
children: []
tags: [backlog, git-native, markdown, tooling]
prd: PRD-008
adr: ADR-011
---

# Git-Native Backlog Management

## Problem Statement
Modern project management tools (Jira, ADO) are complex, break developer flow, and force context switches. Our own BACKLOG.md has grown to 110KB causing token limit errors. We need a simple, git-native solution that works for the 80% of teams overserved by enterprise tools.

## Solution
Implement a flat-file markdown-based backlog system where each item is a separate file in git. No database, no server, just files that developers and AI can manipulate naturally.

## Success Criteria
- [ ] Migrate existing 15+ features from BACKLOG.md
- [ ] All files under 5KB (no token limits)
- [ ] Create item in <10 seconds
- [ ] Works with just `ls`, `grep`, `cat`
- [ ] AI can query and update efficiently

## Implementation Tasks
- [x] Create PRD-008 documenting approach
- [x] Create ADR-011 for architecture decision
- [x] Create directory structure
- [x] Create item templates
- [ ] Migrate all existing features
- [ ] Generate index.md
- [ ] Implement `ginko backlog` commands
- [ ] Archive original BACKLOG.md

## Technical Notes
- Flat structure in `backlog/items/`
- Frontmatter for metadata
- Templates for consistency
- Index.md for navigation
- Archive completed items by year

## Dependencies
- Git (already in use)
- Markdown (universal support)
- Optional: ginko CLI enhancements