# ADR-026: Enhanced ginko init with intelligent project optimization for AI collaboration

## Status
Proposed

## Date
2025-08-28

## Context
Currently, `ginko init` creates a basic directory structure but doesn't optimize projects for AI collaboration. Developers must repeatedly explain project context to AI assistants, leading to friction and abandonment. Without frontmatter conventions and project-specific instructions, AI cannot quickly understand codebases, resulting in suggestions that ignore project patterns and break developer flow.

## Decision
Enhance `ginko init` to be an intelligent project optimizer that:
1. Generates comprehensive CLAUDE.md with frontmatter instructions
2. Analyzes projects to detect tech stacks and patterns
3. Creates starter context modules based on analysis
4. Implements progressive learning system for command discovery
5. Maintains flow state through minimal, contextual guidance

## Considered Alternatives

### Option 1: Minimal Enhancement
- **Pros**: Simple, fast to implement
- **Cons**: Misses opportunity for project optimization

### Option 2: Full AI Analysis
- **Pros**: Comprehensive understanding
- **Cons**: Slow, requires AI availability, privacy concerns

### Option 3: Progressive Enhancement (Selected)
- **Pros**: Fast default, powerful when needed, preserves flow
- **Cons**: More complex implementation

## Consequences

### Positive
- New users productive in <5 minutes
- 70% faster AI context discovery
- Natural command learning without documentation
- Project patterns understood immediately

### Negative
- Increased init command complexity
- More code to maintain
- Potential for over-configuration

## Implementation Plan
1. **Phase 1**: CLAUDE.md generation with frontmatter templates
2. **Phase 2**: Project analysis for tech stack detection
3. **Phase 3**: Progressive learning system
4. **Phase 4**: Context module auto-generation

## References
- ADR-002: AI-Optimized File Discovery
- ADR-023: Flow State Design Philosophy
- ADR-024: AI-Enhanced Local Tooling Pattern
- PRD-2025-08-28: Enhanced ginko init