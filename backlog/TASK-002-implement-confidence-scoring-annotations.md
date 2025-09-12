# TASK-002: Implement confidence scoring annotations in reflection outputs

## Metadata
- **Type**: task
- **Priority**: medium
- **Size**: large
- **Status**: todo
- **Created**: 2025-09-12
- **Author**: Chris Norton

## Problem Statement
As documented in ADR-004, the single-pass reflection pattern would benefit from confidence scoring annotations. When the AI makes assumptions or chooses between alternatives during reflection, it should indicate its confidence level in HTML comments within the generated output. This gives humans immediate visibility into areas that may need refinement without interrupting the reflection flow.

## Solution Approach
Implement a global confidence scoring system across all reflection domains:

1. **Confidence Calculation**: AI evaluates its certainty based on:
   - Clarity of intent
   - Available context
   - Number of viable alternatives
   - Precedent in existing patterns

2. **Annotation Format**:
   ```markdown
   ## Decision
   We will use dependency injection for the plugin architecture.
   <!-- confidence: 85% - alternative: factory pattern (70%), service locator (45%) -->
   ```

3. **Thresholds**:
   - High confidence (>80%): No annotation needed
   - Medium confidence (60-80%): Note in comments
   - Low confidence (<60%): Highlight alternatives with scores

## Acceptance Criteria
- [ ] Confidence scoring logic implemented in base ReflectionCommand class
- [ ] All reflection domains inherit confidence scoring capability
- [ ] Annotations appear only when confidence < 80%
- [ ] Alternative options listed with their confidence scores
- [ ] No impact on reflection performance (<100ms overhead)
- [ ] Clear documentation on how confidence is calculated
- [ ] Configurable thresholds via environment or flags
- [ ] Annotations are valid HTML comments that don't break markdown

## Technical Notes
**Dependencies**: 
- reflection-pattern.ts base class
- All domain implementations (PRD, Architecture, Testing, etc.)

**Implementation Points**:
- Add `calculateConfidence()` method to ReflectionCommand
- Inject annotations during `generateOutput()` phase
- Parse intent clarity, context completeness, alternative count
- Store confidence metadata in reflection context

**Configuration**:
- `REFLECTION_CONFIDENCE_THRESHOLD` env var (default: 80)
- `--show-confidence` flag to force all annotations
- `--hide-confidence` flag to suppress annotations

## Relationships
**Parent**: ADR-004 (Single-Pass Reflection Pattern)
**Related**: 
- FEATURE-029 (Universal Reflection Pattern)
- All reflection domain implementations
**Blocks**: None

## Implementation Example
```typescript
// In ReflectionCommand base class
protected calculateConfidence(
  intent: string,
  context: any,
  alternatives: Alternative[]
): ConfidenceScore {
  let score = 100;
  
  // Reduce for vague intent
  if (intent.includes('maybe') || intent.includes('possibly')) {
    score -= 20;
  }
  
  // Reduce for multiple viable alternatives
  const viableAlternatives = alternatives.filter(a => a.score > 60);
  score -= (viableAlternatives.length - 1) * 10;
  
  // Reduce for missing context
  if (!context.existingPatterns || context.existingPatterns.length === 0) {
    score -= 15;
  }
  
  return {
    primary: score,
    alternatives: alternatives.map(a => ({
      name: a.name,
      confidence: a.score
    }))
  };
}

// In output generation
if (confidence.primary < 80) {
  output += `\n<!-- confidence: ${confidence.primary}%`;
  if (confidence.alternatives.length > 0) {
    output += ` - alternatives: ${confidence.alternatives
      .map(a => `${a.name} (${a.confidence}%)`)
      .join(', ')}`;
  }
  output += ` -->\n`;
}
```

## Benefits
- Humans immediately see where to focus review effort
- No interruption to reflection flow
- Builds trust through transparency
- Educates users about AI decision-making
- Enables data-driven improvement of prompts

## Risks
- Over-annotation could clutter output
- Users might lose confidence if scores are too low
- Calculating confidence adds complexity

This is a cross-cutting enhancement that will improve all reflection domains globally.