# Sprint Plan: ADR-026 Enhanced Ginko Init Implementation

## Overview
**Start Date**: 2025-08-28
**Duration**: 5 days  
**ADR Reference**: ADR-026 - Enhanced ginko init with intelligent project optimization

## Success Criteria
- [x] `ginko init` generates comprehensive AI instructions with frontmatter (model-agnostic)
- [x] Project analysis detects tech stacks and generates appropriate context
- [x] Progressive learning system provides contextual command hints
- [x] New users productive in <5 minutes from init
- [x] All core functionality implemented and tested

## Implementation Phases

### Phase 1: Foundation - CLAUDE.md Generation
**Duration**: 1 day
**Goal**: Build core template system for generating project-specific CLAUDE.md files

**Tasks**:
- [x] Create AI instruction template engine (model-agnostic) (~2 hours)
- [x] Implement frontmatter instruction generator (~1.5 hours) 
- [x] Build project type detection logic (~2 hours)
- [x] Add template variables and substitution (~1 hour)
- [x] Write unit tests for template generation (~1.5 hours)

**Deliverables**:
- Working template system in `packages/cli/src/templates/`
- Generated CLAUDE.md with frontmatter instructions
- Tests covering all template variations

**Risk Factors**:
- Template complexity might require more time
- Edge cases in project detection

### Phase 2: Core Implementation - Project Analysis
**Duration**: 2 days
**Goal**: Implement intelligent project analysis and context module generation

**Tasks**:
- [x] Build project scanner for tech stack detection (~3 hours)
- [x] Implement package.json/requirements.txt/go.mod analyzers (~2 hours)
- [x] Create pattern detector for common architectures (~3 hours)
- [x] Generate context modules based on detected patterns (~2 hours)
- [x] Add caching for analysis results (~1 hour)
- [x] Implement --analyze flag for deep analysis (~2 hours)
- [x] Progressive learning system implemented (bonus)

**Deliverables**:
- Working project analyzer in `packages/cli/src/analysis/`
- Auto-generated context modules in `.ginko/context/modules/`
- Tech stack detection for Node, Python, Go, Rust

**Risk Factors**:
- Complex monorepos might confuse detection
- Performance issues with large codebases

### Phase 3: Testing & Refinement - Progressive Learning
**Duration**: 2 days
**Goal**: Implement progressive learning system and polish UX

**Tasks**:
- [ ] Build command discovery system (~2 hours)
- [ ] Implement contextual hints engine (~3 hours)
- [ ] Create flow state preserving notifications (~2 hours)
- [ ] Add interactive mode for first-time setup (~2 hours)
- [ ] Implement --quick flag for minimal setup (~1 hour)
- [ ] Polish CLI output and formatting (~2 hours)
- [ ] End-to-end testing with example projects (~3 hours)

**Deliverables**:
- Progressive learning system integrated
- Polished CLI experience with helpful hints
- Full test coverage including e2e tests

**Risk Factors**:
- Balancing helpful vs annoying hints
- Cross-platform compatibility issues

## Dependencies
- Existing ginko CLI infrastructure
- Template files and examples
- Test projects for validation
- No external API dependencies (all local)

## Testing Strategy
- **Unit Tests**: Template generation, project analysis, hint engine
- **Integration Tests**: Full init flow, project detection accuracy
- **Manual Testing**: Init on real projects (React, Next.js, Python, Go)
- **Performance Tests**: Ensure <3 second init on average projects

## Rollback Plan
- Feature flagged behind --enhanced flag initially
- Fallback to current basic init if analysis fails
- Version pinning for stable rollback point

## Daily Standup Topics

**Day 1**:
- Focus: Template system and CLAUDE.md generation
- Check: Can generate valid CLAUDE.md with frontmatter?
- Risk: Template complexity blocking Day 2

**Day 2**:
- Focus: Project scanner and tech stack detection
- Check: Accurately detects Node/Python/Go projects?
- Risk: Pattern detection taking longer than expected

**Day 3**:
- Focus: Context module generation and analysis
- Check: Generates useful context modules?
- Risk: Module quality might need iteration

**Day 4**:
- Focus: Progressive learning and hint system
- Check: Hints appear at right moments?
- Risk: UX polish might need more time

**Day 5**:
- Focus: Testing, documentation, and polish
- Check: All tests passing, docs updated?
- Risk: Edge cases discovered during testing

## Notes
- Prioritize fast default experience over comprehensive analysis
- Use existing ADR-002 frontmatter patterns as foundation
- Ensure backward compatibility with existing .ginko directories
- Follow ADR-023 flow state philosophy throughout