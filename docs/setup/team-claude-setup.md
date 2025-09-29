---
type: setup
status: current
updated: 2025-01-31
tags: [team-setup, claude-config, best-practices, onboarding]
related: [claude-settings-info.md, supabase-setup-guide.md]
priority: medium
audience: [developer, ai-agent, team]
estimated-read: 5-min
dependencies: [none]
---

# Team CLAUDE.md Setup Guide

Add this section to your personal `~/.claude/CLAUDE.md` file to automatically load team best practices at the start of every Claude Code session.

## Recommended CLAUDE.md Addition

```markdown
## Team Development Context (Auto-loaded)

When starting a new session, automatically load team context:

1. **Load Best Practices**: Use the `get_best_practices` tool to get current team coding standards and development practices.

2. **Get Project Overview**: Use the `get_project_overview` tool to understand the current project structure and team context.

3. **Check Team Activity**: Use the `get_team_activity` tool to see what the team has been working on recently.

### Auto-Start Commands
At the beginning of each session, execute these commands to load team context:
- `get_best_practices priority=critical` - Load critical development practices
- `get_project_overview` - Get project structure with team insights
- `suggest_best_practice scenario="starting new development task"` - Get guidance for beginning work

### Development Philosophy
Always prioritize:
1. Understanding existing code before implementing changes
2. Following established team patterns and conventions
3. Testing changes before committing
4. Writing self-documenting, maintainable code
5. Handling errors gracefully with meaningful messages

### Context Tools Available
- `get_best_practices` - Team coding standards and practices
- `suggest_best_practice` - Contextual guidance for specific scenarios  
- `get_project_overview` - Project structure with team collaboration insights
- `get_team_activity` - Recent team activity and focus areas
- `find_relevant_code` - Smart code search with team patterns
- `get_file_context` - File analysis with team usage patterns
```

## Alternative: Session Startup Hook

For automatic execution, you can also configure Claude Code hooks to run commands on session start. Add this to your Claude Code settings:

```json
{
  "hooks": {
    "session-start": [
      "get_best_practices priority=critical",
      "get_project_overview"
    ]
  }
}
```

## Benefits

✅ **Consistent Standards**: Every session starts with team practices loaded  
✅ **Contextual Guidance**: Immediate access to team-specific development patterns  
✅ **Reduced Onboarding**: New team members get guidance automatically  
✅ **Quality Assurance**: Built-in reminders for testing, security, and best practices  
✅ **Team Alignment**: Everyone works with the same development philosophy  

## Usage Examples

Once loaded, you can get contextual suggestions throughout your session:

```
suggest_best_practice scenario="refactoring legacy code"
suggest_best_practice scenario="adding new API endpoint" 
suggest_best_practice scenario="handling user authentication"
suggest_best_practice scenario="optimizing database queries"
```