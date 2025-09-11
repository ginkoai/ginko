---
id: STORY-003
type: story
title: Progressive Shortcuts and Aliases
parent: FEATURE-021
status: PROPOSED
priority: HIGH
created: 2025-09-10
updated: 2025-09-10
effort: 2
children: [TASK-009, TASK-010, TASK-011]
tags: [shortcuts, aliases, ux, developer-experience]
sprint: 2025-09-week-3
---

# Progressive Shortcuts and Aliases

## User Story
As a power user
I want progressively shorter commands as I gain expertise
So that I can work at the speed of thought

## Acceptance Criteria
- [ ] `ginko feature "desc"` shortcut for create feature
- [ ] `gf "desc"` alias for even faster access
- [ ] `ginko /` opens command palette
- [ ] `ginko ship` creates PR with one command
- [ ] Tab completion for all commands

## Tasks
- [ ] TASK-009: Implement command shortcuts (feature/story/task/epic)
- [ ] TASK-010: Create shell aliases (gf/gs/gt/ge)
- [ ] TASK-011: Add interactive command palette

## Technical Notes
- Register shortcuts in CLI commander
- Shell aliases in package.json bin section
- Command palette using inquirer.js
- Tab completion via tabtab package
- Document progression in help text

## Progressive Mastery Path
```
Day 1:    ginko backlog create feature "OAuth"
Week 1:   ginko feature "OAuth"
Week 2:   gf "OAuth"
Month 1:  ginko "OAuth"
Expert:   ginko / → f → OAuth
```

## Definition of Done
- [ ] All shortcuts working
- [ ] Aliases installed globally
- [ ] Command palette interactive
- [ ] Tab completion functional
- [ ] Help shows progression path