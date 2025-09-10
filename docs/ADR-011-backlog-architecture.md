# ADR-011: Git-Native Backlog Architecture

## Status
Proposed

## Context

Our current BACKLOG.md has grown to 110KB (3100+ lines), causing token limit errors in AI tools and making it difficult to navigate. Enterprise tools like Jira and Azure DevOps solve this through complex databases and web UIs, but introduce friction that breaks developer flow.

We need a solution that:
- Scales without complexity
- Works natively with git workflows
- Requires zero additional tooling
- Supports both human and AI interaction
- Maintains the simplicity of markdown files

## Decision

We will implement a **flat file architecture** where each backlog item is a separate markdown file in a single directory.

### Architecture

```
backlog/
├── index.md                    # Navigation and current status
├── items/                      # All items in flat structure
│   ├── EPIC-001-title.md
│   ├── FEATURE-019-title.md
│   ├── STORY-045-title.md
│   └── TASK-123-title.md
├── templates/                  # Templates for each type
└── archive/                    # Completed items by year
    └── 2025/
```

### File Naming Convention

`[TYPE]-[NUMBER]-[slug].md`

- TYPE: EPIC, FEATURE, STORY, TASK
- NUMBER: Zero-padded 3-digit incrementing ID
- slug: Lowercase, hyphenated description (3-5 words)

Examples:
- `FEATURE-019-oauth-authentication.md`
- `TASK-123-update-dependencies.md`

### Frontmatter Schema

```yaml
---
id: FEATURE-019
type: feature
title: OAuth Authentication Support
parent: EPIC-001              # Hierarchical reference
children: [STORY-045, STORY-046]
status: IN_PROGRESS          # PROPOSED|IN_PROGRESS|BLOCKED|COMPLETE
priority: CRITICAL           # CRITICAL|HIGH|MEDIUM|LOW
created: 2025-09-10
updated: 2025-09-10
effort: 5                    # Story points (optional)
sprint: 2025-09-week-2       # Sprint assignment (optional)
tags: [auth, oauth, security]
---
```

## Rationale

### Why Flat Over Nested

We evaluated nested folders (epics/features/stories/tasks) but chose flat because:

1. **CLI Simplicity**: `ls backlog/items/` shows everything
2. **Grep Performance**: Single directory to search
3. **Git Operations**: Simple paths in diffs and logs
4. **Flexibility**: Items can change parents without moving files
5. **AI Access**: LLMs can list and read without traversing

### Why Individual Files Over Single File

1. **Parallel Editing**: No merge conflicts when multiple devs work
2. **Focused Changes**: Git history per item, not entire backlog
3. **Scalability**: No size limits or token constraints
4. **Performance**: Load only what you need
5. **Caching**: File system and git handle caching

### Why Markdown Over JSON/YAML

1. **Readability**: Developers can `cat` and understand
2. **Editability**: Any text editor works
3. **Flexibility**: Prose descriptions without escaping
4. **AI-Native**: LLMs trained extensively on markdown
5. **Documentation**: The backlog IS the documentation

## Consequences

### Positive

- ✅ No token limits for AI tools
- ✅ Natural git workflows (branch, merge, history)
- ✅ Works offline, no external dependencies
- ✅ Progressive disclosure (start simple, add as needed)
- ✅ Each item under 5KB, fast to load and process
- ✅ Standard Unix tools work (`grep`, `find`, `sort`)

### Negative

- ⚠️ No automatic referential integrity
- ⚠️ Index.md can become stale (mitigated by regeneration)
- ⚠️ More files to manage (mitigated by tooling)
- ⚠️ No built-in metrics (intentional simplicity)

### Neutral

- 📝 Requires discipline in naming and frontmatter
- 📝 Teams must agree on conventions
- 📝 Search relies on grep rather than database queries

## Migration Strategy

1. **Backup**: Copy BACKLOG.md to BACKLOG.md.archive
2. **Parse**: Extract each FEATURE/EPIC section
3. **Generate**: Create individual files with frontmatter
4. **Index**: Build index.md from all items
5. **Validate**: Ensure all content migrated
6. **Cleanup**: Remove original after verification

## Future Extensions

These are possible without changing core architecture:

- **Auto-indexing**: GitHub Action to regenerate index.md
- **Validation**: Pre-commit hooks for frontmatter
- **Templates**: More sophisticated item templates
- **Queries**: `ginko backlog query` for complex searches
- **Metrics**: External tools can generate from files

## Decision Reversal

If this approach fails, reversal is simple:
1. Script to concatenate all items back into BACKLOG.md
2. Git history preserves all changes
3. No data lock-in or proprietary formats

## References

- PRD-008: Git-Native Backlog Management
- Unix Philosophy: "Make each program do one thing well"
- Markdown Specification: CommonMark
- Prior Art: Zettelkasten, Obsidian, Foam

## Review

This ADR should be reviewed if:
- We exceed 1000 items in backlog/items/
- Performance degrades below 1-second operations
- Team grows beyond 20 developers
- We need real-time collaboration features