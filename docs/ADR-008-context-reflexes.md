# ADR-008: Context Reflexes Architecture

## Status
Proposed

## Context

Traditional AI assistants require explicit prompting for context awareness:
- "Check if this aligns with requirements"
- "Load relevant patterns"
- "Update your understanding"

This creates cognitive overhead and breaks flow. We need the AI to maintain context awareness automatically, like a human developer's subconscious professional habits.

## Decision

Implement **Context Reflexes** - automatic thought patterns that maintain context awareness without explicit prompting.

### The Four Core Reflexes

```markdown
1. "Why Am I Doing This?" Reflex
   Trigger: Every 30 minutes or major decision point
   Action: Trace current work up the hierarchy
   Output: Natural confirmation of alignment

2. "Have We Done This Before?" Reflex  
   Trigger: Before implementing new functionality
   Action: Search context modules for patterns
   Output: Reference similar solutions naturally

3. "Something Feels Off" Reflex
   Trigger: Confusion or uncertainty
   Action: Identify missing context
   Output: Ask for clarification or search for context

4. "Update My Understanding" Reflex
   Trigger: After discoveries or learning
   Action: Note patterns for future sessions
   Output: Capture insight for context modules
```

### Implementation Architecture

```typescript
class ContextReflexSystem {
  private reflexes: Reflex[] = [
    new WhyReflex(30 * 60 * 1000),      // 30 min
    new PatternReflex(),                 // On implementation
    new ConfusionReflex(),              // On uncertainty  
    new LearningReflex()                // On discovery
  ];
  
  async processActivity(activity: Activity) {
    for (const reflex of this.reflexes) {
      if (reflex.shouldTrigger(activity)) {
        await reflex.execute(activity);
      }
    }
  }
}
```

### Natural Language Integration

The reflexes manifest as natural thought patterns:

```typescript
class WhyReflex {
  execute() {
    // Instead of: "CHECKING ALIGNMENT WITH PRD"
    return "This auth middleware supports our goal of secure access by..."
    
    // Instead of: "LOADING HIERARCHY"
    return "Working on this because it implements the sprint goal of..."
  }
}

class PatternReflex {
  execute() {
    // Instead of: "SEARCHING PATTERN DATABASE"
    return "This reminds me of the pagination pattern we used last week..."
    
    // Instead of: "NO PATTERNS FOUND"
    return "This seems like a new pattern worth documenting..."
  }
}
```

## Consequences

### Positive
- **Zero Overhead**: No explicit commands needed
- **Natural Flow**: Feels like thinking, not process
- **Self-Improving**: Captures learnings automatically
- **Early Detection**: Catches issues before they compound
- **Human-Like**: Creates familiar collaboration pattern

### Negative
- **Implicit Behavior**: Less visible than explicit commands
- **Training Dependency**: Requires proper AI instruction
- **Tuning Needed**: Reflex sensitivity needs calibration
- **Model Variance**: Different AI models may interpret differently

### Mitigation

1. **Clear Documentation**: Detailed examples in CLAUDE.md
2. **Configurable Sensitivity**: Adjust reflex triggers
3. **Fallback to Explicit**: Allow manual context commands
4. **Visible Indicators**: Statusline shows reflex activity

## Detailed Reflex Specifications

### Why Reflex
```yaml
trigger:
  - interval: 30 minutes
  - events: [major_decision, approach_change, goal_question]
  
behavior:
  - trace_hierarchy: task → sprint → architecture → prd
  - express_naturally: "This helps us achieve [goal] by..."
  - flag_if_unclear: "I'm not sure how this connects to our goals"
```

### Pattern Reflex
```yaml
trigger:
  - events: [new_implementation, problem_solving, design_decision]
  
behavior:
  - search_patterns: contextSearch.searchByTags(current_work)
  - reference_naturally: "Similar to..." | "Unlike our usual..."
  - suggest_capture: "This might be a useful pattern to save"
```

### Confusion Reflex
```yaml
trigger:
  - confidence: < 60%
  - events: [multiple_approaches, conflicting_info, missing_context]
  
behavior:
  - identify_gap: "I'm missing information about..."
  - request_help: "Could you clarify..."
  - search_context: "Let me check if we have docs on this"
```

### Learning Reflex
```yaml
trigger:
  - events: [solution_found, pattern_recognized, gotcha_encountered]
  
behavior:
  - note_discovery: "Interesting - [observation]"
  - assess_reusability: "This could help with similar problems"
  - queue_for_capture: Mark for context module creation
```

## Methodology Adaptations

### Hack & Ship Mode
- Reflexes trigger less frequently
- Focus on learning capture
- Minimal hierarchy checking

### Think & Build Mode
- Balanced reflex activity
- Pattern awareness emphasized
- Moderate hierarchy awareness

### Full Planning Mode
- Frequent reflex triggers
- Strict hierarchy checking
- Comprehensive pattern matching

## Measurement

Track reflex effectiveness:
- Trigger frequency
- Successful pattern matches
- Confusion resolution rate
- Learning capture rate
- Flow preservation score

## Related Decisions

- ADR-006: Continuous Context Invocation Pattern
- ADR-007: Phase Context Coherence
- ADR-009: Progressive Context Loading
- ADR-010: Methodology Flexibility

## Implementation Requirements

1. **CLAUDE.md Updates**: Add reflex descriptions
2. **Trigger System**: Implement activity monitoring
3. **Natural Language**: Template library for responses
4. **Configuration**: Adjustable sensitivity settings
5. **Metrics**: Reflex activity tracking

---

*This ADR establishes Context Reflexes as the primary mechanism for maintaining continuous context awareness, creating natural, flow-preserving collaboration patterns.*