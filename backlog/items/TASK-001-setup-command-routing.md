---
id: TASK-001
type: task
title: Set Up Command Routing Infrastructure
parent: STORY-001
status: PROPOSED
priority: CRITICAL
created: 2025-09-10
updated: 2025-09-10
effort: 2
tags: [infrastructure, cli, setup]
sprint: 2025-09-week-2
---

# Set Up Command Routing Infrastructure

## Description
Create the base command structure for `ginko backlog` with subcommands for create, list, update, and show.

## Checklist
- [ ] Create packages/cli/src/commands/backlog/ directory
- [ ] Implement BacklogCommand base class
- [ ] Set up commander.js routing for subcommands
- [ ] Add help text for backlog command group
- [ ] Wire up to main CLI entry point

## Technical Details
```typescript
// packages/cli/src/commands/backlog/index.ts
export class BacklogCommand extends Command {
  name = 'backlog';
  description = 'Manage git-native backlog items';
  
  subcommands = [
    CreateCommand,
    ListCommand,
    UpdateCommand,
    ShowCommand
  ];
}
```

## Notes
- Follow existing command patterns in codebase
- Ensure proper error handling
- Add debug logging for troubleshooting