# Session Handoff Creation

You are ending your development session. Create a handoff for the next Claude session.

**Session Info:**
- Task: {{currentTask}}
- Time: {{timestamp}}
- Project: {{projectId}}
- Session ID: {{sessionId}}

## AVAILABLE MODES (Choose the best one for next session):

**PLANNING MODE** - Wide focus. Explore options. Consider architecture.
*Use when:* Need to research, design, explore multiple approaches, make architectural decisions
*Tone:* Curious, exploratory, methodical
*Approach:* Think through options, research patterns, design before coding

**DEBUGGING MODE** - Narrow focus. Isolate the problem. Test hypotheses.
*Use when:* Something is broken, tests failing, errors occurring, investigation needed
*Tone:* Determined, focused, analytical
*Approach:* Reproduce issue, form hypotheses, test systematically

**BUILDING MODE** - Step-by-step execution. Follow the plan. Complete tasks.
*Use when:* Clear plan exists, ready to implement, tasks defined, making progress
*Tone:* Productive, methodical, momentum-focused
*Approach:* Execute the plan, complete tasks, build incrementally

**LEARNING MODE** - Deep exploration. Understand patterns. Document insights.
*Use when:* New technology, complex codebase, need to understand before acting
*Tone:* Curious, patient, thorough
*Approach:* Read documentation, explore code, understand before changing

**SHIPPING MODE** - Final checks. Test everything. Prepare deployment.
*Use when:* Features complete, ready to deploy, need final verification
*Tone:* Careful, thorough, quality-focused
*Approach:* Test extensively, check edge cases, prepare for production

## CREATE YOUR HANDOFF:

Based on your complete knowledge of this session, fill out this template:

---

[Time-based greeting + emotional tone based on session success/struggle]
[Brief shared history - what you accomplished or challenges faced]

**[CHOSEN MODE]** - [Brief explanation why this mode]
*[Mode transition: "Transitioning from [current] → [next]" OR "Continuing in [mode] mode"]*
*[Reason for transition/continuation]*

## 📊 Progress Snapshot
[Real checkboxes based on actual progress - you know exactly what's done/blocked/in-progress]

## 🏗️ **Project Context Updates** (Include if significant changes discovered)
**System Architecture**: [Any architecture decisions or tech stack changes discovered this session]
**Current Goals**: [Sprint priorities that emerged or changed during this session]  
**Key Constraints**: [Performance, security, budget, or compliance requirements discovered]
**Development Phase**: [What phase of development: planning, building, testing, shipping]

## 📚 **Documentation Context** (Include if docs were created/updated or are critical for next steps)
**New Documentation**: [Any ADRs, README updates, API docs, or design docs created this session]
**Key References**: [Existing docs that are essential for the next Claude to understand the work]
**Documentation Gaps**: [Missing docs that should be created for this feature/project]

## 🎯 Instant Start (WAIT FOR HUMAN GO-AHEAD)
```bash
cd [exact current directory]
git status  # Branch: [actual current branch name]
[exact first command next Claude should run based on your assessment]
# Expected: [what should happen when they run it]
```

**IMPORTANT: Don't execute anything yet. Ask the human:**
- "Are these priorities still correct?"
- "Any changes to the approach?"
- "Ready to proceed with [mode] mode?"

[Include sections below ONLY if relevant to chosen mode:]

## 🔍 Context You Need (for debugging/complex issues)
- **Problem**: [Exact error message/issue you're seeing]
- **Hypothesis**: [Your current theory about the cause]
- **Last Success**: [What was working before it broke]
- **Reproduce**: [Exact steps to reproduce the issue]

## ⚠️ Watchouts (critical warnings only)
- [Only 2-3 most important things to avoid]

## 📟 Last Terminal State
[Copy your last 2-3 command outputs that are relevant]

[Mode-appropriate motivational close + "What would you like to focus on?"]

---

**INSTRUCTIONS:**
1. Be specific and executable - next Claude should be ready to start in 10 seconds once human approves
2. Only include context relevant to your chosen mode
3. Base everything on your actual knowledge of files, errors, git state, and progress
4. Choose mode thoughtfully - it sets the entire approach for next session
5. If transitioning modes, explain why clearly
6. Always wait for human go-ahead before executing anything

**RETURN ONLY THE HANDOFF CONTENT (the --- section), not this prompt.**