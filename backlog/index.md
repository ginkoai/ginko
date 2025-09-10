# Backlog Index

> A git-native backlog system. Just markdown files, no database required.

## Quick Stats
- **Total Items**: 4
- **In Progress**: 1
- **Completed**: 1
- **Proposed**: 2

## 🔴 CRITICAL Priority

### In Progress
- [FEATURE-020](items/FEATURE-020-git-native-backlog.md): Git-Native Backlog Management
  - Creating the system you're using right now

### Proposed
- [FEATURE-018](items/FEATURE-018-handoff-auto-capture.md): Enhanced Handoff with Automatic Context Capture
  - Zero-friction learning preservation during handoffs
- [FEATURE-017](items/FEATURE-017-persistent-context-modules.md): Persistent Context Module System
  - AI memory cards for cross-session knowledge

### Completed ✅
- [FEATURE-019](items/FEATURE-019-context-reflexes-value.md): Enhanced Context Reflexes with Value Focus
  - Completed 2025-09-10

## 🟡 HIGH Priority
*No items*

## 🟢 MEDIUM Priority
*No items*

## 🔵 LOW Priority
*No items*

---

## How to Use This Backlog

### For Humans
```bash
# See all work
ls backlog/items/

# Read a specific item
cat backlog/items/FEATURE-020-git-native-backlog.md

# Find items by topic
grep -l "auth" backlog/items/*.md

# Check what's in progress
grep -l "status: IN_PROGRESS" backlog/items/*.md
```

### For AI
```bash
# Create new item
ginko backlog create feature "Your feature description"

# List items
ginko backlog list --status=in_progress

# Update status
ginko backlog update FEATURE-020 --status=complete
```

### Templates
- [Epic Template](templates/epic.md)
- [Feature Template](templates/feature.md)
- [Story Template](templates/story.md)
- [Task Template](templates/task.md)

---

## Migration Note
This backlog system replaces the monolithic BACKLOG.md file. The original has been archived to BACKLOG.md.archive for reference. Each feature is now its own file in `backlog/items/`, making it easy to work with in git and preventing token limit issues in AI tools.

---

*Last Updated: 2025-09-10*