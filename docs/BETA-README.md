/**
 * @fileType: guide
 * @status: current
 * @updated: 2026-01-17
 * @tags: [beta, documentation, overview, onboarding, status]
 * @related: [QUICK-START.md, BETA-TESTING-CHECKLIST.md, PROJECT-CHARTER.md]
 * @priority: critical
 * @complexity: low
 */

# Ginko Beta Program

Welcome to the Ginko beta! You're among the first users to experience AI-native collaboration for development teams. This document provides everything you need to get started and make the most of your beta access.

---

## What is Ginko?

**Ginko is the AI collaboration platform where humans and AI ship together.**

We solve the problem of context loss in AI-assisted development by:

- **Capturing context continuously** - Log insights, decisions, and learnings as you work
- **Preserving knowledge across sessions** - Build a searchable memory that persists
- **Enabling team collaboration** - Share context with AI and team members seamlessly
- **Providing visibility** - Dashboard for project insights, progress, and team activity

---

## Beta Status Overview

### Current Version

```
CLI: @ginko/cli@beta (v1.5.x)
Dashboard: https://app.ginkoai.com
Status: Public Beta
```

### Feature Completeness

| Component | Status | Notes |
|-----------|--------|-------|
| **CLI Core** | Complete | Session management, logging, handoffs |
| **Authentication** | Complete | GitHub OAuth, API keys |
| **Knowledge Graph** | Complete | Neo4j-powered with vector search |
| **Session Logging** | Complete | Event-based context capture |
| **Dashboard** | Active Development | Graph explorer, focus page, coaching |
| **Team Features** | Beta | Basic team/project management |
| **Sync** | Complete | Bidirectional CLI/Dashboard sync |
| **Semantic Search** | Complete | Voyage AI embeddings |

### Stability Expectations

- **CLI**: Production-ready stability, tested across multiple projects
- **Dashboard**: Functional with ongoing improvements, some edge cases
- **API**: Stable endpoints, rate limiting in place
- **Data**: Your data is safe - regular backups to secure storage

---

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Git repository (recommended)
- GitHub account (for authentication)

### Quick Install

```bash
# Install the CLI
npm install -g @ginko/cli@beta

# Authenticate with GitHub
ginko login

# Initialize your project
cd /path/to/your/project
ginko init

# Start your first session
ginko start
```

### First Session

After `ginko start`, you'll see a status display showing your project context. From there:

1. **Work normally** - Use your editor, run commands, write code
2. **Log insights** - `ginko log "Discovered caching reduces load time by 60%"`
3. **End with handoff** - `ginko handoff "Completed auth flow. Next: password reset"`

### Dashboard Access

Open https://app.ginkoai.com and sign in with GitHub to:

- View your knowledge graph
- Track sprint progress
- See team activity
- Search semantically across your project

---

## What's Working Well

These features are fully functional and battle-tested:

### CLI Commands

```bash
ginko login              # Authenticate with GitHub OAuth
ginko init               # Initialize project in current directory
ginko start              # Start a session (< 2s startup)
ginko log "message"      # Log insights with categories
ginko handoff "summary"  # End session with handoff
ginko sync               # Pull dashboard edits to local files
ginko status             # Show current session state
ginko whoami             # Display authentication status
```

### Session Logging

- Automatic session log creation at `.ginko/sessions/[user]/`
- Event streaming to knowledge graph
- Quality feedback on log entries (Excellent/Good/Needs improvement)
- Category and impact tracking

### Knowledge Graph

- Semantic search using `ginko graph query "your question"`
- Document exploration with `ginko graph explore <doc-id>`
- Graph health monitoring with `ginko graph status`

### Dashboard Features

- Tree explorer for project hierarchy
- Card grid with filtering and search
- Node detail panel with relationships
- Focus page for sprint tracking
- Coaching insights (demo mode available)

---

## Known Limitations

### Beta Constraints

| Issue | Status | Workaround |
|-------|--------|------------|
| First `ginko start` slower | Expected | Graph initialization takes 5-10s on first run |
| Dashboard SSR hydration | Improving | Refresh page if you see rendering issues |
| Large graph performance | Improving | Use filters to narrow visible nodes |
| Offline mode limited | Planned | CLI works offline; sync when connected |
| Mobile dashboard | Not started | Desktop browsers only for now |

### Not Yet Implemented

- Email/password authentication (GitHub only currently)
- Real-time collaboration features
- Advanced analytics and reporting
- Native IDE extensions
- Webhook integrations

### Edge Cases

- Very large sessions (1000+ events) may slow sync
- Special characters in node titles may cause display issues
- Concurrent edits to same node may require manual conflict resolution

---

## How to Report Bugs

We actively track and fix issues reported by beta users. Your feedback directly improves Ginko.

### Reporting via GitHub Issues

**Preferred method** - Create an issue at https://github.com/chrispangg/ginko/issues

**Use this template:**

```markdown
**Title:** [Brief description of the issue]
**Severity:** Critical / High / Medium / Low
**Category:** CLI | Dashboard | Authentication | Sync | Graph | Other

**Steps to Reproduce:**
1. [First step]
2. [Second step]
3. [What happened]

**Expected Result:**
[What should have happened]

**Actual Result:**
[What actually happened]

**Environment:**
- OS: [macOS/Linux/Windows]
- Browser: [Chrome/Firefox/Safari]
- CLI Version: [run `ginko --version`]
- Node Version: [run `node --version`]

**Screenshots/Logs:**
[Attach relevant screenshots or terminal output]
```

### Severity Guidelines

- **Critical**: Data loss, authentication failure, complete feature breakdown
- **High**: Core functionality impaired, significant workflow disruption
- **Medium**: Feature works but with issues, minor workflow disruption
- **Low**: Cosmetic issues, minor inconveniences, suggestions

### Quick Bug Report via CLI

```bash
# Include version info in your report
ginko --version
node --version

# Enable debug logging for detailed output
export GINKO_LOG_LEVEL=debug
ginko [command]  # Reproduce the issue
```

---

## Support Channels

### Primary Support

| Channel | Best For | Response Time |
|---------|----------|---------------|
| GitHub Issues | Bug reports, feature requests | 24-48 hours |
| Email | Private inquiries, account issues | 24 hours |
| Discord | Questions, community help | Real-time |

### Contact Information

- **GitHub Issues**: https://github.com/chrispangg/ginko/issues
- **Email**: chris@watchhill.ai
- **Discord**: https://discord.gg/ginko
- **Documentation**: https://docs.ginkoai.com

### Beta User Benefits

As a beta user, you get:

- Direct access to the development team
- Priority bug fixes
- Input on feature roadmap
- Early access to new features
- Grandfathered pricing when we launch

---

## Providing Feedback

### What We Want to Hear

- **Pain points** - What's frustrating or slow?
- **Missing features** - What would make Ginko indispensable?
- **Workflow friction** - Where do you have to work around Ginko?
- **Success stories** - What's working really well?

### How to Share Feedback

1. **Quick feedback**: Discord or email
2. **Feature requests**: GitHub issue with [Feature Request] prefix
3. **Detailed feedback**: Schedule a 15-min call with Chris

### Beta Feedback Survey

We send monthly surveys to beta users. Your responses help prioritize our roadmap.

---

## Data and Privacy

### Where Your Data Lives

- **Local files**: `.ginko/` directory in your project (git-ignored by default)
- **Cloud graph**: Neo4j Aura database (encrypted at rest)
- **Authentication**: GitHub OAuth tokens (never stored on our servers)

### Data Ownership

- You own all your data
- Export available via CLI (`ginko export` - coming soon)
- Delete your account anytime via dashboard settings

### Privacy Commitments

- We don't read your code or logs
- Telemetry is minimal and anonymous (command usage only)
- No data sharing with third parties
- Enterprise SSO and data residency options coming

---

## Roadmap Preview

### Coming Soon (Next 4-6 weeks)

- [ ] Node editing in dashboard
- [ ] Advanced team permissions
- [ ] Sprint progress visualization
- [ ] Improved coaching insights
- [ ] Export/import functionality

### On the Horizon (3-6 months)

- [ ] VS Code extension
- [ ] GitHub Actions integration
- [ ] Custom webhook support
- [ ] Team analytics dashboard
- [ ] Enterprise features (SSO, audit logs)

### Future Vision

- AI-powered code review integration
- Automated knowledge extraction from PRs
- Cross-project knowledge discovery
- Real-time collaboration features

---

## FAQ

**Q: Is my data safe during beta?**
A: Yes. We run daily backups and your data is encrypted at rest. Beta doesn't mean unstable storage.

**Q: Will my data migrate to the full release?**
A: Absolutely. No data loss or migration required.

**Q: What happens if I find a critical bug?**
A: Email chris@watchhill.ai directly. Critical issues get same-day attention.

**Q: Can I invite my team?**
A: Yes! Team features are part of beta. Share the install command with teammates.

**Q: Is there a usage limit?**
A: Beta has generous limits. We'll communicate clearly before any limits apply.

---

## Getting Help

If you're stuck:

1. Check the [Troubleshooting Guide](./guides/TROUBLESHOOTING.md)
2. Search [existing GitHub issues](https://github.com/chrispangg/ginko/issues)
3. Ask in Discord for community help
4. Email chris@watchhill.ai for direct support

---

## Thank You

You're helping shape the future of AI-assisted development. Your feedback, bug reports, and patience make Ginko better for everyone.

**Let's ship together.**

---

*Last updated: 2026-01-17*
*Beta version: 1.5.x*
