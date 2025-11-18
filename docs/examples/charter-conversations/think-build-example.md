# Charter Conversation Example: Think & Build Mode

> **IMPORTANT: Use Your Native Voice**
>
> This example shows natural conversation FLOW and PRINCIPLES, not exact words to copy.
> - These are illustrative patterns, not scripts
> - Adapt questions naturally using your own voice
> - Humans detect canned questions easily
> - Trust yourself to find natural phrasing
> - Focus on the PATTERNS shown: building on responses, when to probe, how to adapt depth

**Scenario**: Developer building a context management tool for professional use
**Duration**: ~10 minutes
**Exchanges**: 11
**Work Mode**: Think & Build (detected from balanced depth and team mentions)
**Final Confidence**: 73% - Good foundation, some TBD items

---

## Conversation

### Exchange 1: Opening

**AI**: 💡 What problem are you solving?

**User**: My team and I waste tons of time context-switching between projects. We lose track of what we were working on and it kills productivity.

**Analysis**:
- **Signal Detection**: "team", "productivity" → Think & Build signals
- **Aspect**: Purpose (problem statement)
- **Confidence**: Purpose 30% (problem mentioned, needs depth)
- **User Voice**: "waste tons of time", "kills productivity" - emotional language, preserve

---

### Exchange 2: Impact Exploration

**AI**: That's a real pain. What's the impact on your team?

**User**: We're losing probably 30 minutes every time someone switches projects - that's 2-3 times a day. Plus we make mistakes from stale context, which causes bugs.

**Analysis**:
- **Signal Detection**: Specific metrics ("30 minutes", "2-3 times") + quality impact ("bugs")
- **Aspect**: Purpose (quantified impact)
- **Confidence**: Purpose 55% (problem + impact clear, motivation emerging)
- **Building**: Referenced "team" from previous answer, showing listening

---

### Exchange 3: User Identification

**AI**: I can imagine. Who on the team is most affected by this?

**User**: All 8 developers feel it, but especially our senior folks who are juggling 3-4 projects simultaneously. They're the ones getting pulled in every direction.

**Analysis**:
- **Signal Detection**: Team size (8), user segmentation (senior vs. all)
- **Aspect**: Users (types identified)
- **Confidence**: Users 60% (clear primary users, needs articulated)
- **Note**: "Juggling 3-4 projects" - context for problem severity

---

### Exchange 4: Success Definition (User Perspective)

**AI**: What would success look like from their perspective?

**User**: Seamless context switches - like they never left the project. No "what was I doing?" moments. Just instant return to flow state.

**Analysis**:
- **Signal Detection**: "seamless", "flow state" → Quality-focused outcomes
- **Aspect**: Success (qualitative criteria)
- **Confidence**: Success 50% (good qualitative, needs quantitative)
- **User Voice**: "what was I doing?" - powerful quote for problem

---

### Exchange 5: Success Metrics

**AI**: Beautiful. How would you measure that in practice?

**User**: Time to resume productive work - should be under 1 minute. Also looking at context-related bugs, want to see those drop. And honestly, team satisfaction - if they're less frustrated.

**Analysis**:
- **Signal Detection**: Multiple metrics (time, quality, satisfaction) → Comprehensive
- **Aspect**: Success (quantitative + qualitative)
- **Confidence**: Success 75% (well-defined mix of metrics)
- **Listening**: Asked for metrics after getting qualitative criteria

---

### Exchange 6: Scope Exploration

**AI**: Great metrics. What's in scope for this solution?

**User**: Context capture - like git state, open files, uncommitted work. Smart restore that gets them back where they were. Some kind of session logging so they can see their history. And it needs to work offline.

**Analysis**:
- **Signal Detection**: Specific features listed + constraint ("offline")
- **Aspect**: Scope (in-scope features)
- **Confidence**: Scope 55% (in-scope clear, out-of-scope needed)
- **Note**: Technical detail emerging (git integration, offline-first)

---

### Exchange 7: Boundaries (Gentle Probe)

**AI**: That's solid. What are you explicitly NOT building?

**User**: Good question. We're not building AI code generation - that's not our purpose. Not doing task management - we have tools for that. No time tracking either, that's a different problem.

**Analysis**:
- **Signal Detection**: Clear boundaries with reasoning ("not our purpose", "different problem")
- **Aspect**: Scope (out-of-scope)
- **Confidence**: Scope 80% (both in and out clear with rationale)
- **Nudge Success**: User engaged with probe, gave thoughtful response

---

### Exchange 8: Technical Constraints

**AI**: Smart boundaries. Any technical constraints I should know about?

**User**: Must work offline - that's non-negotiable. Needs to respect privacy, so local-first storage. We're on macOS and Linux primarily. Oh, and it should integrate with VS Code since that's what everyone uses.

**Analysis**:
- **Signal Detection**: "non-negotiable", "must", "should" → Priority levels
- **Aspect**: Context (constraints)
- **Confidence**: Context 70% (technical requirements clear)
- **Note**: Privacy concern suggests professional/team usage

---

### Exchange 9: Team & Timeline

**AI**: Got it. Who's working on this project?

**User**: I'm leading development, with help from 2 other senior developers who'll contribute. We're thinking beta in about 6 weeks, then production release maybe 3 months out?

**Analysis**:
- **Signal Detection**: Team structure + timeline → Think & Build confirmation
- **Aspect**: Context (team, timeline)
- **Confidence**: Context 65% (team clear, timeline tentative)
- **Note**: Question marks on timeline → Some uncertainty, preserve

---

### Exchange 10: User Outcomes Confirmation

**AI**: Since you mentioned your senior developers are juggling multiple projects, how does this help their specific workflow?

**User**: They can switch projects instantly without losing mental state. Current process is like rebuilding a puzzle every time - finding the right files, remembering what they were testing, getting the right git branch. This should make it automatic.

**Analysis**:
- **Signal Detection**: Workflow detail + current pain → Deep understanding
- **Aspect**: Users (needs refinement)
- **Confidence**: Users 75% (needs very clear, outcomes specific)
- **Building**: Explicitly referenced "juggling multiple projects" from earlier

---

### Exchange 11: Integration Check

**AI**: That puzzle analogy is perfect. Last thing - you mentioned VS Code integration. Are there other tools this needs to work with?

**User**: Git is essential - that's our primary version control. Terminal state would be nice but not critical. Probably skip other IDEs for v1, focus on getting VS Code right first.

**Analysis**:
- **Signal Detection**: Prioritization ("essential" vs. "nice", "skip for v1") → Phasing
- **Aspect**: Scope (dependencies, priorities)
- **Confidence**: Overall 73% (all core aspects covered adequately)
- **Decision**: Ready to synthesize - good foundation established

---

## Confidence Scores (Final)

```json
{
  "purpose": {
    "score": 75,
    "signals": [
      "Problem: 30 minutes lost per context switch, 2-3x daily",
      "Impact: Productivity loss + context-related bugs",
      "Motivation: Team efficiency and developer satisfaction",
      "Users affected: 8 developers, especially seniors with 3-4 projects"
    ],
    "missing": [],
    "needsProbing": false
  },
  "users": {
    "score": 75,
    "signals": [
      "Primary: 8 developers on team",
      "Emphasis: Senior developers juggling 3-4 projects",
      "Needs: Instant context switching, flow state preservation",
      "Outcomes: No 'what was I doing?' moments, productive immediately"
    ],
    "missing": ["Secondary users not explored (acceptable)"],
    "needsProbing": false
  },
  "success": {
    "score": 75,
    "signals": [
      "Quantitative: Resume work in < 1 minute",
      "Quality: Reduction in context-related bugs",
      "Satisfaction: Less team frustration",
      "Qualitative: Seamless switches, flow state maintained"
    ],
    "missing": ["Specific bug reduction target (TBD)"],
    "needsProbing": false
  },
  "scope": {
    "score": 80,
    "signals": [
      "In-scope: Context capture (git, files, uncommitted work)",
      "In-scope: Smart restore, session logging",
      "In-scope: VS Code integration (priority)",
      "Out-of-scope: AI code generation, task management, time tracking",
      "Dependencies: Git essential, terminal nice-to-have",
      "Boundaries: Focus v1 on VS Code, defer other IDEs"
    ],
    "missing": [],
    "needsProbing": false
  },
  "context": {
    "score": 70,
    "signals": [
      "Team: Lead + 2 senior developers",
      "Timeline: Beta in 6 weeks, production in 3 months (tentative)",
      "Constraints: Must work offline (non-negotiable)",
      "Privacy: Local-first storage",
      "Platform: macOS, Linux primarily"
    ],
    "missing": ["Budget, dependencies, risks not discussed (acceptable)"],
    "needsProbing": false
  },
  "overall": 73,
  "workMode": "think-build",
  "qualityLevel": "good"
}
```

---

## Synthesized Charter

```markdown
# Project Charter: Context Manager

**Status**: Active
**Work Mode**: Think & Build
**Created**: 2025-11-10
**Last Updated**: 2025-11-10
**Version**: 1.0
**Confidence**: 73% - Good foundation, some TBD items

---

## Purpose & Value

Our team of 8 developers "wastes tons of time context-switching between projects" - approximately 30 minutes per switch, happening 2-3 times daily. This productivity loss is compounded by context-related bugs that occur when developers work with stale mental context.

**Problem Statement**: Current context switching requires "rebuilding a puzzle every time" - finding files, remembering what was being tested, checking out the right git branch. This "kills productivity" and prevents flow state.

**Business Value**:
- Saves 1-2.5 hours per developer daily (30 min × 2-3 switches)
- Reduces context-related bugs in production
- Improves developer satisfaction and flow state
- Particularly critical for senior developers juggling 3-4 concurrent projects

**Motivation**: Team efficiency is suffering; senior developers (most valuable) are most affected.

---

## Users & Personas

**Primary Users**: Development team (8 developers)
- **Needs**: Seamless project switching, instant context restoration, zero cognitive overhead
- **Success**: "No 'what was I doing?' moments" - immediate return to productive work
- **Current Pain**: Manual context reconstruction taking 30 minutes per switch

**Emphasis**: Senior developers managing 3-4 projects simultaneously
- **Needs**: Fast switching without mental state loss, reliable context capture
- **Success**: Instant flow state recovery, as if they never left the project
- **Priority**: Highest impact users

---

## Success Criteria

How we'll know this is working well:

- [ ] Resume productive work in under 1 minute (vs. 30 minutes currently)
- [ ] Zero "what was I doing?" moments reported by team
- [ ] Reduction in context-related bugs [TBD - target percentage to define]
- [ ] Improved team satisfaction scores (less frustration)
- [ ] Seamless context switches - users feel they never left the project
- [ ] 80%+ daily usage among team (indicates value)

**Timeframe**: Measure within 4 weeks of production release

---

## Scope & Boundaries

### In Scope (v1.0)

**Core Features**:
- Context capture:
  - Git state (branch, uncommitted work, position in files)
  - Open files and editor layout
  - Uncommitted work preservation
- Smart restore:
  - Automatic context restoration
  - Return to exact previous state
- Session logging:
  - Timeline of work across projects
  - Session history and patterns

**Integration**:
- VS Code integration (priority - "what everyone uses")
- Git integration (essential)
- Terminal state (nice-to-have, not critical)

**Platform**:
- macOS and Linux support (team's primary platforms)
- Offline-first operation (non-negotiable requirement)
- Local-first storage (privacy-respecting)

### Out of Scope (v1.0)

- **Not building**: AI code generation ("not our purpose")
- **Not building**: Task/project management (use existing tools)
- **Not building**: Time tracking ("different problem")
- **Deferred**: Other IDE integrations beyond VS Code (focus on getting VS Code right first)
- **Deferred**: Terminal state (nice-to-have, prioritize core first)

### TBD (To Be Determined)

- [TBD - Windows support - depends on team needs]
- [TBD - Context sharing mechanism - team collaboration aspect unclear]
- [TBD - Session analytics depth - define based on usage]
- [TBD - Target for bug reduction metric]

---

## Context & Constraints

**Technical Constraints**:
- **Must work offline** (non-negotiable - core requirement)
- **Privacy-respecting**: Local-first storage, no external tracking
- **Platform**: macOS and Linux (team's primary development environments)
- **Fast performance**: Context restore must be < 1 minute (success criterion)
- **Git-native**: Essential integration with version control

**Timeline**:
- **Beta**: ~6 weeks from start (tentative)
- **Production**: ~3 months from start (tentative)
- [TBD - Milestone breakdown and release criteria]

**Team**:
- **Lead**: [User] (primary development)
- **Contributors**: 2 senior developers (part-time contribution)
- **Users**: 8 developers (testing and feedback)

**Dependencies**:
- Git (essential)
- VS Code API (for editor integration)
- Node.js runtime [Assumed - verify platform]

---

## Changelog

### v1.0 - 2025-11-10 - Initial Creation
- Created from conversation during project planning
- Confidence: 73% - Good foundation with some TBD items
- Participants: [User], Claude
- Session duration: ~10 minutes (11 exchanges)
- **Work Mode**: Think & Build - Standard depth for iterative team development
- **Well-defined**:
  - Clear problem with quantified impact (30 min loss, 2-3x daily)
  - Specific user needs (8 developers, emphasis on seniors)
  - Mix of quantitative and qualitative success criteria
  - Detailed scope with explicit in/out boundaries
  - Technical constraints and priorities clear
- **TBD Items**:
  - Windows platform support (depends on needs)
  - Context sharing/team features (unclear if needed)
  - Specific bug reduction targets (metric to define)
  - Milestone breakdown for beta/production
- **Philosophy**: Balance speed with quality, iterate based on team feedback

---

*This charter is a living document. Refine through conversation (`ginko charter --edit`) or direct markdown editing.*
```

---

## Key Observations

### What Worked Well

1. **Natural Flow**: Questions built logically on previous answers
2. **Active Listening**: Multiple references to earlier responses:
   - Exchange 3: "Who's most affected?" (built on "team" from E1)
   - Exchange 10: "Senior developers juggling projects" (callback to E3)
   - Exchange 11: "You mentioned VS Code" (built on E8)
3. **Adaptive Depth**: Detected Think & Build mode by Exchange 3, maintained appropriate depth
4. **Gentle Probing**: Exchange 7 probe ("What are you NOT building?") yielded great boundary clarity
5. **Voice Preservation**: Key phrases preserved:
   - "waste tons of time", "kills productivity"
   - "what was I doing?"
   - "rebuilding a puzzle every time"
   - "non-negotiable"
6. **Balanced Coverage**: All four core aspects well-explored without over-asking

### Conversation Techniques Demonstrated

**Building Pattern** (Exchange 10):
```
Earlier mention: "senior folks juggling 3-4 projects"
Callback: "Since you mentioned your senior developers are juggling multiple projects..."
Result: Deeper insight into specific workflow impact
```

**Metric Progression** (Exchanges 4-5):
```
E4: Asked for qualitative success ("What would success look like?")
E5: Then asked for quantitative ("How would you measure that?")
Result: Comprehensive success criteria (qualitative + quantitative)
```

**Gentle Boundary Probe** (Exchange 7):
```
After getting in-scope (E6), asked: "What are you explicitly NOT building?"
Result: User engaged thoughtfully, provided rationale for exclusions
```

### TBD Items Marked Appropriately

- **Windows support**: Not discussed, platform unclear
- **Context sharing**: Hinted at but not detailed
- **Bug reduction target**: Metric type mentioned, specific target missing
- **Milestone breakdown**: Timeline tentative (question marks preserved)

### Charter Characteristics for Think & Build

- **Standard sections**: All core aspects covered
- **Balanced detail**: Not minimal, not exhaustive
- **Some TBD**: Acknowledged gaps without inventing
- **Version 1.0**: Working document, ready for development
- **Team context**: Timeline, team structure, constraints included
- **Actionable**: Clear enough to begin work with confidence

---

## Conversation Quality Score

| Aspect | Score | Notes |
|--------|-------|-------|
| **Felt Natural** | 9/10 | Conversational flow, not checklist-like |
| **Active Listening** | 10/10 | Multiple callbacks, built on responses |
| **Depth Appropriate** | 9/10 | Balanced for Think & Build mode |
| **Gentle Nudging** | 10/10 | One well-timed probe, respectfully done |
| **User Agency** | 9/10 | User led, AI guided with questions |
| **Work Mode Detection** | 10/10 | Detected by Exchange 3, adapted appropriately |
| **Voice Preservation** | 10/10 | Key phrases captured verbatim |
| **Comprehensiveness** | 8/10 | Good coverage, some optional depth skipped |

**Overall**: Excellent example of Think & Build conversation - balanced depth, natural flow, strong listening.

---

## Comparison to Hack & Ship

| Aspect | Hack & Ship | Think & Build |
|--------|-------------|---------------|
| **Duration** | 5 min | 10 min |
| **Exchanges** | 7 | 11 |
| **Depth** | Minimal | Standard |
| **Probing** | 1 gentle probe | 1 gentle probe + follow-ups |
| **Context** | Limited | Team, timeline, constraints |
| **TBD Items** | Many (acceptable) | Some (targeted) |
| **Confidence** | 62% (workable) | 73% (good) |
| **Charter Length** | ~200 words | ~500 words |

**Key Difference**: Think & Build explores team dynamics, timeline, and constraints that Hack & Ship skips.

---

*This example demonstrates standard charter creation for iterative team development scenarios.*
