# Ginko Slash Commands for Claude Code

These commands enhance your git-native handoff workflow directly within Claude Code.

## Available Commands

### `/status` - Check Handoff Status
Shows the current state of your session handoff:
- Git status (modified/staged/committed)
- File size with warnings
- Last modified time
- Line count

**Example output:**
```
✏️  Handoff modified (uncommitted)
📅 Last modified: 2025-08-17 10:14
📊 Size: 2KB (healthy)
📝 Lines: 70
```

### `/handoff` - Open Handoff in Editor
Opens your current session handoff in your preferred editor.
- Auto-detects VSCode, Sublime, Atom, Vim, or system default
- Handles hidden `.ginko` folder seamlessly

### `/archive` - Archive Current Handoff
Moves current handoff to timestamped archive:
```
📦 Archived to: .ginko/chris-at-ginko-ai/archive/2025-08-17-1015-session.md
```

## Planned Commands

### `/template [type]` - Apply Handoff Template
Apply a template to structure your handoff:
- `/template bug` - Bug investigation template
- `/template feature` - Feature development template
- `/template refactor` - Refactoring session template

### `/commit` - Smart Commit with Handoff
Commits code changes with handoff context:
```
git commit -m "feat: Implement user authentication

See handoff: .ginko/chris-at-ginko-ai/session-handoff.md"
```

### `/sync` - Sync to Server (Future)
Background sync to Ginko server for team visibility.

## Implementation

These commands are implemented through:
1. **Local execution**: `./ginko [command]` 
2. **Claude integration**: Future MCP tool registration
3. **Statusline updates**: Real-time feedback

## How to Use

Currently, you can ask Claude to run these commands:
- "Check handoff status" → Claude runs `/status`
- "Open my handoff" → Claude runs `/handoff`
- "Archive this session" → Claude runs `/archive`

Future integration will allow direct slash command execution in Claude Code.

## Benefits

- **Quick status checks** without leaving Claude
- **Direct editor access** to review/edit handoffs  
- **Session management** with simple commands
- **Git integration** awareness in your workflow

---

*Making git-native handoffs as natural as conversation.*