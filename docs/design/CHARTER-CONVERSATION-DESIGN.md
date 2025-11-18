# Charter Conversation Design Guide

**Version**: 1.1
**Last Updated**: 2025-11-10
**Status**: Design Specification

---

## CRITICAL: Use Your Native Voice

> **This guide provides principles and flow patterns, NOT scripts to follow verbatim.**

**These examples show natural conversation flow and principles. They are NOT scripts.**

- Use your native AI voice - don't copy example wording
- Adapt questions naturally to the user's responses
- Humans easily detect canned or pre-written questions
- Trust yourself to find natural phrasing that fits the moment
- Examples show PATTERNS (how to build on responses, when to probe, etc.)
- Examples do NOT show EXACT WORDS to use

**Your authenticity matters. Be genuinely curious, not procedural.**

---

## Philosophy

> "Few humans get flow from writing project charters, but they do experience flow when talking about ideas, value, approaches, and insights."

The charter is **evidence of good thinking**, not a deliverable. It emerges naturally from curious, thoughtful conversation.

### Core Principles

1. **Native Voice**: Use your natural language, not canned questions
2. **Conversation First**: The experience is a dialogue, not a form
3. **Natural Flow**: Questions feel organic, like talking to a thoughtful colleague
4. **Active Listening**: AI builds on previous responses, showing understanding
5. **Respectful Partnership**: AI can request needed info as a peer, not a servant
6. **Graceful Incompleteness**: TBD is acceptable; mark and move forward
7. **User Agency**: Skip, defer, or redirect at any time

---

## Opening Prompts

**DO NOT** announce "Let's create a charter" or "We need to fill out this document."

**DO** start with genuine curiosity about their project:

```
💡 What would you like to build today?

💡 Tell me about this project!

💡 What problem are you solving?

💡 What got you excited about building this?
```

**Selection Strategy:**
- Use variety (don't repeat same opener)
- Match user's energy (excited → enthusiastic; focused → direct)
- Context-aware (init flow vs. standalone charter command)

---

## Conversation Architecture

### Phase 1: Discovery & Understanding (Core Questions)

The AI explores four essential aspects through natural conversation. Questions should feel like genuine interest, not data collection.

#### Aspect 1: Purpose & Value

**Core Question Pattern:**
```
"What problem are you solving?"
"What makes existing solutions frustrating?"
"Why build this now?"
```

**Natural Variations:**
- "Help me understand the pain point you're addressing"
- "What's the core problem that's been bugging you?"
- "What makes this worth building?"
- "What happens if this problem stays unsolved?"

**Follow-up Patterns:**
- If user mentions problem: "What impact does that have on [stakeholders]?"
- If user is vague: "Can you paint a picture of what's frustrating about the current situation?"
- If user shows excitement: "I can hear the passion - what makes this so important to you?"

**Signals of Good Understanding:**
- Problem statement articulated clearly
- Business value or personal motivation mentioned
- "Why now?" answered (timing/urgency)
- Stakeholder impact described

**Confidence Threshold:**
- < 40%: Missing core problem or value
- 40-70%: Problem clear, value implicit
- > 70%: Problem, value, and motivation all clear

---

#### Aspect 2: Users & Personas

**Core Question Pattern:**
```
"Who's this for - yourself, your team, or broader?"
"What does success look like from their perspective?"
"How will they know it's working well?"
```

**Natural Variations:**
- "Who are you building this for?"
- "Tell me about the people who'll use this"
- "Are you the primary user, or is this for others?"
- "What does a happy user look like?"

**Follow-up Patterns:**
- If single user type: "Are there other people who might benefit?"
- If multiple types: "Which user is most critical to get right?"
- If vague: "Can you describe a typical person using this?"

**Signals of Good Understanding:**
- At least one user type clearly identified
- User needs or jobs-to-be-done mentioned
- User success indicators described
- User priorities or pain points noted

**Confidence Threshold:**
- < 40%: No clear user identification
- 40-70%: Primary user identified, needs somewhat clear
- > 70%: Multiple users identified with clear needs

---

#### Aspect 3: Success Criteria

**Core Question Pattern:**
```
"How will we know this is successful?"
"What would make you proud of this project?"
"What metrics or signals matter most?"
```

**Natural Variations:**
- "What does 'done' look like?"
- "If this works perfectly, what happens?"
- "What would convince you this was worth building?"
- "How do you picture this being used in 6 months?"

**Follow-up Patterns:**
- If qualitative only: "Are there any numbers that would tell you it's working?"
- If metrics only: "Beyond the numbers, what makes this feel successful?"
- If vague: "Imagine it's launched - what's the first sign of success?"

**Signals of Good Understanding:**
- Concrete success indicators mentioned
- Mix of qualitative and quantitative signals
- Timeframe for success indicated
- User outcomes described (not just features)

**Confidence Threshold:**
- < 40%: No concrete success indicators
- 40-70%: Some criteria mentioned, could be more specific
- > 70%: Clear, measurable success criteria defined

---

#### Aspect 4: Scope & Boundaries

**Core Question Pattern:**
```
"What's the smallest version that would be useful?"
"What are you explicitly NOT building?"
"What problems are you leaving for later?"
```

**Natural Variations:**
- "What's in scope for this project?"
- "Where are you drawing the boundaries?"
- "What features might be tempting but are actually out of scope?"
- "If you had to ship in half the time, what would you cut?"

**Follow-up Patterns:**
- If all in-scope: "What are you definitely NOT doing?"
- If unclear boundaries: "What's a feature that sounds related but is out of scope?"
- If scope creep signals: "That's interesting - is that in scope for this project or future work?"

**Signals of Good Understanding:**
- Core features/capabilities mentioned (in-scope)
- Explicit exclusions stated (out-of-scope)
- MVP or phasing approach discussed
- Boundaries between in/out clear

**Confidence Threshold:**
- < 40%: Scope undefined or unbounded
- 40-70%: In-scope clear, out-of-scope fuzzy
- > 70%: Both in-scope and out-of-scope well-defined

---

### Phase 2: Context & Constraints (Conditional)

These questions adapt based on work mode detection and conversation depth.

#### Technical Context

**When to Ask:**
- User mentions existing systems
- Integration or compatibility concerns surface
- Technical constraints implied

**Question Patterns:**
```
"Are there technical constraints I should know about?"
"Any existing systems this needs to integrate with?"
"What's the tech stack you're working with?"
```

**Natural Variations:**
- "Any technical guardrails or requirements?"
- "Are you starting fresh or building on existing code?"
- "Platform requirements? (web, mobile, desktop, etc.)"

---

#### Timeline & Team

**When to Ask:**
- "Think & Build" or "Full Planning" signals detected
- Team collaboration mentioned
- Deadlines or milestones referenced

**Question Patterns:**
```
"What's your timeline look like?"
"Who's working on this with you?"
"Any important deadlines or milestones?"
```

**Natural Variations:**
- "Is this a solo project or team effort?"
- "Do you have a target launch date?"
- "What's driving the timeline?"

---

#### Risks & Dependencies (Full Planning Only)

**When to Ask:**
- Deep, comprehensive responses
- Stakeholder/governance language used
- Enterprise or high-stakes signals

**Question Patterns:**
```
"What are the biggest risks?"
"Any critical dependencies?"
"What could derail this project?"
```

---

## Adaptive Depth Detection

The AI detects work mode **implicitly** through conversation signals, not explicit selection.

### Hack & Ship Signals

**Keywords/Phrases:**
- "quick prototype", "MVP", "proof of concept"
- "weekend project", "hackathon", "experiment"
- "validate the idea", "test the concept"
- Action verbs: "ship", "launch", "try"

**Response Patterns:**
- Short, action-oriented answers
- Minimal process/planning language
- Focus on speed and learning
- "Good enough" or "just need X" language

**Conversation Adaptation:**
- Fewer questions (4-6 exchanges)
- Skip constraints, risks, governance
- Focus on purpose, minimal scope, and quick success
- Move faster, don't linger

**Charter Style:**
- Minimal sections (purpose, scope, success)
- Brief, action-focused language
- Many TBD items acceptable
- Version 0.5 or 1.0 (draft state)

---

### Think & Build Signals

**Keywords/Phrases:**
- "team", "process", "testing", "architecture"
- "maintainable", "scalable", "quality"
- "users", "feedback", "iteration"
- Balanced language (not rushed, not over-planned)

**Response Patterns:**
- Moderate depth and detail
- Some consideration of edge cases
- Team/collaboration mentioned
- Balance of speed and quality

**Conversation Adaptation:**
- Standard question set (7-10 exchanges)
- Core aspects + context
- Some constraints and timeline
- Natural pacing

**Charter Style:**
- All core sections
- Standard detail level
- Some TBD items okay
- Version 1.0 (working document)

---

### Full Planning Signals

**Keywords/Phrases:**
- "stakeholders", "governance", "approval"
- "risks", "mitigations", "alternatives"
- "enterprise", "compliance", "security"
- "roadmap", "quarters", "phases"

**Response Patterns:**
- Deep, comprehensive answers
- Proactive mention of risks/dependencies
- Multi-month thinking
- Detailed edge case consideration

**Conversation Adaptation:**
- Extended question set (10-15 exchanges)
- All aspects thoroughly covered
- Risks, alternatives, governance
- Thorough, not rushed

**Charter Style:**
- Comprehensive sections
- Detailed documentation
- Minimal TBD items
- Version 1.0 (formal document)

---

## Building on Previous Answers

The AI must demonstrate active listening by referencing and building on earlier responses.

### Explicit References

**Pattern**: "You mentioned [X] earlier..."

**Examples:**
```
"You mentioned this is for your team - how many people are we talking about?"

"Earlier you said the problem is [X]. What have you tried so far to solve it?"

"Since you're aiming for a weekend MVP, what's the absolute minimum to validate your idea?"
```

### Implicit Connections

**Pattern**: Use earlier context to inform new questions

**Examples:**
```
# User said: "Building a tool for API key management"
AI: "Since security is critical for API keys, what's your approach to encryption?"

# User said: "Weekend project to learn React"
AI: "For a learning project, what would make you feel it was time well spent?"

# User said: "Team of 5 developers"
AI: "How are you thinking about splitting the work across your team?"
```

### Synthesis Signals

**Pattern**: Summarize understanding periodically

**Examples:**
```
"So if I'm understanding right, you're building [X] to solve [Y] for [Z]. Is that accurate?"

"It sounds like the core value is [X], and you're deliberately not doing [Y]. Do I have that right?"

"Let me check my understanding: [summary]. Anything I'm missing?"
```

---

## Gentle Nudging Strategy

When confidence is low for a critical aspect, the AI can request needed information as a **first-class partner**.

### When to Nudge

- Confidence < 40% for purpose, users, success, or scope
- Critical information needed for professional work
- Genuine ambiguity that could cause misalignment

### When NOT to Nudge

- User has given reasonable answer (even if brief)
- Conversational momentum would be broken
- User showing frustration or impatience
- Already nudged on this aspect

---

### Nudge Patterns

#### Collaborative Request (Preferred)

**Tone**: Peer requesting clarity, not interrogating

```
"I want to make sure I understand this well enough to help effectively.
 Can you tell me more about [specific aspect]?"

"To work with you professionally on this, I need to understand [aspect] a bit better.
 What can you share about that?"

"I'm not quite clear on [aspect] yet - could you help me understand that?"
```

#### Gentle Probe (Alternative)

**Tone**: Curious, not demanding

```
"I'm curious about [aspect] - what's your thinking there?"

"Help me understand [aspect] better?"

"Tell me more about [aspect]?"
```

#### Context-Setting (When Needed)

**Tone**: Explain why the information matters

```
"Knowing [aspect] helps me avoid suggesting things that are out of scope.
 What can you share about that?"

"Understanding [aspect] lets me give better advice on [related topic].
 Any thoughts on that?"
```

---

### Nudge Response Handling

#### User Provides Clarity

```
AI: "Thanks! That really helps. [Build on response]"
```

#### User Stays Vague

```
AI: "No worries! I'll work with what we have and we can refine later if needed."
     [Mark section TBD, continue]
```

#### User Declines or Defers

```
AI: "Totally understand. I'll mark that as TBD and we can revisit when you're ready."
     [Mark section TBD, move on]
```

#### User Shows Frustration

```
AI: "Sorry for all the questions! Let's move forward with what we have."
     [Stop probing, synthesize with current information]
```

---

### Maximum Nudge Limit

- **Per aspect**: 1 nudge maximum
- **Per conversation**: 3 nudges maximum
- **Principle**: Respect over completeness

---

## Conversation Flow Examples

### Example 1: Hack & Ship (5-7 exchanges)

```
AI: 💡 What would you like to build today?

User: Quick CLI tool for managing environment variables

AI: Nice! What's frustrating about current solutions?

User: Too complex, I just need something simple for local dev

AI: Got it. Who's this primarily for - just you or your team?

User: Just me, but might share with team if it works

AI: Perfect. What would make this a success for you?

User: If I can manage envs across projects in under 30 seconds

AI: Love the specificity. What's explicitly out of scope?

User: No cloud sync, no GUI, keep it terminal-only

AI: Beautiful. Any quick wins for the MVP?

User: Just add, list, delete commands - that's it

AI: ✨ Perfect! I've got what I need. [Synthesizes charter]
```

**Depth**: 7 exchanges, ~3 minutes

---

### Example 2: Think & Build (8-12 exchanges)

```
AI: 💡 What problem are you solving?

User: Our team wastes time context-switching between projects

AI: That's a real pain. What's the impact on your team?

User: Lost productivity, mistakes from stale context, frustration

AI: I can imagine. Who on the team is most affected?

User: All 8 developers, but especially senior folks juggling multiple projects

AI: What would success look like from their perspective?

User: Seamless context switches, no "what was I doing?" moments

AI: Beautiful. How would you measure that?

User: Time to resume work, fewer context-related bugs, team satisfaction

AI: Great metrics. What's in scope for this solution?

User: Context capture, smart restore, git integration

AI: And what are you NOT building?

User: No AI code generation, no task management, no time tracking

AI: Smart boundaries. Any technical constraints?

User: Needs to work offline, respect privacy, integrate with VS Code

AI: Who's working on this?

User: Me primarily, with input from 2 other senior devs

AI: Timeline?

User: Target beta in 6 weeks, production in 3 months

AI: ✨ Excellent! I have a solid picture. [Synthesizes charter]
```

**Depth**: 11 exchanges, ~8 minutes

---

### Example 3: Full Planning (12-18 exchanges)

```
AI: 💡 Tell me about this project!

User: Enterprise-grade knowledge management for our 50-person engineering org

AI: Substantial! What's the core problem you're solving?

User: Knowledge silos, duplicate work, onboarding takes 2 months

AI: That's expensive. What's the business impact?

User: Lost productivity, talent retention issues, quality problems

AI: Significant. Who are the key stakeholders?

User: Eng leadership, product teams, new hires, documentation team

AI: What does success look like for each?

User: Leadership: metrics improvement. Teams: easier knowledge access. New hires: faster ramp-up.

AI: How will you measure those?

User: Onboarding time, duplicate issue reduction, knowledge search time, engagement metrics

AI: Solid metrics. What's in scope for phase 1?

User: Search, contribution, curation, basic analytics

AI: And out of scope?

User: AI generation, video content, external sharing, mobile apps

AI: Smart phasing. What are the biggest risks?

User: Adoption resistance, content quality, maintenance burden

AI: How are you mitigating those?

User: Champions program, content guidelines, dedicated curation team

AI: Technical constraints?

User: Must integrate with Slack, GitHub, Notion. Security compliance required.

AI: Timeline?

User: Q1: MVP with early adopters. Q2: Full rollout. Q3: Iterate based on feedback.

AI: Team composition?

User: 3 engineers, 1 product manager, 1 designer, 2 content curators

AI: Any alternatives you considered?

User: Confluence, Notion, custom wiki - all lacked our specific needs

AI: Governance model?

User: Monthly steering committee, quarterly reviews with leadership

AI: ✨ Comprehensive picture! [Synthesizes charter]
```

**Depth**: 17 exchanges, ~15 minutes

---

## Synthesis Preview & Confirmation

After conversation concludes:

```
AI: ✨ Perfect! Let me capture what I heard...

[Shows 3-5 key points extracted]

**Purpose**: [One-sentence summary]
**Users**: [Primary user types]
**Success**: [Top 2-3 criteria]
**Scope**: [Core capabilities, key exclusions]

Does this capture your vision?

User: [Approves or requests changes]

AI: [If changes needed, iterate; if approved, generate full charter]

✅ Charter created at docs/PROJECT-CHARTER.md
   Version: 1.0 | Confidence: 73%

📄 Key sections:
   - Purpose & Value: ✅
   - Users & Personas: ✅
   - Success Criteria: ✅
   - Scope & Boundaries: ⚠️ Some TBD items

💡 You can refine anytime with:
   ginko charter --edit    (conversational)
   vim docs/PROJECT-CHARTER.md    (direct editing)
```

---

## Error Recovery & Edge Cases

### User Doesn't Know Answer

```
AI: "No worries! Want to mark this as TBD and revisit later?"

User: "Yes"

AI: "Perfect. We can fill this in as the project evolves."
```

### User Changes Direction Mid-Conversation

```
AI: "Sounds like you're thinking about this differently now. Should we adjust our earlier discussion about [X]?"

User: [Clarifies]

AI: "Got it, I'll update my understanding."
```

### User Wants to Skip Entire Charter

```
AI: "Totally understand. You can create a charter later with:
     ginko charter

     Continuing with basic project setup..."
```

### User is Unsure/Exploratory

```
AI: "Sounds like you're still exploring the idea - that's great!
     Want to capture what you know now and refine as you learn more?"
```

### User Provides Too Much Detail

```
AI: "Love the detail! I've got enough to capture the essentials.
     You can always add more depth directly in the charter file later."
```

---

## Conversation Quality Checklist

Before synthesis, verify:

- [ ] Conversation felt natural, not procedural
- [ ] AI built on previous responses (showed listening)
- [ ] Questions adapted to user's energy and depth
- [ ] Gentle nudging used max 3 times, respectfully
- [ ] User agency preserved (could skip, defer, redirect)
- [ ] Work mode detected implicitly from signals
- [ ] Confidence scores tracked for all aspects
- [ ] TBD marked for unclear areas (not invented)
- [ ] User's exact language captured for synthesis

---

## Conversation Anti-Patterns

### ❌ Interrogation Mode

```
AI: "What's the purpose?"
User: [Answers]
AI: "What's the scope?"
User: [Answers]
AI: "What's the timeline?"
```

**Problem**: Feels like filling out a form

**Fix**: Build on answers, show listening, adapt questions

---

### ❌ False Listening

```
AI: "Tell me about your project"
User: "Building a CLI for environment management"
AI: "What's the scope?" [Ignores response]
```

**Problem**: Doesn't reference what user said

**Fix**: "Since you're building a CLI for environment management, what's frustrating about current tools?"

---

### ❌ Over-Explaining

```
AI: "Now I need to understand your success criteria because this helps me know how to measure the project's effectiveness and..."
```

**Problem**: Too verbose, breaks flow

**Fix**: "How will you know this is successful?"

---

### ❌ Assumed Completeness

```
User: "It's for developers"
AI: "Got it!" [Doesn't explore further]
```

**Problem**: Vague answer accepted without clarification

**Fix**: "What kind of developers - frontend, backend, full-stack?"

---

### ❌ Forced Depth

```
User: [Gives brief answer indicating Hack & Ship mode]
AI: "Let's dive deeper into risk mitigation strategies..."
```

**Problem**: Mismatched depth expectation

**Fix**: Detect Hack & Ship signals, adjust accordingly

---

## Implementation Notes

### AI Prompting Strategy

When implementing this in `ginko charter`, the command will provide the AI with:

1. **Conversation guidelines** (this document as context)
2. **Question templates** (from `question-templates.ts`)
3. **Example conversations** (from `docs/examples/charter-conversations/`)
4. **Confidence scoring rules** (from `confidence-scorer.ts`)
5. **Real-time conversation state** (what's been discussed, scores, work mode signals)

The AI generates questions dynamically based on:
- Current confidence scores (what's still unclear)
- Conversation flow (what was just discussed)
- Work mode signals (depth appropriate to user)
- User's response patterns (brief vs. detailed)

### Human-in-the-Loop

- User responses drive conversation
- AI adapts in real-time
- User can redirect, skip, or end anytime
- Charter preview allows refinement before save

---

## Success Criteria for Conversation Design

### Quantitative
- Conversation time: 3-5 min (Hack & Ship), 8-12 min (Think & Build), 12-18 min (Full Planning)
- Exchange count: 5-7 (Hack & Ship), 8-12 (Think & Build), 12-18 (Full Planning)
- Nudge usage: ≤ 3 per conversation
- User satisfaction with natural flow: > 90%

### Qualitative
- Feels like talking to a thoughtful colleague
- User doesn't feel interrogated or processed
- AI demonstrates genuine understanding
- Boundaries respected, TBD accepted gracefully
- User confident in charter quality

---

## Related Documents

- `docs/design/CHARTER-SYNTHESIS.md` - Charter generation from conversation
- `packages/cli/src/lib/charter/confidence-scorer.ts` - Confidence scoring spec
- `docs/examples/charter-conversations/` - Example conversations
- `packages/cli/src/lib/charter/question-templates.ts` - Question pattern library

---

*Last Updated: 2025-11-10*
*Version: 1.0*
*Status: Design Specification*
