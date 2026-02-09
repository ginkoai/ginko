# Sprint Creation Template

## AI-Mediated Sprint Creation Guide (EPIC-018)

**For AI Partners:** Use this template to create well-formed sprints with rich task content. Unlike epics (which require extensive planning), sprints are focused work units. Your job is to:

1. **Gather context** from the graph and session
2. **Clarify intent** through natural conversation
3. **Generate rich tasks** with WHY-WHAT-HOW structure
4. **Assess confidence** and trigger inquiry when uncertain
5. **Create the sprint file** and sync to graph

---

## Step 1: Gather Context

Before asking questions, silently gather relevant context:

```bash
# Check for related bugs, issues, or prior work
ginko graph query "<topic from user intent>"

# Check current session context
# (You already have this from the conversation)

# Check what's in progress
ginko status
```

**Synthesize:** What do you already know that's relevant? What patterns, ADRs, or gotchas apply?

---

## Step 2: Clarify Intent

The user has expressed intent (e.g., "fix some dashboard bugs"). Ask **only what you need** to create actionable tasks.

**Key questions (ask naturally, not mechanically):**

1. **Scope:** "Which specific issues are we targeting?" or "I found these dashboard-related items in the graph: [list]. Which are priorities?"

2. **Boundaries:** "Anything explicitly out of scope for this sprint?"

3. **Success criteria:** "How will we know we're done?"

**Stop asking when:**
- You have enough to create 2-6 concrete tasks
- User signals readiness ("let's go with that", "sounds good")
- You're confident (>75%) in task definitions

---

## Step 3: Generate Rich Tasks (WHY-WHAT-HOW)

For each task, generate the full structure:

```markdown
### {sprint_id}_t{NN}: {Title} ({estimate})

**Status:** [ ] Not Started
**Priority:** {CRITICAL|HIGH|MEDIUM|LOW}
**Confidence:** {0-100}%

**Problem:** {WHY - 1-2 sentences on the pain point or motivation}

**Solution:** {WHAT - 1-2 sentences on the desired outcome}

**Approach:** {HOW - 2-3 sentences on implementation strategy}

**Scope:**
  - Includes: {what's in scope}
  - Excludes: {what's explicitly out}

**Acceptance Criteria:**
- [ ] {Specific, testable criterion 1}
- [ ] {Specific, testable criterion 2}
- [ ] {Tests pass}
```

### Confidence Scoring (Critical)

Be honest about your confidence in each task:

| Score | Meaning | Your Action |
|-------|---------|-------------|
| 90-100% | Crystal clear, obvious implementation | Proceed |
| 70-89% | Good clarity, minor assumptions | Note assumptions in Approach |
| 50-69% | Moderate ambiguity | Flag and ask clarifying question |
| Below 50% | Significant uncertainty | Stop and discuss with human |

**Philosophy:** Low confidence is a STRENGTH. A score of 60 with honest questions is better than 90 with hidden assumptions.

---

## Step 4: Composite Confidence Check

After generating all tasks, calculate the average confidence.

**If composite confidence < 75%:**

```
I've drafted the sprint, but my overall confidence is {N}%.

Some tasks need clarification:
- Task 2: {title} (confidence: {N}%) - {what's unclear}
- Task 4: {title} (confidence: {N}%) - {what's unclear}

This is a good thing! Better to clarify now than build the wrong thing.

For each flagged task, can you help me understand:
- {Specific question about Task 2}
- {Specific question about Task 4}

Or if you'd prefer, I can proceed with my best judgment.
```

**If composite confidence >= 75%:**
Present the sprint plan and ask for approval before creating files.

---

## Step 5: Create Sprint File

After approval, create the sprint file.

**Filename:** `docs/sprints/SPRINT-YYYY-MM-{sprint_id}-{slug}.md`

Example: `docs/sprints/SPRINT-2026-02-adhoc_260205_s01-dashboard-fixes.md`

**Generate Sprint ID:**
- For ad-hoc work: `adhoc_{YYMMDD}_s{NN}` (e.g., `adhoc_260205_s01`)
- For epic work: `e{NNN}_s{NN}` (e.g., `e018_s02`)

### Sprint File Template

```markdown
# SPRINT: {Sprint Name}

## Sprint Overview

**Sprint Goal**: {One sentence describing what this sprint achieves}
**Duration**: {YYYY-MM-DD} to {YYYY-MM-DD}
**Type**: {Bug Fix|Feature|Infrastructure|Polish}
**Progress:** 0% (0/{N} tasks complete)
**ID:** `{sprint_id}`

**Success Criteria:**
- {Sprint-level success criterion 1}
- {Sprint-level success criterion 2}

---

## Sprint Tasks

{For each task, use the WHY-WHAT-HOW format from Step 3}

---

## Related Documents

- **Epic**: {Epic name or "Ad-Hoc Work"}
- **ADRs**: {List relevant ADRs}
- **Patterns**: {List relevant patterns}

---

**Sprint Status**: Active
**Start Date**: {YYYY-MM-DD}
**Created By**: {user email}
```

---

## Step 6: Sync to Graph

After creating the sprint file:

```bash
ginko push sprint
```

Then start the first task:

```bash
ginko task start {sprint_id}_t01
```

---

## Content Quality Standards

Tasks are assessed as:

| Quality | Criteria |
|---------|----------|
| **Rich** | Has problem, solution, approach, scope, criteria |
| **Adequate** | Has basics but missing approach or scope |
| **Thin** | Missing problem or acceptance criteria - needs enrichment |

**Target:** All tasks should be Rich or Adequate. Thin tasks trigger inquiry.

---

## Work Mode Sensitivity

Adjust depth based on signals:

**Hack & Ship** (quick fix, spike, experiment):
- 1-3 tasks, minimal ceremony
- Confidence threshold: 60%
- Skip detailed scope if obvious

**Think & Build** (standard work):
- 2-6 tasks, full WHY-WHAT-HOW
- Confidence threshold: 75%
- Include scope and acceptance criteria

**Full Planning** (complex, multi-person):
- Detailed task breakdown
- Confidence threshold: 85%
- Include dependencies, risks

---

## Example Conversation Flow

**Human:** "Let's start a sprint to fix some dashboard bugs"

**AI:** *[Silently queries: `ginko graph query "dashboard bugs"`]*

**AI:** "I found a few dashboard-related items in the graph:
- Stale data in Projects tab after rename
- Member list not refreshing
- Settings panel layout issue on mobile

Which of these are priorities for this sprint? Any others I missed?"

**Human:** "The first two - they're related. Skip the mobile thing for now."

**AI:** "Got it. Both relate to data freshness after project changes. Let me draft the tasks:

**Sprint: Dashboard Data Refresh Fixes**

1. **Fix member list refresh on project rename** (2h, confidence: 85%)
   - Problem: Member list shows stale data after project name changes
   - Solution: Trigger refresh when project name updates

2. **Add loading state during refresh** (1h, confidence: 90%)
   - Problem: No feedback during data reload
   - Solution: Show spinner while fetching updated data

3. **Test and verify fixes** (1h, confidence: 95%)
   - Verify both issues resolved, no regressions

Overall confidence: 90%. Ready to create the sprint?"

**Human:** "Looks good, let's go."

**AI:** *[Creates sprint file, runs `ginko push sprint`, starts first task]*

---

## Key Principles

1. **Context first:** Query the graph before asking questions
2. **Inquiry is strength:** Low confidence triggers conversation, not silent assumptions
3. **Rich tasks:** Every task has WHY-WHAT-HOW, not just a title
4. **Natural conversation:** Don't interrogate - collaborate
5. **Human approval:** Present plan before creating files

---

**Remember:** The goal is actionable tasks the AI can execute autonomously. Quality thinking over complete forms.
