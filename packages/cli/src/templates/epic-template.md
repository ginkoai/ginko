# Epic Creation Template

## AI-Mediated Epic Creation Guide

**For AI Partners:** Use this template to guide a natural conversation with the user. Ask these questions conversationally, synthesize responses, and create a well-formed epic with sprint breakdown.

---

## Epic Questions

### 1. Epic Goal & Vision (Required)
**Ask:** "What's the big-picture goal? What capability or outcome are you trying to achieve?"

**Synthesize into:**
- Clear, measurable epic goal
- Vision statement (the "why")
- Expected business/user impact

**Example:**
> **Goal:** Enable AI partners to access project patterns and gotchas at session start, reducing rework by 65%
> **Vision:** Create an AI-native cognitive scaffolding that surfaces relevant context automatically
> **Impact:** Faster AI onboarding, fewer repeated mistakes, higher quality first-pass code

---

### 2. Success Criteria (Required)
**Ask:** "How will you know the epic is complete? What metrics matter?"

**Synthesize into:**
- 3-5 measurable success criteria
- Clear acceptance thresholds
- Observable outcomes

**Example:**
> **Success Criteria:**
> - [ ] Pattern/gotcha context visible in `ginko start` output
> - [ ] Decision accuracy > 85% (AI chooses correct patterns)
> - [ ] Rework rate < 10% (fewer "redo" events)
> - [ ] Context load time < 2 seconds

---

### 3. Scope & Boundaries (Required)
**Ask:** "What's included in this epic? What's explicitly out?"

**Synthesize into:**
- In Scope: Specific deliverables
- Out of Scope: What won't be built
- Dependencies: What needs to exist first

**Example:**
> **In Scope:**
> - Graph schema for patterns, gotchas, ADRs
> - API endpoints for querying task context
> - CLI integration in `ginko start`
> - Session logging of pattern usage
>
> **Out of Scope:**
> - Cross-project pattern discovery
> - ML-based pattern recommendation
> - Real-time collaboration features
>
> **Dependencies:**
> - Neo4j graph database operational
> - ADR-002 frontmatter standard in place

---

### 4. Sprint Breakdown (Required)
**Ask:** "Let's break this into 1-2 week sprints. What are the logical phases?"

**Guide the user to identify:**
- Natural delivery phases (infrastructure → features → polish)
- Clear sprint goals that build on each other
- Estimated duration per sprint

**Example:**
> **Sprint 1: Core Infrastructure (2 weeks)**
> Goal: Establish graph schema and basic relationships
> Tasks: Schema design, Node creation, Basic queries
>
> **Sprint 2: API Integration (2 weeks)**
> Goal: Expose graph data through API endpoints
> Tasks: Pattern API, Gotcha API, Context enrichment
>
> **Sprint 3: CLI Integration (1 week)**
> Goal: Surface context in ginko start
> Tasks: Output formatting, Performance optimization

---

### 5. Tasks per Sprint (Required)
**Ask:** "For each sprint, what are the specific tasks? Let's estimate effort."

**For each task, capture:**
- Task ID and title
- Effort estimate (hours or t-shirt size)
- Priority (HIGH/MEDIUM/LOW)
- Key files to modify
- Related ADRs/patterns/gotchas

**Example:**
> **TASK-1: Design Graph Schema (4h)**
> Priority: HIGH
> Files: src/graph/schema/patterns.cypher
> Follow: ADR-002
>
> **TASK-2: Create Pattern API (8h)**
> Priority: HIGH
> Files: dashboard/src/app/api/v1/task/[id]/patterns/route.ts
> Apply: retry-pattern
> Avoid: verbose-output-gotcha

---

### 6. Risks & Dependencies (Optional - Think & Build mode)
**Ask:** "What could block progress? Any technical risks?"

**Synthesize into:**
- Key risks with mitigation strategies
- External dependencies
- Technical debt considerations

**Example:**
> **Risks:**
> - Graph query performance may degrade with scale → Add indexes early
> - API authentication complexity → Reuse existing auth pattern
>
> **Dependencies:**
> - Neo4j AuraDB instance (already provisioned)
> - Bearer token authentication (existing)

---

## Work Mode Detection

Listen for signals to determine planning depth:

**Hack & Ship** (light depth):
- Keywords: quick, prototype, spike, experiment
- Time: ~10 minutes conversation
- Required: Goal, Success Criteria, 1 sprint outline

**Think & Build** (standard depth):
- Keywords: team, milestone, production, quality
- Time: ~20 minutes conversation
- Required: Goal, Success, Scope, Sprint breakdown with tasks

**Full Planning** (comprehensive):
- Keywords: stakeholders, compliance, budget, timeline
- Time: ~40 minutes conversation
- Required: All sections including risks, dependencies, detailed estimates

---

## Conversation Guidelines for AI Partners

### Do:
- Start with the big picture ("What outcome are you aiming for?")
- Help them think in phases/sprints naturally
- Offer insights ("Based on similar projects, you might want to...")
- Suggest task breakdowns based on your knowledge
- Validate scope is achievable
- Reference existing patterns/ADRs from the codebase

### Don't:
- Ask all questions mechanically
- Force detailed estimates if they're unsure (mark TBD)
- Create too many sprints (3-4 max for most epics)
- Add tasks they haven't mentioned without asking
- Make it feel like a formal planning session

### Completion Logic:
Stop when:
- Overall confidence > 70%, OR
- Goal, success criteria, and at least 2 sprints defined
- User signals they're done ("Let's start with that")

---

## Output Format

After conversation, create files in the correct locations:
- **Epic files** go in `docs/epics/`
- **Sprint files** go in `docs/sprints/`

**IMPORTANT:** Epic files MUST be in `docs/epics/`, NOT in `docs/sprints/`.
If `docs/epics/` doesn't exist, create it first.

### Epic File: `docs/epics/EPIC-XXX-[name].md`

```markdown
---
epic_id: EPIC-XXX
status: active
created: YYYY-MM-DD
updated: YYYY-MM-DD
---

# EPIC-XXX: [Epic Title]

## Vision
[Why this epic matters - the big picture]

## Goal
[Clear, measurable epic goal]

## Success Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

## Scope

### In Scope
- [Deliverable 1]
- [Deliverable 2]

### Out of Scope
- [Excluded item 1]
- [Excluded item 2]

### Dependencies
- [Dependency 1]
- [Dependency 2]

## Sprint Breakdown

| Sprint | Goal | Duration | Status |
|--------|------|----------|--------|
| Sprint 1 | [Goal] | 2 weeks | Not Started |
| Sprint 2 | [Goal] | 2 weeks | Not Started |
| Sprint 3 | [Goal] | 1 week | Not Started |

## Risks & Mitigations
- [Risk 1]: [Mitigation]
- [Risk 2]: [Mitigation]

---

## Changelog

### v1.0.0 - YYYY-MM-DD
- Initial epic creation
- Participants: [user email], Claude
```

### Sprint Files: `docs/sprints/SPRINT-YYYY-MM-[epic]-sprint[N].md`

```markdown
# SPRINT: [Epic Name] Sprint [N] - [Sprint Title]

## Sprint Overview

**Sprint Goal**: [What this sprint achieves]
**Duration**: [X weeks] (YYYY-MM-DD to YYYY-MM-DD)
**Type**: [Infrastructure|Feature|Polish] sprint
**Progress:** 0% (0/N tasks complete)

**Success Criteria:**
- [Sprint-specific criterion 1]
- [Sprint-specific criterion 2]

---

## Sprint Tasks

### TASK-1: [Task Title] ([Effort])
**Priority:** HIGH

**Goal:** [What this task achieves]

**Implementation Notes:**
[Any guidance for implementation]

**Files:**
- `path/to/file.ts`

Follow: [ADR-XXX]
Apply: [pattern-name]
Avoid: [gotcha-name]

---

### TASK-2: [Task Title] ([Effort])
**Priority:** MEDIUM

...

---

## Accomplishments This Sprint

[To be filled as work progresses]

## Next Steps

[To be updated during sprint]

## Blockers

[To be updated if blockers arise]
```

---

## Graph Sync (IMPORTANT)

After creating the epic and sprint files, **you must sync them to the graph** so they're available for team collaboration and tracking:

```bash
ginko epic --sync
```

This will:
- Create Epic node: `(:Epic {id, title, goal, status, progress})`
- Create Sprint nodes: `(:Sprint {id, name, goal, progress})`
- Create Task nodes: `(:Task {id, title, status, effort, priority})`
- Establish relationships:
  - `(Epic)-[:CONTAINS]->(Sprint)`
  - `(Sprint)-[:CONTAINS]->(Task)`
  - `(Task)-[:MUST_FOLLOW]->(ADR)`
  - `(Task)-[:APPLIES_PATTERN]->(Pattern)`
  - `(Task)-[:AVOID_GOTCHA]->(Gotcha)`

**Complete workflow:**
1. Create `docs/epics/EPIC-XXX-name.md` with epic content
2. Create `docs/sprints/SPRINT-*.md` files for each sprint
3. Run `ginko epic --sync` to sync everything to graph
4. Confirm sync success message

---

**Remember:** The goal is to help the user think through their epic clearly, not to create perfect documentation. Quality thinking over complete forms. Natural conversation over bureaucratic planning.
