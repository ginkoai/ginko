# Backlog Index

> A git-native backlog system. Just markdown files, no database required.

## Quick Stats
- **Total Items**: 9 features
- **In Progress**: 3
- **Completed**: 2
- **Proposed**: 4

## 🔴 CRITICAL Priority

### In Progress
- [FEATURE-020](items/FEATURE-020-git-native-backlog.md): Git-Native Backlog Management
  - Creating the system you're using right now
- [FEATURE-012](items/FEATURE-012-browser-extension.md): Ginko Browser Extension for Claude.ai
  - Bridge for 95% of users who work in browser

### Proposed
- [FEATURE-018](items/FEATURE-018-handoff-auto-capture.md): Enhanced Handoff with Automatic Context Capture
  - Zero-friction learning preservation during handoffs
- [FEATURE-017](items/FEATURE-017-persistent-context-modules.md): Persistent Context Module System
  - AI memory cards for cross-session knowledge
- [FEATURE-015](items/FEATURE-015-slash-command-handoff.md): Slash Command Handoff System
  - Frictionless `/handoff` and `/start` commands
- [FEATURE-010](items/FEATURE-010-database-recovery.md): Database Failure Recovery & Monitoring
  - Automatic recovery with zero data loss

### Completed ✅
- [FEATURE-019](items/FEATURE-019-context-reflexes-value.md): Enhanced Context Reflexes with Value Focus
  - Completed 2025-09-10
- [FEATURE-014](items/FEATURE-014-intelligent-statusline.md): Intelligent Statusline via Hook Integration
  - Completed 2025-08-19 - Real-time coaching based on patterns

## 🟡 HIGH Priority

### In Progress
- [FEATURE-009](items/FEATURE-009-coaching-dashboard.md): Collaboration Coaching Dashboard
  - Backend complete, frontend pending at app.ginko.ai

## 🟢 MEDIUM Priority
*No items migrated yet*

## 🔵 LOW Priority
*No items migrated yet*

---

## Quick Commands

### For Humans
```bash
# See all work
ls backlog/items/

# Find critical items
grep -l "priority: CRITICAL" backlog/items/*.md

# Check in-progress work
grep -l "status: IN_PROGRESS" backlog/items/*.md

# Search by topic
grep -l "handoff" backlog/items/*.md
```

### For AI (Coming Soon)
```bash
# Natural language interface
ginko "what's critical and blocked?"
ginko "create task for fixing login"
ginko "ship it"

# Progressive shortcuts
ginko feature "OAuth support"  # or just 'gf'
ginko task "Update deps"        # or just 'gt'
```

### Templates
- [Epic Template](templates/epic.md)
- [Feature Template](templates/feature.md)
- [Story Template](templates/story.md)
- [Task Template](templates/task.md)

---

## Migration Progress
Successfully migrated 9 high-priority features from the monolithic BACKLOG.md. Each feature is now its own file, preventing token limits and enabling parallel work. The archive (BACKLOG.md.archive) contains ~15 more features that can be migrated as needed.

### Benefits Already Visible
- ✅ No more token limit errors
- ✅ Each file under 2KB (vs 110KB monolith)
- ✅ Git tracks individual feature history
- ✅ Multiple devs can work without conflicts
- ✅ AI can process entire backlog efficiently

---

*Last Updated: 2025-09-10*