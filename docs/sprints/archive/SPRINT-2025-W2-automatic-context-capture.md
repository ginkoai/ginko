# Sprint Plan: Automatic Context Capture Implementation

**Sprint**: 2025-W2 (Week 2, January)  
**Feature**: FEATURE-018 - Enhanced Handoff with Automatic Context Capture  
**Duration**: 3 weeks (15 working days)  
**Team**: 1 developer  
**Priority**: CRITICAL  

## Sprint Goal

Implement automatic context capture within the `ginko handoff` command to increase knowledge retention from 10% to 90% by analyzing sessions and extracting pivotal insights without interrupting developer flow.

## Success Criteria

- [ ] Handoff command automatically extracts 3-6 insights per session
- [ ] Context modules are generated and stored in `.ginko/context/modules/`
- [ ] Zero additional friction for developers (happens during natural handoff)
- [ ] Backward compatibility maintained with existing handoff workflow
- [ ] 90% of valuable insights captured (vs 10% current)

## Implementation Phases

### Phase 1: Session Data Collection (Days 1-3)

#### Day 1: Data Model & Interfaces
**File**: `packages/cli/src/types/session.ts`
```typescript
- [ ] Define SessionData interface
- [ ] Define SessionInsight interface 
- [ ] Define ContextModule interface
- [ ] Create FileChange type
- [ ] Add TestResult, ErrorLog types
```

#### Day 2: Data Collectors
**File**: `packages/cli/src/utils/session-collector.ts`
```typescript
- [ ] Implement GitDataCollector class
- [ ] Add test result parsing (Jest, Vitest, Mocha)
- [ ] Create error log extraction
- [ ] Add file change tracking
- [ ] Implement session timing
```

#### Day 3: Integration with Handoff
**File**: `packages/cli/src/commands/handoff-ai.ts`
```typescript
- [ ] Extend handoffAiCommand with data collection
- [ ] Add SessionCollector integration
- [ ] Store session data for analysis
- [ ] Add telemetry hooks
- [ ] Test data collection pipeline
```

### Phase 2: AI Analysis Engine (Days 4-7)

#### Day 4: Insight Extraction Core
**File**: `packages/cli/src/services/insight-extractor.ts`
```typescript
- [ ] Create InsightExtractor class
- [ ] Define extraction prompt templates
- [ ] Implement insight scoring algorithm
- [ ] Add insight type detection
- [ ] Create deduplication logic
```

#### Day 5: AI Provider Integration
**File**: `packages/cli/src/services/ai-analyzer.ts`
```typescript
- [ ] Integrate with existing AI adapters
- [ ] Implement model routing (ADR-026)
- [ ] Add fallback for no API key
- [ ] Handle rate limiting
- [ ] Add response validation
```

#### Day 6: Insight Filtering & Scoring
**File**: `packages/cli/src/utils/insight-scorer.ts`
```typescript
- [ ] Implement reusability scoring
- [ ] Add time-saving calculator
- [ ] Create relevance scoring
- [ ] Build quality filters
- [ ] Add insight ranking
```

#### Day 7: Testing & Refinement
```typescript
- [ ] Unit tests for extraction
- [ ] Integration tests with AI
- [ ] Test prompt variations
- [ ] Validate scoring accuracy
- [ ] Performance optimization
```

### Phase 3: Context Module System (Days 8-10)

#### Day 8: Module Generator
**File**: `packages/cli/src/services/module-generator.ts`
```typescript
- [ ] Create ModuleGenerator class
- [ ] Implement module templates
- [ ] Add filename generation
- [ ] Create frontmatter builder
- [ ] Implement write operations
```

#### Day 9: Module Management
**File**: `packages/cli/src/utils/module-manager.ts`
```typescript
- [ ] Build module registry
- [ ] Add deduplication checks
- [ ] Implement module versioning
- [ ] Create search/discovery
- [ ] Add module indexing
```

#### Day 10: Module Templates
**Files**: `packages/cli/src/templates/modules/*.ts`
```typescript
- [ ] Create gotcha template
- [ ] Create pattern template
- [ ] Create decision template
- [ ] Create discovery template
- [ ] Create optimization template
```

### Phase 4: Handoff Enhancement (Days 11-13)

#### Day 11: Handoff Integration
**File**: `packages/cli/src/commands/handoff-ai.ts`
```typescript
- [ ] Add --capture flag (default true)
- [ ] Integrate InsightExtractor
- [ ] Connect ModuleGenerator
- [ ] Update handoff template
- [ ] Maintain backward compatibility
```

#### Day 12: User Experience
**File**: `packages/cli/src/ui/insight-review.ts`
```typescript
- [ ] Create insight preview UI
- [ ] Add progress indicators
- [ ] Implement selective inclusion
- [ ] Add edit capability
- [ ] Create review workflow
```

#### Day 13: Configuration & Settings
**File**: `packages/cli/src/config/capture-config.ts`
```typescript
- [ ] Add capture configuration
- [ ] Create user preferences
- [ ] Implement feature flags
- [ ] Add telemetry settings
- [ ] Create migration logic
```

### Phase 5: Testing & Polish (Days 14-15)

#### Day 14: Comprehensive Testing
```bash
- [ ] End-to-end handoff flow test
- [ ] Multi-session insight deduplication
- [ ] Edge cases (empty sessions, errors)
- [ ] Performance benchmarks
- [ ] User acceptance testing
```

#### Day 15: Documentation & Release
```markdown
- [ ] Update user documentation
- [ ] Create migration guide
- [ ] Add examples to README
- [ ] Prepare release notes
- [ ] Deploy to npm
```

## Task Breakdown by Component

### CLI Components (packages/cli/)
```
src/
├── commands/
│   └── handoff-ai.ts            # Main integration point
├── services/
│   ├── insight-extractor.ts     # Core extraction logic
│   ├── ai-analyzer.ts           # AI integration
│   └── module-generator.ts      # Module creation
├── utils/
│   ├── session-collector.ts     # Data gathering
│   ├── insight-scorer.ts        # Scoring algorithm
│   └── module-manager.ts        # Module operations
├── templates/
│   └── modules/                 # Module templates
├── types/
│   └── session.ts               # Type definitions
└── ui/
    └── insight-review.ts        # User interaction
```

### File Modifications Required

1. **handoff-ai.ts** (Extend existing)
   - Add data collection
   - Integrate analysis
   - Generate modules
   - Update template

2. **ai-templates.ts** (Extend existing)
   - Add insight prompts
   - Create scoring rubrics
   - Update validation

3. **helpers.ts** (Extend existing)
   - Add module paths
   - Create file utilities
   - Update configuration

## Testing Strategy

### Unit Tests (Days 7, 10, 13)
```
- [ ] SessionCollector.test.ts
- [ ] InsightExtractor.test.ts
- [ ] ModuleGenerator.test.ts
- [ ] InsightScorer.test.ts
- [ ] ModuleManager.test.ts
```

### Integration Tests (Day 14)
```
- [ ] Full handoff flow with capture
- [ ] AI provider integration
- [ ] File system operations
- [ ] Git integration
- [ ] Multi-session workflows
```

### Manual Testing Scenarios
```
1. Empty session (no changes)
2. Large session (100+ file changes)
3. Error-heavy session (failing tests)
4. Exploration session (reading only)
5. Bug fix session (problem→solution)
6. Feature development (new code)
7. Refactoring session (restructuring)
```

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI API failures | High | Fallback to basic handoff, queue for retry |
| Poor insight quality | Medium | Scoring filters, user review option |
| Performance impact | Medium | Async processing, caching |
| User resistance | Low | Opt-out flag, gradual rollout |
| Module explosion | Low | Deduplication, max limits |

## Dependencies

### External
- AI Provider API (Claude/OpenAI/Local)
- Git CLI
- File system access
- Test framework integration

### Internal
- Existing handoff command
- AI adapter system
- Configuration system
- Template system

## Definition of Done

- [ ] All unit tests passing
- [ ] Integration tests complete
- [ ] Documentation updated
- [ ] Code reviewed and approved
- [ ] Performance benchmarks met (<2s overhead)
- [ ] User testing feedback incorporated
- [ ] Deployed to npm registry
- [ ] Announcement prepared

## Rollout Plan

### Week 1: Alpha Testing
- Internal testing with team
- Feature flag enabled
- Gather initial feedback

### Week 2: Beta Release
- npm beta tag release
- Opt-in for early adopters
- Monitor telemetry

### Week 3: General Availability
- Full npm release
- Default enabled
- Marketing push

## Metrics to Track

```typescript
interface CaptureMetrics {
  sessionsWithCapture: number;
  insightsGenerated: number;
  modulesCreated: number;
  averageInsightsPerSession: number;
  userOptOutRate: number;
  averageProcessingTime: number;
  insightReuseRate: number;
  timeSavedEstimate: number;
}
```

## Post-Sprint Enhancements

After successful implementation:
1. VS Code extension integration
2. Team insight sharing
3. Insight analytics dashboard
4. Smart module suggestions
5. Knowledge graph visualization

## Sprint Retrospective Questions

At sprint end, evaluate:
1. Did we achieve 90% capture rate?
2. Is the feature truly zero-friction?
3. What insights are most valuable?
4. How can we improve quality?
5. What did we learn?

---

**Sprint Start**: Monday, Week 2, 2025  
**Sprint End**: Friday, Week 4, 2025  
**Review Date**: Monday, Week 5, 2025