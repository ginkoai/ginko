# Ginko CLI Integration Command

Execute ginko CLI commands with git-native file-based context loading.

## Usage Patterns

### Basic Usage
When the user types `/ginko [command] [args]`, execute the ginko CLI command and read the generated files directly from the filesystem.

### Command Mapping

1. **`/ginko` or `/ginko start`**
   - Run `ginko start` to begin a session
   - Read context from `.ginko/sessions/[user]/current.md`
   - Display session status and current work mode

2. **`/ginko handoff [message]`**
   - Run `ginko handoff` with optional message
   - Save handoff to `.ginko/[user]/session-handoff.md`
   - Open in editor for review (via `./ginko handoff`)
   - Display confirmation and remind to commit

3. **`/ginko vibecheck`**
   - Run `ginko vibecheck` for quick recalibration
   - Read current state from filesystem
   - Suggest realignment based on `.ginko/sessions/*/current.md`

4. **`/ginko compact`**
   - Run `ginko compact` to clean up old sessions
   - Archive old files to `.ginko/[user]/archive/`
   - Show storage optimization results

5. **`/ginko ship [branch-name]`**
   - Run `ginko ship` to create PR-ready branch
   - Ensure tests pass before shipping
   - Include handoff in commit message

6. **`/ginko status`**
   - Read `.ginko/sessions/[user]/current.md`
   - Show git status of `.ginko/` directory
   - Display uncommitted handoffs warning if present

7. **`/ginko context [module]`**
   - Load specific module from `.ginko/context/modules/[module].md`
   - List available modules if no argument
   - Auto-discover based on current file edits

8. **`/ginko archive`**
   - Move current handoff to `.ginko/[user]/archive/YYYY-MM-DD-description.md`
   - Create new blank handoff
   - Confirm archival

## Implementation Strategy

1. **Execute ginko CLI**:
   ```bash
   ginko [command] [args]
   ```

2. **Read Generated Files**:
   - Session files: `.ginko/sessions/[user]/current.md`
   - Handoffs: `.ginko/[user]/session-handoff.md`
   - Context modules: `.ginko/context/modules/*.md`
   - Archives: `.ginko/[user]/archive/*.md`

3. **Parse and Display**:
   - Extract relevant sections from markdown files
   - Show current state and next steps
   - Highlight uncommitted changes in `.ginko/`

4. **Git Integration**:
   - Check git status of `.ginko/` directory
   - Remind to commit handoffs
   - Include session context in commit messages

## File-Based Context Loading

All context is loaded directly from filesystem:
- **No MCP tools needed** - deprecated in favor of git-native approach
- **No server calls** - everything works offline
- **Git-tracked** - all context in version control

## Error Handling

- If ginko CLI not found: Check if installed via `which ginko`
- If no `.ginko/` directory: Run `ginko init` first
- If no user directory: Check git config for email
- If file not found: Gracefully handle and suggest `ginko start`

## Context Module Discovery

Automatically discover relevant modules by:
1. Reading `.ginko/context/modules/` directory
2. Matching tags in module frontmatter with current work
3. Suggesting modules based on file patterns

## Examples

```
User: /ginko
Claude: [Runs ginko start, reads .ginko/sessions/*/current.md, displays status]

User: /ginko handoff fixing authentication  
Claude: [Saves to .ginko/[user]/session-handoff.md, reminds to review and commit]

User: /ginko context auth
Claude: [Reads .ginko/context/modules/*auth*.md files]

User: /ginko ship feature/new-auth
Claude: [Runs tests, creates branch, includes handoff in commit]
```

## Git Workflow Integration

After any ginko command that modifies files:
1. Show git status of `.ginko/` directory
2. Suggest commit message including session summary
3. Remind about uncommitted handoffs after 30 minutes

This command provides seamless integration between the ginko CLI and Claude using pure filesystem operations, maintaining the git-native philosophy.