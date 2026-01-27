# SPRINT: EPIC-016 Sprint 4 - Work Pattern Coaching

## Sprint Overview

**Sprint Goal**: Guide users toward Epic→Sprint→Task structure at session start, with graceful paths for all work types
**Duration**: 1.5 weeks
**Type**: Behavior + CLI sprint (AI instructions + CLI enhancements)
**Progress:** 0% (0/7 tasks complete)
**Prerequisite:** Sprint 3 complete (team status working)

**Key Insight**: Check work structure at `ginko start` rather than interrupting during work. Front-load planning decisions, respect flow during execution.

**Success Criteria:**
- [ ] `ginko start` detects unstructured work and offers guided planning
- [ ] Users can create quick sprints with minimal friction
- [ ] Quick-fix fast path creates 1-task sprint automatically
- [ ] AI quiets prompts as user demonstrates pattern adoption
- [ ] Handoff reconciles any untracked work
- [ ] Users report clear path from "idea" to "tracked work"

---

## Sprint Tasks

### e016_s04_t01: Start-Time Structure Check (3h)
**Priority:** HIGH

**Goal:** Detect if user is working within Epic→Sprint→Task structure at session start

**Detection Logic:**
```
At ginko start:
1. Check: Is user assigned to an active sprint?
2. Check: Does the sprint have incomplete tasks?
3. Check: Has user been working ad-hoc for >1 session?

If structured work exists:
  → Show normal "Ready" message with next task

If no structured work:
  → Trigger guided planning menu (t02)
```

**Implementation:**
- Modify `ginko start` to check sprint assignment status
- Track consecutive ad-hoc sessions in session metadata
- Trigger planning flow when structure is missing

**Files:**
- Modify: `packages/cli/src/commands/start.ts`
- Modify: `.ginko/sessions/*/current-sprint.json` (track ad-hoc flag)

**Acceptance Criteria:**
- Start detects missing structure
- Graceful handling when user IS in a sprint
- No false positives (UAT/polish of recent sprint is fine)

---

### e016_s04_t02: Guided Planning Menu (3h)
**Priority:** HIGH

**Goal:** When no structure detected, offer clear planning options

**Menu Design:**
```
You have no planned work. What would you like to work on?

  [a] New Epic
      Large initiative with multiple sprints (launches ginko epic)

  [b] New Feature Sprint
      Focused work with clear goals (guides through sprint creation)

  [c] Quick fix / Bug fix
      Single task, minimal overhead (creates 1-task sprint)

  [d] Something else
      Explore, research, or work ad-hoc (tracked for coaching)
```

**Implementation:**
- Add menu to start flow when structure check fails
- Each option routes to appropriate creation flow
- Track selection for coaching insights

**Files:**
- Modify: `packages/cli/src/commands/start.ts`
- New utility: `packages/cli/src/lib/planning-menu.ts`

**Acceptance Criteria:**
- Menu appears when no structured work
- All four paths work correctly
- Selection logged for insights analysis

---

### e016_s04_t03: Improved Sprint Creation UX (4h)
**Priority:** HIGH

**Goal:** Lightweight flow for creating feature sprints without full epic ceremony

**Flow:**
```
User selects: [b] New Feature Sprint

AI: What are you building?
User: Adding dark mode to the settings page

AI: Got it. Let me break that down:

    Sprint: Dark Mode Implementation
    Tasks:
    1. Add theme toggle component
    2. Create dark theme CSS variables
    3. Update settings page UI
    4. Test across browsers

    This will be tracked under the Ad-Hoc Epic.
    Look good? [Y/edit/cancel]

User: Y

AI: ✓ Created sprint adhoc_260126_s01 with 4 tasks
    Starting task 1: Add theme toggle component
```

**Implementation:**
- Enhance `ginko sprint` to support conversational creation
- Auto-generate task breakdown via AI
- Default to Ad-Hoc epic (create if doesn't exist)
- Support editing before confirmation

**Files:**
- Modify: `packages/cli/src/commands/sprint.ts`
- Create Ad-Hoc epic if missing (EPIC-ADH or similar)

**Acceptance Criteria:**
- Natural language sprint creation works
- AI generates reasonable task breakdown
- User can edit before committing
- Sprint linked to Ad-Hoc epic

---

### e016_s04_t04: Quick-Fix Fast Path (2h)
**Priority:** HIGH

**Goal:** Minimal friction path for single-task work

**Flow:**
```
User selects: [c] Quick fix / Bug fix

AI: Describe the fix in one line:
User: Fix auth timeout on slow connections

AI: ✓ Created: adhoc_260126_s02_t01 - Fix auth timeout on slow connections
    Ready to work. I'll remind you to mark it complete when done.
```

**Implementation:**
- Single prompt → single task in new 1-task sprint
- Auto-assign to user
- Auto-start the task
- Reminder at natural breaks to mark complete

**Files:**
- Modify: `packages/cli/src/commands/start.ts` (quick-fix flow)
- Reuse sprint/task creation from t03

**Acceptance Criteria:**
- Two interactions max: describe → working
- Task properly tracked in graph
- Completion reminder appears at appropriate times

---

### e016_s04_t05: Behavior-Based Quieting (3h)
**Priority:** MEDIUM

**Goal:** Reduce planning prompts as user demonstrates pattern adoption

**Signals of Adoption:**
| User Behavior | Indicates | Action |
|---------------|-----------|--------|
| "What's our next task?" | Understands workflow | +1 adoption point |
| "Let's continue Sprint 3" | Plans proactively | +1 adoption point |
| "ginko sprint ..." unprompted | Self-directed planning | +2 adoption points |
| Selects [d] Something else | May need more coaching | no change |
| 3+ consecutive ad-hoc sessions | Pattern not adopted | reset points |

**Quieting Levels:**
- 0-5 points: Full prompts (default for new users)
- 6-15 points: Lighter prompts (menu shows but briefer)
- 16+ points: Minimal prompts (only when truly unstructured)

**Implementation:**
- Track adoption score in user's ginko config
- Adjust prompt verbosity based on score
- Score visible in `ginko insights`

**Files:**
- Modify: `.ginko/config.json` (add adoption_score)
- Modify: `packages/cli/src/commands/start.ts` (read score, adjust prompts)
- Modify: `packages/cli/src/commands/insights.ts` (display score)

**Acceptance Criteria:**
- Score tracked across sessions
- Prompt verbosity decreases with adoption
- Score contributes to Pattern Adoption metric in dashboard

---

### e016_s04_t06: Handoff Reconciliation (3h)
**Priority:** MEDIUM

**Goal:** Catch untracked work at session end

**Flow:**
```
User: /handoff

AI: Before handoff, let's reconcile this session:

    Completed planned work:
    ✓ adhoc_260126_s02_t01 - Fix auth timeout

    Detected additional work:
    1. Updated README (3 files changed)
    2. Refactored validation helper

    Track these as completed tasks? [Y/n/select]

User: select

AI: [x] 1. Updated README → docs task
    [x] 2. Refactored validation → code task

    ✓ Added to adhoc_260126_s02

    Proceeding with handoff...
```

**Implementation:**
- Scan git diff for changes not covered by completed tasks
- Offer to track as additional tasks (retroactively complete)
- Support selective tracking
- Skip trivial changes (< 5 lines, only whitespace, etc.)

**Files:**
- Modify: `packages/cli/src/commands/handoff.ts`
- New utility: `packages/cli/src/lib/work-reconciliation.ts`

**Acceptance Criteria:**
- Detects untracked file changes
- Offers batch tracking
- Selective tracking works
- Trivial changes auto-skipped

---

### e016_s04_t07: CLAUDE.md Updates & Documentation (2h)
**Priority:** MEDIUM

**Goal:** Document new behaviors for AI partner

**CLAUDE.md Additions:**

1. **Work Pattern Coaching Section**
   - Explain start-time structure check
   - Document the planning menu
   - Describe when to suggest structure vs. allow ad-hoc

2. **Updated Context Reflexes**
   - Modify "Track This Work" reflex to align with new flow
   - Add "Check Structure" reflex at session start
   - Remove mid-flow interruption patterns

3. **Quick-Fix Guidance**
   - When to suggest quick-fix vs. sprint
   - How to remind about task completion

**Files:**
- Modify: `CLAUDE.md`

**Acceptance Criteria:**
- AI partner follows new patterns
- No conflicting instructions remain
- Examples provided for each scenario

---

## Technical Notes

### Ad-Hoc Epic Creation

If no Ad-Hoc epic exists, create one:
```
EPIC-ADH: Ad-Hoc Work
Description: Container for unplanned work, quick fixes, and small features
Status: active (permanent)
```

This epic is never "completed" - it's a perpetual container.

### Adoption Score Storage

```json
// .ginko/config.json
{
  "user": {
    "adoption_score": 12,
    "adoption_history": [
      { "date": "2026-01-26", "action": "sprint_created", "points": 2 }
    ]
  }
}
```

### Integration with Insights Dashboard

The adoption score contributes to the "Pattern Adoption" metric (currently 85 in the dashboard). This creates a feedback loop:
- Low pattern adoption → more coaching prompts
- High pattern adoption → quieter experience
- Visible in dashboard → user understands why

---

## Dependencies

- Sprint 3 complete (team status for context)
- `ginko epic` command working
- `ginko sprint` command supports intent-based creation
- Graph API for creating sprints/tasks

---

## Deferred to Sprint 5

The following were discussed but deferred:

1. **Insight-Score-Based Auto-Tuning** - Automatically adjust nudging based on 7-day rolling insight score (≥75 quiets, ≤65 increases)
2. **Targeted Coaching Elaborations** - Specific coaching for weak areas identified by insights
3. **ginko nudging command** - Manual override for nudging level
4. **Runtime Flow Detection** - Original S04 concept of detecting flow state during work (less needed with start-time approach)

---

## Completion Criteria

Sprint 4 is complete when:
1. `ginko start` detects and prompts for missing structure
2. All four planning paths work (epic, sprint, quick-fix, ad-hoc)
3. Behavior-based quieting reduces prompts for adopters
4. Handoff reconciles untracked work
5. Users report clear "idea → tracked work" experience
