# PRD-008: Git-Native Backlog Management

## Status
Proposed

## Problem Statement

Modern project management tools like Jira, Azure DevOps, and Confluence have become bloated enterprise platforms that actively harm developer productivity. They force context switches, require leaving the development environment, impose rigid workflows, and create friction at every interaction. 

The token limit error in our own BACKLOG.md (110KB, 3100+ lines) demonstrates that even simple text files can become unwieldy without structure. We need a solution that combines the simplicity of text files with just enough structure to remain manageable at scale.

## Target Audience

The 80% of development teams that are **overserved** by enterprise tools:
- Small to medium teams (2-20 developers)
- Teams that value simplicity over features
- Developers who live in the terminal/IDE
- Teams practicing agile without ceremony
- AI-assisted development workflows

## Solution: Git-Native Backlog

A backlog management system that is literally just markdown files in git:
- No database, no server, no API
- No accounts, no permissions, no sync issues  
- Just files that developers and AI can read/write
- Works offline, works forever
- Zero vendor lock-in

## Core Design Principles

1. **Just Git**: If you delete ginko, everything still works
2. **Human-Readable**: Every file is readable in `cat` or `vim`
3. **AI-Friendly**: Structured for LLM understanding
4. **Progressive Disclosure**: Start simple, discover features as needed
5. **10-Second Workflow**: Creating an item takes seconds, not minutes

## Magical Experience Goals

### The "Wow" Moments

1. **Instant Creation**
   ```bash
   ginko backlog create feature "add oauth"
   # Done. File created, index updated, ready to work.
   ```

2. **Natural Queries**
   ```bash
   ginko backlog list --critical --blocked
   # Shows exactly what's blocking critical work
   ```

3. **Zero Learning Curve**
   ```bash
   ls backlog/items/         # See all work
   cat backlog/items/TASK-* # Read tasks
   grep -l "oauth" backlog/* # Find OAuth work
   ```

4. **AI Integration**
   ```
   Human: "What should I work on next?"
   AI: *reads backlog/items/*, understands context, suggests priority
   ```

## MVP Scope

### What's In
- Flat file structure (`backlog/items/*.md`)
- Four item types (EPIC, FEATURE, STORY, TASK)
- Simple frontmatter (id, status, priority, parent)
- Basic index file for navigation
- Templates for consistency
- Three ginko commands (create, list, status)

### What's Out (Intentionally)
- ❌ Burn charts, velocity tracking, metrics
- ❌ Time tracking, estimates, capacity planning
- ❌ User assignment, permissions, roles
- ❌ Integrations with external tools
- ❌ Web UI, mobile apps, notifications
- ❌ Complex workflows, state machines

## File Structure

```
backlog/
├── index.md                    # Navigation and overview
├── items/                      # All work items (flat)
│   ├── EPIC-001-authentication.md
│   ├── FEATURE-019-oauth.md
│   ├── STORY-045-google-login.md
│   └── TASK-123-update-deps.md
└── templates/                  # Consistency helpers
    ├── epic.md
    ├── feature.md
    ├── story.md
    └── task.md
```

## Success Metrics

1. **Adoption**: Developers choose this over existing BACKLOG.md
2. **Speed**: Create new item in <10 seconds
3. **Simplicity**: New developer productive in <5 minutes
4. **Reliability**: Zero data loss, zero sync issues
5. **Joy**: Developers actually enjoy using it

## Migration Path

1. Parse existing BACKLOG.md
2. Generate individual files
3. Create index
4. Archive original
5. No breaking changes, full reversibility

## Future Possibilities (Not Commitments)

If successful, could expand to:
- Sprint planning files
- Automated index generation
- GitHub Actions for metrics
- VS Code extension
- Team sync via git hooks

But the core system must work beautifully without any of these.

## Anti-Goals

We are explicitly NOT trying to:
- Replace Jira for enterprise teams
- Support complex approval workflows  
- Track detailed time/cost metrics
- Provide real-time collaboration
- Build a platform or ecosystem

## Why This Wins

1. **Zero Friction**: Already in your repo, already in git
2. **AI-Native**: LLMs understand markdown perfectly
3. **Future-Proof**: Markdown files will outlive any tool
4. **Developer-First**: Built for how developers actually work
5. **Radical Simplicity**: Does one thing excellently

The best backlog system is the one that gets out of your way. This is that system.