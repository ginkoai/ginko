# Getting Started with Ginko

This guide walks you through installing Ginko, setting up your first project, and using the core workflow.

## Prerequisites

- **Node.js 18+** — [Download](https://nodejs.org)
- **Git** — any recent version
- An AI coding partner (Claude Code, Cursor, Copilot, or any LLM)

## Installation

```bash
npm install -g @ginkoai/cli
```

Verify the installation:

```bash
ginko --help
```

## Initialize Your Project

Navigate to your project and run:

```bash
cd your-project
ginko init
```

This creates:
- `.ginko/` directory for session data and configuration
- `CLAUDE.md` with AI-optimized project instructions (works with any AI partner)
- Default configuration with privacy-first settings

> **Tip:** Add `.ginko/config.json` to your `.gitignore` if it contains user-specific settings. The rest of `.ginko/` should be committed — it's how session continuity works across team members.

## The Core Workflow

### 1. Start a Session

```bash
ginko start
```

Ginko loads context from your last session:
- What you were working on
- Decisions you made
- Gotchas you discovered
- Your current sprint progress

Your AI partner can read this context to pick up where you left off.

### 2. Work Normally

Use your AI partner as you normally would. As you work, log important events:

```bash
# Log a decision
ginko log "Chose Redis for caching — need sub-ms latency for auth tokens"

# Log a gotcha
ginko log "Vercel has 4.5MB body limit — batch API calls to stay under"

# Log an achievement
ginko log "Auth middleware complete, all 12 tests passing"
```

### 3. Save Progress

When you're done (or switching tasks), create a handoff:

```bash
ginko handoff "Completed auth middleware with JWT validation and refresh tokens"
```

This saves:
- Your session timeline
- Decisions and insights
- Current progress
- Suggested next steps

### 4. Resume Later

Next time you (or a teammate) start working:

```bash
ginko start
```

Ginko synthesizes your previous session into a compact context that your AI partner can consume in seconds.

## Organizing Work

### Project Charter

Define your project's purpose, goals, and scope:

```bash
ginko charter
```

Ginko's AI-assisted flow asks about your project and creates `docs/PROJECT-CHARTER.md`.

### Epics and Sprints

For larger initiatives, organize work into epics:

```bash
ginko epic
```

The AI guides you through:
1. Defining the goal and success criteria
2. Breaking it into sprints
3. Creating tasks within each sprint

Sprint files are created in `docs/sprints/` and tracked alongside your code.

### Task Tracking

```bash
# See what's next
ginko status

# Start a task
ginko task start e001_s01_t01

# Complete a task
ginko task complete e001_s01_t01
```

Task IDs follow the pattern `e{epic}_s{sprint}_t{task}` — e.g., `e001_s01_t03` is Epic 1, Sprint 1, Task 3.

## Quick Reference

| I want to... | Command |
|--------------|---------|
| Start working | `ginko start` |
| Save progress | `ginko handoff "description"` |
| Log something | `ginko log "what happened"` |
| Check status | `ginko status` |
| Feel stuck | `ginko vibecheck` |
| Plan an initiative | `ginko epic` |
| Ship a PR | `ginko ship "description"` |
| Clean up old sessions | `ginko compact` |

## Optional: Ginko Cloud

The CLI works fully offline. For teams that want shared context, Ginko Cloud adds:

- **Knowledge graph** — visualize relationships between ADRs, sprints, and decisions
- **Team sync** — share sprint progress and insights across team members
- **Graph search** — semantic search across your project knowledge
- **Dashboard** — visual project overview

To connect:

```bash
ginko login
ginko push    # Push local knowledge to graph
ginko pull    # Pull team updates
```

Cloud features degrade gracefully — if you're not logged in, the CLI works normally without errors.

## Troubleshooting

### "ginko: command not found"

Make sure the npm global bin directory is in your PATH:

```bash
npm config get prefix
# Add <prefix>/bin to your PATH
```

Or use npx:

```bash
npx @ginkoai/cli start
```

### "No session found"

Run `ginko init` first to set up Ginko in your project. Ginko looks for the `.ginko/` directory to detect an initialized project.

### Session data looks stale

If context seems outdated:

```bash
ginko compact --aggressive    # Clean up and rebuild context
ginko start                   # Fresh start with clean state
```

### Working in a monorepo

Ginko auto-detects your git root. Run any command from any subdirectory — it works correctly.

```bash
cd packages/frontend
ginko start    # Uses the repo-root .ginko/ directory
```

## Next Steps

- Read the [Architecture Decision Records](../adr/) to understand Ginko's design philosophy
- Check out the [CLI README](../../packages/cli/README.md) for all command options
- Join the community: [GitHub Issues](https://github.com/ginkoai/ginko/issues)
