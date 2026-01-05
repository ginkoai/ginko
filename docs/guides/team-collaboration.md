# Team Collaboration Guide

Ginko enables team collaboration through shared knowledge graphs. Team members can share patterns, ADRs, gotchas, and insights while maintaining individual session privacy.

## Overview

**Key Concepts:**
- **Teams** - Groups of collaborators who share a knowledge graph
- **Roles** - Owner, admin, or member permissions
- **Sync** - Pull dashboard edits to local git files
- **Staleness** - Warning when team context is out of date

**Privacy Model:**
- Session logs remain private (per-user)
- Knowledge nodes (ADRs, patterns, gotchas) are shared
- Activity events are visible to team members
- Code never leaves your machine

## Quick Start

### For Project Owners

```bash
# 1. Authenticate with Ginko
ginko login

# 2. Create a team
ginko teams create my-team

# 3. Initialize graph for your project
ginko graph init

# 4. Invite collaborators
ginko invite alice@example.com
ginko invite bob@example.com --role admin

# 5. Share the invite codes with your team
```

### For New Team Members

```bash
# 1. Authenticate with Ginko
ginko login

# 2. Join the team (code from your invite)
ginko join a1b2c3d4

# 3. Start working - context loads automatically
ginko start
```

**Expected onboarding time: ~10 minutes**

## Command Reference

### `ginko invite` - Invite Team Members

Invite collaborators to join your team.

```bash
# Basic invite (as member)
ginko invite user@example.com

# Invite as admin
ginko invite user@example.com --role admin

# Invite as owner
ginko invite user@example.com --role owner

# List pending invitations
ginko invite --list

# Revoke an invitation
ginko invite --revoke <code>
```

**Options:**
| Option | Description |
|--------|-------------|
| `--team <id>` | Team to invite to (defaults to your first team) |
| `--role <role>` | Role: `owner`, `admin`, `member` (default: member) |
| `--list` | List pending invitations |
| `--revoke <code>` | Cancel an invitation |

### `ginko join` - Join a Team

Accept an invitation to join a team.

```bash
# Join with invite code
ginko join a1b2c3d4

# Skip confirmation prompt
ginko join a1b2c3d4 --yes

# Interactive mode (prompts for code)
ginko join
```

**What happens when you join:**
1. Validates the invitation code
2. Adds you to the team with assigned role
3. Automatically syncs team context (patterns, ADRs, gotchas)
4. Shows welcome message with project summary

### `ginko teams` - Manage Teams

Create and manage teams for collaborative knowledge graphs.

```bash
# Create a team
ginko teams create engineering

# List your teams
ginko teams list

# Add a member by GitHub username
ginko teams add-member engineering alice --role member

# Remove a member
ginko teams remove-member engineering alice

# List team members
ginko teams list-members engineering

# Grant team access to a project
ginko teams add-to-project engineering my-app

# Revoke team access
ginko teams remove-from-project engineering my-app
```

**Subcommands:**
| Command | Description |
|---------|-------------|
| `create <name>` | Create a new team |
| `list` | List your teams |
| `add-member <team> <user>` | Add member by GitHub username |
| `remove-member <team> <user>` | Remove a team member |
| `list-members <team>` | List all team members |
| `add-to-project <team> <project>` | Grant team access to project |
| `remove-from-project <team> <project>` | Revoke team access |

### `ginko sync` - Sync Dashboard Edits

Pull knowledge edits from the dashboard to local git files.

```bash
# Sync all unsynced changes
ginko sync

# Preview changes without applying
ginko sync --dry-run

# Sync only specific node types
ginko sync --type ADR
ginko sync --type Pattern

# Force overwrite local files
ginko sync --force

# Sync without committing
ginko sync --no-commit

# Preview team activity
ginko sync --preview
```

**Options:**
| Option | Description |
|--------|-------------|
| `--dry-run` | Preview what would be synced |
| `--force` | Overwrite local files with graph versions |
| `--type <type>` | Sync only: ADR, PRD, Pattern, Gotcha, Charter, Sprint |
| `--no-commit` | Sync files but don't auto-commit |
| `--preview` | Preview team changes |

**Supported node types:** ADR, PRD, Pattern, Gotcha, Charter, Sprint

## Roles and Permissions

| Capability | Owner | Admin | Member |
|------------|-------|-------|--------|
| View team knowledge | Yes | Yes | Yes |
| Edit knowledge nodes | Yes | Yes | Yes |
| Sync from dashboard | Yes | Yes | Yes |
| View team activity | Yes | Yes | Yes |
| View member insights | Yes | Yes | Own only |
| Invite new members | Yes | Yes | No |
| Manage member roles | Yes | Yes | No |
| Remove members | Yes | No | No |
| Delete team | Yes | No | No |

## Staleness and Freshness

Ginko tracks when you last synced team context. Stale context means you might be missing important team knowledge.

**Staleness warnings on `ginko start`:**

```
🚨 Team context is critically stale
   Never synced - team context not loaded

   Run `ginko sync` to pull team updates.
```

**Thresholds:**
- **Critical** (never synced or >7 days): Red warning, auto-sync recommended
- **Warning** (1-7 days): Yellow warning, sync suggested
- **Fresh** (<1 day): No warning

**Best practice:** Run `ginko sync` at the start of each work session to ensure you have the latest team knowledge.

## Workflow Examples

### Owner: Setting Up a New Project

```bash
# Initialize project
ginko init
ginko charter                    # Create project charter

# Set up team collaboration
ginko login
ginko teams create my-team
ginko graph init                 # Initialize knowledge graph

# Invite team
ginko invite alice@example.com --role admin
ginko invite bob@example.com
ginko invite carol@example.com

# Share invite codes via Slack/email
```

### Member: Joining and Starting Work

```bash
# Join the team
ginko login
ginko join a1b2c3d4              # Uses invite code

# Start working (context loads automatically)
ginko start

# Your first session will show:
# "Welcome to [Project]! Here's what you need to know..."
```

### Daily Workflow

```bash
# Start of day - sync team context
ginko start                      # Auto-warns if stale
ginko sync                       # Pull latest team knowledge

# During work - your sessions stay private
ginko log "Fixed auth bug"       # Logged to your session

# Discoveries become shared knowledge
# Edit patterns/gotchas in dashboard → teammates see on next sync
```

### Concurrent Editing

When multiple team members edit the same knowledge node:

1. **Dashboard edits** are tracked with timestamps
2. **Sync pulls** the latest version
3. **Conflicts** are resolved by last-write-wins (with warning)
4. **Best practice:** Communicate before major edits

## Team Activity and Insights

### Viewing Team Activity

Owners can view team member activity in the dashboard:

1. Go to **Insights** page
2. Use the **Member** dropdown to select a team member
3. View their collaboration metrics, patterns discovered, etc.

Members can only view their own insights.

### What's Shared vs. Private

**Shared (visible to team):**
- Knowledge nodes (ADRs, patterns, gotchas, PRDs)
- Activity events (what was worked on, not details)
- Sprint progress
- Team insights aggregate

**Private (per-user only):**
- Session logs (detailed work notes)
- Personal handoff documents
- Uncommitted code changes

## Troubleshooting

### "Team context is critically stale"

```bash
ginko sync  # Pull latest team knowledge
```

### "Invalid invite code"

- Check the code was copied correctly
- Ask the inviter to run `ginko invite --list` to verify
- Code may have been revoked - request a new one

### "Permission denied"

- Verify you're authenticated: `ginko login`
- Check your role: ask team owner for appropriate permissions
- For owner-only actions, contact the team owner

### "Sync conflicts"

When local and remote versions differ:

```bash
# Preview what would change
ginko sync --dry-run

# Force remote version (overwrites local)
ginko sync --force

# Or keep local, skip sync
# (edit in dashboard will sync next time)
```

## Best Practices

1. **Sync at session start** - Run `ginko sync` before `ginko start` to ensure fresh context

2. **Log discoveries** - Use `ginko log` for insights that help teammates:
   ```bash
   ginko log "Found race condition in auth flow - mutex needed" --category=gotcha
   ```

3. **Communicate before major edits** - Let teammates know before refactoring shared ADRs or patterns

4. **Use meaningful commit messages** - Sync auto-commits with descriptive messages

5. **Check staleness warnings** - Don't ignore them; stale context leads to repeated work

## See Also

- [Quick Start Guide](./QUICK-START.md)
- [Dashboard Guide](./DASHBOARD.md)
- [Knowledge Editing Guide](./KNOWLEDGE-EDITING.md)
- [CLI Reference](./CLI-REFERENCE.md)
