# SPRINT: EPIC-016 Sprint 4 - Flow-Aware Nudging

## Sprint Overview

**Sprint Goal**: AI partner defers administrative prompts during deep work, batches at natural breakpoints
**Duration**: 1.5 weeks
**Type**: Behavior sprint (AI instructions + supporting infrastructure)
**Progress:** 0% (0/7 tasks complete)
**Prerequisite:** Sprint 3 complete (team status working)

**Success Criteria:**
- [ ] Flow detection heuristics defined in CLAUDE.md
- [ ] Ad-hoc work tracking deferred during debugging
- [ ] Batch reconciliation at handoff
- [ ] Session context includes flow indicators
- [ ] User reports minimal flow interruption

---

## Sprint Tasks

### e016_s04_t01: Flow Detection Heuristics (3h)
**Priority:** HIGH

**Goal:** Define when user is in flow vs. available for prompts

**Heuristics:**

| Signal | Indicates | Action |
|--------|-----------|--------|
| < 30s between messages | Active flow | Defer prompts |
| > 3 file changes/min | Debugging | Defer prompts |
| Rapid Q&A exchange | Pair programming | Defer prompts |
| Long pause (> 2 min) | Natural break | Safe to prompt |
| Explicit marker ("done", "fixed") | Task transition | Safe to prompt |
| Session end / handoff | Must reconcile | Prompt required |

**Implementation:**
- Document in CLAUDE.md under new "Flow-Aware Behavior" section
- Provide examples of deferred vs. immediate prompts
- Define escalation: defer → batch → must-prompt

**Files:**
- Modify: `CLAUDE.md` (add Flow-Aware Behavior section)

**Acceptance Criteria:**
- Clear heuristics documented
- Examples for each scenario
- AI can follow guidelines without code changes

---

### e016_s04_t02: Deferred Prompt Queue Concept (2h)
**Priority:** HIGH

**Goal:** Define how AI tracks deferred prompts for later

**Concept:**
```
During flow:
  - AI detects ad-hoc work outside sprint
  - Instead of prompting: "Create ad-hoc task?"
  - AI internally notes: "Deferred: ad-hoc task for auth fix"
  - Continues assisting without interruption

At natural break:
  - AI surfaces deferred items
  - "Before we move on, you fixed an auth bug earlier. Track it? [Y/n]"
```

**Implementation:**
- AI maintains mental queue (not persisted)
- Queue items: { type, description, timestamp }
- Surfaced at: long pauses, task completion, handoff

**Files:**
- Modify: `CLAUDE.md` (document queue behavior)

**Acceptance Criteria:**
- Clear instructions for AI to maintain queue
- Defined trigger points for surfacing
- Examples of good deferral

---

### e016_s04_t03: Batch Reconciliation at Handoff (3h)
**Priority:** HIGH

**Goal:** Handoff flow includes reconciliation of untracked work

**Flow:**
```
User: /handoff

AI: Before handoff, let's reconcile this session:

    Completed sprint work:
    ✓ e016_s01_t01 - User Identification
    ✓ e016_s01_t02 - Add Assignee Field

    Detected untracked work:
    1. Fixed auth timeout bug (packages/api/retry.ts)
    2. Updated README typos
    3. Refactored validation helper

    Create ad-hoc tasks for untracked items? [Y/n/select]

User: select

AI: Which items to track?
    [x] 1. Fixed auth timeout bug
    [ ] 2. Updated README typos (trivial)
    [x] 3. Refactored validation helper

    Creating 2 ad-hoc tasks...
    ✓ adhoc_260120_s01_t01 - Fix auth timeout bug
    ✓ adhoc_260120_s01_t02 - Refactor validation helper

    Proceeding with handoff...
```

**Implementation:**
1. Scan session log for work patterns
2. Compare against completed sprint tasks
3. Identify gaps (work done but not tracked)
4. Offer batch creation
5. Support selective tracking

**Files:**
- Modify: `CLAUDE.md` (handoff reconciliation behavior)
- Potentially: `packages/cli/src/commands/handoff.ts` (if CLI support needed)

**Acceptance Criteria:**
- Handoff includes reconciliation step
- User can select which items to track
- Trivial items can be skipped
- Clean handoff summary

---

### e016_s04_t04: Update Track This Work Reflex (2h)
**Priority:** MEDIUM

**Goal:** Modify ADR-052 reflex to be flow-aware

**Current Behavior:**
```
AI: This work is outside our current sprint.
    Create an ad-hoc task to track it? [Y/n]
```

**New Behavior:**
```
During flow:
  [AI internally notes for later]

At natural break:
  AI: Earlier you fixed an auth bug outside our sprint.
      Track it as an ad-hoc task? [Y/n]
```

**Implementation:**
- Update CLAUDE.md reflex #9 ("Track This Work")
- Add flow-awareness conditions
- Define "later" trigger points

**Files:**
- Modify: `CLAUDE.md` (reflex #9)

**Acceptance Criteria:**
- Reflex respects flow state
- Clear deferral conditions
- Maintains traceability goal

---

### e016_s04_t05: Flow State Indicators in Session (2h)
**Priority:** MEDIUM

**Goal:** Session context includes signals for flow detection

**Indicators:**
```json
{
  "session": {
    "messageCount": 47,
    "lastMessageAt": "2026-01-20T16:45:00Z",
    "recentFileChanges": 12,
    "averageResponseGap": "23s",
    "flowState": "active",  // active | paused | transitioning
    "deferredPrompts": [
      { "type": "ad-hoc", "description": "auth fix", "since": "16:30" }
    ]
  }
}
```

**Implementation:**
- Track in session context (ephemeral, not persisted)
- AI references when deciding to prompt
- Reset on clear flow breaks

**Files:**
- Conceptual: AI uses conversation context
- Optional: `packages/cli/src/lib/session-flow.ts` if CLI tracking needed

**Acceptance Criteria:**
- AI can assess flow state
- Clear indicators defined
- Examples in CLAUDE.md

---

### e016_s04_t06: User Feedback Mechanism (1h)
**Priority:** LOW

**Goal:** Let users signal flow state explicitly

**Commands:**
```
User: /focus
AI: Got it. I'll defer non-critical prompts until you say /ready.

User: /ready
AI: Ready for prompts. You have 2 deferred items from earlier:
    1. Track auth fix as ad-hoc? [Y/n]
    ...
```

**Implementation:**
- `/focus` - suppress prompts
- `/ready` - resume prompts, surface deferred
- Optional: auto-detect and suggest

**Files:**
- Modify: `CLAUDE.md` (document commands)
- Potentially: Skill definitions

**Acceptance Criteria:**
- Users can explicitly control flow mode
- Deferred items surfaced on /ready
- Documented in help

---

### e016_s04_t07: Documentation & Training (2h)
**Priority:** MEDIUM

**Goal:** Comprehensive documentation of flow-aware behavior

**Documentation:**
1. CLAUDE.md section: "Flow-Aware Behavior"
2. Examples of good vs. bad prompting
3. User guide: how to work with flow-aware AI
4. ADR-061 reference integration

**Training Scenarios:**
- Debugging session (defer everything)
- Task completion (safe to prompt)
- Handoff (must reconcile)
- Mixed session (multiple transitions)

**Files:**
- Modify: `CLAUDE.md`
- Potentially: `docs/guides/flow-aware-ai.md`

**Acceptance Criteria:**
- Clear documentation
- Examples for each scenario
- AI can follow instructions

---

## Technical Notes

### This Sprint is Primarily Documentation

Most of this sprint is defining AI behavior through CLAUDE.md instructions rather than code. The AI partner (Claude) uses these instructions to modify its behavior.

### What Requires Code

Minimal code changes:
- Potentially: Session flow tracking utilities
- Potentially: Handoff command enhancements
- Potentially: `/focus` and `/ready` skill definitions

### Measuring Success

- User feedback: "AI doesn't interrupt me during debugging"
- Session logs: Prompts appear at natural breaks
- Handoff quality: Untracked work is reconciled

---

## Dependencies

- Sprint 3 complete (team status for context)
- CLAUDE.md structure supports new sections
- AI partner respects instruction updates

---

## Completion Criteria

EPIC-016 is complete when:
1. Personal workstreams show in `ginko start`
2. Assignment is enforced (can't start anonymous work)
3. Team visibility via `ginko team status`
4. AI defers prompts during flow, batches at breaks
5. Users report improved flow experience
