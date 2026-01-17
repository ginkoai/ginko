/**
 * @fileType: guide
 * @status: current
 * @updated: 2026-01-17
 * @tags: [faq, questions, documentation, beta, onboarding]
 * @related: [QUICK-START.md, TROUBLESHOOTING.md, BETA-README.md, USER-GUIDE.md]
 * @priority: high
 * @complexity: low
 */

# Frequently Asked Questions

Common questions about Ginko, the AI collaboration platform for development teams. For technical issues, see the [Troubleshooting Guide](./TROUBLESHOOTING.md).

---

## General Questions

### What is Ginko?

Ginko is a git-native CLI and dashboard that helps developers collaborate more effectively with AI. It solves the problem of context loss by:

- Capturing insights and decisions as you work
- Building a searchable knowledge graph
- Enabling seamless handoffs between sessions
- Providing team visibility into project progress

Think of it as "memory for AI-assisted development."

### Who is Ginko for?

Ginko is built for:

- **Individual developers** using AI coding assistants (Claude, Copilot, etc.)
- **Development teams** wanting to preserve institutional knowledge
- **Tech leads** who want visibility into project decisions and progress
- **Open source maintainers** documenting project evolution

### How is Ginko different from other tools?

| Tool | Focus | Ginko Difference |
|------|-------|------------------|
| Notion/Confluence | Static documentation | Ginko captures in-the-moment context, not after-the-fact docs |
| GitHub Issues | Task tracking | Ginko captures the "why" behind decisions, not just "what" |
| ADR tools | Architecture decisions | Ginko includes patterns, gotchas, insights, and session context |
| Note-taking apps | Personal notes | Ginko is designed for AI + human collaboration |

### Is Ginko free?

**During beta**: Yes, Ginko is free for all beta users.

**After launch**: We'll have a generous free tier for individual developers and small projects. Team features and larger projects will have paid plans. Beta users will receive preferred pricing.

---

## Data and Privacy

### Where is my data stored?

Your data lives in two places:

1. **Local files** - `.ginko/` directory in your project (git-ignored)
   - Session logs
   - Event streams
   - Configuration

2. **Cloud graph** - Neo4j Aura database
   - Knowledge nodes (ADRs, patterns, insights)
   - Relationships and embeddings
   - Team and project metadata

### Is my code sent to Ginko servers?

**No.** Ginko does not upload, read, or analyze your source code. We only store:

- Knowledge you explicitly log (`ginko log`)
- Session summaries you create (`ginko handoff`)
- Metadata like timestamps and file references

Your code stays local and in your git repository.

### Who can see my data?

- **Private projects**: Only you and team members you explicitly invite
- **Public projects**: Anyone can discover and read (but not edit)
- **Ginko team**: We have database access for support but don't read your content without consent

### How do I delete my data?

```bash
# Delete local data
rm -rf .ginko/

# Delete cloud data
# Coming soon: ginko project delete
# For now: Email chris@watchhill.ai for account deletion
```

### Is my data backed up?

Yes. We run daily automated backups of the Neo4j database. Your data is encrypted at rest and in transit.

### Can I export my data?

Export functionality is coming soon:

```bash
# Coming soon
ginko export --format json
ginko export --format markdown
```

For now, your local `.ginko/` directory contains your session data in readable formats.

---

## CLI Usage

### Do I need internet to use Ginko?

**Partially.** The CLI works in two modes:

- **Online**: Full functionality - logging, sync, search
- **Offline**: Session logging works locally; sync when connected

Most daily workflows work offline. You'll need internet for:
- Initial authentication (`ginko login`)
- Syncing to dashboard (`ginko sync`)
- Semantic search (`ginko graph query`)

### How do I start each day?

Simple daily workflow:

```bash
ginko start           # Load context (< 2 seconds)
# ... work and log insights ...
ginko handoff "Done for today. Next: finish auth flow"
```

### How often should I log?

**Target: 5-10 logs per significant work session**

Log when you:
- Fix a bug (include root cause)
- Make a decision (include reasoning)
- Discover a pattern or gotcha
- Complete a feature
- Hit a blocker

Quality matters more than quantity. One detailed log is better than five vague ones.

### What's the difference between "ginko log" and "ginko handoff"?

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `ginko log` | Capture in-the-moment insight | During work |
| `ginko handoff` | Summarize session, archive | End of session |

Think of `log` as continuous notes and `handoff` as the session summary.

### Can I use Ginko without the dashboard?

Yes! The CLI is fully functional standalone. The dashboard adds:
- Visual knowledge graph exploration
- Semantic search interface
- Team activity visibility
- Sprint and task tracking

Many users primarily use CLI and occasionally check the dashboard.

---

## Team Features

### How do I add teammates?

```bash
# Add member to project
ginko project add-member proj_abc123 alice@example.com --role editor

# Or create a team and add to project
ginko team create engineering
ginko team add-member team_abc123 alice@example.com
ginko team add-to-project team_abc123 proj_abc123 --role editor
```

### What roles are available?

| Role | Can View | Can Edit | Can Manage |
|------|----------|----------|------------|
| Viewer | Yes | No | No |
| Editor | Yes | Yes | No |
| Owner | Yes | Yes | Yes |

### Do teammates see my session logs?

Teammates see:
- High-impact events you log (visible in dashboard)
- Knowledge nodes you create
- Handoff summaries

They don't see:
- Your real-time session activity
- Draft logs before sync
- Your local `.ginko/` files

### How do I share context with my team?

1. **Log insights** - Use `ginko log` with meaningful context
2. **Create handoffs** - End sessions with `ginko handoff`
3. **Sync regularly** - `ginko sync` pushes to shared graph
4. **Use dashboard** - Team can browse shared knowledge

---

## Dashboard

### How do I access the dashboard?

Visit https://app.ginkoai.com and sign in with GitHub (same account as CLI).

### What can I do in the dashboard?

- **Graph Explorer**: Browse and search your knowledge graph
- **Focus Page**: View sprint progress and assigned tasks
- **Coaching**: See collaboration insights and patterns (demo mode available)
- **Node Details**: View relationships and edit nodes

### Why don't I see my recent logs in the dashboard?

Events sync to the dashboard with up to 30-second delay. If logs still don't appear:

```bash
# Force sync
ginko sync --force

# Hard refresh dashboard
Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows)
```

### Can I edit knowledge in the dashboard?

Yes! You can edit nodes in the dashboard, then pull changes to local files:

```bash
ginko sync
# Pulls dashboard edits to local markdown files
```

---

## Sprints and Tasks

### How do I create sprints?

Sprints are created through the epic planning flow:

```bash
ginko epic
# AI-guided conversation to create epic with sprints
```

Or manually create sprint files in `docs/sprints/`.

### How do I track task progress?

Update task status in sprint markdown files:

```markdown
- [ ] Pending task
- [@] In progress task
- [x] Completed task
- [Z] Paused/blocked task
```

The dashboard reads these markers to show progress.

### How do I assign tasks?

```bash
# Assign single task
ginko assign e008_s04_t01 alice@example.com

# Assign all tasks in sprint
ginko assign --sprint e008_s04 --all alice@example.com
```

---

## Technical Questions

### What's in the .ginko directory?

```
.ginko/
├── config.json           # Project configuration
├── sessions/
│   └── [username]/
│       ├── current-session-log.md    # Current session markdown
│       ├── current-events.jsonl      # Event stream (line-delimited JSON)
│       ├── cursors.json              # Session cursor position
│       └── archive/                  # Archived sessions
```

### Should I commit .ginko to git?

**No.** The `.ginko/` directory is git-ignored by default. It contains:
- Session-specific data
- Cursor positions
- User-specific logs

The shared knowledge lives in your cloud graph and local `docs/` directory.

### What API does Ginko use?

Ginko uses:
- **Neo4j Aura** for graph database
- **Voyage AI** for vector embeddings
- **GitHub OAuth** for authentication
- **Next.js API routes** for the backend

### Can I self-host Ginko?

Not yet. Self-hosting options are on our roadmap for enterprise customers.

### What's the rate limit?

Beta users have generous limits:
- API calls: 1000/hour
- Log events: 100/minute
- Sync operations: 60/hour

You're unlikely to hit these in normal usage.

---

## Beta Program

### What does "beta" mean?

Beta means:
- Core features are stable and usable
- Some features are still in development
- You may encounter bugs (please report them!)
- Your feedback directly shapes the product

Beta does NOT mean:
- Your data is at risk (it's backed up)
- Features will break without warning
- You're on your own (we provide support)

### How do I report bugs?

1. **GitHub Issues** (preferred): https://github.com/chrispangg/ginko/issues
2. **Email**: chris@watchhill.ai
3. **Discord**: https://discord.gg/ginko

Include: what you did, what happened, what you expected, CLI version.

### How do I request features?

Open a GitHub issue with `[Feature Request]` in the title, or share in Discord.

### When will Ginko leave beta?

We're targeting Q2 2026 for general availability. Beta users will be notified with migration details (spoiler: there's no migration needed).

### What happens to my data after beta?

Nothing changes. Your data persists, your account continues, and beta users receive grandfathered pricing.

---

## Troubleshooting Quick Reference

| Issue | Quick Fix |
|-------|-----------|
| "Command not found" | Add npm bin to PATH |
| "Authentication failed" | `ginko login --force` |
| "ginko start" slow | First run is slower; subsequent < 2s |
| Logs not in dashboard | `ginko sync --force` |
| Dashboard blank | Hard refresh (Cmd+Shift+R) |
| Search returns nothing | Lower threshold, try different query |

For detailed solutions, see the [Troubleshooting Guide](./TROUBLESHOOTING.md).

---

## Getting More Help

- **Documentation**: https://docs.ginkoai.com
- **Discord Community**: https://discord.gg/ginko
- **GitHub Issues**: https://github.com/chrispangg/ginko/issues
- **Email Support**: chris@watchhill.ai

---

*Last updated: 2026-01-17*
*Beta version: 1.5.x*
