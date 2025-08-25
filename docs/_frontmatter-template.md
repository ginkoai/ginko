# Documentation Frontmatter Standard

All documentation files use this exact 10-line frontmatter format for AI agent compatibility:

```yaml
---
type: [architecture|decision|setup|analysis|testing|ux|project]
status: [current|approved|deprecated|draft|implemented]
updated: YYYY-MM-DD
tags: [infrastructure, mvp, supabase, vercel, auth, sessions]
related: [file1.md, file2.md]
priority: [critical|high|medium|low]
audience: [developer|ai-agent|team|stakeholder]
estimated-read: [1-min|5-min|10-min|30-min]
dependencies: [none|ADR-001|INFRA-001]
---
```

## AI Agent Benefits

**Consistent `head -12` retrieval**: Always gets complete metadata
**Quick context discovery**: Type and status immediately visible
**Dependency tracking**: Related documents clearly linked
**Freshness indication**: Updated dates for relevance
**Task-specific filtering**: Tags for focused searches

## Usage Examples

```bash
# Get metadata for all current architecture docs
find docs/ -name "*.md" -exec head -12 {} \; | grep -A10 "type: architecture"

# Find all setup guides related to infrastructure  
grep -l "tags:.*infrastructure" docs/**/*.md | head -12

# Get all current, high-priority documents
grep -l "status: current" docs/**/*.md | xargs grep -l "priority: high"
```