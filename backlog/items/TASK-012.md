---
id: TASK-012
type: task
title: Team Collaboration Features
parent:
  - FEATURE-024-configuration-and-reference-system
status: todo
priority: medium
created: '2025-10-22T00:00:00.000Z'
updated: '2025-10-22T00:00:00.000Z'
effort: 2 hours
tags: [collaboration, team-awareness, session-logs, visibility]
sprint: SPRINT-2025-10-22-configuration-system
size: S
author: chris@watchhill.ai
---

# Team Collaboration Features

## Description

Leverage user-namespaced session logs to enable team visibility and collaboration awareness.

**Goal**: Provide 100% visibility into teammate activity to enable coordination and prevent duplicate work.

## Checklist

- [ ] Verify user-namespaced session logs work team-wide
- [ ] Create `ginko team` command to show active teammates
- [ ] Implement `ginko team <user>` to view teammate's current session
- [ ] Add teammate activity summary (files, tasks, recent events)
- [ ] Create team coordination helpers (who's working on what)
- [ ] Add team timeline view (all logged events chronologically)
- [ ] Write documentation on team collaboration patterns
- [ ] Add examples showing coordination workflows
- [ ] Test with multiple users in same repo
- [ ] Verify no git conflicts with parallel sessions

## Technical Implementation

**File Locations**:
- `packages/cli/src/commands/team.ts` (new)
- `packages/cli/src/utils/team-awareness.ts` (new)

**Team Command**:

```bash
# List active team members
$ ginko team
Active team members (last 24h):
  • xtophr@gmail.com (2h ago) - Working on TASK-009
  • alice@company.com (30m ago) - Working on TASK-011

# View teammate's session
$ ginko team alice@company.com
Alice's Current Session:
  Started: 2025-10-22 14:00
  Branch: feature/task-011
  Active: 30m ago

  Recent Events:
  14:30 [feature] Implemented ContextLoader class (TASK-011)
  15:00 [decision] Chose depth-first traversal for reference following
  15:15 [git] Committed progressive loading foundation

  Files Modified (5):
  • packages/cli/src/utils/context-loader.ts
  • packages/cli/src/commands/start/start-with-synthesis.ts
  ...
```

**Team Awareness**:

```typescript
interface TeamMember {
  email: string;
  slug: string;
  lastActive: Date;
  currentTask?: string;
  branch?: string;
  recentEvents: LogEntry[];
  filesModified: string[];
}

export async function getActiveTeamMembers(): Promise<TeamMember[]> {
  const sessionsDir = await resolveProjectPath('.ginko/sessions');
  const users = await fs.readdir(sessionsDir);

  const members: TeamMember[] = [];

  for (const userSlug of users) {
    const sessionLog = await SessionLogManager.loadSessionLog(
      path.join(sessionsDir, userSlug)
    );

    if (!sessionLog) continue;

    const metadata = SessionLogManager.parseMetadata(sessionLog);
    const lastEvent = getLastEventTime(sessionLog);

    // Only include members active in last 24h
    if (isWithin24Hours(lastEvent)) {
      members.push({
        email: metadata.user,
        slug: userSlug,
        lastActive: lastEvent,
        currentTask: extractCurrentTask(sessionLog),
        branch: metadata.branch,
        recentEvents: getRecentEvents(sessionLog),
        filesModified: getFilesModified(sessionLog)
      });
    }
  }

  return members.sort((a, b) =>
    b.lastActive.getTime() - a.lastActive.getTime()
  );
}
```

## Acceptance Criteria

- `ginko team` shows all active team members
- `ginko team <user>` displays detailed session info
- Team member data refreshes from their session logs
- No git conflicts when multiple users log simultaneously
- User privacy respected (only show what's in tracked logs)
- Performance acceptable with 10+ team members

## Notes

- User-namespaced directories prevent git conflicts naturally
- Session logs become team infrastructure, not just individual memory
- This enables coordination: "Oh, Alice is already working on that"
- Related to ADR-037 Phase 4
- Privacy consideration: all session data is already git-tracked, so no new exposure

## Dependencies

- TASK-009 (config foundation)
- TASK-010 (reference extraction for showing task context)

## Related

- **PRD**: PRD-009
- **ADR**: ADR-037
- **Parent**: FEATURE-024
- **Depends**: TASK-009, TASK-010
