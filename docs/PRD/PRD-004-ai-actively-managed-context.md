# PRD-004: AI-Actively-Managed Context Loading

## Problem Statement

Current AI assistants operate with passive context - they receive information at session start and work with what they're given. This leads to:

- **Incomplete Understanding**: AI doesn't know what it doesn't know
- **Misaligned Work**: AI proceeds with partial context, creating rework
- **Hidden Gaps**: Context deficiencies only surface when problems occur
- **Cognitive Overload**: Loading everything upfront overwhelms both AI and human
- **Static Context**: No adaptation as work progresses through phases

The result is reduced effectiveness, increased vibechecks, and broken flow states.

## Solution Overview

Implement an AI-actively-managed context system where the AI:
1. **Self-assesses** its context quality at session start
2. **Identifies gaps** in understanding before starting work
3. **Progressively loads** context based on current phase
4. **Maintains awareness** through Context Reflexes
5. **Updates understanding** as discoveries are made

## User Stories

### As an AI Assistant
- I want to assess my context quality so I can identify gaps before starting
- I want to ask clarifying questions early to prevent misaligned work
- I want to load relevant patterns when I need them, not all upfront
- I want to track my understanding across the hierarchy (PRD→Architecture→Sprint→Task)

### As a Developer
- I want the AI to tell me when it lacks context rather than guessing
- I want context loading to be natural and non-disruptive
- I want to see the AI's confidence level in its understanding
- I want the AI to learn from our session and improve its context

## Success Criteria

### Quantitative Metrics
- **Context Score**: Maintain >70% context score during active work
- **Gap Detection**: Identify 90% of context gaps before they cause issues
- **Load Efficiency**: Load <20% of available context, but the right 20%
- **Vibecheck Reduction**: 50% fewer alignment corrections needed
- **Time to Productive**: 30% faster from session start to effective work

### Qualitative Metrics
- AI naturally references context hierarchy in explanations
- Developers report feeling "understood" by the AI
- Context loading feels organic, not mechanical
- Flow states are preserved, not interrupted

## Core Features

### 1. Context Hierarchy Tracking
```
PRD (Why) → Architecture (What) → Sprint (How) → Task (Now)
```
- Load and maintain awareness of full hierarchy
- Every action traceable up the ladder
- Identify missing levels

### 2. Context Assessment Scoring
```typescript
{
  understanding: 85,  // Do I know WHY?
  approach: 70,      // Do I know WHAT?
  constraints: 90,   // Do I know limits?
  patterns: 60       // Do I have examples?
}
```

### 3. Progressive Loading Strategy
- **Initial**: Core requirements + current task
- **On-Demand**: Patterns as needed
- **Just-in-Time**: Gotchas when relevant

### 4. Context Reflexes
- "Why am I doing this?" (every 30 min)
- "Have we done this before?" (before implementing)
- "Something feels off" (when confused)
- "Update my understanding" (after discoveries)

### 5. Gap Detection & Resolution
- Identify missing context types
- Suggest specific searches
- Ask targeted questions
- Load from multiple sources

## Technical Requirements

### Context Sources
- `.ginko/context/modules/` - Pattern library
- `docs/` - PRD, Architecture, ADRs
- `.ginko/sessions/` - Historical handoffs
- `.ginko/sprint/` - Current planning
- Git history - Recent changes and patterns

### Assessment Generation
- Generate assessment prompt at session start
- Include self-evaluation questions
- Provide search commands
- Track confidence scores

### Progressive Loading
- Phase-aware loading maps
- Relevance scoring
- Semantic search capability
- Caching for performance

## Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create ActiveContextManager service
- [ ] Implement context hierarchy tracking
- [ ] Add assessment scoring system

### Phase 2: Integration (Week 2)
- [ ] Enhance ginko start with assessment
- [ ] Add Context Reflexes to CLAUDE.md
- [ ] Implement progressive loading

### Phase 3: Intelligence (Week 3)
- [ ] Add gap detection algorithms
- [ ] Implement semantic search
- [ ] Create recommendation engine

### Phase 4: Refinement (Week 4)
- [ ] Add developer profile learning
- [ ] Optimize loading performance
- [ ] Implement caching strategies

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Over-prompting disrupts flow | High | Use reflexes, not constant prompts |
| Slow context loading | Medium | Cache frequently used modules |
| Incorrect gap detection | Medium | Allow manual override |
| Privacy concerns | Low | All processing local |

## Dependencies

- Context Search service (existing)
- Module Generator (existing)
- Local AI for assessment (planned)
- Statusline system (planned)

## Future Enhancements

1. **Learning System**: Track which context actually helps
2. **Team Patterns**: Share context modules across team
3. **Context Drift Detection**: Notice when docs become stale
4. **Automatic Capture**: Create modules from discoveries
5. **Multi-Modal Context**: Include diagrams, screenshots

## Success Indicators

Month 1:
- Context scores consistently >60%
- Developers report better AI understanding

Month 3:
- Context scores >75%
- 50% reduction in clarification requests
- Measurable flow improvement

Month 6:
- Context becomes invisible (just works)
- AI feels like informed teammate
- New patterns automatically captured

---

*This PRD establishes the vision for AI that actively manages its own context, creating more effective and aligned human-AI collaboration.*