# ADR-067: Phase Context Coherence

## Status
Proposed

## Context

Effective AI collaboration requires maintaining coherence between:
- Current work phase (what we're doing now)
- Loaded context (what information is available)
- Work hierarchy (why we're doing it)

Without this coherence, the AI operates with mismatched context - having architecture documents while debugging, or lacking patterns while implementing.

## Decision

Implement a **Phase-Context Coherence** system that:
1. Tracks work through defined phases
2. Loads context appropriate to each phase
3. Maintains hierarchy awareness (PRD→Architecture→Sprint→Task)
4. Adapts to methodology preferences

### Phase Definitions

Standard phases that adapt to methodology:

```typescript
const phases = {
  "understanding": "Grasping requirements and goals",
  "designing": "Planning approach and architecture",
  "implementing": "Writing actual code",
  "testing": "Verifying functionality",
  "debugging": "Fixing issues",
  "optimizing": "Improving performance",
  "documenting": "Recording decisions"
};
```

### Context Hierarchy

Every action traces up the ladder:

```
Task (Now)
  ↑ implements
Sprint Goal (How)
  ↑ achieves
Architecture (What)
  ↑ realizes
PRD (Why)
```

### Phase-Context Mapping

Each phase loads specific context types:

```typescript
const phaseContextMap = {
  "understanding": {
    primary: ["PRD", "user-stories"],
    secondary: ["success-criteria", "constraints"]
  },
  "designing": {
    primary: ["architecture", "patterns"],
    secondary: ["decisions", "trade-offs"]
  },
  "implementing": {
    primary: ["patterns", "examples"],
    secondary: ["gotchas", "utilities"]
  },
  "debugging": {
    primary: ["gotchas", "error-patterns"],
    secondary: ["logs", "diagnostics"]
  }
};
```

## Consequences

### Positive
- **Relevant Context**: Right information at right time
- **Reduced Noise**: Don't load everything upfront
- **Clear Traceability**: All work connects to purpose
- **Adaptive Loading**: Context matches current need
- **Performance**: Faster loading, less memory

### Negative
- **Phase Detection Complexity**: Accurately detecting phases
- **Transition Overhead**: Loading new context on phase change
- **Rigid Structure**: May feel constraining
- **Missing Context**: Might not load something needed

### Mitigation Strategies

1. **Fuzzy Boundaries**: Phases can overlap
2. **Predictive Loading**: Anticipate next phase
3. **Manual Override**: Developer can force phase
4. **Background Loading**: Pre-fetch likely context

## Implementation Details

### Phase Detection

```typescript
class PhaseDetector {
  detectFromActivity(activity: string): Phase {
    // Keywords and patterns
    if (contains(["requirement", "goal", "why"])) 
      return "understanding";
    if (contains(["design", "architecture", "approach"])) 
      return "designing";
    if (contains(["implement", "code", "function"])) 
      return "implementing";
    // ... etc
  }
  
  detectFromFiles(files: string[]): Phase {
    // File patterns
    if (files.some(f => f.includes("test"))) 
      return "testing";
    if (files.some(f => f.includes(".md"))) 
      return "documenting";
    // ... etc
  }
}
```

### Context Coherence Score

```typescript
function calculateCoherence(): number {
  const currentPhase = detectPhase();
  const loadedContext = getLoadedModules();
  const expectedContext = phaseContextMap[currentPhase];
  
  // How well does loaded match expected?
  const relevance = calculateRelevance(loadedContext, expectedContext);
  const completeness = calculateCompleteness(loadedContext, expectedContext);
  
  return (relevance * 0.6 + completeness * 0.4) * 100;
}
```

### Hierarchy Tracking

```typescript
interface WorkContext {
  current: {
    task: "Implement auth middleware",
    phase: "implementing",
    confidence: 0.85
  },
  hierarchy: {
    sprint: "Authentication sprint",
    architecture: "Microservices with JWT",
    prd: "Secure user access"
  },
  traceability: [
    "middleware implements JWT strategy",
    "JWT achieves authentication goal",
    "authentication enables secure access"
  ]
}
```

## Alternatives Considered

### 1. No Phase Tracking
Just load all context always.
**Rejected**: Information overload, slow performance

### 2. Manual Phase Management
Developer explicitly sets phase.
**Rejected**: Extra cognitive burden, breaks flow

### 3. Time-Based Phases
Assume phases based on project timeline.
**Rejected**: Doesn't match real development patterns

### 4. File-Based Only
Detect phase purely from files being edited.
**Rejected**: Too limiting, misses conversation context

## Methodology Adaptations

### Hack & Ship
- Loose phase boundaries
- Rapid transitions allowed
- Minimal hierarchy enforcement

### Think & Build
- Clear phase transitions
- Moderate hierarchy awareness
- Balanced context loading

### Full Planning
- Strict phase gates
- Full hierarchy required
- Comprehensive context

## Measurement

- Phase detection accuracy
- Context relevance scores
- Transition smoothness
- Developer satisfaction
- Performance metrics

## Related Decisions

- ADR-006: Continuous Context Invocation
- ADR-008: Context Reflexes Architecture
- ADR-009: Progressive Context Loading
- ADR-010: Methodology Flexibility

---

*This ADR establishes phase-context coherence as the organizing principle for context management, ensuring the AI has the right information at the right time.*