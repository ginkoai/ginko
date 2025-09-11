---
id: STORY-001
type: story
title: Basic Command Structure for Backlog Management
parent: FEATURE-021
status: PROPOSED
priority: CRITICAL
created: 2025-09-10
updated: 2025-09-10
effort: 3
children: [TASK-001, TASK-002, TASK-003, TASK-004]
tags: [cli, commands, backlog, crud]
sprint: 2025-09-week-2
---

# Basic Command Structure for Backlog Management

## User Story
As a developer
I want to manage backlog items through simple CLI commands
So that I can track work without leaving my terminal

## Acceptance Criteria
- [ ] `ginko backlog create [type] [description]` creates new items
- [ ] `ginko backlog list [filters]` shows items with optional filtering
- [ ] `ginko backlog update [id] --status=[status]` updates item status
- [ ] `ginko backlog show [id]` displays full item details
- [ ] All commands work with the flat file structure

## Tasks
- [ ] TASK-001: Set up command routing infrastructure
- [ ] TASK-002: Implement create command with templates
- [ ] TASK-003: Implement list command with filters
- [ ] TASK-004: Implement update and show commands

## Technical Notes
- Commands in packages/cli/src/commands/backlog/
- Use existing file I/O utilities
- Parse frontmatter with gray-matter
- Generate IDs by scanning existing files
- Update index.md after modifications

## Definition of Done
- [ ] All commands working with file system
- [ ] Tests passing for each command
- [ ] Help text clear and useful
- [ ] Error messages helpful
- [ ] Files maintain valid frontmatter