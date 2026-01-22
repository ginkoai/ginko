# ADR-069: Progressive Context Loading

## Status
Proposed

## Context

Loading all available context at session start creates several problems:
- **Cognitive overload** for both AI and human
- **Performance degradation** from processing unnecessary information
- **Relevance dilution** where important context gets lost in noise
- **Memory waste** holding unused patterns and modules

Developers need the right context at the right time, not everything all the time.

## Decision

Implement **Progressive Context Loading** that loads context in three stages:

1. **Initial Load**: Minimal context to start working
2. **On-Demand Load**: Context loaded as needed
3. **Just-In-Time Load**: Context loaded when specifically relevant

### Loading Strategy

```typescript
interface ProgressiveLoadingStrategy {
  initial: {
    // Always load at start
    hierarchy: ['current_task', 'sprint_goal'],
    modules: ['top_3_relevant'],
    threshold: 0.8  // Only very relevant items
  },
  
  onDemand: {
    // Load when mentioned or needed
    triggers: ['pattern_search', 'error_encountered', 'design_decision'],
    threshold: 0.6  // Moderately relevant items
  },
  
  justInTime: {
    // Load at specific moments
    triggers: ['compilation_error', 'test_failure', 'performance_issue'],
    threshold: 0.4  // Potentially relevant items
  }
}
```

### Progressive Loading Levels

```
         Initial Load (Start)
         ├── Current task summary
         ├── Active sprint goal
         └── Top 3 relevant patterns
                    ↓
         On-Demand (During work)
         ├── Searched patterns
         ├── Error solutions
         └── Architecture sections
                    ↓
         Just-In-Time (When needed)
         ├── Detailed gotchas
         ├── Edge cases
         └── Historical decisions
```

## Implementation

### Initial Load Algorithm

```typescript
async function loadInitialContext(session: SessionData) {
  const context = {
    immediate: [],
    deferred: [],
    available: []
  };
  
  // Load only what's needed to start
  context.immediate = [
    await loadCurrentTask(session),
    await loadTopPatterns(3, session.branch),
    await loadRecentErrors(session)
  ];
  
  // Queue for later
  context.deferred = await identifyLikelyNeeds(session);
  
  // Index available but not loaded
  context.available = await indexAllModules();
  
  return context;
}
```

### On-Demand Loading Triggers

```typescript
class OnDemandLoader {
  triggers = {
    // Natural language triggers
    "let me check patterns": () => loadPatterns(currentContext),
    "similar to": () => searchSimilarImplementations(),
    "according to architecture": () => loadArchitectureSection(),
    
    // Activity triggers
    "new_file_created": (file) => loadPatternsForFileType(file),
    "error_encountered": (error) => searchGotchas(error),
    "import_added": (module) => loadModulePatterns(module)
  };
}
```

### Just-In-Time Loading

```typescript
class JustInTimeLoader {
  async handleEvent(event: DevelopmentEvent) {
    switch(event.type) {
      case 'test_failure':
        return await loadTestPatterns(event.test);
        
      case 'performance_degradation':
        return await loadOptimizationPatterns();
        
      case 'security_concern':
        return await loadSecurityGotchas();
        
      case 'merge_conflict':
        return await loadConflictContext(event.files);
    }
  }
}
```

## Loading Performance Optimizations

### Predictive Pre-Loading

```typescript
class PredictiveLoader {
  async predictNextNeeds(currentPhase: Phase) {
    const predictions = {
      'designing': ['architecture', 'patterns', 'decisions'],
      'implementing': ['patterns', 'utilities', 'gotchas'],
      'testing': ['test-patterns', 'mocks', 'fixtures'],
      'debugging': ['error-patterns', 'logs', 'gotchas']
    };
    
    // Pre-load in background
    const likely = predictions[currentPhase];
    await backgroundLoad(likely);
  }
}
```

### Caching Strategy

```typescript
interface CacheStrategy {
  hot: {
    // Frequently accessed, keep in memory
    items: ['current_task', 'active_patterns'],
    ttl: null  // No expiration
  },
  
  warm: {
    // Recently accessed, quick retrieval
    items: ['recent_modules', 'session_history'],
    ttl: 30 * 60 * 1000  // 30 minutes
  },
  
  cold: {
    // Rarely accessed, load from disk
    items: ['old_patterns', 'archived_decisions'],
    ttl: 0  // Always reload
  }
}
```

## Consequences

### Positive
- **Faster Startup**: Session begins immediately
- **Better Performance**: Less memory usage
- **Improved Relevance**: Focus on what matters now
- **Adaptive Loading**: Responds to actual needs
- **Scalability**: Works with large context libraries

### Negative
- **Loading Delays**: Some context loads during work
- **Prediction Misses**: Might not pre-load needed context
- **Complexity**: More complex than loading everything
- **Cache Management**: Requires memory management

### Mitigation

1. **Background Loading**: Pre-fetch likely needs
2. **Smart Caching**: Keep hot items ready
3. **Fast Search**: Quick context discovery
4. **Loading Indicators**: Show when loading

## Methodology Adaptations

### Hack & Ship
```typescript
{
  initial: "minimal",     // Just current task
  threshold: 0.9,         // Only highly relevant
  preload: false,         // Load only on demand
  caching: "aggressive"   // Keep everything loaded
}
```

### Think & Build
```typescript
{
  initial: "balanced",    // Task + key patterns
  threshold: 0.7,         // Moderately relevant
  preload: true,          // Predictive loading
  caching: "smart"        // Hot/warm/cold tiers
}
```

### Full Planning
```typescript
{
  initial: "comprehensive", // Full hierarchy
  threshold: 0.5,          // Most potentially relevant
  preload: true,           // Aggressive pre-loading
  caching: "full"          // Keep all in memory
}
```

## Performance Metrics

Monitor loading effectiveness:

```typescript
interface LoadingMetrics {
  initialLoadTime: number;        // Time to first interaction
  contextHitRate: number;         // % of needed context pre-loaded
  loadingInterruptions: number;   // Times user waited for context
  memoryUsage: number;            // MB of context in memory
  relevanceScore: number;         // % of loaded context actually used
}
```

## Related Decisions

- ADR-006: Continuous Context Invocation Pattern
- ADR-007: Phase Context Coherence
- ADR-008: Context Reflexes Architecture
- ADR-010: Methodology Flexibility

## Implementation Steps

1. **Refactor Loading**: Split monolithic loading
2. **Add Triggers**: Implement on-demand system
3. **Build Cache**: Create tiered caching
4. **Add Prediction**: Implement predictive loading
5. **Optimize**: Tune based on metrics

---

*This ADR establishes progressive loading as our strategy for managing context efficiently, loading the right information at the right time rather than everything upfront.*