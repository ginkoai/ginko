# ADR-061: Task Assignment and Work Tracking Architecture

## Status
Proposed

## Date
2026-01-20

## Context

Ginko supports team collaboration where multiple users (humans and AI agents) work on shared epics and sprints. As the system matures, we need a clear model for:

1. **Task assignment** - Who is responsible for what work
2. **Personal workstreams** - Each user sees their own prioritized work
3. **Work tracking** - Ensuring all work is attributed and traceable
4. **Plan adherence** - Keeping work within the epic/sprint/task framework

### Guiding Principle: Plan the Work; Work the Plan

The epic → sprint → task hierarchy provides cognitive scaffolding for both human and AI collaborators. This structure captures:

- **Why**: Epic goals and success criteria
- **What**: Sprint deliverables and task definitions
- **How**: Acceptance criteria and implementation notes

When users stray too far or too long from the plan, context gets lost. Work completed incidentally during ad-hoc sessions may never be marked complete in the graph, breaking traceability.

**ginko should actively encourage working within the plan**, while accommodating necessary ad-hoc work through proper tracking.

### North Star: Maximizing Flow State

ginko's primary objective is **maximizing time spent in flow state**. All design decisions, including work tracking, must be evaluated against this north star.

**Acceptable tradeoffs:**
- Quick yes/no prompts at natural breakpoints (sprint start, task completion)
- These serve long-term flow by preserving context and traceability

**Unacceptable interruptions:**
- Nudging during rapid debugging sessions
- Interrupting conversational AI pair programming
- Breaking concentration during exploratory work

**Flow-aware nudging principles:**

| Context | Nudge Behavior |
|---------|----------------|
| Sprint start | Prompt for bulk assignment (natural breakpoint) |
| Task completion | Quick "mark complete?" is acceptable |
| Mid-debugging | Defer tracking prompts until resolution |
| Conversational flow | Batch tracking suggestions for session end |
| Exploratory work | Light touch; track at meaningful milestones |

The AI partner should sense when the user is in deep work and defer administrative prompts. Tracking can be reconciled at session end or natural pauses rather than interrupting flow.

**Heuristics for deferral:**
- Rapid file changes (debugging) → defer
- Back-and-forth conversation (pair programming) → defer
- Long pauses between actions → safe to prompt
- Explicit task transitions ("okay, that's fixed") → safe to prompt
- Session end / handoff → must reconcile

### Assignment Purposes

Task assignment serves multiple purposes:

| Purpose | Description |
|---------|-------------|
| **Expertise matching** | Route tasks to appropriate skills (architect vs designer) |
| **Team visibility** | See who's working on what across the team |
| **Prevent duplication** | Avoid two people working the same task |
| **Capacity planning** | Understand team loading and constraints |
| **Traceability** | "Who worked on Task-01? I have questions about the API" |
| **Performance analysis** | Is the user working to plan or spending time on ad-hoc? |

### Current Gap

Currently, ginko shows a shared "Active Sprint" view regardless of who's viewing it. Tasks can be started without assignment, leading to:

- Anonymous work that can't be traced
- No personal workstream view
- Risk of duplicate effort
- Lost attribution for completed work

## Decision

### 1. Work Cannot Be Anonymous

**Starting active work on a task requires assignment.** This is non-negotiable for traceability.

ginko enforces this through progressive nudges rather than hard blocks:

```
Sprint Start ──► "8 unassigned tasks. Assign all to you? [Y/n]"
      │
      ▼ (user declines)

Next Task ─────► "e015_s03_t04 is unassigned. Assign to you? [Y/n]"
(unassigned)         │
                     ▼ (user declines)

                Skip to next assigned task
                (unassigned task stays in queue)
```

**Behavioral nudge**: Users tire of per-task prompts and accept bulk assignment at sprint start. The friction is intentional—it makes the tracked path easier than the untracked path.

### 2. Personal Workstreams

`ginko start` shows the current user's work, not the whole team's:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ginko                                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  Ready │ Hot (10/10) │ Think & Build                                    │
│  User: chris@watchhill.ai                                               │
├─────────────────────────────────────────────────────────────────────────┤
│  Your Work                                                              │
│  ├─ EPIC-015 Sprint 3 (Migration)           3/8 tasks, 2 unassigned    │
│  │  └─ Next: e015_s03_t04 - Deprecate CURRENT-SPRINT.md                │
│  └─ EPIC-011 Sprint 2 (Edit Capability)     1/5 tasks    planned       │
├─────────────────────────────────────────────────────────────────────────┤
│  Branch: main (clean)                                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key behaviors:**
- Shows sprints where user has assigned tasks
- "Next" is determined by recency (continue where you left off)
- User controls their own prioritization
- Shows unassigned count as a subtle nudge to claim work
- When all work in an epic completes, prompt user to select next work

### 3. "Next" Task Determination

Priority order for determining "Next":

1. **Most recently active** - Continue where you left off
2. **Within same sprint** - Finish current sprint before jumping
3. **By task order** - Follow defined sequence when no recent activity

This respects user autonomy while providing sensible defaults.

### 4. Team Visibility via Separate Command

```bash
ginko team status

┌─────────────────────────────────────────────────────────────────────────┐
│  Team Status                                                            │
├─────────────────────────────────────────────────────────────────────────┤
│  chris@watchhill.ai                                                     │
│  └─ EPIC-015 Sprint 3      3/8 ████░░░░ 38%    active 30m ago          │
│                                                                         │
│  alice@company.com                                                      │
│  └─ EPIC-015 Sprint 3      2/3 ██████░░ 67%    active 2h ago           │
│                                                                         │
│  Unassigned Work                                                        │
│  └─ EPIC-011 Sprint 2      0/5 tasks          needs owner              │
│  └─ EPIC-009 Sprint 4      0/8 tasks          needs owner              │
└─────────────────────────────────────────────────────────────────────────┘
```

Team status shows:
- Each active team member and their current work
- Progress and last activity time
- Unassigned work that needs owners

### 5. Assignment Flows

**Scenario A: Sprint start with unassigned tasks**
```
User: ginko sprint start e015_s03

ginko: Starting sprint e015_s03 - Migration & Cleanup

       This sprint has 8 unassigned tasks.
       Assign all to you? [Y/n]

User: Y

ginko: ✓ Assigned 8 tasks to chris@watchhill.ai
       ✓ Sprint e015_s03 is now active

       Next: e015_s03_t01 - Create Migration Script
```

**Scenario B: Mixed assignment (some pre-assigned)**
```
User: ginko sprint start e015_s03

ginko: Starting sprint e015_s03 - Migration & Cleanup

       Task assignments:
       • 3 tasks assigned to alice@company.com
       • 5 tasks unassigned

       Assign the 5 unassigned tasks to you? [Y/n]
```

**Scenario C: User declines, hits unassigned task**
```
ginko: Next: e015_s03_t04 - Deprecate CURRENT-SPRINT (unassigned)
       Assign to you before starting? [Y/n]

User: n

ginko: Skipping to next assigned task...
       Next: e015_s03_t06 - Update CLAUDE.md Documentation
```

**Scenario D: All epic work complete**
```
ginko start

ginko: ✓ EPIC-015 complete! All 3 sprints finished.

       Available work:
       1. EPIC-011 Sprint 2 - Edit Capability (5 tasks, unassigned)
       2. EPIC-009 Sprint 4 - History Polish (8 tasks, unassigned)

       Which would you like to start? [1/2/skip]
```

### 6. Ad-Hoc Work Tracking (Flow-Aware)

When AI detects work outside the current sprint scope (per ADR-052 "Track This Work" reflex), it should **defer the prompt until a natural breakpoint**:

**During rapid debugging:**
```
[User and AI working through auth timeout bug]
[AI internally notes: "ad-hoc work detected, will prompt at resolution"]

User: Okay, that fixed it. The timeout was in the retry logic.

AI: Nice work! That fix was outside our current sprint.
    Create an ad-hoc task to track it? [Y/n]

User: Y

AI: Created adhoc_260120_s01_t01 - Fix authentication timeout
    Assigned to chris@watchhill.ai
```

**At session end (batch reconciliation):**
```
User: /handoff

AI: Before handoff, let's reconcile untracked work from this session:

    Detected ad-hoc work:
    1. Fixed auth timeout bug (packages/api/retry.ts)
    2. Updated README typos
    3. Refactored validation helper

    Create ad-hoc tasks for these? [Y/n/select]
```

Ad-hoc tasks:
- Use the naming convention from ADR-052
- Are automatically assigned to the current user
- Appear in personal workstream
- Enable traceability and performance analysis

## Consequences

### Positive

- **Clear ownership**: Every task has an assignee before work begins
- **Personal focus**: Users see their work, not noise from other streams
- **Traceability**: Can always answer "who worked on this?"
- **Reduced duplication**: Clear ownership prevents stepping on toes
- **Plan adherence**: Nudges keep work within the tracked framework
- **Performance insights**: Can analyze work patterns per user
- **Flow preservation**: Prompts timed to natural breakpoints, not mid-thought

### Negative

- **Additional prompts**: Users see assignment prompts at sprint start (mitigated: these are natural breakpoints)
- **Requires user identification**: Must know current user's email
- **Behavioral change**: Users must accept assignment model
- **Flow detection complexity**: AI must sense appropriate moments to prompt

### Neutral

- **No anonymous quick fixes**: Even small fixes need assignment (mitigated by bulk assignment at sprint start and batch reconciliation at session end)

## Implementation

### Phase 1: Personal Workstream
1. Add user identification to `ginko start` (from git config or ginko login)
2. Filter displayed tasks by assignee
3. Implement "continue where you left off" logic for Next task
4. Show unassigned count in sprint display

### Phase 2: Assignment Prompts
1. Add assignment prompt to `ginko sprint start`
2. Add per-task assignment prompt when Next is unassigned
3. Implement skip-to-next-assigned logic

### Phase 3: Team Status
1. Create `ginko team status` command
2. Query graph for all active users and their work
3. Show unassigned work summary

### Phase 4: Flow-Aware Nudging (AI Partner Behavior)
1. Define heuristics for flow detection in CLAUDE.md
2. Implement deferred prompt queue for ad-hoc work detection
3. Add batch reconciliation to handoff flow
4. Document flow-aware behavior in AI instructions

**Flow detection signals:**
- Time between user messages (< 30s = active flow)
- File change frequency (> 3 files/min = debugging)
- Conversation pattern (Q&A rapid-fire = pair programming)
- Explicit markers ("okay, done", "that's fixed", "moving on")

### API Requirements

```typescript
// Get user's assigned work across all sprints
GET /api/v1/user/{email}/workstream
Response: {
  sprints: [{
    id: string,
    title: string,
    epic: { id: string, title: string },
    tasksAssigned: number,
    tasksComplete: number,
    tasksUnassigned: number,
    lastActivity: Date,
    nextTask: { id: string, title: string } | null
  }]
}

// Get team status overview
GET /api/v1/team/status
Response: {
  members: [{
    email: string,
    activeSprint: { id: string, title: string },
    progress: { complete: number, total: number },
    lastActivity: Date
  }],
  unassigned: [{
    sprintId: string,
    sprintTitle: string,
    taskCount: number
  }]
}
```

## Related ADRs

- **ADR-048**: Dynamic Adaptivity Mode Sensing (flow detection heuristics)
- **ADR-052**: Unified Entity Naming Convention (ad-hoc task naming)
- **ADR-058**: Entity ID Conflict Resolution (assignment conflict handling)
- **ADR-060**: Content/State Separation (graph-authoritative status)

## References

- CLAUDE.md "Track This Work" reflex (#9)
- ginko North Star: Maximizing time in flow state
- Original discussion: Session 2026-01-20
