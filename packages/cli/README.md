# Ginko CLI

Privacy-first CLI for AI-assisted development. Your code never leaves your machine.

## Installation

```bash
npm install -g @ginkoai/cli
# or
npm link  # for development
```

## Quick Start

```bash
# Initialize Ginko in your project
ginko init

# Start a session
ginko start

# Save progress
ginko handoff "Completed authentication feature"

# Check status
ginko status
```

## Core Commands

### Session Management
- `ginko init` - Initialize Ginko in your project
- `ginko start [sessionId]` - Start or resume a session
- `ginko handoff [message]` - Create a session handoff
- `ginko status` - Show current session status

### Context & Configuration
- `ginko context` - Manage session context
  - `--add <files...>` - Add files to context
  - `--remove <files...>` - Remove files from context
  - `--show` - Show current context
- `ginko config` - Manage Ginko configuration
  - `--get <key>` - Get config value
  - `--set <key> <value>` - Set config value
  - `--list` - Show all configuration

### Workflow Commands
- `ginko vibecheck [concern]` - Quick recalibration when feeling lost
- `ginko compact` - Reduce context size and clean up old sessions
  - `--preserve <files...>` - Keep specific files
  - `--aggressive` - More aggressive cleanup
- `ginko ship [message]` - Create and push PR-ready branch
  - `--branch <name>` - Specify branch name
  - `--no-push` - Skip pushing to remote
  - `--no-tests` - Skip running tests

## Features

### Privacy First
- **No code leaves your machine** - All data stored locally in `.ginko/` directory
- **Git-native persistence** - Session handoffs tracked in git
- **Zero analytics by default** - Complete privacy, no telemetry

### AI Adaptability
Ginko automatically detects and adapts output for:
- Claude (markdown with colors)
- GPT-4 (structured JSON)
- Gemini (hierarchical XML)
- Llama (minimal format)
- Universal fallback

### Session Archives
Handoffs are archived with human-readable names:
- `2025-08-27-fix-auth-bug.md`
- `2025-08-27-implement-payment.md`
- `2025-08-27-refactor-database.md`

## Directory Structure

```
.ginko/
├── sessions/           # Session handoffs and archives
│   └── user-email/
│       ├── current.md  # Latest handoff
│       └── archive/    # Previous sessions
├── context/            # Context management
│   ├── current.json    # Active context files
│   └── modules/        # (Future) Persistent context modules
├── patterns/           # Discovered patterns
├── best-practices/     # Team standards
└── config.json         # User preferences
```

## Configuration

Default configuration (`.ginko/config.json`):
```json
{
  "version": "0.1.0",
  "user": {
    "email": "auto-detected@example.com"
  },
  "privacy": {
    "analytics": {
      "enabled": false,
      "anonymous": true
    },
    "telemetry": {
      "enabled": false
    }
  },
  "git": {
    "autoCommit": false,
    "signCommits": false
  },
  "ai": {
    "model": "auto-detect",
    "output": {
      "format": "human",
      "colors": true,
      "emojis": true
    }
  }
}
```

## Workflow Examples

### Basic Development Flow
```bash
ginko init                          # Set up project
ginko start                         # Begin work
# ... do development work ...
ginko handoff "Implemented feature" # Save progress
```

### Debugging Session
```bash
ginko start
# ... encounter issues ...
ginko vibecheck "stuck on async bug"  # Get recalibration
# ... fix issues ...
ginko handoff "Fixed async race condition"
```

### Shipping Changes
```bash
ginko ship "Add user authentication"  # Creates PR
# Automatically:
# - Runs tests
# - Commits changes
# - Creates feature branch
# - Pushes to remote
# - Opens pull request
```

### Managing Context
```bash
ginko context --add "src/auth/*"      # Track auth files
ginko context --show                  # View tracked files
ginko compact                          # Clean up old context
```

## Future Features

### Persistent Context Modules (Coming Soon)
Modular "memory cards" that persist learnings across sessions:
- Architecture decisions
- Configuration details
- Common gotchas
- Code patterns
- Team standards

```bash
# Future commands:
ginko context load auth              # Load auth knowledge
ginko context capture "JWT gotcha"   # Save learning
ginko context auto                   # Auto-detect needed context
```

## Development

```bash
# Clone repository
git clone https://github.com/ginkoai/ginko
cd ginko/packages/cli

# Install dependencies
npm install

# Build TypeScript
npm run build

# Link for local testing
npm link

# Test commands
ginko --help
```

## Privacy Guarantee

**What NEVER leaves your machine:**
- ❌ Source code
- ❌ File contents
- ❌ File paths or names
- ❌ Commit messages
- ❌ API keys or secrets
- ❌ Session content
- ❌ Any proprietary information

**What can be shared (opt-in only):**
- ✅ Anonymous usage metrics (if enabled)
- ✅ Command frequency
- ✅ Session duration
- ✅ Performance statistics

## Support

- Report issues: https://github.com/ginkoai/ginko/issues
- Documentation: https://docs.ginko.ai
- Email: support@ginko.ai

## License

MIT - See LICENSE file for details

---

Built with 🌱 by Ginko AI - Privacy-first tools for AI-assisted development