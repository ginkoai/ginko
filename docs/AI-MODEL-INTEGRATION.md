# AI Model Integration Guide

How to integrate Ginko with different AI models and IDEs using our git-native file-based approach.

## Core Integration Principle

Ginko uses **filesystem-based context loading** - no API calls, no servers, just files in `.ginko/`. This makes integration universal across any AI system that can:
1. Execute shell commands
2. Read local files

## Integration Approaches by AI System

### Claude (via Claude.ai or Claude Code)

#### Slash Command Method (Recommended)
Create `.claude/commands/ginko.md`:
```markdown
Execute `ginko [command]` via bash, then read generated files from `.ginko/`
```

Usage:
```
/ginko start    → Runs CLI, reads .ginko/sessions/*/current.md
/ginko handoff  → Saves to .ginko/[user]/session-handoff.md
```

#### Direct Execution Method
```bash
# In Claude prompt
Run: ginko start
Then: cat .ginko/sessions/*/current.md
```

### GitHub Copilot Chat

#### Custom Command Method
Add to `.github/copilot-instructions.md`:
```markdown
When user types @ginko [command]:
1. Execute: ginko [command]
2. Read: .ginko/sessions/*/current.md
3. Display relevant sections
```

#### Context File Method
```bash
# Tell Copilot to watch ginko files
@workspace include .ginko/sessions/*/current.md
```

### Cursor AI

#### .cursorrules Integration
Add to `.cursorrules`:
```
When starting work:
1. Run `ginko start`
2. Load .ginko/sessions/*/current.md as context
3. Check .ginko/context/modules/ for relevant modules

Before ending work:
1. Run `ginko handoff`
2. Remind user to commit .ginko/ changes
```

#### Cursor Commands
```bash
# In Cursor terminal
ginko start
# Then use @codebase to reference .ginko/ files
```

### VSCode with Continue.dev

#### config.json Setup
```json
{
  "customCommands": [
    {
      "name": "ginko",
      "description": "Load Ginko context",
      "prompt": "Execute ginko {{{args}}} and read .ginko/sessions/*/current.md"
    }
  ]
}
```

Usage: `/ginko start` in Continue chat

### JetBrains AI Assistant

#### Custom Actions
Create `.idea/aiAssistant.xml`:
```xml
<action id="GinkoStart">
  <command>ginko start</command>
  <readFile>.ginko/sessions/*/current.md</readFile>
</action>
```

### Windsurf (formerly Codeium)

#### Workspace Settings
Add to `.windsurf/settings.json`:
```json
{
  "contextFiles": [
    ".ginko/sessions/*/current.md",
    ".ginko/context/modules/*.md"
  ],
  "onSessionStart": "ginko start",
  "onSessionEnd": "ginko handoff"
}
```

### Zed AI

#### Extension Method
Create `zed-ginko` extension that:
1. Watches `.ginko/` directory
2. Loads context on file changes
3. Provides `/ginko` command in assistant

### Terminal-Based AI (llm, aichat, etc.)

#### Shell Alias Method
Add to `~/.bashrc` or `~/.zshrc`:
```bash
alias ai-start='ginko start && cat .ginko/sessions/*/current.md | llm'
alias ai-handoff='ginko handoff && git add .ginko/'
```

#### Pipe Method
```bash
ginko start | tee >(llm "Continue this session with context")
```

## Universal Integration Pattern

For any AI system, follow this pattern:

### 1. Session Start
```bash
ginko start
cat .ginko/sessions/*/current.md  # Load previous context
```

### 2. During Work
```bash
cat .ginko/context/modules/[relevant].md  # Load specific modules
ginko vibecheck  # Quick alignment check
```

### 3. Session End
```bash
ginko handoff "Description of work"
git add .ginko/
git commit -m "Session: [description]"
```

## File Locations Reference

All AI systems should read from these locations:

```
.ginko/
├── sessions/
│   └── [user-email]/
│       ├── current.md          # Active session context
│       └── archive/*.md        # Historical sessions
├── context/
│   └── modules/
│       ├── arch-*.md          # Architecture decisions
│       ├── pattern-*.md       # Code patterns
│       ├── config-*.md        # Configuration knowledge
│       └── gotcha-*.md        # Learned gotchas
└── [user-email]/
    ├── session-handoff.md     # Current handoff (to commit)
    └── archive/*.md           # Archived handoffs
```

## Integration Testing

Test your integration with these commands:

```bash
# 1. Initialize
ginko init

# 2. Start session (should load context)
ginko start
[Your AI should read .ginko/sessions/*/current.md]

# 3. Create handoff (should save context)
ginko handoff "Test handoff"
[Your AI should confirm save to .ginko/*/session-handoff.md]

# 4. Check git status
git status .ginko/
[Should show uncommitted changes]
```

## Best Practices for AI Integration

### 1. Auto-Load on Start
Configure your AI to automatically run `ginko start` when opening a project with `.ginko/` directory.

### 2. Remind to Commit
Set up reminders to commit `.ginko/` changes before ending sessions.

### 3. Module Discovery
Implement smart module loading based on:
- Current file being edited
- Recent git changes
- Error messages encountered

### 4. Preserve Context
When switching between AI systems:
```bash
# End session in System A
ginko handoff "Switching to System B"
git commit -am "Handoff from System A"

# Start in System B  
ginko start  # Will load handoff automatically
```

## Troubleshooting Common Issues

### "Command not found: ginko"
```bash
# Install globally
npm install -g @ginkoai/cli

# Or use local binary
./node_modules/.bin/ginko
```

### "No context found"
```bash
# Initialize first
ginko init

# Create initial context
ginko start
```

### "Permission denied"
```bash
# Fix permissions
chmod +x node_modules/.bin/ginko
chmod 755 .ginko
```

### Context Not Loading
```bash
# Verify files exist
ls -la .ginko/sessions/*/current.md

# Check user directory
echo $(git config user.email | sed 's/@/-at-/g' | sed 's/\./-/g')
```

## Contributing Integration Methods

Found a new way to integrate Ginko? Add it here:

1. Test your integration method
2. Document the configuration
3. Submit a PR with your addition

## Philosophy

> "Context should follow the code, not the tool"

By storing everything in git-tracked files, Ginko works with ANY tool that can read files - present or future. No vendor lock-in, no API dependencies, just files in your repo.