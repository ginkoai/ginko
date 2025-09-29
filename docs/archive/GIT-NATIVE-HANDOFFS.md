# Git-Native Session Handoffs

> Transform AI sessions from ephemeral conversations into permanent team knowledge

## Quick Start (2 Minutes)

```bash
# 1. Your handoff is automatically saved to:
.ginko/[your-email-directory]/session-handoff.md

# 2. Open in your editor (handles hidden folder):
./ginko handoff

# 3. Commit when ready:
git add .ginko/
git commit -m "Session: implemented git-native handoffs"
```

### Hidden Folder Note
The `.ginko` folder is hidden by default (starts with dot). To view it:
- **macOS Finder**: Press `Cmd+Shift+.`
- **Windows Explorer**: View → Show → Hidden items
- **Linux**: Most file managers show hidden files with `Ctrl+H`
- **Terminal**: Use `ls -la` to see all files

Or simply use `./ginko handoff` to open directly in your editor!

That's it! Your AI session is now part of your project's permanent history.

## How It Works

### Automatic User Identification

Ginko uses your git configuration to create a personal handoff directory:

```bash
# Your git email
chris@ginko.ai

# Becomes your directory
.ginko/chris-at-ginko-ai/
```

This ensures unique directories even across different email domains.

### Directory Structure

```
.ginko/
├── config.yml                         # Configuration
├── bin/                              # Ginko scripts
│   ├── ginko                     # Main CLI
│   └── open-handoff.sh              # Editor launcher
├── sessions/                         # All user sessions
│   └── chris-at-ginko-ai/       # Your personal directory
│       ├── session-handoff.md       # Current session
│       └── archive/                  # Historical sessions
├── templates/                        # Handoff templates
└── .gitignore                        # Protects secrets
```

### The Workflow

1. **Claude writes** → `.ginko/[you]/session-handoff.md`
2. **You review** → Open in your favorite editor
3. **You edit** → Refine, add notes, correct details
4. **You commit** → `git add .ginko/ && git commit`
5. **Team sees** → Handoff in git history

## Key Benefits

### For You
- 📝 **Review before committing** - Edit handoffs in your preferred editor
- 🔒 **Private until ready** - Commit when you want to share
- 📚 **Searchable history** - `git log .ginko/` shows all sessions
- 🏠 **Works offline** - No server dependency

### For Your Team  
- 👥 **Learn from sessions** - See how problems were solved
- 🔍 **Git integration** - Handoffs in PRs, blame, history
- 📈 **Knowledge accumulation** - Team wisdom grows over time
- 🎯 **Context in commits** - Understand the "why" behind changes

## Common Commands

```bash
# Open handoff in your editor (handles hidden folder)
./ginko handoff

# Check handoff status
./ginko status

# Archive current handoff  
./ginko archive

# View your current handoff (terminal)
cat .ginko/*/session-handoff.md

# See handoff history
git log --oneline .ginko/

# Find when something was discussed
git grep "authentication" .ginko/

# See who worked on what
ls -la .ginko/
```

## StatusLine Integration (Coming Soon)

Your statusline will show handoff state:
- `📝 Draft saved` - Handoff written but not committed
- `✏️ Editing` - You're reviewing/editing
- `⚠️ Uncommitted` - Reminder after 30 minutes
- `✅ Committed` - Safe in git

## Safety Features

### Automatic Secret Protection

The `.ginko/.gitignore` prevents accidental commits of:
- API keys and tokens
- Passwords and credentials  
- Private keys and certificates
- Database credentials

### File Size Warnings

Large handoffs (>50KB) trigger warnings to prevent repository bloat.

### No Merge Conflicts

Personal directories mean no conflicts between team members:
```
.ginko/chris-at-ginko-ai/    # Chris's handoffs
.ginko/alice-at-company-com/     # Alice's handoffs  
.ginko/bob-at-startup-io/        # Bob's handoffs
```

## FAQ

**Q: What if I switch branches?**  
A: Uncommitted handoffs show as changes. Commit or stash before switching.

**Q: Can I edit the handoff?**  
A: Yes! That's the point. Open in any editor and refine before committing.

**Q: What about sensitive information?**  
A: Review before committing. The .gitignore helps, but always check.

**Q: How do I share with my team?**  
A: Just commit and push. Handoffs become part of project history.

**Q: What if the server is down?**  
A: Everything works locally. Server sync is optional enhancement.

## Pro Tips

1. **Commit message includes session summary**:
   ```bash
   git commit -m "Session: fixed auth timeout bug
   
   See .ginko/chris-at-ginko-ai/session-handoff.md"
   ```

2. **Include handoffs in PRs**:
   - Reviewers see your AI collaboration context
   - Helps explain complex changes

3. **Search across sessions**:
   ```bash
   # Find all sessions about authentication
   git grep -l "auth" .ginko/*/archive/
   ```

4. **Template your handoffs** (coming soon):
   - bug-fix template
   - feature template  
   - refactor template

## The Philosophy

> "AI sessions are like code - they should be versioned, reviewed, and improved through your natural git workflow."

Instead of ephemeral conversations that disappear, your AI sessions become permanent team knowledge that lives alongside the code they helped create.

## Troubleshooting

**"Permission denied" when writing**
- Check directory permissions: `chmod 755 .ginko`

**"File not found" when reading**
- Ensure you're in the git repository root
- Check your email directory exists: `ls .ginko/`

**"Too many handoff files"**
- Archive old sessions: `mv session-handoff.md archive/$(date +%F).md`

## Next Steps

1. Try it now - Claude will write your next handoff to `.ginko/`
2. Review in your editor
3. Commit when ready
4. Share feedback on the experience

---

*Git-native handoffs: Because AI sessions are too valuable to lose.*