/**
 * @fileType: guide
 * @status: current
 * @updated: 2025-12-15
 * @tags: [documentation, quick-start, tutorial, onboarding, beta]
 * @related: [USER-GUIDE.md, CLI-REFERENCE.md]
 * @priority: critical
 * @complexity: low
 */

# Quick Start Guide

Get started with Ginko in 5 minutes. This guide walks you through installation, authentication, and your first AI collaboration session.

---

## What is Ginko?

**The AI Collaboration Platform - Where humans and AI ship together**

Ginko is a git-native CLI that helps you and AI collaborate more effectively:

- **Capture context** - Log insights, decisions, and learnings as you work
- **Preserve knowledge** - Build a searchable memory of your project
- **Ship faster** - AI stays in sync with your goals and progress
- **Collaborate better** - Seamless handoffs between sessions and team members

---

## Installation

### Prerequisites

- Node.js 18+ installed
- Git repository (recommended)
- GitHub account (for authentication)

### Install the CLI

```bash
npm install -g @ginko/cli@beta
```

Verify installation:

```bash
ginko --version
```

---

## Step 1: Authenticate

```bash
ginko login
```

This will:
1. Open your browser to GitHub OAuth
2. Authenticate your account
3. Generate a long-lived API key
4. Store credentials locally at `~/.ginko/auth.json`

**Verify authentication:**

```bash
ginko whoami
```

You should see your GitHub username and API key prefix.

---

## Step 2: Initialize Your Project

Navigate to your project directory and initialize Ginko:

```bash
cd /path/to/your/project
ginko init
```

**What this does:**
- Creates `.ginko/` directory for local session data
- Sets up git-native session management
- Configures event-based context loading
- Creates a cloud knowledge graph for your project

**Verify initialization:**

```bash
ls -la .ginko/
```

You should see session directories and configuration files.

---

## Step 3: Create Your Project Charter (Optional)

Define your project's vision and goals with an AI-mediated conversation:

```bash
ginko charter
```

**What this does:**
- Guides you through a natural conversation about your project
- Captures purpose, goals, success criteria, and constraints
- Creates `docs/PROJECT-CHARTER.md` as your north star
- Helps AI understand your project context

**Skip this step if:**
- You're exploring or prototyping
- Your project already has clear documentation
- You want to jump straight into development

---

## Step 4: Start Your First Session

```bash
ginko start
```

**What this does:**
- Loads your project context (< 2 seconds!)
- Initializes session logging
- Syncs events to your knowledge graph
- Gets you ready to work with AI

**You'll see:**
```
Ready | Hot (10/10) | Think & Build mode
Session: chris-at-watchhill-ai
Project: ginko

What would you like to work on?
```

---

## Step 5: Log Your Progress

As you work, capture important insights:

```bash
# After fixing a bug
ginko log "Fixed authentication timeout by increasing JWT expiry from 1h to 24h. Root cause: mobile users kept getting logged out mid-session." \
  --category=fix --impact=high

# After making a decision
ginko log "Decided to use Tailwind instead of styled-components for better build performance and smaller bundle size." \
  --category=decision

# After discovering a pattern
ginko log "Pattern: Always validate user input on both client and server. Client validation improves UX, server validation ensures security." \
  --category=insight

# After completing a feature
ginko log "Completed user profile page with avatar upload, bio editing, and privacy controls. Tests passing." \
  --category=achievement --impact=medium
```

**Why log?**
- Builds searchable project memory
- Enables better AI collaboration
- Helps future you (and your team)
- Captures context at low pressure (before you forget!)

---

## Step 6: End Your Session

When you're done working:

```bash
ginko handoff "Completed user authentication flow. All tests passing. Next: Implement password reset via email."
```

**What this does:**
- Summarizes your session
- Archives session logs
- Syncs final events to knowledge graph
- Provides clean handoff for next session (you or teammate)

---

## Step 7: Visualize in the Dashboard

Open your browser to see your project's knowledge graph:

```
https://app.ginkoai.com
```

**You can:**
- Browse your logged insights and decisions
- Search semantically across your project knowledge
- View relationships between concepts
- Track project progress over time
- Share knowledge with your team

---

## Core Workflow (Repeat Daily)

```bash
# Morning: Start session
ginko start

# During work: Log insights (5-10 times per session)
ginko log "Discovered that caching API responses reduces load time by 60%" \
  --category=insight --impact=high

# Evening: Handoff
ginko handoff "Added API caching layer. Performance improved. Next: Add cache invalidation logic."
```

**That's it!** This simple workflow keeps AI in sync and builds valuable project memory.

---

## What's Next?

### Advanced Features

**Create Epics and Sprints:**
```bash
# Plan larger initiatives with AI guidance
ginko epic

# This creates structured sprints with tasks
# See: docs/epics/ and docs/sprints/
```

**Search Your Knowledge:**
```bash
# Semantic search across your logs
ginko knowledge search "authentication patterns"

# Find specific decisions
ginko knowledge search "why did we choose postgres" --type ADR
```

**Team Collaboration:**
- Multiple team members can run `ginko start` in the same repo
- Sessions are isolated but knowledge is shared
- Dashboard shows team-wide activity

### Learn More

- **[User Guide](./USER-GUIDE.md)** - Complete feature documentation
- **[CLI Reference](./CLI-REFERENCE.md)** - All commands and options
- **[Dashboard Guide](./DASHBOARD-GUIDE.md)** - Web UI features

---

## Troubleshooting

### "Authentication failed"

**Solution:** Regenerate your API key:
```bash
ginko login --force
```

### "ginko start hangs or takes too long"

**Expected:** First start may take 5-10 seconds (graph initialization)
**After that:** Should be < 2 seconds

**If still slow:**
```bash
# Check for issues
ginko status --verbose

# Clear session cache
rm -rf .ginko/sessions/*/cache/
```

### "Command not found: ginko"

**Solution:** Add npm global bin to PATH:
```bash
npm config get prefix  # Shows npm global directory
export PATH="$(npm config get prefix)/bin:$PATH"

# Add to your shell profile (.bashrc, .zshrc, etc.)
echo 'export PATH="$(npm config get prefix)/bin:$PATH"' >> ~/.zshrc
```

### "No active project" or graph errors

**Solution:** Reinitialize the graph:
```bash
ginko graph init --force
```

### Session logs not appearing in dashboard

**Expected delay:** Up to 30 seconds for event sync

**If still missing:**
```bash
# Check sync status
ginko status

# Manually trigger sync
ginko sync --force
```

---

## Getting Help

- **Documentation:** https://docs.ginkoai.com
- **GitHub Issues:** https://github.com/chrispangg/ginko/issues
- **Discord:** https://discord.gg/ginko
- **Email:** chris@watchhill.ai

---

**Congratulations!** You're ready to ship with AI. Start your next session with `ginko start` and experience collaborative development at full speed.

Next: Check out the [User Guide](./USER-GUIDE.md) for advanced features like epic planning, semantic search, and team collaboration workflows.
