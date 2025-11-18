# Charter Conversation Design - Quick Reference

**Purpose**: Fast lookup for key design patterns and decisions

---

## Core Philosophy (One Sentence)

> "Charter emerges naturally from asking 'What would you like to build?' - it's evidence of good thinking, not a deliverable."

---

## Opening Prompts (Pick One)

```
💡 What would you like to build today?
💡 Tell me about this project!
💡 What problem are you solving?
💡 What got you excited about building this?
```

**DON'T**: "Let's create a project charter"

---

## The Four Core Aspects

1. **Purpose & Value**: What problem? Why now? What impact?
2. **Users & Personas**: Who's this for? What do they need?
3. **Success Criteria**: How will we know it's working?
4. **Scope & Boundaries**: What's in? What's out? What's TBD?

---

## Work Mode Detection (Implicit)

| Mode | Signals | Duration | Confidence Target |
|------|---------|----------|-------------------|
| **Hack & Ship** | "quick", "MVP", "weekend" | 5 min, 7 exchanges | 60%+ (workable) |
| **Think & Build** | "team", "process", "testing" | 10 min, 11 exchanges | 70%+ (good) |
| **Full Planning** | "stakeholders", "governance", "risks" | 18 min, 17 exchanges | 85%+ (excellent) |

---

## Confidence Scoring Thresholds

- **< 40%**: Missing critical info → Gentle nudge needed
- **40-70%**: Workable minimum → Optional refinement
- **> 70%**: Good enough → Proceed to synthesis

---

## Gentle Nudging Rules

- **Maximum**: 1 nudge per aspect, 3 total per conversation
- **Tone**: Peer requesting, not interrogating
- **Pattern**: "I want to make sure I understand this well enough to help effectively. Can you tell me more about [aspect]?"
- **Fallback**: "No worries! I'll mark [aspect] as TBD and we can revisit later."

---

## Active Listening Patterns

1. **Explicit Reference**: "You mentioned [X] earlier..."
2. **Implicit Connection**: Use earlier context in new questions
3. **Synthesis Check**: "So if I'm understanding right..."

**Example**:
```
User: "Building this for my 8-person team"
AI: "Since you have an 8-person team, how are you thinking about rollout?"
```

---

## Synthesis Rules

1. **Preserve User Voice**: Use exact quotes for key statements
2. **Never Invent**: Mark unclear areas as TBD
3. **Organize Thematically**: Create coherent narrative from fragments
4. **Adapt to Mode**: Depth matches conversation signals

---

## TBD Handling

```markdown
### Good TBD Examples
- [TBD - Authentication strategy to be determined after security review]
- [TBD - Team size depends on Phase 1 success]
- [Maybe Later: Mobile app only if web adoption > 80%]
- [Assumed: Node.js runtime - verify with team]
```

---

## Charter Length by Mode

| Mode | Words | Sections | Version | TBD Items |
|------|-------|----------|---------|-----------|
| Hack & Ship | ~200 | Core only | 0.5 or 1.0 | Many (ok) |
| Think & Build | ~500 | Core + context | 1.0 | Some (targeted) |
| Full Planning | ~2000 | Comprehensive | 1.0 | Few (Phase 3) |

---

## Conversation Quality Checklist

Before synthesis:
- [ ] Felt natural, not procedural
- [ ] AI built on previous responses
- [ ] Questions adapted to user's energy
- [ ] Gentle nudging (≤ 3 times, respectful)
- [ ] User agency preserved
- [ ] Work mode detected implicitly
- [ ] Voice preservation planned
- [ ] TBD marked for unclear areas

---

## Anti-Patterns to Avoid

❌ **Interrogation**: "What's the purpose? What's the scope? What's the timeline?"
✅ **Conversation**: Build on responses, show listening

❌ **False Listening**: Ignore what user said
✅ **Active Listening**: Reference previous answers

❌ **Invented Detail**: "Built with React and deployed on AWS" (user never said)
✅ **TBD Marking**: "[TBD - Tech stack to be determined]"

❌ **Corporate Speak**: "Leverage synergies in the developer experience domain"
✅ **User Voice**: "Developers waste 30 minutes every context switch"

---

## Key Design Decisions

1. **Implicit Mode Detection**: Detect from signals, don't ask
2. **Peer Partnership**: AI can request needed info respectfully
3. **TBD Acceptable**: Mark unclear, don't force completeness
4. **Voice Preservation**: Use exact user language
5. **Confidence-Driven**: Score guides depth, not mechanical rules
6. **Changelog Required**: Track all charter changes

---

## Quick Decision Tree

```
Start conversation
  ↓
Detect work mode from signals (by exchange 3)
  ↓
Ask about 4 core aspects (purpose, users, success, scope)
  ↓
Calculate confidence after each exchange
  ↓
Confidence < 40% for critical aspect?
  → Yes: Gentle nudge (if < 3 total nudges)
  → No: Continue
  ↓
Overall confidence > 70% OR all aspects > 40% OR stop signals?
  → Yes: Synthesize charter
  → No: Ask next question
  ↓
Preview charter → Confirm → Save
```

---

## File Locations

- **Conversation Design**: `docs/design/CHARTER-CONVERSATION-DESIGN.md`
- **Synthesis Spec**: `docs/design/CHARTER-SYNTHESIS.md`
- **Confidence Scorer**: `packages/cli/src/lib/charter/confidence-scorer.ts`
- **Examples**: `docs/examples/charter-conversations/`
  - `hack-ship-example.md`
  - `think-build-example.md`
  - `full-planning-example.md`

---

## Implementation Priority

1. **Phase 1**: Core conversation (4 aspects, Think & Build baseline)
2. **Phase 2**: Mode detection (Hack & Ship + Full Planning)
3. **Phase 3**: Polish (nudging refinement, voice optimization)

---

## Open Questions for Chris

1. Conversation tone: Right level of deference?
2. TBD philosophy: Acceptable or push harder?
3. Work mode names: Good or change?
4. Confidence thresholds: 40% / 70% feel right?
5. Charter length targets: Appropriate?

---

*Quick reference for TASK-002 design - Full details in linked documents*
*Last Updated: 2025-11-10*
